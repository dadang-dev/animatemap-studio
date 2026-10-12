import { test, expect } from 'vitest';
import {
  importBuildingBytes,
  inspectBuildingBytes,
  type BuildingImportOptions,
} from './buildingImport';
import { buildingFixture } from '../../../packages/project-schema/src/buildings.fixture';
const bytes = (input: unknown) =>
  new TextEncoder().encode(JSON.stringify(input));
test('local WGS84 import maps selected source fields/units, groups and exact geometry; records raw file checksum and never converts missing/string heights', async () => {
  const d = buildingFixture(),
    record = d.records[0]!;
  const file = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        id: 'one',
        geometry: record.geometry,
        properties: { feet: 100, group: 55 },
      },
    ],
  };
  const options: BuildingImportOptions = {
    ...d,
    heightUnit: 'feet',
    idField: '',
    buildingIdField: 'group',
    provenance: { ...d.provenance, heightField: 'feet' },
  };
  const inspection = await inspectBuildingBytes(bytes(file));
  expect(inspection.fields).toEqual(['feet', 'group']);
  const imported = await importBuildingBytes(bytes(file), options);
  expect(imported.records[0]).toEqual({ ...record, buildingId: '55' });
  expect(imported.provenance.sourceSha256).toBe(inspection.sourceSha256);
  for (const height of [null, '100', undefined])
    await expect(
      importBuildingBytes(
        bytes({
          ...file,
          features: [
            { ...file.features[0], properties: { feet: height, group: 55 } },
          ],
        }),
        options,
      ),
    ).rejects.toThrow();
  await expect(
    inspectBuildingBytes(
      bytes({
        ...file,
        crs: { type: 'name', properties: { name: 'EPSG:3857' } },
      }),
    ),
  ).rejects.toThrow();
  await expect(
    inspectBuildingBytes(new Uint8Array(3 * 1024 * 1024 + 1)),
  ).rejects.toThrow('3 MiB');
  await expect(inspectBuildingBytes(new Uint8Array([255]))).rejects.toThrow();
});
