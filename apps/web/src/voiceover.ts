import { MAX_AUDIO_BYTES, pcmWav } from '@animatemap/project-schema';

/** Only browser-created recordings enter this decoder; arbitrary imports use bounded PCM parsing. */
export async function recordingWav(blob: Blob) {
  if (!blob.size || blob.size > MAX_AUDIO_BYTES)
    throw new Error('Recording is empty or exceeds 16 MiB');
  const context = new AudioContext({ sampleRate: 48000 });
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const decoded = await Promise.race([
      context.decodeAudioData(await blob.arrayBuffer()),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error('Recording decoding timed out')),
          15000,
        );
      }),
    ]);
    if (
      decoded.duration > 61 ||
      decoded.numberOfChannels > 2 ||
      decoded.length * decoded.numberOfChannels * 2 + 44 > MAX_AUDIO_BYTES
    )
      throw new Error('Recording exceeds bounded PCM duration/size');
    const pcm = new Uint8Array(decoded.length * decoded.numberOfChannels * 2),
      view = new DataView(pcm.buffer);
    const channels = Array.from(
      { length: decoded.numberOfChannels },
      (_, index) => decoded.getChannelData(index),
    );
    for (let frame = 0; frame < decoded.length; frame++)
      for (let channel = 0; channel < channels.length; channel++) {
        const value = Math.max(-1, Math.min(1, channels[channel]![frame]!));
        view.setInt16(
          (frame * channels.length + channel) * 2,
          Math.round(value * (value < 0 ? 32768 : 32767)),
          true,
        );
      }
    return pcmWav(pcm, decoded.sampleRate, channels.length);
  } finally {
    clearTimeout(timer);
    await context.close();
  }
}
