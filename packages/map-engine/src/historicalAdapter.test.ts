import { expect, test } from 'vitest';
import { historicalRenderGeometry } from './historicalAdapter';
test('historical rendering preserves dateline islands and holes in one nearest world copy without changing source geometry', () => {
  const source = {
    type: 'Polygon' as const,
    coordinates: [
      [
        [179, 10],
        [-179, 10],
        [-179, 12],
        [179, 12],
        [179, 10],
      ],
      [
        [179.5, 10.5],
        [-179.5, 10.5],
        [-179.5, 11.5],
        [179.5, 11.5],
        [179.5, 10.5],
      ],
    ] as [number, number][][],
  };
  const original = structuredClone(source),
    render = historicalRenderGeometry(source);
  expect(render.coordinates).toHaveLength(2);
  expect(source).toEqual(original);
  expect(
    (render.coordinates as [number, number][][])[0]!.map((p) => p[0]),
  ).toEqual([179, 181, 181, 179, 179]);
  expect(
    (render.coordinates as [number, number][][])[1]!.map((p) => p[0]),
  ).toEqual([179.5, 180.5, 180.5, 179.5, 179.5]);
});
