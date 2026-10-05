import { test, expect } from '@playwright/test';

/**
 * Unauthenticated access to privileged surfaces must be redirected to the
 * login modal on the landing page (`/?auth=login`). No credentials needed.
 */
const PROTECTED = ['/admin', '/admin/cohortes', '/admin/reportes', '/superadmin', '/superadmin/organizaciones'];

test.describe('Access control for anonymous visitors', () => {
  for (const path of PROTECTED) {
    test(`${path} responds with a redirect to /?auth=login`, async ({ request }) => {
      const res = await request.get(path, { maxRedirects: 0 });
      expect([302, 303, 307, 308]).toContain(res.status());
      const location = new URL(res.headers()['location'], 'http://localhost');
      expect(location.pathname).toBe('/');
      expect(location.searchParams.get('auth')).toBe('login');
    });

    test(`${path} lands the browser on /?auth=login`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/\?auth=login$/);
    });
  }

  test('a forged s4c_demo cookie with an unknown role does not grant /admin', async ({ request }) => {
    const res = await request.get('/admin', {
      maxRedirects: 0,
      headers: { cookie: 's4c_demo=owner' },
    });
    expect([302, 303, 307, 308]).toContain(res.status());
    expect(res.headers()['location']).toContain('auth=login');
  });
});
