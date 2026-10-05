import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { DEMO_COOKIE, getActiveDemoRole, isDemoEnabled } from '@/lib/security/demo'

// Demo path rewrite map: /demo-* → real base + cookie role
const DEMO_PATHS = [
  { prefix: '/demo-tools',      realBase: '/tools',      role: 'founder'    },
  { prefix: '/demo-admin',      realBase: '/admin',      role: 'admin_org'  },
  { prefix: '/demo-superadmin', realBase: '/superadmin', role: 'superadmin' },
] as const

// Documented in CLAUDE.md: admin role check gives up after 3s and sends the
// user to /tools instead of hanging the request.
const ROLE_CHECK_TIMEOUT_MS = 3000

/** Reads profiles.role with a hard timeout. Returns null on timeout, error or missing row. */
async function fetchRole(supabase: SupabaseClient, userId: string): Promise<string | null> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => {
      console.error('[S4C Admin] proxy role check timed out')
      resolve(null)
    }, ROLE_CHECK_TIMEOUT_MS)
  })
  const query = supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()
    .then(
      ({ data, error }) => {
        if (error) {
          console.error('[S4C Admin] proxy role check failed:', error.message)
          return null
        }
        const role = (data as { role?: string | null } | null)?.role
        return typeof role === 'string' ? role : null
      },
      (err: unknown) => {
        console.error('[S4C Admin] proxy role check threw:', err)
        return null
      }
    )
  try {
    return await Promise.race([query, timeout])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

function clearDemoCookie(response: NextResponse): void {
  response.cookies.set(DEMO_COOKIE, '', { path: '/', maxAge: 0, sameSite: 'lax' })
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // ── Demo entry rewrites ──────────────────────────────────────────────────
  // Intercept /demo-tools/*, /demo-admin/*, /demo-superadmin/*,
  // set the s4c_demo cookie, and rewrite the request to the real path
  // WITHOUT redirecting — the browser URL stays at /demo-*.
  // Same production gate as /api/demo/[role]: disabled unless
  // NEXT_PUBLIC_DEMO_ENABLED=true.
  for (const { prefix, realBase, role } of DEMO_PATHS) {
    if (pathname === prefix || pathname.startsWith(prefix + '/')) {
      if (!isDemoEnabled()) {
        const home = request.nextUrl.clone()
        home.pathname = '/'
        home.search = ''
        const response = NextResponse.redirect(home)
        clearDemoCookie(response)
        return response
      }

      const subPath = pathname.slice(prefix.length) // e.g. '/passport' or ''
      const rewriteUrl = request.nextUrl.clone()
      rewriteUrl.pathname = realBase + subPath

      const response = NextResponse.rewrite(rewriteUrl)
      // Always refresh the cookie so stale/expired values don't break the demo.
      // httpOnly: false so the client JS (AuthContext) can read it.
      response.cookies.set(DEMO_COOKIE, role, {
        path: '/',
        maxAge: 60 * 60 * 24, // 24 hours (matches /api/demo/[role] behavior)
        httpOnly: false,
        sameSite: 'lax',
      })
      // Prevent any CDN/browser caching of demo entry HTML so the cookie
      // is always sent on the first load.
      response.headers.set('cache-control', 'private, no-store, must-revalidate')
      return response
    }
  }

  // Only honor the demo cookie when demo mode is enabled AND the value is one
  // of the known roles. Anything else is ignored (and cleared below).
  const rawDemoCookie = request.cookies.get(DEMO_COOKIE)?.value
  const demoRole = getActiveDemoRole(rawDemoCookie)
  const hasStaleDemoCookie = rawDemoCookie !== undefined && demoRole === null
  const isDemoAdminOrg = demoRole === 'admin_org'
  const isDemoSuperadmin = demoRole === 'superadmin'
  const isDemoAdminLike = isDemoAdminOrg || isDemoSuperadmin

  // ── Supabase session refresh ──────────────────────────────────────────────
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  /** Final pass on every response: drop an invalid / disabled demo cookie. */
  const finalize = (response: NextResponse): NextResponse => {
    if (hasStaleDemoCookie) clearDemoCookie(response)
    return response
  }

  /** Redirect that carries over any refreshed Supabase auth cookies. */
  const redirectTo = (targetPath: string, loginPrompt = false): NextResponse => {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = targetPath
    if (loginPrompt) redirectUrl.searchParams.set('auth', 'login')
    const response = NextResponse.redirect(redirectUrl)
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie.name, cookie.value, cookie)
    })
    return finalize(response)
  }

  // Refresh session — important for keeping tokens valid
  let user = null
  let authError = false
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    authError = true
  }

  // Fail-closed: if the auth probe failed AND we're heading into a privileged
  // surface, redirect to login instead of letting the client-side guard race.
  // Public/founder paths (/tools) keep the previous fail-soft behavior since
  // the AuthProvider gates them anyway.
  if (
    authError &&
    !isDemoAdminLike &&
    (pathname.startsWith('/admin') || pathname.startsWith('/superadmin'))
  ) {
    return redirectTo('/', true)
  }

  // /superadmin routes: require authenticated superadmin (or demo superadmin cookie)
  if (pathname.startsWith('/superadmin')) {
    if (!user && !isDemoSuperadmin) {
      return redirectTo('/', true)
    }

    if (user && !isDemoSuperadmin) {
      const role = await fetchRole(supabase, user.id)
      if (role !== 'superadmin') {
        return redirectTo(role === 'admin_org' ? '/admin' : '/tools')
      }
    }

    return finalize(supabaseResponse)
  }

  // /admin routes: require authentication + admin_org role (or demo admin cookie).
  // Superadmins are redirected into /superadmin instead.
  if (pathname.startsWith('/admin') && !user && !isDemoAdminLike) {
    return redirectTo('/', true)
  }

  if (pathname.startsWith('/admin') && isDemoSuperadmin) {
    return redirectTo('/superadmin')
  }

  if (pathname.startsWith('/admin') && user && !isDemoAdminLike) {
    const role = await fetchRole(supabase, user.id)

    // null = timeout / no profile → /tools (documented fallback)
    if (role === 'superadmin') return redirectTo('/superadmin')
    if (role !== 'admin_org') return redirectTo('/tools')
  }

  // /tools routes: auth handled client-side by AuthProvider
  return finalize(supabaseResponse)
}

export const config = {
  matcher: [
    '/tools/:path*',
    '/admin/:path*',
    '/superadmin/:path*',
    '/demo-tools',
    '/demo-tools/:path*',
    '/demo-admin',
    '/demo-admin/:path*',
    '/demo-superadmin',
    '/demo-superadmin/:path*',
  ],
}
