import { cpus, totalmem, platform } from 'node:os';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  createDemo,
  projectSchema,
  historicalManifestSchema,
  type RenderJob,
  type Project,
} from '../packages/project-schema/src/index';
import { evaluateProjectAt } from '../packages/animation-core/src/index';
import { addHistoricalLayer } from '../apps/web/src/historyOperations';
const exec = promisify(execFile);
function profile(project: Project, samples: number) {
  // Warm reusable immutable geometry correspondence before measuring repeated seeks.
  evaluateProjectAt(project, project.durationSeconds / 2);
  const times = [];
  for (let i = 0; i < samples; i++) {
    const start = performance.now();
    evaluateProjectAt(project, (i % 300) / 30);
    times.push(performance.now() - start);
  }
  times.sort((a, b) => a - b);
  return {
    samples,
    meanMs: times.reduce((n, t) => n + t, 0) / samples,
    p95Ms: times[Math.floor(samples * 0.95)]!,
    maximumMs: times.at(-1)!,
  };
}
const directory = resolve('.local/reviewed/release-v15');
await mkdir(directory, { recursive: true });
const project = createDemo();
project.id = 'release-benchmark-v15';
project.durationSeconds = 10;
const scene = project.scenes[0]!;
scene.durationSeconds = 10;
scene.camera.keyframes = scene.camera.keyframes.filter((key) => key.time <= 10);
for (const layer of scene.layers) {
  layer.timeRange.end = Math.min(layer.timeRange.end, 10);
  for (const key of Object.keys(layer.tracks) as (keyof typeof layer.tracks)[])
    layer.tracks[key] = layer.tracks[key].filter((frame) => frame.time <= 10);
}
const snapshot = projectSchema.parse(project);
const historical = structuredClone(snapshot),
  manifest = historicalManifestSchema.parse(
    JSON.parse(
      await readFile(
        'apps/web/public/data/history/dc-wards-1982-2011.json',
        'utf8',
      ),
    ),
  );
addHistoricalLayer(
  historical,
  historical.scenes[0]!.id,
  manifest.dataset,
  true,
  'profile-history',
);
const history = historical.scenes[0]!.layers.at(-1)!;
if (history.type !== 'historical') throw new Error('Invalid profile layer');
history.regionIds = ['ward-1'];
history.mode = 'morph';
history.tracks.historyYear = [
  { time: 0, value: 1982, easing: 'linear' },
  { time: 10, value: 1992, easing: 'linear' },
];
const evaluator = {
  travel: profile(snapshot, 10000),
  historicalMorph: profile(projectSchema.parse(historical), 300),
};
const signal = AbortSignal.timeout(10 * 60 * 1000);
const created = await fetch('http://127.0.0.1:3001/api/jobs', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ project: snapshot, format: 'mp4' }),
  signal,
});
if (!created.ok) throw new Error(await created.text());
const queued = (await created.json()) as RenderJob;
let job = queued;
try {
  while (job.state !== 'completed') {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const response = await fetch(
      `http://127.0.0.1:3001/api/jobs/${queued.id}`,
      { signal },
    );
    if (!response.ok)
      throw new Error(`Benchmark status failed (${response.status})`);
    job = (await response.json()) as RenderJob;
    if (job.state === 'failed' || job.state === 'cancelled')
      throw new Error(job.error ?? job.state);
  }
  const response = await fetch(
    `http://127.0.0.1:3001/api/jobs/${queued.id}/download`,
    { signal },
  );
  if (!response.ok)
    throw new Error(`Benchmark download failed (${response.status})`);
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Benchmark artifact body unavailable');
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      length += part.value.length;
      if (length > 128 * 1024 * 1024)
        throw new Error('Benchmark artifact exceeds 128 MiB');
      chunks.push(part.value);
    }
  } finally {
    await reader.cancel();
  }
  const video = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    video.set(chunk, offset);
    offset += chunk.length;
  }
  const output = resolve(directory, 'travel-300-1080p.mp4');
  await writeFile(output, video);
  const probe = JSON.parse(
    (
      await exec(
        process.env.FFPROBE_PATH ?? 'ffprobe',
        [
          '-v',
          'error',
          '-count_frames',
          '-show_streams',
          '-of',
          'json',
          output,
        ],
        { timeout: 60000, maxBuffer: 1024 * 1024 },
      )
    ).stdout,
  );
  const stream = probe.streams?.find(
    (s: { codec_type: string }) => s.codec_type === 'video',
  );
  if (
    stream?.codec_name !== 'h264' ||
    stream.width !== 1920 ||
    stream.height !== 1080 ||
    stream.pix_fmt !== 'yuv420p' ||
    Number(stream.nb_read_frames) !== 300
  )
    throw new Error(
      'Actual benchmark video failed codec/dimension/frame validation',
    );
  const report = {
    measuredAtUTC: new Date().toISOString(),
    schemaVersion: snapshot.schemaVersion,
    platform: platform(),
    cpu: cpus()[0]?.model,
    logicalCpus: cpus().length,
    memoryGiB: Math.round(totalmem() / 1024 ** 3),
    evaluator,
    render: {
      jobId: queued.id,
      frames: 300,
      width: 1920,
      height: 1080,
      fps: 30,
      elapsedMs: job.elapsedMs,
      framesPerSecond: job.elapsedMs ? 300 / (job.elapsedMs / 1000) : null,
      bytes: video.length,
      ffprobe: stream,
    },
  };
  await writeFile(
    resolve(directory, 'benchmark.json'),
    JSON.stringify(report, null, 2) + '\n',
  );
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
} catch (error) {
  await fetch(`http://127.0.0.1:3001/api/jobs/${queued.id}/cancel`, {
    method: 'POST',
    signal: AbortSignal.timeout(5000),
  }).catch(() => undefined);
  throw error;
}
