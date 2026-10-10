import { describe, expect, test } from 'vitest';
import { distance } from '@turf/turf';
import { createDemo } from '@animatemap/project-schema';
import {
  evaluateProjectAt,
  interpolateCamera,
  trimRoute,
  unwrapCoordinates,
} from './index';
describe('deterministic evaluator', () => {
  test('seeks repeat exactly without mutating input', () => {
    const p = createDemo();
    const before = JSON.stringify(p);
    const at3 = evaluateProjectAt(p, 3);
    evaluateProjectAt(p, 9);
    expect(evaluateProjectAt(p, 3)).toEqual(at3);
    expect(JSON.stringify(p)).toBe(before);
  });
  test('camera uses short dateline and bearing arcs', () => {
    const a = { lng: 179, lat: 0, zoom: 3, bearing: 350, pitch: 0 };
    const b = { ...a, lng: -179, bearing: 10 };
    const mid = interpolateCamera(a, b, 0.5);
    expect(Math.abs(mid.lng)).toBe(180);
    expect(mid.bearing).toBe(0);
  });
  test('route reveal uses length, not vertex count', () => {
    const points: [number, number][] = [
      [0, 0],
      [1, 0],
      [10, 0],
    ];
    expect(trimRoute(points, 0)).toEqual([
      [0, 0],
      [0, 0],
    ]);
    expect(trimRoute(points, 1).at(-1)![0]).toBeCloseTo(10);
    const half = trimRoute(points, 0.5);
    expect(half.at(-1)![0]).toBeCloseTo(5, 4);
    expect(distance(points[0]!, half.at(-1)!)).toBeCloseTo(
      distance(points[0]!, points[2]!) / 2,
      3,
    );
  });
  test('route crossing 180 stays short', () => {
    expect(
      unwrapCoordinates([
        [179, 0],
        [-179, 0],
      ]),
    ).toEqual([
      [179, 0],
      [181, 0],
    ]);
    expect(
      trimRoute(
        [
          [179, 0],
          [-179, 0],
        ],
        0.5,
      ).at(-1)![0],
    ).toBeCloseTo(180);
  });
  test('scene-local timing and visibility', () => {
    const p = createDemo();
    p.scenes[0]!.startSeconds = 2;
    p.scenes[0]!.durationSeconds = 10;
    expect(evaluateProjectAt(p, 1).layers).toEqual([]);
    expect(evaluateProjectAt(p, 2).camera).toEqual(
      p.scenes[0]!.camera.keyframes[0]!.value,
    );
  });
  test('invalid seek rejected', () =>
    expect(() => evaluateProjectAt(createDemo(), NaN)).toThrow('finite'));
});
