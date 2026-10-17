import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const root =
  process.env.ANIMATEMAP_STUDIO_ROOT ??
  resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const args = process.argv.slice(2);
if (!['plan', 'compose'].includes(args[0]))
  throw Error(
    'Use plan or compose. Local mode uses signed-in Codex for visual plans, not Atlas media generation.',
  );
const p = spawn(
  process.execPath,
  ['--import', 'tsx', resolve(root, 'scripts/director.ts'), ...args],
  { cwd: root, shell: false, windowsHide: true, stdio: 'inherit' },
);
p.once('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
p.once('exit', (code) => {
  process.exitCode = code ?? 1;
});
