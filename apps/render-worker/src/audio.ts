import { writeFile, rename, rm } from 'node:fs/promises';
import { join } from 'node:path';
import {
  wavBytes,
  inspectEmbeddedWav,
  type Project,
  type ExportFormat,
} from '@animatemap/project-schema';

const number = (value: number) => value.toFixed(9);
export function audioMixArguments(
  project: Project,
  paths: Map<string, string>,
  output: string,
) {
  const tracks = project.audioTracks.filter(
    (track) => !track.muted && track.gain > 0,
  );
  if (!tracks.length) return null;
  const args = ['-y'],
    filters: string[] = [];
  tracks.forEach((track, index) => {
    const path = paths.get(track.assetId);
    if (!path) throw new Error('Missing local audio input');
    args.push('-i', path);
    const parts = [
      `[${index}:a:0]atrim=start=${number(track.sourceStartSeconds)}:duration=${number(track.durationSeconds)}`,
      'asetpts=PTS-STARTPTS',
      'aresample=48000',
      ...(inspectEmbeddedWav(
        project.audioAssets.find((asset) => asset.id === track.assetId)!
          .dataUrl,
      ).channels === 1
        ? ['pan=stereo|c0=c0|c1=c0']
        : []),
      'aformat=sample_fmts=fltp:channel_layouts=stereo',
      `volume=${number(track.gain)}`,
    ];
    if (track.fadeInSeconds)
      parts.push(`afade=t=in:st=0:d=${number(track.fadeInSeconds)}:curve=tri`);
    if (track.fadeOutSeconds)
      parts.push(
        `afade=t=out:st=${number(track.durationSeconds - track.fadeOutSeconds)}:d=${number(track.fadeOutSeconds)}:curve=tri`,
      );
    parts.push(
      `adelay=${Math.round(track.startSeconds * 48000)}S:all=1[a${index}]`,
    );
    filters.push(parts.join(','));
  });
  const duration =
    Math.ceil(project.durationSeconds * project.canvas.fps) /
    project.canvas.fps;
  filters.push(
    `${tracks.map((_, index) => `[a${index}]`).join('')}amix=inputs=${tracks.length}:normalize=0:dropout_transition=0,aeval='clip(val(0),-1,1)|clip(val(1),-1,1)',apad=whole_dur=${number(duration)},atrim=duration=${number(duration)}[mix]`,
  );
  return [
    ...args,
    '-filter_complex',
    filters.join(';'),
    '-map',
    '[mix]',
    '-c:a',
    'pcm_s16le',
    '-ar',
    '48000',
    '-ac',
    '2',
    output,
  ];
}
export async function muxProjectAudio(
  project: Project,
  format: ExportFormat,
  directory: string,
  output: string,
  signal: AbortSignal,
  run: (args: string[], signal: AbortSignal) => Promise<void>,
) {
  if (format !== 'mp4' && format !== 'webm') return;
  const used = new Set(
    project.audioTracks
      .filter((track) => !track.muted && track.gain > 0)
      .map((track) => track.assetId),
  );
  if (!used.size) return;
  const paths = new Map<string, string>();
  for (const asset of project.audioAssets.filter((asset) =>
    used.has(asset.id),
  )) {
    signal.throwIfAborted();
    const path = join(directory, `audio-${paths.size}.wav`);
    await writeFile(path, wavBytes(asset.dataUrl));
    paths.set(asset.id, path);
  }
  const mix = join(directory, 'mixed.wav');
  await run(audioMixArguments(project, paths, mix)!, signal);
  signal.throwIfAborted();
  const muxed = join(directory, `with-audio.${format}`),
    duration =
      Math.ceil(project.durationSeconds * project.canvas.fps) /
      project.canvas.fps;
  await run(
    [
      '-y',
      '-i',
      output,
      '-i',
      mix,
      '-map',
      '0:v:0',
      '-map',
      '1:a:0',
      '-c:v',
      'copy',
      '-c:a',
      format === 'mp4' ? 'aac' : 'libopus',
      '-b:a',
      '192k',
      '-t',
      number(duration),
      ...(format === 'mp4' ? ['-movflags', '+faststart'] : []),
      muxed,
    ],
    signal,
  );
  signal.throwIfAborted();
  await rm(output, { force: true });
  await rename(muxed, output);
}
