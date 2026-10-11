import {
  inspectWav,
  inspectEmbeddedWav,
  pcmWav,
  wavDataUrl,
  type AudioAsset,
  type Project,
} from '@animatemap/project-schema';

export function importWav(
  bytes: Uint8Array,
  name: string,
  provenance: AudioAsset['provenance'],
  id: string = crypto.randomUUID(),
): AudioAsset {
  const info = inspectWav(bytes);
  return {
    id,
    name: name.slice(0, 200),
    provenance,
    dataUrl: wavDataUrl(
      pcmWav(
        bytes.subarray(info.dataOffset, info.dataOffset + info.dataBytes),
        info.sampleRate,
        info.channels,
      ),
    ),
  };
}
export function addAudioTrack(
  project: Project,
  assetId: string,
  startSeconds: number,
  id: string = crypto.randomUUID(),
) {
  const asset = project.audioAssets.find((asset) => asset.id === assetId);
  if (!asset) throw new Error('Audio asset not found');
  const durationSeconds = Math.min(
    inspectEmbeddedWav(asset.dataUrl).duration,
    project.durationSeconds - startSeconds,
  );
  if (durationSeconds < 0.01)
    throw new Error('Move the playhead before the project end');
  project.audioTracks.push({
    id,
    assetId,
    name: asset.name,
    startSeconds,
    sourceStartSeconds: 0,
    durationSeconds,
    gain: 1,
    fadeInSeconds: 0,
    fadeOutSeconds: 0,
    muted: false,
    locked: false,
  });
  return id;
}
export function trimProjectMedia(project: Project) {
  project.audioTracks = project.audioTracks.filter(
    (track) => track.startSeconds + 0.01 <= project.durationSeconds,
  );
  for (const track of project.audioTracks) {
    track.durationSeconds = Math.min(
      track.durationSeconds,
      project.durationSeconds - track.startSeconds,
    );
    const sum = track.fadeInSeconds + track.fadeOutSeconds;
    if (sum > track.durationSeconds) {
      track.fadeInSeconds *= track.durationSeconds / sum;
      track.fadeOutSeconds *= track.durationSeconds / sum;
    }
  }
  project.captions.cues = project.captions.cues.filter(
    (cue) => cue.startSeconds < project.durationSeconds,
  );
  for (const cue of project.captions.cues)
    cue.endSeconds = Math.min(cue.endSeconds, project.durationSeconds);
}
export function parseCaptions(
  text: string,
  duration: number,
  id: () => string = () => crypto.randomUUID(),
) {
  if (text.length > 1024 * 1024) throw new Error('Caption file exceeds 1 MiB');
  const blocks = text
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .trim()
    .split(/\n[ \t]*\n/);
  const cues: Project['captions']['cues'] = [];
  const timestamp = (value: string) => {
    const match = /^(?:(\d{2,}):)?([0-5]\d):([0-5]\d)[.,](\d{3})$/.exec(value);
    if (!match) throw new Error(`Invalid caption timestamp ${value}`);
    return (
      Number(match[1] ?? 0) * 3600 +
      Number(match[2]) * 60 +
      Number(match[3]) +
      Number(match[4]) / 1000
    );
  };
  for (const block of blocks) {
    if (block === 'WEBVTT' || block.startsWith('NOTE\n')) continue;
    const lines = block.split('\n'),
      timing = lines[0]!.includes('-->') ? 0 : 1;
    const match = /^([^ ]+) --> ([^ ]+)$/.exec(lines[timing] ?? '');
    if (!match)
      throw new Error(
        'Caption cues need plain SRT/VTT timing; styling/settings are unsupported',
      );
    const startSeconds = timestamp(match[1]!),
      endSeconds = timestamp(match[2]!);
    const caption = lines
      .slice(timing + 1)
      .join('\n')
      .trim();
    if (
      !caption ||
      caption.length > 1000 ||
      startSeconds >= endSeconds ||
      endSeconds > duration ||
      /<[^>]*>/.test(caption)
    )
      throw new Error(
        'Caption text/bounds invalid; use plain text within the project',
      );
    cues.push({
      id: id(),
      startSeconds,
      endSeconds,
      text: caption,
      locked: false,
    });
    if (cues.length > 500) throw new Error('Maximum 500 caption cues');
  }
  if (!cues.length) throw new Error('No caption cues found');
  return cues.sort((a, b) => a.startSeconds - b.startSeconds);
}
