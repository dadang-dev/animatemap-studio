import { expect, test } from 'vitest';
import {
  createDemo,
  datasetSchema,
  defaultDataDomain,
  layerSchema,
} from '@animatemap/project-schema';
import { evaluateChoropleth, interpolateColor } from './choropleth';
import { evaluateProjectAt } from './index';
const dataset = datasetSchema.parse({
  id: 'data',
  name: 'Illustrative data',
  provenance: {
    source: 'Test observations',
    author: 'AnimateMap',
    license: 'CC0',
    credit: 'Test data · CC0',
  },
  records: [
    { countryCode: 'VNM', year: 2020, value: 0 },
    { countryCode: 'VNM', year: 2022, value: 100 },
    { countryCode: 'THA', year: 2021, value: 40 },
  ],
});
const layer = layerSchema.parse({
  id: 'choropleth',
  name: 'Data',
  type: 'choropleth',
  datasetId: 'data',
  dataYear: 2020,
  timeRange: { start: 0, end: 12 },
  domain: { min: 0, max: 100 },
  style: {
    color: '#000000',
    highColor: '#ffffff',
    missingColor: '#666666',
    stroke: '#ffffff',
    width: 1,
  },
  tracks: {
    dataYear: [
      { time: 0, value: 2020 },
      { time: 12, value: 2022 },
    ],
  },
});
if (layer.type !== 'choropleth') throw new Error('Invalid test layer');
test('fixed-domain colors and numeric interpolation are bounded and missing values do not extrapolate', () => {
  const middle = evaluateChoropleth(dataset, layer, 2021);
  expect(middle.values).toEqual({ VNM: 50, THA: 40 });
  expect(middle.colors.VNM).toBe('#808080');
  expect(middle.estimated).toBe(true);
  expect(evaluateChoropleth(dataset, layer, 2020).values.THA).toBeNull();
  expect(evaluateChoropleth(dataset, layer, 2020).colors.THA).toBe('#666666');
  expect(evaluateChoropleth(dataset, layer, 2023).values.VNM).toBeNull();
  expect(interpolateColor('#123456', '#abcdef', -1)).toBe('#123456');
  expect(interpolateColor('#123456', '#abcdef', 2)).toBe('#abcdef');
  expect(
    defaultDataDomain([{ countryCode: 'VNM', year: 2020, value: 0 }]),
  ).toEqual({ min: -0.5, max: 0.5 });
});
test('step sampling holds observations while exact years remain observed', () => {
  expect(
    evaluateChoropleth(dataset, { ...layer, sampling: 'step' }, 2021).values
      .VNM,
  ).toBe(0);
  expect(evaluateChoropleth(dataset, layer, 2022).values.VNM).toBe(100);
  expect(evaluateChoropleth(dataset, layer, 2022).estimated).toBe(false);
});
test('data-year evaluation shares easing, scene timing and deterministic repeated seeks without mutation', () => {
  const project = createDemo();
  project.datasets.push(structuredClone(dataset));
  project.scenes[0]!.layers.push(structuredClone(layer));
  const before = structuredClone(project);
  const at = (time: number) =>
    evaluateProjectAt(project, time).layers.find(
      (layer) => layer.type === 'choropleth',
    )!.data;
  const forward = [0, 3, 6, 9, 12].map(at);
  expect([12, 9, 6, 3, 0].map(at)).toEqual([...forward].reverse());
  expect(at(6)!.values.VNM).toBe(50);
  expect(at(12)!.values.VNM).toBe(100);
  expect(project).toEqual(before);
  project.scenes[0]!.layers.at(-1)!.tracks.dataYear[0]!.easing = 'easeIn';
  expect(at(6)!.values.VNM).toBe(25);
});
