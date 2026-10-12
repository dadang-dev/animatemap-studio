import { test, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import {
  buildingDatasetSchema,
  buildingHeightMetres,
  buildingGeometrySchema,
  validateBuildingGeometry,
  type BuildingGeometry,
} from './buildings';
import {
  createDemo,
  projectSchema,
  projectV12Schema,
  migrateProject,
  CURRENT_SCHEMA_VERSION,
  layerSchema,
} from './index';
import { buildingFixture, testBuildingGeometry } from './buildings.fixture';
import {
  importBuildingBytes,
  vancouverImportOptions,
  VANCOUVER_GEOJSON_SHA,
} from '../../../apps/web/src/buildingImport';
test('pinned actual Vancouver source retains all 100 original heights/IDs/footprints and verifiable provenance; derived source tampering is rejected', async () => {
  const raw = await readFile('data/buildings/vancouver-source.json');
  const provenance = JSON.parse(
    await readFile('data/buildings/provenance.json', 'utf8'),
  );
  expect(createHash('sha256').update(raw).digest('hex')).toBe(
    provenance.sourceSha256,
  );
  expect(raw.length).toBe(provenance.sourceBytes);
  const geojson = await readFile(
    'apps/web/public/data/buildings/vancouver-2009.geojson',
  );
  expect(createHash('sha256').update(geojson).digest('hex')).toBe(
    VANCOUVER_GEOJSON_SHA,
  );
  const dataset = await importBuildingBytes(
    geojson,
    vancouverImportOptions('vancouver'),
    true,
  );
  const originals = JSON.parse(raw.toString()).results;
  expect(dataset.records).toHaveLength(100);
  dataset.records.forEach((record, i) => {
    expect(record.height).toBe(originals[i].hgt_agl);
    expect(record.id).toBe(String(originals[i].id));
    expect(record.geometry).toEqual(originals[i].geom.geometry);
  });
  expect(dataset.provenance.surveyYear).toBe(2009);
  await expect(
    importBuildingBytes(
      new TextEncoder().encode(geojson.toString() + ' '),
      vancouverImportOptions('vancouver'),
      true,
    ),
  ).rejects.toThrow('checksum');
});
test('actual v12 validator rejects new building layers; migration adds an empty registry and tracks without mutating original project or old terrain', () => {
  const input = projectV12Schema.parse({ ...createDemo(), schemaVersion: 12 }),
    before = structuredClone(input),
    migrated = migrateProject(input);
  expect(input).toEqual(before);
  expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  expect(migrated.buildingDatasets).toEqual([]);
  expect(projectV12Schema.parse({ ...migrated, schemaVersion: 12 })).toEqual(
    before,
  );
  expect(
    projectSchema.safeParse({
      ...migrated,
      schemaVersion: CURRENT_SCHEMA_VERSION + 1,
    }).success,
  ).toBe(false);
  const layer = layerSchema.parse({
    id: 'buildings',
    name: 'Buildings',
    type: 'buildings',
    buildingDatasetId: 'test-buildings',
    timeRange: { start: 0, end: 12 },
    style: { color: '#ffffff' },
  });
  expect(
    projectV12Schema.safeParse({
      ...input,
      scenes: [{ ...input.scenes[0], layers: [layer] }],
    }).success,
  ).toBe(false);
});
test('holes and disjoint MultiPolygon parts are preserved, including a separate part inside another part’s courtyard', () => {
  const hole: [number, number][] = [
    [10.0002, 20.0002],
    [10.0008, 20.0002],
    [10.0008, 20.0008],
    [10.0002, 20.0008],
    [10.0002, 20.0002],
  ];
  const geometry: BuildingGeometry = {
    type: 'MultiPolygon',
    coordinates: [
      [...testBuildingGeometry.coordinates, hole],
      [
        [
          [10.0003, 20.0003],
          [10.0004, 20.0003],
          [10.0004, 20.0004],
          [10.0003, 20.0004],
          [10.0003, 20.0003],
        ],
      ],
    ],
  };
  expect(() => validateBuildingGeometry(geometry)).not.toThrow();
  const dataset = buildingFixture();
  dataset.records[0]!.geometry = geometry;
  expect(buildingDatasetSchema.parse(dataset).records[0]!.geometry).toEqual(
    geometry,
  );
});
test('closed/simple nonzero WGS84 footprint validation rejects invalid rings, holes, parts, backtracking and dimensions without simplification', () => {
  const invalid: unknown[] = [
    {
      type: 'Polygon',
      coordinates: [
        [
          [10, 20],
          [10.001, 20],
          [10, 20.001],
          [10, 20.0001],
        ],
      ],
    },
    {
      type: 'Polygon',
      coordinates: [
        [
          [10, 20],
          [10.001, 20.001],
          [10.001, 20],
          [10, 20.001],
          [10, 20],
        ],
      ],
    },
    {
      type: 'Polygon',
      coordinates: [
        [
          [10, 20],
          [10.001, 20],
          [10.0005, 20],
          [10.001, 20.001],
          [10, 20],
        ],
      ],
    },
    {
      type: 'Polygon',
      coordinates: [
        [
          [10, 20],
          [10.001, 20],
          [10.002, 20],
          [10, 20],
        ],
      ],
    },
    {
      type: 'Polygon',
      coordinates: [
        ...testBuildingGeometry.coordinates,
        [
          [11, 21],
          [11.001, 21],
          [11.001, 21.001],
          [11, 21],
        ],
      ],
    },
    {
      type: 'MultiPolygon',
      coordinates: [
        testBuildingGeometry.coordinates,
        testBuildingGeometry.coordinates,
      ],
    },
    {
      type: 'Polygon',
      coordinates: [
        [
          [179.99, 0],
          [-179.99, 0],
          [-179.99, 0.001],
          [179.99, 0],
        ],
      ],
    },
    {
      type: 'Polygon',
      coordinates: [
        [
          [10, 20, 50],
          [10.001, 20],
          [10, 20.001],
          [10, 20, 50],
        ],
      ],
    },
  ];
  for (const geometry of invalid) {
    const d = buildingFixture();
    expect(
      buildingDatasetSchema.safeParse({
        ...d,
        records: [{ ...d.records[0], geometry }],
      }).success,
    ).toBe(false);
  }
  expect(() =>
    validateBuildingGeometry(testBuildingGeometry, { remaining: 0 }),
  ).toThrow('budget');
  expect(
    buildingGeometrySchema.safeParse({
      ...testBuildingGeometry,
      remote: 'https://example.org',
    }).success,
  ).toBe(false);
});
test('explicit height units convert without changing measurements; missing/absolute/unknown heights, duplicate IDs, costly geometry and data references are rejected', () => {
  expect(buildingHeightMetres(100, 'feet')).toBe(30.48);
  expect(
    buildingDatasetSchema.safeParse({
      ...buildingFixture(),
      heightUnit: 'feet',
      records: [{ ...buildingFixture().records[0], height: Number.MIN_VALUE }],
    }).success,
  ).toBe(false);
  expect(buildingHeightMetres(100, 'usSurveyFeet')).toBeCloseTo(
    30.48006096012192,
    12,
  );
  const dataset = buildingFixture();
  for (const height of [0, -1, Infinity, NaN, 1501])
    expect(
      buildingDatasetSchema.safeParse({
        ...dataset,
        records: [{ ...dataset.records[0], height }],
      }).success,
    ).toBe(false);
  expect(
    buildingDatasetSchema.safeParse({ ...dataset, heightUnit: 'unknown' })
      .success,
  ).toBe(false);
  expect(
    buildingDatasetSchema.safeParse({
      ...dataset,
      provenance: {
        ...dataset.provenance,
        heightReference: 'absolute-elevation',
      },
    }).success,
  ).toBe(false);
  expect(
    buildingDatasetSchema.safeParse({
      ...dataset,
      records: [...dataset.records, ...dataset.records],
    }).success,
  ).toBe(false);
  expect(
    buildingDatasetSchema.safeParse({
      ...dataset,
      records: Array.from({ length: 501 }, (_, i) => ({
        ...dataset.records[0],
        id: String(i),
      })),
    }).success,
  ).toBe(false);
  const project = createDemo();
  project.scenes[0]!.layers.push(
    layerSchema.parse({
      id: 'b',
      name: 'Building',
      type: 'buildings',
      buildingDatasetId: dataset.id,
      timeRange: { start: 0, end: 12 },
      style: { color: '#ffffff' },
    }),
  );
  expect(projectSchema.safeParse(project).success).toBe(false);
  project.buildingDatasets.push(dataset);
  expect(projectSchema.safeParse(project).success).toBe(true);
  project.scenes[0]!.layers[0]!.tracks.heightScale.push({
    time: 0,
    value: 1,
    easing: 'linear',
  });
  expect(projectSchema.safeParse(project).success).toBe(false);
});
