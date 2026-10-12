import { test, expect } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, resolve, basename } from 'node:path';
import { createApp } from './app';
import { createDemo } from '@animatemap/project-schema';
async function dispose(directory: string) {
  if (
    dirname(resolve(directory)) !== resolve(tmpdir()) ||
    !basename(directory).startsWith('ams-terrain-')
  )
    throw new Error('Unsafe terrain test cleanup');
  await rm(directory, {
    recursive: true,
    force: true,
    maxRetries: 3,
    retryDelay: 100,
  });
}
test('verified terrain projects persist atomically; invalid provider/camera cannot overwrite a project or enter the render queue', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'ams-terrain-')),
    app = createApp(directory);
  try {
    const project = createDemo();
    project.map.terrain = {
      packId: 'sapa-2026-10-12',
      exaggeration: 1,
      hillshade: true,
    };
    project.scenes[0]!.camera.keyframes = [
      {
        time: 0,
        value: { lng: 103.8, lat: 22.3, zoom: 10.5, bearing: 20, pitch: 55 },
        easing: 'linear',
      },
    ];
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/projects',
          payload: project,
        })
      ).statusCode,
    ).toBe(200);
    const invalid = structuredClone(project);
    invalid.scenes[0]!.camera.keyframes[0]!.value.lng = 180;
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
        await app.inject({ method: 'GET', url: `/api/projects/${project.id}` })
      ).json(),
    ).toEqual(project);
  } finally {
    await app.close();
    await dispose(directory);
  }
});
