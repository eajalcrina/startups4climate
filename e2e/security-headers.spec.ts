import { test, expect } from '@playwright/test';

/** Baseline security headers from next.config.ts must be on every response. */
const PATHS = ['/', '/organizaciones', '/api/health', '/passport/does-not-exist'];

test.describe('Security headers', () => {
  for (const path of PATHS) {
    test(`${path} sends baseline security headers`, async ({ request }) => {
      const res = await request.get(path, { maxRedirects: 0 });
      const h = res.headers();
      expect(h['x-frame-options']).toBe('SAMEORIGIN');
      expect(h['x-content-type-options']).toBe('nosniff');
      expect(h['strict-transport-security']).toMatch(/max-age=\d{7,}/);
      expect(h['strict-transport-security']).toContain('includeSubDomains');
      expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin');
      expect(h['permissions-policy']).toContain('camera=()');
    });
  }
});
