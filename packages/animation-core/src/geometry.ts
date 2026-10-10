import { wrap } from './numeric';
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
/** WGS84 control curve, unwrapped before cubic sampling to avoid a dateline jump. */
export function bezierPath(
  points: [number, number][],
  samples = 128,
): [number, number][] {
  if (points.length !== 4)
    throw new Error('Bezier requires four control points');
  if (!Number.isInteger(samples) || samples < 8 || samples > 2048)
    throw new Error('Bezier samples must be between 8 and 2048');
  const controls = unwrapCoordinates(points);
  return Array.from({ length: samples + 1 }, (_, i) => {
    const t = i / samples,
      u = 1 - t;
    const value = (axis: 0 | 1) =>
      u ** 3 * controls[0]![axis] +
      3 * u ** 2 * t * controls[1]![axis] +
      3 * u * t ** 2 * controls[2]![axis] +
      t ** 3 * controls[3]![axis];
    return [wrap(value(0)), value(1)];
  });
}
