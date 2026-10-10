import {
  defaultDataDomain,
  layerSchema,
  type Dataset,
  type Project,
} from '@animatemap/project-schema';
export function datasetReferences(project: Project, id: string) {
  return project.scenes.flatMap((scene) =>
    scene.layers.filter(
      (layer) => layer.type === 'choropleth' && layer.datasetId === id,
    ),
  );
}
export function deleteUnusedDataset(project: Project, id: string) {
  if (datasetReferences(project, id).length)
    throw new Error('Dataset is used by a layer; remove its references first');
  project.datasets = project.datasets.filter((dataset) => dataset.id !== id);
}
export function dataYearKeys(dataset: Dataset, duration: number) {
  const years = dataset.records.map((record) => record.year);
  const min = Math.min(...years),
    max = Math.max(...years);
  return min === max
    ? []
    : [
        { time: 0, value: min, easing: 'linear' as const },
        { time: duration, value: max, easing: 'linear' as const },
      ];
}
export function addChoropleth(
  project: Project,
  sceneId: string,
  supplied: Dataset,
  id: string = crypto.randomUUID(),
) {
  const scene = project.scenes.find((scene) => scene.id === sceneId);
  if (!scene) throw new Error('Select a scene before adding data');
  let dataset = project.datasets.find(
    (dataset) =>
      JSON.stringify({ ...dataset, id: '' }) ===
      JSON.stringify({ ...supplied, id: '' }),
  );
  if (!dataset) {
    dataset = structuredClone(supplied);
    project.datasets.push(dataset);
  }
  scene.layers.push(
    layerSchema.parse({
      id,
      type: 'choropleth',
      name: `${dataset.name} · data`.slice(0, 200),
      datasetId: dataset.id,
      timeRange: { start: 0, end: scene.durationSeconds },
      dataYear: Math.min(...dataset.records.map((record) => record.year)),
      sampling: 'linear',
      domain: defaultDataDomain(dataset.records),
      style: {
        color: '#24505a',
        highColor: '#8bdcc1',
        missingColor: '#666870',
        stroke: '#7d9495',
        width: 0.7,
      },
      tracks: { dataYear: dataYearKeys(dataset, scene.durationSeconds) },
    }),
  );
  return id;
}
