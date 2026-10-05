import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FakeResult, RecordedQuery, Resolver } from '../helpers/fake-supabase'

// The module under test imports a browser Supabase client built at import
// time; replace it with the chainable fake before importing.
const state = vi.hoisted(() => ({
  resolver: (() => ({ data: [], error: null })) as (q: { table: string; ops: { method: string; args: unknown[] }[] }) => unknown,
  queries: [] as { table: string; ops: { method: string; args: unknown[] }[] }[],
}))

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('../helpers/fake-supabase')
  const fake = createFakeSupabase((q) => state.resolver(q) as FakeResult)
  state.queries = fake.queries
  return { supabase: fake.client }
})

import {
  countCompleted,
  getProgress,
  getProgressAsync,
  getToolData,
  loadToolDataWithFallback,
  markReportGenerated,
  markToolCompleted,
  saveToolData,
  saveToolDataSync,
  type ProgressMap,
} from '@/lib/progress'
import { hasOp, opArgs } from '../helpers/fake-supabase'

const REAL_USER = '1b4e28ba-2fa1-11d2-883f-0016d3cca427'
const DEMO_USER = 'demo-founder-123'

class MemoryStorage {
  store = new Map<string, string>()
  getItem(k: string) {
    return this.store.has(k) ? (this.store.get(k) as string) : null
  }
  setItem(k: string, v: string) {
    this.store.set(k, String(v))
  }
  removeItem(k: string) {
    this.store.delete(k)
  }
  clear() {
    this.store.clear()
  }
}

let storage: MemoryStorage

function setResolver(r: Resolver) {
  state.resolver = r as typeof state.resolver
}

function cached(userId: string): ProgressMap {
  return JSON.parse(storage.getItem(`s4c_${userId}_tool_progress`) ?? '{}')
}

beforeEach(() => {
  storage = new MemoryStorage()
  vi.stubGlobal('window', {})
  vi.stubGlobal('localStorage', storage)
  state.queries.length = 0
  setResolver(() => ({ data: [], error: null }))
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('localStorage cache namespacing', () => {
  it('stores progress under s4c_${userId}_tool_progress and isolates users', () => {
    saveToolDataSync('user-a', 'lean-canvas', { problem: 'A' })
    saveToolDataSync('user-b', 'lean-canvas', { problem: 'B' })
    expect(getToolData('user-a', 'lean-canvas')).toEqual({ problem: 'A' })
    expect(getToolData('user-b', 'lean-canvas')).toEqual({ problem: 'B' })
    expect([...storage.store.keys()].sort()).toEqual(['s4c_user-a_tool_progress', 's4c_user-b_tool_progress'])
  })

  it('returns {} on corrupted cache JSON', () => {
    storage.setItem(`s4c_${REAL_USER}_tool_progress`, '{not json')
    expect(getProgress(REAL_USER)).toEqual({})
  })

  it('returns {} when running on the server (no window)', () => {
    vi.unstubAllGlobals()
    expect(getProgress(REAL_USER)).toEqual({})
  })

  it('saveToolDataSync preserves completion flags of an existing entry', () => {
    storage.setItem(
      `s4c_u_tool_progress`,
      JSON.stringify({ t: { completed: true, completedAt: '2026-01-01', reportGenerated: true, data: {}, lastSaved: null } }),
    )
    saveToolDataSync('u', 't', { x: 1 })
    const e = cached('u').t
    expect(e.completed).toBe(true)
    expect(e.completedAt).toBe('2026-01-01')
    expect(e.reportGenerated).toBe(true)
    expect(e.data).toEqual({ x: 1 })
    expect(e.lastSaved).not.toBeNull()
  })

  it('countCompleted counts only completed entries', () => {
    storage.setItem(
      `s4c_u_tool_progress`,
      JSON.stringify({
        a: { completed: true, completedAt: null, reportGenerated: false, data: {}, lastSaved: null },
        b: { completed: false, completedAt: null, reportGenerated: false, data: {}, lastSaved: null },
        c: { completed: true, completedAt: null, reportGenerated: false, data: {}, lastSaved: null },
      }),
    )
    expect(countCompleted('u')).toBe(2)
    expect(countCompleted('other')).toBe(0)
  })
})

describe('demo users (non-UUID ids)', () => {
  it('never call Supabase and use localStorage as source of truth', async () => {
    await saveToolData(DEMO_USER, 'tam-calculator', { tam: 1 })
    await markToolCompleted(DEMO_USER, 'tam-calculator')
    await markReportGenerated(DEMO_USER, 'tam-calculator')
    const progress = await getProgressAsync(DEMO_USER)

    expect(state.queries).toHaveLength(0)
    expect(progress['tam-calculator']).toMatchObject({ completed: true, reportGenerated: true, data: { tam: 1 } })
  })
})

describe('getProgressAsync (Supabase-first)', () => {
  it('maps tool_data rows and refreshes the cache', async () => {
    setResolver(() => ({
      data: [
        { tool_id: 'lean-canvas', data: { p: 1 }, completed: true, report_generated: false, last_saved: '2026-02-01T00:00:00Z' },
        { tool_id: 'tam-calculator', data: null, completed: null, report_generated: null, last_saved: null },
      ],
      error: null,
    }))

    const progress = await getProgressAsync(REAL_USER)
    expect(progress).toEqual({
      'lean-canvas': {
        completed: true,
        completedAt: '2026-02-01T00:00:00Z',
        data: { p: 1 },
        reportGenerated: false,
        lastSaved: '2026-02-01T00:00:00Z',
      },
      'tam-calculator': { completed: false, completedAt: null, data: {}, reportGenerated: false, lastSaved: null },
    })
    expect(cached(REAL_USER)).toEqual(progress)

    const q = state.queries[0] as RecordedQuery
    expect(q.table).toBe('tool_data')
    expect(opArgs(q, 'eq')).toEqual(['user_id', REAL_USER])
  })

  it('falls back to cache when Supabase returns no rows', async () => {
    saveToolDataSync(REAL_USER, 'lean-canvas', { local: true })
    setResolver(() => ({ data: [], error: null }))
    expect((await getProgressAsync(REAL_USER))['lean-canvas'].data).toEqual({ local: true })
  })

  it('falls back to cache when Supabase errors', async () => {
    saveToolDataSync(REAL_USER, 'lean-canvas', { local: true })
    setResolver(() => ({ data: null, error: { message: 'offline' } }))
    expect((await getProgressAsync(REAL_USER))['lean-canvas'].data).toEqual({ local: true })
  })
})

describe('writes (Supabase first, then cache)', () => {
  it('saveToolData upserts on (user_id, tool_id) and updates the cache', async () => {
    const order: string[] = []
    setResolver((q) => {
      order.push(`db:${q.table}`)
      return { error: null }
    })
    const origSet = storage.setItem.bind(storage)
    storage.setItem = (k: string, v: string) => {
      order.push('cache')
      origSet(k, v)
    }

    await saveToolData(REAL_USER, 'lean-canvas', { problem: 'x' })

    expect(order).toEqual(['db:tool_data', 'cache'])
    const q = state.queries[0] as RecordedQuery
    expect(hasOp(q, 'upsert')).toBe(true)
    const [row, opts] = opArgs(q, 'upsert') as [Record<string, unknown>, unknown]
    expect(row).toMatchObject({ user_id: REAL_USER, tool_id: 'lean-canvas', data: { problem: 'x' } })
    expect(opts).toEqual({ onConflict: 'user_id,tool_id' })
    expect(cached(REAL_USER)['lean-canvas'].data).toEqual({ problem: 'x' })
  })

  it('retries failed writes twice (3 attempts) then still updates the cache', async () => {
    vi.useFakeTimers()
    setResolver(() => ({ error: { message: 'boom' } }))

    const p = saveToolData(REAL_USER, 'lean-canvas', { problem: 'x' })
    await vi.runAllTimersAsync()
    await p

    expect(state.queries.filter((q) => hasOp(q as RecordedQuery, 'upsert'))).toHaveLength(3)
    expect(cached(REAL_USER)['lean-canvas'].data).toEqual({ problem: 'x' })
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('[S4C Sync]'), expect.anything())
  })

  it('succeeds on a retry after a transient failure', async () => {
    vi.useFakeTimers()
    let calls = 0
    setResolver(() => (++calls === 1 ? { error: { message: 'transient' } } : { error: null }))

    const p = markToolCompleted(REAL_USER, 'lean-canvas')
    await vi.runAllTimersAsync()
    await p

    expect(calls).toBe(2)
    expect(console.error).not.toHaveBeenCalled()
    expect(cached(REAL_USER)['lean-canvas']).toMatchObject({ completed: true })
  })

  it('markToolCompleted keeps existing data and sets completedAt', async () => {
    saveToolDataSync(REAL_USER, 'lean-canvas', { keep: 1 })
    await markToolCompleted(REAL_USER, 'lean-canvas')
    const e = cached(REAL_USER)['lean-canvas']
    expect(e.data).toEqual({ keep: 1 })
    expect(e.completed).toBe(true)
    expect(e.completedAt).not.toBeNull()
    const [row] = opArgs(state.queries[0] as RecordedQuery, 'upsert') as [Record<string, unknown>]
    expect(row).toMatchObject({ completed: true, report_generated: false })
  })

  it('markReportGenerated keeps the completed flag', async () => {
    saveToolDataSync(REAL_USER, 't', {})
    await markToolCompleted(REAL_USER, 't')
    await markReportGenerated(REAL_USER, 't')
    expect(cached(REAL_USER).t).toMatchObject({ completed: true, reportGenerated: true })
    const last = state.queries[state.queries.length - 1] as RecordedQuery
    expect((opArgs(last, 'upsert') as [Record<string, unknown>])[0]).toMatchObject({ completed: true, report_generated: true })
  })
})

describe('loadToolDataWithFallback (legacy storage ids)', () => {
  function toolIdOf(q: { ops: { method: string; args: unknown[] }[] }): unknown {
    return q.ops.find((o) => o.method === 'eq' && o.args[0] === 'tool_id')?.args[1]
  }

  it('prefers data stored under the current id', async () => {
    setResolver((q) => ({ data: toolIdOf(q) === 'ltv-unit-economics' ? { data: { values: { a: '1' } } } : null, error: null }))
    const r = await loadToolDataWithFallback(REAL_USER, 'ltv-unit-economics', ['unit-economics'])
    expect(r).toEqual({ toolId: 'ltv-unit-economics', source: 'remote', data: { values: { a: '1' } } })
    expect(state.queries.map(toolIdOf)).toEqual(['ltv-unit-economics'])
  })

  it('uses the local cache of the current id before any legacy id', async () => {
    setResolver(() => ({ data: null, error: null }))
    saveToolDataSync(REAL_USER, 'ltv-unit-economics', { values: { a: 'local' } })
    const r = await loadToolDataWithFallback(REAL_USER, 'ltv-unit-economics', ['unit-economics'])
    expect(r).toEqual({ toolId: 'ltv-unit-economics', source: 'local', data: { values: { a: 'local' } } })
  })

  it('falls back to the legacy Supabase row when the current id is empty', async () => {
    setResolver((q) => ({ data: toolIdOf(q) === 'unit-economics' ? { data: { values: { a: 'old' } } } : null, error: null }))
    const r = await loadToolDataWithFallback(REAL_USER, 'ltv-unit-economics', ['unit-economics'])
    expect(r).toEqual({ toolId: 'unit-economics', source: 'remote', data: { values: { a: 'old' } } })
    expect(state.queries.map(toolIdOf)).toEqual(['ltv-unit-economics', 'unit-economics'])
  })

  it('falls back to the legacy namespaced localStorage entry (demo users skip Supabase)', async () => {
    saveToolDataSync(DEMO_USER, 'cap-table', { values: { optionPool: '15' } })
    const r = await loadToolDataWithFallback(DEMO_USER, 'cap-table-fundraising', ['cap-table'])
    expect(r).toEqual({ toolId: 'cap-table', source: 'local', data: { values: { optionPool: '15' } } })
    expect(state.queries).toHaveLength(0)
  })

  it('returns null when nothing is stored under any id', async () => {
    setResolver(() => ({ data: null, error: null }))
    expect(await loadToolDataWithFallback(REAL_USER, 'cap-table-fundraising', ['cap-table'])).toBeNull()
  })

  it('treats a Supabase exception as offline and still checks localStorage', async () => {
    setResolver(() => {
      throw new Error('network')
    })
    saveToolDataSync(REAL_USER, 'cap-table', { values: { optionPool: '5' } })
    const r = await loadToolDataWithFallback(REAL_USER, 'cap-table-fundraising', ['cap-table'])
    expect(r).toEqual({ toolId: 'cap-table', source: 'local', data: { values: { optionPool: '5' } } })
  })
})
