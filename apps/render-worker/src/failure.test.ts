import { expect, test, vi } from 'vitest';
import { chromium } from 'playwright';
import { mkdtemp, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createDemo } from '@animatemap/project-schema';
import { renderProject } from './index';
import { removeTemporaryDirectory } from './cleanup';

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
