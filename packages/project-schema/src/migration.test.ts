import { readFile } from 'node:fs/promises';
import { expect, test } from 'vitest';
import {
  createDemo,
  migrateProject,
  projectV1Schema,
  projectV2Schema,
  projectV3Schema,
  projectV4Schema,
  CURRENT_SCHEMA_VERSION,
} from './index';

test('real v1 fixtures migrate to the current schema with cuts and unchanged content', async () => {
  for (const name of ['travel-vietnam', 'southeast-asia-highlight']) {
    const input = JSON.parse(
      await readFile(
        new URL(`../../../examples/${name}.json`, import.meta.url),
        'utf8',
      ),
    );
    const original = JSON.stringify(input);
    const legacy = projectV1Schema.parse(input);
    const migrated = migrateProject(input);
    expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(
      migrated.scenes.every((scene) => scene.transition.type === 'cut'),
    ).toBe(true);
    const restored = projectV1Schema.parse({ ...migrated, schemaVersion: 1 });
    expect(restored).toEqual(legacy);
    expect(JSON.stringify(input)).toBe(original);
    expect(migrateProject(JSON.parse(JSON.stringify(migrated)))).toEqual(
      migrated,
    );
  }
});
test('crossfade rejects first scene, gaps, oversized durations, and future schemas', () => {
  const input = createDemo();
  input.scenes[0]!.transition = { type: 'crossfade', durationSeconds: 1 };
  expect(() => migrateProject(input)).toThrow('adjacent');
  const second = structuredClone(input.scenes[0]!);
  input.scenes[0]!.transition = { type: 'cut' };
  second.id = 'second';
  second.startSeconds = 13;
  second.layers.forEach((layer) => {
    layer.id = `second-${layer.id}`;
  });
  input.scenes.push(second);
  input.durationSeconds = 25;
  expect(() => migrateProject(input)).toThrow('adjacent');
  second.startSeconds = 12;
  input.durationSeconds = 24;
  second.transition = { type: 'crossfade', durationSeconds: 13 };
  expect(() => migrateProject(input)).toThrow();
  expect(() =>
    migrateProject({
      ...createDemo(),
      schemaVersion: CURRENT_SCHEMA_VERSION + 1,
    }),
  ).toThrow();
});

test('v2 migration preserves crossfade and base transforms while adding empty scalar tracks', () => {
  const input = createDemo();
  const second = structuredClone(input.scenes[0]!);
  second.id = 'second';
  second.startSeconds = 12;
  second.transition = { type: 'crossfade', durationSeconds: 1 };
  second.layers.forEach((layer) => {
    layer.id = `second-${layer.id}`;
    layer.transform = { scale: 2, rotation: 30, offsetX: 40, offsetY: -60 };
  });
  input.scenes.push(second);
  input.durationSeconds = 24;
  const legacy = projectV2Schema.parse({ ...input, schemaVersion: 2 });
  const before = JSON.stringify(legacy);
  const migrated = migrateProject(legacy);
  expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  expect(projectV2Schema.parse({ ...migrated, schemaVersion: 2 })).toEqual(
    legacy,
  );
  expect(migrated.scenes[1]!.layers[0]!.tracks.scale).toEqual([]);
  expect(JSON.stringify(legacy)).toBe(before);
});

test('v3 migration preserves scalar tracks and transitions without changing the source', () => {
  const project = createDemo();
  project.scenes[0]!.layers.find(
    (layer) => layer.type === 'text',
  )!.tracks.scale = [
    { time: 0, value: 0.2, easing: 'easeOut' },
    { time: 1, value: 1, easing: 'linear' },
  ];
  const legacy = projectV3Schema.parse({ ...project, schemaVersion: 3 });
  const before = JSON.stringify(legacy);
  const migrated = migrateProject(legacy);
  expect(projectV3Schema.parse({ ...migrated, schemaVersion: 3 })).toEqual(
    legacy,
  );
  expect(JSON.stringify(legacy)).toBe(before);
});
test('v4 migration preserves 60 FPS and all content without adding shape layers', () => {
  const project = createDemo();
  project.canvas.fps = 60;
  const legacy = projectV4Schema.parse({ ...project, schemaVersion: 4 });
  const before = JSON.stringify(legacy);
  const migrated = migrateProject(legacy);
  expect(projectV4Schema.parse({ ...migrated, schemaVersion: 4 })).toEqual(
    legacy,
  );
  expect(JSON.stringify(legacy)).toBe(before);
});
