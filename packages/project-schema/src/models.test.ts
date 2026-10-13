import { test, expect } from 'vitest';
import { modelAssetSchema } from './models';
import { validateModelArc } from './models';
import { modelFixture } from './models.fixture';
import {
  createDemo,
  migrateProject,
  projectV13Schema,
  projectSchema,
  layerSchema,
  CURRENT_SCHEMA_VERSION,
} from './index';
import { addModelLayer } from '../../../apps/web/src/modelOperations';
test('actual v13 validation/migration retains buildings, terrain/media/timing and adds empty models/follow/tracks without modifying input', () => {
  const input = projectV13Schema.parse({ ...createDemo(), schemaVersion: 13 }),
    original = structuredClone(input),
    result = migrateProject(input);
  expect(input).toEqual(original);
  expect(result.modelAssets).toEqual([]);
  expect(result.scenes[0]!.camera.follow).toBeNull();
  expect(result.scenes[0]!.layers[0]!.tracks.motionProgress).toEqual([]);
  expect(projectV13Schema.parse({ ...result, schemaVersion: 13 })).toEqual(
    original,
  );
  expect(
    projectSchema.safeParse({
      ...result,
      schemaVersion: CURRENT_SCHEMA_VERSION + 1,
    }).success,
  ).toBe(false);
  const layer = layerSchema.parse({
    id: 'model',
    name: 'Mesh',
    type: 'model',
    modelAssetId: 'test-mesh',
    timeRange: { start: 0, end: 12 },
    motion: { type: 'stationary', coordinates: [10, 20] },
    style: { color: '#ffffff' },
  });
  expect(
    projectV13Schema.safeParse({
      ...input,
      scenes: [{ ...input.scenes[0], layers: [layer] }],
    }).success,
  ).toBe(false);
});
test('terrain model paths validate whole geodesic latitude extrema, not only waypoints; valid inside paths and stationary anchors remain accepted without follow', () => {
  const p = createDemo(),
    s = p.scenes[0]!;
  p.map.terrain = {
    packId: 'sapa-2026-10-12',
    exaggeration: 1,
    hillshade: false,
  };
  s.camera.keyframes = [
    {
      time: 0,
      value: { lng: 103.8, lat: 22.3, zoom: 17, pitch: 55, bearing: 0 },
      easing: 'linear',
    },
  ];
  addModelLayer(
    p,
    s.id,
    modelFixture(),
    s.camera.keyframes[0]!.value,
    'regional',
  );
  const model = s.layers.at(-1)!;
  if (model.type !== 'model') throw new Error('Expected model');
  expect(projectSchema.safeParse(p).success).toBe(true);
  model.motion = {
    type: 'path',
    coordinates: [
      [103.6, 22.3],
      [103.9, 22.3],
    ],
    alignHeading: true,
  };
  expect(projectSchema.safeParse(p).success).toBe(true);
  model.motion.coordinates = [
    [102.66, 23.2408],
    [104.76, 23.2408],
  ];
  const result = projectSchema.safeParse(p);
  expect(s.camera.follow).toBeNull();
  expect(result.success).toBe(false);
  if (!result.success)
    expect(
      result.error.issues.some((i) => i.message.includes('between waypoints')),
    ).toBe(true);
});
test('model boundaries reject nonfinite/degenerate/missing vertices, unsupported assets/units, budgets and invalid same-scene follow without overriding saved content', () => {
  const asset = modelFixture();
  for (const vertices of [
    [
      [0, 0, 0],
      [1, 0, 0],
      [2, 0, 0],
    ],
    [
      [Infinity, 0, 0],
      [0, 5, 0],
      [0, 0, 5],
    ],
  ])
    expect(
      modelAssetSchema.safeParse({ ...asset, vertices, triangles: [[0, 1, 2]] })
        .success,
    ).toBe(false);
  expect(
    modelAssetSchema.safeParse({ ...asset, triangles: [[0, 1, 99]] }).success,
  ).toBe(false);
  expect(
    modelAssetSchema.safeParse({ ...asset, unit: 'unknown' }).success,
  ).toBe(false);
  expect(
    modelAssetSchema.safeParse({
      ...asset,
      vertices: [
        [99999, 0, 0],
        [99999.001, 0, 0],
        [99999, 0.001, 0],
      ],
      triangles: [[0, 1, 2]],
    }).success,
  ).toBe(false);
  expect(() => validateModelArc([0, 84.9], [180, 84.9])).toThrow('polar');
  expect(() => validateModelArc([0, 0], [180, 0])).toThrow('Antipodal');
  expect(() => validateModelArc([179.9, 30], [-179.9, 30])).not.toThrow();
  expect(
    modelAssetSchema.safeParse({
      ...asset,
      remote: 'https://example.org/evil.obj',
    }).success,
  ).toBe(false);
  expect(
    modelAssetSchema.safeParse({
      ...asset,
      triangles: Array.from({ length: 20001 }, () => [0, 1, 3]),
    }).success,
  ).toBe(false);
  const p = createDemo();
  addModelLayer(
    p,
    p.scenes[0]!.id,
    asset,
    { lng: 10, lat: 20, zoom: 17, bearing: 0, pitch: 55 },
    'model',
  );
  p.scenes[0]!.camera.follow = {
    layerId: 'model',
    zoom: 17,
    pitch: 55,
    bearingMode: 'heading',
    bearing: 0,
  };
  expect(projectSchema.safeParse(p).success).toBe(true);
  expect(projectSchema.safeParse({ ...p, modelAssets: [] }).success).toBe(
    false,
  );
  const missing = structuredClone(p);
  missing.scenes[0]!.camera.follow!.layerId = 'unknown';
  expect(projectSchema.safeParse(missing).success).toBe(false);
  const badPath = structuredClone(p);
  const l = badPath.scenes[0]!.layers.at(-1)!;
  if (l.type === 'model')
    l.motion = {
      type: 'path',
      coordinates: [
        [180, 0],
        [-180, 0],
      ],
      alignHeading: true,
    };
  expect(projectSchema.safeParse(badPath).success).toBe(false);
  const unsupported = structuredClone(p);
  unsupported.scenes[0]!.layers[0]!.tracks.altitude = [
    { time: 0, value: 100, easing: 'linear' },
  ];
  expect(projectSchema.safeParse(unsupported).success).toBe(false);
  const overdraw = structuredClone(p);
  for (let i = 0; i < 20; i++)
    overdraw.scenes[0]!.layers.push({
      ...overdraw.scenes[0]!.layers.at(-1)!,
      id: `mesh-${i}`,
    });
  expect(projectSchema.safeParse(overdraw).success).toBe(false);
});
