import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';
const root =
  process.env.ANIMATEMAP_STUDIO_ROOT ??
  resolve(dirname(fileURLToPath(import.meta.url)), '../../../../..');
const require = createRequire(resolve(root, 'package.json'));
const { chromium } = require('@playwright/test');
const { hyperframesBrowserPath } = await import(
  pathToFileURL(resolve(root, 'scripts/hyperframes-browser.mjs')).href
);
const p = spawn(
  process.execPath,
  [
    resolve(
      root,
      '.local/integrations/runtime/node_modules/hyperframes/bin/hyperframes.mjs',
    ),
    ...process.argv.slice(2),
  ],
  {
    cwd: root,
    shell: false,
    windowsHide: true,
    stdio: 'inherit',
    env: {
      ...process.env,
      HYPERFRAMES_BROWSER_PATH: hyperframesBrowserPath(chromium),
      DO_NOT_TRACK: '1',
      HF_TELEMETRY: '0',
    },
  },
);
p.once('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
p.once('exit', (code) => {
  process.exitCode = code ?? 1;
});
