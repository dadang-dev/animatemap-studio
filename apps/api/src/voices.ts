import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve, join, sep } from 'node:path';
import { createHash } from 'node:crypto';
import {
  inspectWav,
  pcmWav,
  wavDataUrl,
  voiceQuerySchema,
  voiceGenerateSchema,
  type VoiceChoice,
} from '@animatemap/project-schema';
import { runFFmpeg } from '@animatemap/render-worker';

type Entry = VoiceChoice & { sample: string | null };
export class VoiceService {
  private entries = new Map<string, Entry>();
  private controller: AbortController | null = null;
  constructor(
    private directory = resolve(import.meta.dirname, '../../../.local/voice'),
    private fetcher: typeof fetch = fetch,
    private keyReader = async () =>
      process.env.AI33_API_KEY?.trim() ||
      (await readFile(join(directory, 'api-key.txt'), 'utf8')).trim(),
    private pollMs = 3000,
  ) {}
  async status() {
    try {
      return {
        configured: !!(await this.keyReader()),
        busy: !!this.controller,
      };
    } catch {
      return { configured: false, busy: !!this.controller };
    }
  }
  private async key() {
    try {
      const key = await this.keyReader();
      if (key) return key;
    } catch {
      /* No secret paths or values leave the server. */
    }
    throw Error(
      'AI33 is not configured. Set AI33_API_KEY or the local voice key file.',
    );
  }
  private cdn(input: unknown) {
    if (typeof input !== 'string') throw Error('Missing audio/transcript URL');
    const u = new URL(input);
    if (
      u.protocol !== 'https:' ||
      u.hostname !== 'cdn.ai33.pro' ||
      u.username ||
      u.password ||
      u.port
    )
      throw Error('Untrusted voice artifact host');
    return u.href;
  }
  private async download(url: string, limit: number, signal?: AbortSignal) {
    const res = await this.fetcher(this.cdn(url), {
      redirect: 'error',
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(45000)])
        : AbortSignal.timeout(45000),
    });
    if (!res.ok || !res.body) throw Error('Voice artifact download failed');
    if (Number(res.headers.get('content-length')) > limit)
      throw Error('Voice artifact exceeds size limit');
    const reader = res.body.getReader(),
      chunks: Uint8Array[] = [];
    let length = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.length;
        if (length > limit) throw Error('Voice artifact exceeds size limit');
        chunks.push(value);
      }
    } finally {
      await reader.cancel();
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const c of chunks) {
      bytes.set(c, offset);
      offset += c.length;
    }
    return bytes;
  }
  private async request(
    path: string,
    options: RequestInit = {},
    signal?: AbortSignal,
  ) {
    const key = await this.key();
    for (let i = 0; i < 4; i++) {
      const res = await this.fetcher('https://api.ai33.pro' + path, {
        ...options,
        headers: { 'xi-api-key': key },
        redirect: 'error',
        signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(45000)])
          : AbortSignal.timeout(45000),
      });
      if ([429, 503].includes(res.status)) {
        const delay = Math.min(
          30000,
          Math.max(
            1000,
            Number(res.headers.get('retry-after')) * 1000 || 1500 * 2 ** i,
          ),
        );
        await this.wait(delay, signal);
        continue;
      }
      if (!res.ok) throw Error(`AI33 returned HTTP ${res.status}`);
      return (await res.json()) as Record<string, unknown>;
    }
    throw Error('AI33 remains busy; try again later.');
  }
  private wait(ms: number, signal?: AbortSignal) {
    return new Promise<void>((resolve, reject) => {
      signal?.throwIfAborted();
      const stop = () => {
        clearTimeout(timer);
        reject(Error('Voice generation stopped'));
      };
      const timer = setTimeout(() => {
        signal?.removeEventListener('abort', stop);
        resolve();
      }, ms);
      signal?.addEventListener('abort', stop, { once: true });
    });
  }
  async list(input: unknown) {
    const q = voiceQuerySchema.parse(input),
      params = new URLSearchParams({
        provider: q.provider,
        language: 'Vietnamese',
        page: String(q.page),
        page_size: '100',
        search: q.search,
      });
    const raw = await this.request('/v3/voices?' + params);
    if (!Array.isArray(raw.data)) throw Error('Malformed AI33 voice catalogue');
    const choices: VoiceChoice[] = [];
    for (const value of raw.data.slice(0, 100)) {
      const v = value as Record<string, unknown>;
      if (
        typeof v.voice_id !== 'string' ||
        !v.voice_id.startsWith(q.provider + '_') ||
        typeof v.name !== 'string'
      )
        continue;
      let sample: string | null = null;
      try {
        sample = this.cdn(v.preview_url);
      } catch {
        /* Optional provider samples may be on unsupported external hosts. */
      }
      const friendly: Record<string, string> = {
        'edge_vi-VN-HoaiMyNeural': 'Hoài My',
        'edge_vi-VN-NamMinhNeural': 'Nam Minh',
      };
      const entry = {
        id: v.voice_id,
        name: friendly[v.voice_id] ?? v.name.slice(0, 200),
        gender: String(v.gender ?? ''),
        locale: String(v.locale ?? v.language ?? ''),
        preview: !!sample,
        sample,
      };
      this.entries.set(entry.id, entry);
      const { sample: _, ...choice } = entry;
      void _;
      choices.push(choice);
    }
    if (this.entries.size > 2000)
      this.entries = new Map([...this.entries].slice(-1000));
    return { voices: choices, pagination: raw.pagination ?? null };
  }
  async sample(id: unknown) {
    if (typeof id !== 'string') throw Error('Voice identifier required');
    const entry = this.entries.get(id);
    if (!entry?.sample)
      throw Error('Load the voice catalogue first; this sample is unavailable');
    return this.download(entry.sample, 5 * 1024 * 1024);
  }
  cancel() {
    const busy = !!this.controller;
    this.controller?.abort();
    return { stopped: busy };
  }
  async generate(input: unknown) {
    const body = voiceGenerateSchema.parse(input);
    if (!body.voiceId.startsWith(body.provider + '_'))
      throw Error('Voice/provider mismatch');
    if (!this.entries.has(body.voiceId))
      throw Error('Select a voice from the loaded catalogue first');
    if (this.controller) throw Error('A voice request is already running');
    const controller = new AbortController();
    this.controller = controller;
    const signal = AbortSignal.any([
      controller.signal,
      AbortSignal.timeout(300000),
    ]);
    let temp: string | undefined;
    try {
      const form = new FormData();
      form.set('voice_id', body.voiceId);
      form.set('text', body.text);
      form.set('speed', String(body.speed));
      form.set('with_transcript', 'true');
      // Persist the remote task identifier before polling. Resuming an interrupted
      // request with the same account/voice/script does not submit another paid task.
      const cacheId = createHash('sha256')
        .update(JSON.stringify(body))
        .update(await this.key())
        .digest('hex');
      await mkdir(join(this.directory, 'tasks'), { recursive: true });
      const jobPath = join(this.directory, 'tasks', cacheId + '.json');
      let job: Record<string, unknown> | undefined;
      try {
        job = JSON.parse(await readFile(jobPath, 'utf8')) as Record<
          string,
          unknown
        >;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT')
          throw Error('Cannot read cached voice task');
      }
      const reused = !!job;
      if (!job) {
        job = await this.request(
          '/v3/text-to-speech',
          { method: 'POST', body: form },
          signal,
        );
        if (
          typeof job.task_id !== 'string' ||
          !/^[\w-]{1,100}$/.test(job.task_id)
        )
          throw Error('AI33 returned no valid task identifier');
        await writeFile(
          jobPath,
          JSON.stringify({ task_id: job.task_id }),
          'utf8',
        );
      }
      if (
        typeof job.task_id !== 'string' ||
        !/^[\w-]{1,100}$/.test(job.task_id)
      )
        throw Error('Invalid cached voice task identifier');
      let task: Record<string, unknown> | undefined;
      for (let i = 0; i < 90; i++) {
        const value = await this.request('/v1/task/' + job.task_id, {}, signal);
        if (value.status === 'done') {
          task = value;
          break;
        }
        if (['error', 'failed', 'cancelled'].includes(String(value.status)))
          throw Error('AI33 speech generation failed');
        await this.wait(this.pollMs, signal);
      }
      if (!task) throw Error('AI33 speech generation timed out');
      const metadata = task.metadata as Record<string, unknown> | undefined;
      if (!metadata) throw Error('Missing voice artifacts');
      const audio = await this.download(
          this.cdn(metadata.audio_url),
          16 * 1024 * 1024,
          signal,
        ),
        json = await this.download(
          this.cdn(metadata.json_url),
          2 * 1024 * 1024,
          signal,
        );
      const rows = JSON.parse(new TextDecoder().decode(json)) as {
        words?: { text: string; start: number; end: number; type: string }[];
      }[];
      if (!Array.isArray(rows)) throw Error('Malformed speech timestamps');
      const words = rows
        .flatMap((row) => row.words ?? [])
        .filter(
          (w) =>
            w.type === 'word' &&
            typeof w.text === 'string' &&
            w.text.trim() &&
            Number.isFinite(w.start) &&
            Number.isFinite(w.end) &&
            w.end > w.start,
        )
        .map((w) => ({
          text: w.text.trim(),
          startSeconds: w.start,
          endSeconds: w.end,
        }));
      if (!words.length || words.length > 5000)
        throw Error('Missing or excessive speech word timestamps');
      if (words.at(-1)!.endSeconds > 170)
        throw Error(
          'Speech exceeds the 170-second PCM budget. Split the script into shorter scenes.',
        );
      await mkdir(this.directory, { recursive: true });
      temp = await mkdtemp(join(this.directory, 'tts-'));
      await writeFile(join(temp, 'source.mp3'), audio);
      await runFFmpeg(
        [
          '-y',
          '-i',
          join(temp, 'source.mp3'),
          '-t',
          '170',
          '-af',
          'loudnorm=I=-19:TP=-3:LRA=7,aresample=48000',
          '-ac',
          '1',
          '-c:a',
          'pcm_s16le',
          join(temp, 'voice.wav'),
        ],
        signal,
      );
      const wav = await readFile(join(temp, 'voice.wav')),
        info = inspectWav(wav);
      if (
        words.some(
          (w) => w.startSeconds < 0 || w.endSeconds > info.duration + 0.02,
        )
      )
        throw Error('Speech word timestamps exceed audio');
      return {
        voiceId: body.voiceId,
        voiceName: this.entries.get(body.voiceId)!.name,
        durationSeconds: info.duration,
        dataUrl: wavDataUrl(
          pcmWav(
            wav.subarray(info.dataOffset, info.dataOffset + info.dataBytes),
            info.sampleRate,
            info.channels,
          ),
        ),
        words,
        creditCost: reused ? 0 : Number(task.credit_cost) || 0,
      };
    } finally {
      if (temp && resolve(temp).startsWith(resolve(this.directory) + sep))
        await rm(temp, { recursive: true, force: true });
      this.controller = null;
    }
  }
}
