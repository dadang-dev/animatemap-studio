import {
  layerSchema,
  type Admin1Regions,
  type Camera,
  type Project,
} from '@animatemap/project-schema';
import { clamp, wrap } from '@animatemap/animation-core';
export function addAdmin1Highlight(
  project: Project,
  sceneId: string,
  regions: Admin1Regions['features'],
  id: string = crypto.randomUUID(),
) {
  const scene = project.scenes.find((scene) => scene.id === sceneId);
  if (!scene || !regions.length)
    throw new Error('Select a scene and at least one Admin 1 region');
  scene.layers.push(
    layerSchema.parse({
      id,
      type: 'admin1Highlight',
      name: regions
        .map((region) => region.properties.name)
        .join(' + ')
        .slice(0, 200),
      regionCodes: regions.map((region) => region.properties.code),
      timeRange: { start: 0, end: scene.durationSeconds },
      style: {
        color: '#e4a35e',
        stroke: '#ffda99',
        width: 1.5,
        dimOutside: 0.15,
      },
    }),
  );
  return id;
}
export function focusAdmin1Region(
  region: Admin1Regions['features'][number],
  camera: Camera,
): Camera {
  const { labelLng, labelLat } = region.properties;
  const valid =
    typeof labelLng === 'number' &&
    typeof labelLat === 'number' &&
    Number.isFinite(labelLng) &&
    Number.isFinite(labelLat) &&
    Math.abs(labelLng) <= 180 &&
    Math.abs(labelLat) <= 90;
  if (valid)
    return {
      ...camera,
      lng: labelLng,
      lat: clamp(labelLat, -85, 85),
      zoom: 7.5,
    };
  const points =
    region.geometry.type === 'Polygon'
      ? region.geometry.coordinates.flat()
      : region.geometry.coordinates.flat(2);
  const origin = points[0]![0]!;
  let west = Infinity,
    east = -Infinity,
    south = Infinity,
    north = -Infinity;
  for (const point of points) {
    const lng = origin + wrap(point[0]! - origin);
    west = Math.min(west, lng);
    east = Math.max(east, lng);
    south = Math.min(south, point[1]!);
    north = Math.max(north, point[1]!);
  }
  return {
    ...camera,
    lng: wrap((west + east) / 2),
    lat: clamp((south + north) / 2, -85, 85),
    zoom: 7.5,
  };
}
