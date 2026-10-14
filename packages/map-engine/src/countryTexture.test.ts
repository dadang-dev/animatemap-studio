import { test, expect } from 'vitest';
import { textureGeometry } from './countryTexture';
test('country mask retains holes, disconnected islands and unwraps dateline geometry', () => {
  const geometry = {
    type: 'MultiPolygon' as const,
    coordinates: [
      [
        [
          [179, 0],
          [-179, 0],
          [-179, 4],
          [179, 4],
          [179, 0],
        ],
        [
          [179.5, 1],
          [-179.5, 1],
          [-179.5, 2],
          [179.5, 2],
          [179.5, 1],
        ],
      ],
      [
        [
          [178, -2],
          [179, -2],
          [179, -1],
          [178, -1],
          [178, -2],
        ],
      ],
    ],
  };
  const b = textureGeometry(geometry, 180);
  expect(b.east - b.west).toBe(3);
  expect(b.polygons).toHaveLength(2);
  expect(b.polygons[0]).toHaveLength(2);
  expect(b.coordinates[0]![1]).toBeCloseTo(4);
  expect(b.coordinates[2]![1]).toBeCloseTo(-2);
  expect(geometry.coordinates[0]![0]![1]![0]).toBe(-179);
});
