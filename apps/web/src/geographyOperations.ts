import {
  layerSchema,
  placeResultSchema,
  roadRouteResultSchema,
  type Project,
} from '@animatemap/project-schema';

export function addGeographicLayer(
  project: Project,
  sceneId: string,
  input: unknown,
  kind: 'place' | 'road-route',
  id: string = crypto.randomUUID(),
) {
  const scene = project.scenes.find((s) => s.id === sceneId);
  if (!scene) throw new Error('Select a scene before applying geography');
  const common = { id, timeRange: { start: 0, end: scene.durationSeconds } };
  if (kind === 'place') {
    const place = placeResultSchema.parse(input);
    scene.layers.push(
      layerSchema.parse({
        ...common,
        type: 'marker',
        name: place.label.slice(0, 200),
        anchor: { type: 'map', coordinates: place.coordinates },
        label: place.label,
        style: { color: '#ffd087', size: 24, icon: 'pin' },
        geographySource: place.source,
      }),
    );
  } else {
    const route = roadRouteResultSchema.parse(input);
    scene.layers.push(
      layerSchema.parse({
        ...common,
        type: 'route',
        name: `Road route · ${route.source.profile}`,
        coordinates: route.coordinates,
        style: { color: '#ffd087', width: 6, dash: false, arrow: true },
        tracks: {
          reveal: [
            { time: 0, value: 0, easing: 'linear' },
            { time: scene.durationSeconds, value: 1, easing: 'linear' },
          ],
        },
        geographySource: route.source,
      }),
    );
  }
  return id;
}
