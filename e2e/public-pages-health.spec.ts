import { test, expect, type ConsoleMessage } from '@playwright/test';

/**
 * Public pages must render without uncaught errors and without console
 * errors. Runs without real credentials: Supabase points at a dummy URL, so
 * failed network calls to it are ignored (they are environment noise, not
 * application bugs).
 */
const PUBLIC_PAGES: Array<{ path: string; knownIssue?: string }> = [
  {
    path: '/',
    // BUG (src/components/Hero.tsx radar SVG): `dy="calc(... + 11px)"` is not a
    // valid SVG length, and motion.polygon / motion.circle render without
    // initial `points` / `cx` / `cy`, so the browser logs ~30 attribute errors
    // per load. Remove once fixed.
    knownIssue: 'Hero radar SVG logs invalid attribute errors (dy=calc(), cx/cy/points undefined)',
  },
  { path: '/organizaciones' },
  { path: '/workbook' },
  { path: '/privacidad' },
  { path: '/terminos' },
  { path: '/radar' },
  { path: '/oportunidades' },
];

const IGNORED_CONSOLE = [
  /Failed to load resource/i,
  /net::ERR_/i,
  /Failed to fetch/i,
  /fetch failed/i,
  /127\.0\.0\.1:54321/,
  /dummy-supabase|supabase\.co/i,
  // Vercel analytics/speed-insights scripts are not served outside Vercel.
  /_vercel\/(insights|speed-insights)/,
];

function isIgnored(text: string): boolean {
  return IGNORED_CONSOLE.some((re) => re.test(text));
}

test.describe('Public pages render cleanly', () => {
  for (const { path, knownIssue } of PUBLIC_PAGES) {
    test(`${path} renders with no console errors`, async ({ page }) => {
      test.fail(!!knownIssue, knownIssue);
      const errors: string[] = [];
      page.on('console', (msg: ConsoleMessage) => {
        if (msg.type() === 'error' && !isIgnored(msg.text())) errors.push(`console: ${msg.text()}`);
      });
      page.on('pageerror', (err) => {
        if (!isIgnored(err.message)) errors.push(`pageerror: ${err.message}`);
      });

      const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
      expect(response, `no response for ${path}`).not.toBeNull();
      expect(response!.status(), `HTTP status for ${path}`).toBeLessThan(400);

      await page.waitForLoadState('load');
      await expect(page.locator('body')).toBeVisible();
      // Every public page carries the brand somewhere (nav, footer or title).
      await expect(page).toHaveTitle(/Startups4Climate|S4C/i);
      // Some content is rendered (not a blank shell).
      expect((await page.locator('body').innerText()).trim().length).toBeGreaterThan(50);

      // Give client effects a moment to run and surface hydration errors.
      await page.waitForTimeout(1000);
      expect(errors, errors.join('\n')).toEqual([]);
    });
  }
});
