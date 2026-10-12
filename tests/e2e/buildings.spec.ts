import {
  test,
  expect,
  type Page,
  type APIRequestContext,
} from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';
import {
  type RenderJob,
  type Project,
  layerSchema,
} from '../../packages/project-schema/src/index';
const exec = promisify(execFile);
test('local declared feet GeoJSON is reviewed through the UI and renders an actual courtyard hole without altering source vertices', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForFunction(() => !!window.studio);
  const geometry = {
    type: 'Polygon',
    coordinates: [
      [
        [10, 20],
        [10.001, 20],
        [10.001, 20.001],
        [10, 20.001],
        [10, 20],
      ],
      [
        [10.00025, 20.00025],
        [10.00075, 20.00025],
        [10.00075, 20.00075],
        [10.00025, 20.00075],
        [10.00025, 20.00025],
      ],
    ],
  };
  const input = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        id: 'authored-courtyard',
        geometry,
        properties: { measuredFeet: 100 },
      },
    ],
  };
  await page
    .getByRole('button', { name: '3D buildings · GeoJSON', exact: true })
    .click();
  await page.getByLabel('Import building GeoJSON').setInputFiles({
    name: 'authored-courtyard.geojson',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(input)),
  });
  await page.getByLabel('Building height field').selectOption('measuredFeet');
  await page.getByLabel('Building height units').selectOption('feet');
  for (const [key, value] of Object.entries({
    author: 'AnimateMap test contributors',
    license: 'CC0-1.0',
    licenseURL: 'https://creativecommons.org/publicdomain/zero/1.0/',
    credit: 'Authored courtyard test · CC0',
    uncertainty: 'Synthetic unit/geometry fixture; not a surveyed building',
  }))
    await page
      .getByLabel(`Building source ${key}`, { exact: true })
      .fill(value);
  await page.getByLabel('Confirm height above grade').check();
  await page.getByRole('button', { name: 'Validate building import' }).click();
  await expect(page.getByRole('dialog')).toContainText('30.48–30.48 metres');
  await page.getByRole('button', { name: 'Add reviewed buildings' }).click();
  await page.getByLabel('Camera pitch').fill('0');
  await page.getByRole('button', { name: 'Add camera keyframe · K' }).click();
  await seek(page, 0);
  const project = await page.evaluate(() => window.studio!.getProject());
  const dataset = project.buildingDatasets[0]!;
  expect(dataset.heightUnit).toBe('feet');
  expect(dataset.records[0]!.height).toBe(100);
  expect(dataset.records[0]!.geometry).toEqual(geometry);
  const layer = project.scenes[0]!.layers.at(-1)!;
  const hits = await page.evaluate((id) => {
    const map = window.studio!.renderer.map;
    const options = { layers: [`ams-${id}-extrusion`] };
    return {
      hole: map.queryRenderedFeatures(map.project([10.0005, 20.0005]), options)
        .length,
      solid: map.queryRenderedFeatures(map.project([10.0001, 20.0001]), options)
        .length,
    };
  }, layer.id);
  expect(hits.hole).toBe(0);
  expect(hits.solid).toBeGreaterThan(0);
  await expect(page.locator('.map-credit')).toContainText(
    'Authored courtyard test',
  );
});
async function seek(page: Page, t: number) {
  await page.evaluate((time) => window.studio!.seek(time), t);
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
async function load(page: Page, project: Project) {
  await page.getByLabel('Import project JSON').setInputFiles({
    name: 'buildings.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(project)),
  });
  await expect
    .poll(() => page.evaluate(() => window.studio!.getProject()))
    .toEqual(project);
  await page.evaluate(() => window.studio!.renderer.ready());
}
test('reviewed measured Vancouver extrusions animate through real UI, history and persistence; actual H264/PNG match deterministic native preview', async ({
  page,
  request,
}) => {
  test.setTimeout(360000);
  await page.setViewportSize({ width: 2200, height: 1400 });
  await page.goto('/');
  await page.waitForFunction(() => !!window.studio);
  await page.getByRole('button', { name: 'Project ▾' }).click();
  await page.getByRole('button', { name: 'New project', exact: true }).click();
  await page.getByRole('button', { name: 'Project ▾' }).click();
  await page.getByLabel('Scene duration', { exact: true }).fill('2');
  const before = await page.evaluate(() => window.studio!.getProject());
  await page
    .getByRole('button', { name: '3D buildings · GeoJSON', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Review Vancouver 2009 sample' })
    .click();
  await expect(page.getByRole('dialog')).toContainText('100 elements');
  await expect(page.getByRole('dialog')).toContainText(
    'Generalized approximate 2009',
  );
  await expect(
    page.getByRole('button', { name: 'Validate building import' }),
  ).toBeDisabled();
  await page.getByLabel('Confirm height above grade').check();
  await page.getByRole('button', { name: 'Validate building import' }).click();
  await expect(page.getByRole('dialog')).toContainText(
    'Validated 100 footprints',
  );
  await page.getByRole('button', { name: 'Add reviewed buildings' }).click();
  await page.evaluate(() => window.studio!.renderer.ready());
  const imported = await page.evaluate(() => window.studio!.getProject());
  const layer = imported.scenes[0]!.layers[0]!;
  expect(layer.type).toBe('buildings');
  const status = await page.evaluate(
    (id) => ({
      type: window.studio!.renderer.map.getLayer(`ams-${id}-extrusion`)?.type,
      width: window.studio!.renderer.map.getContainer().clientWidth,
    }),
    layer.id,
  );
  expect(status).toEqual({ type: 'fill-extrusion', width: 1920 });
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  expect(await page.evaluate(() => window.studio!.getProject())).toEqual(
    before,
  );
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  expect(await page.evaluate(() => window.studio!.getProject())).toEqual(
    imported,
  );
  await page.getByLabel('Layer color').fill('#ffb866');
  await page.getByLabel('Building vertical gradient').uncheck();
  await page.getByLabel('Building vertical gradient').check();
  await page.getByRole('button', { name: 'Animate building growth' }).click();
  await page.getByLabel('Keyframe property').selectOption('heightScale');
  await page
    .getByRole('button', {
      name: `${layer.name} heightScale keyframe 1`,
      exact: true,
    })
    .click();
  await page.getByLabel('Keyframe time').fill('1.9');
  await page.getByLabel('Keyframe easing').selectOption('linear');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await page.getByLabel('Camera bearing').fill('35');
  await page.getByRole('button', { name: 'Add camera keyframe · K' }).click();
  await page.getByLabel('Map style').selectOption('light');
  await page.evaluate(() => window.studio!.renderer.ready());
  expect(
    await page.evaluate(
      (id) => window.studio!.renderer.map.getLayer(`ams-${id}-extrusion`)?.type,
      layer.id,
    ),
  ).toBe('fill-extrusion');
  await page.getByLabel('Map style').selectOption('dark');
  const project = await page.evaluate(() => window.studio!.getProject());
  await page.waitForTimeout(800);
  await page.reload();
  await page.waitForFunction(() => !!window.studio);
  expect(await page.evaluate(() => window.studio!.getProject())).toEqual(
    project,
  );
  await mkdir('test-results/buildings', { recursive: true });
  const output = resolve('test-results/buildings/vancouver.mp4');
  await writeFile(output, await job(request, { project, format: 'mp4' }));
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
    width: 1920,
    height: 1080,
    pix_fmt: 'yuv420p',
  });
  expect(Number(probe.streams[0].nb_read_frames)).toBe(60);
  await exec('ffmpeg', [
    '-y',
    '-i',
    output,
    '-vf',
    'select=eq(n\\,0)+eq(n\\,30)+eq(n\\,59)',
    '-fps_mode',
    'vfr',
    resolve('test-results/buildings/decoded-%02d.png'),
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
  const pictures: Buffer[] = [];
  for (const [index, frame] of [0, 30, 59].entries()) {
    await seek(page, frame / 30);
    await expect(page.locator('.map-credit')).toContainText(
      'Open Government Licence',
    );
    await expect(page.locator('.map-credit')).toContainText('2009 survey');
    const preview = PNG.sync.read(
      await page
        .getByTestId('map-surface')
        .screenshot({ path: `test-results/buildings/preview-${frame}.png` }),
    );
    pictures.push(preview.data);
    const decoded = PNG.sync.read(
      await readFile(
        `test-results/buildings/decoded-${String(index + 1).padStart(2, '0')}.png`,
      ),
    );
    expect([preview.width, preview.height]).toEqual([1920, 1080]);
    let difference = 0;
    for (let p = 0; p < preview.data.length; p += 4)
      for (let c = 0; c < 3; c++)
        difference += Math.abs(preview.data[p + c]! - decoded.data[p + c]!);
    const mean = difference / (preview.width * preview.height * 3);
    expect(mean).toBeLessThan(3);
    comparisons.push({ frame, meanAbsoluteChannelError: mean });
    await seek(page, 1.7);
    await seek(page, frame / 30);
    expect(
      PNG.sync
        .read(await page.getByTestId('map-surface').screenshot())
        .data.equals(preview.data),
    ).toBe(true);
  }
  expect(pictures[0]!.equals(pictures[1]!)).toBe(false);
  const png = await job(request, { project, format: 'png', frameIndex: 30 });
  await writeFile('test-results/buildings/frame.png', png);
  expect(PNG.sync.read(png).data.equals(pictures[1]!)).toBe(true);
  await writeFile(
    'test-results/buildings/project.json',
    JSON.stringify(project, null, 2),
  );
  await writeFile(
    'test-results/buildings/ffprobe.json',
    JSON.stringify(probe, null, 2),
  );
  await writeFile(
    'test-results/buildings/parity.json',
    JSON.stringify(
      {
        source: 'City of Vancouver actual 2009 LiDAR high-rise sample',
        footprints: 100,
        heightField: 'hgt_agl',
        heightUnits: 'metres above grade',
        nativePreviewWidth: 1920,
        comparisons,
        repeatedSeeksIdentical: true,
        growthChangesActualPixels: true,
        png: { frame: 30, identical: true },
      },
      null,
      2,
    ),
  );
});
test('missing/tampered/local invalid building sources preserve project; source references and same-ID extrusion/line replacement remain safe', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForFunction(() => !!window.studio);
  const before = await page.evaluate(() => window.studio!.getProject());
  await page
    .getByRole('button', { name: '3D buildings · GeoJSON', exact: true })
    .click();
  await page.route('**/data/buildings/vancouver-2009.geojson', (r) =>
    r.fulfill({ status: 503, body: 'Unavailable source' }),
  );
  await page
    .getByRole('button', { name: 'Review Vancouver 2009 sample' })
    .click();
  await expect(page.getByRole('alert')).toContainText('503');
  expect(await page.evaluate(() => window.studio!.getProject())).toEqual(
    before,
  );
  await page.unrouteAll();
  const raw = await readFile(
    'apps/web/public/data/buildings/vancouver-2009.geojson',
  );
  await page.route('**/data/buildings/vancouver-2009.geojson', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: Buffer.concat([raw, Buffer.from(' ')]),
    }),
  );
  await page
    .getByRole('button', { name: 'Review Vancouver 2009 sample' })
    .click();
  await page.getByLabel('Confirm height above grade').check();
  await page.getByRole('button', { name: 'Validate building import' }).click();
  await expect(page.getByRole('alert')).toContainText('checksum mismatch');
  expect(await page.evaluate(() => window.studio!.getProject())).toEqual(
    before,
  );
  await page.unrouteAll();
  await page
    .getByRole('button', { name: 'Review Vancouver 2009 sample' })
    .click();
  await page.getByLabel('Confirm height above grade').check();
  await page.getByRole('button', { name: 'Validate building import' }).click();
  await expect(
    page.getByRole('button', { name: 'Add reviewed buildings' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Add reviewed buildings' }).click();
  await page.evaluate(() => window.studio!.renderer.ready());
  const buildings = await page.evaluate(() => window.studio!.getProject()),
    l = buildings.scenes[0]!.layers.at(-1)!;
  await page.evaluate((id) => {
    const source = window.studio!.renderer.map.getSource(
      `ams-${id}`,
    )! as unknown as { setData: (data: unknown) => unknown; updates: number };
    const original = source.setData.bind(source);
    source.updates = 0;
    source.setData = (data) => {
      source.updates++;
      return original(data);
    };
  }, l.id);
  for (const t of [1, 3, 1]) await seek(page, t);
  expect(
    await page.evaluate(
      (id) =>
        (
          window.studio!.renderer.map.getSource(`ams-${id}`) as unknown as {
            updates: number;
          }
        ).updates,
      l.id,
    ),
  ).toBe(0);
  await page
    .getByRole('button', { name: '3D buildings · GeoJSON', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: `Delete unused buildings · ${l.name}` }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Close building library' }).click();
  const route = structuredClone(buildings);
  route.scenes[0]!.layers[route.scenes[0]!.layers.length - 1] =
    layerSchema.parse({
      id: l.id,
      name: 'Type replacement',
      type: 'route',
      timeRange: { start: 0, end: 12 },
      coordinates: [
        [-123.13, 49.28],
        [-123.12, 49.29],
      ],
      style: { color: '#ffffff', width: 4 },
    });
  await load(page, route);
  expect(
    await page.evaluate(
      (id) => !!window.studio!.renderer.map.getLayer(`ams-${id}-extrusion`),
      l.id,
    ),
  ).toBe(false);
  await load(page, buildings);
  expect(
    await page.evaluate(
      (id) => window.studio!.renderer.map.getLayer(`ams-${id}-extrusion`)?.type,
      l.id,
    ),
  ).toBe('fill-extrusion');
  await page
    .getByRole('button', { name: '3D buildings · GeoJSON', exact: true })
    .click();
  const input = JSON.parse(raw.toString());
  input.features[0].properties.hgt_agl = null;
  await page.getByLabel('Import building GeoJSON').setInputFiles({
    name: 'missing-height.geojson',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(input)),
  });
  await page.getByLabel('Building ID field').selectOption('id');
  await page.getByLabel('Building height field').selectOption('hgt_agl');
  for (const [key, value] of Object.entries({
    author: 'Authored test',
    license: 'CC0-1.0',
    licenseURL: 'https://creativecommons.org/publicdomain/zero/1.0/',
    credit: 'Authored invalid fixture',
    uncertainty: 'Synthetic input mutation for rejection test',
  }))
    await page
      .getByLabel(`Building source ${key}`, { exact: true })
      .fill(value);
  await page.getByLabel('Confirm height above grade').check();
  await page.getByRole('button', { name: 'Validate building import' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Add reviewed buildings' }),
  ).toHaveCount(0);
  expect(await page.evaluate(() => window.studio!.getProject())).toEqual(
    buildings,
  );
});
