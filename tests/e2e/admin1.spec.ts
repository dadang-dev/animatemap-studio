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

async function seek(page: Page, time: number) {
  await page.evaluate((time) => window.studio!.seek(time), time);
  await page.evaluate(() => window.studio!.renderer.ready());
}
async function openRegions(page: Page) {
  await page
    .getByRole('button', { name: 'Admin 1 regions', exact: true })
    .click();
}
async function duplicateProject(page: Page) {
  await page.getByRole('button', { name: 'Project ▾' }).click();
  await page
    .getByRole('button', { name: 'Save as / Duplicate', exact: true })
    .click();
  await page.getByRole('button', { name: 'Project ▾' }).click();
}
async function addRegion(page: Page, name: string, country = 'VNM') {
  await openRegions(page);
  await page.getByLabel('Admin 1 country').selectOption(country);
  await page.getByLabel('Show Admin 1 boundaries').check();
  await expect(page.locator('.admin1-dialog')).toContainText(
    `${country === 'VNM' ? 63 : 77} reference regions`,
  );
  await page.getByLabel('Search Admin 1 regions').fill(name);
  await page.getByLabel(`Select region ${name}`, { exact: true }).check();
  await page
    .getByRole('button', { name: 'Highlight selected regions', exact: true })
    .click();
  await expect(page.getByLabel('Admin 1 region identifiers')).toBeVisible();
  await page.evaluate(() => window.studio!.renderer.ready());
}

test('Admin 1 reference regions select/focus/highlight on the real map with styles, locks, history and persistence', async ({
  page,
  request,
}) => {
  await page.goto('/');
  await page.waitForFunction(() => !!window.studio);
  await duplicateProject(page);
  await page.getByLabel('Scene duration', { exact: true }).fill('2');
  await openRegions(page);
  await page.getByLabel('Show Admin 1 boundaries').check();
  await expect(page.locator('.admin1-dialog')).toContainText(
    '63 reference regions',
  );
  await page.getByLabel('Search Admin 1 regions').fill('Kon Tum');
  await page.getByLabel('Select region Kon Tum', { exact: true }).check();
  await page
    .getByRole('button', { name: 'Focus selected region', exact: true })
    .click();
  const point = await page.evaluate(() => {
    const p = window.studio!.renderer.map.project([107.969, 14.7451]);
    return { x: p.x, y: p.y };
  });
  await page.getByTestId('map-surface').click({ position: point });
  await expect(
    page.getByRole('region', { name: 'Selected Admin 1 region' }),
  ).toContainText('VNM-486');
  await page
    .getByRole('button', { name: 'Review selected region', exact: true })
    .click();
  await expect(page.locator('.admin1-dialog')).toContainText('1 selected');
  await page
    .getByRole('button', { name: 'Highlight selected regions', exact: true })
    .click();
  const id = (
    await page.evaluate(() => window.studio!.getProject())
  ).scenes[0]!.layers.at(-1)!.id;
  await page.getByLabel('Layer color').fill('#ff8800');
  await expect
    .poll(() =>
      page.evaluate(
        (id) =>
          window.studio!.renderer.map.getPaintProperty(
            `ams-${id}-fill`,
            'fill-color',
          ),
        id,
      ),
    )
    .toBe('#ff8800');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await page.getByLabel('Map style').selectOption('light');
  await page.getByLabel('Camera pitch').fill('35');
  await page.getByLabel('Camera bearing').fill('20');
  await page.evaluate(() => window.studio!.renderer.ready());
  const hit = await page.evaluate(
    (id) =>
      window
        .studio!.renderer.map.queryRenderedFeatures(
          window.studio!.renderer.map.project([107.969, 14.7451]),
          { layers: [`ams-${id}-fill`] },
        )
        .map((feature) => feature.properties.sourceCode),
    id,
  );
  expect(hit).toContain('VNM-486');
  await page.getByLabel('Admin 1 stroke width').fill('3');
  await page
    .getByRole('button', { name: 'Toggle lock Kon Tum', exact: true })
    .click();
  await expect(page.getByLabel('Admin 1 stroke width')).toBeDisabled();
  await page
    .getByRole('button', { name: 'Toggle lock Kon Tum', exact: true })
    .click();
  await seek(page, 0);
  await page.getByLabel('Keyframe property').selectOption('opacity');
  await page.getByRole('button', { name: 'Add keyframe', exact: true }).click();
  await page.getByLabel('Kon Tum opacity keyframe 0', { exact: true }).click();
  await page.getByLabel('Keyframe value').fill('0');
  await seek(page, 1);
  await page.getByRole('button', { name: 'Add keyframe', exact: true }).click();
  await page.getByLabel('Kon Tum opacity keyframe 1', { exact: true }).click();
  await page.getByLabel('Keyframe value').fill('1');
  const project = await page.evaluate(() => window.studio!.getProject());
  const validIds = await page
    .getByLabel('Admin 1 region identifiers')
    .inputValue();
  await page.getByLabel('Admin 1 region identifiers').fill('invented-region');
  await page.getByLabel('Admin 1 region identifiers').blur();
  await expect(page.getByRole('alert')).toContainText('Unknown Natural Earth');
  expect(await page.evaluate(() => window.studio!.getProject())).toEqual(
    project,
  );
  await page.getByLabel('Admin 1 region identifiers').fill(validIds);
  await page.getByLabel('Admin 1 region identifiers').blur();
  await addRegion(page, 'Bangkok', 'THA');
  const saved = await page.evaluate(() => window.studio!.getProject());
  expect(saved.map.admin1Countries).toEqual(['VNM', 'THA']);
  expect((await request.post('/api/projects', { data: saved })).ok()).toBe(
    true,
  );
  expect(await (await request.get(`/api/projects/${saved.id}`)).json()).toEqual(
    saved,
  );
  await expect(page.getByText('Saved locally', { exact: false })).toBeVisible();
  await page.reload();
  await page.waitForFunction(() => !!window.studio);
  expect(await page.evaluate(() => window.studio!.getProject())).toEqual(saved);
  await expect(page.locator('.map-credit')).toContainText('Admin 1 · v5.1.2');
  await page.screenshot({ path: 'test-results/admin1-editor.png' });
});

test('missing/corrupt Admin 1 files reject frame readiness and saved projects survive recovery', async ({
  page,
  request,
}) => {
  const project = createDemo();
  project.id = 'admin1-resource-test';
  project.map.admin1Countries = ['VNM'];
  expect((await request.post('/api/projects', { data: project })).ok()).toBe(
    true,
  );
  await page.route('**/data/admin1/VNM.geojson', (route) =>
    route.fulfill({ status: 503, body: 'Unavailable' }),
  );
  await page.goto('http://127.0.0.1:5174/render');
  await page.waitForFunction(() => !!window.renderStudio);
  await expect(
    page.evaluate((project) => window.renderStudio!.load(project), project),
  ).rejects.toThrow('Admin 1 VNM resources failed');
  await page.unrouteAll({ behavior: 'wait' });
  const bytes = await readFile(
    'apps/web/public/data/admin1/VNM.geojson',
    'utf8',
  );
  await page.route('**/data/admin1/VNM.geojson', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: bytes.replace('Kon Tum', 'Kon Tam'),
    }),
  );
  await page.reload();
  await page.waitForFunction(() => !!window.renderStudio);
  await expect(
    page.evaluate((project) => window.renderStudio!.load(project), project),
  ).rejects.toThrow('checksum mismatch');
  expect(
    await (await request.get(`/api/projects/${project.id}`)).json(),
  ).toEqual(project);
  await page.unrouteAll({ behavior: 'wait' });
  await page.reload();
  await page.waitForFunction(() => !!window.renderStudio);
  await page.evaluate((project) => window.renderStudio!.load(project), project);
  await page.evaluate(() => window.renderStudio!.frame(0));
  await expect(page.locator('.map-credit')).toContainText('Admin 1 · v5.1.2');
});
test('Admin 1 regions, boundaries and opacity export actual MP4/PNG through crossfade with preview parity', async ({
  page,
  request,
}) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 2200, height: 1400 });
  await page.goto('/');
  await page.waitForFunction(() => !!window.studio);
  await duplicateProject(page);
  await page.getByLabel('Scene duration', { exact: true }).fill('1');
  await addRegion(page, 'Kon Tum');
  await page.getByLabel('Animation duration').fill('0.8');
  await page
    .getByLabel('Animation style', { exact: true })
    .selectOption('fadeIn');
  await page
    .getByRole('button', { name: 'Apply animation style', exact: true })
    .click();
  await addRegion(page, 'Bangkok', 'THA');
  await page.getByLabel('Animation duration').fill('0.8');
  await page
    .getByLabel('Animation style', { exact: true })
    .selectOption('fadeOut');
  await page
    .getByRole('button', { name: 'Apply animation style', exact: true })
    .click();
  await page.getByLabel('Camera pitch').fill('25');
  await page.getByLabel('Camera bearing').fill('15');
  await page.getByRole('button', { name: 'Add camera keyframe · K' }).click();
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
  await mkdir('test-results/admin1', { recursive: true });
  const output = resolve('test-results/admin1/regions.mp4');
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
    resolve('test-results/admin1/decoded-%02d.png'),
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
    const expected = PNG.sync.read(
      await page
        .getByTestId('map-surface')
        .screenshot({ path: `test-results/admin1/preview-${frame}.png` }),
    );
    const decoded = PNG.sync.read(
      await readFile(
        `test-results/admin1/decoded-${String(index + 1).padStart(2, '0')}.png`,
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
    await seek(page, 1.8);
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
  await writeFile('test-results/admin1/frame.png', pngBytes);
  const previewBytes = await page
    .getByTestId('map-surface')
    .screenshot({ path: 'test-results/admin1/png-preview.png' });
  const exported = PNG.sync.read(pngBytes),
    preview = PNG.sync.read(previewBytes);
  let pngDifference = 0,
    changed = 0,
    maximum = 0;
  for (let index = 0; index < exported.data.length; index++) {
    const delta = Math.abs(exported.data[index]! - preview.data[index]!);
    pngDifference += delta;
    if (delta) changed++;
    maximum = Math.max(maximum, delta);
  }
  expect(
    exported.data.equals(preview.data),
    JSON.stringify({ pngDifference, changed, maximum }),
  ).toBe(true);
  await writeFile(
    'test-results/admin1/parity.json',
    JSON.stringify(
      {
        comparisons,
        png: {
          frame: 37,
          identical: true,
          changedChannels: changed,
          maximumChannelError: maximum,
        },
      },
      null,
      2,
    ),
  );
  await writeFile(
    'test-results/admin1/ffprobe.json',
    JSON.stringify(probe, null, 2),
  );
});
