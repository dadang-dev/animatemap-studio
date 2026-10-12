import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const directory = new URL('../data/buildings/', import.meta.url);
const raw = await readFile(new URL('vancouver-source.json', directory));
const provenance = JSON.parse(
  await readFile(new URL('provenance.json', directory), 'utf8'),
);
const sha = createHash('sha256').update(raw).digest('hex');
if (sha !== provenance.sourceSha256 || raw.length !== provenance.sourceBytes)
  throw new Error('Building source snapshot checksum mismatch');
const input = JSON.parse(raw);
if (
  input.results.length !== 100 ||
  new Set(input.results.map((r) => r.id)).size !== 100
)
  throw new Error('Unexpected source count/IDs');
const features = input.results.map((r) => {
  if (
    !Number.isFinite(r.hgt_agl) ||
    r.hgt_agl <= 0 ||
    !r.geom?.geometry ||
    r.geo_point_2d.lon < -123.27 ||
    r.geo_point_2d.lon > -123.02 ||
    r.geo_point_2d.lat < 49.19 ||
    r.geo_point_2d.lat > 49.32
  )
    throw new Error('Unexpected source height/geometry/coverage');
  return {
    type: 'Feature',
    id: String(r.id),
    properties: {
      id: String(r.id),
      buildingId: String(r.bldgid),
      hgt_agl: r.hgt_agl,
    },
    geometry: r.geom.geometry,
  };
});
const output = { type: 'FeatureCollection', features };
const target = new URL('../apps/web/public/data/buildings/', import.meta.url);
await mkdir(target, { recursive: true });
await writeFile(
  new URL('vancouver-2009.geojson', target),
  JSON.stringify(output) + '\n',
);
console.log(
  JSON.stringify({
    sourceSha256: sha,
    buildings: features.length,
    heightRangeMetres: [
      Math.min(...features.map((f) => f.properties.hgt_agl)),
      Math.max(...features.map((f) => f.properties.hgt_agl)),
    ],
    derivedSha256: createHash('sha256')
      .update(JSON.stringify(output) + '\n')
      .digest('hex'),
  }),
);
