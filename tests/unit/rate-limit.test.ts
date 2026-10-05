import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { checkAndLogAIUsage, rateLimitHeaders, type RateLimitResult } from '@/lib/rate-limit'
import { createFakeSupabase, hasOp, opArgs, type FakeResult } from '../helpers/fake-supabase'

const NOW = new Date('2026-03-01T12:00:00.000Z')
const HOUR = 60 * 60 * 1000

function fakeWithCount(count: number | null, countError: string | null = null, insertError: string | null = null) {
  return createFakeSupabase((q): FakeResult => {
    if (hasOp(q, 'insert')) return { error: insertError ? { message: insertError } : null }
    return { count, error: countError ? { message: countError } : null }
  })
}

describe('checkAndLogAIUsage', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows a founder under the limit and logs a usage row', async () => {
    const fake = fakeWithCount(5)
    const res = await checkAndLogAIUsage(fake.client, 'user-1', 'chat', 'founder')

    expect(res.allowed).toBe(true)
    expect(res.limit).toBe(30)
    expect(res.remaining).toBe(24) // 30 - 5 used - 1 (this request)
    expect(res.resetAt.getTime()).toBe(NOW.getTime() + HOUR)

    const inserts = fake.callsTo('ai_usage', 'insert')
    expect(inserts).toHaveLength(1)
    expect(opArgs(inserts[0], 'insert')).toEqual([{ user_id: 'user-1', endpoint: 'chat' }])
  })

  it('scopes the count query to user, endpoint and the last hour', async () => {
    const fake = fakeWithCount(0)
    await checkAndLogAIUsage(fake.client, 'user-1', 'feedback', 'founder')

    const countQuery = fake.queries[0]
    expect(countQuery.table).toBe('ai_usage')
    expect(opArgs(countQuery, 'select')).toEqual(['id', { count: 'exact', head: true }])
    const eqs = countQuery.ops.filter((o) => o.method === 'eq').map((o) => o.args)
    expect(eqs).toEqual([
      ['user_id', 'user-1'],
      ['endpoint', 'feedback'],
    ])
    expect(opArgs(countQuery, 'gte')).toEqual(['created_at', new Date(NOW.getTime() - HOUR).toISOString()])
  })

  it('treats a null count as zero usage', async () => {
    const fake = fakeWithCount(null)
    const res = await checkAndLogAIUsage(fake.client, 'user-1', 'chat', 'founder')
    expect(res.allowed).toBe(true)
    expect(res.remaining).toBe(29)
  })

  it('allows the last request just below the limit with 0 remaining', async () => {
    const fake = fakeWithCount(29)
    const res = await checkAndLogAIUsage(fake.client, 'user-1', 'chat', 'founder')
    expect(res.allowed).toBe(true)
    expect(res.remaining).toBe(0)
  })

  it('blocks a founder exactly at the limit and does not log a row', async () => {
    const fake = fakeWithCount(30)
    const res = await checkAndLogAIUsage(fake.client, 'user-1', 'chat', 'founder')
    expect(res).toEqual({ allowed: false, remaining: 0, resetAt: new Date(NOW.getTime() + HOUR), limit: 30 })
    expect(fake.callsTo('ai_usage', 'insert')).toHaveLength(0)
  })

  it('blocks when usage is above the limit', async () => {
    const fake = fakeWithCount(1000)
    const res = await checkAndLogAIUsage(fake.client, 'user-1', 'chat', 'founder')
    expect(res.allowed).toBe(false)
  })

  it('gives admin_org a higher limit (200)', async () => {
    const under = await checkAndLogAIUsage(fakeWithCount(150).client, 'u', 'radar', 'admin_org')
    expect(under.allowed).toBe(true)
    expect(under.limit).toBe(200)
    expect(under.remaining).toBe(49)

    const at = await checkAndLogAIUsage(fakeWithCount(200).client, 'u', 'radar', 'admin_org')
    expect(at.allowed).toBe(false)
  })

  it('lets superadmin bypass without touching the database', async () => {
    const fake = fakeWithCount(1_000_000)
    const res = await checkAndLogAIUsage(fake.client, 'root', 'opportunities', 'superadmin')
    expect(res.allowed).toBe(true)
    expect(res.limit).toBe(Number.POSITIVE_INFINITY)
    expect(res.remaining).toBe(Number.POSITIVE_INFINITY)
    expect(fake.queries).toHaveLength(0)
  })

  it('falls back to the founder limit for an unknown role', async () => {
    const fake = fakeWithCount(30)
    // Simulates a role string coming from the DB that the type does not know.
    const res = await checkAndLogAIUsage(fake.client, 'u', 'chat', 'mentor' as 'founder')
    expect(res.limit).toBe(30)
    expect(res.allowed).toBe(false)
  })

  it('fails open when the count query errors, without inserting', async () => {
    const fake = fakeWithCount(null, 'connection reset')
    const res = await checkAndLogAIUsage(fake.client, 'user-1', 'chat', 'founder')
    expect(res.allowed).toBe(true)
    expect(res.remaining).toBe(30)
    expect(fake.callsTo('ai_usage', 'insert')).toHaveLength(0)
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('[S4C AI]'), 'connection reset')
  })

  it('still allows the request if logging the usage row fails', async () => {
    const fake = fakeWithCount(3, null, 'rls violation')
    const res = await checkAndLogAIUsage(fake.client, 'user-1', 'chat', 'founder')
    expect(res.allowed).toBe(true)
    expect(res.remaining).toBe(26)
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('[S4C AI]'), 'rls violation')
  })
})

describe('rateLimitHeaders', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  const resetAt = new Date(NOW.getTime() + HOUR)

  it('reports limit, remaining and reset (unix seconds) when allowed', () => {
    const h = rateLimitHeaders({ allowed: true, remaining: 12, resetAt, limit: 30 })
    expect(h).toEqual({
      'X-RateLimit-Limit': '30',
      'X-RateLimit-Remaining': '12',
      'X-RateLimit-Reset': String(Math.floor(resetAt.getTime() / 1000)),
    })
    expect(h['Retry-After']).toBeUndefined()
  })

  it('adds Retry-After in seconds when blocked', () => {
    const h = rateLimitHeaders({ allowed: false, remaining: 0, resetAt, limit: 30 })
    expect(h['Retry-After']).toBe('3600')
    expect(h['X-RateLimit-Remaining']).toBe('0')
  })

  it('never returns a Retry-After below 1 second', () => {
    const past: RateLimitResult = { allowed: false, remaining: 0, resetAt: new Date(NOW.getTime() - 5000), limit: 30 }
    expect(rateLimitHeaders(past)['Retry-After']).toBe('1')
  })

  it('renders infinite limits as "unlimited" (superadmin)', () => {
    const h = rateLimitHeaders({
      allowed: true,
      remaining: Number.POSITIVE_INFINITY,
      resetAt,
      limit: Number.POSITIVE_INFINITY,
    })
    expect(h['X-RateLimit-Limit']).toBe('unlimited')
    expect(h['X-RateLimit-Remaining']).toBe('unlimited')
  })
})
