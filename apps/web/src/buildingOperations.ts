import {
  buildingDatasetSchema,
  buildingPolygons,
  layerSchema,
  type Project,
  type BuildingDataset,
} from '@animatemap/project-schema';
export function buildingReferences(project: Project, id: string) {
  return project.scenes.flatMap((s) =>
    s.layers.filter(
      (l) => l.type === 'buildings' && l.buildingDatasetId === id,
    ),
  );
}
export function deleteUnusedBuildings(project: Project, id: string) {
  if (buildingReferences(project, id).length)
    throw new Error(
      'Buildings are used by a layer; remove its references first',
    );
  project.buildingDatasets = project.buildingDatasets.filter(
    (d) => d.id !== id,
  );
}
export function addBuildingLayer(
  project: Project,
  sceneId: string,
  supplied: BuildingDataset,
  focus: boolean,
  id: string = crypto.randomUUID(),
) {
  const scene = project.scenes.find((s) => s.id === sceneId);
  if (!scene) throw new Error('Select a scene before adding buildings');
  const dataset = buildingDatasetSchema.parse(supplied);
  const existing = project.buildingDatasets.find((d) => d.id === dataset.id);
  if (existing && JSON.stringify(existing) !== JSON.stringify(dataset))
    throw new Error(
      'Building dataset identifier already exists with different data',
    );
  if (!existing) project.buildingDatasets.push(dataset);
  scene.layers.push(
    layerSchema.parse({
      id,
      name: dataset.name,
      type: 'buildings',
      buildingDatasetId: dataset.id,
      timeRange: { start: 0, end: scene.durationSeconds },
      heightScale: 1,
      style: { color: '#75d9bd', verticalGradient: true },
    }),
  );
  if (focus) {
    const points = dataset.records.flatMap((r) =>
      buildingPolygons(r.geometry).flatMap((p) => p.flat()),
    );
    const xs = points.map((p) => p[0]),
      ys = points.map((p) => p[1]);
    const minX = Math.min(...xs),
      maxX = Math.max(...xs),
      minY = Math.min(...ys),
      maxY = Math.max(...ys);
    const extent = Math.max(
      maxX - minX,
      (maxY - minY) / Math.cos((((minY + maxY) / 2) * Math.PI) / 180),
    );
    const zoom = Math.max(
      0,
      Math.min(
        17,
        Math.log2(
          (360 * project.canvas.width) / (512 * Math.max(extent, 0.001)),
        ) - 1.5,
      ),
    );
    project.map.terrain = null;
    scene.camera.follow = null;
    scene.camera.keyframes = [
      {
        time: 0,
        value: {
          lng: (minX + maxX) / 2,
          lat: (minY + maxY) / 2,
          zoom,
          bearing: 25,
          pitch: 55,
        },
        easing: 'linear',
      },
    ];
  }
  return id;
}
