const { test, expect } = require('@playwright/test');

test('company dashboard should not render placeholder settings pages', async ({ page }) => {
  const baseUrl = process.env.BASE_URL || 'http://localhost:5173';
  await page.goto(`${baseUrl}/company-dashboard/settings`);

  await expect(page.locator('body')).not.toContainText('Settings Page');
  await expect(page.locator('body')).not.toContainText('Team Management Page');
});
