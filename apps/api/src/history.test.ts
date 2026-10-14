import { test, expect } from 'vitest';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join, dirname, basename } from 'node:path';
import { createApp } from './app';
import {
  createDemo,
  historicalManifestSchema,
} from '@animatemap/project-schema';
import { addHistoricalLayer } from '../../web/src/historyOperations';
async function dispose(directory: string) {
  if (
    dirname(resolve(directory)) !== resolve(tmpdir()) ||
    !basename(directory).startsWith('ams-history-')
  )
    throw new Error('Unsafe historical cleanup');
  await rm(directory, {
    recursive: true,
    force: true,
    maxRetries: 3,
    retryDelay: 100,
  });
}
test('historical project persists original geometry atomically and invalid refs/topology cannot overwrite it or enqueue exports', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'ams-history-')),
    app = createApp(directory);
  try {
    const dataset = historicalManifestSchema.parse(
      JSON.parse(
        await readFile(
          'apps/web/public/data/history/dc-wards-1982-2011.json',
          'utf8',
        ),
      ),
    ).dataset;
    const project = createDemo();
    addHistoricalLayer(
      project,
      project.scenes[0]!.id,
      dataset,
      true,
      'history',
    );
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/projects',
          payload: project,
        })
      ).statusCode,
    ).toBe(200);
    const broken = structuredClone(project);
    broken.historicalDatasets[0]!.epochs[0]!.features[0]!.geometry = {
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [1, 1],
          [0, 1],
          [1, 0],
          [0, 0],
        ],
      ],
    };
    for (const invalid of [{ ...project, historicalDatasets: [] }, broken]) {
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
          await app.inject({
            method: 'GET',
            url: `/api/projects/${project.id}`,
          })
        ).json(),
      ).toEqual(project);
    }
  } finally {
    await app.close();
    await dispose(directory);
  }
});
