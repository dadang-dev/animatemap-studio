import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  mkdtemp,
  mkdir,
  copyFile,
  readdir,
  readFile,
  writeFile,
} from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
function run(args) {
  const p = spawnSync(process.execPath, args, {
    cwd: root,
    windowsHide: true,
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
  });
  if (p.status !== 0) throw Error((p.stderr || p.stdout).slice(-1800));
  return p.stdout;
}
try {
  await mkdir(join(root, '.local/portability'), { recursive: true });
  const dir = await mkdtemp(join(root, '.local/portability/hyperframes-')),
    project = join(dir, 'source');
  await mkdir(project);
  await copyFile(
    join(root, 'templates/hyperframes-starter/index.html'),
    join(project, 'index.html'),
  );
  await copyFile(
    join(
      root,
      '.local/integrations/runtime/node_modules/gsap/dist/gsap.min.js',
    ),
    join(project, 'gsap.min.js'),
  );
  await copyFile(
    join(root, 'shared/assets/licenses/LICENSE-GSAP.txt'),
    join(project, 'LICENSE-GSAP.txt'),
  );
  const check = run([
    join(root, 'scripts/hyperframes.mjs'),
    'check',
    project,
    '--json',
  ]);
  await writeFile(join(dir, 'check.json'), check);
  const snapshots = join(dir, 'snapshots');
  run([
    join(root, 'scripts/hyperframes.mjs'),
    'snapshot',
    project,
    '--at',
    '0,1',
    '--no-end',
    '--describe',
    'false',
    '--output',
    snapshots,
  ]);
  const files = (await readdir(snapshots)).filter(
    (n) => n.endsWith('.png') && !n.includes('contact'),
  );
  if (files.length < 2) throw Error('Missing real HyperFrames snapshots');
  const hashes = [];
  for (const f of files)
    hashes.push(
      createHash('sha256')
        .update(await readFile(join(snapshots, f)))
        .digest('hex'),
    );
  if (new Set(hashes).size < 2)
    throw Error('HyperFrames motion did not change real pixels');
  const report = {
    pass: true,
    output: dir,
    snapshotFiles: files,
    snapshotSHA256: hashes,
    scope:
      'Actual published HyperFrames check + two rendered paused-GSAP frames. Vox adapter presence/identity is covered by doctor; no live AI planning, generated media, external vision or paid call.',
  };
  await writeFile(
    join(dir, 'integration-report.json'),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
}
