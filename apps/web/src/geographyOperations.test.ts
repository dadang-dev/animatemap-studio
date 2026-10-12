import { test, expect } from 'vitest';
import {
  createDemo,
  migrateProject,
  projectSchema,
} from '@animatemap/project-schema';
import { evaluateProjectAt } from '@animatemap/animation-core';
import { addGeographicLayer } from './geographyOperations';
import { useEditor } from './store';
import { instantiateTemplate, savedTemplate } from './templates';
const source = {
  provider: 'natural-earth',
  kind: 'place',
  sourceId: 'ne-1159151251',
  source: 'https://www.naturalearthdata.com/',
  license: 'Public domain',
  credit: 'Natural Earth places · v5.1.2',
  retrievedAt: '2026-10-11T00:00:00.000Z',
  datasetVersion: '5.1.2',
  sha256: '9b8e3de09048ef00dfc70357dbb9fa324493f214b5e0ae4daf1aa79a8d10116b',
};
const place = {
  id: source.sourceId,
  label: 'Hanoi, Vietnam',
  country: 'Vietnam',
  coordinates: [105.848068, 21.035273],
  source,
};
test('reviewed place imports as ordinary marker; history/templates/JSON preserve independent source metadata', () => {
  const original = createDemo();
  useEditor.getState().load(original);
  useEditor.getState().edit((p) => {
    addGeographicLayer(p, p.scenes[0]!.id, place, 'place', 'reviewed');
  });
  const imported = useEditor.getState().project;
  expect(imported.scenes[0]!.layers.at(-1)).toMatchObject({
    type: 'marker',
    geographySource: source,
  });
  expect(migrateProject(JSON.parse(JSON.stringify(imported)))).toEqual(
    imported,
  );
  expect(
    instantiateTemplate(
      savedTemplate('Reviewed places', imported),
    ).scenes[0]!.layers.at(-1),
  ).toMatchObject({
    geographySource: source,
  });
  useEditor.getState().undo();
  expect(useEditor.getState().project).toEqual(original);
  useEditor.getState().redo();
  expect(useEditor.getState().project).toEqual(imported);
});
test('actual v10 migration preserves visual evaluation and future schemas/wrong provenance are rejected', () => {
  const project = createDemo(),
    legacy = { ...project, schemaVersion: 10 };
  const parsed = migrateProject(legacy);
  for (const time of [0, 3, 6, 9, 12])
    expect(evaluateProjectAt(parsed, time)).toEqual(
      evaluateProjectAt(project, time),
    );
  expect(() => migrateProject({ ...project, schemaVersion: 999 })).toThrow();
  addGeographicLayer(project, project.scenes[0]!.id, place, 'place');
  const marker = project.scenes[0]!.layers.at(-1)!;
  if (marker.type === 'marker') marker.geographySource!.kind = 'road-route';
  expect(projectSchema.safeParse(project).success).toBe(false);
  expect(() =>
    addGeographicLayer(project, 'missing', place, 'place'),
  ).toThrow();
});
