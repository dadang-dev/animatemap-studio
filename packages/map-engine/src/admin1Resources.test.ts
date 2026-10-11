import { readFile } from 'node:fs/promises';
import { expect, test, vi } from 'vitest';
import { Admin1Resources } from './admin1Resources';

test('verified local region resources wait, reuse active files and evict inactive geography', async () => {
  const requests = vi.fn(
    async (url: string) =>
      new Response(
        await readFile(
          new URL(`../../../apps/web/public${url}`, import.meta.url),
        ),
      ),
  );
  vi.stubGlobal('fetch', requests);
  const changed = vi.fn(),
    failure = vi.fn();
  const resources = new Admin1Resources(changed, failure);
  try {
    resources.use(['VNM']);
    await resources.ready();
    expect(resources.get('VNM')!.features).toHaveLength(63);
    resources.use(['VNM']);
    await resources.ready();
    expect(requests).toHaveBeenCalledTimes(1);
    resources.use(['THA']);
    await resources.ready();
    expect(resources.get('VNM')).toBeUndefined();
    expect(resources.collection(['THA']).features).toHaveLength(77);
    expect(changed).toHaveBeenCalledTimes(2);
    expect(failure).not.toHaveBeenCalled();
  } finally {
    resources.destroy();
    vi.unstubAllGlobals();
  }
});

test('truncated, corrupt and unavailable region resources fail explicitly; dispose aborts owned requests', async () => {
  const bytes = await readFile(
    new URL(
      '../../../apps/web/public/data/admin1/VNM.geojson',
      import.meta.url,
    ),
  );
  for (const response of [
    new Response(null, { status: 503 }),
    new Response(bytes.subarray(0, 100)),
    new Response(Buffer.from(bytes.toString().replace('Kon Tum', 'Kon Tam'))),
  ]) {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => response),
    );
    const failure = vi.fn(),
      resources = new Admin1Resources(() => {}, failure);
    resources.use(['VNM']);
    await expect(resources.ready()).rejects.toThrow(
      'Admin 1 VNM resources failed',
    );
    expect(failure).toHaveBeenCalledTimes(1);
    expect(() => resources.use([])).toThrow('resources failed');
    resources.destroy();
    vi.unstubAllGlobals();
  }
  let signal: AbortSignal | undefined;
  vi.stubGlobal(
    'fetch',
    vi.fn((_: string, options: { signal: AbortSignal }) => {
      signal = options.signal;
      return new Promise((_, reject) =>
        signal!.addEventListener('abort', () => reject(new Error('Aborted'))),
      );
    }),
  );
  const failure = vi.fn(),
    resources = new Admin1Resources(() => {}, failure);
  resources.use(['VNM']);
  resources.destroy();
  await expect(resources.ready()).rejects.toThrow('disposed');
  expect(signal!.aborted).toBe(true);
  expect(failure).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
});
