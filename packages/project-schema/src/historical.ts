import { z } from 'zod';
import {
  historicalGeometrySchema,
  historyVertexCount,
  validateHistoricalGeometry,
} from './historicalGeometry';
export {
  historicalGeometrySchema,
  historyPolygons,
  historyVertexCount,
  validateHistoricalGeometry,
  type HistoricalGeometry,
} from './historicalGeometry';
export const MAX_HISTORY_BYTES = 10 * 1024 * 1024,
  MAX_HISTORY_VERTICES = 100000;
const id = z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/),
  year = z.number().int().min(-10000).max(10000);
const url = z
  .url()
  .max(2048)
  .refine((value) => /^https?:\/\//.test(value), 'Source URL must be HTTP(S)');
const properties = z
  .record(
    z.string().min(1).max(100),
    z.union([z.string().max(1000), z.number().finite(), z.boolean(), z.null()]),
  )
  .refine(
    (value) => Object.keys(value).length <= 30,
    'Historical properties exceed 30 fields',
  );
export const historicalEpochSchema = z.strictObject({
  id,
  name: z.string().min(1).max(200),
  fromYear: year,
  toYear: year,
  sourceURL: url,
  sourceSha256: z.string().regex(/^[a-f0-9]{64}$/),
  uncertainty: z.string().min(1).max(2000),
  features: z
    .array(
      z.strictObject({
        regionId: id,
        sourceId: z.string().min(1).max(100),
        name: z.string().min(1).max(200),
        properties,
        geometry: historicalGeometrySchema,
      }),
    )
    .min(1)
    .max(500),
});
export const historicalDatasetSchema = z
  .strictObject({
    id,
    name: z.string().min(1).max(200),
    version: z.literal(1),
    scope: z.string().min(1).max(500),
    granularity: z.literal('year'),
    coordinateSystem: z.literal('WGS84'),
    provenance: z.strictObject({
      source: url,
      author: z.string().min(1).max(200),
      license: z.string().min(1).max(500),
      licenseURL: url,
      credit: z.string().min(1).max(500),
      accessedAt: z.iso.datetime(),
      uncertainty: z.string().min(1).max(2000),
      derivation: z.string().min(1).max(2000),
    }),
    regions: z
      .array(z.strictObject({ id, name: z.string().min(1).max(200) }))
      .min(1)
      .max(500),
    epochs: z.array(historicalEpochSchema).min(1).max(50),
  })
  .superRefine((dataset, ctx) => {
    const issue = (message: string, path: (string | number)[] = []) =>
      ctx.addIssue({ code: 'custom', message, path });
    const regions = new Set<string>(),
      epochs = new Set<string>(),
      work = { remaining: 5000000 };
    let vertices = 0,
      features = 0;
    for (const [i, region] of dataset.regions.entries()) {
      if (regions.has(region.id))
        issue('Duplicate historical region identity', ['regions', i]);
      regions.add(region.id);
    }
    for (const [i, epoch] of dataset.epochs.entries()) {
      if (epochs.has(epoch.id))
        issue('Duplicate historical epoch identifier', ['epochs', i]);
      epochs.add(epoch.id);
      if (epoch.fromYear > epoch.toYear)
        issue('Historical year interval is reversed', ['epochs', i]);
      const previous = dataset.epochs[i - 1];
      if (previous && epoch.fromYear <= previous.toYear)
        issue('Historical epochs must be ordered and non-overlapping', [
          'epochs',
          i,
        ]);
      const ids = new Set<string>(),
        sourceIds = new Set<string>();
      for (const [j, feature] of epoch.features.entries()) {
        features++;
        vertices += historyVertexCount(feature.geometry);
        if (!regions.has(feature.regionId))
          issue('Unknown historical region identity', [
            'epochs',
            i,
            'features',
            j,
          ]);
        if (ids.has(feature.regionId) || sourceIds.has(feature.sourceId))
          issue('Duplicate historical feature identity', [
            'epochs',
            i,
            'features',
            j,
          ]);
        ids.add(feature.regionId);
        sourceIds.add(feature.sourceId);
        try {
          validateHistoricalGeometry(feature.geometry, work);
        } catch (error) {
          issue(
            error instanceof Error
              ? error.message
              : 'Invalid historical topology',
            ['epochs', i, 'features', j],
          );
          break;
        }
      }
    }
    if (vertices > MAX_HISTORY_VERTICES || features > 2000)
      issue(
        'Historical dataset exceeds 100000 vertices / 2000 source features',
      );
    if (
      new TextEncoder().encode(JSON.stringify(dataset)).length >
      MAX_HISTORY_BYTES
    )
      issue('Historical dataset exceeds 10 MiB');
  });
export type HistoricalDataset = z.infer<typeof historicalDatasetSchema>;
export const historicalManifestSchema = z.strictObject({
  format: z.literal('animatemap-history'),
  version: z.literal(1),
  dataset: historicalDatasetSchema,
});
