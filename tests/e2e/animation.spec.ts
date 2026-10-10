import { test, expect } from '@playwright/test';
test('scrubbing repeatedly restores camera and route', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => !!window.studio);
  await page.getByLabel('Playhead').fill('3');
  await page.evaluate(() => window.studio!.renderer.ready());
  await expect(page.getByLabel('Camera zoom')).not.toHaveValue('4');
  const at3 = await page.evaluate(() => ({
    center: window.studio!.renderer.map.getCenter().toArray(),
    zoom: window.studio!.renderer.map.getZoom(),
  }));
  await page.getByLabel('Playhead').fill('9');
  await page.getByLabel('Playhead').fill('3');
  await page.evaluate(() => window.studio!.renderer.ready());
  expect(
    await page.evaluate(() => ({
      center: window.studio!.renderer.map.getCenter().toArray(),
      zoom: window.studio!.renderer.map.getZoom(),
    })),
  ).toEqual(at3);
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Pause', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
});
