import { test, expect, type Page } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve } from 'node:path';
import { crc32, deflateSync } from 'node:zlib';
import { PNG } from 'pngjs';
import { testImage } from '../../packages/project-schema/src/assets.fixture';
import {
  createDemo,
  type RenderJob,
} from '../../packages/project-schema/src/index';
import { addAssetLayer } from '../../apps/web/src/assetOperations';
const exec = promisify(execFile);
async function seek(page: Page, time: number) {
  await page.evaluate((time) => window.studio!.seek(time), time);
  await page.evaluate(() => window.studio!.renderer.ready());
}
async function addFlag(page: Page) {
  await page
    .getByRole('button', { name: 'Image assets / logo', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Add Vietnam flag', exact: true })
    .click();
  await expect
    .poll(async () => {
      const error = page.locator('.asset-dialog').getByRole('alert');
      if (await error.count()) throw new Error(await error.innerText());
      return page.evaluate(() =>
        window
          .studio!.getProject()
          .assets.some((asset) => asset.name === 'Vietnam flag'),
      );
    })
    .toBe(true);
  await expect(
    page.getByRole('button', { name: 'Close assets', exact: true }),
  ).toBeEnabled();
  await page.getByRole('button', { name: 'Close assets', exact: true }).click();
  await page.evaluate(() => window.studio!.renderer.ready());
}
async function addHatch(page: Page) {
  await page
    .getByRole('button', { name: 'Image assets / logo', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Fill VNM with hatch', exact: true })
    .click();
  await page.getByRole('button', { name: 'Close assets', exact: true }).click();
  await page.evaluate(() => window.studio!.renderer.ready());
}
test('image assets import pixels/provenance, project anchors, locks, history and persistence', async ({
  page,
  request,
}) => {
  await page.goto('/');
  await page.waitForFunction(() => !!window.studio);
  await addFlag(page);
  const first = await page.evaluate(() => window.studio!.getProject());
  expect(first.assets).toHaveLength(1);
  expect(first.assets[0]!.provenance.license).toContain('Public domain');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  expect(
    (await page.evaluate(() => window.studio!.getProject())).assets,
  ).toHaveLength(0);
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  expect(await page.evaluate(() => window.studio!.getProject())).toEqual(first);
  await page
    .locator('.layer-row')
    .getByText('Vietnam flag', { exact: true })
    .click();
  await page.getByLabel('Image width', { exact: true }).fill('360');
  await page.getByLabel('Image height', { exact: true }).fill('240');
  await page.getByLabel('Anchor', { exact: true }).selectOption('map');
  await page.getByLabel('Anchor longitude').fill('105.85');
  await page.getByLabel('Anchor latitude').fill('21.03');
  await page.getByLabel('Camera pitch').fill('35');
  await page.getByLabel('Camera zoom').fill('5');
  await page.evaluate(() => window.studio!.renderer.ready());
  const point = await page.evaluate(() =>
    window.studio!.renderer.map.project([105.85, 21.03]),
  );
  const box = await page
    .locator('.map-overlays img[alt="Vietnam flag"]')
    .boundingBox();
  const map = await page.locator('.map-host').boundingBox();
  expect(Math.abs(box!.x - map!.x - point.x)).toBeLessThan(1);
  expect(Math.abs(box!.y - map!.y - point.y)).toBeLessThan(1);
  await page.getByLabel('Toggle lock Vietnam flag', { exact: true }).click();
  await expect(page.getByLabel('Image width', { exact: true })).toBeDisabled();
  await page.getByLabel('Toggle lock Vietnam flag', { exact: true }).click();
  await page.getByLabel('Animation style').selectOption('pop');
  await page
    .getByRole('button', { name: 'Apply animation style', exact: true })
    .click();
  await seek(page, 2);
  await page
    .getByRole('button', { name: 'Image assets / logo', exact: true })
    .click();
  const fixture = testImage();
  const transparent = PNG.sync.read(
    Buffer.from(fixture.dataUrl.split(',')[1]!, 'base64'),
  );
  transparent.data[3] = 0;
  await page.getByLabel('Image file', { exact: true }).setInputFiles({
    name: 'Logo Hà Nội.png',
    mimeType: 'image/png',
    buffer: PNG.sync.write(transparent),
  });
  for (const [key, value] of Object.entries(fixture.provenance))
    await page.getByLabel(`Asset ${key}`, { exact: true }).fill(value);
  await page
    .getByRole('button', { name: 'Import image overlay', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Close assets', exact: true }),
  ).toBeEnabled();
  await page.getByRole('button', { name: 'Close assets', exact: true }).click();
  await addHatch(page);
  expect(
    await page.evaluate(() => {
      const layer = window
        .studio!.getProject()
        .scenes[0]!.layers.find(
          (layer) => layer.type === 'countryHighlight' && layer.textureAssetId,
        )!;
      return window.studio!.renderer.map.getPaintProperty(
        `ams-${layer.id}-fill`,
        'fill-pattern',
      );
    }),
  ).toMatch(/^ams-image-/);
  await expect(page.locator('.map-credit')).toContainText(
    'Texture · AnimateMap · CC0',
  );
  const saved = await page.evaluate(() => window.studio!.getProject());
  const logo = saved.assets.find((asset) => asset.name === 'Logo Hà Nội.png')!;
  expect(
    PNG.sync.read(Buffer.from(logo.dataUrl.split(',')[1]!, 'base64')).data[3],
  ).toBe(0);
  await expect(page.getByText('Saved locally', { exact: false })).toBeVisible();
  expect((await request.post('/api/projects', { data: saved })).ok()).toBe(
    true,
  );
  expect(await (await request.get(`/api/projects/${saved.id}`)).json()).toEqual(
    saved,
  );
  await page.screenshot({ path: 'test-results/phase-6-assets.png' });
  await page.reload();
  await page.waitForFunction(() => !!window.studio);
  expect(await page.evaluate(() => window.studio!.getProject())).toEqual(saved);
  await page.getByRole('button', { name: 'Project ▾' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON', exact: true }).click();
  const path = await (await downloadPromise).path();
  expect(JSON.parse(await readFile(path!, 'utf8'))).toEqual(saved);
});
test('JPEG normalizes to static embedded PNG; unsafe uploads and unavailable flags show actionable errors', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForFunction(() => !!window.studio);
  await page
    .getByRole('button', { name: 'Image assets / logo', exact: true })
    .click();
  await page.route('**/assets/flags/vnm.svg', (route) =>
    route.fulfill({ status: 503, body: 'Unavailable' }),
  );
  await page
    .getByRole('button', { name: 'Add Vietnam flag', exact: true })
    .click();
  await expect(page.getByRole('alert')).toContainText('unavailable (503)');
  await page.unrouteAll({ behavior: 'wait' });
  for (const [key, value] of Object.entries(testImage().provenance))
    await page.getByLabel(`Asset ${key}`, { exact: true }).fill(value);
  await page.getByLabel('Image file', { exact: true }).setInputFiles({
    name: 'unsafe.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from('<svg onload="alert(1)"/>'),
  });
  await page
    .getByRole('button', { name: 'Import image overlay', exact: true })
    .click();
  await expect(page.getByRole('alert')).toContainText('static PNG or JPEG');
  const jpeg = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 16;
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#f9ab3b';
    context.fillRect(0, 0, 32, 16);
    return canvas.toDataURL('image/jpeg');
  });
  await page.getByLabel('Image file', { exact: true }).setInputFiles({
    name: 'Photo.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.from(jpeg.split(',')[1]!, 'base64'),
  });
  await page
    .getByRole('button', { name: 'Import image overlay', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Close assets', exact: true }),
  ).toBeEnabled();
  await page.getByRole('button', { name: 'Close assets', exact: true }).click();
  const asset = (await page.evaluate(() => window.studio!.getProject()))
    .assets[0]!;
  expect(asset.mime).toBe('image/png');
  expect(asset.width).toBe(32);
  expect(asset.height).toBe(16);
  expect(
    PNG.sync.read(Buffer.from(asset.dataUrl.split(',')[1]!, 'base64')).width,
  ).toBe(32);
});
test('corrupt PNG pixels reject before persistence and image decoder failures recover on reload', async ({
  request,
  page,
}) => {
  const project = createDemo();
  project.id = 'asset-decoding-failure';
  const saved = structuredClone(project);
  expect((await request.post('/api/projects', { data: saved })).ok()).toBe(
    true,
  );
  const asset = testImage();
  const bytes = Buffer.from(asset.dataUrl.split(',')[1]!, 'base64');
  let offset = 8;
  while (offset < bytes.length) {
    const size = bytes.readUInt32BE(offset),
      end = offset + 8 + size;
    if (bytes.toString('ascii', offset + 4, offset + 8) === 'IDAT') {
      const scanlines = Buffer.alloc((8 * 4 + 1) * 8, 255);
      for (let row = 0; row < 8; row++) scanlines[row * (8 * 4 + 1)] = 5;
      const compressed = deflateSync(scanlines);
      const chunk = Buffer.alloc(compressed.length + 12);
      chunk.writeUInt32BE(compressed.length, 0);
      chunk.write('IDAT', 4);
      compressed.copy(chunk, 8);
      chunk.writeUInt32BE(
        crc32(chunk.subarray(4, chunk.length - 4)),
        chunk.length - 4,
      );
      asset.dataUrl = `data:image/png;base64,${Buffer.concat([bytes.subarray(0, offset), chunk, bytes.subarray(end + 4)]).toString('base64')}`;
      break;
    }
    offset = end + 4;
  }
  addAssetLayer(project, 'scene-1', asset, 'image', 'VNM', 'broken-image');
  expect(
    (await request.post('/api/projects', { data: project })).status(),
  ).toBe(400);
  expect(
    (
      await request.post('/api/jobs', { data: { project, format: 'png' } })
    ).status(),
  ).toBe(400);
  expect(
    await (await request.get(`/api/projects/${project.id}`)).json(),
  ).toEqual(saved);
  await page.goto('http://127.0.0.1:5174/render');
  await page.waitForFunction(() => !!window.renderStudio);
  const valid = createDemo();
  addAssetLayer(valid, 'scene-1', testImage(), 'image', 'VNM', 'image-layer');
  await page.evaluate(() => {
    // Fault injection targets the decode API; native Chromium tolerates several
    // corrupt PNG streams, so shared schema validation handles those separately.
    const original = HTMLImageElement.prototype.decode;
    HTMLImageElement.prototype.decode = function () {
      if (this.src.startsWith('data:image/png')) {
        HTMLImageElement.prototype.decode = original;
        return Promise.reject(new Error('Injected decoder resource failure'));
      }
      return original.call(this);
    };
  });
  await expect(
    page.evaluate((project) => window.renderStudio!.load(project), valid),
  ).rejects.toThrow('cannot decode');
  await page.evaluate((project) => window.renderStudio!.load(project), valid);
  await page.evaluate(() => window.renderStudio!.frame(0));
});
test('embedded images and country textures crossfade in real MP4 and PNG with preview parity', async ({
  page,
  request,
}) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 2200, height: 1400 });
  await page.goto('/');
  await page.waitForFunction(() => !!window.studio);
  await page.getByLabel('Scene duration', { exact: true }).fill('1');
  await addFlag(page);
  await page.getByLabel('Animation style').selectOption('pop');
  await page
    .getByRole('button', { name: 'Apply animation style', exact: true })
    .click();
  await addHatch(page);
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
  await mkdir('test-results/assets', { recursive: true });
  const output = resolve('test-results/assets/flags-texture.mp4');
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
    'select=eq(n\\,0)+eq(n\\,15)+eq(n\\,30)+eq(n\\,37)+eq(n\\,59)',
    '-fps_mode',
    'vfr',
    resolve('test-results/assets/decoded-%02d.png'),
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
  for (const [index, frame] of [0, 15, 30, 37, 59].entries()) {
    await seek(page, frame / 30);
    const expected = PNG.sync.read(
      await page
        .getByTestId('map-surface')
        .screenshot({ path: `test-results/assets/preview-${frame}.png` }),
    );
    const decoded = PNG.sync.read(
      await readFile(
        `test-results/assets/decoded-${String(index + 1).padStart(2, '0')}.png`,
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
  await writeFile('test-results/assets/frame.png', pngBytes);
  await writeFile(
    'test-results/assets/parity.json',
    JSON.stringify({ comparisons }, null, 2),
  );
  await writeFile(
    'test-results/assets/ffprobe.json',
    JSON.stringify(probe, null, 2),
  );
});
test('missing bundled fonts fail rendering explicitly and recover after resources return', async ({
  page,
}) => {
  await page.route('**/noto-sans-*.woff*', (route) =>
    route.fulfill({ status: 503, body: 'Unavailable' }),
  );
  await page.goto('http://127.0.0.1:5174/render');
  await page.waitForFunction(() => !!window.renderStudio);
  await expect(
    page.evaluate(
      (project) => window.renderStudio!.load(project),
      createDemo(),
    ),
  ).rejects.toThrow('Font resources');
  await page.unrouteAll({ behavior: 'wait' });
  await page.reload();
  await page.waitForFunction(() => !!window.renderStudio);
  await page.evaluate(
    (project) => window.renderStudio!.load(project),
    createDemo(),
  );
  await page.evaluate(() => window.renderStudio!.frame(0));
});
