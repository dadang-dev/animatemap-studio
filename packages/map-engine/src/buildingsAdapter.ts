import type { Map as MapLibreMap, GeoJSONSource } from 'maplibre-gl';
import type { FeatureCollection, Polygon, MultiPolygon } from 'geojson';
import {
  buildingHeightMetres,
  type BuildingDataset,
} from '@animatemap/project-schema';
import type { RenderLayer } from '@animatemap/animation-core';
type BuildingsLayer = Extract<RenderLayer, { type: 'buildings' }>;
const cache = new WeakMap<
  BuildingDataset,
  { signature: string; data: FeatureCollection<Polygon | MultiPolygon> }
>();
export function buildingFeatures(dataset: BuildingDataset) {
  const saved = cache.get(dataset);
  if (saved) return saved;
  const result = {
    signature: JSON.stringify([dataset.heightUnit, dataset.records]),
    data: {
      type: 'FeatureCollection' as const,
      features: dataset.records.map((record) => ({
        type: 'Feature' as const,
        id: record.id,
        geometry: record.geometry,
        properties: {
          sourceId: record.id,
          buildingId: record.buildingId ?? record.id,
          heightMetres: buildingHeightMetres(record.height, dataset.heightUnit),
        },
      })),
    },
  };
  cache.set(dataset, result);
  return result;
}
export function applyBuildings(
  map: MapLibreMap,
  layer: BuildingsLayer,
  dataset: BuildingDataset,
  signatures: Map<string, string>,
) {
  const sourceId = `ams-${layer.id}`,
    layerId = `${sourceId}-extrusion`;
  const { data, signature } = buildingFeatures(dataset);
  if (!map.getSource(sourceId)) {
    map.addSource(sourceId, { type: 'geojson', data, maxzoom: 18 });
    map.addLayer({
      id: layerId,
      type: 'fill-extrusion',
      source: sourceId,
      paint: { 'fill-extrusion-base': 0 },
    });
    signatures.set(layer.id, signature);
  } else if (signatures.get(layer.id) !== signature) {
    (map.getSource(sourceId) as GeoJSONSource).setData(data);
    signatures.set(layer.id, signature);
  }
  map.setPaintProperty(layerId, 'fill-extrusion-color', layer.style.color);
  map.setPaintProperty(layerId, 'fill-extrusion-height', [
    '*',
    ['get', 'heightMetres'],
    layer.heightScale,
  ]);
  map.setPaintProperty(
    layerId,
    'fill-extrusion-opacity',
    layer.visible ? layer.opacity : 0,
  );
  map.setPaintProperty(
    layerId,
    'fill-extrusion-vertical-gradient',
    layer.style.verticalGradient,
  );
}
