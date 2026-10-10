import { test, expect, type Page } from '@playwright/test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';
import type { RenderJob } from '../../packages/project-schema/src/index';
const exec = promisify(execFile);
async function seek(page: Page, time: number) {
  await page.evaluate((time) => window.studio!.seek(time), time);
  await page.evaluate(() => window.studio!.renderer.ready());
}

test('animation styles create editable transform keys with history, locking, trim and persistence', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForFunction(() => !!window.studio);
  await page.locator('.layer-row').filter({ hasText: 'Hà Nội' }).click();
  await page.getByLabel('Scale', { exact: true }).fill('2');
  await page.getByLabel('Animation duration').fill('1');
  await page.getByLabel('Animation style', { exact: true }).selectOption('pop');
  const before = await page.evaluate(() => window.studio!.getProject());
  await page.getByRole('button', { name: 'Apply animation style' }).click();
  const pop = await page.evaluate(() => window.studio!.getProject());
  const marker = pop.scenes[0]!.layers.find(
    (layer) => layer.id === 'marker-0',
  )!;
  expect(marker.tracks.scale.map((key) => key.value)).toEqual([0.2, 2.3, 2]);
  await seek(page, 0.7);
  await expect(page.locator('[data-layer-id="marker-0"]')).toHaveCSS(
    'transform',
    /matrix\(2\.3/,
  );
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  expect(await page.evaluate(() => window.studio!.getProject())).toEqual(
    before,
  );
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  expect(await page.evaluate(() => window.studio!.getProject())).toEqual(pop);
  await page.getByLabel('Hà Nội scale keyframe 0.7', { exact: true }).click();
  await page.getByLabel('Keyframe value', { exact: true }).fill('2.5');
  await seek(page, 0.7);
  await expect(page.locator('[data-layer-id="marker-0"]')).toHaveCSS(
    'transform',
    /matrix\(2\.5/,
  );
  await page
    .getByRole('button', { name: 'Copy keyframe', exact: true })
    .click();
  await page.getByLabel('Hà Nội scale keyframe 1.7', { exact: true }).click();
  await page.getByLabel('Keyframe time', { exact: true }).fill('2');
  await page.getByLabel('Hà Nội scale keyframe 2', { exact: true }).click();
  await page
    .getByRole('button', { name: 'Delete keyframe', exact: true })
    .click();
  await page.getByLabel('Keyframe property').selectOption('rotation');
  await page.getByRole('button', { name: 'Add keyframe', exact: true }).click();
  await page.getByLabel('Hà Nội rotation keyframe 2', { exact: true }).click();
  await page.getByLabel('Keyframe value', { exact: true }).fill('45');
  await page.getByLabel('Toggle lock Hà Nội', { exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Apply animation style' }),
  ).toBeDisabled();
  const locked = await page.evaluate(() => window.studio!.getProject());
  await page.getByLabel('Keyframe value', { exact: true }).fill('90');
  expect(await page.evaluate(() => window.studio!.getProject())).toEqual(
    locked,
  );
  await page.getByLabel('Toggle lock Hà Nội', { exact: true }).click();
  await page.getByLabel('Scene duration', { exact: true }).fill('1');
  const trimmed = await page.evaluate(() => window.studio!.getProject());
  expect(
    trimmed.scenes[0]!.layers.find((layer) => layer.id === 'marker-0')!.tracks
      .rotation,
  ).toEqual([]);
  await expect(page.getByText('Saved locally', { exact: false })).toBeVisible();
  await page.reload();
  await page.waitForFunction(() => !!window.studio);
  expect(await page.evaluate(() => window.studio!.getProject())).toEqual(
    trimmed,
  );
  await page.getByRole('button', { name: 'Project ▾' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON', exact: true }).click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(JSON.parse(await readFile(path!, 'utf8'))).toEqual(trimmed);
  await page.locator('input[type="file"]').setInputFiles(path!);
  expect(await page.evaluate(() => window.studio!.getProject())).toEqual(
    trimmed,
  );
});

test('pop and slide animation export real MP4 with deterministic preview parity', async ({
  page,
  request,
}) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 2200, height: 1400 });
  await page.goto('/');
  await page.waitForFunction(() => !!window.studio);
  await page.getByLabel('Scene duration', { exact: true }).fill('2');
  await page.locator('.layer-row').filter({ hasText: 'Hà Nội' }).click();
  await page.getByLabel('Animation duration').fill('1');
  await page.getByLabel('Animation style', { exact: true }).selectOption('pop');
  await page.getByRole('button', { name: 'Apply animation style' }).click();
  await page.locator('.layer-row').filter({ hasText: 'Opening title' }).click();
  await page.getByLabel('Animation duration').fill('1');
  await page
    .getByLabel('Animation style', { exact: true })
    .selectOption('slideUp');
  await page.getByRole('button', { name: 'Apply animation style' }).click();
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
  await mkdir('test-results/animation-styles', { recursive: true });
  const output = resolve('test-results/animation-styles/styles.mp4');
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
  expect(probe.streams[0].codec_name).toBe('h264');
  expect(Number(probe.streams[0].nb_read_frames)).toBe(60);
  await exec('ffmpeg', [
    '-y',
    '-i',
    output,
    '-vf',
    'select=eq(n\\,0)+eq(n\\,15)+eq(n\\,21)+eq(n\\,30)',
    '-fps_mode',
    'vfr',
    resolve('test-results/animation-styles/decoded-%02d.png'),
  ]);
  await page.evaluate(() => {
    Object.assign(document.querySelector<HTMLElement>('.composition')!.style, {
      position: 'fixed',
      left: '0',
      top: '0',
      width: '1920px',
      height: '1080px',
      maxHeight: 'none',
      zIndex: '50',
    });
  });
  const comparisons = [];
  for (const [index, frame] of [0, 15, 21, 30].entries()) {
    await seek(page, frame / 30);
    const expected = PNG.sync.read(
      await page.getByTestId('map-surface').screenshot({
        path: `test-results/animation-styles/preview-${frame}.png`,
      }),
    );
    const decoded = PNG.sync.read(
      await readFile(
        `test-results/animation-styles/decoded-${String(index + 1).padStart(2, '0')}.png`,
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
    const repeat = await page.getByTestId('map-surface').screenshot();
    await seek(page, 1.8);
    await seek(page, frame / 30);
    expect(await page.getByTestId('map-surface').screenshot()).toEqual(repeat);
  }
  await writeFile(
    'test-results/animation-styles/parity.json',
    JSON.stringify({ comparisons }, null, 2),
  );
  await writeFile(
    'test-results/animation-styles/ffprobe.json',
    JSON.stringify(probe, null, 2),
  );
});
