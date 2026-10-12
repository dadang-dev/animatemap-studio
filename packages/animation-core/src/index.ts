import { distance, bearing, destination } from '@turf/turf';
export {
  aeManifestBase,
  aeManifestSchema,
  afterEffectsJSX,
  MAX_AE_SAMPLES,
  type AEManifest,
  type AEFrame,
  type AEAnchorSample,
} from './afterEffects';
import { evaluateMediaAt } from './audio';
export { audioGainAt, evaluateMediaAt } from './audio';
import { evaluateChoropleth, type ChoroplethData } from './choropleth';
export {
  evaluateChoropleth,
  interpolateColor,
  type ChoroplethData,
} from './choropleth';
export {
  hiddenLabels,
  transformLabelBounds,
  type LabelCandidate,
  type LabelBounds,
} from './labelLayout';
export {
  animationStylesFor,
  createAnimationStyle,
  type AnimationStyleKind,
} from './animationStyles';
export {
  createCameraPreset,
  cameraPresetKinds,
  type CameraPresetKind,
} from './cameraPresets';
import type {
  Camera,
  Easing,
  Layer,
  Project,
  ScalarKeyframe,
} from '@animatemap/project-schema';
export const frameTime = (index: number, fps: number) => index / fps;
import { clamp, wrap } from './numeric';
import { unwrapCoordinates, bezierPath } from './geometry';
export { unwrapCoordinates, bezierPath } from './geometry';
export { clamp, wrap } from './numeric';
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
    const segment = Math.min(remaining, length),
      steps = Math.max(1, Math.ceil(segment / 50));
    for (let step = 1; step <= steps; step++) {
      const p =
        step === steps && segment === length
          ? points[i + 1]!
          : destination(
              points[i]!,
              (segment * step) / steps,
              bearing(points[i]!, points[i + 1]!),
            ).geometry.coordinates;
      output.push([p[0]!, p[1]!]);
    }
    remaining -= segment;
    if (segment < length || remaining <= 0) break;
  }
  return unwrapCoordinates(
    output.length === 1 ? [output[0]!, output[0]!] : output,
  );
}
export type RenderLayer = Layer & {
  renderCoordinates?: [number, number][];
  data?: ChoroplethData;
};
export type SceneRenderState = {
  sceneId: string;
  camera: Camera;
  layers: RenderLayer[];
};
export type SceneBlend = { incomingWeight: number; outgoing: SceneRenderState };
export type RenderState = {
  time: number;
  sceneId: string | null;
  camera: Camera;
  layers: RenderLayer[];
  blend?: SceneBlend;
} & ReturnType<typeof evaluateMediaAt>;
export function evaluateProjectAt(
  project: Project,
  seconds: number,
): RenderState {
  if (!Number.isFinite(seconds)) throw new Error('Time must be finite');
  const time = clamp(seconds, 0, project.durationSeconds);
  const media = evaluateMediaAt(project, time);
  const scene = project.scenes.find(
    (s) =>
      time >= s.startSeconds &&
      (time < s.startSeconds + s.durationSeconds ||
        (time === project.durationSeconds &&
          time === s.startSeconds + s.durationSeconds)),
  );
  const fallback = project.scenes[0]!.camera.keyframes[0]!.value;
  if (!scene)
    return {
      time,
      ...media,
      sceneId: null,
      camera: { ...fallback },
      layers: [],
    };
  const state = evaluateSceneAt(project, scene, time);
  const local = time - scene.startSeconds;
  const previous = project.scenes[project.scenes.indexOf(scene) - 1];
  if (
    previous &&
    scene.transition.type === 'crossfade' &&
    local < scene.transition.durationSeconds
  ) {
    const finalVisibleTime =
      previous.startSeconds +
      Math.max(0, previous.durationSeconds - 1 / project.canvas.fps);
    return {
      time,
      ...media,
      ...state,
      blend: {
        incomingWeight: clamp(local / scene.transition.durationSeconds, 0, 1),
        outgoing: evaluateSceneAt(project, previous, finalVisibleTime),
      },
    };
  }
  return { time, ...media, ...state };
}
function evaluateSceneAt(
  project: Project,
  scene: Project['scenes'][number],
  time: number,
): SceneRenderState {
  const local = time - scene.startSeconds;
  const fallback = project.scenes[0]!.camera.keyframes[0]!.value;
  const camera = sample(
    scene.camera.keyframes,
    local,
    fallback,
    interpolateCamera,
  );
  const layers = scene.layers.map((layer): RenderLayer => {
    const active =
      layer.visible &&
      local >= layer.timeRange.start &&
      (local < layer.timeRange.end ||
        (time === project.durationSeconds && local === layer.timeRange.end));
    const result: RenderLayer = {
      ...layer,
      visible: active,
      opacity: layer.opacity * scalarAt(layer.tracks.opacity, local, 1),
      transform: {
        scale: scalarAt(layer.tracks.scale, local, layer.transform.scale),
        rotation: scalarAt(
          layer.tracks.rotation,
          local,
          layer.transform.rotation,
        ),
        offsetX: scalarAt(layer.tracks.offsetX, local, layer.transform.offsetX),
        offsetY: scalarAt(layer.tracks.offsetY, local, layer.transform.offsetY),
      },
    };
    if (result.type === 'route')
      result.coordinates = trimRoute(
        result.coordinates,
        scalarAt(layer.tracks.reveal, local, 1),
      );
    if (result.type === 'shape')
      result.renderCoordinates = trimRoute(
        result.kind === 'bezier'
          ? bezierPath(result.coordinates)
          : result.coordinates,
        scalarAt(layer.tracks.reveal, local, 1),
      );
    if (result.type === 'choropleth') {
      const dataset = project.datasets.find(
        (dataset) => dataset.id === result.datasetId,
      );
      if (!dataset) throw new Error(`Missing dataset ${result.datasetId}`);
      result.data = evaluateChoropleth(
        dataset,
        result,
        scalarAt(layer.tracks.dataYear, local, result.dataYear),
      );
    }
    return result;
  });
  return { sceneId: scene.id, camera: { ...camera }, layers };
}
