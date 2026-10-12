import {
  buildingCollectionSchema,
  buildingDatasetSchema,
  MAX_BUILDING_BYTES,
  type BuildingDataset,
} from '@animatemap/project-schema';
import source from '../../../data/buildings/provenance.json' with { type: 'json' };
export const VANCOUVER_GEOJSON_SHA =
  '673b9e51078c00fbb4f87321b93981042883ddc85a17869f5e0023113cd7473c';
export type BuildingImportOptions = Omit<BuildingDataset, 'records'> & {
  idField: string;
  buildingIdField: string;
};
export function vancouverImportOptions(id: string): BuildingImportOptions {
  return {
    id,
    name: 'Vancouver · 2009 high-rise sample',
    heightUnit: 'metres',
    idField: 'id',
    buildingIdField: 'buildingId',
    provenance: {
      source: source.source,
      author: source.publisher,
      license: source.license,
      licenseURL: source.licenseURL,
      credit: source.credit,
      accessedAt: source.retrievedAt,
      surveyYear: 2009,
      uncertainty:
        'Generalized approximate 2009 LiDAR footprints. Highest 100 positive-height elements by hgt_agl, id; incomplete city sample, not updated or current architecture. Prisms do not recreate roof structure.',
      sourceSha256: source.sourceSha256,
      heightField: 'hgt_agl',
      heightReference: 'above-grade',
    },
  };
}
export async function inspectBuildingBytes(bytes: Uint8Array) {
  if (bytes.length > MAX_BUILDING_BYTES)
    throw new Error('GeoJSON exceeds 3 MiB');
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  const collection = buildingCollectionSchema.parse(JSON.parse(text));
  const fields = [
    ...new Set(collection.features.flatMap((f) => Object.keys(f.properties))),
  ].sort();
  if (
    fields.length > 100 ||
    collection.features.some((f) => Object.keys(f.properties).length > 100)
  )
    throw new Error('GeoJSON exceeds 100 property fields');
  const hash = await crypto.subtle.digest('SHA-256', new Uint8Array(bytes));
  return {
    collection,
    fields,
    count: collection.features.length,
    sourceSha256: [...new Uint8Array(hash)]
      .map((v) => v.toString(16).padStart(2, '0'))
      .join(''),
  };
}
export async function importBuildingBytes(
  bytes: Uint8Array,
  options: BuildingImportOptions,
  builtin = false,
): Promise<BuildingDataset> {
  const inspected = await inspectBuildingBytes(bytes);
  if (builtin && inspected.sourceSha256 !== VANCOUVER_GEOJSON_SHA)
    throw new Error('Bundled Vancouver footprint checksum mismatch');
  const idValue = (value: unknown) => {
    if (
      typeof value !== 'string' &&
      !(typeof value === 'number' && Number.isFinite(value))
    )
      throw new Error('Every footprint requires an explicit source ID');
    return String(value);
  };
  return buildingDatasetSchema.parse({
    id: options.id,
    name: options.name,
    heightUnit: options.heightUnit,
    provenance: {
      ...options.provenance,
      sourceSha256: builtin
        ? options.provenance.sourceSha256
        : inspected.sourceSha256,
    },
    records: inspected.collection.features.map((f) => ({
      id: idValue(options.idField ? f.properties[options.idField] : f.id),
      ...(options.buildingIdField
        ? { buildingId: idValue(f.properties[options.buildingIdField]) }
        : {}),
      height: f.properties[options.provenance.heightField],
      geometry: f.geometry,
    })),
  });
}
