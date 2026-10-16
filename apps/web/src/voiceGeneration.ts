import {
  inspectWav,
  pcmWav,
  wavBytes,
  wavDataUrl,
  projectSchema,
  type Project,
  type VoiceResult,
  type CaptionCue,
} from '@animatemap/project-schema';

/** Assemble real per-scene speech without moving cameras or fabricating word times. */
export function assembleSceneVoice(
  project: Project,
  clips: { sceneId: string; result: VoiceResult }[],
  replaceTrackId: string,
) {
  const copy = structuredClone(project),
    rate = 48000,
    pcm = new Uint8Array(Math.round(project.durationSeconds * rate) * 2),
    cues: CaptionCue[] = [];
  const old = copy.audioTracks.find((t) => t.id === replaceTrackId);
  if (old?.locked) throw Error('Unlock the voice track first');
  if (copy.captions.cues.some((c) => c.locked))
    throw Error('Unlock captions first');
  for (const { sceneId, result } of clips) {
    const scene = project.scenes.find((s) => s.id === sceneId);
    if (!scene) throw Error('Scene no longer exists');
    const bytes = wavBytes(result.dataUrl),
      info = inspectWav(bytes, true);
    if (info.channels !== 1 || info.sampleRate !== rate)
      throw Error('Voice output requires mono PCM at 48 kHz');
    if (!result.words.length) throw Error('Voice has no word timestamps');
    const first = result.words[0]!,
      last = result.words.at(-1)!,
      trim = Math.max(0, first.startSeconds - 0.025),
      end = Math.min(info.duration, last.endSeconds + 0.15),
      lead = scene.startSeconds === 0 ? 0.2 : 0.85;
    if (end - trim + lead + 0.1 > scene.durationSeconds)
      throw Error(
        `Voice is too long for scene “${scene.name}”. Increase the voice speed, shorten its captions or lengthen the scene.`,
      );
    const start = scene.startSeconds + lead,
      from = Math.floor(trim * rate) * 2,
      to = Math.ceil(end * rate) * 2;
    pcm.set(
      bytes.subarray(info.dataOffset + from, info.dataOffset + to),
      Math.round(start * rate) * 2,
    );
    let page: typeof result.words = [];
    const flush = () => {
      if (!page.length) return;
      cues.push({
        id: crypto.randomUUID(),
        startSeconds: start + page[0]!.startSeconds - trim,
        endSeconds: Math.min(
          start + end - trim,
          start + page.at(-1)!.endSeconds - trim + 0.04,
        ),
        text: page.map((w) => w.text).join(' '),
        locked: false,
        words: page.map((w) => ({
          text: w.text,
          startSeconds: start + w.startSeconds - trim,
          endSeconds: start + w.endSeconds - trim,
        })),
      });
      page = [];
    };
    for (const w of result.words) {
      page.push(w);
      if (page.length >= 6 || /[.!?;:]$/.test(w.text)) flush();
    }
    flush();
  }
  if (!clips.length) throw Error('No captioned scenes to generate');
  if (old) {
    copy.audioTracks = copy.audioTracks.filter((t) => t.id !== old.id);
    if (!copy.audioTracks.some((t) => t.assetId === old.assetId))
      copy.audioAssets = copy.audioAssets.filter((a) => a.id !== old.assetId);
  }
  const id = crypto.randomUUID();
  copy.audioAssets.push({
    id,
    name: clips[0]!.result.voiceName,
    dataUrl: wavDataUrl(pcmWav(pcm, rate, 1)),
    provenance: {
      source: 'https://api.ai33.pro/v3/text-to-speech',
      author: 'AI33 · ' + clips[0]!.result.voiceId,
      license: 'Generated via AI33; provider/account terms apply',
      credit: 'Voice · AI33',
    },
  });
  copy.audioTracks.push({
    id: crypto.randomUUID(),
    assetId: id,
    name: 'Vietnamese narration · ' + clips[0]!.result.voiceName,
    startSeconds: 0,
    sourceStartSeconds: 0,
    durationSeconds: project.durationSeconds,
    gain: 0.95,
    fadeInSeconds: 0.01,
    fadeOutSeconds: 0.03,
    muted: false,
    locked: false,
  });
  copy.captions.cues = cues.sort((a, b) => a.startSeconds - b.startSeconds);
  copy.captions.style.wordHighlight = true;
  return projectSchema.parse(copy);
}
