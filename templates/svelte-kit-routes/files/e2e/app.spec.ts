import { test, expect } from '@playwright/test';

test('home page loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toBeVisible();
});

test('navigates to route', async ({ page }) => {
  await page.goto('/');
  {{#each modules}}
  await page.click('text={{pascalCase this}}');
  await expect(page.locator('h1')).toContainText('{{pascalCase this}}');
  {{/each}}
});
