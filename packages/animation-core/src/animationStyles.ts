import type {
  Easing,
  Layer,
  ScalarKeyframe,
  ScalarProperty,
} from '@animatemap/project-schema';
import { clamp } from './numeric';

export type AnimationStyleKind =
  | 'fadeIn'
  | 'fadeOut'
  | 'fadeInOut'
  | 'pop'
  | 'slideUp'
  | 'draw';
export function animationStylesFor(layer: Layer): AnimationStyleKind[] {
  return [
    'fadeIn',
    'fadeOut',
    'fadeInOut',
    ...(layer.type === 'route' || layer.type === 'shape'
      ? ['draw' as const]
      : []),
    ...(layer.type === 'marker' || layer.type === 'text'
      ? ['pop' as const, 'slideUp' as const]
      : []),
  ];
}

/** Absolute scene-local keys; only returned properties are replaced by the editor. */
export function createAnimationStyle(
  layer: Layer,
  kind: AnimationStyleKind,
  duration: number,
): Partial<Record<ScalarProperty, ScalarKeyframe[]>> {
  if (!animationStylesFor(layer).includes(kind))
    throw new Error('This animation style does not support the selected layer');
  const { start, end } = layer.timeRange;
  if (!Number.isFinite(duration) || duration <= 0 || duration > end - start)
    throw new Error('Animation duration must fit within the layer time range');
  const key = (
    time: number,
    value: number,
    easing: Easing = 'linear',
  ): ScalarKeyframe => ({ time, value, easing });
  const fade = [key(start, 0, 'easeOut'), key(start + duration, 1)];
  switch (kind) {
    case 'fadeIn':
      return { opacity: fade };
    case 'fadeOut':
      return { opacity: [key(end - duration, 1, 'easeIn'), key(end, 0)] };
    case 'fadeInOut': {
      const d = Math.min(duration, (end - start) / 2);
      const keys = [
        key(start, 0, 'easeOut'),
        key(start + d, 1),
        key(end - d, 1, 'easeIn'),
        key(end, 0),
      ];
      return {
        opacity: keys.filter(
          (item, i) => i === 0 || item.time > keys[i - 1]!.time,
        ),
      };
    }
    case 'pop':
      return {
        opacity: fade,
        scale: [
          key(start, Math.max(0.01, layer.transform.scale * 0.1), 'easeOut'),
          key(
            start + duration * 0.7,
            Math.min(10, layer.transform.scale * 1.15),
            'easeInOut',
          ),
          key(start + duration, layer.transform.scale),
        ],
      };
    case 'slideUp':
      return {
        opacity: fade,
        offsetY: [
          key(
            start,
            clamp(layer.transform.offsetY + 64, -4000, 4000),
            'easeOut',
          ),
          key(start + duration, layer.transform.offsetY),
        ],
      };
    case 'draw':
      return { reveal: [key(start, 0, 'easeInOut'), key(start + duration, 1)] };
  }
}
