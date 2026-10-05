/**
 * Validation gate for AI-generated opportunities before they reach the
 * `opportunities` table. The model answers from memory, so anything we cannot
 * verify mechanically is dropped:
 *
 *  - missing title/organization
 *  - application_url that is not https (after resolveOpportunityUrl)
 *  - application_url that does not respond (HEAD, fallback GET, 5s timeout,
 *    redirects followed, 2xx/3xx accepted)
 *  - deadline already in the past
 *
 * Amounts are clamped to a sane non-negative range and list fields are
 * normalized. Used by /api/cron/opportunities and
 * /api/admin/refresh-oportunidades. Server-only (Node runtime).
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveOpportunityUrl } from '@/lib/opportunities-url'

export const OPPORTUNITY_TYPES = ['grant', 'accelerator', 'competition', 'fund', 'fellowship'] as const
export type OpportunityType = (typeof OPPORTUNITY_TYPES)[number]

export interface ValidatedOpportunity {
  title: string
  organization: string
  description: string | null
  type: OpportunityType
  amount_min: number | null
  amount_max: number | null
  currency: string
  eligible_countries: string[]
  eligible_verticals: string[]
  eligible_stages: string[]
  application_url: string
  is_rolling: boolean
  deadline: string | null
}

export interface OpportunityValidationStats {
  received: number
  kept: number
  dropped_invalid: number
  dropped_non_https_url: number
  dropped_unreachable_url: number
  dropped_past_deadline: number
}

const URL_TIMEOUT_MS = 5000
const URL_CONCURRENCY = 6
const MAX_AMOUNT_USD = 50_000_000
const MAX_LIST_ITEMS = 20
const USER_AGENT = 'Mozilla/5.0 (compatible; Startups4ClimateBot/1.0; +https://startups4climate.org)'

/** Phrase appended to every opportunities prompt to discourage invented items. */
export const OPPORTUNITY_PROMPT_GUARD = `IMPORTANTE: solo incluye oportunidades de las que estés seguro que existen. Si no estás seguro de que existe, no la incluyas: es preferible devolver menos elementos. La fecha "deadline" debe ser futura o null. Validamos automáticamente cada URL y descartamos las que no responden.`

function str(v: unknown, max: number): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : ''
}

function strList(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v
    .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    .slice(0, MAX_LIST_ITEMS)
    .map((x) => x.trim().slice(0, 50))
}

function toAmount(v: unknown): number | null {
  const n = typeof v === 'string' ? Number(v.replace(/[^0-9.]/g, '')) : v
  if (typeof n !== 'number' || !Number.isFinite(n)) return null
  return Math.round(Math.min(Math.max(n, 0), MAX_AMOUNT_USD))
}

/** Returns an ISO date (YYYY-MM-DD), null when absent/unparseable, or 'past'. */
function parseDeadline(v: unknown, today: Date): string | null | 'past' {
  if (typeof v !== 'string' || !v.trim()) return null
  const d = new Date(v.trim())
  if (Number.isNaN(d.getTime())) return null
  const iso = d.toISOString().slice(0, 10)
  const todayIso = today.toISOString().slice(0, 10)
  return iso < todayIso ? 'past' : iso
}

/** https only, no credentials, real-looking public hostname (no IP literals / localhost). */
export function isAcceptableHttpsUrl(raw: string): boolean {
  let u: URL
  try {
    u = new URL(raw)
  } catch {
    return false
  }
  if (u.protocol !== 'https:') return false
  if (u.username || u.password) return false
  const host = u.hostname.toLowerCase()
  if (!host.includes('.') || host === 'localhost' || host.endsWith('.localhost')) return false
  if (/^[\d.]+$/.test(host) || host.startsWith('[')) return false
  return true
}

async function tryFetch(url: string, method: 'HEAD' | 'GET'): Promise<number | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), URL_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      method,
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,*/*;q=0.8' },
      cache: 'no-store',
    })
    // Don't download bodies we don't need.
    if (res.body) await res.body.cancel().catch(() => undefined)
    return res.status
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/** HEAD first; if it fails or is not 2xx/3xx, retry once with GET. */
export async function isUrlReachable(url: string): Promise<boolean> {
  const ok = (s: number | null) => s !== null && s >= 200 && s < 400
  if (ok(await tryFetch(url, 'HEAD'))) return true
  return ok(await tryFetch(url, 'GET'))
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array<R>(items.length)
  let next = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++
      results[i] = await fn(items[i])
    }
  })
  await Promise.all(workers)
  return results
}

/**
 * Normalize + verify raw model output. `fallbackType` is used when the model
 * returns an unknown type (callers historically differ).
 */
export async function validateOpportunities(
  rawItems: unknown,
  fallbackType: OpportunityType
): Promise<{ valid: ValidatedOpportunity[]; stats: OpportunityValidationStats }> {
  const list = Array.isArray(rawItems) ? rawItems : []
  const stats: OpportunityValidationStats = {
    received: list.length,
    kept: 0,
    dropped_invalid: 0,
    dropped_non_https_url: 0,
    dropped_unreachable_url: 0,
    dropped_past_deadline: 0,
  }
  const today = new Date()
  const candidates: ValidatedOpportunity[] = []

  for (const raw of list) {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
      stats.dropped_invalid++
      continue
    }
    const item = raw as Record<string, unknown>
    const title = str(item.title, 500)
    const organization = str(item.organization, 200)
    if (!title || !organization) {
      stats.dropped_invalid++
      continue
    }

    const url = resolveOpportunityUrl(organization, str(item.application_url, 2000))
    if (!isAcceptableHttpsUrl(url)) {
      stats.dropped_non_https_url++
      continue
    }

    const deadline = parseDeadline(item.deadline, today)
    if (deadline === 'past') {
      stats.dropped_past_deadline++
      continue
    }

    let amountMin = toAmount(item.amount_min)
    let amountMax = toAmount(item.amount_max)
    if (amountMin !== null && amountMax !== null && amountMin > amountMax) {
      ;[amountMin, amountMax] = [amountMax, amountMin]
    }

    const rawType = typeof item.type === 'string' ? item.type : ''
    const type = (OPPORTUNITY_TYPES as readonly string[]).includes(rawType)
      ? (rawType as OpportunityType)
      : fallbackType

    const currency = str(item.currency, 3).toUpperCase()

    candidates.push({
      title,
      organization,
      description: str(item.description, 1000) || null,
      type,
      amount_min: amountMin,
      amount_max: amountMax,
      currency: /^[A-Z]{3}$/.test(currency) ? currency : 'USD',
      eligible_countries: strList(item.eligible_countries),
      eligible_verticals: strList(item.eligible_verticals),
      eligible_stages: strList(item.eligible_stages),
      application_url: url,
      is_rolling: item.is_rolling === true,
      deadline,
    })
  }

  // Check each distinct URL once, in parallel with a cap.
  const uniqueUrls = Array.from(new Set(candidates.map((c) => c.application_url)))
  const reachable = await mapWithConcurrency(uniqueUrls, URL_CONCURRENCY, isUrlReachable)
  const reachableSet = new Set(uniqueUrls.filter((_, i) => reachable[i]))

  const valid: ValidatedOpportunity[] = []
  for (const c of candidates) {
    if (reachableSet.has(c.application_url)) valid.push(c)
    else stats.dropped_unreachable_url++
  }
  stats.kept = valid.length

  return { valid, stats }
}

/**
 * Insert or update validated opportunities (matched by title + organization)
 * with a service-role client.
 */
export async function upsertOpportunities(
  db: SupabaseClient,
  items: ValidatedOpportunity[]
): Promise<{ inserted: number; updated: number; errors: string[] }> {
  const out = { inserted: 0, updated: 0, errors: [] as string[] }
  for (const item of items) {
    const { data: existing, error: lookupError } = await db
      .from('opportunities')
      .select('id')
      .eq('title', item.title)
      .eq('organization', item.organization)
      .maybeSingle()
    if (lookupError) {
      out.errors.push(`Lookup ${item.title}: ${lookupError.message}`)
      continue
    }

    const fields = {
      description: item.description,
      type: item.type,
      amount_min: item.amount_min,
      amount_max: item.amount_max,
      currency: item.currency,
      eligible_countries: item.eligible_countries,
      eligible_verticals: item.eligible_verticals,
      eligible_stages: item.eligible_stages,
      application_url: item.application_url,
      is_rolling: item.is_rolling,
      deadline: item.deadline,
      is_active: true,
    }

    if (existing) {
      const { error } = await db
        .from('opportunities')
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq('id', (existing as { id: string }).id)
      if (error) out.errors.push(`Update ${item.title}: ${error.message}`)
      else out.updated++
    } else {
      const { error } = await db
        .from('opportunities')
        .insert({ title: item.title, organization: item.organization, ...fields })
      if (error) out.errors.push(`Insert ${item.title}: ${error.message}`)
      else out.inserted++
    }
  }
  return out
}
