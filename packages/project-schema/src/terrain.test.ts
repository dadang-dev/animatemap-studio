import { test, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { PNG } from 'pngjs';
import {
  createDemo,
  migrateProject,
  projectV11Schema,
  terrainPack,
  CURRENT_SCHEMA_VERSION,
} from './index';
test('actual v11 projects migrate to disabled terrain without losing geographic sources, audio, timing or original input', () => {
  const input = projectV11Schema.parse({ ...createDemo(), schemaVersion: 11 }),
    original = JSON.stringify(input);
  const migrated = migrateProject(input);
  expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  expect(migrated.map.terrain).toBeNull();
  expect(projectV11Schema.parse({ ...migrated, schemaVersion: 11 })).toEqual(
    input,
  );
  expect(JSON.stringify(input)).toBe(original);
  expect(migrateProject(JSON.parse(JSON.stringify(migrated)))).toEqual(
    migrated,
  );
});
test('terrain validates pinned provider, finite exaggeration and supported camera keys', () => {
  const project = createDemo();
  project.map.terrain = {
    packId: 'sapa-2026-10-12',
    exaggeration: 1,
    hillshade: true,
  };
  expect(() => migrateProject(project)).toThrow('Terrain cameras');
  project.scenes[0]!.camera.keyframes = [
    {
      time: 0,
      value: { lng: 103.8, lat: 22.3, zoom: 10.5, bearing: 20, pitch: 55 },
      easing: 'linear',
    },
  ];
  expect(migrateProject(project)).toEqual(project);
  for (const value of [0, 4, Infinity, NaN])
    expect(() =>
      migrateProject({
        ...project,
        map: {
          ...project.map,
          terrain: { ...project.map.terrain, exaggeration: value },
        },
      }),
    ).toThrow();
  expect(() =>
    migrateProject({
      ...project,
      map: {
        ...project.map,
        terrain: {
          ...project.map.terrain,
          packId: 'https://untrusted.example/dem',
        },
      },
    }),
  ).toThrow();
  expect(() =>
    migrateProject({
      ...project,
      map: {
        ...project.map,
        terrain: {
          ...project.map.terrain,
          url: 'https://untrusted.example/dem',
        },
      },
    }),
  ).toThrow();
  expect(() =>
    migrateProject({ ...project, schemaVersion: CURRENT_SCHEMA_VERSION + 1 }),
  ).toThrow();
});
test('nine pinned original DEM tiles retain bytes, SHA, alpha, Terrarium elevations and source coverage', async () => {
  expect(terrainPack.tiles).toHaveLength(9);
  let bytes = 0;
  const ids = new Set<string>();
  for (const tile of terrainPack.tiles) {
    const content = await readFile(
      `apps/web/public/data/terrain/${terrainPack.id}/${tile.z}/${tile.x}/${tile.y}.png`,
    );
    expect(content.length).toBe(tile.bytes);
    bytes += content.length;
    expect(createHash('sha256').update(content).digest('hex')).toBe(
      tile.sha256,
    );
    expect(tile.source).toBe(
      `https://elevation-tiles-prod.s3.amazonaws.com/terrarium/${tile.z}/${tile.x}/${tile.y}.png`,
    );
    const key = `${tile.z}/${tile.x}/${tile.y}`;
    expect(ids.has(key)).toBe(false);
    ids.add(key);
    const png = PNG.sync.read(content);
    expect([png.width, png.height]).toEqual([256, 256]);
    let minimum = Infinity,
      maximum = -Infinity;
    let invalidAlphaPixel = -1;
    for (let p = 0; p < png.data.length; p += 4) {
      const meters =
        png.data[p]! * 256 + png.data[p + 1]! + png.data[p + 2]! / 256 - 32768;
      if (png.data[p + 3] !== 255 && invalidAlphaPixel === -1)
        invalidAlphaPixel = p / 4;
      minimum = Math.min(minimum, meters);
      maximum = Math.max(maximum, meters);
    }
    expect([minimum, maximum]).toEqual([tile.minMeters, tile.maxMeters]);
    expect(invalidAlphaPixel, `Non-opaque pixel in ${key}`).toBe(-1);
  }
  expect(bytes).toBe(864969);
  expect(
    terrainPack.tiles.find((t) => t.x === 403 && t.y === 223)?.sha256,
  ).toBe('a9ae6b692b36055d493465ddd1b64efdc27371e2285fdcce5ed589acdd88bc34');
});
