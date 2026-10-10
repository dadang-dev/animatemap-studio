import { describe, expect, test } from 'vitest';
import { createDemo, migrateProject, projectSchema } from './index';
describe('Project boundaries', () => {
  test.each(['travel', 'highlight'] as const)(
    'validates %s fixture and round trips Unicode',
    (kind) => {
      const project = createDemo(kind);
      expect(migrateProject(JSON.parse(JSON.stringify(project)))).toEqual(
        project,
      );
    },
  );
  test('rejects future versions, invalid coordinates, duplicate IDs, out-of-scene and unordered keys', () => {
    const future = { ...createDemo(), schemaVersion: 4 };
    expect(projectSchema.safeParse(future).success).toBe(false);
    const p = createDemo();
    p.scenes[0]!.camera.keyframes[0]!.value.lng = 181;
    expect(projectSchema.safeParse(p).success).toBe(false);
    const duplicate = createDemo();
    duplicate.scenes[0]!.layers[0]!.id = 'scene-1';
    expect(projectSchema.safeParse(duplicate).success).toBe(false);
    const timing = createDemo();
    timing.scenes[0]!.layers[0]!.timeRange.end = 13;
    expect(projectSchema.safeParse(timing).success).toBe(false);
    const keys = createDemo();
    keys.scenes[0]!.camera.keyframes[1]!.time = 0;
    expect(projectSchema.safeParse(keys).success).toBe(false);
  });
});
