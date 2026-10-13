import { test, expect } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, resolve, basename } from 'node:path';
import { createApp } from './app';
import { createDemo } from '@animatemap/project-schema';
import { modelFixture } from '../../../packages/project-schema/src/models.fixture';
import { addModelLayer } from '../../web/src/modelOperations';
async function dispose(directory: string) {
  if (
    dirname(resolve(directory)) !== resolve(tmpdir()) ||
    !basename(directory).startsWith('ams-models-')
  )
    throw new Error('Unsafe model test cleanup');
  await rm(directory, {
    recursive: true,
    force: true,
    maxRetries: 3,
    retryDelay: 100,
  });
}
test('model snapshots/follow persist atomically; malformed geometry, missing refs and invalid terrain placement cannot overwrite a project or enter rendering', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'ams-models-')),
    app = createApp(directory);
  try {
    const p = createDemo();
    addModelLayer(
      p,
      p.scenes[0]!.id,
      modelFixture(),
      { lng: 10, lat: 20, zoom: 17, pitch: 55, bearing: 0 },
      'model',
    );
    p.scenes[0]!.camera.follow = {
      layerId: 'model',
      zoom: 17,
      pitch: 55,
      bearingMode: 'heading',
      bearing: 0,
    };
    expect(
      (await app.inject({ method: 'POST', url: '/api/projects', payload: p }))
        .statusCode,
    ).toBe(200);
    const terrainBulge = structuredClone(p);
    terrainBulge.map.terrain = {
      packId: 'sapa-2026-10-12',
      exaggeration: 1,
      hillshade: false,
    };
    terrainBulge.scenes[0]!.camera.follow = null;
    terrainBulge.scenes[0]!.camera.keyframes = [
      {
        time: 0,
        value: { lng: 103.8, lat: 22.3, zoom: 17, pitch: 55, bearing: 0 },
        easing: 'linear',
      },
    ];
    const terrainModel = terrainBulge.scenes[0]!.layers.at(-1)!;
    if (terrainModel.type !== 'model') throw new Error('Expected model');
    terrainModel.motion = {
      type: 'path',
      coordinates: [
        [102.66, 23.2408],
        [104.76, 23.2408],
      ],
      alignHeading: true,
    };
    for (const invalid of [
      terrainBulge,
      { ...p, modelAssets: [] },
      { ...p, modelAssets: [{ ...p.modelAssets[0], triangles: [[0, 1, 99]] }] },
      {
        ...p,
        scenes: [
          {
            ...p.scenes[0],
            camera: {
              ...p.scenes[0]!.camera,
              follow: { ...p.scenes[0]!.camera.follow, layerId: 'unknown' },
            },
          },
        ],
      },
    ]) {
      expect(
        (
          await app.inject({
            method: 'POST',
            url: '/api/projects',
            payload: invalid,
          })
        ).statusCode,
      ).toBe(400);
      expect(
        (
          await app.inject({
            method: 'POST',
            url: '/api/jobs',
            payload: { project: invalid, format: 'mp4' },
          })
        ).statusCode,
      ).toBe(400);
      expect(
        (
          await app.inject({ method: 'GET', url: `/api/projects/${p.id}` })
        ).json(),
      ).toEqual(p);
    }
  } finally {
    await app.close();
    await dispose(directory);
  }
});
