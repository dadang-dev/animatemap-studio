import {
  modelAssetSchema,
  layerSchema,
  type ModelAsset,
  type Project,
  type Camera,
} from '@animatemap/project-schema';
export function modelReferences(project: Project, id: string) {
  return project.scenes.flatMap((s) =>
    s.layers.filter((l) => l.type === 'model' && l.modelAssetId === id),
  );
}
export function deleteUnusedModel(project: Project, id: string) {
  if (modelReferences(project, id).length)
    throw new Error(
      'Model asset is used by a layer; remove its references first',
    );
  project.modelAssets = project.modelAssets.filter((a) => a.id !== id);
}
export function addModelLayer(
  project: Project,
  sceneId: string,
  supplied: ModelAsset,
  camera: Camera,
  id: string = crypto.randomUUID(),
) {
  const scene = project.scenes.find((s) => s.id === sceneId);
  if (!scene) throw new Error('Select a scene before adding a model');
  const asset = modelAssetSchema.parse(supplied),
    existing = project.modelAssets.find((a) => a.id === asset.id);
  if (existing && JSON.stringify(existing) !== JSON.stringify(asset))
    throw new Error(
      'Model asset identifier already exists with different geometry',
    );
  if (!existing) project.modelAssets.push(asset);
  scene.layers.push(
    layerSchema.parse({
      id,
      name: asset.name,
      type: 'model',
      modelAssetId: asset.id,
      timeRange: { start: 0, end: scene.durationSeconds },
      motion: { type: 'stationary', coordinates: [camera.lng, camera.lat] },
      style: { color: '#ffb866' },
    }),
  );
  return id;
}
