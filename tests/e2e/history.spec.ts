import {
  test,
  expect,
  type APIRequestContext,
  type Page,
} from '@playwright/test';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { PNG } from 'pngjs';
import { unzipSync } from 'fflate';
import {
  createDemo,
  historicalManifestSchema,
  projectSchema,
  multipassManifestSchema,
  type Project,
  type RenderJob,
} from '../../packages/project-schema/src/index';
import { addHistoricalLayer } from '../../apps/web/src/historyOperations';
const exec = promisify(execFile);
async function seek(page: Page, time: number) {
  await page.evaluate((t) => window.studio!.seek(t), time);
  await page.evaluate(() => window.studio!.renderer.ready());
}
async function load(page: Page, project: Project) {
  await page.getByLabel('Import project JSON').setInputFiles({
    name: 'history.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(project)),
  });
  await expect
    .poll(() => page.evaluate(() => window.studio!.getProject()))
    .toEqual(project);
  await page.evaluate(() => window.studio!.renderer.ready());
}
async function job(request: APIRequestContext, data: unknown) {
  const response = await request.post('/api/jobs', { data });
  expect(response.ok()).toBe(true);
  const queued = (await response.json()) as RenderJob;
  await expect
    .poll(
      async () => {
        const status = (await (
          await request.get(`/api/jobs/${queued.id}`)
        ).json()) as RenderJob;
        if (status.state === 'failed') throw new Error(status.error);
        return status.state;
      },
      { timeout: 240000, intervals: [1000] },
    )
    .toBe('completed');
  return (await request.get(`/api/jobs/${queued.id}/download`)).body();
}
test('reviewed historical sources, year slider, regions, morph and undo survive refresh and JSON round trip', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForFunction(() => !!window.studio);
  await page
    .getByRole('button', { name: 'Historical boundaries', exact: true })
    .click();
  await page.getByRole('button', { name: 'Review DC wards 1982–2011' }).click();
  await expect(page.getByRole('dialog')).toContainText('CC BY 4.0');
  await expect(page.getByRole('dialog')).toContainText('1990');
  await expect(
    page.getByRole('button', { name: 'Add historical boundaries' }),
  ).toBeDisabled();
  await page
    .getByLabel('I reviewed source rights, year coverage and uncertainty')
    .check();
  await page.getByRole('button', { name: 'Add historical boundaries' }).click();
  await seek(page, 0);
  const added = await page.evaluate(() => window.studio!.getProject());
  const layer = added.scenes[0]!.layers.at(-1)!;
  expect(layer.type).toBe('historical');
  await expect(page.locator('.map-credit')).toContainText('DC Office');
  const actual = await page.evaluate(
    (id) =>
      window.studio!.renderer.map.queryRenderedFeatures(undefined, {
        layers: [`ams-${id}-fill`],
      }).length,
    layer.id,
  );
  expect(actual).toBeGreaterThan(0);
  await page.getByLabel('Historical year', { exact: true }).fill('1992');
  await expect(
    page.locator(`[data-historical-layer="${layer.id}"]`),
  ).toContainText('1992');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByLabel('Historical year', { exact: true })).toHaveValue(
    '1982',
  );
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(page.getByLabel('Historical year', { exact: true })).toHaveValue(
    '1992',
  );
  for (let i = 2; i <= 8; i++)
    await page.getByLabel(`Historical Ward ${i}`, { exact: true }).uncheck();
  await page.getByLabel('Historical boundary mode').selectOption('morph');
  await page.getByLabel('Historical year', { exact: true }).fill('1987');
  await expect(
    page.locator(`[data-historical-layer="${layer.id}"]`),
  ).toContainText('Illustrative');
  await page.getByRole('button', { name: `Toggle lock ${layer.name}` }).click();
  await expect(
    page.getByLabel('Historical year', { exact: true }),
  ).toBeDisabled();
  await page.getByRole('button', { name: `Toggle lock ${layer.name}` }).click();
  const project = await page.evaluate(() => window.studio!.getProject());
  await page.getByLabel('Keyframe property').selectOption('historyYear');
  await page.getByRole('button', { name: 'Add keyframe', exact: true }).click();
  expect(
    (
      await page.evaluate(() => window.studio!.getProject())
    ).scenes[0]!.layers.at(-1)!.tracks.historyYear,
  ).toHaveLength(1);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  expect(await page.evaluate(() => window.studio!.getProject())).toEqual(
    project,
  );
  await expect(
    page.locator('aside small').filter({ hasText: 'Saved locally' }),
  ).toBeVisible();
  await page.reload();
  await page.waitForFunction(() => !!window.studio);
  await expect
    .poll(() => page.evaluate(() => window.studio!.getProject()))
    .toEqual(project);
  await load(page, project);
  await page
    .locator('.layer-list')
    .getByRole('button', {
      name: project.scenes[0]!.layers.at(-1)!.name,
      exact: true,
    })
    .click();
  await page.getByLabel('Historical year', { exact: true }).fill('2012');
  await expect(
    page.locator(`[data-historical-layer="${layer.id}"]`),
  ).toContainText('No documented');
});
test('historical source outages, checksum failures and invalid local topology preserve the current project', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForFunction(() => !!window.studio);
  const original = await page.evaluate(() => window.studio!.getProject());
  await page
    .getByRole('button', { name: 'Historical boundaries', exact: true })
    .click();
  await page.route('**/data/history/dc-wards-1982-2011.json', (route) =>
    route.fulfill({ status: 503, body: 'unavailable' }),
  );
  await page.getByRole('button', { name: 'Review DC wards 1982–2011' }).click();
  await expect(page.getByRole('alert')).toContainText('503');
  await page.unroute('**/data/history/dc-wards-1982-2011.json');
  await page.route('**/data/history/dc-wards-1982-2011.json', (route) =>
    route.fulfill({ status: 200, body: '{}' }),
  );
  await page.getByRole('button', { name: 'Review DC wards 1982–2011' }).click();
  await expect(page.getByRole('alert')).toContainText('checksum');
  const manifest = JSON.parse(
    await readFile(
      'apps/web/public/data/history/dc-wards-1982-2011.json',
      'utf8',
    ),
  );
  manifest.dataset.epochs[0].features[0].geometry = {
    type: 'Polygon',
    coordinates: [
      [
        [0, 0],
        [1, 1],
        [0, 1],
        [1, 0],
        [0, 0],
      ],
    ],
  };
  await page.getByLabel('Import historical manifest JSON').setInputFiles({
    name: 'invalid-history.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(manifest)),
  });
  await expect(page.getByRole('alert')).toBeVisible();
  expect(await page.evaluate(() => window.studio!.getProject())).toEqual(
    original,
  );
});
test('actual historical morph H264/PNG and v15 multi-pass preserve deterministic preview, labels and original snapshots', async ({
  page,
  request,
}) => {
  test.setTimeout(300000);
  const dataset = historicalManifestSchema.parse(
    JSON.parse(
      await readFile(
        'apps/web/public/data/history/dc-wards-1982-2011.json',
        'utf8',
      ),
    ),
  ).dataset;
  const p = createDemo();
  p.id = 'history-parity';
  p.durationSeconds = 1;
  p.canvas = { width: 960, height: 540, fps: 24 };
  p.scenes[0]!.durationSeconds = 1;
  p.scenes[0]!.layers = [];
  p.scenes[0]!.camera.keyframes = p.scenes[0]!.camera.keyframes.slice(0, 1);
  addHistoricalLayer(p, p.scenes[0]!.id, dataset, true, 'historical-ward');
  const layer = p.scenes[0]!.layers[0]!;
  if (layer.type !== 'historical') throw new Error('Wrong layer');
  layer.regionIds = ['ward-1'];
  layer.mode = 'morph';
  layer.tracks.historyYear = [
    { time: 0, value: 1982, easing: 'linear' },
    { time: 1, value: 1992, easing: 'linear' },
  ];
  const project = projectSchema.parse(p);
  await mkdir('test-results/history', { recursive: true });
  await page.goto('/');
  await page.waitForFunction(() => !!window.studio);
  await load(page, project);
  await page.evaluate(() =>
    Object.assign(document.querySelector<HTMLElement>('.composition')!.style, {
      position: 'fixed',
      left: '0',
      top: '0',
      width: '960px',
      height: '540px',
      maxHeight: 'none',
      zIndex: '50',
    }),
  );
  const previews: Buffer[] = [];
  for (const frame of [0, 12, 23]) {
    await seek(page, frame / 24);
    await expect(page.locator('.map-credit')).toContainText('CC BY 4.0');
    const preview = PNG.sync.read(
      await page
        .getByTestId('map-surface')
        .screenshot({ path: `test-results/history/preview-${frame}.png` }),
    );
    expect([preview.width, preview.height]).toEqual([960, 540]);
    previews.push(preview.data);
    await seek(page, 0.1);
    await seek(page, frame / 24);
    expect(
      PNG.sync
        .read(await page.getByTestId('map-surface').screenshot())
        .data.equals(preview.data),
    ).toBe(true);
  }
  expect(previews[0]!.equals(previews[1]!)).toBe(false);
  const video = await job(request, { project, format: 'mp4' });
  await writeFile('test-results/history/history.mp4', video);
  const output = resolve('test-results/history/history.mp4');
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
  expect(probe.streams[0]).toMatchObject({
    codec_name: 'h264',
    width: 960,
    height: 540,
    pix_fmt: 'yuv420p',
    nb_read_frames: '24',
  });
  await exec('ffmpeg', [
    '-y',
    '-i',
    output,
    '-vf',
    'select=eq(n\\,0)+eq(n\\,12)+eq(n\\,23)',
    '-fps_mode',
    'vfr',
    resolve('test-results/history/decoded-%02d.png'),
  ]);
  const comparisons = [];
  for (let i = 0; i < 3; i++) {
    const decoded = PNG.sync.read(
      await readFile(
        `test-results/history/decoded-${String(i + 1).padStart(2, '0')}.png`,
      ),
    );
    let error = 0;
    for (let p = 0; p < decoded.data.length; p += 4)
      for (let c = 0; c < 3; c++)
        error += Math.abs(decoded.data[p + c]! - previews[i]![p + c]!);
    const mean = error / (960 * 540 * 3);
    expect(mean).toBeLessThan(3);
    comparisons.push(mean);
  }
  const png = await job(request, { project, format: 'png', frameIndex: 12 });
  expect(PNG.sync.read(png).data.equals(previews[1]!)).toBe(true);
  const archive = await job(request, { project, format: 'zip' });
  await writeFile('test-results/history/history.zip', archive);
  const files = unzipSync(archive),
    manifest = multipassManifestSchema.parse(
      JSON.parse(Buffer.from(files['manifest.json']!).toString()),
    );
  expect(manifest.projectSchemaVersion).toBe(15);
  expect(
    manifest.sourceCredits.some((credit) => credit.includes('DC Office')),
  ).toBe(true);
  for (const [index, frame] of [0, 12, 23].entries()) {
    const entry = manifest.frames[frame]!;
    expect(
      PNG.sync
        .read(Buffer.from(files[entry.reference]!))
        .data.equals(previews[index]!),
    ).toBe(true);
    const overlay = PNG.sync.read(Buffer.from(files[entry.incoming.overlay]!));
    let visible = 0;
    for (let p = 3; p < overlay.data.length; p += 4)
      if (overlay.data[p]! > 0) visible++;
    expect(visible).toBeGreaterThan(1000);
  }
  expect(JSON.parse(Buffer.from(files['project.json']!).toString())).toEqual(
    project,
  );
  await writeFile(
    'test-results/history/parity.json',
    JSON.stringify({ comparisons, probe }, null, 2),
  );
});
