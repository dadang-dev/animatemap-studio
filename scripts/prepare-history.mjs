import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
const rawDirectory = resolve('data/history'),
  publicDirectory = resolve('apps/web/public/data/history');
await mkdir(publicDirectory, { recursive: true });
const sources = JSON.parse(
  await readFile(resolve(rawDirectory, 'provenance.json'), 'utf8'),
);
const epochs = [];
for (const source of sources) {
  const bytes = await readFile(
    resolve(rawDirectory, `dc-${source.year}-source.geojson`),
  );
  if (createHash('sha256').update(bytes).digest('hex') !== source.sha)
    throw new Error(`History source checksum mismatch for ${source.year}`);
  const collection = JSON.parse(bytes);
  const features = collection.features
    .map((feature) => {
      const ward = Number(
        feature.properties[source.year === 1982 ? 'WARDID' : 'WARD'],
      );
      if (!Number.isInteger(ward) || ward < 1 || ward > 8)
        throw new Error('Unknown published ward number');
      return {
        regionId: `ward-${ward}`,
        sourceId: String(feature.id),
        name: feature.properties.NAME,
        properties: feature.properties,
        geometry: feature.geometry,
      };
    })
    .sort((a, b) => a.regionId.localeCompare(b.regionId));
  if (new Set(features.map((f) => f.regionId)).size !== 8)
    throw new Error('Incomplete history ward identities');
  epochs.push({
    id: `dc-${source.year}`,
    name: `Published wards ${source.year}`,
    fromYear: source.year,
    toYear: source.toYear,
    sourceURL: source.url,
    sourceSha256: source.sha,
    uncertainty:
      source.year === 1992
        ? 'Publisher describes 1992–2001 validity; original NAME/GIS_ID retain legacy 1990 labels. The discrepancy is not resolved.'
        : 'Publisher gives year-level validity only; exact statutory day-level dates are not supplied.',
    features,
  });
}
const dataset = {
  id: 'dc-wards-1982-2011',
  name: 'Washington, DC election wards · 1982–2011',
  version: 1,
  scope:
    'Eight Washington, DC election wards across three published eras; administrative history, not global national borders.',
  granularity: 'year',
  coordinateSystem: 'WGS84',
  provenance: {
    source: 'https://catalog.data.gov/dataset/wards-from-1982',
    author: 'DC Office of Planning / DC OCTO',
    license: 'CC BY 4.0',
    licenseURL: 'https://creativecommons.org/licenses/by/4.0/',
    credit:
      'DC Office of Planning / DC OCTO · CC BY 4.0 · historical election wards',
    accessedAt: sources[0].accessedAt,
    uncertainty:
      'Published year intervals; exact effective days are unavailable. The 1992 source retains legacy 1990 labels.',
    derivation:
      'Provider query outSR=4326 reprojects original WebMercator service into WGS84; no geometry simplification/precision/quantization requested. Original selected properties/coordinates retained. Ward-number field explicitly maps logical ward identities; feature order sorted by logical ID.',
  },
  regions: Array.from({ length: 8 }, (_, i) => ({
    id: `ward-${i + 1}`,
    name: `Ward ${i + 1}`,
  })),
  epochs,
};
const data = Buffer.from(
  JSON.stringify({ format: 'animatemap-history', version: 1, dataset }),
);
await writeFile(resolve(publicDirectory, 'dc-wards-1982-2011.json'), data);
await writeFile(
  resolve(rawDirectory, 'pack.json'),
  JSON.stringify(
    {
      path: '/data/history/dc-wards-1982-2011.json',
      bytes: data.length,
      sha256: createHash('sha256').update(data).digest('hex'),
      features: 24,
      vertices: sources.reduce((n, s) => n + s.vertices, 0),
    },
    null,
    2,
  ),
);
console.log(
  `Prepared real history pack: ${data.length} bytes / 24 source features / ${sources.reduce((n, s) => n + s.vertices, 0)} vertices`,
);
