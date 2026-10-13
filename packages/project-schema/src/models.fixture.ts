import { modelAssetSchema } from './models';
// Authored CC0 unit geometry; not a measured real-world asset.
export function modelFixture() {
  return modelAssetSchema.parse({
    id: 'test-mesh',
    name: 'Authored tetrahedron',
    type: 'model',
    unit: 'metres',
    sourceUpAxis: 'Z',
    placementOrigin: 'preserve',
    sourceSha256: '0'.repeat(64),
    provenance: {
      source: 'Authored test mesh',
      author: 'AnimateMap contributors',
      license: 'CC0-1.0',
      credit: 'Authored test mesh · CC0',
    },
    vertices: [
      [0, 0, 0],
      [5, 0, 0],
      [0, 5, 0],
      [0, 0, 5],
    ],
    triangles: [
      [0, 2, 1],
      [0, 1, 3],
      [1, 2, 3],
      [0, 3, 2],
    ],
  });
}
