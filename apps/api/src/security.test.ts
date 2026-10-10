import { expect, test } from 'vitest';
import { createApp } from './app';
import { createDemo } from '@animatemap/project-schema';
import { JobQueue } from './jobs';
test('API rejects hostile origins, hosts, provider URLs and oversized projects', async () => {
  const app = createApp();
  try {
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/projects',
          headers: { origin: 'https://evil.example' },
          payload: createDemo(),
        })
      ).statusCode,
    ).toBe(403);
    expect(
      (
        await app.inject({
          method: 'GET',
          url: '/api/health',
          headers: { host: 'evil.example' },
        })
      ).statusCode,
    ).toBe(403);
    const project = createDemo();
    const body = {
      ...project,
      map: {
        ...project.map,
        providerId: 'http://169.254.169.254/latest/meta-data',
      },
    };
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/jobs',
          payload: { project: body, format: 'mp4' },
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/projects',
          payload: { name: 'x'.repeat(6 * 1024 * 1024) },
        })
      ).statusCode,
    ).toBe(413);
  } finally {
    await app.close();
  }
});
test('queue limits active work and rejects invalid frames/even dimensions', () => {
  const queue = new JobQueue(
    '.local/security',
    async () => new Promise(() => {}),
  );
  const p = createDemo();
  for (let i = 0; i < 5; i++) queue.create(p, 'mp4');
  expect(() => queue.create(p, 'mp4')).toThrow('queue full');
  queue.stop();
  const other = new JobQueue('.local/security', async () =>
    Promise.resolve('output'),
  );
  expect(() => other.create(p, 'png', 9999)).toThrow('Frame index');
  p.canvas.width = 1919;
  expect(() => other.create(p, 'mp4')).toThrow('even');
});
