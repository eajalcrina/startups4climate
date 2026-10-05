import { describe, expect, it } from 'vitest'
import { resolveOpportunityUrl } from '@/lib/opportunities-url'

describe('resolveOpportunityUrl', () => {
  describe('1. verified program URLs take priority', () => {
    it('matches org names case-insensitively', () => {
      expect(resolveOpportunityUrl('BID Lab', 'https://random.example.com/x')).toBe('https://bidlab.org/calls')
      expect(resolveOpportunityUrl('CORFO Chile', '')).toBe('https://www.corfo.cl/sites/cpp/convocatorias')
    })

    it('matches when the key is a substring of a longer org name', () => {
      expect(resolveOpportunityUrl('Programa Start-Up Chile 2026', 'https://foo.bar/')).toBe(
        'https://www.startupchile.org/programs/',
      )
    })

    it('overrides even a trusted AI-provided URL', () => {
      expect(resolveOpportunityUrl('Y Combinator', 'https://www.ycombinator.com/some/deep/path')).toBe(
        'https://www.ycombinator.com/apply',
      )
    })

    it('handles accented org names', () => {
      expect(resolveOpportunityUrl('ProInnóvate', 'x')).toBe('https://www.proinnovate.gob.pe/convocatorias')
    })

    // Substring matching is greedy: short keys like "caf" or "fao" match inside
    // unrelated org names. Documented here so a future change is deliberate.
    it('short keys can match unrelated org names (substring semantics)', () => {
      expect(resolveOpportunityUrl('Cafetaleros Unidos', 'https://cafetaleros.org/convocatoria')).toBe(
        'https://www.caf.com/en/currently/calls-for-proposals/',
      )
    })
  })

  describe('2. AI-provided URLs from trusted domains are preserved', () => {
    it('keeps the full path for a trusted domain', () => {
      const url = 'https://www.gob.pe/institucion/minam/campañas/123'
      expect(resolveOpportunityUrl('Ministerio del Ambiente', url)).toBe(url)
    })

    it('accepts subdomains of trusted domains', () => {
      const url = 'https://convocatorias.corfo.cl/programa/42'
      expect(resolveOpportunityUrl('Agencia X', url)).toBe(url)
    })

    it('does not trust look-alike domains', () => {
      expect(resolveOpportunityUrl('Agencia X', 'https://evilcorfo.cl/phish')).toBe('https://evilcorfo.cl/')
      expect(resolveOpportunityUrl('Agencia X', 'https://corfo.cl.evil.com/phish')).toBe('https://corfo.cl.evil.com/')
    })
  })

  describe('3. fallback to origin', () => {
    it('strips path and query for untrusted domains', () => {
      expect(resolveOpportunityUrl('Fondo Desconocido', 'https://fondo.example.org/apply?ref=ai#top')).toBe(
        'https://fondo.example.org/',
      )
    })

    it('returns the raw string when the URL cannot be parsed', () => {
      expect(resolveOpportunityUrl('Fondo Desconocido', 'not a url')).toBe('not a url')
      expect(resolveOpportunityUrl('Fondo Desconocido', '')).toBe('')
    })
  })
})
