import {
  test,
  expect,
  type Page,
  type APIRequestContext,
} from '@playwright/test';
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';
import {
  createDemo,
  type RenderJob,
  type Project,
} from '../../packages/project-schema/src/index';
import {
  importModelOBJ,
  authoredAircraftOBJ,
  aircraftOptions,
} from '../../apps/web/src/modelImport';
import { addModelLayer } from '../../apps/web/src/modelOperations';
const exec = promisify(execFile);
async function seek(page: Page, time: number) {
  await page.evaluate((t) => window.studio!.seek(t), time);
  await page.evaluate(() => window.studio!.renderer.ready());
}
async function load(page: Page, project: Project) {
  await page.getByLabel('Import project JSON').setInputFiles({
    name: 'models.json',
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
        const current = (await (
          await request.get(`/api/jobs/${queued.id}`)
        ).json()) as RenderJob;
        if (current.state === 'failed') throw new Error(current.error);
        return current.state;
      },
      { timeout: 240000, intervals: [1000] },
    )
    .toBe('completed');
  return (await request.get(`/api/jobs/${queued.id}/download`)).body();
}
async function native(page: Page) {
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
  await page.evaluate(() => window.studio!.renderer.ready());
}
function orangePixels(png: PNG) {
  let count = 0;
  for (let y = png.height / 2 - 150; y < png.height / 2 + 150; y++)
    for (let x = png.width / 2 - 150; x < png.width / 2 + 150; x++) {
      const p = (y * png.width + x) * 4,
        r = png.data[p]!,
        g = png.data[p + 1]!,
        b = png.data[p + 2]!;
      if (r > 75 && r > g * 1.15 && r > b * 1.5) count++;
    }
  return count;
}
test('local feet OBJ review rejects external materials; real dateline mesh survives styles/history and releases GPU resources; lost context preserves saved content', async ({
  page,
  request,
}) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 2200, height: 1400 });
  await page.goto('/');
  await page.waitForFunction(() => !!window.studio);
  const project = createDemo();
  project.id = 'dateline-model';
  project.durationSeconds = 2;
  const scene = project.scenes[0]!;
  scene.durationSeconds = 2;
  scene.layers = [];
  scene.camera.keyframes = [
    {
      time: 0,
      value: { lng: 179.999, lat: 10, zoom: 17, pitch: 55, bearing: 25 },
      easing: 'linear',
    },
  ];
  await load(page, project);
  const remoteRequests: string[] = [];
  page.on('request', (r) => {
    if (r.url().startsWith('https://example.org')) remoteRequests.push(r.url());
  });
  await page.getByRole('button', { name: '3D models · OBJ' }).click();
  async function source(obj: string) {
    await page.getByLabel('Import model OBJ').setInputFiles({
      name: 'authored-feet.obj',
      mimeType: 'text/plain',
      buffer: Buffer.from(obj),
    });
    await page.getByLabel('Model source units').selectOption('feet');
    await page.getByLabel('Model up axis').selectOption('Z');
    await page
      .getByLabel('Model source author')
      .fill('AnimateMap test fixture');
    await page.getByLabel('Model source license').fill('CC0-1.0');
    await page
      .getByLabel('Model source credit', { exact: true })
      .fill('Authored feet test mesh · CC0');
    await page.getByLabel('Confirm model units and rights').check();
    await page.getByRole('button', { name: 'Validate model import' }).click();
  }
  const obj = authoredAircraftOBJ().replace('metres', 'feet');
  await source(`mtllib https://example.org/material.mtl\n${obj}`);
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText(
    'external/material resources are unsupported',
  );
  expect(await page.evaluate(() => window.studio!.getProject())).toEqual(
    project,
  );
  expect(remoteRequests).toEqual([]);
  await source(obj);
  await expect(page.getByRole('dialog')).toContainText('64 triangles');
  await page.getByRole('button', { name: 'Add reviewed model' }).click();
  const imported = await page.evaluate(() => window.studio!.getProject()),
    model = imported.scenes[0]!.layers[0]!;
  expect(imported.modelAssets[0]!.unit).toBe('feet');
  await page.getByLabel('Model scale', { exact: true }).fill('5');
  await page.getByLabel('Model altitude above ground').fill('100');
  await page.getByRole('button', { name: 'Add model motion point' }).click();
  await page.getByLabel('Model point 2 longitude').fill('-179.999');
  await page.getByRole('button', { name: 'Animate model journey' }).click();
  await page.getByLabel('Camera follow target').selectOption(model.id);
  await page.getByLabel('Follow bearing mode').selectOption('fixed');
  await page.getByLabel('Follow bearing', { exact: true }).fill('25');
  await expect(
    page.getByRole('button', { name: 'Add camera keyframe · K' }),
  ).toBeDisabled();
  const originalManualKeys = await page.evaluate(
    () => window.studio!.getProject().scenes[0]!.camera.keyframes,
  );
  await page.evaluate(() =>
    (document.activeElement as HTMLElement | null)?.blur(),
  );
  await page.keyboard.press('k');
  expect(
    await page.evaluate(
      () => window.studio!.getProject().scenes[0]!.camera.keyframes,
    ),
  ).toEqual(originalManualKeys);
  await page.getByRole('button', { name: '3D models · OBJ' }).click();
  await expect(
    page.getByRole('button', {
      name: 'Delete unused model · authored-feet.obj',
    }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Close model library' }).click();
  await page.getByRole('button', { name: `Toggle lock ${model.name}` }).click();
  await expect(
    page.getByRole('button', { name: 'Delete selected layer' }),
  ).toBeDisabled();
  await page.getByRole('button', { name: `Toggle lock ${model.name}` }).click();
  const compositionStyle = await page
    .locator('.composition')
    .getAttribute('style');
  await native(page);
  const images: Buffer[] = [];
  for (const time of [0, 1, 1.99]) {
    await seek(page, time);
    const placement = await page.evaluate(
      (id) => window.studio!.renderer.modelPlacement(id),
      model.id,
    );
    expect(Math.abs(Math.abs(placement!.longitude) - 180)).toBeLessThan(0.002);
    const center = await page.evaluate(
      () => window.studio!.renderer.map.getCenter().lng,
    );
    expect(Math.abs(placement!.longitude - center)).toBeLessThan(0.002);
    expect(placement!.altitudeMetres).toBe(100);
    const image = PNG.sync.read(
      await page.getByTestId('map-surface').screenshot(),
    );
    expect(orangePixels(image)).toBeGreaterThan(200);
    await seek(page, 0.4);
    await seek(page, time);
    expect(
      PNG.sync
        .read(await page.getByTestId('map-surface').screenshot())
        .data.equals(image.data),
    ).toBe(true);
    images.push(image.data);
  }
  expect(images[0]!.equals(images[1]!)).toBe(false);
  await page.locator('.composition').evaluate((el, original) => {
    if (original === null) el.removeAttribute('style');
    else el.setAttribute('style', original);
  }, compositionStyle);
  await page.getByLabel('Map style', { exact: true }).selectOption('light');
  await seek(page, 1);
  expect(
    await page.evaluate(
      (id) => window.studio!.renderer.map.getLayer(`ams-${id}-model`)?.type,
      model.id,
    ),
  ).toBe('custom');
  await page
    .getByRole('button', { name: `Toggle visibility ${model.name}` })
    .click();
  expect(
    await page.evaluate(
      () => window.studio!.getProject().scenes[0]!.layers[0]!.visible,
    ),
  ).toBe(false);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await seek(page, 1);
  await page.evaluate(() => {
    const gl = window.studio!.renderer.map.getCanvas().getContext('webgl2')!,
      original = gl.deleteBuffer.bind(gl);
    const counts = window as unknown as { modelBufferDeletes: number };
    counts.modelBufferDeletes = 0;
    gl.deleteBuffer = (buffer) => {
      counts.modelBufferDeletes++;
      original(buffer);
    };
  });
  await page.getByRole('button', { name: 'Delete selected layer' }).click();
  await page.evaluate(() => window.studio!.renderer.ready());
  expect(
    await page.evaluate(
      (id) => !!window.studio!.renderer.map.getLayer(`ams-${id}-model`),
      model.id,
    ),
  ).toBe(false);
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { modelBufferDeletes: number })
          .modelBufferDeletes,
    ),
  ).toBeGreaterThan(0);
  expect(
    await page.evaluate(
      () => window.studio!.getProject().scenes[0]!.camera.follow,
    ),
  ).toBeNull();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await seek(page, 1);
  const saved = await page.evaluate(() => window.studio!.getProject());
  expect((await request.post('/api/projects', { data: saved })).ok()).toBe(
    true,
  );
  await page.waitForTimeout(800);
  const extension = await page.evaluate(() => {
    const ext = window
      .studio!.renderer.map.getCanvas()
      .getContext('webgl2')!
      .getExtension('WEBGL_lose_context');
    if (!ext) return false;
    ext.loseContext();
    return true;
  });
  expect(extension).toBe(true);
  await expect
    .poll(() =>
      page.evaluate(async () => {
        try {
          await window.studio!.renderer.ready();
          return '';
        } catch (e) {
          return String(e);
        }
      }),
    )
    .toContain('WebGL context lost');
  expect(await (await request.get(`/api/projects/${saved.id}`)).json()).toEqual(
    saved,
  );
  await page.reload();
  await page.waitForFunction(() => !!window.studio);
  await seek(page, 1);
  expect(await page.evaluate(() => window.studio!.getProject())).toEqual(saved);
  expect(
    await page.evaluate(
      (id) => window.studio!.renderer.map.getLayer(`ams-${id}-model`)?.type,
      model.id,
    ),
  ).toBe('custom');
});
test('UI creates reviewed real aircraft mesh/motion/follow, preserves history/autosave; actual H264/PNG share altitude-aware deterministic preview', async ({
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
  await page.getByRole('button', { name: '3D models · OBJ' }).click();
  await page.getByRole('button', { name: 'Review CC0 aircraft mesh' }).click();
  await expect(
    page.getByRole('button', { name: 'Validate model import' }),
  ).toBeDisabled();
  await page.getByLabel('Confirm model units and rights').check();
  await page.getByRole('button', { name: 'Validate model import' }).click();
  await expect(page.getByRole('dialog')).toContainText('64 triangles');
  await page.getByRole('button', { name: 'Add reviewed model' }).click();
  await page.evaluate(() => window.studio!.renderer.ready());
  const imported = await page.evaluate(() => window.studio!.getProject()),
    layer = imported.scenes[0]!.layers[0]!;
  expect(layer.type).toBe('model');
  expect(
    await page.evaluate(
      (id) => window.studio!.renderer.map.getLayer(`ams-${id}-model`)?.type,
      layer.id,
    ),
  ).toBe('custom');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  expect(await page.evaluate(() => window.studio!.getProject())).toEqual(
    before,
  );
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  expect(await page.evaluate(() => window.studio!.getProject())).toEqual(
    imported,
  );
  await page.getByLabel('Model scale', { exact: true }).fill('2');
  await page.getByLabel('Model altitude above ground').fill('500');
  await page.getByLabel('Model pitch', { exact: true }).fill('5');
  await page.getByLabel('Model roll', { exact: true }).fill('10');
  await page.getByRole('button', { name: 'Add model motion point' }).click();
  await page.getByLabel('Model point 2 latitude').fill('16.0006');
  await page.getByRole('button', { name: 'Animate model journey' }).click();
  await page.getByLabel('Camera follow target').selectOption(layer.id);
  await page.getByLabel('Follow bearing mode').selectOption('fixed');
  await page.getByLabel('Follow bearing', { exact: true }).fill('25');
  await page.getByLabel('Playhead').fill('0');
  await page.getByLabel('Keyframe property').selectOption('rotation');
  await page.getByRole('button', { name: 'Add keyframe', exact: true }).click();
  await page.getByLabel('Playhead').fill('1.9');
  await page.getByRole('button', { name: 'Add keyframe', exact: true }).click();
  await page
    .getByRole('button', {
      name: `${layer.name} rotation keyframe 1.9`,
      exact: true,
    })
    .click();
  await page.getByLabel('Keyframe value').fill('60');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  const project = await page.evaluate(() => window.studio!.getProject());
  await page.waitForTimeout(800);
  await page.reload();
  await page.waitForFunction(() => !!window.studio);
  expect(await page.evaluate(() => window.studio!.getProject())).toEqual(
    project,
  );
  await mkdir('test-results/models', { recursive: true });
  const output = resolve('test-results/models/aircraft.mp4');
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
    resolve('test-results/models/decoded-%02d.png'),
  ]);
  await native(page);
  const comparisons = [];
  const pictures: Buffer[] = [];
  for (const [index, frame] of [0, 30, 59].entries()) {
    await seek(page, frame / 30);
    await expect(page.locator('.map-credit')).toContainText(
      'Stylized aircraft',
    );
    expect(
      await page.evaluate(() =>
        window.studio!.renderer.map.getCenterElevation(),
      ),
    ).toBeCloseTo(500, 6);
    const preview = PNG.sync.read(
      await page
        .getByTestId('map-surface')
        .screenshot({ path: `test-results/models/preview-${frame}.png` }),
    );
    expect(orangePixels(preview)).toBeGreaterThan(200);
    pictures.push(preview.data);
    const decoded = PNG.sync.read(
      await readFile(
        `test-results/models/decoded-${String(index + 1).padStart(2, '0')}.png`,
      ),
    );
    let difference = 0;
    for (let p = 0; p < preview.data.length; p += 4)
      for (let c = 0; c < 3; c++)
        difference += Math.abs(preview.data[p + c]! - decoded.data[p + c]!);
    const mean = difference / (preview.width * preview.height * 3);
    expect(mean).toBeLessThan(3);
    comparisons.push({
      frame,
      meanAbsoluteChannelError: mean,
      actualMeshPixels: orangePixels(preview),
    });
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
  await writeFile('test-results/models/frame.png', png);
  expect(PNG.sync.read(png).data.equals(pictures[1]!)).toBe(true);
  await writeFile(
    'test-results/models/project.json',
    JSON.stringify(project, null, 2),
  );
  await writeFile(
    'test-results/models/ffprobe.json',
    JSON.stringify(probe, null, 2),
  );
  await writeFile(
    'test-results/models/parity.json',
    JSON.stringify(
      {
        source: 'Authored CC0 aircraft v1 actual OBJ triangle mesh',
        triangles: 64,
        altitudeAboveGround: 500,
        comparisons,
        repeatedSeeksIdentical: true,
        png: { frame: 30, identical: true },
      },
      null,
      2,
    ),
  );
});
test('terrain models and altitude-aware camera use actual verified ground elevation; native PNG matches preview and active cancellation preserves the saved project', async ({
  page,
  request,
}) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 2200, height: 1400 });
  await page.goto('/');
  await page.waitForFunction(() => !!window.studio);
  const project = createDemo();
  project.id = 'terrain-aircraft';
  project.durationSeconds = 1;
  const scene = project.scenes[0]!;
  scene.durationSeconds = 1;
  scene.layers = [];
  scene.camera.keyframes = [
    {
      time: 0,
      value: { lng: 103.8, lat: 22.3, zoom: 14.5, pitch: 55, bearing: 25 },
      easing: 'linear',
    },
  ];
  project.map.terrain = {
    packId: 'sapa-2026-10-12',
    exaggeration: 1.2,
    hillshade: true,
  };
  const asset = await importModelOBJ(
    new TextEncoder().encode(authoredAircraftOBJ()),
    aircraftOptions('aircraft'),
  );
  addModelLayer(
    project,
    scene.id,
    asset,
    scene.camera.keyframes[0]!.value,
    'model',
  );
  const model = scene.layers[0]!;
  if (model.type !== 'model') throw new Error('Expected model');
  model.altitude = 300;
  model.transform.scale = 10;
  scene.camera.follow = {
    layerId: 'model',
    zoom: 14.5,
    pitch: 55,
    bearingMode: 'fixed',
    bearing: 25,
  };
  await load(page, project);
  await native(page);
  await seek(page, 0);
  const placed = await page.evaluate(() => ({
    placement: window.studio!.renderer.modelPlacement('model'),
    ground: window.studio!.renderer.map.queryTerrainElevation([103.8, 22.3]),
    centerElevation: window.studio!.renderer.map.getCenterElevation(),
  }));
  expect(placed.ground!).toBeGreaterThan(2000);
  expect(placed.placement!.groundMetres).toBeCloseTo(placed.ground!, 6);
  expect(placed.centerElevation).toBeCloseTo(placed.ground! + 300, 6);
  const preview = PNG.sync.read(
    await page.getByTestId('map-surface').screenshot(),
  );
  expect(orangePixels(preview)).toBeGreaterThan(200);
  const png = await job(request, { project, format: 'png', frameIndex: 0 });
  expect(PNG.sync.read(png).data.equals(preview.data)).toBe(true);
  await mkdir('test-results/models', { recursive: true });
  await writeFile('test-results/models/terrain-aircraft.png', png);
  await writeFile(
    'test-results/models/terrain-placement.json',
    JSON.stringify(placed, null, 2),
  );
  expect((await request.post('/api/projects', { data: project })).ok()).toBe(
    true,
  );
  const longer = structuredClone(project);
  longer.durationSeconds = 6;
  longer.scenes[0]!.durationSeconds = 6;
  longer.scenes[0]!.layers[0]!.timeRange.end = 6;
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
  expect((await request.get(`/api/jobs/${queued.id}/download`)).status()).toBe(
    409,
  );
  expect(
    await (await request.get(`/api/projects/${project.id}`)).json(),
  ).toEqual(project);
  await expect
    .poll(
      async () =>
        !(await readdir(resolve('.local/e2e/renders', queued.id))).some(
          (name) => name.startsWith('frames-'),
        ),
      { timeout: 15000 },
    )
    .toBe(true);
});
