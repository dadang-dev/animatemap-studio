import { test, expect, type Page } from '@playwright/test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';
import {
  createDemo,
  layerSchema,
  type Project,
  type RenderJob,
} from '../../packages/project-schema/src/index';
const exec = promisify(execFile);
function fixture(): Project {
  const project = createDemo();
  project.id = 'label-collision-project';
  project.name = 'Nhãn · Việt Nam';
  project.durationSeconds = 1;
  const scene = project.scenes[0]!;
  scene.durationSeconds = 1;
  scene.camera.keyframes = [
    {
      time: 0,
      value: { lng: 105.85, lat: 21.03, zoom: 5, bearing: 25, pitch: 40 },
      easing: 'linear',
    },
  ];
  scene.layers = [];
  for (const [id, priority] of [
    ['main-label', 90],
    ['moving-label', 50],
  ] as const) {
    scene.layers.push(
      layerSchema.parse({
        id,
        name: id === 'main-label' ? 'Primary text' : 'Moving text',
        type: 'text',
        text: id === 'main-label' ? 'Hà Nội\nViệt Nam' : 'Hẹn gặp lại',
        anchor: { type: 'screen', x: 0.1, y: 0.1 },
        collision: { mode: 'hide', priority },
        timeRange: { start: 0, end: 1 },
        transform: { scale: 1.1, rotation: 15, offsetX: 0, offsetY: 0 },
        style: {
          color: '#ffffff',
          fontSize: 48,
          fontWeight: 'bold',
          align: 'left',
        },
        tracks:
          id === 'moving-label'
            ? {
                offsetX: [
                  { time: 0, value: 0 },
                  { time: 0.8, value: 500 },
                  { time: 1, value: 0 },
                ],
              }
            : {},
      }),
    );
  }
  for (const [id, priority] of [
    ['marker-main', 80],
    ['marker-hidden', 50],
  ] as const) {
    scene.layers.push(
      layerSchema.parse({
        id,
        name: id === 'marker-main' ? 'Primary pin' : 'Secondary pin',
        type: 'marker',
        label: id === 'marker-main' ? 'Thủ đô · Hà Nội' : 'Nhãn phụ · Hà Nội',
        anchor: { type: 'map', coordinates: [105.85, 21.03] },
        collision: { mode: 'hide', priority },
        timeRange: { start: 0, end: 1 },
        style: { color: '#ffd087', size: 20, icon: 'pin' },
      }),
    );
  }
  return project;
}
async function load(page: Page, project = fixture()) {
  await page.goto('/');
  await page.waitForFunction(() => !!window.studio);
  await page.locator('input[accept=".json,application/json"]').setInputFiles({
    name: 'labels.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(project)),
  });
  await expect
    .poll(() => page.evaluate(() => window.studio!.getProject().id))
    .toBe(project.id);
  await page.evaluate(() => window.studio!.renderer.ready());
}
async function seek(page: Page, time: number) {
  await page.evaluate((time) => window.studio!.seek(time), time);
  await page.evaluate(() => window.studio!.renderer.ready());
}
async function decisions(page: Page) {
  return page.locator('.composition [data-label-id]').evaluateAll((elements) =>
    elements
      .map((element) => ({
        id: (element as HTMLElement).dataset.labelId,
        hidden: (element as HTMLElement).dataset.labelHidden,
      }))
      .sort((a, b) => a.id!.localeCompare(b.id!)),
  );
}
test('label priority, history, locking, camera and resize preserve deterministic decisions and pins', async ({
  page,
  request,
}) => {
  await load(page);
  const initial = await decisions(page);
  await expect(page.locator('[data-label-id="moving-label"]')).toHaveAttribute(
    'data-label-hidden',
    'true',
  );
  await expect(page.locator('[data-label-id="marker-hidden"]')).toHaveCSS(
    'visibility',
    'hidden',
  );
  await expect(
    page.locator('[data-layer-id="marker-hidden"] svg'),
  ).toBeVisible();
  await page
    .locator('.layer-list')
    .getByRole('button', { name: 'Moving text', exact: true })
    .click();
  await page.getByLabel('Label priority', { exact: true }).fill('95');
  await expect(page.locator('[data-label-id="main-label"]')).toHaveAttribute(
    'data-label-hidden',
    'true',
  );
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  expect(await decisions(page)).toEqual(initial);
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await page
    .locator('.layer-list')
    .getByRole('button', { name: 'Primary text', exact: true })
    .click();
  await page.getByLabel('Label collision').selectOption('allow');
  await expect(page.locator('[data-label-id="moving-label"]')).toHaveAttribute(
    'data-label-hidden',
    'true',
  );
  await page.getByLabel('Toggle lock Primary text', { exact: true }).click();
  await expect(page.getByLabel('Label collision')).toBeDisabled();
  await expect(page.getByLabel('Label priority')).toBeDisabled();
  await page.getByLabel('Toggle lock Primary text', { exact: true }).click();
  for (const time of [0.8, 0, 0.8, 0]) {
    await seek(page, time);
    await expect(
      page.locator('[data-label-id="moving-label"]'),
    ).toHaveAttribute('data-label-hidden', time === 0 ? 'true' : 'false');
  }
  const beforeResize = await decisions(page);
  await page.setViewportSize({ width: 2100, height: 1300 });
  await page.evaluate(() => window.studio!.renderer.ready());
  expect(await decisions(page)).toEqual(beforeResize);
  await page.evaluate(() =>
    window.studio!.renderer.map.jumpTo({
      center: [106.5, 21.5],
      zoom: 4,
      pitch: 55,
      bearing: -30,
    }),
  );
  await page.evaluate(() => window.studio!.renderer.ready());
  await expect(page.locator('[data-label-id="marker-hidden"]')).toHaveAttribute(
    'data-label-hidden',
    'true',
  );
  await expect(
    page.locator('[data-layer-id="marker-hidden"] svg'),
  ).toBeVisible();
  await seek(page, 0);
  const project = await page.evaluate(() => window.studio!.getProject());
  const saved = await request.post('/api/projects', { data: project });
  expect(saved.ok()).toBe(true);
  expect(
    await (await request.get(`/api/projects/${project.id}`)).json(),
  ).toEqual(project);
  const invalid = structuredClone(project);
  const label = invalid.scenes[0]!.layers.find(
    (layer) => layer.type === 'text',
  )!;
  label.collision.priority = 101;
  expect(
    (await request.post('/api/projects', { data: invalid })).status(),
  ).toBe(400);
  expect(
    await (await request.get(`/api/projects/${project.id}`)).json(),
  ).toEqual(project);
  await expect(page.getByText('Saved locally', { exact: false })).toBeVisible();
  await page.reload();
  await page.waitForFunction(() => !!window.studio);
  await page.evaluate(() => window.studio!.renderer.ready());
  expect(await page.evaluate(() => window.studio!.getProject())).toEqual(
    project,
  );
  await page.getByRole('button', { name: 'Project ▾' }).click();
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON', exact: true }).click();
  const json = await readFile((await (await downloading).path())!, 'utf8');
  expect(JSON.parse(json)).toEqual(project);
  await page.getByRole('button', { name: 'New project', exact: true }).click();
  await page.locator('input[accept=".json,application/json"]').setInputFiles({
    name: 'labels.json',
    mimeType: 'application/json',
    buffer: Buffer.from(json),
  });
  await expect
    .poll(() => page.evaluate(() => window.studio!.getProject()))
    .toEqual(project);
  await page.getByRole('button', { name: 'Close menu', exact: true }).click();
  await page.screenshot({ path: 'test-results/labels-editor.png' });
});
test('label collision changes and crossfades export actual MP4/PNG matching repeated preview frames', async ({
  page,
  request,
}) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 2200, height: 1400 });
  await load(page);
  await page
    .getByRole('button', { name: 'Duplicate scene', exact: true })
    .click();
  await page
    .getByLabel('Scene transition', { exact: true })
    .selectOption('crossfade');
  await page.getByLabel('Crossfade duration', { exact: true }).fill('0.5');
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
  await mkdir('test-results/labels', { recursive: true });
  const output = resolve('test-results/labels/collision.mp4');
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
    'select=eq(n\\,0)+eq(n\\,15)+eq(n\\,29)+eq(n\\,37)+eq(n\\,59)',
    '-fps_mode',
    'vfr',
    resolve('test-results/labels/decoded-%02d.png'),
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
  for (const [index, frame] of [0, 15, 29, 37, 59].entries()) {
    await seek(page, frame / 30);
    const bytes = await page
      .getByTestId('map-surface')
      .screenshot({ path: `test-results/labels/preview-${frame}.png` });
    const expected = PNG.sync.read(bytes);
    const decoded = PNG.sync.read(
      await readFile(
        `test-results/labels/decoded-${String(index + 1).padStart(2, '0')}.png`,
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
    await seek(page, 1.7);
    await seek(page, frame / 30);
    expect(
      PNG.sync
        .read(await page.getByTestId('map-surface').screenshot())
        .data.equals(expected.data),
    ).toBe(true);
  }
  const png = (await (
    await request.post('/api/jobs', {
      data: { project, format: 'png', frameIndex: 37 },
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
  const pngBytes = await (
    await request.get(`/api/jobs/${png.id}/download`)
  ).body();
  await seek(page, 37 / 30);
  expect(
    PNG.sync
      .read(pngBytes)
      .data.equals(
        PNG.sync.read(await page.getByTestId('map-surface').screenshot()).data,
      ),
  ).toBe(true);
  await writeFile('test-results/labels/frame.png', pngBytes);
  await writeFile(
    'test-results/labels/parity.json',
    JSON.stringify({ comparisons }, null, 2),
  );
  await writeFile(
    'test-results/labels/ffprobe.json',
    JSON.stringify(probe, null, 2),
  );
});
