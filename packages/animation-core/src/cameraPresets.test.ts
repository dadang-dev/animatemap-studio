import { expect, test } from 'vitest';
import { createDemo, cameraTrackSchema } from '@animatemap/project-schema';
import { createCameraPreset, evaluateProjectAt, wrap } from './index';
const camera = { lng: 179, lat: 21, zoom: 5, bearing: 170, pitch: 20 };

test('orbit encodes a complete rotation as bounded short arcs', () => {
  const keys = createCameraPreset('orbit', camera, 12);
  expect(keys).toHaveLength(9);
  expect(cameraTrackSchema.parse(keys)).toEqual(keys);
  let angle = 0;
  for (let index = 1; index < keys.length; index++) {
    const step = wrap(
      keys[index]!.value.bearing - keys[index - 1]!.value.bearing,
    );
    expect(step).toBe(45);
    angle += step;
  }
  expect(angle).toBe(360);
  expect(keys[0]!.time).toBe(0);
  expect(keys.at(-1)!.time).toBe(12);
  expect(keys.at(-1)!.value.bearing).toBe(camera.bearing);
});
test('sweep crosses the dateline by the short path with repeatable seeks', () => {
  const project = createDemo();
  project.scenes[0]!.camera.keyframes = createCameraPreset(
    'sweep',
    camera,
    12,
    6,
  );
  const middle = evaluateProjectAt(project, 6);
  expect(middle.camera.lng).toBe(179);
  expect(evaluateProjectAt(project, 12).camera.lng).toBe(-178);
  expect(evaluateProjectAt(project, 9).camera.lng).toBeCloseTo(-179.5);
  expect(evaluateProjectAt(project, 6)).toEqual(middle);
});
test('bounce and fly-to retain camera bounds and do not mutate their inputs', () => {
  const original = structuredClone(camera);
  const bounce = createCameraPreset('bounce', { ...camera, zoom: 17.8 }, 3, 4);
  expect(bounce.map((key) => key.value.zoom)).toEqual([17.8, 18, 16.8, 17.8]);
  expect(cameraTrackSchema.parse(bounce)).toEqual(bounce);
  const from = { ...camera, lng: -179, zoom: 1 };
  const fly = createCameraPreset('flyTo', camera, 12, undefined, from);
  expect(fly[0]!.value).toEqual(from);
  expect(fly[1]!.value).toEqual(camera);
  fly[0]!.value.lng = 50;
  expect(from.lng).toBe(-179);
  expect(camera).toEqual(original);
});
test('preset builders reject invalid times, amounts and camera values', () => {
  expect(() => createCameraPreset('orbit', camera, 0)).toThrow('duration');
  expect(() => createCameraPreset('orbit', camera, 301)).toThrow('duration');
  expect(() => createCameraPreset('orbit', camera, 12, NaN)).toThrow('finite');
  expect(() => createCameraPreset('orbit', camera, 12, 361)).toThrow('angle');
  expect(() => createCameraPreset('sweep', camera, 12, 31)).toThrow('span');
  expect(() => createCameraPreset('bounce', camera, 12, 0)).toThrow('amount');
  expect(() =>
    createCameraPreset('orbit', { ...camera, lat: Infinity }, 12),
  ).toThrow();
});
