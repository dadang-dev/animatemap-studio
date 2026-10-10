import { expect, test } from 'vitest';
import { createDemo, migrateProject } from '@animatemap/project-schema';
import { evaluateProjectAt } from './index';

test('crossfade freezes outgoing final frame and evaluates live incoming state deterministically', () => {
  const project = createDemo();
  const first = project.scenes[0]!;
  const second = structuredClone(first);
  second.id = 'second';
  second.startSeconds = 12;
  second.transition = { type: 'crossfade', durationSeconds: 2 };
  second.layers.forEach((layer) => {
    layer.id = `second-${layer.id}`;
  });
  second.camera.keyframes[0]!.value.lng = 100;
  project.scenes.push(second);
  project.durationSeconds = 24;
  const valid = migrateProject(project),
    original = JSON.stringify(valid);
  const final = evaluateProjectAt(valid, 12 - 1 / 30);
  const atStart = evaluateProjectAt(valid, 12);
  const middle = evaluateProjectAt(valid, 13);
  expect(atStart.blend!.incomingWeight).toBe(0);
  expect(middle.blend!.incomingWeight).toBe(0.5);
  expect(middle.blend!.outgoing.camera).toEqual(final.camera);
  expect(middle.blend!.outgoing.layers).toEqual(final.layers);
  expect(middle.sceneId).toBe('second');
  expect(middle.camera).not.toEqual(atStart.camera);
  expect(evaluateProjectAt(valid, 14).blend).toBeUndefined();
  expect(evaluateProjectAt(valid, 13)).toEqual(middle);
  expect(JSON.stringify(valid)).toBe(original);
  second.transition = { type: 'cut' };
  expect(evaluateProjectAt(project, 12).blend).toBeUndefined();
});
