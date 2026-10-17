import {
  readFile,
  writeFile,
  mkdir,
  copyFile,
  stat,
  readdir,
} from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import {
  projectSchema,
  validateDirectorPlan,
} from '../packages/project-schema/src/index';
import { CodexService } from '../apps/api/src/codex';
import { directorComposition } from '../apps/render-worker/src/directorComposition';

const args = process.argv.slice(2),
  command = args.shift();
const option = (name: string, fallback?: string) => {
  const i = args.indexOf('--' + name);
  return i >= 0 ? args[i + 1] : fallback;
};
const required = (name: string) => {
  const value = option(name);
  if (!value) throw new Error('--' + name + ' is required');
  return value;
};
const projectPath = resolve(required('project')),
  projectBytes = await readFile(projectPath),
  project = projectSchema.parse(JSON.parse(projectBytes.toString('utf8')));
if (command === 'plan') {
  const output = resolve(required('output'));
  await mkdir(dirname(output), { recursive: true });
  const result = await new CodexService(
    resolve('.local/director/runs'),
  ).planShots({
    project,
    prompt: option(
      'prompt',
      'Keep all narration and audio. Plan varied editorial map shots, with action focus for visible actors; preserve timing and credits.',
    ),
  });
  await writeFile(output, JSON.stringify(result, null, 2));
  console.log(
    JSON.stringify({
      output,
      shots: result.plan.shots.length,
      provider: result.provider.name,
      toolCalls: result.provider.toolCalls,
    }),
  );
} else if (command === 'compose') {
  const planFile = JSON.parse(
    await readFile(resolve(required('plan')), 'utf8'),
  ) as { plan?: unknown };
  const plan = validateDirectorPlan(planFile.plan ?? planFile, project),
    video = resolve(required('video')),
    evidence = JSON.parse(
      await readFile(resolve(required('verification')), 'utf8'),
    ) as { files: { filename: string; sha256: string }[] };
  if ((await stat(video)).size > 512 * 1024 * 1024)
    throw new Error('Baseline video exceeds 512 MiB');
  const hash = (bytes: Uint8Array) =>
    createHash('sha256').update(bytes).digest('hex');
  const projectHash = hash(projectBytes),
    videoHash = hash(await readFile(video));
  if (
    !evidence.files?.some(
      (f) =>
        f.filename === 'project.animatemap.json' && f.sha256 === projectHash,
    ) ||
    !evidence.files.some((f) => f.sha256 === videoHash)
  )
    throw new Error(
      'Baseline project/video do not match the verified delivery manifest',
    );
  const from = Number(option('from', '0')),
    duration = Number(
      option('duration', String(project.durationSeconds - from)),
    ),
    html = directorComposition(project, plan, from, duration),
    output = resolve(required('output'));
  await mkdir(dirname(output), { recursive: true });
  await mkdir(output); // Preserve prior compositions; choose a new output directory per revision.
  await copyFile(video, join(output, 'source.mp4'));
  await copyFile(
    resolve('.local/integrations/runtime/node_modules/gsap/dist/gsap.min.js'),
    join(output, 'gsap.min.js'),
  );
  await writeFile(join(output, 'index.html'), html);
  await writeFile(join(output, 'plan.json'), JSON.stringify(plan, null, 2));
  const sourceDirectory = dirname(resolve(required('verification')));
  for (const file of await readdir(sourceDirectory, { withFileTypes: true })) {
    if (file.isFile() && /^LICENSE[^/\\]*\.txt$/i.test(file.name))
      await copyFile(join(sourceDirectory, file.name), join(output, file.name));
  }
  await writeFile(
    join(output, 'CREDITS.json'),
    JSON.stringify(
      {
        map: project.map.attribution,
        metadata: project.metadata,
        images: project.assets.map(({ id, name, provenance }) => ({
          id,
          name,
          provenance,
        })),
        audio: project.audioAssets.map(({ id, name, provenance }) => ({
          id,
          name,
          provenance,
        })),
        runtime: [
          {
            name: 'Vox Director',
            license: 'MIT',
            source: 'https://github.com/Alisa0808/vox-director',
          },
          {
            name: 'HyperFrames',
            license: 'Apache-2.0',
            source: 'https://github.com/heygen-com/hyperframes',
          },
          {
            name: 'GSAP',
            version: '3.14.2',
            license: 'Standard No Charge (not MIT)',
            source: 'https://gsap.com/standard-license/',
          },
        ],
      },
      null,
      2,
    ),
  );
  await writeFile(
    join(output, 'BASELINE.json'),
    JSON.stringify(
      {
        projectHash,
        videoHash,
        from,
        duration,
        lockedNarration: true,
        localOnly: true,
        planProvider: planFile.plan ? 'Codex CLI' : 'validated plan',
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({
      output,
      from,
      duration,
      composition: 'animatemap',
      narrationUnchanged: true,
    }),
  );
} else if (command === 'render') {
  throw new Error(
    'Use the pinned HyperFrames CLI on the reviewed composition: pnpm hyperframes -- render <directory> -o <output.mp4>',
  );
} else throw new Error('Usage: director plan|compose --project <JSON> ...');
// Do not execute model output, spawn a shell, or reinterpret Codex as a media-generation API.
