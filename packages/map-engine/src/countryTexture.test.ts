import { test, expect } from 'vitest';
import { textureGeometry, flagCover } from './countryTexture';
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
test('fitted flag symbols retain aspect ratio across portrait and wide country silhouettes', () => {
  for (const [width, height] of [
    [400, 900],
    [900, 400],
    [800, 800],
  ]) {
    const cover = flagCover(512, 384, 100, 200, width!, height!);
    expect(cover.width / cover.height).toBeCloseTo(512 / 384);
    expect(cover.width).toBeGreaterThanOrEqual(width!);
    expect(cover.height).toBeGreaterThanOrEqual(height!);
    expect(cover.x + cover.width / 2).toBeCloseTo(100 + width! / 2);
    expect(cover.y + cover.height / 2).toBeCloseTo(200 + height! / 2);
  }
});
