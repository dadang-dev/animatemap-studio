import { describe, expect, test } from 'vitest';
import {
  CURRENT_SCHEMA_VERSION,
  createDemo,
  migrateProject,
  projectSchema,
  projectV3Schema,
} from './index';
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
    const future = {
      ...createDemo(),
      schemaVersion: CURRENT_SCHEMA_VERSION + 1,
    };
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
test('current canvas accepts 4K/60 while legacy contracts and unsupported FPS reject it', () => {
  const project = createDemo();
  project.canvas = { width: 3840, height: 2160, fps: 60 };
  expect(projectSchema.parse(project)).toEqual(project);
  expect(
    projectV3Schema.safeParse({ ...project, schemaVersion: 3 }).success,
  ).toBe(false);
  expect(
    projectSchema.safeParse({
      ...project,
      canvas: { ...project.canvas, fps: 50 },
    }).success,
  ).toBe(false);
});
