import { test, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import {
  historicalManifestSchema,
  historicalDatasetSchema,
} from './historical';
import {
  historicalGeometrySchema,
  validateHistoricalGeometry,
  type HistoricalGeometry,
} from './historicalGeometry';
test('actual licensed DC history retains 24 source polygons/properties and byte hashes, ordered year coverage and explicit legacy label uncertainty', async () => {
  const data = await readFile(
      'apps/web/public/data/history/dc-wards-1982-2011.json',
    ),
    pack = JSON.parse(await readFile('data/history/pack.json', 'utf8'));
  expect(createHash('sha256').update(data).digest('hex')).toBe(pack.sha256);
  expect(data.length).toBe(pack.bytes);
  const manifest = historicalManifestSchema.parse(JSON.parse(data.toString()));
  expect(manifest.dataset.regions).toHaveLength(8);
  expect(manifest.dataset.epochs).toHaveLength(3);
  for (const epoch of manifest.dataset.epochs) {
    const bytes = await readFile(`data/history/${epoch.id}-source.geojson`),
      source = JSON.parse(bytes.toString());
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(
      epoch.sourceSha256,
    );
    const metadata = JSON.parse(
      await readFile(`data/history/${epoch.id}-item.json`, 'utf8'),
    );
    expect(metadata.owner).toBe('DCGISopendata');
    expect(metadata.licenseInfo).toContain('licenses/by/4.0');
    for (const feature of epoch.features) {
      const original = source.features.find(
        (f: { id: number }) => String(f.id) === feature.sourceId,
      );
      expect(feature.geometry).toEqual(original.geometry);
      expect(feature.properties).toEqual(original.properties);
    }
  }
  expect(
    manifest.dataset.epochs[1]!.features.every((f) => f.name.includes('1990')),
  ).toBe(true);
  expect(manifest.dataset.epochs[1]!.uncertainty).toContain('not resolved');
  const duplicate = structuredClone(manifest.dataset);
  duplicate.epochs[1]!.fromYear = 1991;
  expect(historicalDatasetSchema.safeParse(duplicate).success).toBe(false);
  duplicate.epochs[1]!.fromYear = 1992;
  duplicate.epochs[0]!.features[0]!.regionId = 'unknown';
  expect(historicalDatasetSchema.safeParse(duplicate).success).toBe(false);
});
test('bounded historical topology preserves holes/islands/dateline source arrays and rejects crossings, overlap, zero area and exhausted work', () => {
  const date: HistoricalGeometry = {
    type: 'Polygon',
    coordinates: [
      [
        [179, 10],
        [-179, 10],
        [-179, 12],
        [179, 12],
        [179, 10],
      ],
      [
        [179.5, 10.5],
        [179.5, 11.5],
        [-179.5, 11.5],
        [-179.5, 10.5],
        [179.5, 10.5],
      ],
    ],
  };
  const before = structuredClone(date);
  expect(() =>
    validateHistoricalGeometry(historicalGeometrySchema.parse(date)),
  ).not.toThrow();
  expect(date).toEqual(before);
  const islands: HistoricalGeometry = {
    type: 'MultiPolygon',
    coordinates: [
      [
        [
          [10, 10],
          [11, 10],
          [11, 11],
          [10, 11],
          [10, 10],
        ],
      ],
      [
        [
          [12, 10],
          [13, 10],
          [13, 11],
          [12, 11],
          [12, 10],
        ],
      ],
    ],
  };
  expect(() => validateHistoricalGeometry(islands)).not.toThrow();
  for (const ring of [
    [
      [0, 0],
      [1, 1],
      [0, 1],
      [1, 0],
      [0, 0],
    ],
    [
      [0, 0],
      [1, 0],
      [2, 0],
      [0, 0],
    ],
  ])
    expect(() =>
      validateHistoricalGeometry({
        type: 'Polygon',
        coordinates: [ring as [number, number][]],
      }),
    ).toThrow();
  const overlap = structuredClone(islands);
  overlap.coordinates[1] = structuredClone(overlap.coordinates[0]!);
  expect(() => validateHistoricalGeometry(overlap)).toThrow();
  expect(() => validateHistoricalGeometry(date, { remaining: 0 })).toThrow(
    'budget',
  );
  expect(
    historicalGeometrySchema.safeParse({
      type: 'Polygon',
      coordinates: [
        [
          [Infinity, 0],
          [1, 0],
          [1, 1],
          [Infinity, 0],
        ],
      ],
    }).success,
  ).toBe(false);
});
