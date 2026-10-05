import { test, expect } from '@playwright/test';

test.describe('Admin Tools Tests @demo', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate via demo entry to establish an admin session cookie
    await page.goto('/demo-admin');
  });

  test('Admin Dashboard loads', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.locator('text=Panel de gestión').or(page.locator('text=Admin')).first()).toBeVisible();
  });

  test('Admin Radar loads', async ({ page }) => {
    await page.goto('/admin/radar');
    await expect(page.locator('text=Radar').first()).toBeVisible();
  });

  test('Admin Oportunidades loads', async ({ page }) => {
    await page.goto('/admin/oportunidades');
    await expect(page.locator('text=Oportunidades').first()).toBeVisible();
  });
});

test.describe('Superadmin Tools Tests @demo', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate via demo entry to establish a superadmin session cookie
    await page.goto('/demo-superadmin');
  });

  test('Superadmin Dashboard loads', async ({ page }) => {
    await page.goto('/superadmin');
    await expect(page.locator('text=Superadmin').first()).toBeVisible();
  });
});
