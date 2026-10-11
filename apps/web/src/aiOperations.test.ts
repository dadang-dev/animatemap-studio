import { test, expect } from 'vitest';
import { createDemo } from '@animatemap/project-schema';
import { audioFixtureProject } from '../../../packages/project-schema/src/audio.fixture';
import { applyReviewedProposal, lockedProject } from './aiOperations';
import { useEditor } from './store';
test('review application is one undoable transaction and stale/locked contents are protected', () => {
  const original = createDemo();
  useEditor.getState().load(original);
  const base = JSON.stringify(original);
  const next = createDemo('highlight');
  applyReviewedProposal(next, base);
  expect(useEditor.getState().past).toHaveLength(1);
  expect(useEditor.getState().project).toEqual(next);
  useEditor.getState().undo();
  expect(useEditor.getState().project).toEqual(original);
  useEditor.getState().redo();
  expect(useEditor.getState().project).toEqual(next);
  expect(() => applyReviewedProposal(original, base)).toThrow('changed');
  useEditor.getState().load(original);
  useEditor.getState().edit((p) => {
    p.scenes[0]!.layers[0]!.locked = true;
  });
  const locked = useEditor.getState().project;
  expect(() => applyReviewedProposal(next, JSON.stringify(locked))).toThrow(
    'Unlock',
  );
  expect(useEditor.getState().project).toEqual(locked);
  const media = audioFixtureProject();
  media.audioTracks[0]!.locked = true;
  expect(lockedProject(media)).toBe(true);
  media.audioTracks[0]!.locked = false;
  media.captions.cues[0]!.locked = true;
  expect(lockedProject(media)).toBe(true);
});
