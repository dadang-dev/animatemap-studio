import { mkdir, writeFile } from 'node:fs/promises';
import { createDemo } from '../packages/project-schema/src/index';
await mkdir('examples', { recursive: true });
for (const [file, kind] of [
  ['travel-vietnam', 'travel'],
  ['southeast-asia-highlight', 'highlight'],
] as const) {
  await writeFile(
    `examples/${file}.json`,
    JSON.stringify(createDemo(kind), null, 2) + '\n',
  );
}
