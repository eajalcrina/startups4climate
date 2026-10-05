import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEMO_ROLES, getActiveDemoRole, isDemoEnabled, parseDemoRole } from '@/lib/security/demo'

/**
 * Shared by src/proxy.ts, /api/demo/[role], /api/ai/chat and (client side)
 * AuthContext / DemoLinkRewriter / the /demo/* entry pages.
 */
afterEach(() => {
  vi.unstubAllEnvs()
})

describe('isDemoEnabled', () => {
  it('is on outside production', () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('NEXT_PUBLIC_DEMO_ENABLED', '')
    expect(isDemoEnabled()).toBe(true)
  })

  it('is off in production unless NEXT_PUBLIC_DEMO_ENABLED is exactly "true"', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_DEMO_ENABLED', '')
    expect(isDemoEnabled()).toBe(false)
    vi.stubEnv('NEXT_PUBLIC_DEMO_ENABLED', '1')
    expect(isDemoEnabled()).toBe(false)
    vi.stubEnv('NEXT_PUBLIC_DEMO_ENABLED', 'true')
    expect(isDemoEnabled()).toBe(true)
  })
})

describe('parseDemoRole / getActiveDemoRole', () => {
  it('accepts only the three known roles', () => {
    for (const role of DEMO_ROLES) expect(parseDemoRole(role)).toBe(role)
    for (const bad of ['', 'admin', 'SUPERADMIN', 'founder ', 'superadmin;x', undefined, null]) {
      expect(parseDemoRole(bad)).toBeNull()
    }
  })

  it('returns null for a valid role when demo mode is disabled', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_DEMO_ENABLED', '')
    expect(getActiveDemoRole('superadmin')).toBeNull()
    vi.stubEnv('NEXT_PUBLIC_DEMO_ENABLED', 'true')
    expect(getActiveDemoRole('superadmin')).toBe('superadmin')
    expect(getActiveDemoRole('root')).toBeNull()
  })
})
