import { test, expect, type APIRequestContext } from '@playwright/test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';
import {
  createDemo,
  type RenderJob,
} from '../../packages/project-schema/src/index';
const exec = promisify(execFile);
async function finished(
  request: APIRequestContext,
  id: string,
  timeout = 600000,
) {
  let job: RenderJob;
  await expect
    .poll(
      async () => {
        const response = await request.get(`/api/jobs/${id}`);
        job = await response.json();
        if (job.state === 'failed') throw new Error(job.error);
        return job.state;
      },
      { timeout, intervals: [1000] },
    )
    .toBe('completed');
  return job!;
}
test('360-frame 1080p MP4 is real H.264 and decoded frames match preview', async ({
  page,
  request,
}) => {
  test.setTimeout(600000);
  const p = createDemo();
  const response = await request.post('/api/jobs', {
    data: { project: p, format: 'mp4' },
  });
  expect(response.ok()).toBe(true);
  const job = (await response.json()) as RenderJob;
  const result = await finished(request, job.id);
  expect(result.progress).toBe(1);
  await mkdir('test-results/export', { recursive: true });
  const output = resolve('test-results/export/travel.mp4');
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
        '-show_format',
        '-of',
        'json',
        output,
      ])
    ).stdout,
  );
  const stream = probe.streams[0];
  expect(stream.codec_name).toBe('h264');
  expect(stream.pix_fmt).toBe('yuv420p');
  expect(stream.width).toBe(1920);
  expect(stream.height).toBe(1080);
  expect(stream.r_frame_rate).toBe('30/1');
  expect(Number(stream.nb_read_frames)).toBe(360);
  expect(Number(probe.format.duration)).toBeCloseTo(12, 2);
  await writeFile(
    'test-results/export/ffprobe.json',
    JSON.stringify(probe, null, 2),
  );
  await exec('ffmpeg', [
    '-y',
    '-i',
    output,
    '-vf',
    'select=eq(n\\,0)+eq(n\\,90)+eq(n\\,180)+eq(n\\,270)',
    '-fps_mode',
    'vfr',
    resolve('test-results/export/decoded-%02d.png'),
  ]);
  await page.setViewportSize({ width: 2200, height: 1400 });
  await page.goto('/');
  await page.waitForFunction(() => !!window.studio);
  await page.getByRole('button', { name: 'Project ▾' }).click();
  await page.getByRole('button', { name: 'Travel demo', exact: true }).click();
  await page.getByRole('button', { name: 'Close menu' }).click();
  await page.evaluate(() => {
    const el = document.querySelector<HTMLElement>('.composition')!;
    Object.assign(el.style, {
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
  for (const [i, time] of [0, 3, 6, 9].entries()) {
    await page.getByLabel('Playhead').fill(String(time));
    await page.evaluate(() => window.studio!.renderer.ready());
    const preview = await page
      .getByTestId('map-surface')
      .screenshot({ path: `test-results/export/preview-${time}.png` });
    const decoded = PNG.sync.read(
      await readFile(
        `test-results/export/decoded-${String(i + 1).padStart(2, '0')}.png`,
      ),
    );
    const expected = PNG.sync.read(preview);
    expect(decoded.width).toBe(expected.width);
    expect(decoded.height).toBe(expected.height);
    let difference = 0;
    for (let pixel = 0; pixel < expected.data.length; pixel += 4)
      for (let channel = 0; channel < 3; channel++)
        difference += Math.abs(
          expected.data[pixel + channel]! - decoded.data[pixel + channel]!,
        );
    const mean = difference / (expected.width * expected.height * 3);
    comparisons.push({ time, meanAbsoluteChannelError: mean });
    expect(mean).toBeLessThan(3);
    expect(
      new Set(Array.from(decoded.data).filter((_, index) => index % 4 !== 3))
        .size,
    ).toBeGreaterThan(50);
  }
  await writeFile(
    'test-results/export/parity.json',
    JSON.stringify({ comparisons, elapsedMs: result.elapsedMs }, null, 2),
  );
});
test('portrait PNG and MP4 preserve exact dimensions; active export can cancel', async ({
  request,
}) => {
  test.setTimeout(180000);
  const p = createDemo();
  p.canvas = { width: 1080, height: 1920, fps: 30 };
  p.durationSeconds = 1;
  p.scenes[0]!.durationSeconds = 1;
  p.scenes[0]!.camera.keyframes = p.scenes[0]!.camera.keyframes.slice(0, 1);
  for (const l of p.scenes[0]!.layers) {
    l.timeRange.end = 1;
    l.tracks.reveal = [];
  }
  for (const format of ['png', 'mp4'] as const) {
    const response = await request.post('/api/jobs', {
      data: { project: p, format, frameIndex: 0 },
    });
    const job = (await response.json()) as RenderJob;
    await finished(request, job.id, 180000);
    const body = await (
      await request.get(`/api/jobs/${job.id}/download`)
    ).body();
    await mkdir('test-results/export', { recursive: true });
    await writeFile(`test-results/export/portrait.${format}`, body);
    if (format === 'png') {
      const png = PNG.sync.read(body);
      expect([png.width, png.height]).toEqual([1080, 1920]);
    } else {
      const probe = JSON.parse(
        (
          await exec('ffprobe', [
            '-v',
            'error',
            '-show_streams',
            '-of',
            'json',
            resolve('test-results/export/portrait.mp4'),
          ])
        ).stdout,
      );
      expect([probe.streams[0].width, probe.streams[0].height]).toEqual([
        1080, 1920,
      ]);
    }
  }
  const response = await request.post('/api/jobs', {
    data: { project: createDemo(), format: 'mp4' },
  });
  const job = (await response.json()) as RenderJob;
  await request.post(`/api/jobs/${job.id}/cancel`);
  expect((await (await request.get(`/api/jobs/${job.id}`)).json()).state).toBe(
    'cancelled',
  );
  expect((await request.get(`/api/jobs/${job.id}/download`)).status()).toBe(
    409,
  );
});
