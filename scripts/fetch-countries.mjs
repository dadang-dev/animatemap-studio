import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const url =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_admin_0_countries.geojson';
const response = await fetch(url);
if (!response.ok)
  throw new Error(`Country download failed: ${response.status}`);
const raw = await response.text();
const data = JSON.parse(raw);
for (const feature of data.features) {
  const p = feature.properties;
  feature.properties = {
    code: p.ISO_A3 !== '-99' ? p.ISO_A3 : p.ADM0_A3,
    name: p.NAME_EN,
    labelLng: p.LABEL_X,
    labelLat: p.LABEL_Y,
  };
  feature.id = feature.properties.code;
}
const output = JSON.stringify(data);
await mkdir('data/countries', { recursive: true });
await mkdir('apps/web/public/data', { recursive: true });
await writeFile('apps/web/public/data/countries.geojson', output);
await writeFile(
  'data/countries/PROVENANCE.json',
  JSON.stringify(
    {
      source: url,
      release: '5.1.2',
      license: 'Public domain',
      licenseUrl: 'https://www.naturalearthdata.com/about/terms-of-use/',
      sourceSha256: createHash('sha256').update(raw).digest('hex'),
      bundledSha256: createHash('sha256').update(output).digest('hex'),
      features: data.features.length,
      transformation:
        'Properties reduced; geometry unchanged. ISO_A3 falls back to ADM0_A3 for non-ISO features.',
    },
    null,
    2,
  ),
);
