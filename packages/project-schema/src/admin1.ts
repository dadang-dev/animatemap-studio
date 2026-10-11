import { z } from 'zod';
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import references from '../../../data/admin1/references.json' with { type: 'json' };
import provenance from '../../../data/admin1/PROVENANCE.json' with { type: 'json' };

export const admin1Reference = new Map(
  references.map(([code, countryCode]) => [code!, countryCode!] as const),
);
export const admin1Files = new Map(
  provenance.files.map((file) => [file.countryCode, file] as const),
);
export const ADMIN1_RELEASE = provenance.release;
export const MAX_ADMIN1_COUNTRIES = 8;
export type Admin1Properties = {
  code: string;
  sourceCode: string;
  countryCode: string;
  name: string;
  localName: string | null;
  type: string | null;
  isoCode: string | null;
  labelLng: number | null;
  labelLat: number | null;
};
export type Admin1Regions = FeatureCollection<
  Polygon | MultiPolygon,
  Admin1Properties
>;
export const admin1CountryCodesSchema = z
  .array(
    z
      .string()
      .refine(
        (code) => admin1Files.has(code),
        'Country has no bundled Admin 1 coverage',
      ),
  )
  .max(MAX_ADMIN1_COUNTRIES)
  .refine(
    (codes) => new Set(codes).size === codes.length,
    'Duplicate Admin 1 country',
  )
  .default([]);
export const admin1RegionCodesSchema = z
  .array(
    z
      .string()
      .refine(
        (code) => admin1Reference.has(code),
        'Unknown Natural Earth Admin 1 identifier',
      ),
  )
  .min(1)
  .max(300)
  .refine(
    (codes) => new Set(codes).size === codes.length,
    'Duplicate Admin 1 region',
  );
export function admin1CountriesForRegions(codes: readonly string[]) {
  return [
    ...new Set(
      codes.map((code) => {
        const countryCode = admin1Reference.get(code);
        if (!countryCode) throw new Error(`Unknown Admin 1 region ${code}`);
        return countryCode;
      }),
    ),
  ];
}
