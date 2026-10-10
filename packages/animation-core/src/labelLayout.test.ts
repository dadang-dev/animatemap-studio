import { expect, test } from 'vitest';
import {
  hiddenLabels,
  transformLabelBounds,
  type LabelCandidate,
} from './labelLayout';

const viewport = { x: 0, y: 0, width: 1920, height: 1080 };
function candidate(
  id: string,
  x = 100,
  priority = 50,
  order = 0,
): LabelCandidate {
  return {
    id,
    mode: 'hide',
    priority,
    order,
    bounds: { x, y: 100, width: 100, height: 30 },
  };
}
test('priority, frontmost order and stable IDs choose labels without mutating input', () => {
  const labels = [candidate('a'), candidate('b', 100, 60), candidate('c', 500)];
  const snapshot = structuredClone(labels);
  expect([...hiddenLabels(labels, viewport)]).toEqual(['a']);
  expect([...hiddenLabels([...labels].reverse(), viewport)]).toEqual(['a']);
  expect(labels).toEqual(snapshot);
  expect([
    ...hiddenLabels([candidate('a'), candidate('b', 100, 50, 1)], viewport),
  ]).toEqual(['a']);
  expect([...hiddenLabels([candidate('b'), candidate('a')], viewport)]).toEqual(
    ['b'],
  );
});
test('always-show obstacles, four-pixel margins and viewport clipping are explicit', () => {
  const fixed = { ...candidate('fixed'), mode: 'allow' as const };
  expect([
    ...hiddenLabels([fixed, candidate('high', 100, 100)], viewport),
  ]).toEqual(['high']);
  expect(
    hiddenLabels([candidate('a'), candidate('b', 204)], viewport).size,
  ).toBe(0);
  expect(
    hiddenLabels([candidate('a'), candidate('b', 203.9)], viewport).size,
  ).toBe(1);
  expect([
    ...hiddenLabels(
      [candidate('outside', -100), candidate('inside', 0)],
      viewport,
    ),
  ]).toEqual(['outside']);
  expect([
    ...hiddenLabels(
      [
        { ...fixed, bounds: { ...fixed.bounds, x: -100 } },
        candidate('inside', 0),
      ],
      viewport,
    ),
  ]).toEqual([]);
});
test('rotated and scaled bounds follow the same explicit transform origin as CSS', () => {
  const transformed = transformLabelBounds(
    { x: 100, y: 200, width: 80, height: 20 },
    { x: 140, y: 210 },
    { scale: 2, rotation: 90, offsetX: 10, offsetY: -5 },
  );
  expect(transformed.x).toBeCloseTo(130);
  expect(transformed.y).toBeCloseTo(125);
  expect(transformed.width).toBeCloseTo(40);
  expect(transformed.height).toBeCloseTo(160);
});
test('moving labels select identically through repeated and reverse time order', () => {
  const at = (time: number) =>
    hiddenLabels(
      [candidate('stationary', 100, 60), candidate('moving', 100 + 200 * time)],
      viewport,
    );
  const first = [0, 0.5, 1].map((time) => [...at(time)]);
  expect([1, 0.5, 0].map((time) => [...at(time)])).toEqual(
    [...first].reverse(),
  );
  expect([...at(0)]).toEqual(['moving']);
  expect([...at(1)]).toEqual([]);
});
