import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';
import { resolve } from 'node:path';
import { hyperframesBrowserPath } from './hyperframes-browser.mjs';
const p = spawn(
  process.execPath,
  [
    resolve(
      '.local/integrations/runtime/node_modules/hyperframes/bin/hyperframes.mjs',
    ),
    ...process.argv.slice(2),
  ],
  {
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
