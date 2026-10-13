import {
  modelAssetSchema,
  MAX_MODEL_BYTES,
  MAX_MODEL_TRIANGLES,
  type ModelAsset,
} from '@animatemap/project-schema';
export type ModelImportOptions = Omit<
  ModelAsset,
  'vertices' | 'triangles' | 'sourceSha256'
>;
export function authoredAircraftOBJ() {
  const vertices: [number, number, number][] = [],
    triangles: [number, number, number][] = [];
  const prism = (xy: [number, number][], lower: number, upper: number) => {
    const base = vertices.length,
      n = xy.length;
    for (const z of [lower, upper])
      for (const [x, y] of xy) vertices.push([x, y, z]);
    for (let i = 1; i < n - 1; i++) {
      triangles.push(
        [base, base + i + 1, base + i],
        [base + n, base + n + i, base + n + i + 1],
      );
    }
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      triangles.push(
        [base + i, base + j, base + n + j],
        [base + i, base + n + j, base + n + i],
      );
    }
  };
  prism(
    [
      [-1.2, -9],
      [1.2, -9],
      [1.2, 9],
      [0, 14],
      [-1.2, 9],
    ],
    1,
    3,
  );
  prism(
    [
      [-12, -4],
      [-1, -2],
      [-1, 4],
      [-12, -2],
    ],
    1.5,
    1.8,
  );
  prism(
    [
      [1, -2],
      [12, -4],
      [12, -2],
      [1, 4],
    ],
    1.5,
    1.8,
  );
  prism(
    [
      [-5, -10],
      [5, -10],
      [5, -8],
      [-5, -8],
    ],
    2,
    2.3,
  );
  prism(
    [
      [-0.15, -10],
      [0.15, -10],
      [0.15, -7],
      [-0.15, -7],
    ],
    3,
    6,
  );
  return [
    '# AnimateMap authored stylized aircraft v1; mesh CC0-1.0; metres; Z up; +Y forward',
    ...vertices.map((p) => `v ${p.join(' ')}`),
    ...triangles.map((t) => `f ${t.map((i) => i + 1).join(' ')}`),
    '',
  ].join('\n');
}
export function aircraftOptions(id: string): ModelImportOptions {
  return {
    id,
    name: 'Stylized aircraft',
    type: 'model',
    unit: 'metres',
    sourceUpAxis: 'Z',
    placementOrigin: 'ground-centre',
    provenance: {
      source: 'AnimateMap authored stylized aircraft v1',
      author: 'AnimateMap contributors',
      license: 'CC0-1.0',
      credit: 'Stylized aircraft · AnimateMap · CC0',
    },
  };
}
export async function importModelOBJ(
  bytes: Uint8Array,
  options: ModelImportOptions,
): Promise<ModelAsset> {
  if (bytes.length > MAX_MODEL_BYTES)
    throw new Error('OBJ input exceeds 3 MiB');
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes),
    vertices: [number, number, number][] = [],
    triangles: [number, number, number][] = [];
  const lines = text.split(/\r?\n/);
  if (lines.length > 100000) throw new Error('OBJ exceeds 100000 lines');
  for (const [lineIndex, line] of lines.entries()) {
    const words = line.split('#')[0]!.trim().split(/\s+/),
      kind = words.shift();
    if (!kind) continue;
    const fail = (message: string): never => {
      throw new Error(`OBJ line ${lineIndex + 1}: ${message}`);
    };
    if (kind === 'v') {
      if (words.length !== 3)
        fail('vertices require exactly three finite coordinates');
      if (
        words.some(
          (w) => !/^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?$/.test(w),
        )
      )
        fail('vertex coordinates must be decimal numbers');
      const point = words.map(Number);
      if (point.some((p) => !Number.isFinite(p) || Math.abs(p) > 100000))
        fail('vertex coordinate is invalid');
      vertices.push(point as [number, number, number]);
      if (vertices.length > 20000) fail('model exceeds 20000 vertices');
    } else if (kind === 'f') {
      if (words.length !== 3)
        fail(
          'only triangulated faces are supported; triangulate your mesh before import',
        );
      const indices = words.map((word) => {
        if (!/^-?[1-9]\d*(?:\/-?\d*)?(?:\/-?\d+)?$/.test(word))
          fail('invalid face index');
        const value = Number(word.split('/')[0]);
        if (!Number.isSafeInteger(value) || value === 0)
          fail('invalid face index');
        const index = value > 0 ? value - 1 : vertices.length + value;
        if (index < 0 || index >= vertices.length)
          fail(
            'face references a missing vertex (forward references are unsupported)',
          );
        return index;
      });
      triangles.push(indices as [number, number, number]);
      if (triangles.length > MAX_MODEL_TRIANGLES)
        fail('model exceeds 20000 triangles');
    } else if (kind === 'vn' || kind === 'vt') {
      if (
        (kind === 'vn' && words.length !== 3) ||
        (kind === 'vt' && (words.length < 1 || words.length > 3)) ||
        words.some((w) => !Number.isFinite(Number(w)))
      )
        fail('invalid normal/texture coordinate');
      // Flat normals are derived from accepted geometry. No texture is loaded.
    } else if (kind === 'o' || kind === 'g' || kind === 's') {
      if (words.join(' ').length > 200)
        fail('group metadata exceeds 200 characters');
    } else if (kind === 'mtllib' || kind === 'usemtl')
      fail(
        'external/material resources are unsupported; export an untextured triangle OBJ',
      );
    else fail(`unsupported directive ${kind}`);
  }
  const converted = vertices.map(([x, y, z]): [number, number, number] =>
    options.sourceUpAxis === 'Y' ? [x, -z, y] : [x, y, z],
  );
  if (options.placementOrigin === 'ground-centre' && converted.length) {
    const bounds = [0, 1, 2].map((axis) => {
      let min = Infinity,
        max = -Infinity;
      for (const p of converted) {
        min = Math.min(min, p[axis]!);
        max = Math.max(max, p[axis]!);
      }
      return [min, max] as const;
    });
    const origin = [
      (bounds[0]![0] + bounds[0]![1]) / 2,
      (bounds[1]![0] + bounds[1]![1]) / 2,
      bounds[2]![0],
    ];
    for (const point of converted)
      for (let axis = 0; axis < 3; axis++) point[axis]! -= origin[axis]!;
  }
  const hash = await crypto.subtle.digest('SHA-256', new Uint8Array(bytes)),
    sourceSha256 = [...new Uint8Array(hash)]
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('');
  return modelAssetSchema.parse({
    ...options,
    vertices: converted,
    triangles,
    sourceSha256,
  });
}
