import { audioGainAt } from '@animatemap/animation-core';
export { audioGainAt } from '@animatemap/animation-core';
import {
  inspectEmbeddedWav,
  wavBytes,
  type Project,
  type AudioTrack,
  type AudioAsset,
} from '@animatemap/project-schema';

export function decodeAudioAsset(context: BaseAudioContext, asset: AudioAsset) {
  const info = inspectEmbeddedWav(asset.dataUrl),
    bytes = wavBytes(asset.dataUrl);
  const pcm = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const buffer = context.createBuffer(
    info.channels,
    info.frames,
    info.sampleRate,
  );
  for (let channel = 0; channel < info.channels; channel++) {
    const values = buffer.getChannelData(channel);
    for (let frame = 0; frame < info.frames; frame++)
      values[frame] =
        pcm.getInt16(44 + (frame * info.channels + channel) * 2, true) / 32768;
  }
  return buffer;
}
export function audioMaster(context: BaseAudioContext, destination: AudioNode) {
  const master = context.createWaveShaper();
  master.curve = new Float32Array([-1, 1]);
  master.connect(destination);
  return master;
}
export function scheduleAudioTrack(
  context: BaseAudioContext,
  destination: AudioNode,
  buffer: AudioBuffer,
  track: AudioTrack,
  time: number,
  now = context.currentTime,
) {
  if (track.muted || time >= track.startSeconds + track.durationSeconds)
    return null;
  const local = Math.max(0, time - track.startSeconds),
    start = Math.max(time, track.startSeconds);
  const when = now + Math.max(0, track.startSeconds - time),
    end = track.startSeconds + track.durationSeconds;
  const source = context.createBufferSource(),
    gain = context.createGain();
  source.buffer = buffer;
  gain.gain.setValueAtTime(audioGainAt(track, start), when);
  const fadeInEnd = track.startSeconds + track.fadeInSeconds,
    fadeOutStart = end - track.fadeOutSeconds;
  if (track.fadeInSeconds && fadeInEnd > start)
    gain.gain.linearRampToValueAtTime(track.gain, now + fadeInEnd - time);
  if (fadeOutStart > start)
    gain.gain.setValueAtTime(track.gain, now + fadeOutStart - time);
  if (track.fadeOutSeconds)
    gain.gain.linearRampToValueAtTime(0, now + end - time);
  source.connect(gain);
  gain.connect(destination);
  source.start(
    when,
    track.sourceStartSeconds + local,
    track.durationSeconds - local,
  );
  return { source, gain };
}

export class AudioPlayback {
  private context?: AudioContext;
  private master?: WaveShaperNode;
  private generation = 0;
  private sources = new Set<AudioBufferSourceNode>();
  private buffers = new Map<string, { url: string; buffer: AudioBuffer }>();
  private disposed = false;
  readonly scheduled = new Set<string>();
  get state() {
    return this.context?.state ?? 'idle';
  }
  get decodedAssets() {
    return [...this.buffers.keys()];
  }
  syncProject(project: Project) {
    const referenced = new Set(
      project.audioTracks
        .filter((track) => !track.muted)
        .map((track) => track.assetId),
    );
    for (const [id, cached] of this.buffers)
      if (
        !referenced.has(id) ||
        project.audioAssets.find((asset) => asset.id === id)?.dataUrl !==
          cached.url
      )
        this.buffers.delete(id);
  }
  stop() {
    this.generation++;
    for (const source of this.sources) {
      try {
        source.stop();
      } catch {
        /* Already ended. */
      }
      source.disconnect();
    }
    this.sources.clear();
    this.scheduled.clear();
  }
  async start(project: Project, readTime: () => number) {
    this.stop();
    if (this.disposed) throw new Error('Audio playback disposed');
    const generation = this.generation;
    this.syncProject(project);
    const active = new Set(
      project.audioTracks
        .filter((track) => !track.muted)
        .map((track) => track.assetId),
    );
    for (const id of this.buffers.keys())
      if (!active.has(id)) this.buffers.delete(id);
    if (!active.size) return;
    if (!this.context) {
      this.context = new AudioContext({ sampleRate: 48000 });
      this.master = audioMaster(this.context, this.context.destination);
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        this.context.resume(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () =>
              reject(
                new Error(
                  'Audio playback unavailable. Press Play to allow audio.',
                ),
              ),
            3000,
          );
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
    if (generation !== this.generation || this.disposed) return;
    for (const asset of project.audioAssets.filter((asset) =>
      active.has(asset.id),
    )) {
      if (this.buffers.get(asset.id)?.url === asset.dataUrl) continue;
      const buffer = decodeAudioAsset(this.context, asset);
      this.buffers.set(asset.id, { url: asset.dataUrl, buffer });
    }
    const time = readTime(),
      now = this.context.currentTime;
    for (const track of project.audioTracks) {
      if (track.muted || time >= track.startSeconds + track.durationSeconds)
        continue;
      const nodes = scheduleAudioTrack(
        this.context,
        this.master!,
        this.buffers.get(track.assetId)!.buffer,
        track,
        time,
        now,
      );
      if (!nodes) continue;
      const { source, gain } = nodes;
      this.sources.add(source);
      this.scheduled.add(track.id);
      source.onended = () => {
        this.sources.delete(source);
        if (generation === this.generation) this.scheduled.delete(track.id);
        source.disconnect();
        gain.disconnect();
      };
    }
  }
  dispose() {
    this.disposed = true;
    this.stop();
    this.buffers.clear();
    void this.context?.close();
  }
}
