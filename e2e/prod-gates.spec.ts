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

  // BUG: the middleware rewrite for /demo-tools, /demo-admin and
  // /demo-superadmin sets the s4c_demo cookie unconditionally, so the
  // production gate in /api/demo/[role] can be bypassed by simply visiting
  // /demo-admin. The cookie is then honored by the middleware for /admin and
  // /superadmin. Expected: no demo cookie in production unless
  // NEXT_PUBLIC_DEMO_ENABLED=true. Remove test.fail once fixed.
  for (const entry of ['/demo-tools', '/demo-admin', '/demo-superadmin']) {
    test(`${entry} does not hand out a demo session in production`, async ({ request }) => {
      test.fail(true, 'middleware sets s4c_demo regardless of NODE_ENV / NEXT_PUBLIC_DEMO_ENABLED');
      const res = await request.get(entry, { maxRedirects: 0 });
      expect(res.headers()['set-cookie'] ?? '').not.toContain('s4c_demo');
    });
  }
});
