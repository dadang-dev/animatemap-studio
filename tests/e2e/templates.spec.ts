import { test, expect, type Page } from '@playwright/test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';
import type { RenderJob } from '../../packages/project-schema/src/index';
const exec = promisify(execFile);
async function library(page: Page) {
  await page.getByRole('button', { name: 'Project ▾' }).click();
  await page
    .getByRole('button', { name: 'Template library', exact: true })
    .click();
  await expect(
    page.getByRole('dialog', { name: 'Template library' }),
  ).toBeVisible();
}

test('bundled templates create independent projects and saved templates survive refresh', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForFunction(() => !!window.studio);
  const original = await page.evaluate(() => window.studio!.getProject());
  await library(page);
  await page.getByLabel('Find a template').fill('portrait');
  await expect(page.locator('.template-card')).toHaveCount(1);
  await page.getByLabel('Use template Hanoi portrait').click();
  const portrait = await page.evaluate(() => window.studio!.getProject());
  expect(portrait.canvas).toEqual({ width: 1080, height: 1920, fps: 30 });
  expect(portrait.id).not.toBe(original.id);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  expect(await page.evaluate(() => window.studio!.getProject())).toEqual(
    original,
  );
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await library(page);
  await page.getByLabel('Saved template name').fill('My Hà Nội story');
  await page.getByRole('button', { name: 'Save current as template' }).click();
  await expect(page.getByLabel('Use template My Hà Nội story')).toBeVisible();
  await page.screenshot({ path: 'test-results/phase-6-templates.png' });
  await page.getByRole('button', { name: 'Close templates' }).click();
  await page.reload();
  await page.waitForFunction(() => !!window.studio);
  await library(page);
  await page.getByLabel('Find a template').fill('My Hà Nội');
  await page.getByLabel('Use template My Hà Nội story').click();
  const instance = await page.evaluate(() => window.studio!.getProject());
  expect(instance.id).not.toBe(portrait.id);
  expect(instance.scenes[0]!.layers[0]!.id).not.toBe(
    portrait.scenes[0]!.layers[0]!.id,
  );
  expect(instance.map).toEqual(portrait.map);
  await library(page);
  await page.getByLabel('Delete template My Hà Nội story').click();
  await expect(page.getByLabel('Use template My Hà Nội story')).toHaveCount(0);
  await page.getByRole('button', { name: 'Close templates' }).click();
  await page.reload();
  await page.waitForFunction(() => !!window.studio);
  await library(page);
  await expect(page.getByLabel('Use template My Hà Nội story')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('camera presets create editable keys, update preview, and undo atomically', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForFunction(() => !!window.studio);
  const before = await page.evaluate(() => window.studio!.getProject());
  await page.getByLabel('Camera preset', { exact: true }).selectOption('orbit');
  await page.getByRole('button', { name: 'Apply camera preset' }).click();
  const orbit = await page.evaluate(() => window.studio!.getProject());
  expect(orbit.scenes[0]!.camera.keyframes).toHaveLength(9);
  await page.getByLabel('Playhead').fill('3');
  const at3 = await page.evaluate(() => window.studio!.evaluate(3).camera);
  expect(at3.bearing).toBe(90);
  expect(
    await page.evaluate(() => window.studio!.renderer.map.getBearing()),
  ).toBeCloseTo(90);
  await page.getByLabel('Playhead').fill('9');
  await page.getByLabel('Playhead').fill('3');
  expect(await page.evaluate(() => window.studio!.evaluate(3).camera)).toEqual(
    at3,
  );
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  expect(await page.evaluate(() => window.studio!.getProject())).toEqual(
    before,
  );
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  expect(await page.evaluate(() => window.studio!.getProject())).toEqual(orbit);
  for (const kind of ['sweep', 'bounce', 'flyTo']) {
    await page.getByLabel('Camera preset', { exact: true }).selectOption(kind);
    await page.getByRole('button', { name: 'Apply camera preset' }).click();
    const keys = (await page.evaluate(() => window.studio!.getProject()))
      .scenes[0]!.camera.keyframes;
    expect(keys[0]!.time).toBe(0);
    expect(keys.at(-1)!.time).toBe(12);
  }
});

test('saved template transactions retain changes made from another tab', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await page.waitForFunction(() => !!window.studio);
  await library(page);
  const other = await context.newPage();
  await other.goto('/');
  await other.waitForFunction(() => !!window.studio);
  await library(other);
  await page.getByLabel('Saved template name').fill('First tab');
  await page.getByRole('button', { name: 'Save current as template' }).click();
  await expect(page.getByLabel('Use template First tab')).toBeVisible();
  await other.getByLabel('Saved template name').fill('Second tab');
  await other.getByRole('button', { name: 'Save current as template' }).click();
  await expect(other.getByLabel('Use template First tab')).toBeVisible();
  await expect(other.getByLabel('Use template Second tab')).toBeVisible();
  await page.getByLabel('Delete template First tab').click();
  await expect(page.getByLabel('Use template Second tab')).toBeVisible();
  await expect(page.getByLabel('Use template First tab')).toHaveCount(0);
  await other.close();
});

test('portrait template orbit produces real MP4 with preview parity', async ({
  page,
  request,
}) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 1440, height: 2200 });
  await page.goto('/');
  await page.waitForFunction(() => !!window.studio);
  await library(page);
  await page.getByLabel('Use template Hanoi portrait').click();
  await page.getByLabel('Scene duration', { exact: true }).fill('2');
  await page.getByRole('button', { name: 'Apply camera preset' }).click();
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
  await mkdir('test-results/templates', { recursive: true });
  const output = resolve('test-results/templates/portrait-orbit.mp4');
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
  expect([probe.streams[0].width, probe.streams[0].height]).toEqual([
    1080, 1920,
  ]);
  expect(probe.streams[0].codec_name).toBe('h264');
  expect(probe.streams[0].pix_fmt).toBe('yuv420p');
  expect(Number(probe.streams[0].nb_read_frames)).toBe(60);
  await exec('ffmpeg', [
    '-y',
    '-i',
    output,
    '-vf',
    'select=eq(n\\,0)+eq(n\\,15)+eq(n\\,30)+eq(n\\,45)',
    '-fps_mode',
    'vfr',
    resolve('test-results/templates/decoded-%02d.png'),
  ]);
  await page.evaluate(() => {
    Object.assign(document.querySelector<HTMLElement>('.composition')!.style, {
      position: 'fixed',
      left: '0',
      top: '0',
      width: '1080px',
      height: '1920px',
      maxHeight: 'none',
      zIndex: '50',
    });
  });
  const comparisons = [];
  for (const [index, frame] of [0, 15, 30, 45].entries()) {
    await page.evaluate((time) => window.studio!.seek(time), frame / 30);
    await page.evaluate(() => window.studio!.renderer.ready());
    const expected = PNG.sync.read(
      await page
        .getByTestId('map-surface')
        .screenshot({ path: `test-results/templates/preview-${frame}.png` }),
    );
    const decoded = PNG.sync.read(
      await readFile(
        `test-results/templates/decoded-${String(index + 1).padStart(2, '0')}.png`,
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
    expect(
      await page.evaluate(
        (time) => window.studio!.evaluate(time).camera.bearing,
        frame / 30,
      ),
    ).toBe([0, 90, -180, -90][index]);
    comparisons.push({ frame, meanAbsoluteChannelError: mean });
  }
  await expect(page.locator('.map-credit')).toContainText('Natural Earth');
  await expect(page.locator('.map-overlays')).toContainText('HÀ NỘI');
  await writeFile(
    'test-results/templates/parity.json',
    JSON.stringify({ comparisons }, null, 2),
  );
  await writeFile(
    'test-results/templates/ffprobe.json',
    JSON.stringify(probe, null, 2),
  );
});
