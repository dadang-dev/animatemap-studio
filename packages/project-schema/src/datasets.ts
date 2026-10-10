import { z } from 'zod';
import catalog from '../../../data/countries/catalog.json' with { type: 'json' };
import { assetProvenanceSchema } from './assets';

export const countryCatalog: readonly { code: string; name: string }[] =
  catalog;
const codes = new Set(catalog.map((country) => country.code));
export const dataRecordSchema = z.object({
  countryCode: z
    .string()
    .refine(
      (code) => codes.has(code),
      'Country code is not in Natural Earth 5.1.2',
    ),
  year: z.number().int().min(1).max(9999),
  value: z.number().finite().min(-1e15).max(1e15),
});
export const datasetSchema = z
  .object({
    id: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/),
    name: z.string().min(1).max(200),
    unit: z.string().max(40).default(''),
    records: z.array(dataRecordSchema).min(1).max(10000),
    provenance: assetProvenanceSchema,
  })
  .superRefine((dataset, ctx) => {
    const seen = new Set<string>();
    dataset.records.forEach((record, index) => {
      const key = `${record.countryCode}/${record.year}`;
      if (seen.has(key))
        ctx.addIssue({
          code: 'custom',
          message: 'Duplicate country/year observation',
          path: ['records', index],
        });
      seen.add(key);
    });
  });
export type Dataset = z.infer<typeof datasetSchema>;
export function defaultDataDomain(records: Dataset['records']) {
  if (!records.length) throw new Error('Data requires an observation');
  const min = Math.min(...records.map((record) => record.value));
  const max = Math.max(...records.map((record) => record.value));
  const margin = Math.max(0.5, Math.abs(min) * 0.01);
  return min === max ? { min: min - margin, max: max + margin } : { min, max };
}
