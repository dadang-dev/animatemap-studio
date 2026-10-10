import { expect, test } from 'vitest';
import { createDemo, migrateProject } from '@animatemap/project-schema';
import { createAnimationStyle, evaluateProjectAt } from './index';

test('pop uses base transform and opacity, stays deterministic, and does not mutate input', () => {
  const project = createDemo();
  const marker = project.scenes[0]!.layers.find(
    (layer) => layer.type === 'marker',
  )!;
  marker.opacity = 0.6;
  marker.timeRange = { start: 2, end: 8 };
  marker.transform = { scale: 2, rotation: 50, offsetX: 34, offsetY: -20 };
  marker.tracks.offsetX = [
    { time: 0, value: 10, easing: 'linear' },
    { time: 12, value: 30, easing: 'linear' },
  ];
  Object.assign(marker.tracks, createAnimationStyle(marker, 'pop', 1));
  const before = JSON.stringify(project);
  const at = (time: number) =>
    evaluateProjectAt(project, time).layers.find(
      (layer) => layer.id === marker.id,
    )!;
  expect(at(2).opacity).toBe(0);
  expect(at(2).transform.scale).toBe(0.2);
  expect(at(2.7).transform.scale).toBeCloseTo(2.3);
  expect(at(3).transform.scale).toBe(2);
  expect(at(3).opacity).toBe(0.6);
  expect(at(3).transform.offsetX).toBe(15);
  expect(at(3).transform.rotation).toBe(50);
  expect(at(2.5)).toEqual(at(2.5));
  expect(JSON.stringify(project)).toBe(before);
  expect(migrateProject(project)).toEqual(project);
});

test('fade, slide and draw styles produce ordered scene-local keys within layer bounds', () => {
  const project = createDemo();
  const title = project.scenes[0]!.layers.find(
    (layer) => layer.type === 'text',
  )!;
  title.timeRange = { start: 3, end: 4 };
  const both = createAnimationStyle(title, 'fadeInOut', 1).opacity!;
  expect(both.map((key) => key.time)).toEqual([3, 3.5, 4]);
  expect(both.map((key) => key.value)).toEqual([0, 1, 0]);
  title.transform.offsetY = -30;
  expect(
    createAnimationStyle(title, 'slideUp', 0.5).offsetY!.map(
      (key) => key.value,
    ),
  ).toEqual([34, -30]);
  expect(
    createAnimationStyle(title, 'fadeOut', 0.5).opacity!.map((key) => key.time),
  ).toEqual([3.5, 4]);
  const route = project.scenes[0]!.layers.find(
    (layer) => layer.type === 'route',
  )!;
  expect(
    createAnimationStyle(route, 'draw', 2).reveal!.map((key) => key.value),
  ).toEqual([0, 1]);
  expect(() => createAnimationStyle(route, 'pop', 1)).toThrow(
    'does not support',
  );
  expect(() => createAnimationStyle(title, 'slideUp', NaN)).toThrow('duration');
  expect(() => createAnimationStyle(title, 'fadeIn', 2)).toThrow('duration');
});

test('transform tracks reject invalid values, scene bounds, and unsupported vector layers', () => {
  const project = createDemo();
  const title = project.scenes[0]!.layers.find(
    (layer) => layer.type === 'text',
  )!;
  title.tracks.scale = [{ time: 0, value: 11, easing: 'linear' }];
  expect(() => migrateProject(project)).toThrow();
  title.tracks.scale = [{ time: 13, value: 1, easing: 'linear' }];
  expect(() => migrateProject(project)).toThrow('exceeds');
  title.tracks.scale = [];
  project.scenes[0]!.layers[0]!.tracks.offsetY = [
    { time: 0, value: 10, easing: 'linear' },
  ];
  expect(() => migrateProject(project)).toThrow('overlay');
});
