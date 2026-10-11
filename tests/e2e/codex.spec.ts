import { test, expect, type Page } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';
import { type RenderJob } from '../../packages/project-schema/src/index';
import { proposalFixture } from '../../packages/project-schema/src/proposals.fixture';
import { normalizeProposal } from '../../apps/api/src/proposals';
const exec = promisify(execFile);
async function open(page: Page) {
  await page
    .getByRole('button', { name: 'Create with Codex', exact: true })
    .click();
  await page
    .getByLabel('Codex map prompt')
    .fill('A two-second Vietnam composition');
}
async function seek(page: Page, time: number) {
  await page.evaluate((t) => window.studio!.seek(t), time);
  await page.evaluate(() => window.studio!.renderer.ready());
}
test('authored proposal protocol: review/discard, atomic apply/undo/redo, persistence and locked content', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForFunction(() => !!window.studio);
  const original = await page.evaluate(() => window.studio!.getProject());
  const proposed = normalizeProposal(proposalFixture, original);
  await page.route('**/api/ai/status', (r) =>
    r.fulfill({ json: { available: true, busy: false } }),
  );
  await page.route('**/api/ai/propose', (r) =>
    r.fulfill({
      json: {
        project: proposed,
        proposal: proposalFixture,
        summary: proposalFixture.summary,
        provider: {
          name: 'Authored protocol fixture',
          model: 'Not a model response',
          toolCalls: 0,
          elapsedMs: 0,
          usage: {},
        },
      },
    }),
  );
  await open(page);
  await page
    .getByRole('button', { name: 'Generate proposal', exact: true })
    .click();
  await expect(
    page.getByRole('region', { name: 'Codex proposal review' }),
  ).toContainText('Authored protocol fixture');
  expect(await page.evaluate(() => window.studio!.getProject())).toEqual(
    original,
  );
  await page
    .getByRole('button', { name: 'Discard proposal', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Apply reviewed proposal' }),
  ).toHaveCount(0);
  expect(await page.evaluate(() => window.studio!.getProject())).toEqual(
    original,
  );
  await page
    .getByRole('button', { name: 'Generate proposal', exact: true })
    .click();
  await page.getByRole('button', { name: 'Apply reviewed proposal' }).click();
  expect(await page.evaluate(() => window.studio!.getProject())).toEqual(
    proposed,
  );
  await page.getByRole('button', { name: 'Close Codex proposals' }).click();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  expect(await page.evaluate(() => window.studio!.getProject())).toEqual(
    original,
  );
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await page.waitForTimeout(800);
  await page.reload();
  await page.waitForFunction(() => !!window.studio);
  expect(await page.evaluate(() => window.studio!.getProject())).toEqual(
    proposed,
  );
  proposed.scenes[0]!.layers[0]!.locked = true;
  await page.getByLabel('Import project JSON').setInputFiles({
    name: 'locked.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(proposed)),
  });
  await open(page);
  await page
    .getByRole('button', { name: 'Generate proposal', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Apply reviewed proposal' }),
  ).toBeDisabled();
  await expect(page.getByRole('alert')).toContainText('Unlock existing');
  expect(await page.evaluate(() => window.studio!.getProject())).toEqual(
    proposed,
  );
});
test('unavailable CLI and invalid responses preserve saved project', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForFunction(() => !!window.studio);
  const original = await page.evaluate(() => window.studio!.getProject());
  await page.route('**/api/ai/status', (r) =>
    r.fulfill({ json: { available: false, busy: false } }),
  );
  await open(page);
  await expect(
    page.getByRole('button', { name: 'Generate proposal', exact: true }),
  ).toBeDisabled();
  await expect(page.getByRole('dialog')).toContainText('Codex CLI unavailable');
  await page.getByRole('button', { name: 'Close Codex proposals' }).click();
  await page.unroute('**/api/ai/status');
  await page.route('**/api/ai/status', (r) =>
    r.fulfill({ json: { available: true, busy: false } }),
  );
  await page.route('**/api/ai/propose', (r) =>
    r.fulfill({ json: { project: { schemaVersion: 999 } } }),
  );
  await open(page);
  await page
    .getByRole('button', { name: 'Generate proposal', exact: true })
    .click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Apply reviewed proposal' }),
  ).toHaveCount(0);
  expect(await page.evaluate(() => window.studio!.getProject())).toEqual(
    original,
  );
});
test('actual signed-in Codex proposal produces a real deterministic PNG and MP4 @live-codex', async ({
  page,
  request,
}) => {
  test.skip(
    process.env.ANIMATEMAP_LIVE_CODEX !== '1',
    'Explicit opt-in uses the installed signed-in Codex account',
  );
  test.setTimeout(260000);
  await page.setViewportSize({ width: 2200, height: 1400 });
  await page.goto('/');
  await page.waitForFunction(() => !!window.studio);
  const original = await page.evaluate(() => window.studio!.getProject());
  await open(page);
  await page
    .getByLabel('Codex map prompt')
    .fill(
      'Create exactly one 2-second Vietnam scene at the existing canvas. Highlight VNM, include verified Hanoi and Ho Chi Minh City markers, an illustrative connection between them, and screen text "Hành trình Việt Nam". Camera starts at lng 106 lat 16 zoom 5 pitch 0 bearing 0 and gently moves to zoom 5.2 by 2 seconds. Use only supplied place IDs, no external tools.',
    );
  const responsePromise = page.waitForResponse(
    (r) => r.url().endsWith('/api/ai/propose'),
    { timeout: 125000 },
  );
  await page
    .getByRole('button', { name: 'Generate proposal', exact: true })
    .click();
  const response = await responsePromise;
  const review = await response.json();
  expect(response.ok(), JSON.stringify(review)).toBe(true);
  await expect(
    page.getByRole('region', { name: 'Codex proposal review' }),
  ).toContainText('Codex CLI');
  expect(review.provider.toolCalls).toBe(0);
  expect(await page.evaluate(() => window.studio!.getProject())).toEqual(
    original,
  );
  await page.getByRole('button', { name: 'Apply reviewed proposal' }).click();
  await page.getByRole('button', { name: 'Close Codex proposals' }).click();
  const project = await page.evaluate(() => window.studio!.getProject());
  expect(project.durationSeconds).toBe(2);
  expect(
    project.scenes
      .flatMap((s) => s.layers)
      .some((l) => l.type === 'text' && l.text.includes('Việt Nam')),
  ).toBe(true);
  const marker = project.scenes
    .flatMap((s) => s.layers)
    .find(
      (l) =>
        l.type === 'marker' && l.geographySource?.sourceId === 'ne-1159151251',
    );
  expect(marker).toMatchObject({
    anchor: { type: 'map', coordinates: [105.848068, 21.035273] },
  });
  await mkdir('test-results/codex', { recursive: true });
  await writeFile(
    'test-results/codex/review.json',
    JSON.stringify(review, null, 2),
  );
  await writeFile(
    'test-results/codex/project.json',
    JSON.stringify(project, null, 2),
  );
  const job = (await (
    await request.post('/api/jobs', { data: { project, format: 'mp4' } })
  ).json()) as RenderJob;
  await expect
    .poll(
      async () => {
        const current = (await (
          await request.get(`/api/jobs/${job.id}`)
        ).json()) as RenderJob;
        if (current.state === 'failed') throw new Error(current.error);
        return current.state;
      },
      { timeout: 100000, intervals: [1000] },
    )
    .toBe('completed');
  const output = resolve('test-results/codex/codex-vietnam.mp4');
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
  const count = Math.ceil(project.durationSeconds * project.canvas.fps),
    middle = Math.floor(count / 2);
  expect(Number(probe.streams[0].nb_read_frames)).toBe(count);
  expect(probe.streams[0]).toMatchObject({
    codec_name: 'h264',
    pix_fmt: 'yuv420p',
    width: 1920,
    height: 1080,
  });
  const frames = [0, middle, count - 1];
  await exec('ffmpeg', [
    '-y',
    '-i',
    output,
    '-vf',
    frames
      .map((f) => `eq(n\\,${f})`)
      .join('+')
      .replace(/^/, 'select='),
    '-fps_mode',
    'vfr',
    resolve('test-results/codex/decoded-%02d.png'),
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
  for (const [index, frame] of frames.entries()) {
    await seek(page, frame / project.canvas.fps);
    await expect(page.locator('.map-credit')).toContainText(
      'Natural Earth places',
    );
    const preview = PNG.sync.read(
      await page
        .getByTestId('map-surface')
        .screenshot({ path: `test-results/codex/preview-${frame}.png` }),
    );
    const decoded = PNG.sync.read(
      await readFile(
        `test-results/codex/decoded-${String(index + 1).padStart(2, '0')}.png`,
      ),
    );
    let difference = 0;
    for (let p = 0; p < preview.data.length; p += 4)
      for (let c = 0; c < 3; c++)
        difference += Math.abs(preview.data[p + c]! - decoded.data[p + c]!);
    const mean = difference / (preview.width * preview.height * 3);
    expect(mean).toBeLessThan(3);
    comparisons.push({ frame, meanAbsoluteChannelError: mean });
    await seek(page, 0.1);
    await seek(page, frame / project.canvas.fps);
    expect(
      PNG.sync
        .read(await page.getByTestId('map-surface').screenshot())
        .data.equals(preview.data),
    ).toBe(true);
  }
  const png = (await (
    await request.post('/api/jobs', {
      data: { project, format: 'png', frameIndex: middle },
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
  const bytes = await (
    await request.get(`/api/jobs/${png.id}/download`)
  ).body();
  await writeFile('test-results/codex/frame.png', bytes);
  await seek(page, middle / project.canvas.fps);
  expect(
    PNG.sync
      .read(bytes)
      .data.equals(
        PNG.sync.read(await page.getByTestId('map-surface').screenshot()).data,
      ),
  ).toBe(true);
  await writeFile(
    'test-results/codex/parity.json',
    JSON.stringify(
      {
        source:
          'Actual signed-in Codex CLI generation; no intercepted provider response',
        provider: review.provider,
        comparisons,
        repeatedSeeksIdentical: true,
        png: { frame: middle, identical: true },
      },
      null,
      2,
    ),
  );
  await writeFile(
    'test-results/codex/ffprobe.json',
    JSON.stringify(probe, null, 2),
  );
});
