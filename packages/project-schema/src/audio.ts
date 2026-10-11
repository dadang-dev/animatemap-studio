import { z } from 'zod';
import { assetProvenanceSchema } from './assets';

export const MAX_AUDIO_BYTES = 16 * 1024 * 1024;
export const MAX_AUDIO_TOTAL_BYTES = 32 * 1024 * 1024;
export const MAX_PROJECT_BODY_BYTES = 48 * 1024 * 1024;
const identifier = z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
const seconds = z.number().finite().min(0).max(300);
export type WavInfo = {
  sampleRate: number;
  channels: number;
  frames: number;
  duration: number;
  dataOffset: number;
  dataBytes: number;
  bytes: number;
};

/** PCM only: no codec expansion, extensible format, external reference or executable chunk. */
export function inspectWav(bytes: Uint8Array, canonical = false): WavInfo {
  if (bytes.length < 44 || bytes.length > MAX_AUDIO_BYTES)
    throw new Error('WAV must contain 44 bytes–16 MiB');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = (offset: number) =>
    String.fromCharCode(...bytes.subarray(offset, offset + 4));
  if (
    tag(0) !== 'RIFF' ||
    tag(8) !== 'WAVE' ||
    view.getUint32(4, true) !== bytes.length - 8
  )
    throw new Error('Invalid or truncated RIFF WAV');
  let channels = 0,
    sampleRate = 0,
    block = 0,
    dataOffset = 0,
    dataBytes = 0;
  let offset = 12,
    chunks = 0;
  while (offset < bytes.length) {
    if (++chunks > 200 || offset + 8 > bytes.length)
      throw new Error('Invalid WAV chunk bounds');
    const size = view.getUint32(offset + 4, true),
      end = offset + 8 + size;
    if (end > bytes.length) throw new Error('Truncated WAV chunk');
    const kind = tag(offset);
    if (kind === 'fmt ') {
      if (
        channels ||
        (size !== 16 && size !== 18) ||
        view.getUint16(offset + 8, true) !== 1
      )
        throw new Error('Only PCM 16-bit WAV is supported');
      channels = view.getUint16(offset + 10, true);
      sampleRate = view.getUint32(offset + 12, true);
      block = view.getUint16(offset + 20, true);
      if (
        (channels !== 1 && channels !== 2) ||
        sampleRate < 8000 ||
        sampleRate > 96000 ||
        block !== channels * 2 ||
        view.getUint16(offset + 22, true) !== 16 ||
        view.getUint32(offset + 16, true) !== sampleRate * block ||
        (size === 18 && view.getUint16(offset + 24, true) !== 0)
      )
        throw new Error('Invalid PCM WAV channels/rate/alignment');
    } else if (kind === 'data') {
      if (dataOffset) throw new Error('Multiple WAV data chunks');
      dataOffset = offset + 8;
      dataBytes = size;
    }
    offset = end + (size % 2);
  }
  if (
    offset !== bytes.length ||
    !channels ||
    !dataOffset ||
    !dataBytes ||
    dataBytes % block
  )
    throw new Error('Missing or unaligned PCM WAV data');
  const frames = dataBytes / block,
    duration = frames / sampleRate;
  if (duration < 0.01 || duration > 300)
    throw new Error('Audio duration must be 0.01–300 seconds');
  if (
    canonical &&
    (chunks !== 2 ||
      tag(12) !== 'fmt ' ||
      view.getUint32(16, true) !== 16 ||
      dataOffset !== 44)
  )
    throw new Error('Project audio requires canonical PCM WAV');
  return {
    sampleRate,
    channels,
    frames,
    duration,
    dataOffset,
    dataBytes,
    bytes: bytes.length,
  };
}
export function pcmWav(pcm: Uint8Array, sampleRate: number, channels: number) {
  if (pcm.length + 44 > MAX_AUDIO_BYTES)
    throw new Error('Audio exceeds 16 MiB');
  const bytes = new Uint8Array(pcm.length + 44),
    view = new DataView(bytes.buffer);
  const tag = (offset: number, text: string) =>
    bytes.set(new TextEncoder().encode(text), offset);
  tag(0, 'RIFF');
  view.setUint32(4, bytes.length - 8, true);
  tag(8, 'WAVE');
  tag(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  tag(36, 'data');
  view.setUint32(40, pcm.length, true);
  bytes.set(pcm, 44);
  inspectWav(bytes, true);
  return bytes;
}
export function wavDataUrl(bytes: Uint8Array) {
  let text = '';
  for (let offset = 0; offset < bytes.length; offset += 8192)
    text += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  return `data:audio/wav;base64,${btoa(text)}`;
}
export function wavBytes(dataUrl: string) {
  const prefix = 'data:audio/wav;base64,';
  if (
    !dataUrl.startsWith(prefix) ||
    dataUrl.length > prefix.length + 4 * Math.ceil(MAX_AUDIO_BYTES / 3)
  )
    throw new Error('Audio must be embedded bounded PCM WAV');
  const encoded = dataUrl.slice(prefix.length);
  if (encoded.length % 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded))
    throw new Error('Invalid audio base64');
  const binary = atob(encoded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
const cache = new Map<string, WavInfo>();
let cacheCharacters = 0;
export function inspectEmbeddedWav(dataUrl: string): WavInfo {
  const cached = cache.get(dataUrl);
  if (cached) return { ...cached };
  const info = inspectWav(wavBytes(dataUrl), true);
  while (
    cache.size &&
    (cache.size >= 8 || cacheCharacters + dataUrl.length > 48 * 1024 * 1024)
  ) {
    const oldest = cache.keys().next().value!;
    cacheCharacters -= oldest.length;
    cache.delete(oldest);
  }
  cache.set(dataUrl, info);
  cacheCharacters += dataUrl.length;
  return { ...info };
}
export const audioAssetSchema = z.object({
  id: identifier,
  name: z.string().trim().min(1).max(200),
  dataUrl: z.string().superRefine((url, ctx) => {
    try {
      inspectEmbeddedWav(url);
    } catch (error) {
      ctx.addIssue({
        code: 'custom',
        message: error instanceof Error ? error.message : 'Invalid audio',
      });
    }
  }),
  provenance: assetProvenanceSchema,
});
export const audioTrackSchema = z.object({
  id: identifier,
  name: z.string().trim().min(1).max(200),
  assetId: identifier,
  startSeconds: seconds,
  sourceStartSeconds: seconds,
  durationSeconds: seconds.min(0.01),
  gain: z.number().finite().min(0).max(2).default(1),
  fadeInSeconds: seconds.default(0),
  fadeOutSeconds: seconds.default(0),
  muted: z.boolean().default(false),
  locked: z.boolean().default(false),
});
export const captionCueSchema = z.object({
  id: identifier,
  startSeconds: seconds,
  endSeconds: seconds,
  text: z.string().trim().min(1).max(1000),
  locked: z.boolean().default(false),
});
export const captionsSchema = z
  .object({
    enabled: z.boolean().default(true),
    cues: z.array(captionCueSchema).max(500).default([]),
    style: z
      .object({
        fontSize: z.number().finite().min(12).max(120).default(44),
        color: z
          .string()
          .regex(/^#[0-9a-fA-F]{6}$/)
          .default('#ffffff'),
        background: z
          .string()
          .regex(/^#[0-9a-fA-F]{6}$/)
          .default('#111820'),
        x: z.number().finite().min(0).max(1).default(0.5),
        y: z.number().finite().min(0).max(1).default(0.86),
        width: z.number().finite().min(0.1).max(1).default(0.85),
      })
      .prefault({}),
  })
  .prefault({});
export type AudioAsset = z.infer<typeof audioAssetSchema>;
export type AudioTrack = z.infer<typeof audioTrackSchema>;
export type CaptionCue = z.infer<typeof captionCueSchema>;
