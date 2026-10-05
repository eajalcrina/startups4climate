import { test } from '@playwright/test';

/**
 * @demo specs enter the app through /demo-tools, /demo-admin and
 * /demo-superadmin, which only work when demo mode is enabled
 * (src/lib/security/demo.ts → isDemoEnabled()):
 *   - `npm run dev`: always enabled.
 *   - production build (E2E_PROD=1): only when NEXT_PUBLIC_DEMO_ENABLED=true
 *     was set for BOTH `next build` (it is inlined into the client bundle)
 *     and `npm start`, and is exported when running Playwright.
 * Call inside a describe block to skip instead of failing otherwise.
 */
export function skipUnlessDemoEnabled(): void {
  test.skip(
    process.env.E2E_PROD === '1' && process.env.NEXT_PUBLIC_DEMO_ENABLED !== 'true',
    'demo mode is disabled in this production build (set NEXT_PUBLIC_DEMO_ENABLED=true for build, start and playwright)',
  );
}
