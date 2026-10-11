import { test, expect } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from './app';
import {
  createDemo,
  layerSchema,
  admin1Reference,
} from '@animatemap/project-schema';
test('Admin 1 references persist atomically and invalid source identifiers never create jobs or overwrite projects', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'ams-admin1-')),
    app = createApp(directory);
  try {
    const project = createDemo();
    project.map.admin1Countries = ['VNM'];
    project.scenes[0]!.layers.push(
      layerSchema.parse({
        ...project.scenes[0]!.layers[0],
        id: 'regions',
        type: 'admin1Highlight',
        regionCodes: [
          [...admin1Reference].find(([, country]) => country === 'VNM')![0],
        ],
      }),
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
    const invalid = structuredClone(project),
      layer = invalid.scenes[0]!.layers.at(-1)!;
    if (layer.type !== 'admin1Highlight') throw new Error('Unexpected layer');
    layer.regionCodes = ['../invented-region'];
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
    await rm(directory, { recursive: true, force: true });
  }
});
