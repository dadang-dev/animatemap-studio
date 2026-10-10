import { test, expect } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from './app';
import { testDataProject } from '../../../packages/project-schema/src/datasets.fixture';
test('normalized datasets persist atomically and failed references never replace saved projects or create jobs', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'ams-data-'));
  const app = createApp(directory);
  try {
    const project = testDataProject();
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
    invalid.datasets = [];
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
