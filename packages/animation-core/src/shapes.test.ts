import { expect, test } from 'vitest';
import { length, lineString } from '@turf/turf';
import {
  createDemo,
  layerSchema,
  migrateProject,
} from '@animatemap/project-schema';
import { bezierPath, evaluateProjectAt, unwrapCoordinates } from './index';

test('Bezier samples cubic endpoints/midpoint and unwraps antimeridian controls', () => {
  const points: [number, number][] = [
    [0, 0],
    [0, 8],
    [8, 8],
    [8, 0],
  ];
  const path = bezierPath(points, 8);
  expect(path[0]).toEqual([0, 0]);
  expect(path[4]).toEqual([4, 6]);
  expect(path.at(-1)).toEqual([8, 0]);
  const crossing = unwrapCoordinates(
    bezierPath([
      [179, 0],
      [-179, 5],
      [179, -5],
      [-179, 0],
    ]),
  );
  expect(crossing[0]![0]).toBe(179);
  expect(crossing.at(-1)![0]).toBe(181);
  expect(
    Math.max(...crossing.map((point) => Math.abs(point[0] - 180))),
  ).toBeLessThanOrEqual(1);
  expect(() => bezierPath(points.slice(0, 3))).toThrow('four');
});

test('shape evaluation preserves original controls, trims geodesically and repeats deterministically', () => {
  const project = createDemo();
  const controls = [
    [105, 15],
    [106, 20],
    [110, 20],
    [111, 15],
  ];
  const shape = layerSchema.parse({
    id: 'curve',
    type: 'shape',
    kind: 'bezier',
    name: 'Curve',
    timeRange: { start: 0, end: 12 },
    coordinates: controls,
    style: { color: '#ffffff', width: 8, arrow: true },
    tracks: {
      reveal: [
        { time: 0, value: 0 },
        { time: 12, value: 1 },
      ],
    },
  });
  project.scenes[0]!.layers.push(shape);
  const before = JSON.stringify(project);
  const at = (time: number) => {
    const layer = evaluateProjectAt(project, time).layers.find(
      (layer) => layer.id === 'curve',
    );
    if (layer?.type !== 'shape') throw new Error('Missing shape');
    return layer;
  };
  expect(at(0).renderCoordinates).toEqual([
    [105, 15],
    [105, 15],
  ]);
  expect(
    length(lineString(at(6).renderCoordinates!)) /
      length(lineString(at(12).renderCoordinates!)),
  ).toBeCloseTo(0.5, 5);
  expect(at(6).coordinates).toEqual(controls);
  expect(at(6)).toEqual(at(6));
  expect(JSON.stringify(project)).toBe(before);
  expect(migrateProject(project)).toEqual(project);
});

test('shape contracts reject wrong control counts and out-of-range coordinates', () => {
  const common = {
    id: 'curve',
    type: 'shape',
    kind: 'bezier',
    name: 'Curve',
    timeRange: { start: 0, end: 12 },
    style: { color: '#ffffff', width: 8 },
  };
  expect(() =>
    layerSchema.parse({
      ...common,
      coordinates: [
        [0, 0],
        [1, 1],
      ],
    }),
  ).toThrow('four');
  expect(() =>
    layerSchema.parse({
      ...common,
      coordinates: [
        [0, 0],
        [1, 1],
        [2, 2],
        [181, 0],
      ],
    }),
  ).toThrow();
  for (const kind of ['line', 'arrow'])
    expect(
      layerSchema.parse({
        ...common,
        kind,
        coordinates: [
          [0, 0],
          [1, 1],
        ],
      }).type,
    ).toBe('shape');
});
