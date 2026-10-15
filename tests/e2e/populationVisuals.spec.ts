import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import {
  createDemo,
  projectSchema,
} from '../../packages/project-schema/src/index';
test('real satellite, fitted flag and counter seek deterministically; editor controls undo and JSON survives refresh', async ({
  page,
}) => {
  test.setTimeout(120000);
  const p = createDemo();
  p.id = 'e2e-population-visuals';
  p.canvas = { width: 720, height: 1280, fps: 30 };
  p.map.basemap = 'blue-marble';
  p.map.cameraFraming = 'project';
  p.map.creditLayout = { bottomInset: 100, fontSize: 20, margin: 80 };
  const flag = await readFile('apps/web/public/assets/flags/population/in.png');
  p.assets = [
    {
      id: 'flag',
      name: 'India flag',
      type: 'image',
      mime: 'image/png',
      width: 512,
      height: 384,
      dataUrl: `data:image/png;base64,${flag.toString('base64')}`,
      provenance: {
        source: 'https://github.com/lipis/flag-icons',
        author: 'flag-icons',
        license: 'MIT',
        credit: 'Flags · MIT',
      },
    },
  ];
  const scene = p.scenes[0]!;
  scene.camera.keyframes = [
    {
      time: 0,
      value: { lng: 79, lat: 22, zoom: 0.6, bearing: 0, pitch: 0 },
      easing: 'linear',
    },
  ];
  const highlight = scene.layers.find((l) => l.type === 'countryHighlight')!;
  if (highlight.type === 'countryHighlight') {
    highlight.countryCodes = ['IND'];
    highlight.textureAssetId = 'flag';
    highlight.textureFit = 'country';
  }
  const text = scene.layers.find((l) => l.type === 'text')!;
  if (text.type !== 'text') throw Error('Expected text');
  text.counter = {
    from: 0,
    to: 1451,
    start: 1,
    end: 2,
    decimals: 0,
    locale: 'vi-VN',
    easing: 'linear',
  };
  const project = projectSchema.parse(p);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.waitForFunction(() => !!window.studio);
  await page.getByLabel('Import project JSON').setInputFiles({
    name: 'population.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(project)),
  });
  await expect
    .poll(() => page.evaluate(() => window.studio!.getProject()))
    .toEqual(project);
  await page.evaluate(async () => {
    window.studio!.seek(1.5);
    await window.studio!.renderer.ready();
  });
  await expect(page.locator(`[data-layer-id="${text.id}"]`)).toHaveText('726');
  const first = await page.locator('.composition').screenshot();
  const inset = await page
    .locator('.map-credit')
    .evaluate((el) => parseFloat((el as HTMLElement).style.bottom));
  const mapWidth = await page.evaluate(
    () => window.studio!.renderer.map.getContainer().clientWidth,
  );
  expect(inset).toBeCloseTo((100 * mapWidth) / 720);
  expect(
    await page.evaluate(() => window.studio!.renderer.map.getZoom()),
  ).toBeCloseTo(0.6 + Math.log2(mapWidth / 720));
  expect(
    await page.evaluate(() =>
      window.studio!.renderer.map.getRenderWorldCopies(),
    ),
  ).toBe(true);
  await page.evaluate(async () => {
    window.studio!.seek(8);
    await window.studio!.renderer.ready();
    window.studio!.seek(1.5);
    await window.studio!.renderer.ready();
  });
  expect(await page.locator('.composition').screenshot()).toEqual(first);
  expect(
    await page.evaluate(
      () => window.studio!.renderer.map.getLayer('ams-blue-marble')?.type,
    ),
  ).toBe('raster');
  expect(
    await page.evaluate(
      (id) => window.studio!.renderer.map.getLayer(`ams-fit-${id}-IND`)?.type,
      highlight.id,
    ),
  ).toBe('raster');
  await page.getByLabel('Basemap imagery').selectOption('vector');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByLabel('Basemap imagery')).toHaveValue('blue-marble');
  await expect(page.getByText('Saved locally')).toBeVisible();
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => window.studio?.getProject().map.basemap))
    .toBe('blue-marble');
  expect(errors).toEqual([]);
});
