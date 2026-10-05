import { test, expect } from '@playwright/test';
import { skipUnlessDemoEnabled } from './helpers/demo';

test.describe('Authentication and Routing @demo', () => {
  skipUnlessDemoEnabled();

  test('Demo Founder can access dashboard and it redirects from root', async ({ page }) => {
    // Navigate to demo-tools which sets the cookie
    await page.goto('/demo-tools');
    
    // Check we are actually in the tools dashboard
    await expect(page.locator('text=Founder Dashboard')).toBeVisible({ timeout: 10000 });
    
    // Now simulate clicking Dashboard from the home page
    await page.goto('/');
    
    // Click 'Dashboard' in Navbar
    const dashboardBtn = page.locator('button', { hasText: 'Dashboard' });
    await dashboardBtn.click();
    
    // Assert it routed us to /tools because we are a founder
    await expect(page).toHaveURL(/.*\/tools/);
  });

  test('Demo Admin is routed to /admin from Navbar', async ({ page }) => {
    // Navigate to demo-admin which sets the cookie
    await page.goto('/demo-admin');
    
    // Check we are in the admin view
    await expect(page.locator('text=S4C Admin').first()).toBeVisible({ timeout: 10000 });
    
    // Go to homepage
    await page.goto('/');
    
    // Click Dashboard in Navbar
    const dashboardBtn = page.locator('button', { hasText: 'Dashboard' });
    await dashboardBtn.click();
    
    // Assert it routed us to /admin because we are an admin
    await expect(page).toHaveURL(/.*\/admin/);
  });
});
