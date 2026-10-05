import { test, expect } from '@playwright/test';

test.describe('Founder Tools Tests @demo', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate via demo entry to establish a founder session cookie
    await page.goto('/demo-tools');
  });

  test('Founder Dashboard loads metrics', async ({ page }) => {
    await page.goto('/tools');
    await expect(page.locator('text=Founder Dashboard')).toBeVisible();
    await expect(page.locator('text=Etapa actual')).toBeVisible();
  });

  test('Radar page loads content', async ({ page }) => {
    await page.goto('/tools/radar');
    // Check for the radar title or specific filters
    await expect(page.locator('text=Radar').first()).toBeVisible();
    await expect(page.locator('text=Noticias')).toBeVisible();
  });

  test('Oportunidades page loads content', async ({ page }) => {
    await page.goto('/tools/oportunidades');
    // Check for the opportunities title
    await expect(page.locator('text=Oportunidades').first()).toBeVisible();
    // Check for filters
    await expect(page.locator('text=Categoría').first()).toBeVisible();
  });

  test('Diagnóstico page loads', async ({ page }) => {
    await page.goto('/tools/diagnostico');
    await expect(page.locator('text=Diagnóstico').first()).toBeVisible();
  });
});
