import { z } from 'zod';

export const MAX_BUILDING_BYTES = 3 * 1024 * 1024;
export const MAX_BUILDING_VERTICES = 20000;
export const buildingHeightUnitSchema = z.enum([
  'metres',
  'feet',
  'usSurveyFeet',
]);
export type BuildingHeightUnit = z.infer<typeof buildingHeightUnitSchema>;
export function buildingHeightMetres(height: number, unit: BuildingHeightUnit) {
  return (
    height * (unit === 'metres' ? 1 : unit === 'feet' ? 0.3048 : 1200 / 3937)
  );
}
const coordinate = z.tuple([
  z.number().finite().min(-180).max(180),
  z.number().finite().min(-85).max(85),
]);
const ring = z.array(coordinate).min(4).max(256);
const polygon = z.array(ring).min(1).max(8);
export const buildingGeometrySchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('Polygon'), coordinates: polygon }).strict(),
  z
    .object({
      type: z.literal('MultiPolygon'),
      coordinates: z.array(polygon).min(1).max(8),
    })
    .strict(),
]);
export type BuildingGeometry = z.infer<typeof buildingGeometrySchema>;
export const buildingCollectionSchema = z.object({
  type: z.literal('FeatureCollection'),
  crs: z.never().optional(),
  features: z
    .array(
      z.object({
        type: z.literal('Feature'),
        id: z.union([z.string().max(100), z.number().finite()]).optional(),
        geometry: buildingGeometrySchema,
        properties: z.record(z.string().max(200), z.unknown()),
      }),
    )
    .min(1)
    .max(500),
});
type Point = [number, number];
type Ring = Point[];
export function buildingPolygons(geometry: BuildingGeometry) {
  return geometry.type === 'Polygon'
    ? [geometry.coordinates]
    : geometry.coordinates;
}
export function buildingVertexCount(geometry: BuildingGeometry) {
  return buildingPolygons(geometry).reduce(
    (n, p) => n + p.reduce((s, r) => s + r.length, 0),
    0,
  );
}
function orient(a: Point, b: Point, c: Point) {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}
function onSegment(a: Point, b: Point, p: Point) {
  return (
    orient(a, b, p) === 0 &&
    p[0] >= Math.min(a[0], b[0]) &&
    p[0] <= Math.max(a[0], b[0]) &&
    p[1] >= Math.min(a[1], b[1]) &&
    p[1] <= Math.max(a[1], b[1])
  );
}
function intersects(a: Point, b: Point, c: Point, d: Point) {
  if (
    Math.max(a[0], b[0]) < Math.min(c[0], d[0]) ||
    Math.max(c[0], d[0]) < Math.min(a[0], b[0]) ||
    Math.max(a[1], b[1]) < Math.min(c[1], d[1]) ||
    Math.max(c[1], d[1]) < Math.min(a[1], b[1])
  )
    return false;
  const ac = orient(a, b, c),
    ad = orient(a, b, d),
    ca = orient(c, d, a),
    cb = orient(c, d, b);
  return (
    (ac * ad < 0 && ca * cb < 0) ||
    onSegment(a, b, c) ||
    onSegment(a, b, d) ||
    onSegment(c, d, a) ||
    onSegment(c, d, b)
  );
}
function inside(p: Point, r: Ring) {
  let result = false;
  for (let i = 0; i < r.length - 1; i++) {
    const a = r[i]!,
      b = r[i + 1]!;
    if (onSegment(a, b, p)) return false;
    if (
      a[1] > p[1] !== b[1] > p[1] &&
      p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]
    )
      result = !result;
  }
  return result;
}
/** Exact source vertices are retained. Budgeted comparisons reject costly input. */
export function validateBuildingGeometry(
  geometry: BuildingGeometry,
  work = { remaining: 2000000 },
) {
  if (buildingVertexCount(geometry) > 512)
    throw new Error('Building exceeds 512 vertices');
  const polygons = buildingPolygons(geometry);
  const compare = (a: Ring, b: Ring, same = false) => {
    for (let i = 0; i < a.length - 1; i++)
      for (let j = same ? i + 1 : 0; j < b.length - 1; j++) {
        if (same && (j === i + 1 || (i === 0 && j === b.length - 2))) continue;
        if (--work.remaining < 0)
          throw new Error('Building topology comparison budget exceeded');
        if (intersects(a[i]!, a[i + 1]!, b[j]!, b[j + 1]!))
          throw new Error('Building rings intersect or touch');
      }
  };
  for (const p of polygons) {
    for (const r of p) {
      const first = r[0]!,
        last = r.at(-1)!;
      if (first[0] !== last[0] || first[1] !== last[1])
        throw new Error('Building rings must be closed');
      let area = 0;
      for (let i = 0; i < r.length - 1; i++) {
        const a = r[i]!,
          b = r[i + 1]!;
        if (a[0] === b[0] && a[1] === b[1])
          throw new Error('Building has duplicate adjacent vertices');
        const c = r[(i + 2) % (r.length - 1)]!;
        if (orient(a, b, c) === 0 && onSegment(a, b, c))
          throw new Error('Building ring backtracks along an adjacent edge');
        // Translation avoids cancellation at large absolute longitude/latitude.
        area += orient(first, a, b);
      }
      if (Math.abs(area) < 1e-15)
        throw new Error('Building ring has zero area');
      const xs = r.map((v) => v[0]),
        ys = r.map((v) => v[1]);
      if (
        Math.max(...xs) - Math.min(...xs) > 0.1 ||
        Math.max(...ys) - Math.min(...ys) > 0.1
      )
        throw new Error(
          'Footprint extent exceeds 0.1 degrees; split antimeridian geometry explicitly',
        );
      compare(r, r, true);
    }
    for (let h = 1; h < p.length; h++) {
      if (!inside(p[h]![0]!, p[0]!))
        throw new Error('Building hole must be strictly inside its exterior');
      compare(p[0]!, p[h]!);
      for (let j = 1; j < h; j++) {
        compare(p[j]!, p[h]!);
        if (inside(p[j]![0]!, p[h]!) || inside(p[h]![0]!, p[j]!))
          throw new Error('Building holes overlap');
      }
    }
  }
  for (let i = 0; i < polygons.length; i++)
    for (let j = 0; j < i; j++) {
      const a = polygons[i]!,
        b = polygons[j]!;
      for (const ar of a) for (const br of b) compare(ar, br);
      const inFilled = (p: Point, poly: Ring[]) =>
        inside(p, poly[0]!) && !poly.slice(1).some((r) => inside(p, r));
      if (inFilled(a[0]![0]!, b) || inFilled(b[0]![0]!, a))
        throw new Error('Building MultiPolygon parts overlap');
    }
}
export const buildingProvenanceSchema = z
  .object({
    source: z.string().min(1).max(2048),
    author: z.string().min(1).max(200),
    license: z.string().min(1).max(500),
    licenseURL: z
      .url()
      .max(2048)
      .refine(
        (value) => /^https?:\/\//.test(value),
        'License URL must be HTTP(S)',
      ),
    credit: z.string().min(1).max(500),
    accessedAt: z.iso.datetime(),
    surveyYear: z.number().int().min(1).max(9999).nullable(),
    uncertainty: z.string().min(1).max(1000),
    sourceSha256: z.string().regex(/^[a-f0-9]{64}$/),
    heightField: z.string().min(1).max(200),
    heightReference: z.literal('above-grade'),
  })
  .strict();
export const buildingDatasetSchema = z
  .object({
    id: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/),
    name: z.string().min(1).max(200),
    heightUnit: buildingHeightUnitSchema,
    provenance: buildingProvenanceSchema,
    records: z
      .array(
        z
          .object({
            id: z.string().min(1).max(100),
            buildingId: z.string().max(100).optional(),
            height: z.number().finite().positive().max(5000),
            geometry: buildingGeometrySchema,
          })
          .strict(),
      )
      .min(1)
      .max(500),
  })
  .strict()
  .superRefine((dataset, ctx) => {
    const ids = new Set<string>(),
      work = { remaining: 2000000 };
    let vertices = 0;
    for (const [i, record] of dataset.records.entries()) {
      const issue = (message: string) =>
        ctx.addIssue({ code: 'custom', message, path: ['records', i] });
      if (ids.has(record.id)) issue('Duplicate building source identifier');
      ids.add(record.id);
      const metres = buildingHeightMetres(record.height, dataset.heightUnit);
      if (metres <= 0 || metres > 1500)
        issue(
          'Converted building height must be positive and at most 1500 metres above grade',
        );
      vertices += buildingVertexCount(record.geometry);
      try {
        validateBuildingGeometry(record.geometry, work);
      } catch (e) {
        issue(e instanceof Error ? e.message : 'Invalid building topology');
        break;
      }
    }
    if (vertices > MAX_BUILDING_VERTICES)
      ctx.addIssue({
        code: 'custom',
        message: 'Building dataset exceeds 20000 vertices',
      });
    if (
      new TextEncoder().encode(JSON.stringify(dataset)).length >
      MAX_BUILDING_BYTES
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Building dataset exceeds 3 MiB',
      });
  });
export type BuildingDataset = z.infer<typeof buildingDatasetSchema>;
