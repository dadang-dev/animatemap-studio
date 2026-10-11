import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { toneWav } from './packages/project-schema/src/audio.fixture';
mkdirSync(resolve('.local/e2e'), { recursive: true });
writeFileSync(resolve('.local/e2e/microphone.wav'), toneWav(4));
export default defineConfig({
  testDir: './tests/e2e',
  workers: 1,
  timeout: 60000,
  snapshotPathTemplate: '{testDir}/golden/{arg}{ext}',
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.02, animations: 'disabled' },
  },
  use: {
    baseURL: 'http://127.0.0.1:5173',
    viewport: { width: 1440, height: 1000 },
    trace: 'retain-on-failure',
    launchOptions: {
      args: [
        '--enable-unsafe-swiftshader',
        '--use-fake-device-for-media-stream',
        `--use-file-for-fake-audio-capture=${resolve('.local/e2e/microphone.wav')}`,
        '--use-fake-ui-for-media-stream',
      ],
    },
  },
  webServer: {
    command: 'pnpm dev',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: false,
    env: { ANIMATEMAP_STORAGE_DIR: resolve('.local/e2e/projects') },
    timeout: 60000,
  },
});
