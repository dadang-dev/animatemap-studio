import { createDemo, pcmWav, wavDataUrl, type AudioTrack } from './index';

/** Authored synthetic signal, CC0. Not music, speech or a simulated voiceover. */
export function toneWav(duration = 4, channels = 1) {
  const rate = 48000,
    frames = Math.round(rate * duration),
    pcm = new Uint8Array(frames * channels * 2),
    view = new DataView(pcm.buffer);
  for (let frame = 0; frame < frames; frame++)
    for (let channel = 0; channel < channels; channel++) {
      const frequency = frame / rate < 0.5 ? 400 : 800;
      view.setInt16(
        (frame * channels + channel) * 2,
        Math.round(16384 * Math.sin((2 * Math.PI * frequency * frame) / rate)),
        true,
      );
    }
  return pcmWav(pcm, rate, channels);
}
export const audioFixtureProvenance = {
  source: 'Authored test tone',
  author: 'AnimateMap Studio',
  license: 'CC0-1.0',
  credit: 'Test audio · Synthetic CC0 tone',
};
export function audioFixtureProject() {
  const project = createDemo();
  project.id = 'audio-fixture';
  project.durationSeconds = 2;
  const scene = project.scenes[0]!;
  scene.durationSeconds = 2;
  scene.camera.keyframes = scene.camera.keyframes.filter(
    (key) => key.time <= 2,
  );
  for (const layer of scene.layers) {
    layer.timeRange.end = 2;
    for (const key of Object.keys(
      layer.tracks,
    ) as (keyof typeof layer.tracks)[])
      layer.tracks[key] = layer.tracks[key].filter((entry) => entry.time <= 2);
  }
  project.audioAssets.push({
    id: 'tone',
    name: 'Synthetic tone',
    dataUrl: wavDataUrl(toneWav()),
    provenance: audioFixtureProvenance,
  });
  const base: AudioTrack = {
    id: 'audio-1',
    assetId: 'tone',
    name: 'Offset tone',
    startSeconds: 0.25,
    sourceStartSeconds: 0.5,
    durationSeconds: 1.5,
    gain: 0.5,
    fadeInSeconds: 0.25,
    fadeOutSeconds: 0.25,
    muted: false,
    locked: false,
  };
  project.audioTracks.push(base, {
    ...base,
    id: 'audio-2',
    name: 'Overlap tone',
    startSeconds: 1,
    sourceStartSeconds: 0.25,
    durationSeconds: 0.5,
    gain: 0.3,
    fadeInSeconds: 0,
    fadeOutSeconds: 0,
  });
  project.captions.cues.push(
    {
      id: 'cue-1',
      startSeconds: 0.25,
      endSeconds: 1.25,
      text: 'Hà Nội → Đà Nẵng\nA journey south',
      locked: false,
    },
    {
      id: 'cue-2',
      startSeconds: 1.25,
      endSeconds: 2,
      text: 'TP. Hồ Chí Minh',
      locked: false,
    },
  );
  return project;
}
