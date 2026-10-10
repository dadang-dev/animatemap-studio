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
