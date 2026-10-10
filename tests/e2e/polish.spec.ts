import { test, expect } from '@playwright/test';
import { createDemo } from '../../packages/project-schema/src/index';
test('route tool can connect existing marker anchors', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => !!window.studio);
  await page.getByRole('button', { name: 'Draw route' }).click();
  await page.locator('[data-layer-id="marker-0"] .marker-icon').click();
  await page.locator('[data-layer-id="marker-1"] .marker-icon').click();
  await page.getByRole('button', { name: 'Finish route' }).click();
  const project = await page.evaluate(() => window.studio!.getProject());
  const route = project.scenes[0]!.layers.at(-1)!;
  expect(route.type).toBe('route');
  if (route.type === 'route')
    expect(route.coordinates).toEqual([
      [105.85, 21.03],
      [108.2, 16.06],
    ]);
});
test('antimeridian route and arrow render on the nearest world copy', async ({
  page,
}) => {
  const p = createDemo();
  const scene = p.scenes[0]!;
  scene.camera.keyframes = [
    {
      time: 0,
      value: { lng: 179, lat: 10, zoom: 5, bearing: 0, pitch: 0 },
      easing: 'linear',
    },
    {
      time: 12,
      value: { lng: -179, lat: 10, zoom: 5, bearing: 0, pitch: 0 },
      easing: 'linear',
    },
  ];
  scene.layers = scene.layers.filter((l) => l.type === 'route');
  const route = scene.layers[0]!;
  if (route.type === 'route') {
    route.coordinates = [
      [179, 10],
      [-179, 10],
    ];
    route.tracks.reveal = [];
  }
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('http://127.0.0.1:5174/render');
  await page.waitForFunction(() => !!window.renderStudio);
  await page.evaluate((p) => window.renderStudio!.load(p), p);
  const state = await page.evaluate(() => window.renderStudio!.frame(180));
  expect(Math.abs(state.camera.lng)).toBe(180);
  const arrow = page.locator('[data-layer-id="route-1"]');
  const x = parseFloat(
    await arrow.evaluate((el) => (el as HTMLElement).style.left),
  );
  expect(x).toBeGreaterThan(0);
  expect(x).toBeLessThan(1920);
  const evaluated = state.layers[0]!;
  if (evaluated.type === 'route')
    expect(
      Math.max(...evaluated.coordinates.map((p) => p[0])) -
        Math.min(...evaluated.coordinates.map((p) => p[0])),
    ).toBeLessThan(3);
});
test('normal preview and full render use the same geographic framing', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await page.waitForFunction(() => !!window.studio);
  await page.getByLabel('Playhead').fill('3');
  await page.evaluate(() => window.studio!.renderer.ready());
  const small = await page.evaluate(() => {
    const r = window.studio!.renderer,
      p = r.map.project([105.85, 21.03]);
    const c = r.map.getContainer();
    return {
      x: p.x / c.clientWidth,
      y: p.y / c.clientHeight,
      aspect: c.clientWidth / c.clientHeight,
    };
  });
  expect(small.aspect).toBeCloseTo(16 / 9, 2);
  await page.evaluate(() => {
    const el = document.querySelector<HTMLElement>('.composition')!;
    Object.assign(el.style, {
      position: 'fixed',
      width: '1920px',
      height: '1080px',
      left: '0',
      top: '0',
      maxHeight: 'none',
    });
  });
  await page.evaluate(() => window.studio!.renderer.ready());
  const full = await page.evaluate(() => {
    const r = window.studio!.renderer,
      p = r.map.project([105.85, 21.03]);
    return { x: p.x / 1920, y: p.y / 1080 };
  });
  expect(full.x).toBeCloseTo(small.x, 3);
  expect(full.y).toBeCloseTo(small.y, 3);
  const render = await context.newPage();
  await render.setViewportSize({ width: 1920, height: 1080 });
  await render.goto('http://127.0.0.1:5174/render');
  await render.waitForFunction(() => !!window.renderStudio);
  await render.evaluate((p) => window.renderStudio!.load(p), createDemo());
  await render.evaluate(() => window.renderStudio!.frame(90));
  const pin = render.locator('[data-layer-id="marker-0"]');
  expect(
    parseFloat(await pin.evaluate((el) => (el as HTMLElement).style.left)) /
      1920,
  ).toBeCloseTo(small.x, 3);
  await render.close();
});
test('keyboard shortcuts work and do not consume text input', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForFunction(() => !!window.studio);
  await page.getByRole('button', { name: 'Add text', exact: true }).click();
  await page.getByLabel('Text', { exact: true }).fill('Việt Nam');
  await page.getByLabel('Text', { exact: true }).press('Space');
  await expect(
    page.getByRole('button', { name: 'Play', exact: true }),
  ).toBeVisible();
  await page.getByLabel('Text', { exact: true }).blur();
  await page.locator('body').click({ position: { x: 5, y: 65 } });
  await page.keyboard.press('Space');
  await expect(
    page.getByRole('button', { name: 'Pause', exact: true }),
  ).toBeVisible();
  await page.keyboard.press('Space');
  await page.keyboard.press('+');
  await expect(page.getByLabel('Timeline zoom')).toHaveValue('1.25');
  await page.keyboard.press('k');
  expect(
    await page.evaluate(() =>
      window
        .studio!.getProject()
        .scenes[0]!.layers.find(
          (l) => l.type === 'text' && l.text.startsWith('Việt Nam'),
        ),
    ),
  ).toBeTruthy();
});
test('missing map resources reject rendering and preserve saved project', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForFunction(() => !!window.studio);
  const before = await page.evaluate(() => window.studio!.getProject());
  await page.goto('http://127.0.0.1:5174/render');
  await page.route('**/data/countries.geojson', (route) =>
    route.fulfill({ status: 503, body: 'Unavailable' }),
  );
  await page.waitForFunction(() => !!window.renderStudio);
  await expect(
    page.evaluate((p) => window.renderStudio!.load(p), before),
  ).rejects.toThrow('Country data unavailable (503)');
  await expect(page.getByRole('status')).toContainText(
    'Country data unavailable',
  );
  await page.unroute('**/data/countries.geojson');
  await page.goto('/');
  await page.waitForFunction(() => !!window.studio);
  expect(await page.evaluate(() => window.studio!.getProject())).toEqual(
    before,
  );
  const message = await page.evaluate(async () => {
    const r = window.studio!.renderer;
    const loaded = r.map.loaded;
    r.map.loaded = () => false;
    try {
      await r.ready(10);
      return 'unexpected';
    } catch (e) {
      return (e as Error).message;
    } finally {
      r.map.loaded = loaded;
    }
  });
  expect(message).toBe('Map resources timed out');
});
test('text is rendered as text, never executable markup', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => !!window.studio);
  await page.getByRole('button', { name: 'Add text', exact: true }).click();
  await page
    .getByLabel('Text', { exact: true })
    .fill('<img src=x onerror="window.hacked=true">');
  await expect(page.locator('.map-overlays img')).toHaveCount(0);
  await expect(page.locator('.map-overlays')).toContainText('<img');
});
