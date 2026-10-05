import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

/**
 * Shared links with unknown tokens must fail gracefully: a not-found page for
 * public passports and an "invalid invitation" state for invites. Works with a
 * dummy Supabase URL (the lookup fails → not found), and against a real
 * project (random tokens never exist).
 */
test.describe('Invalid shared links', () => {
  test('/passport/<random-token> shows the not-found page', async ({ page }) => {
    const res = await page.goto(`/passport/${randomUUID()}`);
    expect(res?.status()).toBe(404);
    await expect(page.getByText('Error 404')).toBeVisible();
  });

  test('/passport with a malformed token does not crash', async ({ page }) => {
    const res = await page.goto(`/passport/${encodeURIComponent("'; drop table startups;--")}`);
    expect(res?.status()).toBe(404);
  });

  test('/invite/<random-token> shows the invalid-invitation state', async ({ page }) => {
    await page.goto(`/invite/${randomUUID()}`);
    await expect(page.getByText('Invitación no encontrada o enlace inválido.')).toBeVisible({ timeout: 15_000 });
  });

  test('unknown routes render the custom 404', async ({ page }) => {
    const res = await page.goto(`/no-existe-${randomUUID()}`);
    expect(res?.status()).toBe(404);
    await expect(page.getByText('Error 404')).toBeVisible();
  });
});
