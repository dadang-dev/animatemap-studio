import { readFile } from 'node:fs/promises';
import { test, expect } from 'vitest';
import {
  createDemo,
  projectV14Schema,
  projectSchema,
  migrateProject,
  historicalManifestSchema,
} from './index';
import { addHistoricalLayer } from '../../../apps/web/src/historyOperations';
import { evaluateProjectAt } from '../../animation-core/src/index';
test('actual v14 migration preserves existing content and defaults v15 history, rejecting malformed legacy projects', () => {
  const legacy = projectV14Schema.parse({ ...createDemo(), schemaVersion: 14 });
  const upgraded = migrateProject(legacy);
  expect(upgraded.schemaVersion).toBe(15);
  expect(upgraded.historicalDatasets).toEqual([]);
  expect(projectV14Schema.parse({ ...upgraded, schemaVersion: 14 })).toEqual(
    legacy,
  );
  expect(() => migrateProject({ ...legacy, scenes: [] })).toThrow();
  expect(() => migrateProject({ ...legacy, schemaVersion: 16 })).toThrow();
});
test('project historical refs, tracks and scene workloads are validated; shared evaluation seeks source cuts, missing years and illustrative morph deterministically', async () => {
  const dataset = historicalManifestSchema.parse(
    JSON.parse(
      await readFile(
        'apps/web/public/data/history/dc-wards-1982-2011.json',
        'utf8',
      ),
    ),
  ).dataset;
  const project = createDemo();
  addHistoricalLayer(project, project.scenes[0]!.id, dataset, true, 'history');
  const layer = project.scenes[0]!.layers.at(-1)!;
  if (layer.type !== 'historical') throw new Error('Wrong layer');
  layer.regionIds = ['ward-1'];
  layer.tracks.historyYear = [
    { time: 0, value: 1982, easing: 'linear' },
    { time: 10, value: 1992, easing: 'linear' },
  ];
  const valid = projectSchema.parse(project);
  const state = (t: number) =>
    evaluateProjectAt(valid, t).layers.at(-1)!.historical!;
  expect(state(0).sourceEpochIds).toEqual([dataset.epochs[0]!.id]);
  expect(state(10).sourceEpochIds).toEqual([dataset.epochs[1]!.id]);
  expect(state(5)).toEqual(state(5));
  layer.mode = 'morph';
  const morph = evaluateProjectAt(projectSchema.parse(project), 5).layers.at(
    -1,
  )!.historical!;
  expect(morph.status).toBe('morph');
  expect(morph.label).toContain('Illustrative');
  layer.tracks.historyYear = [];
  layer.historyYear = 2012;
  expect(
    evaluateProjectAt(projectSchema.parse(project), 0).layers.at(-1)!
      .historical!.status,
  ).toBe('missing');
  for (const invalid of [
    { ...project, historicalDatasets: [] },
    { ...project, historicalDatasets: [dataset, dataset] },
    {
      ...project,
      scenes: project.scenes.map((s) => ({
        ...s,
        layers: s.layers.map((l) =>
          l.type === 'historical' ? { ...l, regionIds: ['missing'] } : l,
        ),
      })),
    },
    {
      ...project,
      scenes: project.scenes.map((s) => ({
        ...s,
        layers: s.layers.map((l) =>
          l.type === 'historical'
            ? {
                ...l,
                tracks: {
                  ...l.tracks,
                  historyYear: [{ time: 13, value: 1982, easing: 'linear' }],
                },
              }
            : l,
        ),
      })),
    },
  ])
    expect(projectSchema.safeParse(invalid).success).toBe(false);
  layer.mode = 'source';
  layer.regionIds = dataset.regions.map((r) => r.id);
  project.scenes[0]!.layers.push(
    ...Array.from({ length: 5 }, (_, i) => ({
      ...structuredClone(layer),
      id: `duplicate-${i}`,
    })),
  );
  expect(projectSchema.safeParse(project).success).toBe(false);
});
