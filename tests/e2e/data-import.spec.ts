import { test, expect, type Page } from '@playwright/test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';
import {
  illustrativeCsv,
  illustrativeMetadata,
  illustrativeWorkbook,
} from '../../apps/web/src/dataImport.fixture';
import type { RenderJob } from '../../packages/project-schema/src/index';
const exec = promisify(execFile);
async function seek(page: Page, time: number) {
  await page.evaluate((time) => window.studio!.seek(time), time);
  await page.evaluate(() => window.studio!.renderer.ready());
}
async function openData(page: Page) {
  await page
    .getByRole('button', { name: 'Country data · CSV / Excel', exact: true })
    .click();
}
async function metadata(page: Page) {
  await page.getByLabel('Dataset name').fill(illustrativeMetadata.name);
  await page.getByLabel('Dataset unit').fill(illustrativeMetadata.unit);
  for (const [key, value] of Object.entries(illustrativeMetadata.provenance))
    await page.getByLabel(`Data ${key}`, { exact: true }).fill(value);
  await page.getByLabel('Data country column').selectOption('0');
  await page.getByLabel('Data year column').selectOption('1');
  await page.getByLabel('Data value column').selectOption('2');
}
async function buildCsv(page: Page, duration = 2) {
  await page.goto('/');
  await page.waitForFunction(() => !!window.studio);
  await page
    .getByLabel('Scene duration', { exact: true })
    .fill(String(duration));
  const before = await page.evaluate(() => window.studio!.getProject());
  await openData(page);
  await page.getByLabel('Import country data file').setInputFiles({
    name: 'illustrative.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(illustrativeCsv),
  });
  await expect(page.getByLabel('Data worksheet')).toBeVisible();
  await metadata(page);
  await page
    .getByRole('button', { name: 'Review observations', exact: true })
    .click();
  await expect(
    page.getByRole('region', { name: 'Reviewed data' }),
  ).toContainText('4 observations');
  expect(await page.evaluate(() => window.studio!.getProject())).toEqual(
    before,
  );
  await page
    .getByRole('button', { name: 'Add reviewed choropleth', exact: true })
    .click();
  await expect(page.getByLabel('Choropleth dataset')).toBeVisible();
  await seek(page, 0);
}
test('CSV review creates animated map fills with keyframe history/locking/trim and persistence', async ({
  page,
  request,
}) => {
  await buildCsv(page);
  let project = await page.evaluate(() => window.studio!.getProject());
  expect(project.datasets[0]!.records).toHaveLength(4);
  const id = project.scenes[0]!.layers.find(
    (layer) => layer.type === 'choropleth',
  )!.id;
  await seek(page, 1);
  expect(
    await page.evaluate(
      (id) =>
        window.studio!.evaluate(1).layers.find((layer) => layer.id === id)!
          .data!.values.VNM,
      id,
    ),
  ).toBe(50);
  await expect(page.locator(`[data-legend-id="${id}"]`)).toContainText('2021');
  const yearLabel = page.locator(`[data-legend-id="${id}"] [data-legend-year]`);
  await expect(yearLabel).toHaveText('· 2021');
  await expect(yearLabel).toBeVisible();
  const legendBounds = await page
    .locator(`[data-legend-id="${id}"]`)
    .boundingBox();
  const yearBounds = await yearLabel.boundingBox();
  expect(yearBounds!.x + yearBounds!.width).toBeLessThanOrEqual(
    legendBounds!.x + legendBounds!.width,
  );
  await expect(page.locator(`[data-legend-id="${id}"]`)).toContainText(
    'Interpolated',
  );
  await expect(page.locator('.map-credit')).toContainText(
    illustrativeMetadata.provenance.credit,
  );
  const expression = await page.evaluate(
    (id) =>
      window.studio!.renderer.map.getPaintProperty(
        `ams-${id}-fill`,
        'fill-color',
      ),
    id,
  );
  expect(JSON.stringify(expression)).toContain('VNM');
  await page.getByLabel('Data sampling').selectOption('step');
  await seek(page, 1);
  expect(
    await page.evaluate(
      (id) =>
        window.studio!.evaluate(1).layers.find((layer) => layer.id === id)!
          .data!.values.VNM,
      id,
    ),
  ).toBe(10);
  await expect(page.locator(`[data-legend-id="${id}"]`)).toContainText(
    'Held preceding',
  );
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await page.getByLabel('Data domain min', { exact: true }).fill('0');
  await page.getByLabel('Data domain max', { exact: true }).fill('100');
  await page.getByLabel('Data highColor', { exact: true }).fill('#f5c26b');
  await page.getByLabel('Legend x', { exact: true }).fill('0.06');
  await page.getByLabel('Show data legend').uncheck();
  await expect(page.locator(`[data-legend-id="${id}"]`)).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await page.getByLabel('Keyframe property').selectOption('dataYear');
  await page.getByRole('button', { name: 'Add keyframe', exact: true }).click();
  await page
    .getByLabel(`${illustrativeMetadata.name} · data dataYear keyframe 1`, {
      exact: true,
    })
    .click();
  await page.getByLabel('Keyframe value', { exact: true }).fill('2021.5');
  await page
    .getByLabel('Keyframe easing', { exact: true })
    .selectOption('easeIn');
  const beforeConflict = await page.evaluate(() => window.studio!.getProject());
  await page
    .getByRole('button', { name: 'Copy keyframe', exact: true })
    .click();
  // An occupied target cannot create duplicate times or mutate the project.
  expect(await page.evaluate(() => window.studio!.getProject())).toEqual(
    beforeConflict,
  );
  await expect(page.locator('.error-banner')).toContainText(
    'strictly increasing',
  );
  await page
    .getByLabel(`${illustrativeMetadata.name} · data dataYear keyframe 2`, {
      exact: true,
    })
    .click();
  await page
    .getByRole('button', { name: 'Delete keyframe', exact: true })
    .click();
  await page
    .getByLabel(`${illustrativeMetadata.name} · data dataYear keyframe 1`, {
      exact: true,
    })
    .click();
  await page
    .getByRole('button', { name: 'Copy keyframe', exact: true })
    .click();
  await page
    .getByLabel(`${illustrativeMetadata.name} · data dataYear keyframe 2`, {
      exact: true,
    })
    .click();
  await expect(page.getByLabel('Keyframe value', { exact: true })).toHaveValue(
    '2021.5',
  );
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await page
    .getByLabel(`${illustrativeMetadata.name} · data dataYear keyframe 2`, {
      exact: true,
    })
    .click();
  await page
    .getByLabel(`Toggle lock ${illustrativeMetadata.name} · data`, {
      exact: true,
    })
    .click();
  await expect(page.getByLabel('Data sampling')).toBeDisabled();
  const locked = await page.evaluate(() => window.studio!.getProject());
  await page.getByLabel('Keyframe value', { exact: true }).fill('2022');
  expect(await page.evaluate(() => window.studio!.getProject())).toEqual(
    locked,
  );
  await page
    .getByLabel(`Toggle lock ${illustrativeMetadata.name} · data`, {
      exact: true,
    })
    .click();
  await page.getByLabel('Scene duration', { exact: true }).fill('1');
  project = await page.evaluate(() => window.studio!.getProject());
  expect(
    project.scenes[0]!.layers.find(
      (layer) => layer.id === id,
    )!.tracks.dataYear.map((key) => key.time),
  ).toEqual([0, 1]);
  expect((await request.post('/api/projects', { data: project })).ok()).toBe(
    true,
  );
  expect(
    await (await request.get(`/api/projects/${project.id}`)).json(),
  ).toEqual(project);
  await expect(page.getByText('Saved locally', { exact: false })).toBeVisible();
  await page.reload();
  await page.waitForFunction(() => !!window.studio);
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
    name: 'data-project.json',
    mimeType: 'application/json',
    buffer: Buffer.from(json),
  });
  await expect
    .poll(() => page.evaluate(() => window.studio!.getProject()))
    .toEqual(project);
  await page.getByRole('button', { name: 'Close menu', exact: true }).click();
  await seek(page, 0.5);
  await page.screenshot({ path: 'test-results/data-editor.png' });
});
test('real XLSX worker supports worksheet/mapping review; row and formula errors preserve the project', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForFunction(() => !!window.studio);
  const before = await page.evaluate(() => window.studio!.getProject());
  await openData(page);
  await page.getByLabel('Import country data file').setInputFiles({
    name: 'illustrative.xlsx',
    mimeType:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from(await illustrativeWorkbook()),
  });
  await expect(page.getByLabel('Data worksheet')).toBeVisible();
  await page.getByLabel('Data worksheet').selectOption({ label: 'Dữ liệu' });
  await metadata(page);
  await page
    .getByRole('button', { name: 'Review observations', exact: true })
    .click();
  await expect(
    page.getByRole('region', { name: 'Reviewed data' }),
  ).toContainText('4 observations');
  await page.getByLabel('Import country data file').setInputFiles({
    name: 'formula.xlsx',
    mimeType:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from(await illustrativeWorkbook(true)),
  });
  await expect(page.locator('.data-dialog').getByRole('alert')).toContainText(
    'Formula at row 2, column 3',
  );
  await page.getByLabel('Import country data file').setInputFiles({
    name: 'unknown.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('country,year,value\nAtlantis,2020,5'),
  });
  await expect(page.getByLabel('Data worksheet')).toBeVisible();
  await metadata(page);
  await page
    .getByRole('button', { name: 'Review observations', exact: true })
    .click();
  await expect(page.locator('.data-dialog').getByRole('alert')).toContainText(
    'Row 2: unknown',
  );
  await expect(
    page.getByRole('button', { name: 'Add reviewed choropleth', exact: true }),
  ).toHaveCount(0);
  expect(await page.evaluate(() => window.studio!.getProject())).toEqual(
    before,
  );
  await page.getByLabel('Import country data file').setInputFiles({
    name: 'illustrative.xlsx',
    mimeType:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from(await illustrativeWorkbook()),
  });
  await expect(page.getByLabel('Data worksheet')).toBeVisible();
  await page.getByLabel('Data worksheet').selectOption({ label: 'Dữ liệu' });
  await metadata(page);
  await page
    .getByRole('button', { name: 'Review observations', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Add reviewed choropleth', exact: true })
    .click();
  expect(
    (await page.evaluate(() => window.studio!.getProject())).datasets[0]!
      .records,
  ).toHaveLength(4);
});
test('choropleth data years and legends export actual MP4/PNG through crossfade with preview parity', async ({
  page,
  request,
}) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 2200, height: 1400 });
  await buildCsv(page, 1);
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
  await mkdir('test-results/data', { recursive: true });
  const output = resolve('test-results/data/choropleth.mp4');
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
    resolve('test-results/data/decoded-%02d.png'),
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
        .screenshot({ path: `test-results/data/preview-${frame}.png` }),
    );
    const decoded = PNG.sync.read(
      await readFile(
        `test-results/data/decoded-${String(index + 1).padStart(2, '0')}.png`,
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
  await writeFile('test-results/data/frame.png', pngBytes);
  const previewBytes = await page
    .getByTestId('map-surface')
    .screenshot({ path: 'test-results/data/png-preview.png' });
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
    'test-results/data/parity.json',
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
    'test-results/data/ffprobe.json',
    JSON.stringify(probe, null, 2),
  );
});
