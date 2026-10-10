import { expect, test } from 'vitest';
import { crc32, deflateSync } from 'node:zlib';
import { testImage } from './assets.fixture';
import {
  createDemo,
  imageAssetSchema,
  inspectPng,
  layerSchema,
  migrateProject,
  projectV5Schema,
  CURRENT_SCHEMA_VERSION,
} from './index';

test('embedded static images validate PNG integrity, dimensions and source metadata', () => {
  const asset = testImage();
  expect(inspectPng(asset.dataUrl)).toMatchObject({ width: 8, height: 8 });
  const bytes = Buffer.from(asset.dataUrl.split(',')[1]!, 'base64');
  bytes[45] = bytes[45]! ^ 1;
  expect(() =>
    imageAssetSchema.parse({
      ...asset,
      dataUrl: `data:image/png;base64,${bytes.toString('base64')}`,
    }),
  ).toThrow('checksum');
  expect(() => imageAssetSchema.parse({ ...asset, width: 9 })).toThrow(
    'dimensions',
  );
  expect(() =>
    imageAssetSchema.parse({
      ...asset,
      dataUrl: 'https://example.com/logo.png',
    }),
  ).toThrow('embedded PNG');
  expect(() =>
    imageAssetSchema.parse({
      ...asset,
      provenance: { ...asset.provenance, license: '' },
    }),
  ).toThrow();
  const png = Buffer.from(asset.dataUrl.split(',')[1]!, 'base64');
  const animation = Buffer.alloc(20);
  animation.writeUInt32BE(8, 0);
  animation.write('acTL', 4);
  animation.writeUInt32BE(1, 8);
  animation.writeUInt32BE(crc32(animation.subarray(4, 16)), 16);
  const animated = Buffer.concat([
    png.subarray(0, 33),
    animation,
    png.subarray(33),
  ]);
  expect(() =>
    inspectPng(`data:image/png;base64,${animated.toString('base64')}`),
  ).toThrow('Animated PNG');
  expect(() =>
    inspectPng(
      `data:image/png;base64,${Buffer.alloc(2 * 1024 * 1024 + 1).toString('base64')}`,
    ),
  ).toThrow('2 MB');
});
test('PNG decompression enforces row filters, exact length and bounded expansion', () => {
  const original = Buffer.from(testImage().dataUrl.split(',')[1]!, 'base64');
  const replaced = (scanlines: Buffer) => {
    const compressed = deflateSync(scanlines),
      chunk = Buffer.alloc(compressed.length + 12);
    chunk.writeUInt32BE(compressed.length, 0);
    chunk.write('IDAT', 4);
    compressed.copy(chunk, 8);
    chunk.writeUInt32BE(
      crc32(chunk.subarray(4, chunk.length - 4)),
      chunk.length - 4,
    );
    return `data:image/png;base64,${Buffer.concat([original.subarray(0, 33), chunk, original.subarray(33 + 12 + original.readUInt32BE(33))]).toString('base64')}`;
  };
  const invalid = Buffer.alloc(33 * 8);
  invalid[0] = 5;
  expect(() => inspectPng(replaced(invalid))).toThrow('row filter');
  expect(() => inspectPng(replaced(Buffer.alloc(10)))).toThrow('byte count');
  expect(() => inspectPng(replaced(Buffer.alloc(1024 * 1024)))).toThrow(
    'exceeds declared',
  );
  const metadata = inspectPng(testImage().dataUrl);
  metadata.width = 100;
  expect(inspectPng(testImage().dataUrl).width).toBe(8);
});
test('project assets reject duplicates, dangling references and excess decoded pixel budgets', () => {
  const project = createDemo();
  const asset = testImage();
  project.assets.push(asset);
  project.scenes[0]!.layers.push(
    layerSchema.parse({
      type: 'image',
      id: 'image-layer',
      name: 'Image',
      assetId: asset.id,
      anchor: { type: 'screen', x: 0.5, y: 0.5 },
      timeRange: { start: 0, end: 12 },
      style: { width: 200, height: 200, fit: 'contain' },
      tracks: {
        scale: [
          { time: 0, value: 0.1 },
          { time: 1, value: 1 },
        ],
      },
    }),
  );
  expect(migrateProject(JSON.parse(JSON.stringify(project)))).toEqual(project);
  expect(() => migrateProject({ ...project, assets: [] })).toThrow(
    'Missing image asset',
  );
  expect(() => migrateProject({ ...project, assets: [asset, asset] })).toThrow(
    'Duplicate asset',
  );
  const large = testImage(4096, 4096);
  expect(() =>
    migrateProject({
      ...project,
      assets: [asset, large, { ...large, id: 'large-copy' }],
    }),
  ).toThrow('budget');
  const highlight = project.scenes[0]!.layers.find(
    (layer) => layer.type === 'countryHighlight',
  )!;
  highlight.textureAssetId = large.id;
  expect(() => migrateProject({ ...project, assets: [large] })).toThrow('512');
});
test('v5 migration retains Bezier controls and original content with an empty asset registry', () => {
  const project = createDemo();
  project.scenes[0]!.layers.push(
    layerSchema.parse({
      type: 'shape',
      id: 'curve',
      name: 'Curve',
      kind: 'bezier',
      coordinates: [
        [179, 0],
        [-179, 1],
        [179, -1],
        [-179, 0],
      ],
      timeRange: { start: 0, end: 12 },
      style: { color: '#ffffff', width: 5 },
    }),
  );
  const legacy = projectV5Schema.parse({ ...project, schemaVersion: 5 });
  const before = JSON.stringify(legacy);
  const migrated = migrateProject(legacy);
  expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  expect(migrated.assets).toEqual([]);
  expect(projectV5Schema.parse({ ...migrated, schemaVersion: 5 })).toEqual(
    legacy,
  );
  expect(JSON.stringify(legacy)).toBe(before);
});
