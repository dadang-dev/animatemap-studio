import { test, expect } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from './app';
import {
  audioFixtureProject,
  toneWav,
} from '../../../packages/project-schema/src/audio.fixture';
import { wavDataUrl } from '@animatemap/project-schema';

test('embedded audio beyond the old request size persists atomically and invalid media cannot overwrite it or create jobs', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'animatemap-audio-api-')),
    app = createApp(join(directory, 'projects'));
  try {
    const project = audioFixtureProject();
    project.audioAssets[0]!.dataUrl = wavDataUrl(toneWav(50));
    expect(JSON.stringify(project).length).toBeGreaterThan(5 * 1024 * 1024);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/projects',
          payload: project,
        })
      ).statusCode,
    ).toBe(200);
    const bad = structuredClone(project);
    bad.audioTracks[0]!.assetId = '../remote';
    expect(
      (await app.inject({ method: 'POST', url: '/api/projects', payload: bad }))
        .statusCode,
    ).toBe(400);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/jobs',
          payload: { project: bad, format: 'mp4' },
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
}, 20000);
