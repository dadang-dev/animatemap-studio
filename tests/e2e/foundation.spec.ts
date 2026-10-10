import { test, expect } from '@playwright/test';
test('editor launches and API is reachable', async ({ page, request }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'AnimateMap Studio' }),
  ).toBeVisible();
  expect((await request.get('/api/health')).ok()).toBe(true);
});
