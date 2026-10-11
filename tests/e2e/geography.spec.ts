import { test, expect, type Page } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';
import {
  createDemo,
  type RenderJob,
} from '../../packages/project-schema/src/index';
const exec = promisify(execFile);
async function open(page: Page) {
  await page
    .getByRole('button', { name: 'Places & road routes', exact: true })
    .click();
}
async function find(page: Page, query: string, label: string) {
  await page.getByLabel('Place name', { exact: true }).fill(query);
  await page
    .getByRole('button', { name: 'Search places', exact: true })
    .click();
  await page.getByRole('button', { name: label, exact: true }).click();
}
async function seek(page: Page, time: number) {
  await page.evaluate((time) => window.studio!.seek(time), time);
  await page.evaluate(() => window.studio!.renderer.ready());
}
test('real offline city search reviews source coordinates, adds markers, undoes and persists; missing provider leaves projects unchanged', async ({
  page,
  request,
}) => {
  await request.delete('/api/geography/configure');
  await page.goto('/');
  await page.waitForFunction(() => !!window.studio);
  await open(page);
  await find(page, 'Hà Nội', 'Hanoi, Vietnam');
  await expect(page.locator('.source-review')).toContainText(
    '105.848068, 21.035273',
  );
  const before = await page.evaluate(() => window.studio!.getProject());
  await page
    .getByRole('button', { name: 'Add reviewed marker', exact: true })
    .click();
  const applied = await page.evaluate(() => window.studio!.getProject());
  expect(applied.scenes[0]!.layers.at(-1)).toMatchObject({
    type: 'marker',
    anchor: { type: 'map', coordinates: [105.848068, 21.035273] },
    geographySource: { provider: 'natural-earth', sourceId: 'ne-1159151251' },
  });
  await page
    .getByRole('button', { name: 'Use as route waypoint', exact: true })
    .click();
  await find(page, 'Bangkok', 'Bangkok, Thailand');
  await page
    .getByRole('button', { name: 'Use as route waypoint', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Calculate road route', exact: true })
    .click();
  await expect(page.getByRole('alert')).toContainText(
    'Configure Openrouteservice',
  );
  expect(await page.evaluate(() => window.studio!.getProject())).toEqual(
    applied,
  );
  await page.getByRole('button', { name: 'Close geography' }).click();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  expect(await page.evaluate(() => window.studio!.getProject())).toEqual(
    before,
  );
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(page.locator('.map-credit')).toContainText(
    'Natural Earth places',
  );
  await page.waitForTimeout(800);
  await page.reload();
  await page.waitForFunction(() => !!window.studio);
  expect(await page.evaluate(() => window.studio!.getProject())).toEqual(
    applied,
  );
});

// Protocol fixture for UI/renderer verification, explicitly not a live provider claim.
const fixture = {
  coordinates: [
    [105.848068, 21.035273],
    [106.2, 20.8],
    [106.1, 20.4],
    [106.6, 20.2],
  ],
  source: {
    provider: 'openrouteservice',
    kind: 'road-route',
    sourceId: 'synthetic-contract-fixture',
    source: 'https://openrouteservice.org/',
    license: 'ODbL-1.0',
    credit:
      'openrouteservice · © OpenStreetMap contributors · openstreetmap.org/copyright',
    retrievedAt: '2026-10-11T00:00:00.000Z',
    datasetVersion: 'SYNTHETIC TEST FIXTURE — NOT ROAD DATA',
    sha256: 'a'.repeat(64),
    profile: 'driving-car',
    distanceMeters: 150000,
  },
};

test('reviewed route contract fixture uses actual PNG/MP4 evaluator/render pipeline and retains attribution; invalid responses preserve project', async ({
  page,
  request,
}) => {
  test.setTimeout(150000);
  await page.setViewportSize({ width: 2200, height: 1400 });
  await page.goto('/');
  await page.waitForFunction(() => !!window.studio);
  const demo = createDemo();
  demo.durationSeconds = 2;
  demo.scenes[0]!.durationSeconds = 2;
  demo.scenes[0]!.layers = [];
  demo.scenes[0]!.camera.keyframes = [
    {
      time: 0,
      value: { lng: 106, lat: 21, zoom: 7, bearing: 0, pitch: 0 },
      easing: 'linear',
    },
  ];
  await page.getByLabel('Import project JSON').setInputFiles({
    name: 'provider-contract-fixture.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(demo)),
  });
  await open(page);
  await find(page, 'Hanoi', 'Hanoi, Vietnam');
  await page.getByRole('button', { name: 'Use as route waypoint' }).click();
  await find(page, 'Bangkok', 'Bangkok, Thailand');
  await page.getByRole('button', { name: 'Use as route waypoint' }).click();
  await page.route('**/api/geography/route', (route) =>
    route.fulfill({ json: fixture }),
  );
  await page.getByRole('button', { name: 'Calculate road route' }).click();
  await expect(page.locator('.source-review').last()).toContainText(
    'SYNTHETIC TEST FIXTURE',
  );
  await page.getByRole('button', { name: 'Add reviewed road route' }).click();
  const project = await page.evaluate(() => window.studio!.getProject());
  expect(project.scenes[0]!.layers[0]).toMatchObject({
    type: 'route',
    coordinates: fixture.coordinates,
    geographySource: fixture.source,
  });
  await page.unroute('**/api/geography/route');
  await page.route('**/api/geography/route', (route) =>
    route.fulfill({
      json: {
        ...fixture,
        coordinates: [
          [999, 0],
          [0, 0],
        ],
      },
    }),
  );
  await page.getByRole('button', { name: 'Calculate road route' }).click();
  await expect(page.getByRole('alert')).toContainText('Invalid route response');
  expect(await page.evaluate(() => window.studio!.getProject())).toEqual(
    project,
  );
  await page.getByRole('button', { name: 'Close geography' }).click();
  await page.unroute('**/api/geography/route');
  await mkdir('test-results/geography', { recursive: true });
  const job = (await (
    await request.post('/api/jobs', { data: { project, format: 'mp4' } })
  ).json()) as RenderJob;
  await expect
    .poll(
      async () => {
        const j = (await (
          await request.get(`/api/jobs/${job.id}`)
        ).json()) as RenderJob;
        if (j.state === 'failed') throw new Error(j.error);
        return j.state;
      },
      { timeout: 100000, intervals: [1000] },
    )
    .toBe('completed');
  const output = resolve('test-results/geography/contract-fixture.mp4');
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
    resolve('test-results/geography/decoded-%02d.png'),
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
    await expect(page.locator('.map-credit')).toContainText(
      'openstreetmap.org/copyright',
    );
    const preview = PNG.sync.read(
        await page
          .getByTestId('map-surface')
          .screenshot({ path: `test-results/geography/preview-${frame}.png` }),
      ),
      decoded = PNG.sync.read(
        await readFile(
          `test-results/geography/decoded-${String(index + 1).padStart(2, '0')}.png`,
        ),
      );
    let difference = 0;
    for (let p = 0; p < preview.data.length; p += 4)
      for (let c = 0; c < 3; c++)
        difference += Math.abs(preview.data[p + c]! - decoded.data[p + c]!);
    const mean = difference / (preview.width * preview.height * 3);
    expect(mean).toBeLessThan(3);
    comparisons.push({ frame, meanAbsoluteChannelError: mean });
    await seek(page, 1.9);
    await seek(page, frame / 30);
    expect(
      PNG.sync
        .read(await page.getByTestId('map-surface').screenshot())
        .data.equals(preview.data),
    ).toBe(true);
  }
  const png = (await (
    await request.post('/api/jobs', {
      data: { project, format: 'png', frameIndex: 30 },
    })
  ).json()) as RenderJob;
  await expect
    .poll(
      async () =>
        ((await (await request.get(`/api/jobs/${png.id}`)).json()) as RenderJob)
          .state,
      { timeout: 45000 },
    )
    .toBe('completed');
  const bytes = await (
    await request.get(`/api/jobs/${png.id}/download`)
  ).body();
  await writeFile('test-results/geography/frame.png', bytes);
  await seek(page, 1);
  expect(
    PNG.sync
      .read(bytes)
      .data.equals(
        PNG.sync.read(await page.getByTestId('map-surface').screenshot()).data,
      ),
  ).toBe(true);
  await writeFile(
    'test-results/geography/parity.json',
    JSON.stringify(
      {
        fixture:
          'synthetic protocol geometry; NOT live road-provider validation',
        comparisons,
        png: { frame: 30, identical: true },
      },
      null,
      2,
    ),
  );
  await writeFile(
    'test-results/geography/ffprobe.json',
    JSON.stringify(probe, null, 2),
  );
});
