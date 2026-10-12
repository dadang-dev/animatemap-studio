import * as maplibregl from 'maplibre-gl';
import {
  terrainPack,
  type TerrainConfiguration,
} from '@animatemap/project-schema';
const references = new Map(
  terrainPack.tiles.map((tile) => [`${tile.z}/${tile.x}/${tile.y}`, tile]),
);
export function terrainTileReference(input: string) {
  const url = new URL(input);
  if (
    url.protocol !== 'animatemap-dem:' ||
    url.hostname !== terrainPack.id ||
    url.username ||
    url.password ||
    url.port ||
    url.search ||
    url.hash
  )
    throw new Error('Unsupported terrain source URL');
  const match = url.pathname.match(/^\/(\d+)\/(\d+)\/(\d+)\.png$/);
  const tile = match && references.get(`${match[1]}/${match[2]}/${match[3]}`);
  if (!tile)
    throw new Error('Terrain tile is outside the pinned regional catalog');
  return tile;
}
export async function verifiedTerrainTile(
  input: string,
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
) {
  const tile = terrainTileReference(input);
  const response = await fetcher(
    `/data/terrain/${terrainPack.id}/${tile.z}/${tile.x}/${tile.y}.png`,
    {
      signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
      redirect: 'error',
    },
  );
  if (!response.ok)
    throw new Error(`Terrain tile unavailable (${response.status})`);
  if (!response.body) throw new Error('Terrain tile has no bytes');
  const reader = response.body.getReader(),
    chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > tile.bytes)
        throw new Error('Terrain tile exceeds pinned byte limit');
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
    reader.releaseLock();
  }
  if (length !== tile.bytes)
    throw new Error('Terrain tile byte length mismatch');
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  const digest = Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
    (value) => value.toString(16).padStart(2, '0'),
  ).join('');
  if (digest !== tile.sha256) throw new Error('Terrain tile checksum mismatch');
  signal.throwIfAborted();
  return bytes;
}
const byteCache = new Map<string, Uint8Array>();
maplibregl.addProtocol('animatemap-dem', async (params, controller) => {
  const tile = terrainTileReference(params.url),
    key = `${tile.z}/${tile.x}/${tile.y}`;
  let bytes = byteCache.get(key);
  if (!bytes) {
    bytes = await verifiedTerrainTile(params.url, controller.signal);
    byteCache.set(key, bytes);
  }
  controller.signal.throwIfAborted();
  // Each MapLibre worker receives its own transferable copy; the bounded verified cache remains intact.
  return { data: new Uint8Array(bytes).buffer };
});
export class TerrainAdapter {
  private signature = '';
  constructor(private map: maplibregl.Map) {}
  use(config: TerrainConfiguration) {
    const signature = JSON.stringify(config);
    if (signature === this.signature) return;
    this.signature = signature;
    const source = 'ams-terrain-dem',
      shade = 'ams-terrain-shade';
    if (!config) {
      this.map.setTerrain(null);
      if (this.map.getLayer(shade)) this.map.removeLayer(shade);
      if (this.map.getSource(source)) this.map.removeSource(source);
      return;
    }
    if (!this.map.getSource(source)) {
      this.map.addSource(source, {
        type: 'raster-dem',
        encoding: 'terrarium',
        tileSize: 256,
        minzoom: 9,
        maxzoom: 9,
        bounds: terrainPack.bounds as [number, number, number, number],
        tiles: [`animatemap-dem://${terrainPack.id}/{z}/{x}/{y}.png`],
      });
      this.map.addLayer(
        {
          id: shade,
          type: 'hillshade',
          source,
          paint: { 'hillshade-exaggeration': 0.6 },
        },
        'countries-border',
      );
    }
    this.map.setLayoutProperty(
      shade,
      'visibility',
      config.hillshade ? 'visible' : 'none',
    );
    this.map.setTerrain({ source, exaggeration: config.exaggeration });
  }
}
