import { test, expect } from '@playwright/test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';
import type { RenderJob } from '../../packages/project-schema/src/index';
const exec = promisify(execFile);

test('scene controls create, reorder, trim, undo, persist, and round-trip JSON', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForFunction(() => !!window.studio);
  await page
    .getByRole('button', { name: 'Duplicate scene', exact: true })
    .click();
  await page.getByLabel('Scene name', { exact: true }).fill('South · Việt Nam');
  await page.getByLabel('Scene duration', { exact: true }).fill('2');
  let project = await page.evaluate(() => window.studio!.getProject());
  expect(project.scenes.map((scene) => scene.startSeconds)).toEqual([0, 12]);
  expect(project.durationSeconds).toBe(14);
  expect(project.scenes[1]!.layers[0]!.id).not.toBe(
    project.scenes[0]!.layers[0]!.id,
  );
  await page.getByRole('button', { name: 'Jump to scene 1: Opening' }).click();
  await page
    .getByRole('button', { name: 'Camera keyframe 12', exact: true })
    .click();
  await expect(page.getByLabel('Keyframe time', { exact: true })).toHaveValue(
    '12',
  );
  await expect(
    page.getByRole('button', { name: 'Select scene 1: Opening' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page
    .getByRole('button', { name: 'Jump to scene 2: South · Việt Nam' })
    .click();
  await page.getByLabel('Move scene earlier').click();
  await expect(
    page.getByRole('button', { name: 'Select scene 1: South · Việt Nam' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  expect(
    (await page.evaluate(() => window.studio!.getProject())).scenes[0]!.name,
  ).toBe('Opening');
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await page.getByRole('button', { name: 'Add scene', exact: true }).click();
  await page.getByLabel('Scene name', { exact: true }).fill('Outro');
  await page.getByRole('button', { name: 'Add text', exact: true }).click();
  await page.getByLabel('Text', { exact: true }).fill('Hẹn gặp lại');
  await page.getByRole('button', { name: 'Delete scene', exact: true }).click();
  expect(
    (await page.evaluate(() => window.studio!.getProject())).scenes,
  ).toHaveLength(2);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await page.getByRole('button', { name: 'Jump to scene 3: Outro' }).click();
  await expect(page.locator('.map-overlays')).toContainText('Hẹn gặp lại');
  project = await page.evaluate(() => window.studio!.getProject());
  expect(project.scenes.map((scene) => scene.startSeconds)).toEqual([0, 2, 14]);
  expect(project.durationSeconds).toBe(19);
  await expect(page.getByText('Saved locally', { exact: false })).toBeVisible();
  await page.reload();
  await page.waitForFunction(() => !!window.studio);
  expect(await page.evaluate(() => window.studio!.getProject())).toEqual(
    project,
  );
  await page.getByRole('button', { name: 'Project ▾' }).click();
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON', exact: true }).click();
  const download = await downloading;
  const json = await readFile((await download.path())!, 'utf8');
  expect(JSON.parse(json)).toEqual(project);
  await page.getByRole('button', { name: 'New project', exact: true }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: 'scenes.json',
    mimeType: 'application/json',
    buffer: Buffer.from(json),
  });
  await expect
    .poll(() => page.evaluate(() => window.studio!.getProject()))
    .toEqual(project);
  await page.getByRole('button', { name: 'Close menu' }).click();
  await page.getByRole('button', { name: 'Jump to scene 2: Opening' }).click();
  await page.screenshot({ path: 'test-results/phase-6-scenes.png' });
});

test('real MP4 and preview agree immediately before, at, and after a scene cut', async ({
  page,
  request,
}) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 2200, height: 1400 });
  await page.goto('/');
  await page.waitForFunction(() => !!window.studio);
  await page.getByLabel('Scene duration', { exact: true }).fill('1');
  await page
    .getByRole('button', { name: 'Duplicate scene', exact: true })
    .click();
  await page.getByLabel('Scene name', { exact: true }).fill('Second scene');
  await page.getByLabel('Layer color').fill('#cc6655');
  await page
    .locator('.layer-list')
    .getByRole('button', { name: 'Opening title', exact: true })
    .click();
  await page.getByLabel('Text', { exact: true }).fill('Đà Nẵng · Scene two');
  await page.getByLabel('Camera lng').fill('108.2');
  await page.getByLabel('Camera lat').fill('16.06');
  await page.getByRole('button', { name: 'Add camera keyframe · K' }).click();
  const project = await page.evaluate(() => window.studio!.getProject());
  expect(project.durationSeconds).toBe(2);
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
  await mkdir('test-results/scenes', { recursive: true });
  const output = resolve('test-results/scenes/cuts.mp4');
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
  expect(probe.streams[0].codec_name).toBe('h264');
  expect(probe.streams[0].pix_fmt).toBe('yuv420p');
  expect(Number(probe.streams[0].nb_read_frames)).toBe(60);
  expect(Number(probe.format.duration)).toBeCloseTo(2, 2);
  await exec('ffmpeg', [
    '-y',
    '-i',
    output,
    '-vf',
    'select=eq(n\\,29)+eq(n\\,30)+eq(n\\,31)',
    '-fps_mode',
    'vfr',
    resolve('test-results/scenes/decoded-%02d.png'),
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
  for (const [index, frame] of [29, 30, 31].entries()) {
    const time = frame / 30;
    await page.evaluate((time) => window.studio!.seek(time), time);
    await page.evaluate(() => window.studio!.renderer.ready());
    const expected = PNG.sync.read(
      await page
        .getByTestId('map-surface')
        .screenshot({ path: `test-results/scenes/preview-${frame}.png` }),
    );
    const decoded = PNG.sync.read(
      await readFile(
        `test-results/scenes/decoded-${String(index + 1).padStart(2, '0')}.png`,
      ),
    );
    expect([decoded.width, decoded.height]).toEqual([1920, 1080]);
    let difference = 0;
    for (let pixel = 0; pixel < expected.data.length; pixel += 4)
      for (let channel = 0; channel < 3; channel++)
        difference += Math.abs(
          expected.data[pixel + channel]! - decoded.data[pixel + channel]!,
        );
    const mean = difference / (expected.width * expected.height * 3);
    expect(mean).toBeLessThan(3);
    const state = await page.evaluate(
      (time) => window.studio!.evaluate(time),
      time,
    );
    expect(state.sceneId).toBe(project.scenes[frame < 30 ? 0 : 1]!.id);
    if (frame >= 30)
      await expect(page.locator('.map-overlays')).toContainText(
        'Đà Nẵng · Scene two',
      );
    comparisons.push({ frame, time, meanAbsoluteChannelError: mean });
  }
  await writeFile(
    'test-results/scenes/ffprobe.json',
    JSON.stringify(probe, null, 2),
  );
  await writeFile(
    'test-results/scenes/parity.json',
    JSON.stringify({ comparisons }, null, 2),
  );
});
