import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { createDemo } from '@animatemap/project-schema';
import { createApp } from './app';
test('atomic project API round trip and path validation', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'animatemap-test-'));
  const app = createApp(dir);
  try {
    const p = createDemo();
    expect(
      (await app.inject({ method: 'POST', url: '/api/projects', payload: p }))
        .statusCode,
    ).toBe(200);
    expect((await app.inject('/api/projects/demo-travel')).json()).toEqual(p);
    expect((await app.inject('/api/projects')).json()).toEqual([
      { id: p.id, name: p.name },
    ]);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/projects',
          payload: { ...p, id: '../escape' },
        })
      ).statusCode,
    ).toBe(400);
    await app.inject({ method: 'DELETE', url: '/api/projects/demo-travel' });
    expect((await app.inject('/api/projects/demo-travel')).statusCode).toBe(
      404,
    );
  } finally {
    await app.close();
    await rm(dir, { recursive: true, force: true });
  }
});
