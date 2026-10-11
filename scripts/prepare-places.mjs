import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const source =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_populated_places.geojson';
const sha256 =
  '9b8e3de09048ef00dfc70357dbb9fa324493f214b5e0ae4daf1aa79a8d10116b';
const bytes = await readFile('.local/places-source.geojson');
if (createHash('sha256').update(bytes).digest('hex') !== sha256)
  throw new Error('Unverified Natural Earth source');
const raw = JSON.parse(bytes.toString());
const places = raw.features
  .map((feature) => {
    if (
      feature.geometry.type !== 'Point' ||
      !Number.isSafeInteger(feature.properties.NE_ID) ||
      feature.geometry.coordinates.length !== 2 ||
      feature.geometry.coordinates.some((value) => !Number.isFinite(value))
    )
      throw new Error('Invalid source place');
    const p = feature.properties;
    return {
      id: `ne-${p.NE_ID}`,
      name: p.NAME_EN || p.NAME,
      country: p.ADM0NAME,
      coordinates: feature.geometry.coordinates,
      names: [
        ...new Set(
          [p.NAME, p.NAME_EN, p.NAMEASCII, p.NAME_VI, p.NAMEALT].filter(
            (name) => typeof name === 'string' && name.trim(),
          ),
        ),
      ],
    };
  })
  .sort((a, b) => a.id.localeCompare(b.id, 'en'));
if (
  places.length !== 7342 ||
  new Set(places.map((p) => p.id)).size !== places.length
)
  throw new Error('Source count/IDs changed');
await mkdir('data/places', { recursive: true });
const catalog = JSON.stringify(places);
await writeFile('data/places/catalog.json', catalog + '\n');
await writeFile(
  'data/places/PROVENANCE.json',
  JSON.stringify(
    {
      release: '5.1.2',
      source,
      sha256,
      sourceBytes: bytes.length,
      count: places.length,
      catalogSha256: createHash('sha256')
        .update(catalog + '\n')
        .digest('hex'),
      license: 'Public domain',
      terms: 'https://www.naturalearthdata.com/about/terms-of-use/',
      note: 'Geometry Point coordinates preserved exactly; place names are release references, not street addresses or current political/population claims.',
    },
    null,
    2,
  ) + '\n',
);
console.log(`Prepared ${places.length} verified release-reference places`);
