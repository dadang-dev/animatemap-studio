import { buildingDatasetSchema, type BuildingGeometry } from './buildings';
// Authored CC0 test geometry, not a surveyed building or live source proof.
export const testBuildingGeometry: Extract<
  BuildingGeometry,
  { type: 'Polygon' }
> = {
  type: 'Polygon',
  coordinates: [
    [
      [10, 20],
      [10.001, 20],
      [10.001, 20.001],
      [10, 20.001],
      [10, 20],
    ],
  ],
};
export function buildingFixture() {
  return buildingDatasetSchema.parse({
    id: 'test-buildings',
    name: 'Authored test prisms',
    heightUnit: 'metres',
    provenance: {
      source: 'Authored automated test geometry',
      author: 'AnimateMap contributors',
      license: 'CC0-1.0',
      licenseURL: 'https://creativecommons.org/publicdomain/zero/1.0/',
      credit: 'Authored test geometry · CC0',
      accessedAt: '2026-10-13T00:00:00.000Z',
      surveyYear: null,
      uncertainty:
        'Synthetic test data; no real architectural accuracy implied',
      sourceSha256: '0'.repeat(64),
      heightField: 'height',
      heightReference: 'above-grade',
    },
    records: [
      {
        id: 'one',
        height: 100,
        geometry: structuredClone(testBuildingGeometry),
      },
    ],
  });
}
