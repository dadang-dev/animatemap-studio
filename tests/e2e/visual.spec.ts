import { test, expect } from '@playwright/test';
import { createDemo } from '../../packages/project-schema/src/index';
test('deterministic golden frames and Vietnamese typography', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('http://127.0.0.1:5174/render');
  await page.waitForFunction(() => !!window.renderStudio);
  await page.evaluate((p) => window.renderStudio!.load(p), createDemo());
  for (const time of [0, 3, 6, 9]) {
    await page.evaluate(
      (frame) => window.renderStudio!.frame(frame),
      time * 30,
    );
    await expect(page).toHaveScreenshot(`travel-${time}.png`);
  }
  await expect(page.locator('.map-overlays')).toContainText('Đà Nẵng');
  await expect(page.locator('.map-credit')).toContainText('Natural Earth');
});
