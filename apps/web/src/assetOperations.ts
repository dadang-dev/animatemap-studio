import {
  layerSchema,
  type ImageAsset,
  type Project,
} from '@animatemap/project-schema';

export function addAssetLayer(
  project: Project,
  sceneId: string,
  supplied: ImageAsset,
  kind: 'image' | 'texture',
  country: string,
  id: string = crypto.randomUUID(),
) {
  const scene = project.scenes.find((scene) => scene.id === sceneId);
  if (!scene) throw new Error('Select a scene before adding an asset');
  let asset = project.assets.find(
    (asset) =>
      asset.dataUrl === supplied.dataUrl &&
      JSON.stringify(asset.provenance) === JSON.stringify(supplied.provenance),
  );
  if (!asset) {
    asset = structuredClone(supplied);
    project.assets.push(asset);
  }
  const common = {
    id,
    name: kind === 'image' ? asset.name : `${country} · ${asset.name}`,
    type: kind === 'image' ? 'image' : 'countryHighlight',
    timeRange: { start: 0, end: scene.durationSeconds },
  };
  const layer = layerSchema.parse(
    kind === 'image'
      ? {
          ...common,
          assetId: asset.id,
          anchor: { type: 'screen', x: 0.75, y: 0.08 },
          style: {
            width: 240,
            height: Math.min(3840, (240 * asset.height) / asset.width),
            fit: 'contain',
          },
        }
      : {
          ...common,
          countryCodes: [country],
          textureAssetId: asset.id,
          style: {
            color: '#307e72',
            stroke: '#75d9bd',
            width: 1.5,
            dimOutside: 0,
          },
        },
  );
  scene.layers.push(layer);
  return id;
}
export function assetReferences(project: Project, assetId: string) {
  return project.scenes.flatMap((scene) =>
    scene.layers.filter(
      (layer) =>
        (layer.type === 'image' && layer.assetId === assetId) ||
        (layer.type === 'countryHighlight' && layer.textureAssetId === assetId),
    ),
  );
}
export function deleteUnusedAsset(project: Project, id: string) {
  if (assetReferences(project, id).length)
    throw new Error('Asset is used by a layer; remove its references first');
  project.assets = project.assets.filter((asset) => asset.id !== id);
}
