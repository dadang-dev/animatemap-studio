import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test, expect } from 'vitest';
import { createDemo } from '@animatemap/project-schema';
import { createApp } from './app';
test('counter and pinned imagery persist; invalid counter cannot overwrite a saved project', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ams-population-'));
  const app = createApp(dir);
  try {
    const p = createDemo();
    p.map.basemap = 'blue-marble';
    const l = p.scenes[0]!.layers.find((l) => l.type === 'text')!;
    if (l.type !== 'text') throw Error('Expected text');
    l.counter = {
      from: 0,
      to: 345,
      start: 0,
      end: 1,
      decimals: 0,
      locale: 'vi-VN',
      easing: 'easeOut',
    };
    expect(
      (await app.inject({ method: 'POST', url: '/api/projects', payload: p }))
        .statusCode,
    ).toBe(200);
    expect((await app.inject(`/api/projects/${p.id}`)).json()).toEqual(p);
    const invalid = structuredClone(p);
    const text = invalid.scenes[0]!.layers.find((l) => l.type === 'text')!;
    if (text.type === 'text') text.counter!.end = 100;
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/projects',
          payload: invalid,
        })
      ).statusCode,
    ).toBe(400);
    expect((await app.inject(`/api/projects/${p.id}`)).json()).toEqual(p);
  } finally {
    await app.close();
    await rm(dir, { recursive: true, force: true });
  }
});
