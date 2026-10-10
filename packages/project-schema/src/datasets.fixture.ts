import { createDemo, datasetSchema, layerSchema, type Project } from './index';
export function testDataset() {
  return datasetSchema.parse({
    id: 'test-data',
    name: 'Illustrative index',
    unit: 'points',
    provenance: {
      source: 'Synthetic test observations, not measured statistics',
      author: 'AnimateMap contributors',
      license: 'CC0-1.0',
      credit: 'Illustrative data · CC0',
    },
    records: [
      { countryCode: 'VNM', year: 2020, value: 10 },
      { countryCode: 'VNM', year: 2022, value: 90 },
      { countryCode: 'THA', year: 2020, value: 20 },
      { countryCode: 'THA', year: 2022, value: 80 },
    ],
  });
}
export function testDataProject(): Project {
  const project = createDemo();
  project.datasets.push(testDataset());
  project.scenes[0]!.layers.push(
    layerSchema.parse({
      id: 'data-layer',
      name: 'Country index',
      type: 'choropleth',
      datasetId: 'test-data',
      dataYear: 2020,
      timeRange: { start: 0, end: 12 },
      domain: { min: 0, max: 100 },
      style: {
        color: '#24505a',
        highColor: '#8bdcc1',
        missingColor: '#666870',
        stroke: '#ffffff',
        width: 1,
      },
      tracks: {
        dataYear: [
          { time: 0, value: 2020 },
          { time: 12, value: 2022 },
        ],
      },
    }),
  );
  return project;
}
