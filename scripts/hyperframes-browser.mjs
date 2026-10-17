import { existsSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

// Windows GUI Chrome does not reliably exit for --version. Use the matching
// Playwright headless-shell build, which supports both that probe and capture.
export function hyperframesBrowserPath(chromium) {
  if (process.env.HYPERFRAMES_BROWSER_PATH)
    return process.env.HYPERFRAMES_BROWSER_PATH;
  const chrome = chromium.executablePath();
  if (process.platform !== 'win32') return chrome;
  const build = dirname(dirname(chrome));
  const shell = join(
    dirname(build),
    basename(build).replace(/^chromium-/, 'chromium_headless_shell-'),
    'chrome-headless-shell-win64',
    'chrome-headless-shell.exe',
  );
  if (!existsSync(shell))
    throw new Error(
      'Install matching Playwright Chromium headless shell, or set HYPERFRAMES_BROWSER_PATH.',
    );
  return shell;
}
