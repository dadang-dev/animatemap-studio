import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { expect, test } from 'vitest';
import { migrateProject, CURRENT_SCHEMA_VERSION } from './index';
test('bundled data checksum and example contracts match provenance', async () => {
  const root = new URL('../../../', import.meta.url);
  const data = await readFile(
    new URL('apps/web/public/data/countries.geojson', root),
  );
  const metadata = JSON.parse(
    await readFile(new URL('data/countries/PROVENANCE.json', root), 'utf8'),
  );
  expect(createHash('sha256').update(data).digest('hex')).toBe(
    metadata.bundledSha256,
  );
  const countries = JSON.parse(data.toString());
  expect(countries.features.length).toBe(metadata.features);
  expect(
    countries.features.find(
      (f: { properties: { code: string } }) => f.properties.code === 'VNM',
    ).geometry.type,
  ).toBe('MultiPolygon');
  for (const file of ['travel-vietnam', 'southeast-asia-highlight'])
    expect(
      migrateProject(
        JSON.parse(
          await readFile(new URL(`examples/${file}.json`, root), 'utf8'),
        ),
      ).schemaVersion,
    ).toBe(CURRENT_SCHEMA_VERSION);
});
test('bundled flag source bytes retain licensed provenance and pinned checksums', async () => {
  const root = new URL(
    '../../../apps/web/public/assets/flags/',
    import.meta.url,
  );
  const manifest = JSON.parse(
    await readFile(new URL('PROVENANCE.json', root), 'utf8'),
  );
  for (const asset of manifest.assets) {
    const bytes = await readFile(new URL(asset.file, root));
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(asset.sha256);
    expect(asset.license).toContain('Public domain');
    expect(asset.licensePage).toMatch(/^https:\/\/commons.wikimedia.org\//);
    expect(bytes.toString()).not.toMatch(/<script|href=|onload=/i);
  }
});
