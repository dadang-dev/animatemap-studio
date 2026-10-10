import { expect, test } from 'vitest';
import { createDemo, migrateProject } from '@animatemap/project-schema';
import { evaluateProjectAt } from '@animatemap/animation-core';
import { applySceneOperation } from './sceneOperations';
import { useEditor } from './store';

test('duplicates preserve local animation with isolated layers and unique IDs', () => {
  const project = createDemo();
  let next = 0;
  const id = applySceneOperation(
    project,
    { type: 'duplicate', id: 'scene-1' },
    () => `copy-${next++}`,
  );
  const first = project.scenes[0]!,
    copy = project.scenes[1]!;
  expect(id).toBe(copy.id);
  expect(copy.startSeconds).toBe(12);
  expect(project.durationSeconds).toBe(24);
  expect(migrateProject(project)).toEqual(project);
  expect(evaluateProjectAt(project, 15).camera).toEqual(
    evaluateProjectAt(project, 3).camera,
  );
  copy.layers[0]!.style.color = '#ff0000';
  expect(first.layers[0]!.style.color).toBe('#307e72');
  expect(copy.camera.keyframes).not.toBe(first.camera.keyframes);
});

test('resize and reorder reflow scenes while retaining local keyframe times', () => {
  const project = createDemo();
  const copyId = applySceneOperation(project, {
    type: 'duplicate',
    id: 'scene-1',
  });
  applySceneOperation(project, { type: 'resize', id: 'scene-1', duration: 6 });
  expect(project.scenes[1]!.startSeconds).toBe(6);
  expect(project.durationSeconds).toBe(18);
  expect(project.scenes[0]!.camera.keyframes.map((key) => key.time)).toEqual([
    0, 5,
  ]);
  applySceneOperation(project, { type: 'move', id: copyId, direction: -1 });
  expect(project.scenes.map((scene) => scene.startSeconds)).toEqual([0, 12]);
  expect(project.scenes[0]!.camera.keyframes.map((key) => key.time)).toEqual([
    0, 5, 12,
  ]);
  expect(migrateProject(project)).toEqual(project);
  applySceneOperation(project, { type: 'resize', id: 'scene-1', duration: 8 });
  expect(project.scenes[1]!.layers[0]!.timeRange.end).toBe(8);
});

test('trimming imported late camera keys and layers remains valid', () => {
  const project = createDemo();
  const scene = project.scenes[0]!;
  scene.camera.keyframes = [{ ...scene.camera.keyframes[1]!, time: 10 }];
  scene.layers[0]!.timeRange = { start: 10, end: 12 };
  const held = evaluateProjectAt(project, 3).camera;
  applySceneOperation(project, { type: 'resize', id: scene.id, duration: 3 });
  expect(scene.camera.keyframes[0]!.time).toBe(0);
  expect(scene.camera.keyframes[0]!.value).toEqual(held);
  expect(scene.layers[0]!.timeRange.start).toBeLessThan(3);
  expect(migrateProject(project)).toEqual(project);
});

test('invalid operations are atomic, protect the last scene, and enforce project limits', () => {
  useEditor.getState().load(createDemo());
  const state = () => useEditor.getState();
  const original = state().project;
  state().sceneOperation({ type: 'delete', id: 'scene-1' });
  expect(state().error).toContain('at least one');
  expect(state().project).toBe(original);
  state().sceneOperation({ type: 'resize', id: 'scene-1', duration: NaN });
  expect(state().project).toBe(original);
  state().sceneOperation({ type: 'resize', id: 'scene-1', duration: 295 });
  state().sceneOperation({ type: 'duplicate', id: 'scene-1' });
  expect(state().error).toContain('300');
  expect(state().project.scenes).toHaveLength(1);
  state().sceneOperation({ type: 'add', camera: state().camera });
  expect(state().project.durationSeconds).toBe(300);
  const full = state().project;
  state().sceneOperation({ type: 'add', camera: state().camera });
  expect(state().project).toBe(full);
  expect(state().past).toHaveLength(2);
});

test('scene operations preserve active local time, history, and current-scene selection', () => {
  useEditor.getState().load(createDemo());
  const s = () => useEditor.getState();
  s().sceneOperation({ type: 'duplicate', id: 'scene-1' });
  const copy = s().project.scenes[1]!;
  s().seek(15);
  s().sceneOperation({ type: 'move', id: copy.id, direction: -1 });
  expect(s().time).toBe(3);
  expect(s().selected).toBe(copy.layers[0]!.id);
  s().undo();
  expect(s().project.scenes[0]!.id).toBe('scene-1');
  expect(s().selected).toBe('highlight-vn');
  s().redo();
  expect(s().selected).toBe(copy.layers[0]!.id);
  s().sceneOperation({ type: 'delete', id: copy.id });
  expect(s().project.scenes).toHaveLength(1);
  expect(s().time).toBe(0);
  s().undo();
  expect(s().project.scenes).toHaveLength(2);
  expect(migrateProject(JSON.parse(JSON.stringify(s().project)))).toEqual(
    s().project,
  );
});

test('cuts use the next scene at the exact boundary and reset local animation', () => {
  const project = createDemo();
  const next = applySceneOperation(project, {
    type: 'duplicate',
    id: 'scene-1',
  });
  const valid = migrateProject(project);
  expect(evaluateProjectAt(valid, 12 - 1 / 30).sceneId).toBe('scene-1');
  const cut = evaluateProjectAt(valid, 12);
  expect(cut.sceneId).toBe(next);
  expect(cut.camera).toEqual(evaluateProjectAt(valid, 0).camera);
  expect(
    cut.layers.find((layer) => layer.type === 'route')?.coordinates,
  ).toEqual(
    evaluateProjectAt(valid, 0).layers.find((layer) => layer.type === 'route')
      ?.coordinates,
  );
  expect(evaluateProjectAt(valid, 24).sceneId).toBe(next);
  expect(evaluateProjectAt(valid, 12)).toEqual(cut);
});

test('loading legacy v1 gaps preserves content; structural edits normalize the sequence', () => {
  const input = createDemo();
  input.scenes[0]!.startSeconds = 2;
  input.durationSeconds = 14;
  useEditor.getState().load(input);
  expect(useEditor.getState().project).toEqual(input);
  useEditor
    .getState()
    .sceneOperation({ type: 'add', camera: useEditor.getState().camera });
  expect(
    useEditor.getState().project.scenes.map((scene) => scene.startSeconds),
  ).toEqual([0, 12]);
  useEditor.getState().undo();
  expect(useEditor.getState().project).toEqual(input);
});

test('the twentieth scene is allowed and a twenty-first scene is rejected atomically', () => {
  useEditor.getState().load(createDemo());
  for (let index = 1; index < 20; index++)
    useEditor
      .getState()
      .sceneOperation({ type: 'add', camera: useEditor.getState().camera });
  const before = useEditor.getState().project;
  expect(before.scenes).toHaveLength(20);
  useEditor
    .getState()
    .sceneOperation({ type: 'duplicate', id: before.scenes[0]!.id });
  expect(useEditor.getState().project).toBe(before);
  expect(useEditor.getState().error).toContain('20');
});
