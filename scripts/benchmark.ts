import { cpus, totalmem, platform } from 'node:os';
import { mkdir, writeFile } from 'node:fs/promises';
import { createDemo } from '../packages/project-schema/src/index';
import { evaluateProjectAt } from '../packages/animation-core/src/index';
const project = createDemo();
const start = performance.now();
for (let i = 0; i < 10000; i++) evaluateProjectAt(project, (i % 360) / 30);
const evaluationMs = (performance.now() - start) / 10000;
project.durationSeconds = 10;
const scene = project.scenes[0]!;
scene.durationSeconds = 10;
scene.camera.keyframes = scene.camera.keyframes.filter((k) => k.time <= 10);
for (const layer of scene.layers) layer.timeRange.end = 10;
const response = await fetch('http://127.0.0.1:3001/api/jobs', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ project, format: 'mp4' }),
});
if (!response.ok) throw new Error(await response.text());
const created = (await response.json()) as { id: string };
let job: { state: string; error?: string; elapsedMs?: number };
do {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  job = (await (
    await fetch(`http://127.0.0.1:3001/api/jobs/${created.id}`)
  ).json()) as typeof job;
  if (job.state === 'failed' || job.state === 'cancelled')
    throw new Error(job.error ?? job.state);
} while (job.state !== 'completed');
const report = {
  date: '2026-10-10',
  platform: platform(),
  cpu: cpus()[0]?.model,
  logicalCpus: cpus().length,
  memoryGB: Math.round(totalmem() / 1024 ** 3),
  evaluationMsPerSeek: evaluationMs,
  frames: 300,
  resolution: '1920x1080',
  renderMs: job.elapsedMs,
  framesPerSecond: 300 / ((job.elapsedMs ?? 1) / 1000),
};
await mkdir('docs/phases/phase-5', { recursive: true });
await writeFile(
  'docs/phases/phase-5/benchmark.json',
  JSON.stringify(report, null, 2) + '\n',
);
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
