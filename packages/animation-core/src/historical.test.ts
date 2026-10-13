import { test, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { historicalManifestSchema } from '../../project-schema/src/historical';
import { validateHistoricalGeometry } from '../../project-schema/src/historicalGeometry';
import { evaluateHistorical } from './historical';
test('real source epochs use declared year coverage, retain original geometry/legacy labels and produce deterministic topology-checked illustrative single-region morphs', async () => {
  const dataset = historicalManifestSchema.parse(
      JSON.parse(
        await readFile(
          'apps/web/public/data/history/dc-wards-1982-2011.json',
          'utf8',
        ),
      ),
    ).dataset,
    before = structuredClone(dataset);
  for (const [year, epoch] of [
    [1982, 0],
    [1991, 0],
    [1992, 1],
    [2001, 1],
    [2002, 2],
    [2011, 2],
  ]) {
    const state = evaluateHistorical(dataset, ['ward-1'], year!, 'source');
    expect(state.status).toBe('source');
    expect(state.features[0]!.geometry).toEqual(
      dataset.epochs[epoch!]!.features.find((f) => f.regionId === 'ward-1')!
        .geometry,
    );
  }
  for (const year of [1981, 2012])
    expect(evaluateHistorical(dataset, ['ward-1'], year, 'source').status).toBe(
      'missing',
    );
  for (const region of dataset.regions) {
    const middle = evaluateHistorical(dataset, [region.id], 1987, 'morph');
    expect(middle.status).toBe('morph');
    expect(middle.label).toContain('not factual');
    validateHistoricalGeometry(middle.features[0]!.geometry);
    expect(evaluateHistorical(dataset, [region.id], 1987, 'morph')).toEqual(
      middle,
    );
  }
  expect(
    evaluateHistorical(dataset, ['ward-1', 'ward-2'], 1987, 'morph').status,
  ).toBe('blocked');
  expect(dataset).toEqual(before);
});
test('missing explicit correspondence, holes and part changes block morph instead of fabricating geometry; source cuts remain available', async () => {
  const dataset = historicalManifestSchema.parse(
    JSON.parse(
      await readFile(
        'apps/web/public/data/history/dc-wards-1982-2011.json',
        'utf8',
      ),
    ),
  ).dataset;
  const target = dataset.epochs[1]!.features.find(
    (f) => f.regionId === 'ward-1',
  )!;
  target.geometry = {
    type: 'MultiPolygon',
    coordinates: [
      target.geometry.type === 'Polygon'
        ? target.geometry.coordinates
        : target.geometry.coordinates[0]!,
    ],
  };
  const blocked = evaluateHistorical(dataset, ['ward-1'], 1987, 'morph');
  expect(blocked.status).toBe('blocked');
  expect(blocked.features).toEqual([]);
  expect(blocked.label).toContain('simple Polygon');
  expect(evaluateHistorical(dataset, ['ward-1'], 1992, 'source').status).toBe(
    'source',
  );
  dataset.epochs[1]!.features = dataset.epochs[1]!.features.filter(
    (f) => f.regionId !== 'ward-1',
  );
  expect(evaluateHistorical(dataset, ['ward-1'], 1987, 'morph').status).toBe(
    'blocked',
  );
});
