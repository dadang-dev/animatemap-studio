import { distance, bearing, destination } from '@turf/turf';
import type { Layer } from '@animatemap/project-schema';
import { wrap, clamp } from './numeric';
type ModelLayer = Extract<Layer, { type: 'model' }>;
export type ModelPose = {
  coordinates: [number, number];
  altitude: number;
  heading: number;
  pitch: number;
  roll: number;
  scale: number;
};
const paths = new WeakMap<
  ModelLayer['motion'],
  { lengths: number[]; total: number }
>();
export function modelPoseAt(layer: ModelLayer): ModelPose {
  let coordinates: [number, number],
    heading = layer.transform.rotation;
  if (layer.motion.type === 'stationary')
    coordinates = [...layer.motion.coordinates];
  else {
    const points = layer.motion.coordinates;
    let path = paths.get(layer.motion);
    if (!path) {
      const lengths = points.slice(1).map((p, i) => distance(points[i]!, p));
      path = { lengths, total: lengths.reduce((n, v) => n + v, 0) };
      paths.set(layer.motion, path);
    }
    if (!Number.isFinite(path.total) || path.total <= 0)
      throw new Error('Model motion path has no geographic length');
    let remaining = clamp(layer.motionProgress, 0, 1) * path.total,
      index = 0;
    while (
      index < path.lengths.length - 1 &&
      remaining > path.lengths[index]!
    ) {
      remaining -= path.lengths[index]!;
      index++;
    }
    const length = path.lengths[index]!,
      a = points[index]!,
      b = points[index + 1]!;
    const fraction = clamp(length ? remaining / length : 0, 0, 1),
      p =
        fraction === 0
          ? a
          : fraction === 1
            ? b
            : destination(a, length * fraction, bearing(a, b)).geometry
                .coordinates;
    if (Math.abs(p[1]!) > 85 + 1e-7)
      throw new Error(
        'Model motion left the supported Mercator latitude range',
      );
    coordinates = [wrap(p[0]!), clamp(p[1]!, -85, 85)];
    if (layer.motion.alignHeading) {
      const ahead = destination(
        a,
        length * Math.min(1, fraction + 1e-5),
        bearing(a, b),
      ).geometry.coordinates;
      const behind = destination(
        a,
        length * Math.max(0, fraction - 1e-5),
        bearing(a, b),
      ).geometry.coordinates;
      heading += bearing(behind, ahead);
    }
  }
  return {
    coordinates,
    altitude: layer.altitude,
    heading: wrap(heading),
    pitch: layer.orientation.pitch,
    roll: layer.orientation.roll,
    scale: layer.transform.scale,
  };
}
