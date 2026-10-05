'use client'

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import { supabase } from '@/lib/supabase'
import type { Session } from '@supabase/supabase-js'
import { applyDiagnosticToProfile } from '@/lib/diagnostic-sync'
import {
  DEMO_FOUNDER_USER,
  DEMO_ADMIN_USER,
  DEMO_SUPERADMIN_USER,
  seedDemoFounderData,
} from '@/lib/demo/founder-fixtures'

export interface AppUser {
  id: string
  email: string
  role: 'founder' | 'admin_org' | 'superadmin'
  org_id: string | null
  full_name: string
  startup_name: string | null
  stage?: 'ideacion' | 'pre-incubacion' | 'incubacion' | 'aceleracion' | 'escalamiento' | null
  diagnosticScore: number | null
  created_at: string
  gender?: 'masculino' | 'femenino' | 'otro' | 'prefiero_no_decir' | null
}

/**
 * Backward-compatible User shape consumed by existing components.
 * Maps AppUser fields to the legacy field names.
 */
export interface User {
  id: string
  name: string
  email: string
  startup: string
  stage: string | null
  diagnosticScore: number | null
  createdAt: string
}

interface AuthContextType {
  user: User | null
  appUser: AppUser | null
  loading: boolean
  isDemo: boolean
  login: (email: string, password: string) => Promise<{ error?: string; role?: string }>
  register: (
    email: string,
    password: string,
    name: string,
    startup: string
  ) => Promise<{ error?: string; role?: string }>
  logout: () => Promise<void>
  updateProfile: (updates: Partial<Pick<AppUser, 'full_name' | 'startup_name' | 'stage' | 'diagnosticScore' | 'gender'>>) => Promise<{ error?: string }>
  openAuthModal: (mode?: 'login' | 'register') => void
  closeAuthModal: () => void
  authModalOpen: boolean
  authModalMode: 'login' | 'register'
  updateUserStage: (stage: AppUser['stage'], score: number) => void
  enterDemoMode: (role: 'founder' | 'admin_org' | 'superadmin') => void
  refreshUser: () => Promise<void>
}

/* ─── Demo user fixtures (see src/lib/demo/founder-fixtures.ts) ─── */
export {
  DEMO_FOUNDER_ID,
  DEMO_ADMIN_ID,
  DEMO_ORG_ID,
  DEMO_SUPERADMIN_ID,
  isDemoUserId,
} from '@/lib/demo/founder-fixtures'

const AuthContext = createContext<AuthContextType | null>(null)

function appUserToUser(appUser: AppUser): User {
  return {
    id: appUser.id,
    name: appUser.full_name,
    email: appUser.email,
    startup: appUser.startup_name || '',
    stage: appUser.stage ?? null,
    diagnosticScore: appUser.diagnosticScore,
    createdAt: appUser.created_at,
  }
}

/**
 * Build a minimal AppUser from the Supabase auth session.
 * Used as a fallback when the profiles table query fails so the user
 * is not stuck on a loading spinner forever.
 */
async function fallbackAppUser(session: Session): Promise<AppUser> {
  // Read role/org_id from user_metadata first — available immediately from JWT,
  // no DB round-trip needed. We DO NOT await a profiles query here: under
  // bad network or RLS races the query can stall for >8s, which blocks
  // session hydration on reload and trips the safety-timeout fallback.
  // Stale metadata is acceptable; loadProfile() runs separately as the
  // canonical enrichment path.
  const meta = session.user.user_metadata || {}
  const role: 'founder' | 'admin_org' | 'superadmin' =
    (meta.role as 'founder' | 'admin_org' | 'superadmin') || 'founder'
  const org_id: string | null = (meta.org_id as string) || null

  return {
    id: session.user.id,
    email: session.user.email ?? '',
    role,
    org_id,
    full_name: session.user.user_metadata?.full_name ?? session.user.email ?? '',
    startup_name: session.user.user_metadata?.startup_name ?? null,
    stage: null,
    diagnosticScore: null,
    created_at: session.user.created_at ?? new Date().toISOString(),
  }
}

async function loadProfile(userId: string): Promise<AppUser | null> {
  try {
    // Race the profile query against a timeout so we never hang
    const result = await Promise.race([
      supabase
        .from('profiles')
        .select('id, email, full_name, role, org_id, startup_name, stage, diagnostic_score, created_at, gender')
        .eq('id', userId)
        .maybeSingle(),
      new Promise<{ data: null; error: { message: string } }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: { message: 'Timeout' } }), 5000)
      ),
    ])

    const { data, error } = result

    if (error || !data) return null

    return {
      id: data.id,
      email: data.email,
      role: data.role || 'founder',
      org_id: data.org_id || null,
      full_name: data.full_name || '',
      startup_name: data.startup_name || null,
      stage: (data.stage as AppUser['stage']) ?? null,
      diagnosticScore: data.diagnostic_score ?? null,
      created_at: data.created_at || new Date().toISOString(),
      gender: (data.gender as AppUser['gender']) ?? null,
    }
  } catch {
    // Network or unexpected errors — caller should use fallback
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login')
  const [isDemo, setIsDemo] = useState(false)
  // Flag to prevent onAuthStateChange from overwriting the user
  // that login/register already set with accurate role data.
  const loginInProgressRef = React.useRef(false)

  const user = appUser ? appUserToUser(appUser) : null

  useEffect(() => {
    let cancelled = false

    // Safety: never stay stuck on loading spinner for more than 8 seconds
    // Last-resort safety net. The auth listener should always fire INITIAL_SESSION
    // and flip loading=false within ~1s. If we hit this timeout, something in
    // the Supabase client is broken — release the spinner so the user sees the
    // page rather than block forever, and log loudly so we can investigate.
    const safetyTimeout = setTimeout(() => {
      setLoading((prev) => {
        if (prev) {
          console.error(
            '[S4C Auth] INITIAL_SESSION never fired in 5s — releasing loading state. ' +
            'Supabase auth client may be misconfigured or unreachable.'
          )
        }
        return false
      })
    }, 5000)

    // Rehydrate demo session from cookie before hitting Supabase. Without this,
    // refreshing /tools or /admin in demo mode redirects back to / because
    // appUser is null during the Supabase round-trip.
    if (typeof document !== 'undefined') {
      const demoCookie = document.cookie
        .split('; ')
        .find((c) => c.startsWith('s4c_demo='))
        ?.split('=')[1] as 'founder' | 'admin_org' | 'superadmin' | undefined
      if (demoCookie === 'founder') {
        seedDemoFounderData()
        setAppUser({ ...DEMO_FOUNDER_USER })
        setIsDemo(true)
        setLoading(false)
        clearTimeout(safetyTimeout)
        return () => { cancelled = true }
      }
      if (demoCookie === 'admin_org') {
        setAppUser({ ...DEMO_ADMIN_USER })
        setIsDemo(true)
        setLoading(false)
        clearTimeout(safetyTimeout)
        return () => { cancelled = true }
      }
      if (demoCookie === 'superadmin') {
        setAppUser({ ...DEMO_SUPERADMIN_USER })
        setIsDemo(true)
        setLoading(false)
        clearTimeout(safetyTimeout)
        return () => { cancelled = true }
      }
    }

    // Single source of truth: onAuthStateChange.
    //
    // Supabase fires INITIAL_SESSION immediately when the listener is attached,
    // covering the cold-load hydration case without needing a parallel
    // getSession()/getUser() pass. Having one source eliminates the race
    // condition where the listener overwrites freshly-set appUser data.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (cancelled) return

      // Token refreshes don't change identity — keep current user as-is
      if (event === 'TOKEN_REFRESHED') return

      // login()/register() set appUser explicitly with authoritative data.
      // Skip listener handling during that window so we don't overwrite it
      // with the role/org_id from JWT user_metadata which may be stale.
      if (loginInProgressRef.current) {
        if (event === 'INITIAL_SESSION' && !cancelled) setLoading(false)
        return
      }

      if (event === 'SIGNED_OUT') {
        setAppUser(null)
        if (!cancelled) setLoading(false)
        return
      }

      if (session?.user) {
        // Hydrate from JWT user_metadata immediately — no DB call, no race.
        try {
          const enriched = await fallbackAppUser(session)
          if (!cancelled) setAppUser(enriched)
        } catch {
          if (!cancelled) {
            setAppUser({
              id: session.user.id,
              email: session.user.email ?? '',
              role: 'founder',
              org_id: null,
              full_name: session.user.email ?? '',
              startup_name: null,
              stage: null,
              diagnosticScore: null,
              created_at: session.user.created_at ?? new Date().toISOString(),
            })
          }
        }
        if (!cancelled) setLoading(false)

        // Background: enrich with fresh profile data (full_name, startup_name,
        // stage, diagnosticScore). Best-effort; don't block render.
        loadProfile(session.user.id)
          .then((profile) => {
            if (!cancelled && profile) setAppUser(profile)
          })
          .catch(() => {})
      } else {
        // INITIAL_SESSION with no session = user not logged in
        if (!cancelled) setLoading(false)
      }
    })

    return () => {
      cancelled = true
      clearTimeout(safetyTimeout)
      subscription.unsubscribe()
    }
  }, [])

  const register = useCallback(
    async (email: string, password: string, name: string, startup: string) => {
      loginInProgressRef.current = true
      try {
        const { data, error } = await supabase.auth.signUp({
          email: email.toLowerCase(),
          password,
          options: {
            data: {
              full_name: name,
              startup_name: startup,
            },
          },
        })

        if (error) {
          loginInProgressRef.current = false
          return { error: mapSupabaseError(error.message) }
        }

        // If email confirmation is enabled in Supabase, session will be null.
        // In that case, try to sign in immediately with password to get a session.
        let activeUser = data.user
        if (!data.session && data.user) {
          const { data: signInData, error: signInError } =
            await supabase.auth.signInWithPassword({
              email: email.toLowerCase(),
              password,
            })
          if (signInError) {
            loginInProgressRef.current = false
            if (signInError.message.includes('Email not confirmed')) {
              return { error: 'Debes confirmar tu email antes de iniciar sesión. Revisa tu bandeja de entrada.' }
            }
            return { error: mapSupabaseError(signInError.message) }
          }
          activeUser = signInData.user
        }

        // Set a minimal user IMMEDIATELY so the UI is never blocked
        // regardless of what happens with profile loading below
        const role: string = 'founder'
        if (activeUser) {
          const minimalUser: AppUser = {
            id: activeUser.id,
            email: activeUser.email ?? email,
            role: 'founder',
            org_id: null,
            full_name: name,
            startup_name: startup,
            stage: null,
            diagnosticScore: null,
            created_at: activeUser.created_at ?? new Date().toISOString(),
          }
          setAppUser(minimalUser)

          // Try to ensure profile exists in background — don't block the return
          ;(async () => {
            try {
              let profile = await loadProfile(activeUser!.id)
              if (!profile) {
                await supabase.from('profiles').upsert({
                  id: activeUser!.id,
                  email: activeUser!.email,
                  full_name: name,
                  startup_name: startup,
                  role: 'founder',
                  created_at: new Date().toISOString(),
                })
                profile = await loadProfile(activeUser!.id)
              }

              // Check for pending diagnostic results from the landing page quiz.
              // DiagnosticForm writes { total_score, perfil_etapa, dimension_scores, tags, answers, ... }
              let pendingDiagnostic: {
                total_score?: number
                perfil_etapa?: number | string
                dimension_scores?: Record<string, number>
                answers?: Record<string, unknown>
                tags?: Record<string, unknown>
              } | null = null
              try {
                const pendingRaw = localStorage.getItem('s4c_diagnostic_pending')
                if (pendingRaw) {
                  pendingDiagnostic = JSON.parse(pendingRaw)
                  // Persist as a diagnostics row linked to the user
                  if (pendingDiagnostic?.total_score != null) {
                    await supabase.from('diagnostics').insert({
                      user_id: activeUser!.id,
                      score: pendingDiagnostic.total_score,
                      profile: String(pendingDiagnostic.perfil_etapa ?? ''),
                      answers: pendingDiagnostic.answers ?? {},
                      dimension_scores: pendingDiagnostic.dimension_scores ?? {},
                    })
                  }
                  localStorage.removeItem('s4c_diagnostic_pending')
                }
              } catch (err) {
                console.error('[S4C Sync] pending diagnostic read failed:', err)
              }

              // Hydrate profile + startup. When there's no pending diagnostic,
              // we still need a startup row (NOT NULL vertical/country) so the
              // helper writes safe fallbacks (vertical='other', country='Perú').
              await applyDiagnosticToProfile(supabase, activeUser!.id, {
                total_score: pendingDiagnostic?.total_score ?? null,
                perfil_etapa: pendingDiagnostic?.perfil_etapa ?? null,
                dimension_scores: pendingDiagnostic?.dimension_scores ?? null,
                answers: pendingDiagnostic?.answers ?? null,
                tags: pendingDiagnostic?.tags ?? null,
              })

              profile = await loadProfile(activeUser!.id)
              if (profile) {
                setAppUser(profile)
              }
            } catch (err) {
              console.error('[S4C Sync] register post-signup hydration threw:', err)
            } finally {
              loginInProgressRef.current = false
            }
          })()

          return { role }
        }

        loginInProgressRef.current = false
        return { role }
      } catch {
        loginInProgressRef.current = false
        return { error: 'Error de conexión. Verifica tu internet e intenta de nuevo.' }
      }
    },
    []
  )

  const login = useCallback(async (email: string, password: string) => {
    // Wrap entire login in a race against a timeout so the UI never hangs
    const loginPromise = (async () => {
      try {
        // Prevent onAuthStateChange from overwriting user data we set here
        loginInProgressRef.current = true
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.toLowerCase(),
          password,
        })

        if (error) {
          loginInProgressRef.current = false
          return { error: mapSupabaseError(error.message) }
        }

        if (!data.user || !data.session) {
          loginInProgressRef.current = false
          return { error: 'No se pudo iniciar sesión.' }
        }

        // Get role — try REST first, then Supabase client as fallback
        let role: string = 'founder'
        let orgId: string | null = null

        try {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
          const controller = new AbortController()
          const fetchTimeout = setTimeout(() => controller.abort(), 4000)
          const res = await fetch(
            `${supabaseUrl}/rest/v1/profiles?select=role,org_id&id=eq.${data.user.id}`,
            {
              headers: {
                'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                'Authorization': `Bearer ${data.session.access_token}`,
                'Accept': 'application/json',
              },
              signal: controller.signal,
            }
          )
          clearTimeout(fetchTimeout)
          if (res.ok) {
            const rows = await res.json()
            if (rows?.[0]?.role) role = rows[0].role
            if (rows?.[0]?.org_id) orgId = rows[0].org_id
          }
        } catch {
          // REST failed — try Supabase client as fallback
          try {
            const { data: profile } = await Promise.race([
              supabase
                .from('profiles')
                .select('role, org_id')
                .eq('id', data.user.id)
                .maybeSingle(),
              new Promise<{ data: null }>((resolve) =>
                setTimeout(() => resolve({ data: null }), 3000)
              ),
            ])
            if (profile?.role) role = profile.role
            if (profile?.org_id) orgId = profile.org_id
          } catch {
            // Both methods failed — proceed with default role
          }
        }

        // Set a minimal user immediately so the UI is not blocked
        const appUserData: AppUser = {
          id: data.user.id,
          email: data.user.email ?? '',
          role: role as AppUser['role'],
          org_id: orgId,
          full_name: data.user.user_metadata?.full_name ?? data.user.email ?? '',
          startup_name: data.user.user_metadata?.startup_name ?? null,
          stage: null,
          diagnosticScore: null,
          created_at: data.user.created_at ?? new Date().toISOString(),
        }
        setAppUser(appUserData)

        // Enrich with full profile in background (don't block login)
        loadProfile(data.user.id).then((profile) => {
          if (profile) {
            profile.role = role as AppUser['role']
            profile.org_id = orgId
            setAppUser(profile)
          }
        }).catch(() => {}).finally(() => {
          loginInProgressRef.current = false
        })

        return { role }
      } catch {
        loginInProgressRef.current = false
        return { error: 'Error de conexión. Verifica tu internet e intenta de nuevo.' }
      }
    })()

    // Hard timeout: if login takes more than 10s, return error
    return Promise.race([
      loginPromise,
      new Promise<{ error: string }>((resolve) =>
        setTimeout(() => {
          loginInProgressRef.current = false
          resolve({ error: 'La conexión tardó demasiado. Intenta de nuevo.' })
        }, 10000)
      ),
    ])
  }, [])

  const enterDemoMode = useCallback((role: 'founder' | 'admin_org' | 'superadmin') => {
    // Rehydrate demo user from fixtures (force re-render) and seed localStorage.
    setIsDemo(true)
    if (role === 'founder') {
      seedDemoFounderData()
      setAppUser({ ...DEMO_FOUNDER_USER })
    } else if (role === 'admin_org') {
      setAppUser({ ...DEMO_ADMIN_USER })
    } else {
      setAppUser({ ...DEMO_SUPERADMIN_USER })
    }
    setLoading(false)
    // Set a cookie so middleware lets demo users through (24h lifetime).
    if (typeof document !== 'undefined') {
      document.cookie = `s4c_demo=${role}; path=/; max-age=86400; SameSite=Lax`
    }
  }, [])

  const logout = useCallback(async () => {
    const userId = appUser?.id
    // Demo mode doesn't have a real Supabase session
    if (isDemo) {
      setIsDemo(false)
      setAppUser(null)
      try {
        if (userId) localStorage.removeItem(`s4c_${userId}_tool_progress`)
      } catch { /* ignore */ }
      if (typeof document !== 'undefined') {
        document.cookie = 's4c_demo=; path=/; max-age=0; SameSite=Lax'
      }
      return
    }
    await supabase.auth.signOut()
    setAppUser(null)
    // Clear user-specific localStorage data
    if (userId) {
      try {
        localStorage.removeItem(`s4c_${userId}_tool_progress`)
        localStorage.removeItem(`s4c_${userId}_profile_extra`)
        localStorage.removeItem(`s4c_${userId}_profile`)
        localStorage.removeItem(`s4c_${userId}_startup`)
      } catch { /* ignore */ }
    }
    // Also clear non-namespaced legacy keys
    try {
      localStorage.removeItem('s4c_tool_progress')
      localStorage.removeItem('s4c_profile_extra')
      localStorage.removeItem('s4c_profile')
      localStorage.removeItem('s4c_startup')
      localStorage.removeItem('s4c_diagnostic_pending')
      sessionStorage.removeItem('s4c_profile_checked')
    } catch { /* ignore */ }
  }, [appUser, isDemo])

  const updateProfile = useCallback(
    async (updates: Partial<Pick<AppUser, 'full_name' | 'startup_name' | 'stage' | 'diagnosticScore' | 'gender'>>) => {
      if (!appUser) return { error: 'No hay sesión activa.' }

      const dbUpdates: Record<string, unknown> = {}
      if (updates.full_name !== undefined) dbUpdates.full_name = updates.full_name
      if (updates.startup_name !== undefined) dbUpdates.startup_name = updates.startup_name
      if (updates.stage !== undefined) dbUpdates.stage = updates.stage
      if (updates.diagnosticScore !== undefined) dbUpdates.diagnostic_score = updates.diagnosticScore
      if (updates.gender !== undefined) dbUpdates.gender = updates.gender

      const { error } = await supabase
        .from('profiles')
        .update(dbUpdates)
        .eq('id', appUser.id)

      if (error) {
        return { error: 'No se pudo actualizar el perfil.' }
      }

      setAppUser((prev) => prev ? { ...prev, ...updates } : prev)
      return {}
    },
    [appUser]
  )

  const openAuthModal = useCallback((mode: 'login' | 'register' = 'login') => {
    setAuthModalMode(mode)
    setAuthModalOpen(true)
  }, [])

  const closeAuthModal = useCallback(() => {
    setAuthModalOpen(false)
  }, [])

  const updateUserStage = useCallback(
    (stage: AppUser['stage'], score: number) => {
      if (!appUser) return

      setAppUser((prev) => prev ? { ...prev, stage, diagnosticScore: score } : prev)

      // Sync to Supabase in background
      supabase
        .from('profiles')
        .update({ stage, diagnostic_score: score })
        .eq('id', appUser.id)
        .then(() => {})
    },
    [appUser]
  )

  const refreshUser = useCallback(async () => {
    if (!appUser) return
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, org_id, startup_name, stage, gender')
      .eq('id', appUser.id)
      .maybeSingle()
    if (profile) {
      setAppUser({
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email ?? appUser.email,
        role: profile.role,
        org_id: profile.org_id ?? null,
        startup_name: profile.startup_name ?? undefined,
        stage: (profile.stage as AppUser['stage']) ?? null,
        diagnosticScore: appUser.diagnosticScore,
        created_at: appUser.created_at,
      })
    }
  }, [appUser])

  return (
    <AuthContext.Provider
      value={{
        user,
        appUser,
        loading,
        isDemo,
        login,
        register,
        logout,
        updateProfile,
        openAuthModal,
        closeAuthModal,
        authModalOpen,
        authModalMode,
        updateUserStage,
        enterDemoMode,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

function mapSupabaseError(message: string): string {
  if (message.includes('Invalid login credentials')) {
    return 'Email o contraseña incorrectos.'
  }
  if (message.includes('User already registered')) {
    return 'Ya existe una cuenta con ese email.'
  }
  if (message.includes('Email not confirmed')) {
    return 'Revisa tu email para confirmar tu cuenta.'
  }
  if (message.includes('Password should be at least')) {
    return 'La contraseña debe tener al menos 6 caracteres.'
  }
  if (message.includes('Unable to validate email')) {
    return 'El email ingresado no es válido.'
  }
  if (message.includes('Email rate limit exceeded')) {
    return 'Demasiados intentos. Intenta de nuevo en unos minutos.'
  }
  if (message.includes('signups') && message.includes('disabled')) {
    return 'El registro no está disponible en este momento. Contacta al administrador.'
  }
  if (message.includes('Database error')) {
    return 'Error temporal del servidor. Intenta de nuevo en unos segundos.'
  }
  return message
}
