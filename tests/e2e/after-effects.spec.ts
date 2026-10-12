import { test, expect, type Page } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import {
  createDemo,
  layerSchema,
  migrateProject,
} from '../../packages/project-schema/src/index';
import { testImage } from '../../packages/project-schema/src/assets.fixture';
import {
  aeManifestSchema,
  afterEffectsJSX,
} from '../../packages/animation-core/src/afterEffects';
async function importProject(page: Page, project: unknown) {
  await page.getByLabel('Import project JSON').setInputFiles({
    name: 'interchange.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(project)),
  });
  await expect
    .poll(() => page.evaluate(() => window.studio!.getProject()))
    .toEqual(migrateProject(project));
  await page.evaluate(() => window.studio!.renderer.ready());
}
async function open(page: Page) {
  await page
    .getByRole('button', { name: 'After Effects interchange', exact: true })
    .click();
}
async function download(page: Page, button: string, path: string) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: button, exact: true }).click();
  await (await pending).saveAs(path);
  return readFile(path, 'utf8');
}
test('real MapLibre sampled JSON/JSX preserves preview anchors, camera, crossfade, Unicode and dateline motion without modifying the project', async ({
  page,
}) => {
  test.setTimeout(130000);
  await page.setViewportSize({ width: 2200, height: 1400 });
  await page.goto('/');
  await page.waitForFunction(() => !!window.studio);
  const project = createDemo(),
    scene = project.scenes[0]!;
  project.name = 'Việt Nam — interchange test';
  project.durationSeconds = 3;
  scene.durationSeconds = 2;
  scene.camera.keyframes = [
    {
      time: 0,
      value: { lng: 179, lat: 10, zoom: 5, bearing: 20, pitch: 30 },
      easing: 'linear',
    },
    {
      time: 2,
      value: { lng: -179, lat: 11, zoom: 5.2, bearing: 40, pitch: 45 },
      easing: 'linear',
    },
  ];
  const marker = layerSchema.parse({
    id: 'ae-pin',
    name: 'Điểm qua 180°',
    type: 'marker',
    label: 'Unicode Hà Nội',
    anchor: { type: 'map', coordinates: [179.6, 10.5] },
    timeRange: { start: 0, end: 2 },
    style: { color: '#ffcc55', size: 24, icon: 'pin' },
  });
  const text = layerSchema.parse({
    id: 'ae-text',
    name: 'Unicode screen',
    type: 'text',
    text: 'Hành trình Việt Nam',
    anchor: { type: 'screen', x: 0.15, y: 0.1 },
    timeRange: { start: 0, end: 2 },
    transform: { scale: 1.2, rotation: 15, offsetX: 12, offsetY: -8 },
    style: {
      color: '#ffffff',
      fontSize: 40,
      fontWeight: 'bold',
      align: 'left',
    },
  });
  const hidden = layerSchema.parse({
    ...text,
    id: 'ae-hidden',
    name: 'Collision-hidden anchor',
    collision: { mode: 'hide', priority: 0 },
  });
  project.assets = [testImage()];
  const image = layerSchema.parse({
    id: 'ae-image',
    name: 'Fixture image',
    type: 'image',
    assetId: 'logo',
    anchor: { type: 'map', coordinates: [-179.7, 10.7] },
    timeRange: { start: 0, end: 2 },
    style: { width: 24, height: 24, fit: 'contain' },
  });
  scene.layers = [marker, text, hidden, image];
  const second = structuredClone(scene);
  second.id = 'ae-second';
  second.name = 'Incoming scene';
  second.startSeconds = 2;
  second.durationSeconds = 1;
  second.transition = { type: 'crossfade', durationSeconds: 0.5 };
  second.camera.keyframes = [
    {
      time: 0,
      value: { lng: -177, lat: 12, zoom: 5, bearing: 10, pitch: 20 },
      easing: 'linear',
    },
  ];
  second.layers = second.layers.map((l) => ({
    ...l,
    id: `${l.id}-second`,
    timeRange: { start: 0, end: 1 },
  }));
  project.scenes.push(second);
  const validated = migrateProject(project);
  await importProject(page, validated);
  await mkdir('test-results/after-effects', { recursive: true });
  await open(page);
  await page.getByRole('button', { name: 'Prepare camera & anchors' }).click();
  await expect(
    page.getByRole('region', { name: 'After Effects export review' }),
  ).toContainText('90 frames', { timeout: 65000 });
  const json = await download(
    page,
    'Download camera/anchor JSON',
    'test-results/after-effects/camera-anchors.json',
  );
  const manifest = aeManifestSchema.parse(JSON.parse(json));
  const jsx = await download(
    page,
    'Download JSX importer',
    'test-results/after-effects/import.jsx',
  );
  expect(jsx).toBe(afterEffectsJSX(manifest));
  expect(manifest.frames).toHaveLength(90);
  expect(manifest.anchors).toHaveLength(8);
  expect(
    manifest.frames[0]!.anchors.find((a) => a.id === 'ae-hidden'),
  ).toMatchObject({ labelHidden: true, opacity: 0 });
  expect(await page.evaluate(() => window.studio!.getProject())).toEqual(
    validated,
  );
  await page.getByRole('button', { name: 'Prepare camera & anchors' }).click();
  await expect(
    page.getByRole('region', { name: 'After Effects export review' }),
  ).toContainText('90 frames', { timeout: 65000 });
  expect(
    await download(
      page,
      'Download camera/anchor JSON',
      'test-results/after-effects/repeated.json',
    ),
  ).toBe(json);
  await page
    .getByRole('button', { name: 'Close After Effects interchange' })
    .click();
  await expect(page.locator('[data-interchange-renderer]')).toHaveCount(0);
  await page.evaluate(() =>
    Object.assign(document.querySelector<HTMLElement>('.composition')!.style, {
      position: 'fixed',
      left: '0',
      top: '0',
      width: '1920px',
      height: '1080px',
      maxHeight: 'none',
      zIndex: '50',
    }),
  );
  const comparisons = [];
  for (const index of [0, 30, 60, 67, 75, 89]) {
    await page.evaluate((t) => window.studio!.seek(t), index / 30);
    await page.evaluate(() => window.studio!.renderer.ready());
    const actual = await page.evaluate(() => {
      return Array.from(
        document
          .querySelector<HTMLElement>('[data-testid="map-surface"]')!
          .querySelectorAll<HTMLElement>('.map-overlays > [data-layer-id]'),
      ).map((el) => ({
        id: el.dataset.layerId!,
        x: parseFloat(el.style.left),
        y: parseFloat(el.style.top),
        hidden: el.dataset.labelHidden === 'true',
      }));
    });
    const state = await page.evaluate(
      (time) => window.studio!.evaluate(time),
      index / 30,
    );
    expect(manifest.frames[index]!.camera).toEqual(state.camera);
    let maximumPixelError = 0;
    for (const sample of manifest.frames[index]!.anchors) {
      const layer = [
        ...state.layers,
        ...(state.blend?.outgoing.layers ?? []),
      ].find((l) => l.id === sample.id)!;
      const dom = actual.find((a) => a.id === sample.id);
      if (!dom) continue;
      const error = Math.max(
        Math.abs(sample.position[0] - dom.x - layer.transform.offsetX),
        Math.abs(sample.position[1] - dom.y - layer.transform.offsetY),
      );
      expect(error).toBeLessThan(0.01);
      maximumPixelError = Math.max(maximumPixelError, error);
    }
    comparisons.push({ frame: index, maximumPixelError });
  }
  expect(manifest.frames[67]!.outgoing?.weight).toBeCloseTo(
    1 - (67 / 30 - 2) / 0.5,
  );
  const incoming = manifest.frames[67]!.anchors.find(
    (a) => a.id === 'ae-pin-second',
  )!;
  expect(incoming.opacity).toBeCloseTo(
    1 - manifest.frames[67]!.outgoing!.weight,
  );
  await page
    .getByTestId('map-surface')
    .screenshot({ path: 'test-results/after-effects/preview.png' });
  await writeFile(
    'test-results/after-effects/parity.json',
    JSON.stringify(
      {
        pipeline: 'Actual MapLibre full-size sampling; Adobe host unverified',
        frames: 90,
        anchors: 8,
        repeatedJSONIdentical: true,
        comparisons,
        crossfadeWeightsVerified: true,
      },
      null,
      2,
    ),
  );
});
test('cancel/close and actual missing Admin 1 resources clean sampling renderers and preserve saved content', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForFunction(() => !!window.studio);
  const original = await page.evaluate(() => window.studio!.getProject());
  await open(page);
  await page.getByRole('button', { name: 'Prepare camera & anchors' }).click();
  await expect(
    page.getByRole('button', { name: 'Cancel sampling' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Cancel sampling' }).click();
  await expect(
    page.getByRole('button', { name: 'Prepare camera & anchors' }),
  ).toBeEnabled();
  await expect(page.locator('[data-interchange-renderer]')).toHaveCount(0);
  expect(await page.evaluate(() => window.studio!.getProject())).toEqual(
    original,
  );
  await page.getByRole('button', { name: 'Prepare camera & anchors' }).click();
  await page
    .getByRole('button', { name: 'Close After Effects interchange' })
    .click();
  await expect(page.locator('[data-interchange-renderer]')).toHaveCount(0);
  const project = createDemo();
  project.map.admin1Countries = ['VNM'];
  await importProject(page, project);
  await page.route('**/data/admin1/VNM.geojson', (route) =>
    route.fulfill({
      status: 503,
      body: 'Intentionally unavailable test resource',
    }),
  );
  await open(page);
  await page.getByRole('button', { name: 'Prepare camera & anchors' }).click();
  await expect(page.getByRole('alert')).toContainText('503', {
    timeout: 20000,
  });
  await expect(page.locator('[data-interchange-renderer]')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Download JSX importer' }),
  ).toHaveCount(0);
  expect(await page.evaluate(() => window.studio!.getProject())).toEqual(
    project,
  );
});
