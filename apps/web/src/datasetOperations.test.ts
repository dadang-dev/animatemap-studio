import { expect, test } from 'vitest';
import { createDemo, migrateProject } from '@animatemap/project-schema';
import { testDataset } from '../../../packages/project-schema/src/datasets.fixture';
import { addChoropleth, deleteUnusedDataset } from './datasetOperations';
import { useEditor } from './store';
import { applySceneOperation } from './sceneOperations';
import { instantiateTemplate } from './templates';
test('choropleths share normalized records across history and independent template instances', () => {
  const editor = () => useEditor.getState();
  editor().load(createDemo());
  const before = editor().project;
  editor().edit((project) => {
    addChoropleth(project, project.scenes[0]!.id, testDataset(), 'data-a');
  });
  const created = editor().project;
  expect(created.datasets).toHaveLength(1);
  editor().undo();
  expect(editor().project).toEqual(before);
  editor().redo();
  expect(editor().project).toEqual(created);
  editor().edit((project) => {
    addChoropleth(project, project.scenes[0]!.id, testDataset(), 'data-b');
  });
  expect(editor().project.datasets).toHaveLength(1);
  expect(() =>
    deleteUnusedDataset(structuredClone(editor().project), 'test-data'),
  ).toThrow('used');
  useEditor.setState({ selected: 'data-a' });
  editor().patchLayer((layer) => {
    layer.locked = true;
  });
  const locked = editor().project;
  editor().patchLayer((layer) => {
    layer.tracks.dataYear = [];
  });
  expect(editor().project).toBe(locked);
  const instance = instantiateTemplate({
    id: 'data-template',
    name: 'Data template',
    description: 'Illustrative data',
    category: 'Saved',
    project: editor().project,
  });
  expect(instance.datasets).toEqual(editor().project.datasets);
  expect(instance.scenes[0]!.layers.at(-1)!.id).not.toBe('data-b');
  expect(migrateProject(JSON.parse(JSON.stringify(instance)))).toEqual(
    instance,
  );
});
test('scene trim discards late data-year keys, preserving the remaining source observations', () => {
  const project = createDemo();
  addChoropleth(project, project.scenes[0]!.id, testDataset(), 'data');
  applySceneOperation(project, {
    type: 'resize',
    id: project.scenes[0]!.id,
    duration: 6,
  });
  const layer = project.scenes[0]!.layers.find(
    (layer) => layer.type === 'choropleth',
  )!;
  expect(layer.tracks.dataYear.map((key) => key.time)).toEqual([0]);
  expect(project.datasets[0]!.records).toEqual(testDataset().records);
  expect(migrateProject(project)).toEqual(project);
});
