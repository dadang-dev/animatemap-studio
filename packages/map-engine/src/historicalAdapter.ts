import type { Map, GeoJSONSource } from 'maplibre-gl';
import type { RenderLayer } from '@animatemap/animation-core';
import type { HistoricalGeometry } from '@animatemap/project-schema';
import {
  historyPolygons,
  unwrapHistoryRing,
} from '../../project-schema/src/historicalGeometry';
export function historicalRenderGeometry(
  geometry: HistoricalGeometry,
): HistoricalGeometry {
  const reference = historyPolygons(geometry)[0]![0]![0]![0];
  const polygons = historyPolygons(geometry).map((polygon) =>
    polygon.map((ring) => {
      const unwrapped = unwrapHistoryRing(ring);
      const shift = 360 * Math.round((reference - unwrapped[0]![0]) / 360);
      return unwrapped.map(([lng, lat]): [number, number] => [
        lng + shift,
        lat,
      ]);
    }),
  );
  return geometry.type === 'Polygon'
    ? { type: 'Polygon', coordinates: polygons[0]! }
    : { type: 'MultiPolygon', coordinates: polygons };
}
export function applyHistorical(
  map: Map,
  layer: Extract<RenderLayer, { type: 'historical' }>,
  canvasWidth: number,
  signatures: globalThis.Map<string, string>,
) {
  const opacity = layer.visible ? layer.opacity : 0;
  const sourceId = `ams-${layer.id}`;
  const data: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: (layer.historical?.features ?? []).map((feature) => ({
      type: 'Feature',
      properties: { regionId: feature.regionId, name: feature.name },
      geometry: historicalRenderGeometry(feature.geometry),
    })),
  };
  const signature = JSON.stringify(data);
  if (!map.getSource(sourceId)) {
    map.addSource(sourceId, { type: 'geojson', data });
    map.addLayer({ id: `${sourceId}-fill`, type: 'fill', source: sourceId });
    map.addLayer({ id: `${sourceId}-line`, type: 'line', source: sourceId });
  } else if (signatures.get(layer.id) !== signature) {
    (map.getSource(sourceId) as GeoJSONSource).setData(data);
  }
  signatures.set(layer.id, signature);
  map.setPaintProperty(`${sourceId}-fill`, 'fill-color', layer.style.color);
  map.setPaintProperty(`${sourceId}-fill`, 'fill-opacity', opacity);
  map.setPaintProperty(
    `${sourceId}-line`,
    'line-color',
    layer.style.borderColor,
  );
  map.setPaintProperty(`${sourceId}-line`, 'line-opacity', opacity);
  map.setPaintProperty(
    `${sourceId}-line`,
    'line-width',
    (layer.style.borderWidth * map.getContainer().clientWidth) / canvasWidth,
  );
}
