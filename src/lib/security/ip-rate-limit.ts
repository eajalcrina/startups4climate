import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Shared, DB-backed rate limiter for unauthenticated surfaces (demo chat,
 * diagnostic email). Backed by the `public.check_ip_rate_limit` RPC so the
 * counter is consistent across serverless instances (an in-memory Map is not).
 *
 * Edge- and Node-safe.
 */

let anonClient: SupabaseClient | null = null

function getAnonClient(): SupabaseClient | null {
  if (anonClient) return anonClient
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  anonClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return anonClient
}

/** Best-effort client IP: first hop of x-forwarded-for, then x-real-ip, else 'unknown'. */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const realIp = request.headers.get('x-real-ip')?.trim()
  const ip = forwarded || realIp || 'unknown'
  // Keys are stored in the DB; never let a header blow them up.
  return ip.slice(0, 64)
}

/**
 * Returns true when the request is allowed. Fails open (returns true) if the
 * RPC is unavailable so a DB hiccup does not take the feature down; the
 * failure is logged with the [S4C AI] prefix.
 */
export async function checkIpRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  const client = getAnonClient()
  if (!client) {
    console.error('[S4C AI] rate limit: Supabase env missing, failing open')
    return true
  }
  try {
    const { data, error } = await client.rpc('check_ip_rate_limit', {
      p_key: key.slice(0, 300),
      p_limit: limit,
      p_window_seconds: windowSeconds,
    })
    if (error) {
      console.error('[S4C AI] check_ip_rate_limit RPC failed, failing open:', error.message)
      return true
    }
    return data !== false
  } catch (err) {
    console.error(
      '[S4C AI] check_ip_rate_limit RPC threw, failing open:',
      err instanceof Error ? err.message : String(err)
    )
    return true
  }
}
