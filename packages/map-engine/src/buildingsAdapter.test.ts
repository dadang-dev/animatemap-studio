import { test, expect } from 'vitest';
import { buildingFeatures } from './buildingsAdapter';
import { buildingFixture } from '../../project-schema/src/buildings.fixture';
test('extrusion source preserves exact polygons/source IDs and converts declared AGL units; cached geometry changes only with immutable dataset changes', () => {
  const d = buildingFixture();
  d.heightUnit = 'feet';
  const first = buildingFeatures(d);
  expect(first.data.features[0]!.geometry).toEqual(d.records[0]!.geometry);
  expect(first.data.features[0]!.properties).toMatchObject({
    sourceId: 'one',
    heightMetres: 30.48,
  });
  expect(buildingFeatures(d)).toBe(first);
  const changed = structuredClone(d);
  changed.records[0]!.height = 50;
  expect(buildingFeatures(changed).signature).not.toBe(first.signature);
  expect(
    buildingFeatures(changed).data.features[0]!.properties?.heightMetres,
  ).toBe(15.24);
});
