import { test, expect } from 'vitest';
import { createDemo, migrateProject } from '@animatemap/project-schema';
import { evaluateProjectAt } from '@animatemap/animation-core';
import { buildingFixture } from '../../../packages/project-schema/src/buildings.fixture';
import { addBuildingLayer, deleteUnusedBuildings } from './buildingOperations';
import { useEditor } from './store';
test('reviewed buildings use one undoable transaction including camera/source; locks block edits; references prevent removal and JSON round-trips unchanged', () => {
  useEditor.getState().load(createDemo());
  const before = useEditor.getState().project;
  const scene = before.scenes[0]!;
  useEditor.getState().edit((p) => {
    addBuildingLayer(p, scene.id, buildingFixture(), true, 'buildings');
  });
  const after = useEditor.getState().project;
  expect(after.buildingDatasets).toHaveLength(1);
  expect(after.scenes[0]!.camera.keyframes[0]!.value.pitch).toBe(55);
  expect(migrateProject(JSON.parse(JSON.stringify(after)))).toEqual(after);
  expect(() =>
    deleteUnusedBuildings(structuredClone(after), 'test-buildings'),
  ).toThrow('references');
  useEditor.getState().undo();
  expect(useEditor.getState().project).toEqual(before);
  useEditor.getState().redo();
  expect(useEditor.getState().project).toEqual(after);
  useEditor.setState({ selected: 'buildings' });
  useEditor.getState().edit((p) => {
    p.scenes[0]!.layers.at(-1)!.locked = true;
  });
  const locked = useEditor.getState().project;
  useEditor.getState().patchLayer((l) => {
    if (l.type === 'buildings') l.heightScale = 2;
  });
  expect(useEditor.getState().project).toEqual(locked);
  useEditor.getState().edit((p) => {
    p.scenes[0]!.layers = p.scenes[0]!.layers.filter(
      (l) => l.id !== 'buildings',
    );
    deleteUnusedBuildings(p, 'test-buildings');
  });
  expect(useEditor.getState().project.buildingDatasets).toEqual([]);
});
test('building height growth uses scene-local easing/boundaries and repeated seeks are identical; invalid review cannot mutate current project', () => {
  const p = createDemo();
  addBuildingLayer(p, p.scenes[0]!.id, buildingFixture(), false, 'b');
  const l = p.scenes[0]!.layers.at(-1)!;
  l.tracks.heightScale = [
    { time: 0, value: 0, easing: 'linear' },
    { time: 2, value: 1, easing: 'linear' },
  ];
  for (const [t, expected] of [
    [0, 0],
    [1, 0.5],
    [2, 1],
    [12, 1],
  ]) {
    const first = evaluateProjectAt(p, t!);
    const value = first.layers.at(-1)!;
    expect(value.type === 'buildings' && value.heightScale).toBe(expected);
    expect(evaluateProjectAt(p, t!)).toEqual(first);
  }
  useEditor.getState().load(p);
  const before = useEditor.getState().project,
    invalid = buildingFixture();
  invalid.records[0]!.height = -1;
  useEditor.getState().edit((project) => {
    addBuildingLayer(project, project.scenes[0]!.id, invalid, true);
  });
  expect(useEditor.getState().project).toBe(before);
  expect(useEditor.getState().error).toBeTruthy();
});
