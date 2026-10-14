import {
  historicalDatasetSchema,
  historyPolygons,
  layerSchema,
  type HistoricalDataset,
  type Project,
} from '@animatemap/project-schema';
export function addHistoricalLayer(
  project: Project,
  sceneId: string,
  supplied: HistoricalDataset,
  focus: boolean,
  id: string = crypto.randomUUID(),
) {
  const scene = project.scenes.find((s) => s.id === sceneId);
  if (!scene) throw new Error('Select a scene before adding history');
  const dataset = historicalDatasetSchema.parse(supplied);
  const existing = project.historicalDatasets.find((d) => d.id === dataset.id);
  if (existing && JSON.stringify(existing) !== JSON.stringify(dataset))
    throw new Error('Historical dataset identifier already has different data');
  if (!existing) project.historicalDatasets.push(dataset);
  scene.layers.push(
    layerSchema.parse({
      id,
      name: dataset.name,
      type: 'historical',
      historicalDatasetId: dataset.id,
      regionIds: dataset.regions.map((r) => r.id),
      historyYear: dataset.epochs[0]!.fromYear,
      timeRange: { start: 0, end: scene.durationSeconds },
      style: { color: '#45b8b0', borderColor: '#ffffff', borderWidth: 2 },
    }),
  );
  if (focus) {
    // Use the first snapshot's nearest world copy, retaining every original ring in the registry.
    const points = dataset.epochs[0]!.features.flatMap((f) =>
      historyPolygons(f.geometry).flatMap((p) => p.flat()),
    );
    const reference = points[0]![0];
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    for (const [lng, lat] of points) {
      const x = reference + ((lng - reference + 540) % 360) - 180;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, lat);
      maxY = Math.max(maxY, lat);
    }
    const lat = (minY + maxY) / 2;
    const extent = Math.max(
      maxX - minX,
      (maxY - minY) / Math.cos((lat * Math.PI) / 180),
      0.001,
    );
    const zoom = Math.max(
      0,
      Math.min(
        17,
        Math.log2(
          (360 * Math.min(project.canvas.width, project.canvas.height)) /
            (512 * extent),
        ) - 1.2,
      ),
    );
    project.map.terrain = null;
    scene.camera.follow = null;
    scene.camera.keyframes = [
      {
        time: 0,
        value: {
          lng: (((minX + maxX) / 2 + 540) % 360) - 180,
          lat,
          zoom,
          bearing: 0,
          pitch: 0,
        },
        easing: 'linear',
      },
    ];
  }
  return id;
}
