import { test, expect } from 'vitest';
import {
  createDemo,
  projectV16Schema,
  migrateProject,
  projectSchema,
} from './index';
test('v16 migration preserves all content and leaves existing credit placement unchanged', () => {
  const old = projectV16Schema.parse({ ...createDemo(), schemaVersion: 16 });
  const upgraded = migrateProject(old);
  expect(upgraded.schemaVersion).toBe(17);
  expect(upgraded.map.creditLayout).toBeUndefined();
  expect(projectV16Schema.parse({ ...upgraded, schemaVersion: 16 })).toEqual(
    old,
  );
});
test('explicit credit layout round trips and rejects placements outside canvas bounds', () => {
  const p = createDemo();
  p.map.creditLayout = { bottomInset: 100, fontSize: 20, margin: 80 };
  expect(migrateProject(JSON.parse(JSON.stringify(p)))).toEqual(p);
  p.map.creditLayout.margin = 300;
  expect(() => projectSchema.parse(p)).toThrow();
  p.map.creditLayout.margin = 80;
  p.map.creditLayout.bottomInset = 384;
  p.canvas.height = 256;
  expect(() => projectSchema.parse(p)).toThrow('safe placement bounds');
});
