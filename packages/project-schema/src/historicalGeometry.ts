import { z } from 'zod';
export type HistoryPoint = [number, number];
type Ring = HistoryPoint[];
const point = z.tuple([
  z.number().finite().min(-180).max(180),
  z.number().finite().min(-85).max(85),
]);
const ring = z.array(point).min(4).max(10000),
  polygon = z.array(ring).min(1).max(32);
export const historicalGeometrySchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('Polygon'), coordinates: polygon }),
  z.strictObject({
    type: z.literal('MultiPolygon'),
    coordinates: z.array(polygon).min(1).max(32),
  }),
]);
export type HistoricalGeometry = z.infer<typeof historicalGeometrySchema>;
export function historyPolygons(geometry: HistoricalGeometry) {
  return geometry.type === 'Polygon'
    ? [geometry.coordinates]
    : geometry.coordinates;
}
export function historyVertexCount(geometry: HistoricalGeometry) {
  return historyPolygons(geometry).reduce(
    (n, p) => n + p.reduce((s, r) => s + r.length, 0),
    0,
  );
}
export function unwrapHistoryRing(input: Ring): Ring {
  const result: Ring = [];
  for (const p of input) {
    const previous = result.at(-1);
    result.push(
      previous
        ? [
            previous[0] +
              (((((p[0] - previous[0] + 540) % 360) + 360) % 360) - 180),
            p[1],
          ]
        : [...p],
    );
  }
  return result;
}
function orient(a: HistoryPoint, b: HistoryPoint, c: HistoryPoint) {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}
function on(a: HistoryPoint, b: HistoryPoint, p: HistoryPoint) {
  return (
    orient(a, b, p) === 0 &&
    p[0] >= Math.min(a[0], b[0]) &&
    p[0] <= Math.max(a[0], b[0]) &&
    p[1] >= Math.min(a[1], b[1]) &&
    p[1] <= Math.max(a[1], b[1])
  );
}
function intersects(
  a: HistoryPoint,
  b: HistoryPoint,
  c: HistoryPoint,
  d: HistoryPoint,
) {
  const ac = orient(a, b, c),
    ad = orient(a, b, d),
    ca = orient(c, d, a),
    cb = orient(c, d, b);
  return (
    (ac * ad < 0 && ca * cb < 0) ||
    on(a, b, c) ||
    on(a, b, d) ||
    on(c, d, a) ||
    on(c, d, b)
  );
}
export function historyPointInside(p: HistoryPoint, r: Ring) {
  let result = false;
  for (let i = 0; i < r.length - 1; i++) {
    const a = r[i]!,
      b = r[i + 1]!;
    if (on(a, b, p)) return false;
    if (
      a[1] > p[1] !== b[1] > p[1] &&
      p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]
    )
      result = !result;
  }
  return result;
}
export function historySignedArea(r: Ring) {
  const first = r[0]!;
  let sum = 0;
  for (let i = 0; i < r.length - 1; i++) sum += orient(first, r[i]!, r[i + 1]!);
  return sum / 2;
}
type Segment = {
  a: HistoryPoint;
  b: HistoryPoint;
  ring: number;
  edge: number;
  size: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};
/** Source coordinates stay unchanged; only comparison copies unwrap and skip zero edges. */
export function validateHistoricalGeometry(
  geometry: HistoricalGeometry,
  work = { remaining: 5000000 },
) {
  if (historyVertexCount(geometry) > 20000)
    throw new Error('Historical feature exceeds 20000 vertices');
  const polygons: Ring[][] = [],
    segments: Segment[] = [];
  let ringId = 0;
  const referenceLongitude = historyPolygons(geometry)[0]![0]![0]![0];
  for (const sourcePolygon of historyPolygons(geometry)) {
    const rings: Ring[] = [];
    const exteriorLongitude = sourcePolygon[0]![0]![0],
      polygonShift =
        360 * Math.round((referenceLongitude - exteriorLongitude) / 360);
    for (const source of sourcePolygon) {
      const first = source[0]!,
        last = source.at(-1)!;
      if (first[0] !== last[0] || first[1] !== last[1])
        throw new Error('Historical rings must be closed');
      const worldShift =
        polygonShift +
        360 * Math.round((exteriorLongitude - source[0]![0]) / 360);
      const unwrapped = unwrapHistoryRing(source).map(
          ([x, y]): HistoryPoint => [x + worldShift, y],
        ),
        clean: Ring = [];
      for (const p of unwrapped) {
        const previous = clean.at(-1);
        if (!previous || p[0] !== previous[0] || p[1] !== previous[1])
          clean.push(p);
      }
      if (
        clean.length < 4 ||
        Math.abs(clean[0]![0] - clean.at(-1)![0]) > 1e-9 ||
        Math.abs(historySignedArea(clean)) < 1e-15
      )
        throw new Error(
          'Historical ring is degenerate or winds around the world',
        );
      const xs = clean.map((p) => p[0]);
      if (Math.max(...xs) - Math.min(...xs) >= 180)
        throw new Error(
          'Historical ring spans 180 degrees; split it explicitly',
        );
      for (let i = 0; i < clean.length - 1; i++) {
        const a = clean[i]!,
          b = clean[i + 1]!,
          c = clean[(i + 2) % (clean.length - 1)]!;
        if (orient(a, b, c) === 0 && on(a, b, c))
          throw new Error('Historical ring backtracks along an edge');
        segments.push({
          a,
          b,
          ring: ringId,
          edge: i,
          size: clean.length - 1,
          minX: Math.min(a[0], b[0]),
          maxX: Math.max(a[0], b[0]),
          minY: Math.min(a[1], b[1]),
          maxY: Math.max(a[1], b[1]),
        });
      }
      ringId++;
      rings.push(clean);
    }
    // Align holes to the exterior's unwrapped world copy without changing source geometry.
    for (let h = 1; h < rings.length; h++) {
      if (!historyPointInside(rings[h]![0]!, rings[0]!))
        throw new Error('Historical hole is not strictly inside its exterior');
      for (let j = 1; j < h; j++)
        if (
          historyPointInside(rings[j]![0]!, rings[h]!) ||
          historyPointInside(rings[h]![0]!, rings[j]!)
        )
          throw new Error('Historical holes overlap');
    }
    polygons.push(rings);
  }
  segments.sort(
    (a, b) =>
      a.minX - b.minX || a.minY - b.minY || a.ring - b.ring || a.edge - b.edge,
  );
  let active: Segment[] = [];
  for (const segment of segments) {
    active = active.filter((a) => a.maxX >= segment.minX);
    for (const previous of active) {
      if (--work.remaining < 0)
        throw new Error('Historical topology comparison budget exceeded');
      if (
        previous.ring === segment.ring &&
        (Math.abs(previous.edge - segment.edge) === 1 ||
          Math.abs(previous.edge - segment.edge) === segment.size - 1)
      )
        continue;
      if (previous.maxY < segment.minY || segment.maxY < previous.minY)
        continue;
      if (intersects(previous.a, previous.b, segment.a, segment.b))
        throw new Error('Historical rings intersect or touch');
    }
    active.push(segment);
  }
  const filled = (point: HistoryPoint, poly: Ring[]) =>
    historyPointInside(point, poly[0]!) &&
    !poly.slice(1).some((r) => historyPointInside(point, r));
  for (let i = 0; i < polygons.length; i++)
    for (let j = 0; j < i; j++)
      if (
        filled(polygons[i]![0]![0]!, polygons[j]!) ||
        filled(polygons[j]![0]![0]!, polygons[i]!)
      )
        throw new Error('Historical MultiPolygon parts overlap');
}
