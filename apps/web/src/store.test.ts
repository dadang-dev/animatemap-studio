import { expect, test } from 'vitest';
import { createDemo } from '@animatemap/project-schema';
import { useEditor } from './store';
test('transactions undo and redo layers and camera keys; lock prevents edits', () => {
  useEditor.getState().load(createDemo());
  const s = () => useEditor.getState();
  s().patchLayer((l) => {
    l.style.color = '#ff0000';
  });
  expect(s().project.scenes[0]!.layers[0]!.style.color).toBe('#ff0000');
  s().undo();
  expect(s().project.scenes[0]!.layers[0]!.style.color).toBe('#307e72');
  s().redo();
  expect(s().project.scenes[0]!.layers[0]!.style.color).toBe('#ff0000');
  s().seek(3);
  s().addCameraKey();
  expect(s().project.scenes[0]!.camera.keyframes).toHaveLength(4);
  s().undo();
  expect(s().project.scenes[0]!.camera.keyframes).toHaveLength(3);
  s().patchLayer((l) => {
    l.locked = true;
  });
  s().patchLayer((l) => {
    l.name = 'Changed';
  });
  expect(s().project.scenes[0]!.layers[0]!.name).toBe('Vietnam');
});
test('locked and unchanged edits preserve undo, redo, and selection', () => {
  useEditor.getState().load(createDemo());
  const s = () => useEditor.getState();
  s().patchLayer((layer) => {
    layer.locked = true;
  });
  const past = s().past;
  s().patchLayer((layer) => {
    layer.name = 'Blocked';
  });
  s().deleteLayer();
  expect(s().past).toBe(past);
  expect(s().selected).toBe('highlight-vn');
  s().undo();
  const future = s().future;
  s().edit(() => {});
  expect(s().future).toBe(future);
  s().redo();
  expect(s().project.scenes[0]!.layers[0]!.locked).toBe(true);
});
test('shortening a project clamps the playhead across edits and redo', () => {
  useEditor.getState().load(createDemo());
  const s = () => useEditor.getState();
  s().seek(11);
  s().edit((project) => {
    project.durationSeconds = 6;
    const scene = project.scenes[0]!;
    scene.durationSeconds = 6;
    scene.camera.keyframes = scene.camera.keyframes.filter(
      (key) => key.time <= 6,
    );
    for (const layer of scene.layers) {
      layer.timeRange.end = 6;
      layer.tracks.opacity = layer.tracks.opacity.filter(
        (key) => key.time <= 6,
      );
      layer.tracks.reveal = layer.tracks.reveal.filter((key) => key.time <= 6);
    }
  });
  expect(s().error).toBe('');
  expect(s().time).toBe(6);
  s().undo();
  s().seek(11);
  s().redo();
  expect(s().time).toBe(6);
});
