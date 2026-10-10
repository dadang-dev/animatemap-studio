import { test, expect, type Page } from '@playwright/test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';
import type { RenderJob } from '../../packages/project-schema/src/index';
const exec = promisify(execFile);
async function build(page: Page) {
  await page.goto('/');
  await page.waitForFunction(() => !!window.studio);
  await page.getByRole('button', { name: 'Project ▾' }).click();
  await page
    .getByRole('button', { name: 'Template library', exact: true })
    .click();
  await page.getByLabel('Use template Two-country story').click();
  await page.getByLabel('Scene duration', { exact: true }).fill('1');
  await page.getByRole('button', { name: 'Select scene 2: Thailand' }).click();
  await page.getByLabel('Scene duration', { exact: true }).fill('2');
  await page
    .getByLabel('Scene transition', { exact: true })
    .selectOption('crossfade');
  return page.evaluate(() => window.studio!.getProject());
}
async function seek(page: Page, time: number) {
  await page.evaluate((time) => window.studio!.seek(time), time);
  await page.evaluate(() => window.studio!.renderer.ready());
}
function meanDifference(a: PNG, b: PNG) {
  let difference = 0;
  for (let pixel = 0; pixel < a.data.length; pixel += 4)
    for (let channel = 0; channel < 3; channel++)
      difference += Math.abs(
        a.data[pixel + channel]! - b.data[pixel + channel]!,
      );
  return difference / (a.width * a.height * 3);
}

test('crossfade composes both real scenes, repeats seeks, cleans maps and restores v1 projects', async ({
  page,
}) => {
  const project = await build(page);
  expect(project.schemaVersion).toBe(2);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(
    page.getByLabel('Scene transition', { exact: true }),
  ).toHaveValue('cut');
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await seek(page, 1.5);
  expect(
    await page.evaluate(
      () => window.studio!.evaluate(1.5).blend!.incomingWeight,
    ),
  ).toBe(0.5);
  await expect(page.locator('canvas.maplibregl-canvas')).toHaveCount(2);
  const host = page.locator('[data-crossfade="outgoing"]');
  expect(await host.evaluate((el) => (el as HTMLElement).style.opacity)).toBe(
    '0.5',
  );
  const composite = PNG.sync.read(
    await page.getByTestId('map-surface').screenshot(),
  );
  await host.evaluate((el) => {
    (el as HTMLElement).style.opacity = '0';
  });
  const incoming = PNG.sync.read(
    await page.getByTestId('map-surface').screenshot(),
  );
  await host.evaluate((el) => {
    (el as HTMLElement).style.opacity = '1';
  });
  const outgoing = PNG.sync.read(
    await page.getByTestId('map-surface').screenshot(),
  );
  let error = 0;
  for (let pixel = 0; pixel < composite.data.length; pixel += 4)
    for (let channel = 0; channel < 3; channel++)
      error += Math.abs(
        composite.data[pixel + channel]! -
          (incoming.data[pixel + channel]! + outgoing.data[pixel + channel]!) /
            2,
      );
  expect(error / (composite.width * composite.height * 3)).toBeLessThan(1.5);
  expect(meanDifference(incoming, outgoing)).toBeGreaterThan(5);
  await seek(page, 2.5);
  await expect(page.locator('canvas.maplibregl-canvas')).toHaveCount(1);
  await seek(page, 1.5);
  expect(
    meanDifference(
      composite,
      PNG.sync.read(await page.getByTestId('map-surface').screenshot()),
    ),
  ).toBeLessThan(0.1);
  await page.screenshot({ path: 'test-results/phase-6-crossfade.png' });
  await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>(
      '[data-crossfade="outgoing"] canvas',
    )!;
    canvas
      .getContext('webgl2')!
      .getExtension('WEBGL_lose_context')!
      .loseContext();
  });
  await expect(page.getByRole('status')).toContainText('WebGL context lost');
  await expect(
    page.evaluate(() => window.studio!.renderer.ready()),
  ).rejects.toThrow('WebGL context lost');
  await expect(page.getByText('Saved locally', { exact: false })).toBeVisible();
  await page.reload();
  await page.waitForFunction(() => !!window.studio);
  expect(await page.evaluate(() => window.studio!.getProject())).toEqual(
    project,
  );
  const legacy = await readFile('examples/travel-vietnam.json');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'legacy.json',
    mimeType: 'application/json',
    buffer: legacy,
  });
  await expect
    .poll(() => page.evaluate(() => window.studio!.getProject().name))
    .toBe(JSON.parse(legacy.toString()).name);
  expect(
    (await page.evaluate(() => window.studio!.getProject())).scenes[0]!
      .transition,
  ).toEqual({ type: 'cut' });
});

test('crossfade MP4 matches preview at 0, 50 and 100 percent', async ({
  page,
  request,
}) => {
  test.setTimeout(240000);
  await page.setViewportSize({ width: 2200, height: 1400 });
  const project = await build(page);
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
      { timeout: 210000, intervals: [1000] },
    )
    .toBe('completed');
  await mkdir('test-results/crossfade', { recursive: true });
  const output = resolve('test-results/crossfade/crossfade.mp4');
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
  expect(probe.streams[0].pix_fmt).toBe('yuv420p');
  expect(Number(probe.streams[0].nb_read_frames)).toBe(90);
  await exec('ffmpeg', [
    '-y',
    '-i',
    output,
    '-vf',
    'select=eq(n\\,30)+eq(n\\,45)+eq(n\\,60)',
    '-fps_mode',
    'vfr',
    resolve('test-results/crossfade/decoded-%02d.png'),
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
  for (const [index, frame] of [30, 45, 60].entries()) {
    await seek(page, frame / 30);
    const expected = PNG.sync.read(
      await page
        .getByTestId('map-surface')
        .screenshot({ path: `test-results/crossfade/preview-${frame}.png` }),
    );
    const decoded = PNG.sync.read(
      await readFile(
        `test-results/crossfade/decoded-${String(index + 1).padStart(2, '0')}.png`,
      ),
    );
    expect([decoded.width, decoded.height]).toEqual([1920, 1080]);
    const mean = meanDifference(expected, decoded);
    expect(mean).toBeLessThan(3);
    comparisons.push({ frame, meanAbsoluteChannelError: mean });
  }
  await writeFile(
    'test-results/crossfade/parity.json',
    JSON.stringify({ comparisons }, null, 2),
  );
  await writeFile(
    'test-results/crossfade/ffprobe.json',
    JSON.stringify(probe, null, 2),
  );
});
