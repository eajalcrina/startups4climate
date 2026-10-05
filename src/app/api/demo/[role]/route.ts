import { NextRequest, NextResponse } from 'next/server'
import { DEMO_COOKIE, isDemoEnabled, parseDemoRole, type DemoRole } from '@/lib/security/demo'

/**
 * GET /api/demo/[role] — Sets the s4c_demo cookie and redirects to the
 * appropriate landing surface for that role. Designed for direct-link demos
 * (sales, stakeholder presentations) without typing credentials.
 *
 * Roles:
 *   founder    → /tools
 *   admin_org  → /admin
 *   superadmin → /superadmin
 */
const ROLE_TO_DESTINATION: Record<DemoRole, string> = {
  founder: '/tools',
  admin_org: '/admin',
  superadmin: '/superadmin',
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ role: string }> }
) {
  // Production gate: demo cookie endpoints disabled unless explicitly enabled.
  // Prevents anonymous visitors from impersonating admin/superadmin in prod.
  // Shared with the proxy and /api/ai/chat via isDemoEnabled().
  if (!isDemoEnabled()) {
    return new NextResponse('Not Found', { status: 404 })
  }

  const role = parseDemoRole((await context.params).role)

  if (!role) {
    return NextResponse.redirect(new URL('/', _request.url))
  }

  const destination = ROLE_TO_DESTINATION[role]
  const response = NextResponse.redirect(new URL(destination, _request.url))

  // 24h demo session via cookie that the proxy + AuthContext both honor
  response.cookies.set(DEMO_COOKIE, role, {
    path: '/',
    maxAge: 86400,
    sameSite: 'lax',
    httpOnly: false, // must be readable by AuthContext via document.cookie
  })

  return response
}
