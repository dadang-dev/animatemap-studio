import { test, expect } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, resolve, basename } from 'node:path';
import { createApp } from './app';
import { createDemo } from '@animatemap/project-schema';
import { buildingFixture } from '../../../packages/project-schema/src/buildings.fixture';
import { addBuildingLayer } from '../../web/src/buildingOperations';
async function dispose(directory: string) {
  if (
    dirname(resolve(directory)) !== resolve(tmpdir()) ||
    !basename(directory).startsWith('ams-buildings-')
  )
    throw new Error('Unsafe building test cleanup');
  await rm(directory, {
    recursive: true,
    force: true,
    maxRetries: 3,
    retryDelay: 100,
  });
}
test('building geometry/provenance persist atomically; invalid height/topology/ref cannot overwrite saved projects or create render jobs', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'ams-buildings-')),
    app = createApp(directory);
  try {
    const p = createDemo();
    addBuildingLayer(p, p.scenes[0]!.id, buildingFixture(), true, 'building');
    expect(
      (await app.inject({ method: 'POST', url: '/api/projects', payload: p }))
        .statusCode,
    ).toBe(200);
    for (const invalid of [
      { ...p, buildingDatasets: [] },
      {
        ...p,
        buildingDatasets: [
          {
            ...p.buildingDatasets[0],
            records: [{ ...p.buildingDatasets[0]!.records[0], height: -1 }],
          },
        ],
      },
      {
        ...p,
        buildingDatasets: [
          {
            ...p.buildingDatasets[0],
            records: [
              {
                ...p.buildingDatasets[0]!.records[0],
                geometry: {
                  type: 'Polygon',
                  coordinates: [
                    [
                      [10, 20],
                      [11, 21],
                      [11, 20],
                      [10, 20],
                    ],
                  ],
                },
              },
            ],
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
