import { z } from 'zod';
import { assetProvenanceSchema } from './assets';
import { buildingHeightUnitSchema, buildingHeightMetres } from './buildings';
export const MAX_MODEL_BYTES = 3 * 1024 * 1024;
export const MAX_MODEL_TRIANGLES = 20000;
/** Latitude extrema lying on the short great-circle arc, without resampling. */
export function modelArcExtrema(
  a: [number, number],
  b: [number, number],
): [number, number][] {
  const vector = ([lng, lat]: [number, number]) => {
    const p = (lat * Math.PI) / 180,
      l = (lng * Math.PI) / 180;
    return [Math.cos(p) * Math.cos(l), Math.cos(p) * Math.sin(l), Math.sin(p)];
  };
  const cross = (x: number[], y: number[]) => [
    x[1]! * y[2]! - x[2]! * y[1]!,
    x[2]! * y[0]! - x[0]! * y[2]!,
    x[0]! * y[1]! - x[1]! * y[0]!,
  ];
  const dot = (x: number[], y: number[]) =>
      x.reduce((n, v, i) => n + v * y[i]!, 0),
    angle = (x: number[], y: number[]) =>
      Math.atan2(Math.hypot(...cross(x, y)), dot(x, y));
  const av = vector(a),
    bv = vector(b),
    normal = cross(av, bv),
    length = Math.hypot(...normal);
  if (length < 1e-12) {
    if (dot(av, bv) < 0)
      throw new Error('Antipodal model motion needs an intermediate waypoint');
    return [];
  }
  const n = normal.map((v) => v / length),
    pole = [-n[0]! * n[2]!, -n[1]! * n[2]!, 1 - n[2]! ** 2],
    poleLength = Math.hypot(...pole);
  if (poleLength < 1e-12) return [];
  const extreme = pole.map((v) => v / poleLength);
  const arc = angle(av, bv);
  return [extreme, extreme.map((v) => -v)]
    .filter((p) => Math.abs(angle(av, p) + angle(p, bv) - arc) < 1e-9)
    .map((p) => [
      (Math.atan2(p[1]!, p[0]!) * 180) / Math.PI,
      (Math.asin(Math.max(-1, Math.min(1, p[2]!))) * 180) / Math.PI,
    ]);
}
/** Great-circle extrema must stay within the supported Mercator latitude range. */
export function validateModelArc(a: [number, number], b: [number, number]) {
  if (modelArcExtrema(a, b).some((p) => Math.abs(p[1]) > 85 + 1e-9))
    throw new Error(
      'Model geodesic crosses the unsupported polar latitude range',
    );
}
const point = z.tuple([
  z.number().finite().min(-100000).max(100000),
  z.number().finite().min(-100000).max(100000),
  z.number().finite().min(-100000).max(100000),
]);
export const modelAssetSchema = z
  .object({
    id: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/),
    name: z.string().min(1).max(200),
    type: z.literal('model'),
    unit: buildingHeightUnitSchema,
    sourceUpAxis: z.enum(['Y', 'Z']),
    placementOrigin: z.enum(['preserve', 'ground-centre']),
    sourceSha256: z.string().regex(/^[a-f0-9]{64}$/),
    provenance: assetProvenanceSchema,
    vertices: z.array(point).min(3).max(20000),
    triangles: z
      .array(
        z.tuple([
          z.number().int().min(0),
          z.number().int().min(0),
          z.number().int().min(0),
        ]),
      )
      .min(1)
      .max(MAX_MODEL_TRIANGLES),
  })
  .strict()
  .superRefine((asset, ctx) => {
    if (
      new TextEncoder().encode(JSON.stringify(asset)).length > MAX_MODEL_BYTES
    )
      ctx.addIssue({ code: 'custom', message: 'Model mesh exceeds 3 MiB' });
    const issue = (message: string, index: number) =>
      ctx.addIssue({ code: 'custom', message, path: ['triangles', index] });
    for (const [i, t] of asset.triangles.entries()) {
      const a = asset.vertices[t[0]],
        b = asset.vertices[t[1]],
        c = asset.vertices[t[2]];
      if (!a || !b || !c) {
        issue('Model face references a missing vertex', i);
        continue;
      }
      const u = b.map((v, j) => v - a[j]!),
        v = c.map((n, j) => n - a[j]!);
      const area2 = Math.hypot(
        u[1]! * v[2]! - u[2]! * v[1]!,
        u[2]! * v[0]! - u[0]! * v[2]!,
        u[0]! * v[1]! - u[1]! * v[0]!,
      );
      if (!Number.isFinite(area2) || area2 < 1e-12)
        issue('Model triangle is degenerate', i);
      const q = [a, b, c].map((p) => p.map(Math.fround)),
        qu = q[1]!.map((v, j) => v - q[0]![j]!),
        qv = q[2]!.map((v, j) => v - q[0]![j]!);
      if (
        Math.hypot(
          qu[1]! * qv[2]! - qu[2]! * qv[1]!,
          qu[2]! * qv[0]! - qu[0]! * qv[2]!,
          qu[0]! * qv[1]! - qu[1]! * qv[0]!,
        ) === 0
      )
        issue(
          'Model triangle collapses at GPU precision; choose ground-centre origin',
          i,
        );
    }
    for (let axis = 0; axis < 3; axis++) {
      let min = Infinity,
        max = -Infinity;
      for (const p of asset.vertices) {
        min = Math.min(min, p[axis]!);
        max = Math.max(max, p[axis]!);
      }
      if (buildingHeightMetres(max - min, asset.unit) > 20000)
        ctx.addIssue({
          code: 'custom',
          message: 'Model extent exceeds 20000 metres',
        });
    }
  });
export type ModelAsset = z.infer<typeof modelAssetSchema>;
export const cameraFollowSchema = z
  .object({
    layerId: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/),
    zoom: z.number().finite().min(0).max(18),
    pitch: z.number().finite().min(0).max(60),
    bearingMode: z.enum(['heading', 'fixed']),
    bearing: z.number().finite().min(-360).max(360),
  })
  .strict()
  .nullable()
  .default(null);
export type CameraFollow = z.infer<typeof cameraFollowSchema>;
