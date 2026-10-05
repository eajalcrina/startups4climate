'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { getToolData, saveToolDataSync, syncToolDataToSupabase, loadToolDataFromSupabase } from './progress'

/**
 * Hook that loads tool data from Supabase first (fallback to localStorage) and
 * auto-saves to Supabase first with localStorage as backup cache.
 */
export function useToolState<T extends object>(
  userId: string,
  toolId: string,
  defaultValue: T
): [T, (updater: T | ((prev: T) => T)) => void, boolean] {
  const [state, setState] = useState<T>(defaultValue)
  const [loaded, setLoaded] = useState(false)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stateRef = useRef(state)
  // Keep the latest state for the debounced save and the unmount flush
  useEffect(() => {
    stateRef.current = state
  }, [state])

  // Load from Supabase first, fallback to localStorage
  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const remote = await loadToolDataFromSupabase(userId, toolId)
        if (!cancelled && remote && Object.keys(remote).length > 0) {
          const values = ('values' in remote && remote.values && typeof remote.values === 'object')
            ? remote.values as T
            : remote as unknown as T
          setState({ ...defaultValue, ...values })
          // Also cache to localStorage
          saveToolDataSync(userId, toolId, remote)
          setLoaded(true)
          return
        }
      } catch {
        console.warn('[S4C Sync] Offline mode — loading tool data from localStorage')
      }

      // Fallback to localStorage
      if (!cancelled) {
        const saved = getToolData(userId, toolId) as { values?: T } & T
        if (saved && Object.keys(saved).length > 0) {
          if ('values' in saved && saved.values && typeof saved.values === 'object') {
            setState({ ...defaultValue, ...saved.values as T })
          } else {
            setState({ ...defaultValue, ...saved as T })
          }
        }
        setLoaded(true)
      }
    }

    load()
    return () => { cancelled = true }
  }, [userId, toolId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced save — 500ms after last change, Supabase first + localStorage cache
  useEffect(() => {
    if (!loaded) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      const payload = { values: stateRef.current }
      // Save to Supabase first, then cache to localStorage
      syncToolDataToSupabase(userId, toolId, payload)
        .then(() => {
          saveToolDataSync(userId, toolId, payload)
        })
        .catch((err) => {
          console.error('[S4C Sync] Failed to save to Supabase, caching locally:', err)
          saveToolDataSync(userId, toolId, payload)
        })
    }, 500)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [state, userId, toolId, loaded])

  // Save immediately on unmount (sync only — async not reliable in cleanup)
  useEffect(() => {
    return () => {
      const payload = { values: stateRef.current }
      saveToolDataSync(userId, toolId, payload)
      // Fire-and-forget Supabase sync
      syncToolDataToSupabase(userId, toolId, payload).catch((err) => {
        console.error('[S4C Sync] Failed to save on unmount:', err)
      })
    }
  }, [userId, toolId])

  const update = useCallback((updater: T | ((prev: T) => T)) => {
    setState(updater)
  }, [])

  return [state, update, loaded]
}
