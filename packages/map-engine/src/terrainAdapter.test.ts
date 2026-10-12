import { test, expect, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { terrainTileReference, verifiedTerrainTile } from './terrainAdapter';
const url = 'animatemap-dem://sapa-2026-10-12/9/403/223.png';
test('terrain source requests are constrained to pinned protocol/catalog paths', () => {
  expect(terrainTileReference(url).x).toBe(403);
  for (const input of [
    'https://untrusted.example/9/403/223.png',
    'animatemap-dem://other/9/403/223.png',
    `${url}?secret=x`,
    `${url}#x`,
    'animatemap-dem://sapa-2026-10-12/../9/403/223.png',
    'animatemap-dem://sapa-2026-10-12/9/900/223.png',
    'animatemap-dem://user@ sapa-2026-10-12/9/403/223.png',
  ]) {
    // URL canonicalization of traversal still points to an allowed exact catalog path;
    // it cannot select a filesystem path or untrusted origin.
    if (input.includes('/../9/'))
      expect(terrainTileReference(input)).toEqual(terrainTileReference(url));
    else expect(() => terrainTileReference(input)).toThrow();
  }
});
test('real original terrain bytes verify against SHA; errors/size/corruption reject before MapLibre decoding', async () => {
  const bytes = new Uint8Array(
    await readFile(
      'apps/web/public/data/terrain/sapa-2026-10-12/9/403/223.png',
    ),
  );
  const fetcher = vi.fn(
    async () => new Response(new Uint8Array(bytes)),
  ) as unknown as typeof fetch;
  const signal = new AbortController().signal;
  expect(await verifiedTerrainTile(url, signal, fetcher)).toEqual(bytes);
  expect(fetcher).toHaveBeenCalledWith(
    '/data/terrain/sapa-2026-10-12/9/403/223.png',
    expect.objectContaining({ redirect: 'error' }),
  );
  const corrupted = new Uint8Array(bytes);
  corrupted[100] = corrupted[100]! ^ 1;
  for (const [response, message] of [
    [new Response('not available', { status: 503 }), '503'],
    [new Response(new Uint8Array(bytes.length + 1)), 'byte limit'],
    [new Response(new Uint8Array(5)), 'length mismatch'],
    [new Response(corrupted), 'checksum'],
  ] as const) {
    await expect(
      verifiedTerrainTile(url, signal, (async () => response) as typeof fetch),
    ).rejects.toThrow(message);
  }
});
