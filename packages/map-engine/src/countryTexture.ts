import type { Polygon, MultiPolygon } from 'geojson';
import type { Map as MapLibreMap } from 'maplibre-gl';
import type { Project } from '@animatemap/project-schema';
import type { RenderLayer } from '@animatemap/animation-core';

/** WebMercator coordinates keep image placement and the mask in the same projection. */
export function textureGeometry(
  geometry: Polygon | MultiPolygon,
  anchor: number,
) {
  const polygons =
    geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  const projected = polygons.map((polygon) =>
    polygon.map((ring) =>
      ring.map(([lng, lat]) => {
        const x = lng! + 360 * Math.round((anchor - lng!) / 360);
        const clamped = Math.max(
          -85.0511287798066,
          Math.min(85.0511287798066, lat!),
        );
        const y =
          (Math.log(Math.tan(Math.PI / 4 + (clamped * Math.PI) / 360)) * 180) /
          Math.PI;
        return [x, y] as [number, number];
      }),
    ),
  );
  let west = Infinity,
    east = -Infinity,
    south = Infinity,
    north = -Infinity;
  for (const polygon of projected)
    for (const ring of polygon)
      for (const [x, y] of ring) {
        west = Math.min(west, x);
        east = Math.max(east, x);
        south = Math.min(south, y);
        north = Math.max(north, y);
      }
  if (!Number.isFinite(west) || east <= west || north <= south)
    throw Error('Empty country texture bounds');
  const latitude = (y: number) =>
    (Math.atan(Math.sinh((y * Math.PI) / 180)) * 180) / Math.PI;
  return {
    polygons: projected,
    west,
    east,
    south,
    north,
    coordinates: [
      [west, latitude(north)],
      [east, latitude(north)],
      [east, latitude(south)],
      [west, latitude(south)],
    ] as [number, number][],
  };
}
export function maskedCountry(
  geometry: Polygon | MultiPolygon,
  anchor: number,
  image: HTMLImageElement,
) {
  const bounds = textureGeometry(geometry, anchor);
  const width = 2048,
    height = Math.max(
      64,
      Math.min(
        2048,
        Math.round(
          (width * (bounds.north - bounds.south)) / (bounds.east - bounds.west),
        ),
      ),
    );
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const px = (x: number) =>
    ((x - bounds.west) / (bounds.east - bounds.west)) * width;
  const py = (y: number) =>
    ((bounds.north - y) / (bounds.north - bounds.south)) * height;
  // Each disconnected polygon receives one fitted flag; no repeated screen-space pattern.
  for (const polygon of bounds.polygons) {
    const path = new Path2D();
    let left = Infinity,
      right = -Infinity,
      top = Infinity,
      bottom = -Infinity;
    for (const ring of polygon) {
      ring.forEach(([x, y], i) => {
        const a = px(x),
          b = py(y);
        if (i === 0) path.moveTo(a, b);
        else path.lineTo(a, b);
        left = Math.min(left, a);
        right = Math.max(right, a);
        top = Math.min(top, b);
        bottom = Math.max(bottom, b);
      });
      path.closePath();
    }
    ctx.save();
    ctx.clip(path, 'evenodd');
    const cover = flagCover(
      image.naturalWidth,
      image.naturalHeight,
      left,
      top,
      right - left,
      bottom - top,
    );
    ctx.drawImage(image, cover.x, cover.y, cover.width, cover.height);
    ctx.restore();
  }
  return {
    canvas,
    coordinates: bounds.coordinates as [
      [number, number],
      [number, number],
      [number, number],
      [number, number],
    ],
  };
}
/** Uniform scaling preserves circles, stars and seals while the country silhouette clips the flag. */
export function flagCover(
  sourceWidth: number,
  sourceHeight: number,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const scale = Math.max(width / sourceWidth, height / sourceHeight);
  const w = sourceWidth * scale,
    h = sourceHeight * scale;
  return {
    x: x + (width - w) / 2,
    y: y + (height - h) / 2,
    width: w,
    height: h,
  };
}
export class CountryTextures {
  private entries = new Map<string, string>();
  constructor(private map: MapLibreMap) {}
  apply(
    project: Project,
    layers: RenderLayer[],
    countries: {
      features: {
        properties: { code: string; labelLng: number };
        geometry: Polygon | MultiPolygon;
      }[];
    },
    image: (id: string) => HTMLImageElement | undefined,
  ) {
    const wanted = new Set<string>();
    const ordered = new Map<string, string[]>();
    for (const layer of layers)
      if (
        layer.type === 'countryHighlight' &&
        layer.textureFit === 'country' &&
        layer.textureAssetId
      ) {
        const asset = project.assets.find((a) => a.id === layer.textureAssetId),
          decoded = image(layer.textureAssetId);
        if (!asset || !decoded) continue;
        const ids: string[] = [];
        for (const code of layer.countryCodes) {
          const id = `ams-fit-${layer.id}-${code}`;
          wanted.add(id);
          ids.push(id);
          const feature = countries.features.find(
            (f) => f.properties.code === code,
          );
          if (!feature) throw Error(`Country ${code} unavailable`);
          if (this.entries.get(id) !== asset.dataUrl) {
            this.remove(id);
            const fitted = maskedCountry(
              feature.geometry,
              feature.properties.labelLng,
              decoded,
            );
            this.map.addSource(id, {
              type: 'canvas',
              ...fitted,
              animate: false,
            });
            this.map.addLayer({
              id,
              type: 'raster',
              source: id,
              paint: { 'raster-fade-duration': 0 },
            });
            this.entries.set(id, asset.dataUrl);
          }
          this.map.setPaintProperty(
            id,
            'raster-opacity',
            layer.visible ? layer.opacity : 0,
          );
        }
        ordered.set(layer.id, ids);
      }
    for (const id of this.entries.keys()) if (!wanted.has(id)) this.remove(id);
    return ordered;
  }
  private remove(id: string) {
    if (this.map.getLayer(id)) this.map.removeLayer(id);
    if (this.map.getSource(id)) this.map.removeSource(id);
    this.entries.delete(id);
  }
}
