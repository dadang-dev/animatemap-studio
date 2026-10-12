import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { PNG } from 'pngjs';
const catalog = JSON.parse(await readFile('data/terrain/catalog.json', 'utf8'));
if (catalog.id !== 'sapa-2026-10-12' || catalog.tiles.length !== 9)
  throw new Error('Unsupported terrain snapshot');
const base = `apps/web/public/data/terrain/${catalog.id}/9`;
for (const tile of catalog.tiles) {
  if (
    tile.z !== 9 ||
    !Number.isInteger(tile.x) ||
    tile.x < 402 ||
    tile.x > 404 ||
    !Number.isInteger(tile.y) ||
    tile.y < 222 ||
    tile.y > 224
  )
    throw new Error('Unsafe terrain tile path');
  const expectedURL = `https://elevation-tiles-prod.s3.amazonaws.com/terrarium/9/${tile.x}/${tile.y}.png`;
  if (tile.source !== expectedURL)
    throw new Error('Unexpected terrain source origin/path');
  let bytes;
  try {
    bytes = await readFile(`.local/terrain-source/9-${tile.x}-${tile.y}.png`);
  } catch {
    const response = await fetch(expectedURL, {
      signal: AbortSignal.timeout(20000),
      redirect: 'error',
    });
    if (!response.ok)
      throw new Error(`DEM source unavailable: ${response.status}`);
    const chunks = [];
    let length = 0;
    for await (const chunk of response.body) {
      length += chunk.length;
      if (length > 1024 * 1024) throw new Error('DEM download exceeds 1 MiB');
      chunks.push(chunk);
    }
    bytes = Buffer.concat(chunks);
  }
  if (
    bytes.length !== tile.bytes ||
    createHash('sha256').update(bytes).digest('hex') !== tile.sha256
  )
    throw new Error('Pinned terrain checksum mismatch');
  const png = PNG.sync.read(bytes);
  if (png.width !== 256 || png.height !== 256)
    throw new Error('Invalid terrain dimensions');
  let min = Infinity,
    max = -Infinity;
  for (let p = 0; p < png.data.length; p += 4) {
    const meters =
      png.data[p] * 256 + png.data[p + 1] + png.data[p + 2] / 256 - 32768;
    if (png.data[p + 3] !== 255 || meters < -11000 || meters > 9000)
      throw new Error('Invalid source DEM sample');
    min = Math.min(min, meters);
    max = Math.max(max, meters);
  }
  if (min !== tile.minMeters || max !== tile.maxMeters)
    throw new Error('Pinned DEM range mismatch');
  await mkdir(`${base}/${tile.x}`, { recursive: true });
  await writeFile(`${base}/${tile.x}/${tile.y}.png`, bytes);
}
console.log(
  `Prepared ${catalog.tiles.length} original verified terrain tiles (${catalog.tiles.reduce((sum, tile) => sum + tile.bytes, 0)} bytes)`,
);
