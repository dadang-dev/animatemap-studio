import { test, expect, type Page } from '@playwright/test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';
import type { RenderJob } from '../../packages/project-schema/src/index';
const exec = promisify(execFile);
async function clickCoordinate(page: Page, point: [number, number]) {
  const position = await page.evaluate(
    (point) => window.studio!.renderer.map.project(point),
    point,
  );
  const box = await page.locator('.map-host').boundingBox();
  await page.mouse.click(box!.x + position.x, box!.y + position.y);
  return position;
}
async function createCurve(page: Page) {
  await page.getByLabel('Draw bezier shape', { exact: true }).click();
  for (const point of [
    [105, 16],
    [106, 22],
    [110, 22],
    [111, 16],
  ] as [number, number][])
    await clickCoordinate(page, point);
  await page.getByRole('button', { name: 'Finish shape', exact: true }).click();
}
async function seek(page: Page, time: number) {
  await page.evaluate((time) => window.studio!.seek(time), time);
  await page.evaluate(() => window.studio!.renderer.ready());
}
test('Bezier and arrow across the antimeridian render on the nearest world copy', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForFunction(() => !!window.studio);
  await createCurve(page);
  const project = await page.evaluate(() => window.studio!.getProject());
  const scene = project.scenes[0]!;
  scene.layers = scene.layers.filter((layer) => layer.type === 'shape');
  const curve = scene.layers[0]!;
  if (curve.type !== 'shape') throw new Error('Missing shape');
  curve.coordinates = [
    [179, 0],
    [-179, 3],
    [179, -3],
    [-179, 0],
  ];
  curve.style.arrow = true;
  curve.style.width = 10;
  scene.camera.keyframes = [
    {
      time: 0,
      value: { lng: 179.5, lat: 0, zoom: 5, bearing: 20, pitch: 35 },
      easing: 'linear',
    },
  ];
  await page.locator('input[type="file"]').setInputFiles({
    name: 'dateline-curve.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(project)),
  });
  await expect
    .poll(() =>
      page.evaluate(() => window.studio!.getProject().scenes[0]!.layers.length),
    )
    .toBe(1);
  await seek(page, 6);
  const coordinates = await page.evaluate(
    () => window.studio!.evaluate(6).layers[0]!.renderCoordinates!,
  );
  expect(
    Math.max(...coordinates.map((point) => point[0])) -
      Math.min(...coordinates.map((point) => point[0])),
  ).toBeLessThan(2.1);
  expect(
    await page.evaluate(
      (id) =>
        window.studio!.renderer.map.queryRenderedFeatures({
          layers: [`ams-${id}-line`],
        }).length,
      curve.id,
    ),
  ).toBeGreaterThan(0);
  const arrow = page.locator(`[data-layer-id="${curve.id}"]`);
  await expect(arrow).toBeVisible();
  const box = await arrow.boundingBox();
  const map = await page.locator('.map-host').boundingBox();
  expect(Math.abs(box!.x - map!.x - map!.width / 2)).toBeLessThan(150);
});
test('users create and edit geographic line, arrow and Bezier controls with history and persistence', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForFunction(() => !!window.studio);
  for (const kind of ['line', 'arrow']) {
    await page.getByLabel(`Draw ${kind} shape`, { exact: true }).click();
    await clickCoordinate(page, [104, 14]);
    await clickCoordinate(page, [112, 18]);
    await page
      .getByRole('button', { name: 'Finish shape', exact: true })
      .click();
  }
  await createCurve(page);
  await expect(page.getByLabel('Shape kind')).toHaveValue('bezier');
  await expect(
    page.getByTestId('shape-edit-controls').getByRole('button'),
  ).toHaveCount(4);
  await page.getByLabel('Layer name', { exact: true }).fill('Arc Hà Nội');
  await page.getByLabel('Shape width', { exact: true }).fill('12');
  await page.getByRole('checkbox', { name: 'Arrow head', exact: true }).check();
  const before = await page.evaluate(() => window.studio!.getProject());
  await page.getByLabel('Reposition shape point 2', { exact: true }).click();
  const requestedPosition = await clickCoordinate(page, [104, 20]);
  const edited = await page.evaluate(() => window.studio!.getProject());
  const shape = edited.scenes[0]!.layers.find(
    (layer) => layer.type === 'shape' && layer.kind === 'bezier',
  )!;
  if (shape.type !== 'shape') throw new Error('Missing shape');
  const appliedPosition = await page.evaluate(
    (point) => window.studio!.renderer.map.project(point),
    shape.coordinates[1]!,
  );
  // Native clicks are quantized to device pixels; compare the projected location.
  expect(
    Math.hypot(
      appliedPosition.x - requestedPosition.x,
      appliedPosition.y - requestedPosition.y,
    ),
  ).toBeLessThan(1.5);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  expect(await page.evaluate(() => window.studio!.getProject())).toEqual(
    before,
  );
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  expect(await page.evaluate(() => window.studio!.getProject())).toEqual(
    edited,
  );
  await page.getByLabel('Camera pitch').fill('35');
  await page.getByLabel('Camera zoom').fill('5');
  await page.evaluate(() => window.studio!.renderer.ready());
  const position = await page.evaluate(
    (point) => window.studio!.renderer.map.project(point),
    shape.coordinates[1]!,
  );
  const handle = await page
    .getByLabel('Reposition shape point 2')
    .boundingBox();
  const map = await page.locator('.map-host').boundingBox();
  expect(
    Math.abs(handle!.x + handle!.width / 2 - map!.x - position.x),
  ).toBeLessThan(1);
  expect(
    Math.abs(handle!.y + handle!.height / 2 - map!.y - position.y),
  ).toBeLessThan(1);
  await page.getByLabel('Toggle lock Arc Hà Nội', { exact: true }).click();
  await expect(page.getByTestId('shape-edit-controls')).toHaveCount(0);
  await expect(page.getByLabel('Move shape point 2 on map')).toBeDisabled();
  await page.getByLabel('Toggle lock Arc Hà Nội', { exact: true }).click();
  await seek(page, 6);
  await page.getByLabel('Keyframe property').selectOption('reveal');
  await page.getByRole('button', { name: 'Add keyframe', exact: true }).click();
  await page
    .getByLabel('Arc Hà Nội reveal keyframe 6', { exact: true })
    .click();
  await page.getByLabel('Keyframe value').fill('0.5');
  await page.screenshot({ path: 'test-results/phase-6-shapes.png' });
  const saved = await page.evaluate(() => window.studio!.getProject());
  await expect(page.getByText('Saved locally', { exact: false })).toBeVisible();
  await page.reload();
  await page.waitForFunction(() => !!window.studio);
  expect(await page.evaluate(() => window.studio!.getProject())).toEqual(saved);
  await page.getByRole('button', { name: 'Project ▾' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON', exact: true }).click();
  const path = await (await downloadPromise).path();
  expect(JSON.parse(await readFile(path!, 'utf8'))).toEqual(saved);
});

test('Bezier reveal exports real MP4 matching preview without editor handles', async ({
  page,
  request,
}) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 2200, height: 1400 });
  await page.goto('/');
  await page.waitForFunction(() => !!window.studio);
  await page.getByLabel('Scene duration', { exact: true }).fill('2');
  await createCurve(page);
  await page.getByLabel('Shape width', { exact: true }).fill('12');
  await page.getByRole('checkbox', { name: 'Arrow head', exact: true }).check();
  await page.getByLabel('Show shape controls', { exact: true }).uncheck();
  const project = await page.evaluate(() => window.studio!.getProject());
  const response = await request.post('/api/jobs', {
    data: { project, format: 'mp4' },
  });
  expect(response.ok()).toBe(true);
  const job = (await response.json()) as RenderJob;
  await expect
    .poll(
      async () => {
        const status = (await (
          await request.get(`/api/jobs/${job.id}`)
        ).json()) as RenderJob;
        if (status.state === 'failed') throw new Error(status.error);
        return status.state;
      },
      { timeout: 150000, intervals: [1000] },
    )
    .toBe('completed');
  await mkdir('test-results/shapes', { recursive: true });
  const output = resolve('test-results/shapes/curve.mp4');
  await writeFile(
    output,
    await (await request.get(`/api/jobs/${job.id}/download`)).body(),
  );
  const probe = JSON.parse(
    (
      await exec('ffprobe', [
        '-v',
        'error',
        '-count_frames',
        '-show_streams',
        '-of',
        'json',
        output,
      ])
    ).stdout,
  );
  expect(Number(probe.streams[0].nb_read_frames)).toBe(60);
  await exec('ffmpeg', [
    '-y',
    '-i',
    output,
    '-vf',
    'select=eq(n\\,0)+eq(n\\,30)+eq(n\\,59)',
    '-fps_mode',
    'vfr',
    resolve('test-results/shapes/decoded-%02d.png'),
  ]);
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
  for (const [index, frame] of [0, 30, 59].entries()) {
    await seek(page, frame / 30);
    await expect(page.getByTestId('shape-edit-controls')).toHaveCount(0);
    const expected = PNG.sync.read(
      await page
        .getByTestId('map-surface')
        .screenshot({ path: `test-results/shapes/preview-${frame}.png` }),
    );
    const decoded = PNG.sync.read(
      await readFile(
        `test-results/shapes/decoded-${String(index + 1).padStart(2, '0')}.png`,
      ),
    );
    let difference = 0;
    for (let pixel = 0; pixel < expected.data.length; pixel += 4)
      for (let channel = 0; channel < 3; channel++)
        difference += Math.abs(
          expected.data[pixel + channel]! - decoded.data[pixel + channel]!,
        );
    const mean = difference / (expected.width * expected.height * 3);
    expect(mean).toBeLessThan(3);
    comparisons.push({ frame, meanAbsoluteChannelError: mean });
  }
  await writeFile(
    'test-results/shapes/parity.json',
    JSON.stringify({ comparisons }, null, 2),
  );
  await writeFile(
    'test-results/shapes/ffprobe.json',
    JSON.stringify(probe, null, 2),
  );
});
