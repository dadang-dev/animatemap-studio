import { test, expect } from 'vitest';
import {
  createDemo,
  wavDataUrl,
  type VoiceResult,
  projectSchema,
} from '@animatemap/project-schema';
import { toneWav } from '../../../packages/project-schema/src/audio.fixture';
import { assembleSceneVoice } from './voiceGeneration';
import { trimProjectMedia } from './audioOperations';
test('scene voice preserves cameras and aligns actual speech; locked or oversized changes fail before applying', () => {
  const p = createDemo(),
    result: VoiceResult = {
      voiceId: 'edge_test',
      voiceName: 'Test',
      durationSeconds: 0.5,
      dataUrl: wavDataUrl(toneWav(0.5, 1)),
      creditCost: 1,
      words: [
        { text: 'Hà', startSeconds: 0.05, endSeconds: 0.15 },
        { text: 'Nội.', startSeconds: 0.15, endSeconds: 0.3 },
      ],
    };
  const next = assembleSceneVoice(
    p,
    [{ sceneId: p.scenes[0]!.id, result }],
    '',
  );
  expect(next.scenes).toEqual(p.scenes);
  expect(next.captions.cues[0]!.words![0]!.startSeconds).toBeCloseTo(0.225);
  expect(p.audioAssets).toHaveLength(0);
  expect(next.captions.style.wordHighlight).toBe(true);
  next.captions.cues[0]!.locked = true;
  expect(() =>
    assembleSceneVoice(next, [{ sceneId: p.scenes[0]!.id, result }], ''),
  ).toThrow('Unlock');
  expect(() =>
    assembleSceneVoice(
      p,
      [
        {
          sceneId: p.scenes[0]!.id,
          result: {
            ...result,
            words: [{ text: 'Too long', startSeconds: 0, endSeconds: 100 }],
          },
        },
      ],
      '',
    ),
  ).toThrow();
});
test('timeline trim preserves valid word alignment and drops words past the cut', () => {
  const p = createDemo();
  p.durationSeconds = 1;
  p.scenes = [
    {
      ...p.scenes[0]!,
      durationSeconds: 1,
      camera: {
        ...p.scenes[0]!.camera,
        keyframes: [p.scenes[0]!.camera.keyframes[0]!],
      },
      layers: [],
    },
  ];
  p.captions.cues = [
    {
      id: 'c',
      startSeconds: 0,
      endSeconds: 2,
      text: 'Hà Nội Nam',
      locked: false,
      words: [
        { text: 'Hà', startSeconds: 0.1, endSeconds: 0.4 },
        { text: 'Nội', startSeconds: 0.4, endSeconds: 1.2 },
        { text: 'Nam', startSeconds: 1.2, endSeconds: 1.4 },
      ],
    },
  ];
  trimProjectMedia(p);
  expect(p.captions.cues[0]!.text).toBe('Hà Nội');
  expect(p.captions.cues[0]!.words!.at(-1)!.endSeconds).toBe(1);
  expect(() => projectSchema.parse(p)).not.toThrow();
});
