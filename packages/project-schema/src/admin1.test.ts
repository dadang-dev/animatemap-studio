import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { expect, test } from 'vitest';
import {
  admin1Files,
  admin1Reference,
  admin1RegionCodesSchema,
  admin1CountryCodesSchema,
  admin1CountriesForRegions,
  type Admin1Regions,
} from './admin1';
import provenance from '../../../data/admin1/PROVENANCE.json' with { type: 'json' };
import { countryCatalog } from './datasets';
import {
  createDemo,
  layerSchema,
  migrateProject,
  projectV8Schema,
  CURRENT_SCHEMA_VERSION,
} from './index';
import { testDataProject } from './datasets.fixture';
const hash = (bytes: string | Uint8Array) =>
  createHash('sha256').update(bytes).digest('hex');

test('pinned Admin 1 country files preserve every source polygon/ring/island and exact reference crosswalk', async () => {
  const geometry: [string, Admin1Regions['features'][number]['geometry']][] =
    [];
  const countries = new Set(countryCatalog.map((country) => country.code));
  let polygons = 0,
    multipolygons = 0,
    holes = 0;
  for (const [countryCode, file] of admin1Files) {
    expect(countries.has(countryCode)).toBe(true);
    const bytes = await readFile(
      new URL(
        `../../../apps/web/public/data/admin1/${file.file}`,
        import.meta.url,
      ),
    );
    expect(bytes.length).toBe(file.bytes);
    expect(hash(bytes)).toBe(file.sha256);
    const regions = JSON.parse(bytes.toString()) as Admin1Regions;
    expect(regions.type).toBe('FeatureCollection');
    expect(regions.features).toHaveLength(file.features);
    for (const region of regions.features) {
      expect(region.id).toBe(region.properties.code);
      expect(admin1Reference.get(region.properties.code)).toBe(countryCode);
      expect(region.properties.countryCode).toBe(countryCode);
      expect(region.properties.name.length).toBeGreaterThan(0);
      geometry.push([region.properties.code, region.geometry]);
      const components =
        region.geometry.type === 'Polygon'
          ? [region.geometry.coordinates]
          : region.geometry.coordinates;
      if (region.geometry.type === 'Polygon') polygons++;
      else multipolygons++;
      for (const component of components) {
        holes += component.length - 1;
        for (const ring of component) {
          expect(ring.length).toBeGreaterThanOrEqual(4);
          expect(ring[0]).toEqual(ring.at(-1));
          for (const [lng, lat] of ring) {
            if (
              !Number.isFinite(lng) ||
              !Number.isFinite(lat) ||
              Math.abs(lng!) > 180 ||
              Math.abs(lat!) > 90
            )
              throw new Error(`Invalid coordinate: ${region.properties.code}`);
          }
        }
      }
    }
  }
  geometry.sort((a, b) => a[0].localeCompare(b[0]));
  expect(geometry).toHaveLength(4596);
  expect(new Set(geometry.map(([id]) => id)).size).toBe(4596);
  expect(hash(JSON.stringify(geometry))).toBe(provenance.sourceGeometrySha256);
  expect(provenance.sourceSha256).toBe(
    '22d0e3ad85eb3e27f17cabf8ba2d50e554fbc27a87796ff891d958185da62fb5',
  );
  expect(polygons).toBeGreaterThan(0);
  expect(multipolygons).toBeGreaterThan(0);
  expect(holes).toBeGreaterThan(0);
  expect(admin1Files.get('VNM')!.features).toBe(63);
  expect(admin1Files.get('THA')!.features).toBe(77);
});

test('Admin 1 references reject unknown/duplicate identifiers and bounded country selections', () => {
  const vietnam = [...admin1Reference].find(
    ([, country]) => country === 'VNM',
  )![0];
  expect(admin1CountriesForRegions([vietnam, vietnam])).toEqual(['VNM']);
  expect(admin1RegionCodesSchema.parse([vietnam])).toEqual([vietnam]);
  expect(() => admin1RegionCodesSchema.parse([vietnam, vietnam])).toThrow(
    'Duplicate',
  );
  expect(() => admin1RegionCodesSchema.parse(['made-up-region'])).toThrow(
    'Unknown',
  );
  expect(() => admin1CountryCodesSchema.parse(['../VNM'])).toThrow('coverage');
  expect(() =>
    admin1CountryCodesSchema.parse([...admin1Files.keys()].slice(0, 9)),
  ).toThrow();
});

test('v8 migration preserves data/keys while adding empty Admin 1 visibility; v9 rejects missing regions and aggregate coverage', () => {
  const original = testDataProject();
  const old = projectV8Schema.parse({ ...original, schemaVersion: 8 });
  expect(migrateProject(old)).toEqual(original);
  expect(migrateProject(old).schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  expect(migrateProject(old).map.admin1Countries).toEqual([]);
  const project = createDemo();
  const vietnam = [...admin1Reference].find(
    ([, country]) => country === 'VNM',
  )![0];
  const layer = layerSchema.parse({
    ...project.scenes[0]!.layers[0],
    id: 'region-highlight',
    type: 'admin1Highlight',
    regionCodes: [vietnam],
  });
  project.scenes[0]!.layers.push(layer);
  expect(migrateProject(project)).toEqual(project);
  if (layer.type !== 'admin1Highlight') throw new Error('Unexpected layer');
  layer.regionCodes = ['made-up-region'];
  expect(() => migrateProject(project)).toThrow('Unknown Natural Earth');
  layer.regionCodes = [vietnam];
  project.map.admin1Countries = [...admin1Files.keys()]
    .filter((country) => country !== 'VNM')
    .slice(0, 8);
  expect(() => migrateProject(project)).toThrow('coverage exceeds 8');
});
