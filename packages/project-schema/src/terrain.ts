import { z } from 'zod';
import catalog from '../../../data/terrain/catalog.json' with { type: 'json' };
export const terrainPack = catalog;
export const TERRAIN_CREDIT =
  'Mapzen/Tilezen Terrain Tiles · SRTM/GMTED2010 courtesy of USGS · DOC/NOAA/NESDIS/NCEI';
export const TERRAIN_MIN_ZOOM = 10;
export const terrainSchema = z
  .strictObject({
    packId: z.literal('sapa-2026-10-12'),
    exaggeration: z.number().finite().min(0.1).max(3),
    hillshade: z.boolean(),
  })
  .nullable()
  .default(null);
export type TerrainConfiguration = z.infer<typeof terrainSchema>;
export function terrainCameraSupported(camera: {
  lng: number;
  lat: number;
  zoom: number;
}) {
  const [west, south, east, north] = terrainPack.bounds;
  return (
    camera.lng >= west! &&
    camera.lng <= east! &&
    camera.lat >= south! &&
    camera.lat <= north! &&
    camera.zoom >= TERRAIN_MIN_ZOOM
  );
}
