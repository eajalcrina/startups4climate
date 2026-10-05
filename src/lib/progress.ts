import { supabase } from './supabase'

/* ─── UUID helpers ─── */
// Real users have RFC 4122 UUIDs. Demo users (e.g. "demo-founder-...") don't,
// and Postgres rejects them with a 400 when used in `eq('user_id', …)` filters.
// We skip all Supabase round-trips for those IDs and use localStorage as the
// source of truth.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function isRemoteSyncable(userId: string): boolean {
  return UUID_RE.test(userId)
}

/* ─── Retry helper for Supabase writes ─── */
async function withRetry<T>(fn: () => Promise<T>, retries = 2, delayMs = 500): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      if (attempt === retries) throw err
      console.warn(`[S4C Sync] Retry ${attempt + 1}/${retries} after error:`, err)
      await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)))
    }
  }
  throw new Error('withRetry exhausted') // unreachable
}

export interface ToolProgressEntry {
  completed: boolean
  completedAt: string | null
  data: Record<string, unknown>
  reportGenerated: boolean
  lastSaved: string | null
}

export type ProgressMap = Record<string, ToolProgressEntry>

/* ─── localStorage helpers (namespaced by userId) ─── */

function cacheKey(userId: string): string {
  return `s4c_${userId}_tool_progress`
}

function getLocalProgress(userId: string): ProgressMap {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(cacheKey(userId)) || '{}')
  } catch {
    return {}
  }
}

function saveLocalProgress(userId: string, progress: ProgressMap) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(cacheKey(userId), JSON.stringify(progress))
  } catch {
    console.error('[S4C Sync] Failed to write localStorage cache')
  }
}

/* ─── Public read API (Supabase-first, localStorage fallback) ─── */

/**
 * Get all tool progress for a user.
 * This is the SYNCHRONOUS version that reads from the localStorage cache.
 * For the async Supabase-first version, use `getProgressAsync()`.
 */
export function getProgress(userId: string): ProgressMap {
  return getLocalProgress(userId)
}

/**
 * Get all tool progress from Supabase first, falling back to localStorage.
 */
export async function getProgressAsync(userId: string): Promise<ProgressMap> {
  // Demo users: skip Supabase (non-UUID id → 400), read from localStorage only
  if (!isRemoteSyncable(userId)) return getLocalProgress(userId)

  try {
    const { data, error } = await supabase
      .from('tool_data')
      .select('tool_id, data, completed, report_generated, last_saved')
      .eq('user_id', userId)

    if (error) throw error
    if (!data || data.length === 0) {
      // No remote data — return local cache
      console.warn('[S4C Sync] No remote data found, using localStorage cache')
      return getLocalProgress(userId)
    }

    const progress: ProgressMap = {}
    for (const row of data) {
      progress[row.tool_id] = {
        completed: row.completed ?? false,
        completedAt: row.completed ? (row.last_saved ?? new Date().toISOString()) : null,
        data: (row.data as Record<string, unknown>) ?? {},
        reportGenerated: row.report_generated ?? false,
        lastSaved: row.last_saved ?? null,
      }
    }

    // Update localStorage cache
    saveLocalProgress(userId, progress)
    return progress
  } catch {
    console.warn('[S4C Sync] Offline mode — reading from localStorage cache')
    return getLocalProgress(userId)
  }
}

/* ─── Public write API (Supabase-first, localStorage cache) ─── */

export async function saveToolData(userId: string, toolId: string, data: Record<string, unknown>) {
  const now = new Date().toISOString()

  // Build the entry for local cache
  const localProgress = getLocalProgress(userId)
  const existing = localProgress[toolId]
  const entry: ToolProgressEntry = {
    completed: existing?.completed ?? false,
    completedAt: existing?.completedAt ?? null,
    reportGenerated: existing?.reportGenerated ?? false,
    data,
    lastSaved: now,
  }

  // Demo users: skip Supabase entirely, localStorage is the source of truth
  if (!isRemoteSyncable(userId)) {
    localProgress[toolId] = entry
    saveLocalProgress(userId, localProgress)
    return
  }

  // Try Supabase first with retry
  try {
    await withRetry(async () => {
      const { error } = await supabase
        .from('tool_data')
        .upsert(
          {
            user_id: userId,
            tool_id: toolId,
            data,
            last_saved: now,
          },
          { onConflict: 'user_id,tool_id' }
        )
      if (error) throw error
    })
  } catch (err) {
    console.error('[S4C Sync] Failed to save tool data to Supabase after retries:', err)
  }

  // Always update localStorage cache
  localProgress[toolId] = entry
  saveLocalProgress(userId, localProgress)
}

/**
 * Synchronous localStorage-only save for use in unmount handlers
 * where async is not reliable.
 */
export function saveToolDataSync(userId: string, toolId: string, data: Record<string, unknown>) {
  const localProgress = getLocalProgress(userId)
  const existing = localProgress[toolId]
  localProgress[toolId] = {
    completed: existing?.completed ?? false,
    completedAt: existing?.completedAt ?? null,
    reportGenerated: existing?.reportGenerated ?? false,
    data,
    lastSaved: new Date().toISOString(),
  }
  saveLocalProgress(userId, localProgress)
}

export async function markToolCompleted(userId: string, toolId: string) {
  const now = new Date().toISOString()
  const localProgress = getLocalProgress(userId)
  const existing = localProgress[toolId]

  const entry: ToolProgressEntry = {
    data: existing?.data ?? {},
    reportGenerated: existing?.reportGenerated ?? false,
    lastSaved: existing?.lastSaved ?? now,
    completed: true,
    completedAt: now,
  }

  // Demo users: skip Supabase entirely
  if (!isRemoteSyncable(userId)) {
    localProgress[toolId] = entry
    saveLocalProgress(userId, localProgress)
    return
  }

  // Supabase first with retry
  try {
    await withRetry(async () => {
      const { error } = await supabase
        .from('tool_data')
        .upsert(
          {
            user_id: userId,
            tool_id: toolId,
            completed: true,
            report_generated: existing?.reportGenerated ?? false,
            last_saved: now,
          },
          { onConflict: 'user_id,tool_id' }
        )
      if (error) throw error
    })
  } catch (err) {
    console.error('[S4C Sync] Failed to mark tool completed in Supabase after retries:', err)
  }

  // Update local cache
  localProgress[toolId] = entry
  saveLocalProgress(userId, localProgress)
}

export async function markReportGenerated(userId: string, toolId: string) {
  const now = new Date().toISOString()
  const localProgress = getLocalProgress(userId)
  const existing = localProgress[toolId]

  const entry: ToolProgressEntry = {
    data: existing?.data ?? {},
    completed: existing?.completed ?? false,
    completedAt: existing?.completedAt ?? null,
    lastSaved: existing?.lastSaved ?? null,
    reportGenerated: true,
  }

  // Demo users: skip Supabase entirely
  if (!isRemoteSyncable(userId)) {
    localProgress[toolId] = entry
    saveLocalProgress(userId, localProgress)
    return
  }

  // Supabase first with retry
  try {
    await withRetry(async () => {
      const { error } = await supabase
        .from('tool_data')
        .upsert(
          {
            user_id: userId,
            tool_id: toolId,
            completed: existing?.completed ?? false,
            report_generated: true,
            last_saved: now,
          },
          { onConflict: 'user_id,tool_id' }
        )
      if (error) throw error
    })
  } catch (err) {
    console.error('[S4C Sync] Failed to mark report generated in Supabase after retries:', err)
  }

  // Update local cache
  localProgress[toolId] = entry
  saveLocalProgress(userId, localProgress)
}

export function getToolData(userId: string, toolId: string): Record<string, unknown> {
  return getProgress(userId)[toolId]?.data ?? {}
}

export function countCompleted(userId: string): number {
  const p = getProgress(userId)
  return Object.values(p).filter((e) => e.completed).length
}

/* ─── Supabase sync functions ─── */

/**
 * Upsert tool data to Supabase `tool_data` table.
 * Kept for backward compatibility — callers can use saveToolData() instead.
 */
export async function syncToolDataToSupabase(
  userId: string,
  toolId: string,
  data: Record<string, unknown>
) {
  if (!isRemoteSyncable(userId)) return // Demo users: no-op
  const { error } = await supabase
    .from('tool_data')
    .upsert(
      {
        user_id: userId,
        tool_id: toolId,
        data,
        last_saved: new Date().toISOString(),
      },
      { onConflict: 'user_id,tool_id' }
    )
  if (error) {
    console.error('[S4C Sync] syncToolDataToSupabase failed:', error)
    throw error
  }
}

/**
 * Load tool data from Supabase `tool_data` table.
 */
export async function loadToolDataFromSupabase(
  userId: string,
  toolId: string
): Promise<Record<string, unknown> | null> {
  if (!isRemoteSyncable(userId)) return null // Demo users: skip
  const { data, error } = await supabase
    .from('tool_data')
    .select('data')
    .eq('user_id', userId)
    .eq('tool_id', toolId)
    .maybeSingle()

  if (error || !data) return null
  return (data.data as Record<string, unknown>) ?? null
}

export interface LoadedToolData {
  /** The storage id the data was found under (`toolId` or a legacy id). */
  toolId: string
  source: 'remote' | 'local'
  data: Record<string, unknown>
}

function hasKeys(value: Record<string, unknown> | null | undefined): value is Record<string, unknown> {
  return !!value && Object.keys(value).length > 0
}

/**
 * Load a tool's saved data: Supabase first, then the namespaced localStorage
 * cache. When nothing is stored under `toolId`, each id in `legacyToolIds` is
 * tried the same way so data saved under an older storage id is not lost.
 * Callers keep saving under `toolId`, which migrates legacy data on the next
 * save (the legacy row is left untouched).
 */
export async function loadToolDataWithFallback(
  userId: string,
  toolId: string,
  legacyToolIds: readonly string[] = []
): Promise<LoadedToolData | null> {
  for (const id of [toolId, ...legacyToolIds]) {
    try {
      const remote = await loadToolDataFromSupabase(userId, id)
      if (hasKeys(remote)) return { toolId: id, source: 'remote', data: remote }
    } catch {
      console.warn('[S4C Sync] Offline mode — loading tool data from localStorage')
    }
    const local = getToolData(userId, id)
    if (hasKeys(local)) return { toolId: id, source: 'local', data: local }
  }
  return null
}

/**
 * Hydrate localStorage cache from Supabase.
 * Since Supabase is now the primary source, this simply refreshes the local cache.
 * Called on dashboard load to ensure localStorage is in sync.
 */
export async function hydrateProgressFromSupabase(userId: string): Promise<boolean> {
  if (!isRemoteSyncable(userId)) return false // Demo users: skip
  try {
    const { data, error } = await supabase
      .from('tool_data')
      .select('tool_id, data, completed, report_generated, last_saved')
      .eq('user_id', userId)

    if (error || !data || data.length === 0) return false

    const progress: ProgressMap = {}

    for (const row of data) {
      progress[row.tool_id] = {
        completed: row.completed ?? false,
        completedAt: row.completed ? (row.last_saved ?? new Date().toISOString()) : null,
        data: (row.data as Record<string, unknown>) ?? {},
        reportGenerated: row.report_generated ?? false,
        lastSaved: row.last_saved ?? null,
      }
    }

    // Also merge any local-only entries (saved offline) and push them to Supabase
    const localProgress = getLocalProgress(userId)
    for (const [toolId, localEntry] of Object.entries(localProgress)) {
      if (!progress[toolId] && localEntry.lastSaved) {
        // This entry exists only locally — push to Supabase
        progress[toolId] = localEntry
        syncToolDataToSupabase(userId, toolId, localEntry.data).catch((err) => {
          console.error('[S4C Sync] Failed to push local-only entry to Supabase:', err)
        })
      }
    }

    saveLocalProgress(userId, progress)
    return true
  } catch {
    console.warn('[S4C Sync] Hydration failed — keeping localStorage cache')
    return false
  }
}

/**
 * Sync completion status to Supabase `tool_data` table.
 */
export async function syncProgressToSupabase(
  userId: string,
  toolId: string,
  completed: boolean,
  reportGenerated: boolean
) {
  if (!isRemoteSyncable(userId)) return // Demo users: no-op
  const { error } = await supabase
    .from('tool_data')
    .upsert(
      {
        user_id: userId,
        tool_id: toolId,
        completed,
        report_generated: reportGenerated,
        last_saved: new Date().toISOString(),
      },
      { onConflict: 'user_id,tool_id' }
    )
  if (error) {
    console.error('[S4C Sync] syncProgressToSupabase failed:', error)
    throw error
  }
}
