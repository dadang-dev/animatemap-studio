import {
  test,
  expect,
  type Page,
  type APIRequestContext,
} from '@playwright/test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';
import {
  audioFixtureProject,
  audioFixtureProvenance,
  toneWav,
} from '../../packages/project-schema/src/audio.fixture';
import {
  inspectEmbeddedWav,
  wavDataUrl,
  type Project,
  type RenderJob,
} from '../../packages/project-schema/src/index';
const exec = promisify(execFile);
const subtitles =
  '1\n00:00:00,250 --> 00:00:01,250\nHà Nội → Đà Nẵng\nA journey south\n\n2\n00:00:01,250 --> 00:00:02,000\nTP. Hồ Chí Minh';
async function seek(page: Page, time: number) {
  await page.evaluate((time) => window.studio!.seek(time), time);
  await page.evaluate(() => window.studio!.renderer.ready());
}
async function openAudio(page: Page) {
  await page
    .getByRole('button', { name: 'Audio & captions', exact: true })
    .click();
}
async function metadata(page: Page) {
  for (const [key, value] of Object.entries(audioFixtureProvenance))
    await page.getByLabel(`Audio ${key}`, { exact: true }).fill(value);
}
async function buildAudio(page: Page) {
  await page.goto('/');
  await page.waitForFunction(() => !!window.studio);
  await page.getByRole('button', { name: 'Project ▾' }).click();
  await page
    .getByRole('button', { name: 'Save as / Duplicate', exact: true })
    .click();
  await page.getByRole('button', { name: 'Project ▾' }).click();
  await page.getByLabel('Scene duration', { exact: true }).fill('1');
  await page
    .getByRole('button', { name: 'Duplicate scene', exact: true })
    .click();
  await page
    .getByLabel('Scene transition', { exact: true })
    .selectOption('crossfade');
  await page.getByLabel('Crossfade duration', { exact: true }).fill('0.5');
  await seek(page, 0);
  await openAudio(page);
  await page.getByLabel('Import audio file').setInputFiles({
    name: 'Synthetic tone.wav',
    mimeType: 'audio/wav',
    buffer: Buffer.from(toneWav()),
  });
  await expect(
    page.getByRole('region', { name: 'Review audio import' }),
  ).toBeVisible();
  await metadata(page);
  await page
    .getByRole('button', {
      name: 'Add reviewed audio at playhead',
      exact: true,
    })
    .click();
  await page.getByLabel('Audio duration', { exact: true }).fill('1.5');
  await page.getByLabel('Audio start', { exact: true }).fill('0.25');
  await page.getByLabel('Audio source offset', { exact: true }).fill('0.5');
  await page.getByLabel('Audio gain', { exact: true }).fill('0.5');
  await page.getByLabel('Audio fade in', { exact: true }).fill('0.25');
  await page.getByLabel('Audio fade out', { exact: true }).fill('0.25');
  await seek(page, 1);
  await page
    .getByRole('button', {
      name: 'Add audio track Synthetic tone.wav',
      exact: true,
    })
    .click();
  await page.getByLabel('Audio duration', { exact: true }).fill('0.5');
  await page.getByLabel('Audio source offset', { exact: true }).fill('0.25');
  await page.getByLabel('Audio gain', { exact: true }).fill('0.3');
  await page.getByLabel('Import captions file').setInputFiles({
    name: 'Vietnam.srt',
    mimeType: 'text/plain',
    buffer: Buffer.from(subtitles),
  });
  await expect(
    page.getByRole('region', { name: 'Review caption import' }),
  ).toContainText('2 reviewed cues');
  await page
    .getByRole('button', {
      name: 'Replace captions with reviewed cues',
      exact: true,
    })
    .click();
}
async function render(
  request: APIRequestContext,
  project: Project,
  format: 'mp4' | 'webm' | 'png',
  frameIndex = 0,
) {
  const response = await request.post('/api/jobs', {
    data: { project, format, frameIndex },
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
  return (await request.get(`/api/jobs/${job.id}/download`)).body();
}

test('local audio/caption editor preserves history, locks, source offsets, playback seeking and persistence', async ({
  page,
  request,
}) => {
  await buildAudio(page);
  await page
    .getByRole('button', { name: 'Lock audio track', exact: true })
    .click();
  await expect(page.getByLabel('Audio gain', { exact: true })).toBeDisabled();
  await page
    .getByRole('button', { name: 'Unlock audio track', exact: true })
    .click();
  await page.getByLabel('Mute audio track').check();
  await page.getByLabel('Mute audio track').uncheck();
  await page
    .getByRole('button', { name: 'Caption 1 · 0.25–1.25s', exact: true })
    .click();
  await page.getByRole('button', { name: 'Lock caption', exact: true }).click();
  await expect(page.getByLabel('Caption text')).toBeDisabled();
  await page
    .getByRole('button', { name: 'Unlock caption', exact: true })
    .click();
  await page.getByRole('button', { name: 'Close audio', exact: true }).click();
  const project = await page.evaluate(() => window.studio!.getProject());
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  expect(
    (await page.evaluate(() => window.studio!.getProject())).captions.cues[0]!
      .locked,
  ).toBe(true);
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  expect(await page.evaluate(() => window.studio!.getProject())).toEqual(
    project,
  );
  await seek(page, 0.375);
  await expect(page.locator('.project-captions')).toContainText(
    'Hà Nội → Đà Nẵng',
  );
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.studio!.audioState().state))
    .toBe('running');
  await page.evaluate(() => window.studio!.seek(0.5));
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.studio!.evaluate(
            Number(
              document
                .querySelector('.timeline-toolbar strong')!
                .textContent!.replace('s', ''),
            ),
          ).time,
      ),
    )
    .toBeGreaterThan(0.5);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() => window.studio!.audioState().scheduled.length),
    )
    .toBe(0);
  await seek(page, 1.25);
  await expect(page.locator('.project-captions')).toHaveText('TP. Hồ Chí Minh');
  expect((await request.post('/api/projects', { data: project })).ok()).toBe(
    true,
  );
  await expect(page.getByText('Saved locally', { exact: false })).toBeVisible();
  await page.reload();
  await page.waitForFunction(() => !!window.studio);
  expect(await page.evaluate(() => window.studio!.getProject())).toEqual(
    project,
  );
  await seek(page, 0.375);
  await page.screenshot({ path: 'test-results/audio-editor.png' });
});

test('caption seeking is pixel-identical across scene transitions and repeated seeks', async ({
  page,
}) => {
  await page.setViewportSize({ width: 2200, height: 1400 });
  await buildAudio(page);
  await page.getByRole('button', { name: 'Close audio', exact: true }).click();
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
  await mkdir('test-results/audio-seeks', { recursive: true });
  for (const frame of [0, 10, 20, 37, 59]) {
    await seek(page, frame / 30);
    const preview = PNG.sync.read(
      await page
        .getByTestId('map-surface')
        .screenshot({ path: `test-results/audio-seeks/first-${frame}.png` }),
    );
    await seek(page, 1.9);
    await seek(page, frame / 30);
    const repeated = PNG.sync.read(
      await page
        .getByTestId('map-surface')
        .screenshot({ path: `test-results/audio-seeks/repeated-${frame}.png` }),
    );
    let changed = 0,
      maximum = 0,
      minX = 1920,
      minY = 1080,
      maxX = 0,
      maxY = 0;
    for (let pixel = 0; pixel < preview.data.length; pixel += 4)
      for (let channel = 0; channel < 4; channel++) {
        const difference = Math.abs(
          preview.data[pixel + channel]! - repeated.data[pixel + channel]!,
        );
        if (difference) {
          changed++;
          maximum = Math.max(maximum, difference);
          const x = (pixel / 4) % 1920,
            y = Math.floor(pixel / 4 / 1920);
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    expect(
      changed,
      JSON.stringify({ frame, changed, maximum, minX, minY, maxX, maxY }),
    ).toBe(0);
  }
});
test('embedded audio JSON above five MiB round-trips through the editor and paused playback evicts old samples', async ({
  page,
}) => {
  await buildAudio(page);
  await page.getByRole('button', { name: 'Close audio', exact: true }).click();
  await seek(page, 0.375);
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() => window.studio!.audioState().decodedAssets.length),
    )
    .toBe(1);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  const project = audioFixtureProject();
  project.id = 'audio-json-large';
  project.audioAssets[0]!.dataUrl = wavDataUrl(toneWav(50));
  const json = JSON.stringify(project);
  expect(Buffer.byteLength(json)).toBeGreaterThan(5 * 1024 * 1024);
  await page.getByLabel('Import project JSON').setInputFiles({
    name: 'audio-project.json',
    mimeType: 'application/json',
    buffer: Buffer.from(json),
  });
  await expect
    .poll(() => page.evaluate(() => window.studio!.getProject().id))
    .toBe(project.id);
  expect(await page.evaluate(() => window.studio!.getProject())).toEqual(
    project,
  );
  await expect
    .poll(() =>
      page.evaluate(() => window.studio!.audioState().decodedAssets.length),
    )
    .toBe(0);
  await expect(page.getByText('Saved locally', { exact: false })).toBeVisible();
  await page.reload();
  await page.waitForFunction(() => !!window.studio);
  expect(await page.evaluate(() => window.studio!.getProject())).toEqual(
    project,
  );
});

test('real Web Audio scheduling matches the shared model at ordinary and resumed offsets', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForFunction(() => !!window.studio);
  const results = await page.evaluate(async (project) => {
    const modulePath = '/src/AudioPlayback.ts';
    const { decodeAudioAsset, audioMaster, scheduleAudioTrack, audioGainAt } =
      await import(modulePath);
    const results: number[] = [];
    for (const start of [0, 0.375, 1.625]) {
      const frames = Math.round((2 - start) * 48000),
        context = new OfflineAudioContext(2, frames, 48000);
      const buffer = decodeAudioAsset(context, project.audioAssets[0]),
        master = audioMaster(context, context.destination);
      for (const track of project.audioTracks)
        scheduleAudioTrack(context, master, buffer, track, start, 0);
      const output = await context.startRendering();
      let maximum = 0;
      for (let frame = 0; frame < frames; frame++) {
        const time = start + frame / 48000;
        const expected = Math.max(
          -1,
          Math.min(
            1,
            project.audioTracks.reduce((sum, track) => {
              const gain = audioGainAt(track, time);
              if (!gain) return sum;
              return (
                sum +
                gain *
                  buffer.getChannelData(0)[
                    Math.round(
                      (track.sourceStartSeconds + time - track.startSeconds) *
                        48000,
                    )
                  ]
              );
            }, 0),
          ),
        );
        for (let channel = 0; channel < 2; channel++)
          maximum = Math.max(
            maximum,
            Math.abs(expected - output.getChannelData(channel)[frame]!),
          );
      }
      results.push(maximum);
    }
    return results;
  }, audioFixtureProject());
  for (const maximum of results) expect(maximum).toBeLessThan(0.00008);
});

test('microphone voiceover produces real PCM; stopping, discarding and closing release capture', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['microphone']);
  await page.addInitScript(() => {
    const original = navigator.mediaDevices.getUserMedia.bind(
      navigator.mediaDevices,
    );
    const owned: MediaStream[] = [];
    const starts: number[] = [];
    Object.assign(window, { capturedStreams: owned, captureStarts: starts });
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      const stream = await original(constraints);
      owned.push(stream);
      starts.push(performance.now());
      return stream;
    };
  });
  try {
    await page.goto('http://127.0.0.1:5173/');
    await page.waitForFunction(() => !!window.studio);
    await openAudio(page);
    await page
      .getByRole('button', { name: 'Record voiceover', exact: true })
      .click();
    await expect(page.getByText('Recording locally', { exact: false }))
      .toBeVisible()
      .catch(async (error: Error) => {
        throw new Error(
          `${error.message}\n${await page.locator('.audio-dialog').innerText()}`,
        );
      });
    await page.waitForFunction(
      () =>
        performance.now() -
          (window as unknown as { captureStarts: number[] }).captureStarts.at(
            -1,
          )! >
        1200,
    );
    await page
      .getByRole('button', { name: 'Stop recording', exact: true })
      .click();
    await expect(
      page.getByRole('region', { name: 'Review audio import' }),
    ).toBeVisible();
    await metadata(page);
    await page
      .getByRole('button', {
        name: 'Add reviewed audio at playhead',
        exact: true,
      })
      .click();
    const project = await page.evaluate(() => window.studio!.getProject());
    expect(
      inspectEmbeddedWav(project.audioAssets[0]!.dataUrl).duration,
    ).toBeGreaterThan(0.5);
    await page
      .getByRole('button', { name: 'Record voiceover', exact: true })
      .click();
    await expect(
      page.getByText('Recording locally', { exact: false }),
    ).toBeVisible();
    await page
      .getByRole('button', { name: 'Discard recording', exact: true })
      .click();
    await expect(
      page.getByRole('button', { name: 'Record voiceover', exact: true }),
    ).toBeEnabled();
    await page
      .getByRole('button', { name: 'Record voiceover', exact: true })
      .click();
    await expect(
      page.getByText('Recording locally', { exact: false }),
    ).toBeVisible();
    await page
      .getByRole('button', { name: 'Close audio', exact: true })
      .click();
    expect(
      await page.evaluate(() =>
        (
          window as unknown as { capturedStreams: MediaStream[] }
        ).capturedStreams.every((stream) =>
          stream.getTracks().every((track) => track.readyState === 'ended'),
        ),
      ),
    ).toBe(true);
    expect(await page.evaluate(() => window.studio!.getProject())).toEqual(
      project,
    );
  } finally {
    await page.close();
  }
});

test('actual MP4/WebM mix audio and render Unicode captions through crossfade with PNG/preview parity', async ({
  page,
  request,
}) => {
  test.setTimeout(360000);
  await page.setViewportSize({ width: 2200, height: 1400 });
  await buildAudio(page);
  await page.getByRole('button', { name: 'Close audio', exact: true }).click();
  const project = await page.evaluate(() => window.studio!.getProject());
  await mkdir('test-results/audio', { recursive: true });
  const probes: Record<string, unknown> = {},
    audioErrors: Record<string, unknown> = {};
  for (const format of ['mp4', 'webm'] as const) {
    const output = resolve(`test-results/audio/captions.${format}`);
    await writeFile(output, await render(request, project, format));
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
    probes[format] = probe;
    expect(
      Number(
        probe.streams.find(
          (stream: { codec_type: string }) => stream.codec_type === 'video',
        ).nb_read_frames,
      ),
    ).toBe(60);
    expect(
      probe.streams.find(
        (stream: { codec_type: string }) => stream.codec_type === 'audio',
      ),
    ).toMatchObject({
      codec_name: format === 'mp4' ? 'aac' : 'opus',
      sample_rate: '48000',
      channels: 2,
    });
    const decodedPath = resolve(`test-results/audio/decoded-${format}.f32`);
    await exec('ffmpeg', [
      '-y',
      '-i',
      output,
      '-vn',
      '-ac',
      '2',
      '-ar',
      '48000',
      '-t',
      '2',
      '-f',
      'f32le',
      decodedPath,
    ]);
    const decoded = await readFile(decodedPath);
    const expectedProject = audioFixtureProject(),
      source = new DataView(toneWav().buffer);
    // Evaluate the independent shared gain model against lossy encoded audio, including silence and overlap.
    const { audioGainAt } =
      await import('../../packages/animation-core/src/index');
    let squaredError = 0,
      silentPeak = 0;
    for (let frame = 0; frame < Math.min(96000, decoded.length / 8); frame++) {
      const time = frame / 48000,
        expected = expectedProject.audioTracks.reduce((sum, track) => {
          const gain = audioGainAt(track, time);
          if (!gain) return sum;
          return (
            sum +
            (gain *
              source.getInt16(
                44 +
                  Math.round(
                    (track.sourceStartSeconds + time - track.startSeconds) *
                      48000,
                  ) *
                    2,
                true,
              )) /
              32768
          );
        }, 0),
        actual = decoded.readFloatLE(frame * 8);
      squaredError += (expected - actual) ** 2;
      if (time < 0.2 || time > 1.8)
        silentPeak = Math.max(silentPeak, Math.abs(actual));
    }
    const rmsError = Math.sqrt(squaredError / 96000);
    expect(rmsError).toBeLessThan(0.015);
    expect(silentPeak).toBeLessThan(0.001);
    audioErrors[format] = { rmsError, silentPeak };
  }
  await exec('ffmpeg', [
    '-y',
    '-i',
    resolve('test-results/audio/captions.mp4'),
    '-vf',
    'select=eq(n\\,0)+eq(n\\,10)+eq(n\\,20)+eq(n\\,37)+eq(n\\,59)',
    '-fps_mode',
    'vfr',
    resolve('test-results/audio/decoded-%02d.png'),
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
  for (const [index, frame] of [0, 10, 20, 37, 59].entries()) {
    await seek(page, frame / 30);
    const preview = PNG.sync.read(
        await page.getByTestId('map-surface').screenshot(),
      ),
      decoded = PNG.sync.read(
        await readFile(
          `test-results/audio/decoded-${String(index + 1).padStart(2, '0')}.png`,
        ),
      );
    let difference = 0;
    for (let pixel = 0; pixel < preview.data.length; pixel += 4)
      for (let channel = 0; channel < 3; channel++)
        difference += Math.abs(
          preview.data[pixel + channel]! - decoded.data[pixel + channel]!,
        );
    const mean = difference / (preview.width * preview.height * 3);
    expect(mean).toBeLessThan(3);
    comparisons.push({ frame, meanAbsoluteChannelError: mean });
    await seek(page, 1.9);
    await seek(page, frame / 30);
    expect(
      PNG.sync
        .read(await page.getByTestId('map-surface').screenshot())
        .data.equals(preview.data),
    ).toBe(true);
  }
  const png = await render(request, project, 'png', 37);
  await writeFile('test-results/audio/frame.png', png);
  await seek(page, 37 / 30);
  expect(
    PNG.sync
      .read(png)
      .data.equals(
        PNG.sync.read(await page.getByTestId('map-surface').screenshot()).data,
      ),
  ).toBe(true);
  await writeFile(
    'test-results/audio/parity.json',
    JSON.stringify({ comparisons, audioErrors, pngIdentical: true }, null, 2),
  );
  await writeFile(
    'test-results/audio/ffprobe.json',
    JSON.stringify(probes, null, 2),
  );
});
test('malformed audio rejects atomically and cancellation during real encoding preserves saved projects and cleans owned media', async ({
  page,
  request,
}) => {
  test.setTimeout(180000);
  await buildAudio(page);
  const before = await page.evaluate(() => window.studio!.getProject());
  const corrupt = toneWav();
  new DataView(corrupt.buffer).setUint32(4, 999, true);
  await page.getByLabel('Import audio file').setInputFiles({
    name: 'Corrupt.wav',
    mimeType: 'audio/wav',
    buffer: Buffer.from(corrupt),
  });
  await expect(page.getByRole('alert')).toContainText('RIFF WAV');
  expect(await page.evaluate(() => window.studio!.getProject())).toEqual(
    before,
  );
  await page.getByRole('button', { name: 'Close audio', exact: true }).click();
  const project = structuredClone(before);
  project.id = 'audio-cancellation';
  project.durationSeconds = 4;
  project.canvas.fps = 60;
  project.scenes[1]!.durationSeconds = 3;
  expect((await request.post('/api/projects', { data: project })).ok()).toBe(
    true,
  );
  const invalid = structuredClone(project);
  invalid.audioAssets[0]!.dataUrl = 'https://remote.example/music.wav';
  expect(
    (
      await request.post('/api/jobs', {
        data: { project: invalid, format: 'mp4' },
      })
    ).status(),
  ).toBe(400);
  const job = (await (
    await request.post('/api/jobs', { data: { project, format: 'mp4' } })
  ).json()) as RenderJob;
  await expect
    .poll(
      async () => {
        const status = (await (
          await request.get(`/api/jobs/${job.id}`)
        ).json()) as RenderJob;
        if (status.state === 'failed') throw new Error(status.error);
        return status.state;
      },
      { timeout: 150000, intervals: [100] },
    )
    .toBe('encoding');
  expect((await request.post(`/api/jobs/${job.id}/cancel`)).ok()).toBe(true);
  await expect
    .poll(
      async () =>
        ((await (await request.get(`/api/jobs/${job.id}`)).json()) as RenderJob)
          .state,
    )
    .toBe('cancelled');
  await expect
    .poll(
      async () =>
        (
          await readdir(
            resolve(
              process.env.ANIMATEMAP_E2E_RENDER_DIR ?? '.local/e2e/renders',
              job.id,
            ),
          )
        ).filter((name) => name.startsWith('frames-')),
      { timeout: 15000 },
    )
    .toEqual([]);
  expect((await request.get(`/api/jobs/${job.id}/download`)).status()).toBe(
    409,
  );
  expect(
    await (await request.get(`/api/projects/${project.id}`)).json(),
  ).toEqual(project);
});
