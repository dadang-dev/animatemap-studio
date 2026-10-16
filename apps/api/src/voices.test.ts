import { test, expect } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { VoiceService } from './voices';
import { toneWav } from '../../../packages/project-schema/src/audio.fixture';
import { inspectEmbeddedWav } from '@animatemap/project-schema';
const catalogue = {
  data: [
    {
      voice_id: 'edge_vi-VN-Test',
      name: 'Test Vietnamese',
      locale: 'vi-VN',
      gender: 'Female',
      preview_url: 'https://cdn.ai33.pro/sample.mp3',
    },
    {
      voice_id: 'edge_bad',
      name: 'Bad sample',
      preview_url: 'http://127.0.0.1/private',
    },
  ],
  pagination: { has_more: false },
};
test('catalogue and samples never expose or forward API credentials to the CDN', async () => {
  const requests: { url: string; headers: Headers }[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    const url = String(input);
    requests.push({ url, headers: new Headers(init?.headers) });
    return url.startsWith('https://api.ai33.pro')
      ? Response.json(catalogue)
      : new Response(new Uint8Array([1, 2, 3]));
  };
  const service = new VoiceService(
    'unused',
    fetcher,
    async () => 'private-test-key',
  );
  const result = await service.list({ provider: 'edge' });
  expect(JSON.stringify(result)).not.toContain('private-test-key');
  expect(result.voices[1]!.preview).toBe(false);
  expect(await service.sample(result.voices[0]!.id)).toHaveLength(3);
  expect(requests[0]!.headers.get('xi-api-key')).toBe('private-test-key');
  expect(requests[1]!.headers.has('xi-api-key')).toBe(false);
  await expect(service.sample('http://localhost')).rejects.toThrow();
  await expect(service.list({ provider: 'invalid' })).rejects.toThrow();
});
test('real FFmpeg conversion preserves actual timestamps and cancellation prevents applying unfinished output', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'animatemap-voice-'));
  let doing = false;
  let submissions = 0;
  const fetcher: typeof fetch = async (input) => {
    const u = String(input);
    if (u.includes('/v3/voices')) return Response.json(catalogue);
    if (u.includes('/v3/text-to-speech')) {
      submissions++;
      return Response.json({ task_id: 'fixture-task' });
    }
    if (u.includes('/v1/task/'))
      return Response.json(
        doing
          ? { status: 'doing' }
          : {
              status: 'done',
              credit_cost: 3,
              metadata: {
                audio_url: 'https://cdn.ai33.pro/audio.mp3',
                json_url: 'https://cdn.ai33.pro/words.json',
              },
            },
      );
    if (u.endsWith('/audio.mp3'))
      return new Response(new Uint8Array(toneWav(0.5, 1)));
    if (u.endsWith('/words.json'))
      return Response.json([
        {
          words: [
            { text: 'Việt', start: 0.05, end: 0.2, type: 'word' },
            { text: 'Nam', start: 0.2, end: 0.4, type: 'word' },
          ],
        },
      ]);
    throw Error('Unexpected request');
  };
  const service = new VoiceService(dir, fetcher, async () => 'fixture-key', 5);
  try {
    await service.list({ provider: 'edge' });
    const body = {
      provider: 'edge',
      voiceId: 'edge_vi-VN-Test',
      speed: 1,
      text: 'Việt Nam',
    };
    await expect(
      service.generate({ ...body, voiceId: 'minimax_mismatch' }),
    ).rejects.toThrow('mismatch');
    const result = await service.generate(body);
    expect(inspectEmbeddedWav(result.dataUrl).sampleRate).toBe(48000);
    expect(result.words[1]!.startSeconds).toBe(0.2);
    expect(result.creditCost).toBe(3);
    const restarted = new VoiceService(
      dir,
      fetcher,
      async () => 'fixture-key',
      5,
    );
    await restarted.list({ provider: 'edge' });
    expect((await restarted.generate(body)).creditCost).toBe(0);
    expect(submissions).toBe(1);
    doing = true;
    const pending = service.generate(body);
    await new Promise((r) => setTimeout(r, 20));
    expect(service.cancel().stopped).toBe(true);
    await expect(pending).rejects.toThrow();
    expect((await service.status()).busy).toBe(false);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
