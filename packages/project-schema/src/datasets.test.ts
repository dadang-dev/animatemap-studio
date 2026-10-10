import { expect, test } from 'vitest';
import {
  createDemo,
  datasetSchema,
  migrateProject,
  projectV7Schema,
} from './index';
import { testDataset, testDataProject } from './datasets.fixture';
test('dataset records and identifiers reject duplicates, unsupported countries, nonfinite values and missing sources', () => {
  const dataset = testDataset();
  expect(() =>
    datasetSchema.parse({
      ...dataset,
      records: [...dataset.records, dataset.records[0]],
    }),
  ).toThrow('Duplicate');
  expect(() =>
    datasetSchema.parse({
      ...dataset,
      records: [{ countryCode: 'XYZ', year: 2020, value: 1 }],
    }),
  ).toThrow('Natural Earth');
  expect(() =>
    datasetSchema.parse({
      ...dataset,
      records: [{ countryCode: 'VNM', year: 2020, value: Infinity }],
    }),
  ).toThrow();
  expect(() =>
    datasetSchema.parse({
      ...dataset,
      provenance: { ...dataset.provenance, source: '' },
    }),
  ).toThrow();
  expect(() =>
    migrateProject({ ...testDataProject(), datasets: [dataset, dataset] }),
  ).toThrow('Duplicate dataset');
});
test('choropleth references/domain/data year and key timing are validated before persistence', () => {
  const project = testDataProject();
  expect(migrateProject(JSON.parse(JSON.stringify(project)))).toEqual(project);
  expect(() => migrateProject({ ...project, datasets: [] })).toThrow(
    'Missing choropleth',
  );
  const layer = project.scenes[0]!.layers.find(
    (layer) => layer.type === 'choropleth',
  )!;
  layer.domain.max = layer.domain.min;
  expect(() => migrateProject(project)).toThrow('maximum');
  layer.domain.max = 100;
  layer.dataYear = 2019;
  expect(() => migrateProject(project)).toThrow('observed');
  layer.dataYear = 2020;
  layer.tracks.dataYear[1]!.time = 13;
  expect(() => migrateProject(project)).toThrow('scene duration');
  layer.tracks.dataYear[1]!.time = 12;
  project.scenes[0]!.layers[0]!.tracks.dataYear = [
    { time: 0, value: 2020, easing: 'linear' },
  ];
  expect(() => migrateProject(project)).toThrow('require a choropleth');
});
test('v7 migration retains label policy and content, adding empty datasets/data-year tracks', () => {
  const current = createDemo();
  const text = current.scenes[0]!.layers.find(
    (layer) => layer.type === 'text',
  )!;
  text.collision = { mode: 'hide', priority: 90 };
  const legacy = projectV7Schema.parse({ ...current, schemaVersion: 7 });
  expect(migrateProject(legacy)).toEqual(current);
  expect(migrateProject(legacy).datasets).toEqual([]);
});
test('aggregate project observation limits apply across datasets', () => {
  const project = testDataProject();
  const records = Array.from({ length: 2500 }, (_, index) => ({
    countryCode: 'VNM',
    year: index + 1,
    value: index,
  }));
  for (let index = 0; index < 4; index++)
    project.datasets.push({ ...testDataset(), id: `extra-${index}`, records });
  expect(() => migrateProject(project)).toThrow('10000 observations');
});
