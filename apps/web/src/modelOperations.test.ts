import { test, expect } from 'vitest';
import { createDemo, migrateProject } from '@animatemap/project-schema';
import { evaluateProjectAt } from '@animatemap/animation-core';
import { modelFixture } from '../../../packages/project-schema/src/models.fixture';
import { addModelLayer, deleteUnusedModel } from './modelOperations';
import { useEditor } from './store';
import { addBuildingLayer } from './buildingOperations';
import { buildingFixture } from '../../../packages/project-schema/src/buildings.fixture';
test('reviewed building focus explicitly replaces model follow; undo restores both following and original camera keys', () => {
  const p = createDemo(),
    s = p.scenes[0]!;
  addModelLayer(
    p,
    s.id,
    modelFixture(),
    s.camera.keyframes[0]!.value,
    'followed',
  );
  s.camera.follow = {
    layerId: 'followed',
    zoom: 17,
    pitch: 55,
    bearingMode: 'fixed',
    bearing: 25,
  };
  useEditor.getState().load(p);
  const before = useEditor.getState().project;
  useEditor
    .getState()
    .edit((next) =>
      addBuildingLayer(next, s.id, buildingFixture(), true, 'buildings'),
    );
  expect(useEditor.getState().project.scenes[0]!.camera.follow).toBeNull();
  expect(useEditor.getState().camera).toEqual(
    evaluateProjectAt(useEditor.getState().project, 0).camera,
  );
  useEditor.getState().undo();
  expect(useEditor.getState().project).toEqual(before);
  expect(useEditor.getState().camera.lng).toBe(
    s.camera.keyframes[0]!.value.lng,
  );
});
test('model registry/follow/pose edits round-trip and undo together; duplicates receive correct fresh follow IDs, locks are preserved, and deletion restores manual camera', () => {
  useEditor.getState().load(createDemo());
  const before = useEditor.getState().project;
  useEditor.getState().edit((p) => {
    const s = p.scenes[0]!;
    addModelLayer(
      p,
      s.id,
      modelFixture(),
      { lng: 10, lat: 20, zoom: 17, pitch: 55, bearing: 0 },
      'model',
    );
    s.camera.follow = {
      layerId: 'model',
      zoom: 17,
      pitch: 55,
      bearingMode: 'fixed',
      bearing: 0,
    };
  });
  const after = useEditor.getState().project;
  useEditor.getState().addCameraKey();
  expect(useEditor.getState().project).toBe(after);
  expect(migrateProject(JSON.parse(JSON.stringify(after)))).toEqual(after);
  expect(useEditor.getState().camera.lng).toBe(10);
  useEditor.getState().undo();
  expect(useEditor.getState().project).toEqual(before);
  useEditor.getState().redo();
  expect(useEditor.getState().project).toEqual(after);
  useEditor
    .getState()
    .sceneOperation({ type: 'duplicate', id: after.scenes[0]!.id });
  const copy = useEditor.getState().project.scenes[1]!;
  expect(copy.camera.follow!.layerId).toBe(
    copy.layers.find((l) => l.type === 'model')!.id,
  );
  expect(copy.camera.follow!.layerId).not.toBe('model');
  useEditor.getState().undo();
  useEditor.setState({ selected: 'model' });
  useEditor.getState().edit((p) => {
    p.scenes[0]!.layers.at(-1)!.locked = true;
  });
  const locked = useEditor.getState().project;
  useEditor.getState().deleteLayer();
  expect(useEditor.getState().project).toBe(locked);
  useEditor.getState().undo();
  expect(() => deleteUnusedModel(structuredClone(after), 'test-mesh')).toThrow(
    'references',
  );
  useEditor.getState().deleteLayer();
  expect(useEditor.getState().project.scenes[0]!.camera.follow).toBeNull();
  expect(useEditor.getState().camera).toEqual(
    evaluateProjectAt(before, useEditor.getState().time).camera,
  );
  useEditor.getState().edit((p) => deleteUnusedModel(p, 'test-mesh'));
  expect(useEditor.getState().project.modelAssets).toEqual([]);
});
