import { test, expect } from 'vitest';
import { createDemo, migrateProject } from '@animatemap/project-schema';
import { evaluateProjectAt } from './index';
import { distance } from '@turf/turf';
import { modelFixture } from '../../project-schema/src/models.fixture';
import { addModelLayer } from '../../../apps/web/src/modelOperations';
test('geodesic model motion/follow uses scene-local length, shortest heading and dateline interpolation; repeated/nonsequential seeks remain identical', () => {
  const p = createDemo();
  p.scenes[0]!.startSeconds = 2;
  p.scenes[0]!.durationSeconds = 10;
  p.scenes[0]!.camera.keyframes = p.scenes[0]!.camera.keyframes.filter(
    (k) => k.time <= 10,
  );
  for (const l of p.scenes[0]!.layers) {
    l.timeRange.end = 10;
    l.tracks.reveal = l.tracks.reveal.filter((k) => k.time <= 10);
  }
  addModelLayer(
    p,
    p.scenes[0]!.id,
    modelFixture(),
    { lng: 179.9, lat: 0, zoom: 17, bearing: 0, pitch: 55 },
    'model',
  );
  const model = p.scenes[0]!.layers.at(-1)!;
  if (model.type !== 'model') throw new Error('Expected model');
  model.motion = {
    type: 'path',
    coordinates: [
      [179.9, 0],
      [-179.9, 0],
    ],
    alignHeading: true,
  };
  model.tracks.motionProgress = [
    { time: 0, value: 0, easing: 'linear' },
    { time: 10, value: 1, easing: 'linear' },
  ];
  model.altitude = 1000;
  model.tracks.rotation = [
    { time: 0, value: 350, easing: 'linear' },
    { time: 10, value: 10, easing: 'linear' },
  ];
  p.scenes[0]!.camera.follow = {
    layerId: 'model',
    zoom: 17,
    pitch: 55,
    bearingMode: 'heading',
    bearing: 20,
  };
  const valid = migrateProject(p);
  const middle = evaluateProjectAt(valid, 7),
    pose = middle.layers.at(-1)!.modelPose!;
  expect(Math.abs(pose.coordinates[0])).toBeCloseTo(180, 6);
  expect(pose.heading).toBeCloseTo(90, 6);
  expect(pose.altitude).toBe(1000);
  expect(middle.camera).toMatchObject({
    lng: pose.coordinates[0],
    lat: pose.coordinates[1],
    zoom: 17,
    pitch: 55,
    bearing: 110,
    targetAltitudeAboveGround: 1000,
  });
  const a = evaluateProjectAt(valid, 2).layers.at(-1)!.modelPose!,
    b = evaluateProjectAt(valid, 12).layers.at(-1)!.modelPose!;
  expect(distance(a.coordinates, b.coordinates)).toBeLessThan(23);
  for (const t of [2, 12, 7, 9, 7, 2])
    expect(evaluateProjectAt(valid, t)).toEqual(evaluateProjectAt(valid, t));
  expect(p.scenes[0]!.layers.at(-1)!.transform.rotation).toBe(0);
});
