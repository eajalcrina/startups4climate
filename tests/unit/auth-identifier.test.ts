import { describe, expect, it } from 'vitest'
import { normalizeLoginIdentifier } from '@/lib/auth-identifier'

describe('normalizeLoginIdentifier', () => {
  it('appends the default domain to bare usernames', () => {
    expect(normalizeLoginIdentifier('amazonas101')).toBe('amazonas101@startups4climate.org')
  })

  it('keeps real emails untouched apart from case/whitespace', () => {
    expect(normalizeLoginIdentifier('Founder@Example.COM')).toBe('founder@example.com')
    expect(normalizeLoginIdentifier('  user@demo.org  ')).toBe('user@demo.org')
  })

  it('trims and lowercases usernames before appending the domain', () => {
    expect(normalizeLoginIdentifier('  UNAMAD  ')).toBe('unamad@startups4climate.org')
  })

  it('returns an empty string for empty or whitespace-only input', () => {
    expect(normalizeLoginIdentifier('')).toBe('')
    expect(normalizeLoginIdentifier('   ')).toBe('')
  })

  it('does not double-append when the input already has an @', () => {
    expect(normalizeLoginIdentifier('admin@startups4climate.org')).toBe('admin@startups4climate.org')
    // Trailing @ is passed through as-is (Supabase will reject it as invalid).
    expect(normalizeLoginIdentifier('admin@')).toBe('admin@')
  })
})
