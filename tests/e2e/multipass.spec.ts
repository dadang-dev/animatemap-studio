import {
  test,
  expect,
  type APIRequestContext,
  type Page,
} from '@playwright/test';
import { mkdir, writeFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, mkdtemp } from 'node:fs/promises';
import { PNG } from 'pngjs';
import { unzipSync, strFromU8 } from 'fflate';
import {
  createDemo,
  layerSchema,
  projectSchema,
  multipassManifestSchema,
  type Project,
  type RenderJob,
} from '../../packages/project-schema/src/index';
import {
  importModelOBJ,
  authoredAircraftOBJ,
  aircraftOptions,
} from '../../apps/web/src/modelImport';
import { addModelLayer } from '../../apps/web/src/modelOperations';
const exec = promisify(execFile);
async function fixture() {
  const project = createDemo(),
    first = project.scenes[0]!;
  project.id = 'graphic-passes';
  project.name = 'Actual geometry and Unicode passes';
  project.durationSeconds = 1;
  project.canvas = { width: 960, height: 540, fps: 24 };
  first.durationSeconds = 0.5;
  first.layers = [];
  first.camera.keyframes = [
    {
      time: 0,
      value: { lng: 106.7, lat: 16, zoom: 17, pitch: 55, bearing: 25 },
      easing: 'linear',
    },
  ];
  const asset = await importModelOBJ(
    new TextEncoder().encode(authoredAircraftOBJ()),
    aircraftOptions('graphic-aircraft'),
  );
  addModelLayer(
    project,
    first.id,
    asset,
    first.camera.keyframes[0]!.value,
    'aircraft',
  );
  const model = first.layers[0]!;
  if (model.type !== 'model') throw new Error('Expected model');
  model.altitude = 180;
  model.transform.scale = 6;
  first.camera.follow = {
    layerId: 'aircraft',
    zoom: 17,
    pitch: 55,
    bearingMode: 'fixed',
    bearing: 25,
  };
  first.layers.push(
    layerSchema.parse({
      id: 'title',
      name: 'Unicode title',
      type: 'text',
      text: 'Hành trình Việt Nam',
      anchor: { type: 'screen', x: 0.06, y: 0.12 },
      timeRange: { start: 0, end: 0.5 },
      style: {
        color: '#ffffff',
        fontSize: 32,
        fontWeight: 'bold',
        align: 'left',
      },
    }),
  );
  first.layers.push(
    layerSchema.parse({
      id: 'pin',
      name: 'Map anchor',
      type: 'marker',
      label: 'Điểm minh họa',
      anchor: { type: 'map', coordinates: [106.7003, 16.0001] },
      timeRange: { start: 0, end: 0.5 },
      style: { color: '#ffce54', size: 20, icon: 'pin' },
    }),
  );
  const second = structuredClone(first);
  second.id = 'second';
  second.name = 'Second graphic scene';
  second.startSeconds = 0.5;
  second.transition = { type: 'crossfade', durationSeconds: 0.5 };
  for (const layer of second.layers) {
    layer.id = `${layer.id}-second`;
    if (layer.type === 'model') layer.style.color = '#75d9bd';
    if (layer.type === 'text') layer.text = 'Cảnh thứ hai · Bản đồ';
  }
  second.camera.follow!.layerId = 'aircraft-second';
  project.scenes.push(second);
  project.captions.enabled = true;
  project.captions.style.fontSize = 28;
  project.captions.cues = [
    {
      id: 'cue',
      startSeconds: 0,
      endSeconds: 1,
      text: 'Xin chào Việt Nam\nĐộ sâu GPU',
      locked: false,
    },
  ];
  return projectSchema.parse(project);
}
async function load(page: Page, project: Project) {
  await page.goto('/');
  await page.waitForFunction(() => !!window.studio);
  await page.getByLabel('Import project JSON').setInputFiles({
    name: 'passes.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(project)),
  });
  await expect
    .poll(() => page.evaluate(() => window.studio!.getProject()))
    .toEqual(project);
  await page.evaluate(() => window.studio!.renderer.ready());
}
async function waitJob(request: APIRequestContext, id: string) {
  await expect
    .poll(
      async () => {
        const job = (await (
          await request.get(`/api/jobs/${id}`)
        ).json()) as RenderJob;
        if (job.state === 'failed') throw new Error(job.error);
        return job.state;
      },
      { timeout: 180000, intervals: [500] },
    )
    .toBe('completed');
}
function over(base: PNG, layer: PNG, opacity = 1) {
  const output = new PNG({ width: base.width, height: base.height });
  for (let p = 0; p < base.data.length; p += 4) {
    const a = (layer.data[p + 3]! / 255) * opacity,
      b = (base.data[p + 3]! / 255) * (1 - a),
      alpha = a + b;
    for (let c = 0; c < 3; c++)
      output.data[p + c] = alpha
        ? Math.round((layer.data[p + c]! * a + base.data[p + c]! * b) / alpha)
        : 0;
    output.data[p + 3] = Math.round(alpha * 255);
  }
  return output;
}
function mean(a: PNG, b: PNG) {
  let total = 0;
  for (let p = 0; p < a.data.length; p += 4)
    for (let c = 0; c < 3; c++)
      total += Math.abs(a.data[p + c]! - b.data[p + c]!);
  return total / (a.width * a.height * 3);
}
test('actual CLI runs the same multi-pass renderer and returns a readable source-preserving ZIP', async () => {
  test.setTimeout(180000);
  const project = await fixture();
  project.id = 'cli-passes';
  const directory = await mkdtemp(resolve('.local/e2e/cli-passes-')),
    input = resolve(directory, 'input.json');
  await writeFile(input, JSON.stringify(project));
  const result = await exec(
    process.execPath,
    [
      resolve('node_modules/tsx/dist/cli.mjs'),
      resolve('apps/render-worker/src/cli.ts'),
      input,
      directory,
      'zip',
    ],
    { timeout: 150000, windowsHide: true },
  );
  expect(result.stdout).toContain('output.zip');
  const files = unzipSync(await readFile(resolve(directory, 'output.zip'))),
    manifest = multipassManifestSchema.parse(
      JSON.parse(strFromU8(files['manifest.json']!)),
    );
  expect(manifest).toMatchObject({
    projectId: 'cli-passes',
    frameCount: 24,
    width: 960,
    height: 540,
  });
  expect(JSON.parse(strFromU8(files['project.json']!))).toEqual(project);
  expect(
    (await readdir(directory)).some((name) => name.startsWith('frames-')),
  ).toBe(false);
});
test('portrait sequence captures full-size transparent graphics and GPU depth with deterministic references', async ({
  page,
  request,
}) => {
  test.setTimeout(180000);
  const project = await fixture();
  project.id = 'portrait-passes';
  project.canvas = { width: 540, height: 960, fps: 24 };
  project.scenes = project.scenes.slice(0, 1);
  project.scenes[0]!.durationSeconds = 1;
  for (const layer of project.scenes[0]!.layers) layer.timeRange.end = 1;
  await load(page, project);
  const queued = (await (
    await request.post('/api/jobs', { data: { project, format: 'zip' } })
  ).json()) as RenderJob;
  await waitJob(request, queued.id);
  const bytes = await (
      await request.get(`/api/jobs/${queued.id}/download`)
    ).body(),
    files = unzipSync(bytes),
    manifest = multipassManifestSchema.parse(
      JSON.parse(strFromU8(files['manifest.json']!)),
    );
  expect(manifest).toMatchObject({ width: 540, height: 960, frameCount: 24 });
  await page.evaluate(() =>
    Object.assign(document.querySelector<HTMLElement>('.composition')!.style, {
      position: 'fixed',
      left: '0',
      top: '0',
      width: '540px',
      height: '960px',
      maxHeight: 'none',
      zIndex: '50',
    }),
  );
  await page.evaluate(() => window.studio!.renderer.ready());
  const first = manifest.frames[0]!,
    reference = PNG.sync.read(Buffer.from(files[first.reference]!));
  expect(reference).toMatchObject({ width: 540, height: 960 });
  expect(
    PNG.sync.read(Buffer.from(files[first.incoming.depth]!)),
  ).toMatchObject({ width: 540, height: 960 });
  const preview = PNG.sync.read(
    await page.getByTestId('map-surface').screenshot(),
  );
  expect(mean(preview, reference)).toBeLessThan(3);
  await mkdir('test-results/multipass', { recursive: true });
  await writeFile('test-results/multipass/portrait.zip', bytes);
  await writeFile(
    'test-results/multipass/portrait-reference.png',
    files[first.reference]!,
  );
});
test('UI exports real ZIP planes/depth/reference/Unicode; compositing and native preview agree through crossfade, snapshot is unchanged and PNG export still works', async ({
  page,
  request,
}) => {
  test.setTimeout(240000);
  await page.setViewportSize({ width: 1600, height: 1100 });
  const project = await fixture();
  await load(page, project);
  await page.getByRole('button', { name: '↓ Export' }).click();
  await page.getByLabel('Export format').selectOption('zip');
  await page.getByRole('button', { name: 'Start export', exact: true }).click();
  const download = page.getByRole('link', {
    name: 'Download ZIP',
    exact: true,
  });
  await expect(download).toBeVisible({ timeout: 180000 });
  const href = (await download.getAttribute('href'))!,
    id = href.split('/')[3]!;
  await waitJob(request, id);
  const response = await request.get(`/api/jobs/${id}/download`);
  expect(response.headers()['content-type']).toContain('application/zip');
  const bytes = await response.body(),
    files = unzipSync(bytes),
    manifest = multipassManifestSchema.parse(
      JSON.parse(strFromU8(files['manifest.json']!)),
    );
  expect(manifest.frameCount).toBe(24);
  expect(manifest.frames[12]!.outgoing).toBeDefined();
  expect(manifest.sourceCredits.join(' ')).toContain('Stylized aircraft');
  expect(JSON.parse(strFromU8(files['project.json']!))).toEqual(project);
  expect(strFromU8(files['README.txt']!)).toContain(
    'not grayscale or linear metres',
  );
  expect(Object.keys(files)).toHaveLength(
    manifest.frames.reduce((n, f) => n + (f.outgoing ? 8 : 5), 3),
  );
  await page.getByRole('button', { name: '↓ Export' }).click();
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
  await mkdir('test-results/multipass', { recursive: true });
  const comparisons = [];
  for (const index of [0, 12, 18, 23]) {
    const f = manifest.frames[index]!,
      image = (name: string) => PNG.sync.read(Buffer.from(files[name]!));
    let composed = over(image(f.incoming.map), image(f.incoming.overlay));
    if (f.outgoing)
      composed = over(
        composed,
        over(image(f.outgoing.map), image(f.outgoing.overlay)),
        1 - f.incomingWeight,
      );
    composed = over(composed, image(f.captions));
    const reference = image(f.reference);
    expect(reference.width).toBe(960);
    expect(reference.height).toBe(540);
    const compositionError = mean(composed, reference);
    expect(compositionError).toBeLessThan(3);
    const overlay = image(f.incoming.overlay);
    let transparent = 0,
      visible = 0;
    for (let p = 3; p < overlay.data.length; p += 4)
      if (!overlay.data[p]) transparent++;
      else visible++;
    expect(transparent).toBeGreaterThan(100000);
    expect(visible).toBeGreaterThan(500);
    const captions = image(f.captions);
    expect(captions.data.some((v, i) => i % 4 === 3 && v > 0)).toBe(true);
    const depth = image(f.incoming.depth);
    let nonWhite = 0;
    for (let p = 0; p < depth.data.length; p += 4)
      if (
        depth.data[p] !== 255 ||
        depth.data[p + 1] !== 255 ||
        depth.data[p + 2] !== 255
      )
        nonWhite++;
    expect(nonWhite).toBeGreaterThan(100);
    await page.evaluate((time) => window.studio!.seek(time), index / 24);
    await page.evaluate(() => window.studio!.renderer.ready());
    const preview = PNG.sync.read(
      await page.getByTestId('map-surface').screenshot(),
    );
    const previewError = mean(preview, reference);
    expect(previewError).toBeLessThan(3);
    comparisons.push({
      index,
      timeSeconds: f.timeSeconds,
      compositionError,
      previewError,
      incomingWeight: f.incomingWeight,
    });
    await writeFile(
      `test-results/multipass/reference-${index}.png`,
      files[f.reference]!,
    );
    await writeFile(
      `test-results/multipass/composed-${index}.png`,
      PNG.sync.write(composed),
    );
  }
  const pngJob = (await (
    await request.post('/api/jobs', {
      data: { project, format: 'png', frameIndex: 18 },
    })
  ).json()) as RenderJob;
  await waitJob(request, pngJob.id);
  expect(
    PNG.sync
      .read(await (await request.get(`/api/jobs/${pngJob.id}/download`)).body())
      .data.equals(
        PNG.sync.read(Buffer.from(files[manifest.frames[18]!.reference]!)).data,
      ),
  ).toBe(true);
  expect(await page.evaluate(() => window.studio!.getProject())).toEqual(
    project,
  );
  await writeFile('test-results/multipass/sequence.zip', bytes);
  await writeFile(
    'test-results/multipass/manifest.json',
    JSON.stringify(manifest, null, 2),
  );
  await writeFile(
    'test-results/multipass/parity.json',
    JSON.stringify(
      { comparisons, pngReferenceIdentical: true, projectPreserved: true },
      null,
      2,
    ),
  );
});
test('real multi-pass capture cancellation/retry cleans partial archive/frames and preserves API project; input limits and resource failures remain actionable', async ({
  page,
  request,
}) => {
  test.setTimeout(240000);
  const project = await fixture();
  project.id = 'graphic-cancel';
  project.durationSeconds = 1;
  project.scenes = project.scenes.slice(0, 1);
  project.scenes[0]!.durationSeconds = 1;
  for (const l of project.scenes[0]!.layers) l.timeRange.end = 1;
  await load(page, project);
  expect((await request.post('/api/projects', { data: project })).ok()).toBe(
    true,
  );
  const queued = (await (
    await request.post('/api/jobs', { data: { project, format: 'zip' } })
  ).json()) as RenderJob;
  await expect
    .poll(
      async () => {
        const job = (await (
          await request.get(`/api/jobs/${queued.id}`)
        ).json()) as RenderJob;
        if (job.state === 'failed') throw new Error(job.error);
        return job.state === 'rendering' && job.progress > 0;
      },
      { timeout: 60000, intervals: [200] },
    )
    .toBe(true);
  await request.post(`/api/jobs/${queued.id}/cancel`);
  expect((await request.get(`/api/jobs/${queued.id}/download`)).status()).toBe(
    409,
  );
  await expect
    .poll(
      async () =>
        !(await readdir(resolve('.local/e2e/renders', queued.id))).some(
          (name) => name.startsWith('frames-') || name === 'output.zip',
        ),
      { timeout: 15000 },
    )
    .toBe(true);
  expect(
    await (await request.get(`/api/projects/${project.id}`)).json(),
  ).toEqual(project);
  const retry = (await (
    await request.post(`/api/jobs/${queued.id}/retry`)
  ).json()) as RenderJob;
  expect(retry.id).not.toBe(queued.id);
  expect(retry.format).toBe('zip');
  await waitJob(request, retry.id);
  const restored = unzipSync(
    await (await request.get(`/api/jobs/${retry.id}/download`)).body(),
  );
  expect(JSON.parse(strFromU8(restored['project.json']!))).toEqual(project);
  expect(
    multipassManifestSchema.parse(
      JSON.parse(strFromU8(restored['manifest.json']!)),
    ).frameCount,
  ).toBe(24);
  const long = structuredClone(project);
  long.durationSeconds = 26;
  expect(
    (
      await request.post('/api/jobs', {
        data: { project: long, format: 'zip' },
      })
    ).status(),
  ).toBe(400);
  await page.goto('/render');
  await page.waitForFunction(() => !!window.renderStudio);
  await page.evaluate((p) => window.renderStudio!.load(p), project);
  await page.evaluate(() => window.renderStudio!.frame(0));
  await page.evaluate(() =>
    document
      .querySelector<HTMLCanvasElement>('.maplibregl-canvas')!
      .getContext('webgl2')!
      .getExtension('WEBGL_lose_context')!
      .loseContext(),
  );
  await expect
    .poll(() =>
      page.evaluate(async () => {
        try {
          await window.renderStudio!.pass('depth');
          return '';
        } catch (e) {
          return String(e);
        }
      }),
    )
    .toContain('context lost');
  expect(
    await (await request.get(`/api/projects/${project.id}`)).json(),
  ).toEqual(project);
});
