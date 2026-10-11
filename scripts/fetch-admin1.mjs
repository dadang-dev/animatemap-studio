import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const release = '5.1.2';
const root = `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v${release}/geojson/`;
async function source(file, expected, cache) {
  let bytes;
  try {
    bytes = await readFile(`.local/${cache}-source.geojson`);
  } catch {
    const response = await fetch(root + file);
    if (!response.ok)
      throw new Error(`Natural Earth download failed: ${response.status}`);
    bytes = new Uint8Array(await response.arrayBuffer());
  }
  if (hash(bytes) !== expected)
    throw new Error(`Pinned checksum mismatch: ${file}`);
  return JSON.parse(new TextDecoder().decode(bytes));
}
const countryHash =
  '239eec57ac17f100a11e2536cffc56752c318b50ae765b0918ff7aab4ce8f255';
const regionHash =
  '22d0e3ad85eb3e27f17cabf8ba2d50e554fbc27a87796ff891d958185da62fb5';
const countries = await source(
  'ne_10m_admin_0_countries.geojson',
  countryHash,
  'admin0',
);
const regions = await source(
  'ne_10m_admin_1_states_provinces.geojson',
  regionHash,
  'admin1',
);
const crosswalk = new Map(
  countries.features.map(({ properties: p }) => [
    p.ADM0_A3,
    p.ISO_A3 !== '-99' ? p.ISO_A3 : p.ADM0_A3,
  ]),
);
const knownCountries = new Set(
  JSON.parse(await readFile('data/countries/catalog.json', 'utf8')).map(
    (country) => country.code,
  ),
);
const groups = new Map(),
  references = [],
  geometry = [],
  seen = new Set();
for (const feature of regions.features) {
  const p = feature.properties,
    countryCode = crosswalk.get(p.adm0_a3),
    code = `ne-${p.ne_id}`;
  if (!countryCode || !knownCountries.has(countryCode))
    throw new Error(`Unresolved Admin 0 relationship: ${p.adm1_code}`);
  if (seen.has(code) || !Number.isSafeInteger(p.ne_id) || p.ne_id <= 0)
    throw new Error(`Invalid/duplicate Natural Earth identifier: ${p.ne_id}`);
  if (!['Polygon', 'MultiPolygon'].includes(feature.geometry.type))
    throw new Error(`Unsupported region geometry: ${p.adm1_code}`);
  seen.add(code);
  references.push([code, countryCode]);
  geometry.push([code, feature.geometry]);
  const reduced = {
    type: 'Feature',
    id: code,
    properties: {
      code,
      sourceCode: p.adm1_code,
      countryCode,
      name: p.name_en || p.name || `[Unnamed ${p.adm1_code}]`,
      localName:
        p.name_local || (countryCode === 'VNM' ? p.name_vi : null) || null,
      type: p.type_en || p.type || null,
      isoCode: p.iso_3166_2 && p.iso_3166_2 !== '-99' ? p.iso_3166_2 : null,
      labelLng: p.longitude,
      labelLat: p.latitude,
    },
    geometry: feature.geometry,
  };
  const group = groups.get(countryCode) ?? [];
  group.push(reduced);
  groups.set(countryCode, group);
}
references.sort((a, b) => a[0].localeCompare(b[0]));
geometry.sort((a, b) => a[0].localeCompare(b[0]));
const directory = 'apps/web/public/data/admin1';
await mkdir(directory, { recursive: true });
await mkdir('data/admin1', { recursive: true });
const files = [];
for (const [countryCode, features] of [...groups].sort(([a], [b]) =>
  a.localeCompare(b),
)) {
  features.sort((a, b) => a.id.localeCompare(b.id));
  const bytes = JSON.stringify({ type: 'FeatureCollection', features });
  const file = `${countryCode}.geojson`;
  await writeFile(`${directory}/${file}`, bytes);
  files.push({
    countryCode,
    file,
    features: features.length,
    bytes: Buffer.byteLength(bytes),
    sha256: hash(bytes),
  });
}
await writeFile('data/admin1/references.json', JSON.stringify(references));
await writeFile(
  'data/admin1/PROVENANCE.json',
  JSON.stringify(
    {
      source: root + 'ne_10m_admin_1_states_provinces.geojson',
      crosswalkSource: root + 'ne_10m_admin_0_countries.geojson',
      release,
      license: 'Public domain',
      licenseUrl: 'https://www.naturalearthdata.com/about/terms-of-use/',
      sourceSha256: regionHash,
      crosswalkSourceSha256: countryHash,
      sourceGeometrySha256: hash(JSON.stringify(geometry)),
      features: references.length,
      transformation:
        'Properties reduced and features grouped by Admin 0 country using pinned ADM0_A3/ISO_A3 crosswalk. Polygon/MultiPolygon coordinates, rings, holes and islands unchanged. Vietnamese name supplied as localName for Vietnam where name_local is absent. Display fallback uses source code for unnamed regions.',
      boundaryNote:
        'Reference release 5.1.2; administrative names/divisions may have changed. Natural Earth default de facto perspective.',
      files,
    },
    null,
    2,
  ),
);
console.log(
  `Bundled ${references.length} unchanged Admin 1 geometries in ${files.length} country files (${files.reduce((sum, file) => sum + file.bytes, 0)} bytes).`,
);
