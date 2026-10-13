import { expect, test, vi } from 'vitest';
import { chromium, type Browser } from 'playwright';
import { mkdtemp, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createDemo } from '@animatemap/project-schema';
import { renderProject } from './index';
import { removeTemporaryDirectory } from './cleanup';
test('cancellation during final browser cleanup removes the otherwise complete artifact and cannot report success', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'ams-worker-race-')),
    controller = new AbortController();
  const progress: string[] = [];
  const browser = {
    newPage: async () => ({
      route: async () => {},
      goto: async () => {},
      waitForFunction: async () => {},
      evaluate: async () => {},
      screenshot: async (options: { path: string }) =>
        writeFile(options.path, 'Authored lifecycle test pixels'),
    }),
    close: async () => {
      controller.abort();
    },
  };
  const launch = vi
    .spyOn(chromium, 'launch')
    .mockResolvedValueOnce(browser as unknown as Browser);
  try {
    await writeFile(join(directory, 'keep.txt'), 'Existing user content');
    await expect(
      renderProject({
        project: createDemo(),
        format: 'png',
        directory,
        signal: controller.signal,
        webURL: 'http://127.0.0.1:5174',
        onProgress: (state) => {
          progress.push(state);
        },
      }),
    ).rejects.toThrow();
    const names = await readdir(directory);
    expect(names).toContain('snapshot.json');
    expect(names).toContain('keep.txt');
    expect(names).not.toContain('output.png');
    expect(names.some((name) => name.startsWith('frames-'))).toBe(false);
    expect(progress).not.toContain('completed');
    expect(await readFile(join(directory, 'keep.txt'), 'utf8')).toBe(
      'Existing user content',
    );
  } finally {
    launch.mockRestore();
    await removeTemporaryDirectory(directory, tmpdir(), 'ams-worker-race-');
  }
});

test('Chromium startup failure cleans owned temp frames and preserves existing user files and snapshot', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'ams-worker-test-'));
  const launch = vi
    .spyOn(chromium, 'launch')
    .mockRejectedValueOnce(new Error('Chromium unavailable'));
  try {
    await mkdir(join(directory, 'frames'));
    await writeFile(
      join(directory, 'frames', 'keep.txt'),
      'Existing user frames',
    );
    const project = createDemo();
    await expect(
      renderProject({
        project,
        format: 'webm',
        directory,
        signal: new AbortController().signal,
        webURL: 'http://127.0.0.1:5174',
        onProgress: () => {},
      }),
    ).rejects.toThrow('Chromium unavailable');
    expect(await readdir(directory)).toEqual(['frames', 'snapshot.json']);
    expect(await readFile(join(directory, 'frames', 'keep.txt'), 'utf8')).toBe(
      'Existing user frames',
    );
    expect(
      JSON.parse(await readFile(join(directory, 'snapshot.json'), 'utf8')),
    ).toEqual(project);
    expect(launch).toHaveBeenCalledOnce();
    await expect(
      removeTemporaryDirectory(join(directory, 'frames'), directory, 'frames-'),
    ).rejects.toThrow('unsafe');
  } finally {
    launch.mockRestore();
    await removeTemporaryDirectory(directory, tmpdir(), 'ams-worker-test-');
  }
});
