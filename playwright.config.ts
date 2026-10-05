import { defineConfig, devices } from '@playwright/test';

/**
 * E2E configuration.
 *
 * - Default: runs against `npm run dev` on :3000 (reused if already running).
 * - E2E_PROD=1: runs against a production server (`npm start`, requires a prior
 *   `npm run build`). Enables specs tagged for prod-only behavior such as the
 *   demo endpoint gate.
 * - E2E_SKIP_DEMO=1: skips specs tagged @demo (they rely on demo-mode data
 *   flows and are not stable without a real Supabase project).
 * - NEXT_PUBLIC_DEMO_ENABLED: @demo specs enter through /demo-* and need demo
 *   mode. `npm run dev` always has it; a production build only when
 *   NEXT_PUBLIC_DEMO_ENABLED=true is set for `next build` (inlined into the
 *   client bundle), for `npm start` and for Playwright itself. Without it,
 *   @demo specs skip themselves under E2E_PROD=1 (e2e/helpers/demo.ts) and
 *   e2e/prod-gates.spec.ts verifies the gate; with it, prod-gates skips.
 *
 * Typical production run (no real Supabase needed):
 *   NEXT_PUBLIC_SUPABASE_URL=https://x.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=x npx next build
 *   E2E_PROD=1 E2E_SKIP_DEMO=1 NEXT_PUBLIC_SUPABASE_URL=https://x.supabase.co \
 *     NEXT_PUBLIC_SUPABASE_ANON_KEY=x npx playwright test
 * - PLAYWRIGHT_BASE_URL: point at an already-running server (no webServer).
 * - PLAYWRIGHT_CHROMIUM_EXECUTABLE: use a preinstalled Chromium binary instead
 *   of the one bundled with this Playwright version.
 */
const isProd = process.env.E2E_PROD === '1';
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'html',
  grepInvert: process.env.E2E_SKIP_DEMO === '1' ? /@demo/ : undefined,
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
          ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
          : undefined,
      },
    },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: isProd ? 'npm start' : 'npm run dev',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
});
