import { useEffect, useRef } from 'react';
import { useEditor } from './store';
import { AudioPlayback } from './AudioPlayback';

export function usePlayback() {
  const audio = useRef<AudioPlayback | null>(null);
  const playing = useEditor((state) => state.playing),
    project = useEditor((state) => state.project);
  useEffect(() => {
    audio.current = new AudioPlayback();
    return () => {
      audio.current?.dispose();
      audio.current = null;
    };
  }, []);
  useEffect(() => {
    const player = audio.current!;
    player.syncProject(project);
    if (!playing) {
      player.stop();
      return;
    }
    let initial = useEditor.getState().time,
      start = performance.now(),
      last = initial,
      frame = 0;
    let active = true;
    const restartAudio = () => {
      void player
        .start(project, () => useEditor.getState().time)
        .catch((error: unknown) => {
          if (!active) return;
          useEditor.setState({
            playing: false,
            error:
              error instanceof Error ? error.message : 'Audio playback failed',
          });
        });
    };
    restartAudio();
    const tick = () => {
      const current = useEditor.getState().time;
      if (Math.abs(current - last) > 1e-7) {
        initial = current;
        start = performance.now();
        restartAudio();
      }
      const next = Math.min(
        project.durationSeconds,
        initial + (performance.now() - start) / 1000,
      );
      last = next;
      useEditor.getState().seek(next);
      if (next === project.durationSeconds)
        useEditor.setState({ playing: false });
      else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      active = false;
      cancelAnimationFrame(frame);
      player.stop();
    };
  }, [playing, project]);
  return audio;
}
