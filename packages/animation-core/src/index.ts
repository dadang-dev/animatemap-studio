import { distance, bearing, destination } from '@turf/turf';
import type {
  Camera,
  Easing,
  Layer,
  Project,
  ScalarKeyframe,
} from '@animatemap/project-schema';
export const frameTime = (index: number, fps: number) => index / fps;
export const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));
export const wrap = (n: number) => ((((n + 180) % 360) + 360) % 360) - 180;
export const easings: Record<Easing, (t: number) => number> = {
  linear: (t) => t,
  easeIn: (t) => t * t,
  easeOut: (t) => 1 - (1 - t) ** 2,
  easeInOut: (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2),
};
function sample<T>(
  keys: { time: number; value: T; easing: Easing }[],
  t: number,
  fallback: T,
  interpolate: (a: T, b: T, t: number) => T,
): T {
  if (!keys.length) return fallback;
  if (t <= keys[0]!.time) return keys[0]!.value;
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1]!,
      b = keys[i]!;
    if (t <= b.time)
      return interpolate(
        a.value,
        b.value,
        easings[a.easing]((t - a.time) / (b.time - a.time)),
      );
  }
  return keys.at(-1)!.value;
}
export const scalarAt = (keys: ScalarKeyframe[], t: number, fallback: number) =>
  sample(keys, t, fallback, (a, b, f) => a + (b - a) * f);
export function interpolateCamera(a: Camera, b: Camera, t: number): Camera {
  const lerp = (x: number, y: number) => x + (y - x) * t;
  return {
    lng: wrap(a.lng + wrap(b.lng - a.lng) * t),
    lat: clamp(lerp(a.lat, b.lat), -85, 85),
    zoom: clamp(lerp(a.zoom, b.zoom), 0, 18),
    bearing: wrap(a.bearing + wrap(b.bearing - a.bearing) * t),
    pitch: clamp(lerp(a.pitch, b.pitch), 0, 60),
  };
}
export function unwrapCoordinates(
  points: [number, number][],
): [number, number][] {
  const result: [number, number][] = [];
  for (const [lng, lat] of points) {
    const previous = result.at(-1)?.[0] ?? lng;
    result.push([previous + wrap(lng - previous), lat]);
  }
  return result;
}
export function trimRoute(
  points: [number, number][],
  progress: number,
): [number, number][] {
  if (points.length < 2) throw new Error('Route requires two coordinates');
  const lengths = points
    .slice(1)
    .map((point, i) => distance(points[i]!, point));
  let remaining = lengths.reduce((a, b) => a + b, 0) * clamp(progress, 0, 1);
  const output: [number, number][] = [points[0]!];
  if (progress <= 0) return [points[0]!, points[0]!];
  for (let i = 0; i < lengths.length; i++) {
    const length = lengths[i]!;
    if (remaining >= length) {
      output.push(points[i + 1]!);
      remaining -= length;
    } else {
      const p = destination(
        points[i]!,
        remaining,
        bearing(points[i]!, points[i + 1]!),
      ).geometry.coordinates;
      output.push([p[0]!, p[1]!]);
      break;
    }
  }
  return unwrapCoordinates(
    output.length === 1 ? [output[0]!, output[0]!] : output,
  );
}
export type RenderState = {
  time: number;
  sceneId: string | null;
  camera: Camera;
  layers: Layer[];
};
export function evaluateProjectAt(
  project: Project,
  seconds: number,
): RenderState {
  if (!Number.isFinite(seconds)) throw new Error('Time must be finite');
  const time = clamp(seconds, 0, project.durationSeconds);
  const scene = project.scenes.find(
    (s) =>
      time >= s.startSeconds &&
      (time < s.startSeconds + s.durationSeconds ||
        (time === project.durationSeconds &&
          time === s.startSeconds + s.durationSeconds)),
  );
  const fallback = project.scenes[0]!.camera.keyframes[0]!.value;
  if (!scene)
    return { time, sceneId: null, camera: { ...fallback }, layers: [] };
  const local = time - scene.startSeconds;
  const camera = sample(
    scene.camera.keyframes,
    local,
    fallback,
    interpolateCamera,
  );
  const layers = scene.layers.map((layer): Layer => {
    const active =
      layer.visible &&
      local >= layer.timeRange.start &&
      (local < layer.timeRange.end ||
        (time === project.durationSeconds && local === layer.timeRange.end));
    const result = {
      ...layer,
      visible: active,
      opacity: layer.opacity * scalarAt(layer.tracks.opacity, local, 1),
    };
    if (result.type === 'route')
      result.coordinates = trimRoute(
        result.coordinates,
        scalarAt(layer.tracks.reveal, local, 1),
      );
    return result;
  });
  return { time, sceneId: scene.id, camera: { ...camera }, layers };
}
