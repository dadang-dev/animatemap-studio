import { expect, test } from 'vitest';
import {
  audioFixtureProject,
  toneWav,
  audioFixtureProvenance,
} from '../../../packages/project-schema/src/audio.fixture';
import { migrateProject } from '@animatemap/project-schema';
import {
  addAudioTrack,
  importWav,
  parseCaptions,
  trimProjectMedia,
} from './audioOperations';
import { useEditor } from './store';
import { instantiateTemplate, savedTemplate } from './templates';

test('audio imports and tracks retain PCM, provenance, history, source offsets and template independence', () => {
  const project = audioFixtureProject();
  useEditor.getState().load(project);
  useEditor.getState().edit((p) => {
    p.audioAssets.push(
      importWav(toneWav(0.5), 'Voice.wav', audioFixtureProvenance, 'voice'),
    );
    addAudioTrack(p, 'voice', 0.5, 'track-voice');
  });
  const edited = useEditor.getState().project;
  useEditor.getState().undo();
  expect(useEditor.getState().project).toEqual(project);
  useEditor.getState().redo();
  expect(useEditor.getState().project).toEqual(edited);
  expect(migrateProject(JSON.parse(JSON.stringify(edited)))).toEqual(edited);
  const instance = instantiateTemplate(savedTemplate('Audio template', edited));
  expect(instance.audioTracks[0]!.id).not.toBe(edited.audioTracks[0]!.id);
  expect(instance.captions.cues[0]!.id).not.toBe(edited.captions.cues[0]!.id);
  expect(instance.audioAssets).toEqual(edited.audioAssets);
  expect(() => addAudioTrack(project, 'tone', 2)).toThrow('playhead');
});
test('reviewed Unicode SRT/VTT cues reject markup, invalid bounds, malformed timing and preserve explicit line breaks', () => {
  const cues = parseCaptions(
    '\uFEFF1\r\n00:00:00,250 --> 00:00:01,250\r\nHà Nội\r\nĐà Nẵng\r\n\r\n2\r\n00:00:01,250 --> 00:00:02,000\r\nTP. Hồ Chí Minh',
    2,
    () => crypto.randomUUID(),
  );
  expect(cues[0]!.text).toBe('Hà Nội\nĐà Nẵng');
  expect(
    parseCaptions('WEBVTT\n\n00:00.250 --> 00:01.000\nUnicode Việt Nam', 2)[0]!
      .startSeconds,
  ).toBe(0.25);
  for (const text of [
    '1\n00:00:00,000 --> 00:00:03,000\nLong',
    '1\n00:00:01,000 --> 00:00:00,000\nBack',
    '1\n00:00:00,000 --> 00:00:01,000\n<script>alert(1)</script>',
    'nonsense',
  ])
    expect(() => parseCaptions(text, 2)).toThrow();
});
test('structural project trims keep global media valid and proportionally bound fades', () => {
  const project = audioFixtureProject();
  project.durationSeconds = 1.25;
  project.audioTracks[0]!.fadeInSeconds = 0.75;
  project.audioTracks[0]!.fadeOutSeconds = 0.75;
  trimProjectMedia(project);
  expect(project.audioTracks[0]).toMatchObject({
    durationSeconds: 1,
    fadeInSeconds: 0.5,
    fadeOutSeconds: 0.5,
  });
  expect(project.captions.cues).toHaveLength(1);
  expect(project.captions.cues[0]!.endSeconds).toBe(1.25);
});
