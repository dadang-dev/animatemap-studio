import type { AudioTrack, Project } from '@animatemap/project-schema';

export function audioGainAt(track: AudioTrack, time: number) {
  const local = time - track.startSeconds;
  if (track.muted || local < 0 || local >= track.durationSeconds) return 0;
  return (
    track.gain *
    Math.min(
      1,
      track.fadeInSeconds ? local / track.fadeInSeconds : 1,
      track.fadeOutSeconds
        ? (track.durationSeconds - local) / track.fadeOutSeconds
        : 1,
    )
  );
}
export function evaluateMediaAt(project: Project, time: number) {
  return {
    audio: project.audioTracks.map((track) => ({
      id: track.id,
      assetId: track.assetId,
      active:
        !track.muted &&
        time >= track.startSeconds &&
        time < track.startSeconds + track.durationSeconds,
      sourceSeconds:
        track.sourceStartSeconds +
        Math.max(0, Math.min(track.durationSeconds, time - track.startSeconds)),
      gain: audioGainAt(track, time),
    })),
    captions: project.captions.enabled
      ? project.captions.cues
          .filter((cue) => time >= cue.startSeconds && time < cue.endSeconds)
          .map((cue) => ({
            ...cue,
            ...(project.captions.style.wordHighlight && cue.words
              ? {
                  activeWordIndex: cue.words.findIndex(
                    (word) =>
                      time >= word.startSeconds && time < word.endSeconds,
                  ),
                }
              : {}),
          }))
      : [],
  };
}
