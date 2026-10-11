import { expect, test } from 'vitest';
import { audioFixtureProject } from '../../project-schema/src/audio.fixture';
import { audioGainAt, evaluateProjectAt } from './index';

test('project-time gain envelopes, source offsets and captions have deterministic half-open boundaries', () => {
  const project = audioFixtureProject(),
    track = project.audioTracks[0]!;
  expect(
    [-1, 0.25, 0.375, 0.5, 1, 1.625, 1.75, 2].map((time) =>
      audioGainAt(track, time),
    ),
  ).toEqual([0, 0, 0.25, 0.5, 0.5, 0.25, 0, 0]);
  expect(evaluateProjectAt(project, 0.375).audio[0]).toMatchObject({
    active: true,
    sourceSeconds: 0.625,
    gain: 0.25,
  });
  expect(evaluateProjectAt(project, 0.249).captions).toEqual([]);
  expect(
    evaluateProjectAt(project, 1.25).captions.map((cue) => cue.id),
  ).toEqual(['cue-2']);
  expect(evaluateProjectAt(project, 2).captions).toEqual([]);
  const before = structuredClone(project);
  for (const time of [1.6, 0, 1.25, 0.375, 1.6])
    expect(evaluateProjectAt(project, time)).toEqual(
      evaluateProjectAt(before, time),
    );
  expect(project).toEqual(before);
  track.muted = true;
  expect(evaluateProjectAt(project, 1).audio[0]).toMatchObject({
    gain: 0,
    active: false,
  });
});
