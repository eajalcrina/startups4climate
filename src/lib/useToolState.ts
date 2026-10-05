'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { saveToolDataSync, syncToolDataToSupabase, loadToolDataWithFallback } from './progress'

/**
 * Hook that loads tool data from Supabase first (fallback to localStorage) and
 * auto-saves to Supabase first with localStorage as backup cache.
 *
 * `legacyToolId` is read only when nothing is stored under `toolId` (e.g. a
 * tool whose storage id changed); saves always go to `toolId`.
 */
export function useToolState<T extends object>(
  userId: string,
  toolId: string,
  defaultValue: T,
  legacyToolId?: string
): [T, (updater: T | ((prev: T) => T)) => void, boolean] {
  const [state, setState] = useState<T>(defaultValue)
  const [loaded, setLoaded] = useState(false)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stateRef = useRef(state)
  // Keep the latest state for the debounced save and the unmount flush
  useEffect(() => {
    stateRef.current = state
  }, [state])

  // Load from Supabase first, fallback to localStorage. If nothing is stored
  // under `toolId`, try `legacyToolId` (data is re-saved under `toolId`).
  useEffect(() => {
    let cancelled = false

    async function load() {
      const loadedData = await loadToolDataWithFallback(
        userId,
        toolId,
        legacyToolId ? [legacyToolId] : []
      )
      if (cancelled) return
      if (loadedData) {
        const saved = loadedData.data
        const values = ('values' in saved && saved.values && typeof saved.values === 'object')
          ? saved.values as T
          : saved as unknown as T
        setState({ ...defaultValue, ...values })
        // Refresh the local cache with what Supabase returned
        if (loadedData.source === 'remote' && loadedData.toolId === toolId) {
          saveToolDataSync(userId, toolId, saved)
        }
      }
      setLoaded(true)
    }

    load()
    return () => { cancelled = true }
  }, [userId, toolId, legacyToolId]) // eslint-disable-line react-hooks/exhaustive-deps

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
