import { useState } from 'react';
import {
  animationStylesFor,
  createAnimationStyle,
  type AnimationStyleKind,
} from '@animatemap/animation-core';
import type { Layer } from '@animatemap/project-schema';
import { useEditor } from './store';
const names: Record<AnimationStyleKind, string> = {
  fadeIn: 'Fade in',
  fadeOut: 'Fade out',
  fadeInOut: 'Fade in and out',
  pop: 'Pop',
  slideUp: 'Slide up',
  draw: 'Draw path',
};
export function AnimationStyles({ layer }: { layer: Layer }) {
  const [kind, setKind] = useState<AnimationStyleKind>('fadeIn');
  const [duration, setDuration] = useState(0.8);
  const kinds = animationStylesFor(layer);
  const selected = kinds.includes(kind) ? kind : 'fadeIn';
  const maximum = layer.timeRange.end - layer.timeRange.start;
  return (
    <div>
      <div className="panel-heading section-heading">ANIMATION STYLE</div>
      <label className="field">
        Style
        <select
          aria-label="Animation style"
          value={selected}
          onChange={(event) =>
            setKind(event.target.value as AnimationStyleKind)
          }
        >
          {kinds.map((value) => (
            <option key={value} value={value}>
              {names[value]}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Duration (seconds)
        <input
          aria-label="Animation duration"
          type="number"
          min={0.01}
          max={maximum}
          step={0.1}
          value={Math.min(duration, maximum)}
          onChange={(event) => setDuration(Number(event.target.value))}
        />
      </label>
      <button
        onClick={() =>
          useEditor.getState().patchLayer((target) => {
            Object.assign(
              target.tracks,
              createAnimationStyle(
                target,
                selected,
                Math.min(duration, maximum),
              ),
            );
          })
        }
      >
        Apply animation style
      </button>
      <p className="hint">
        Creates editable keys within this layer's time range. Replaces only the
        affected tracks; Undo restores previous keys.
      </p>
    </div>
  );
}
