'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthContext'

export interface StartupProfile {
  id: string
  name: string
  description: string | null
  vertical: string
  country: string
  stage: string | null
  diagnostic_score: number | null
  team_size: number | null
  revenue_model: string | null
  monthly_revenue: number | null
  tam_usd: number | null
  ltv: number | null
  cac: number | null
  has_mvp: boolean
  has_paying_customers: boolean
  paying_customers_count: number
  tools_completed: number
  current_stage_progress: number
}

interface StartupContextType {
  startup: StartupProfile | null
  loading: boolean
  updateStartup: (data: Partial<StartupProfile>) => Promise<void>
  refreshStartup: () => Promise<void>
}

const StartupContext = createContext<StartupContextType | null>(null)

function startupCacheKey(userId: string): string {
  return `s4c_${userId}_startup`
}

function getCachedStartup(userId: string): StartupProfile | null {
  if (typeof window === 'undefined') return null
  try {
    const cached = localStorage.getItem(startupCacheKey(userId))
    return cached ? JSON.parse(cached) : null
  } catch {
    return null
  }
}

function cacheStartup(userId: string, startup: StartupProfile | null) {
  if (typeof window === 'undefined') return
  if (startup) {
    localStorage.setItem(startupCacheKey(userId), JSON.stringify(startup))
  } else {
    localStorage.removeItem(startupCacheKey(userId))
  }
}

// Matches RFC 4122 UUID. Skip Supabase for non-UUID ids (e.g. demo users).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function StartupProvider({ children }: { children: ReactNode }) {
  const { user, appUser, isDemo } = useAuth()
  const [startup, setStartup] = useState<StartupProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStartup = useCallback(async () => {
    if (!user) {
      setStartup(null)
      setLoading(false)
      return
    }

    // Skip startup fetch for non-founder roles (admin_org, superadmin) — they
    // don't have a startups row and the query 400s with admin-demo ids anyway.
    if (appUser && appUser.role !== 'founder') {
      setStartup(null)
      setLoading(false)
      return
    }

    // Skip Supabase for demo users (id is not a valid UUID → 400) and fall back
    // to any locally cached startup (seeded by the demo bootstrap).
    if (isDemo || !UUID_RE.test(user.id)) {
      const cached = getCachedStartup(user.id)
      setStartup(cached ?? null)
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('startups')
        .select('*')
        .eq('founder_id', user.id)
        .maybeSingle()

      if (error) throw error
      // No startup row yet — use the same cache fallback as a failed query
      if (!data) throw new Error('No startup row for founder')

      const profile: StartupProfile = {
        id: data.id,
        name: data.name ?? user.startup ?? '',
        description: data.description ?? null,
        vertical: data.vertical ?? '',
        country: data.country ?? '',
        stage: data.stage ?? null,
        diagnostic_score: data.diagnostic_score ?? null,
        team_size: data.team_size ?? null,
        revenue_model: data.revenue_model ?? null,
        monthly_revenue: data.monthly_revenue ?? null,
        tam_usd: data.tam_usd ?? null,
        ltv: data.ltv ?? null,
        cac: data.cac ?? null,
        has_mvp: data.has_mvp ?? false,
        has_paying_customers: data.has_paying_customers ?? false,
        paying_customers_count: data.paying_customers_count ?? 0,
        tools_completed: data.tools_completed ?? 0,
        current_stage_progress: data.current_stage_progress ?? 0,
      }

      setStartup(profile)
      cacheStartup(user.id, profile)
    } catch {
      // Supabase unreachable or no startup row — fall back to cache
      const cached = getCachedStartup(user.id)
      if (cached) {
        setStartup(cached)
      } else {
        setStartup(null)
      }
    } finally {
      setLoading(false)
    }
  }, [user, appUser, isDemo])

  useEffect(() => {
    fetchStartup()
  }, [fetchStartup])

  const updateStartup = useCallback(
    async (data: Partial<StartupProfile>) => {
      setStartup(prev => {
        if (!prev) return prev
        const updated = { ...prev, ...data }
        if (user) cacheStartup(user.id, updated)
        
        // Sync to Supabase in background
        supabase
          .from('startups')
          .update(data)
          .eq('id', prev.id)
          .then(({ error }) => {
            if (error) console.error('Error syncing startup:', error)
          })

        return updated
      })
    },
    [user]
  )

  const refreshStartup = useCallback(async () => {
    await fetchStartup()
  }, [fetchStartup])

  return (
    <StartupContext.Provider
      value={{
        startup,
        loading,
        updateStartup,
        refreshStartup,
      }}
    >
      {children}
    </StartupContext.Provider>
  )
}

export function useStartup() {
  const ctx = useContext(StartupContext)
  if (!ctx) throw new Error('useStartup debe usarse dentro de StartupProvider')
  return ctx
}
