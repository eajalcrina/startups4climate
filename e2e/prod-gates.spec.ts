import { test, expect } from '@playwright/test';

/**
 * Behavior that only exists in a production build (NODE_ENV=production).
 * Run with: npm run build && E2E_PROD=1 npx playwright test e2e/prod-gates.spec.ts
 * NEXT_PUBLIC_DEMO_ENABLED must be unset for these to be meaningful.
 */
test.describe('Production-only gates', () => {
  test.skip(process.env.E2E_PROD !== '1', 'requires a production build (set E2E_PROD=1)');
  test.skip(process.env.NEXT_PUBLIC_DEMO_ENABLED === 'true', 'demo mode explicitly enabled');

  for (const role of ['founder', 'admin_org', 'superadmin']) {
    test(`/api/demo/${role} is disabled (404) and sets no demo cookie`, async ({ request }) => {
      const res = await request.get(`/api/demo/${role}`, { maxRedirects: 0 });
      expect(res.status()).toBe(404);
      expect(res.headers()['set-cookie'] ?? '').not.toContain('s4c_demo');
    });
  }

  // The /demo-* rewrites in src/proxy.ts share the same gate: they redirect
  // home and only ever send a deletion of the s4c_demo cookie.
  for (const entry of ['/demo-tools', '/demo-admin', '/demo-superadmin']) {
    test(`${entry} does not hand out a demo session in production`, async ({ request }) => {
      const res = await request.get(entry, { maxRedirects: 0 });
      expect(res.status()).toBeGreaterThanOrEqual(300);
      expect(res.status()).toBeLessThan(400);
      expect(new URL(res.headers()['location'] ?? '', 'http://x').pathname).toBe('/');
      const demoCookies = res
        .headersArray()
        .filter((h) => h.name.toLowerCase() === 'set-cookie' && /^s4c_demo=/.test(h.value));
      for (const c of demoCookies) expect(c.value, 'only a deletion of s4c_demo is allowed').toMatch(/^s4c_demo=;/);
    });
  }

  for (const entry of ['/demo/founder', '/demo/admin', '/demo/superadmin']) {
    test(`${entry} sends visitors home in production`, async ({ request }) => {
      const res = await request.get(entry, { maxRedirects: 0 });
      expect(res.status()).toBeGreaterThanOrEqual(300);
      expect(res.status()).toBeLessThan(400);
      expect(new URL(res.headers()['location'] ?? '', 'http://x').pathname).toBe('/');
    });
  }

  test('a forged s4c_demo cookie does not unlock /superadmin', async ({ request }) => {
    const res = await request.get('/superadmin', {
      maxRedirects: 0,
      headers: { cookie: 's4c_demo=superadmin' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(300);
    expect(res.status()).toBeLessThan(400);
    expect(new URL(res.headers()['location'] ?? '', 'http://x').pathname).not.toMatch(/^\/superadmin/);
  });
});
