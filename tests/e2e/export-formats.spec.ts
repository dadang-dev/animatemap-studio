import {
  test,
  expect,
  type Page,
  type APIRequestContext,
} from '@playwright/test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';
import type {
  Project,
  ExportFormat,
  RenderJob,
} from '../../packages/project-schema/src/index';
const exec = promisify(execFile);
async function setup(page: Page) {
  await page.goto('/');
  await page.waitForFunction(() => !!window.studio);
  await page.getByLabel('Scene duration', { exact: true }).fill('1');
  await page.getByLabel('Camera preset', { exact: true }).selectOption('sweep');
  await page.getByRole('button', { name: 'Apply camera preset' }).click();
}
async function downloadJob(
  request: APIRequestContext,
  job: RenderJob,
  format: ExportFormat,
) {
  await expect
    .poll(
      async () => {
        const status = (await (
          await request.get(`/api/jobs/${job.id}`)
        ).json()) as RenderJob;
        if (status.state === 'failed') throw new Error(status.error);
        return status.state;
      },
      { timeout: 300000, intervals: [1000] },
    )
    .toBe('completed');
  const response = await request.get(`/api/jobs/${job.id}/download`);
  expect(response.headers()['content-type']).toContain(
    format === 'mp4'
      ? 'video/mp4'
      : format === 'webm'
        ? 'video/webm'
        : 'image/gif',
  );
  expect(response.headers()['content-disposition']).toContain(`.${format}`);
  await mkdir('test-results/export-formats', { recursive: true });
  const path = resolve(
    `test-results/export-formats/${format === 'mp4' ? '4k60' : 'clip'}.${format}`,
  );
  await writeFile(path, await response.body());
  const probe = JSON.parse(
    (
      await exec('ffprobe', [
        '-v',
        'error',
        '-count_frames',
        '-show_streams',
        '-show_format',
        '-of',
        'json',
        path,
      ])
    ).stdout,
  );
  await writeFile(
    `test-results/export-formats/${format}-ffprobe.json`,
    JSON.stringify(probe, null, 2),
  );
  return { path, probe };
}
async function fullPreview(page: Page, project: Project) {
  await page.evaluate((canvas) => {
    Object.assign(document.querySelector<HTMLElement>('.composition')!.style, {
      position: 'fixed',
      left: '0',
      top: '0',
      width: `${canvas.width}px`,
      height: `${canvas.height}px`,
      maxHeight: 'none',
      zIndex: '50',
    });
  }, project.canvas);
}
async function compare(
  page: Page,
  path: string,
  format: ExportFormat,
  frames: number[],
  fps: number,
  limit: number,
) {
  const selector = frames.map((frame) => `eq(n\\,${frame})`).join('+');
  await exec('ffmpeg', [
    '-y',
    '-i',
    path,
    '-vf',
    `select=${selector}`,
    '-fps_mode',
    'vfr',
    resolve(`test-results/export-formats/${format}-decoded-%02d.png`),
  ]);
  const comparisons = [];
  for (const [index, frame] of frames.entries()) {
    await page.evaluate((time) => window.studio!.seek(time), frame / fps);
    await page.evaluate(() => window.studio!.renderer.ready());
    const expected = PNG.sync.read(
      await page.getByTestId('map-surface').screenshot({
        path: `test-results/export-formats/${format}-preview-${frame}.png`,
      }),
    );
    const actual = PNG.sync.read(
      await readFile(
        `test-results/export-formats/${format}-decoded-${String(index + 1).padStart(2, '0')}.png`,
      ),
    );
    expect([actual.width, actual.height]).toEqual([
      expected.width,
      expected.height,
    ]);
    let error = 0;
    for (let pixel = 0; pixel < expected.data.length; pixel += 4)
      for (let channel = 0; channel < 3; channel++)
        error += Math.abs(
          actual.data[pixel + channel]! - expected.data[pixel + channel]!,
        );
    const mean = error / (expected.width * expected.height * 3);
    expect(mean).toBeLessThan(limit);
    comparisons.push({ frame, meanAbsoluteChannelError: mean, limit });
  }
  await writeFile(
    `test-results/export-formats/${format}-parity.json`,
    JSON.stringify({ comparisons }, null, 2),
  );
}

test('editor exports a real 4K60 MP4 with exact frame count and preview parity', async ({
  page,
  request,
}) => {
  test.setTimeout(360000);
  await page.setViewportSize({ width: 4200, height: 2600 });
  await setup(page);
  await page
    .getByLabel('Canvas preset', { exact: true })
    .selectOption('3840x2160');
  await page.getByLabel('FPS', { exact: true }).selectOption('60');
  const project = await page.evaluate(() => window.studio!.getProject());
  expect(project.canvas).toEqual({ width: 3840, height: 2160, fps: 60 });
  await page.getByRole('button', { name: '↓ Export', exact: true }).click();
  await page.getByLabel('Export format', { exact: true }).selectOption('mp4');
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/jobs') &&
      response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Start export', exact: true }).click();
  const response = await responsePromise;
  expect(response.ok()).toBe(true);
  const job = (await response.json()) as RenderJob;
  const { path, probe } = await downloadJob(request, job, 'mp4');
  const stream = probe.streams[0];
  expect([stream.width, stream.height]).toEqual([3840, 2160]);
  expect(stream.codec_name).toBe('h264');
  expect(stream.pix_fmt).toBe('yuv420p');
  expect(stream.r_frame_rate).toBe('60/1');
  expect(Number(stream.nb_read_frames)).toBe(60);
  expect(Number(probe.format.duration)).toBeCloseTo(1, 2);
  await page.getByRole('button', { name: 'Close export' }).click();
  await fullPreview(page, project);
  await compare(page, path, 'mp4', [0, 30, 59], 60, 3);
  await expect(page.locator('.map-credit')).toContainText('Natural Earth');
  await expect(page.locator('.map-overlays')).toContainText('Hà Nội');
});

test('WebM and GIF contain the complete deterministic animation with correct downloads', async ({
  page,
  request,
}) => {
  test.setTimeout(360000);
  await page.setViewportSize({ width: 2200, height: 1400 });
  await setup(page);
  const project = await page.evaluate(() => window.studio!.getProject());
  for (const format of ['webm', 'gif'] as const) {
    await page.getByRole('button', { name: '↓ Export', exact: true }).click();
    await page
      .getByLabel('Export format', { exact: true })
      .selectOption(format);
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/jobs') &&
        response.request().method() === 'POST',
    );
    await page
      .getByRole('button', { name: 'Start export', exact: true })
      .click();
    const response = await responsePromise;
    expect(response.ok()).toBe(true);
    const { path, probe } = await downloadJob(
      request,
      (await response.json()) as RenderJob,
      format,
    );
    const stream = probe.streams[0];
    expect([stream.width, stream.height]).toEqual([1920, 1080]);
    expect(stream.codec_name).toBe(format === 'webm' ? 'vp9' : 'gif');
    expect(Number(stream.nb_read_frames)).toBe(30);
    expect(Math.abs(Number(probe.format.duration) - 1)).toBeLessThan(0.03);
    await page.getByRole('button', { name: 'Close export' }).click();
    await fullPreview(page, project);
    await compare(
      page,
      path,
      format,
      [0, 15, 29],
      30,
      format === 'gif' ? 5 : 3,
    );
    // Restore editor hit targets for the next format.
    await page.evaluate(() => {
      document
        .querySelector<HTMLElement>('.composition')!
        .removeAttribute('style');
    });
  }
});

test('render API rejects unsupported formats and odd video dimensions without altering the project', async ({
  page,
  request,
}) => {
  await setup(page);
  const project = await page.evaluate(() => window.studio!.getProject());
  const unsupported = await request.post('/api/jobs', {
    data: { project, format: 'avi' },
  });
  expect(unsupported.status()).toBe(400);
  const odd = structuredClone(project);
  odd.canvas.width = 1921;
  const invalid = await request.post('/api/jobs', {
    data: { project: odd, format: 'webm' },
  });
  expect(invalid.status()).toBe(400);
  expect((await invalid.json()).error).toContain('even');
  expect(await page.evaluate(() => window.studio!.getProject())).toEqual(
    project,
  );
});
