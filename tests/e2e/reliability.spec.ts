import { test, expect } from '@playwright/test';
import { createDemo } from '../../packages/project-schema/src/index';

test('render page reloads projects and recovers after a failed load', async ({
  page,
}) => {
  await page.goto('http://127.0.0.1:5174/render');
  await page.waitForFunction(() => !!window.renderStudio);
  // Complete unrelated page font requests before installing/removing network
  // interception; otherwise a paused font request can survive unroute in Chromium.
  await page.evaluate(() => document.fonts.ready);
  await page.route('**/data/countries.geojson', (route) =>
    route.fulfill({ status: 503, body: 'Unavailable' }),
  );
  await expect(
    page.evaluate((p) => window.renderStudio!.load(p), createDemo()),
  ).rejects.toThrow('Country data unavailable (503)');
  await page.unrouteAll({ behavior: 'wait' });
  await page.evaluate((p) => window.renderStudio!.load(p), createDemo());
  await page.evaluate(() => window.renderStudio!.frame(90));
  const next = createDemo('highlight');
  next.canvas = { width: 1080, height: 1920, fps: 30 };
  const title = next.scenes[0]!.layers.find((layer) => layer.type === 'text')!;
  if (title.type === 'text') title.text = 'Second project · Việt Nam';
  await page.evaluate((p) => window.renderStudio!.load(p), next);
  const state = await page.evaluate(() => window.renderStudio!.frame(180));
  expect(state.time).toBe(6);
  await expect(page.locator('.map-overlays')).toContainText(
    'Second project · Việt Nam',
  );
  await expect(page.locator('canvas.maplibregl-canvas')).toHaveCount(1);
  expect(
    await page.locator('.render-root').evaluate((element) => ({
      width: element.clientWidth,
      height: element.clientHeight,
    })),
  ).toEqual({ width: 1080, height: 1920 });
});

test('WebGL failure remains visible through seeking and resizing', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.waitForFunction(() => !!window.studio);
  await page.evaluate(() => {
    const canvas = window.studio!.renderer.map.getCanvas();
    const gl = canvas.getContext('webgl2');
    const extension = gl?.getExtension('WEBGL_lose_context');
    if (!extension) throw new Error('Context-loss extension unavailable');
    extension.loseContext();
  });
  await expect(page.getByRole('status')).toContainText('WebGL context lost');
  await page.getByLabel('Playhead').fill('6');
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(page.getByRole('status')).toContainText('WebGL context lost');
  await expect(
    page.evaluate(() => window.studio!.renderer.ready()),
  ).rejects.toThrow('WebGL context lost');
  expect(errors).toEqual([]);
  await page.reload();
  await page.waitForFunction(() => !!window.studio);
  await expect(page.getByRole('status')).toHaveCount(0);
});
