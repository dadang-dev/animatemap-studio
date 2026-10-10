import { expect, test } from 'vitest';
import {
  createDemo,
  migrateProject,
  projectSchema,
  projectV1Schema,
  projectV2Schema,
  projectV3Schema,
  projectV4Schema,
  projectV5Schema,
  projectV6Schema,
  layerSchema,
  CURRENT_SCHEMA_VERSION,
} from './index';
import { testImage } from './assets.fixture';

test.each([1, 2, 3, 4, 5, 6])(
  'v%s migration retains label content/anchors and always-show behavior',
  (version) => {
    const input = { ...createDemo(), schemaVersion: version };
    const validators = [
      projectV1Schema,
      projectV2Schema,
      projectV3Schema,
      projectV4Schema,
      projectV5Schema,
      projectV6Schema,
    ];
    const legacy = validators[version - 1]!.parse(input);
    const migrated = migrateProject(legacy);
    expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(
      migrated.scenes[0]!.layers.filter(
        (layer) => layer.type === 'text' || layer.type === 'marker',
      ),
    ).toEqual(
      createDemo().scenes[0]!.layers.filter(
        (layer) => layer.type === 'text' || layer.type === 'marker',
      ),
    );
  },
);
test('v6 assets/shapes survive migration and current collision settings round trip strictly', () => {
  const project = createDemo();
  project.assets.push(testImage());
  project.scenes[0]!.layers.push(
    layerSchema.parse({
      type: 'image',
      id: 'logo',
      name: 'Logo',
      timeRange: { start: 0, end: 12 },
      assetId: project.assets[0]!.id,
      anchor: { type: 'screen', x: 0.8, y: 0.1 },
      style: { width: 80, height: 80, fit: 'contain' },
    }),
  );
  const legacy = projectV6Schema.parse({ ...project, schemaVersion: 6 });
  expect(migrateProject(legacy)).toEqual(project);
  const marker = project.scenes[0]!.layers.find(
    (layer) => layer.type === 'marker',
  )!;
  marker.collision = { mode: 'hide', priority: 90 };
  expect(migrateProject(JSON.parse(JSON.stringify(project)))).toEqual(project);
  for (const collision of [
    { mode: 'move', priority: 50 },
    { mode: 'hide', priority: -1 },
    { mode: 'hide', priority: 101 },
    { mode: 'hide', priority: 1.5 },
  ])
    expect(layerSchema.safeParse({ ...marker, collision }).success).toBe(false);
  expect(
    projectSchema.safeParse({
      ...project,
      schemaVersion: CURRENT_SCHEMA_VERSION + 1,
    }).success,
  ).toBe(false);
});
