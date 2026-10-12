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
  createDemo,
  type RenderJob,
} from '../../packages/project-schema/src/index';
const exec = promisify(execFile);
async function seek(page: Page, time: number) {
  await page.evaluate((t) => window.studio!.seek(t), time);
  await page.evaluate(() => window.studio!.renderer.ready());
}
async function job(request: APIRequestContext, data: unknown) {
  const response = await request.post('/api/jobs', { data });
  expect(response.ok()).toBe(true);
  const queued = (await response.json()) as RenderJob;
  await expect
    .poll(
      async () => {
        const current = (await (
          await request.get(`/api/jobs/${queued.id}`)
        ).json()) as RenderJob;
        if (current.state === 'failed') throw new Error(current.error);
        return current.state;
      },
      { timeout: 300000, intervals: [1000] },
    )
    .toBe('completed');
  return {
    job: queued,
    bytes: await (await request.get(`/api/jobs/${queued.id}/download`)).body(),
  };
}
test('real licensed terrain controls/history/native preview and ground anchors persist; actual MP4/PNG match deterministic seeking', async ({
  page,
  request,
}) => {
  test.setTimeout(480000);
  await page.setViewportSize({ width: 2200, height: 1400 });
  await page.goto('/');
  await page.waitForFunction(() => !!window.studio, undefined, {
    timeout: 20000,
  });
  await page.getByLabel('Scene duration', { exact: true }).fill('2');
  const original = await page.evaluate(() => window.studio!.getProject());
  await page
    .getByRole('button', { name: 'Offline 3D terrain', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toContainText(
    'Nine verified original',
  );
  await page
    .getByRole('button', { name: 'Enable terrain and replace camera keys' })
    .click();
  await page.getByLabel('Terrain exaggeration').fill('1.2');
  await page.getByLabel('Terrain hillshade').uncheck();
  await page.getByLabel('Terrain hillshade').check();
  await page.getByRole('button', { name: 'Close terrain settings' }).click();
  await page.evaluate(() => window.studio!.renderer.ready());
  const configured = await page.evaluate(() => window.studio!.getProject());
  expect(configured.map.terrain).toEqual({
    packId: 'sapa-2026-10-12',
    exaggeration: 1.2,
    hillshade: true,
  });
  expect(configured.scenes[0]!.camera.keyframes).toHaveLength(1);
  const native = await page.evaluate(() => ({
    width: window.studio!.renderer.map.getContainer().clientWidth,
    terrain: window.studio!.renderer.map.getTerrain(),
    elevation: window.studio!.renderer.map.queryTerrainElevation([103.8, 22.3]),
  }));
  expect(native.width).toBe(1920);
  expect(native.terrain?.exaggeration).toBe(1.2);
  expect(native.elevation!).toBeGreaterThan(2000);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  expect(await page.evaluate(() => window.studio!.getProject())).toEqual(
    configured,
  );
  await page.getByLabel('Map style').selectOption('light');
  await page.evaluate(() => window.studio!.renderer.ready());
  expect(
    await page.evaluate(
      () => window.studio!.renderer.map.getTerrain()?.exaggeration,
    ),
  ).toBe(1.2);
  await page.getByLabel('Map style').selectOption('dark');
  await page.getByRole('button', { name: 'Add marker', exact: true }).click();
  const box = (await page.getByTestId('map-surface').boundingBox())!;
  await page
    .getByTestId('map-surface')
    .click({ position: { x: box.width * 0.5, y: box.height * 0.5 } });
  await page.getByLabel('Marker label').fill('Sa Pa · Địa hình');
  await page.getByLabel('Playhead').fill('1.9');
  await page.getByLabel('Camera lng').fill('103.83');
  await page.getByLabel('Camera lat').fill('22.32');
  await page.getByLabel('Camera bearing').fill('35');
  await page.getByLabel('Camera pitch').fill('50');
  await page.getByRole('button', { name: 'Add camera keyframe · K' }).click();
  const project = await page.evaluate(() => window.studio!.getProject());
  await page.waitForTimeout(800);
  await page.reload();
  await page.waitForFunction(() => !!window.studio);
  expect(await page.evaluate(() => window.studio!.getProject())).toEqual(
    project,
  );
  expect(original.map.terrain).toBeNull();
  await mkdir('test-results/terrain', { recursive: true });
  const video = await job(request, { project, format: 'mp4' });
  const output = resolve('test-results/terrain/sapa.mp4');
  await writeFile(output, video.bytes);
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
    resolve('test-results/terrain/decoded-%02d.png'),
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
    await expect(page.locator('.map-credit')).toContainText('USGS');
    const preview = PNG.sync.read(
      await page
        .getByTestId('map-surface')
        .screenshot({ path: `test-results/terrain/preview-${frame}.png` }),
    );
    const decoded = PNG.sync.read(
      await readFile(
        `test-results/terrain/decoded-${String(index + 1).padStart(2, '0')}.png`,
      ),
    );
    let difference = 0;
    for (let p = 0; p < preview.data.length; p += 4)
      for (let c = 0; c < 3; c++)
        difference += Math.abs(preview.data[p + c]! - decoded.data[p + c]!);
    const mean = difference / (preview.width * preview.height * 3);
    expect(mean).toBeLessThan(3);
    comparisons.push({ frame, meanAbsoluteChannelError: mean });
    await seek(page, 1.8);
    await seek(page, frame / 30);
    expect(
      PNG.sync
        .read(await page.getByTestId('map-surface').screenshot())
        .data.equals(preview.data),
    ).toBe(true);
    const aligned = await page.evaluate(() => {
      const state = window.studio!.getProject(),
        marker = state.scenes[0]!.layers.at(-1)!;
      if (marker.type !== 'marker' || marker.anchor.type !== 'map')
        throw new Error('Expected created ground marker');
      const point = window.studio!.renderer.map.project(
        marker.anchor.coordinates,
      );
      const el = Array.from(
        document.querySelectorAll<HTMLElement>('[data-layer-id]'),
      ).find((el) => el.dataset.layerId === marker.id && el.style.left)!;
      return Math.max(
        Math.abs(point.x - parseFloat(el.style.left)),
        Math.abs(point.y - parseFloat(el.style.top)),
      );
    });
    expect(aligned).toBeLessThan(0.01);
  }
  const png = await job(request, { project, format: 'png', frameIndex: 30 });
  await writeFile('test-results/terrain/frame.png', png.bytes);
  await seek(page, 1);
  const preview = PNG.sync.read(
    await page.getByTestId('map-surface').screenshot(),
  );
  expect(PNG.sync.read(png.bytes).data.equals(preview.data)).toBe(true);
  const flat = structuredClone(project);
  flat.map.terrain = null;
  const flatPng = await job(request, {
    project: flat,
    format: 'png',
    frameIndex: 30,
  });
  await writeFile('test-results/terrain/flat.png', flatPng.bytes);
  expect(PNG.sync.read(flatPng.bytes).data.equals(preview.data)).toBe(false);
  await writeFile(
    'test-results/terrain/parity.json',
    JSON.stringify(
      {
        source: 'Nine original SHA-verified Mapzen/Tilezen Terrarium tiles',
        nativePreviewWidth: native.width,
        exaggeratedElevationAtProbe: native.elevation,
        comparisons,
        repeatedSeeksIdentical: true,
        groundAnchorsAligned: true,
        png: { frame: 30, identical: true },
        flatDiffers: true,
      },
      null,
      2,
    ),
  );
  await writeFile(
    'test-results/terrain/ffprobe.json',
    JSON.stringify(probe, null, 2),
  );
  expect((await request.post('/api/projects', { data: project })).ok()).toBe(
    true,
  );
  const longer = structuredClone(project);
  longer.durationSeconds = 6;
  longer.scenes[0]!.durationSeconds = 6;
  const queued = (await (
    await request.post('/api/jobs', {
      data: { project: longer, format: 'mp4' },
    })
  ).json()) as RenderJob;
  await expect
    .poll(
      async () => {
        const status = (await (
          await request.get(`/api/jobs/${queued.id}`)
        ).json()) as RenderJob;
        if (status.state === 'failed') throw new Error(status.error);
        return status.state === 'rendering' && status.progress > 0;
      },
      { timeout: 60000, intervals: [200] },
    )
    .toBe(true);
  await request.post(`/api/jobs/${queued.id}/cancel`);
  expect(
    (await (await request.get(`/api/jobs/${queued.id}`)).json()).state,
  ).toBe('cancelled');
  expect((await request.get(`/api/jobs/${queued.id}/download`)).status()).toBe(
    409,
  );
  expect(
    await (await request.get(`/api/projects/${project.id}`)).json(),
  ).toEqual(project);
});
test('actual missing/corrupt DEM resources reject render readiness; saved terrain projects survive reload/recovery', async ({
  page,
  request,
}) => {
  const project = createDemo();
  project.id = 'terrain-resource-test';
  project.map.terrain = {
    packId: 'sapa-2026-10-12',
    exaggeration: 1,
    hillshade: true,
  };
  project.scenes[0]!.camera.keyframes = [
    {
      time: 0,
      value: { lng: 103.8, lat: 22.3, zoom: 10.5, bearing: 20, pitch: 55 },
      easing: 'linear',
    },
  ];
  expect((await request.post('/api/projects', { data: project })).ok()).toBe(
    true,
  );
  await page.goto('http://127.0.0.1:5174/render');
  await page.waitForFunction(() => !!window.renderStudio);
  await page.evaluate(() => document.fonts.ready);
  const path = '**/data/terrain/sapa-2026-10-12/9/403/223.png';
  await page.route(path, (r) =>
    r.fulfill({ status: 503, body: 'Intentionally unavailable DEM' }),
  );
  await expect(
    page.evaluate((p) => window.renderStudio!.load(p), project),
  ).rejects.toThrow('Terrain tile unavailable (503)');
  await page.unrouteAll({ behavior: 'wait' });
  await page.reload();
  await page.waitForFunction(() => !!window.renderStudio);
  const bytes = await readFile(
    'apps/web/public/data/terrain/sapa-2026-10-12/9/403/223.png',
  );
  bytes[100] = bytes[100]! ^ 1;
  await page.route(path, (r) =>
    r.fulfill({ status: 200, contentType: 'image/png', body: bytes }),
  );
  await expect(
    page.evaluate((p) => window.renderStudio!.load(p), project),
  ).rejects.toThrow('checksum mismatch');
  expect(
    await (await request.get(`/api/projects/${project.id}`)).json(),
  ).toEqual(project);
  await page.unrouteAll({ behavior: 'wait' });
  await page.reload();
  await page.waitForFunction(() => !!window.renderStudio);
  await page.evaluate((p) => window.renderStudio!.load(p), project);
  await page.evaluate(() => window.renderStudio!.frame(0));
  await expect(page.locator('.map-credit')).toContainText('Sa Pa coverage');
});
