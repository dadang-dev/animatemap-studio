import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  migrateProject,
  exportFormatSchema,
  MAX_PROJECT_BODY_BYTES,
} from '@animatemap/project-schema';
import { renderProject } from './index';
const input = process.argv[2];
if (!input)
  throw new Error(
    'Usage: pnpm render examples/travel-vietnam.json [output-directory] [mp4|png|webm|gif]',
  );
if ((await stat(input)).size > MAX_PROJECT_BODY_BYTES)
  throw new Error('Project exceeds 48 MiB');
const project = migrateProject(JSON.parse(await readFile(input, 'utf8')));
const format = exportFormatSchema.parse(process.argv[4] ?? 'mp4');
const controller = new AbortController();
process.on('SIGINT', () => controller.abort());
const output = await renderProject({
  project,
  format,
  directory: resolve(process.argv[3] ?? '.local/cli-render'),
  webURL: 'http://127.0.0.1:5174',
  signal: controller.signal,
  onProgress: (state, progress) =>
    process.stdout.write(`\r${state} ${Math.round(progress * 100)}%`),
});
process.stdout.write(`\n${output}\n`);
