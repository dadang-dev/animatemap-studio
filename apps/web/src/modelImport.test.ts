import { test, expect } from 'vitest';
import { createHash } from 'node:crypto';
import {
  importModelOBJ,
  authoredAircraftOBJ,
  aircraftOptions,
} from './modelImport';
const bytes = (text: string) => new TextEncoder().encode(text);
test('authored CC0 aircraft is actual bounded triangle geometry with source checksum; OBJ axes/origin/unit conversions preserve declared measurements', async () => {
  const source = bytes(authoredAircraftOBJ()),
    asset = await importModelOBJ(source, aircraftOptions('aircraft'));
  expect(asset.vertices.length).toBeGreaterThan(30);
  expect(asset.triangles).toHaveLength(64);
  expect(asset.sourceSha256).toBe(
    createHash('sha256').update(source).digest('hex'),
  );
  expect(Math.min(...asset.vertices.map((v) => v[2]))).toBe(0);
  const raw = bytes('v 1 2 3\nv 2 2 3\nv 1 3 3\nf -3 -2 -1\n'),
    options = {
      ...aircraftOptions('imported'),
      unit: 'feet' as const,
      sourceUpAxis: 'Y' as const,
      placementOrigin: 'preserve' as const,
    };
  const converted = await importModelOBJ(raw, options);
  expect(converted.vertices).toEqual([
    [1, -3, 2],
    [2, -3, 2],
    [1, -3, 3],
  ]);
  expect(converted.unit).toBe('feet');
  expect(converted.triangles).toEqual([[0, 1, 2]]);
});
test('untrusted OBJ rejects external resources/directives, forward/out-of-range indices, n-gons, malformed UTF8, finite/mesh/byte budgets and degeneracy', async () => {
  const valid = 'v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n',
    options = aircraftOptions('reject');
  for (const raw of [
    valid + 'mtllib https://example.org/material.mtl',
    valid + 'usemtl danger',
    valid + 'call script',
    valid.replace('f 1 2 3', 'f 1 2 9'),
    valid.replace('f 1 2 3', 'f 1 2 3 1'),
    valid.replace('v 1 0 0', 'v Infinity 0 0'),
    valid.replace('v 0 1 0', 'v 2 0 0'),
    'f 1 2 3\n' + valid,
  ])
    await expect(importModelOBJ(bytes(raw), options)).rejects.toThrow();
  await expect(
    importModelOBJ(new Uint8Array([255]), options),
  ).rejects.toThrow();
  await expect(
    importModelOBJ(new Uint8Array(3 * 1024 * 1024 + 1), options),
  ).rejects.toThrow('3 MiB');
});
