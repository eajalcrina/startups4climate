/**
 * Centralized demo-mode gate.
 *
 * The `s4c_demo` cookie lets anonymous visitors browse /tools, /admin and
 * /superadmin with mock data. It must never be honored in production unless
 * the owner explicitly opts in with NEXT_PUBLIC_DEMO_ENABLED=true, and only
 * the three known role values are accepted.
 *
 * Edge- and Node-safe (no Node-only APIs).
 */

export const DEMO_COOKIE = 's4c_demo'

export const DEMO_ROLES = ['founder', 'admin_org', 'superadmin'] as const
export type DemoRole = (typeof DEMO_ROLES)[number]

/** Demo surfaces are always on outside production; in production they need the explicit flag. */
export function isDemoEnabled(): boolean {
  return (
    process.env.NODE_ENV !== 'production' ||
    process.env.NEXT_PUBLIC_DEMO_ENABLED === 'true'
  )
}

/** Returns the role only when it is one of the allowed values; otherwise null. */
export function parseDemoRole(value: string | null | undefined): DemoRole | null {
  if (!value) return null
  return (DEMO_ROLES as readonly string[]).includes(value) ? (value as DemoRole) : null
}

/**
 * Role to honor for this request: null unless demo mode is enabled AND the
 * cookie carries an allowed value.
 */
export function getActiveDemoRole(cookieValue: string | null | undefined): DemoRole | null {
  if (!isDemoEnabled()) return null
  return parseDemoRole(cookieValue)
}
