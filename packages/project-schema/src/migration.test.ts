import { readFile } from 'node:fs/promises';
import { expect, test } from 'vitest';
import { createDemo, migrateProject, projectV1Schema } from './index';

test('real v1 fixtures migrate to v2 with cuts and unchanged content', async () => {
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
    expect(migrated.schemaVersion).toBe(2);
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
  expect(() => migrateProject({ ...createDemo(), schemaVersion: 3 })).toThrow();
});
