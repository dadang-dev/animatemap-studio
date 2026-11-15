import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const python = resolve(
  root,
  '.venv-video',
  process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python',
);
if (!existsSync(python)) {
  console.error(
    'Run scripts/setup-machine.ps1 or create .venv-video and install requirements-video.txt first.',
  );
  process.exit(2);
}
const child = spawn(
  python,
  [
    '-X',
    'utf8',
    resolve(root, 'skills/animatemap-video/scripts/video_tool.py'),
    ...process.argv.slice(2),
  ],
  { cwd: root, shell: false, windowsHide: true, stdio: 'inherit' },
);
child.once('error', (e) => {
  console.error(e.message);
  process.exitCode = 2;
});
child.once('exit', (code) => {
  process.exitCode = code ?? 2;
});
