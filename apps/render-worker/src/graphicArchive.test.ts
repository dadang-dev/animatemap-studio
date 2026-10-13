import { test, expect } from 'vitest';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { unzipSync, strFromU8 } from 'fflate';
import { GraphicArchive } from './graphicArchive';
import { removeTemporaryDirectory } from './cleanup';
test('real streamed STORE ZIP independently decodes Unicode/bytes, has reproducible metadata, rejects traversal/duplicates/budgets and closes on cancellation', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'ams-graphic-'));
  try {
    const data = new TextEncoder().encode('Bản đồ · kiểm tra dữ liệu'),
      binary = Uint8Array.from([0, 255, 1, 254, 2, 253]);
    const files: Buffer[] = [];
    for (const name of ['first.zip', 'second.zip']) {
      const archive = await GraphicArchive.create(
        join(directory, name),
        new AbortController().signal,
      );
      try {
        await archive.add('README.txt', data);
        await archive.add('frames/000000/incoming-depth.png', binary);
        await expect(archive.add('../escape.txt', data)).rejects.toThrow(
          'Unsafe',
        );
        await expect(archive.add('README.txt', data)).rejects.toThrow(
          'duplicate',
        );
        expect(await archive.finish()).toMatchObject({ entries: 2 });
        await expect(archive.add('late.txt', data)).rejects.toThrow('closed');
      } finally {
        await archive.close();
      }
      files.push(await readFile(join(directory, name)));
    }
    expect(files[0]!.equals(files[1]!)).toBe(true);
    const decoded = unzipSync(files[0]!);
    expect(strFromU8(decoded['README.txt']!)).toBe('Bản đồ · kiểm tra dữ liệu');
    expect(decoded['frames/000000/incoming-depth.png']).toEqual(binary);
    const small = await GraphicArchive.create(
      join(directory, 'bounded.zip'),
      new AbortController().signal,
      128,
    );
    try {
      await expect(small.add('large.bin', new Uint8Array(512))).rejects.toThrow(
        'byte budget',
      );
    } finally {
      await small.close();
    }
    const controller = new AbortController(),
      cancelled = await GraphicArchive.create(
        join(directory, 'cancelled.zip'),
        controller.signal,
      );
    controller.abort();
    try {
      await expect(cancelled.add('file.txt', data)).rejects.toThrow();
    } finally {
      await cancelled.close();
      await cancelled.close();
    }
  } finally {
    await removeTemporaryDirectory(directory, tmpdir(), 'ams-graphic-');
  }
});
