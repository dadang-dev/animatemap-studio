import { expect, test } from 'vitest';
import {
  createDemo,
  inspectWav,
  inspectEmbeddedWav,
  migrateProject,
  projectSchema,
  wavBytes,
  wavDataUrl,
} from './index';
import { audioFixtureProject, toneWav } from './audio.fixture';

test('PCM WAV verifies RIFF chunks, channels, rate, alignment, duration and canonical embedding', () => {
  const bytes = toneWav(0.1, 2);
  expect(inspectWav(bytes, true)).toMatchObject({
    sampleRate: 48000,
    channels: 2,
    frames: 4800,
    duration: 0.1,
    dataOffset: 44,
  });
  expect(wavBytes(wavDataUrl(bytes))).toEqual(bytes);
  expect(inspectEmbeddedWav(wavDataUrl(bytes)).channels).toBe(2);
  for (const [offset, value] of [
    [4, 1],
    [20, 3],
    [22, 7],
    [28, 1],
    [34, 24],
    [40, bytes.length],
  ] as const) {
    const corrupt = bytes.slice();
    new DataView(corrupt.buffer).setUint32(offset, value, true);
    expect(() => inspectWav(corrupt)).toThrow();
  }
  expect(() => inspectEmbeddedWav('https://audio.example/track.wav')).toThrow(
    'embedded',
  );
  expect(() => inspectEmbeddedWav('data:audio/wav;base64,@@@@')).toThrow(
    'base64',
  );
  expect(() => inspectWav(bytes.subarray(0, bytes.length - 1))).toThrow('RIFF');
  const info = inspectEmbeddedWav(wavDataUrl(bytes));
  info.channels = 100;
  expect(inspectEmbeddedWav(wavDataUrl(bytes)).channels).toBe(2);
});
test('audio/caption snapshots reject invalid references, source/project bounds, fades, IDs and cue ordering', () => {
  const project = audioFixtureProject();
  expect(projectSchema.parse(project)).toEqual(project);
  const edits: ((copy: typeof project) => void)[] = [
    (p) => {
      p.audioTracks[0]!.assetId = 'missing';
    },
    (p) => {
      p.audioTracks[0]!.sourceStartSeconds = 3;
    },
    (p) => {
      p.audioTracks[0]!.startSeconds = 1;
    },
    (p) => {
      p.audioTracks[0]!.fadeOutSeconds = 2;
    },
    (p) => {
      p.audioTracks[0]!.gain = NaN;
    },
    (p) => {
      p.audioTracks.push(structuredClone(p.audioTracks[0]!));
    },
    (p) => {
      p.audioAssets.push(structuredClone(p.audioAssets[0]!));
    },
    (p) => {
      p.captions.cues[0]!.endSeconds = 3;
    },
    (p) => {
      p.captions.cues.reverse();
    },
    (p) => {
      p.captions.cues.push(structuredClone(p.captions.cues[0]!));
    },
  ];
  for (const change of edits) {
    const copy = structuredClone(project);
    change(copy);
    expect(projectSchema.safeParse(copy).success).toBe(false);
  }
});
test('actual v9 projects migrate without changing visual evaluation inputs', () => {
  const project = createDemo();
  const legacy: Record<string, unknown> = { ...project };
  delete legacy.audioAssets;
  delete legacy.audioTracks;
  delete legacy.captions;
  const migrated = migrateProject({ ...legacy, schemaVersion: 9 });
  expect(migrated.scenes).toEqual(project.scenes);
  expect(migrated.audioAssets).toEqual([]);
  expect(migrated.audioTracks).toEqual([]);
  expect(migrated.captions.cues).toEqual([]);
  expect(() => migrateProject({ ...project, schemaVersion: 11 })).toThrow();
});
test('combined embedded/Unicode project JSON stays within the API request budget', () => {
  const project = createDemo(),
    template = project.scenes[0]!.layers.find(
      (layer) => layer.type === 'text',
    )!;
  project.durationSeconds = 80;
  project.scenes = Array.from({ length: 20 }, (_, scene) => ({
    ...project.scenes[0]!,
    id: `scene-${scene}`,
    startSeconds: scene * 4,
    durationSeconds: 4,
    transition: { type: 'cut' as const },
    camera: { keyframes: [project.scenes[0]!.camera.keyframes[0]!] },
    layers: Array.from({ length: 100 }, (_, layer) => ({
      ...template,
      id: `text-${scene}-${layer}`,
      type: 'text' as const,
      text: '界'.repeat(10000),
      timeRange: { start: 0, end: 4 },
    })),
  }));
  expect(
    projectSchema
      .safeParse(project)
      .error?.issues.some((issue) => issue.message.includes('request budget')),
  ).toBe(true);
});
