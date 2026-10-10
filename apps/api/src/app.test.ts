import { expect, test } from 'vitest';
import { createApp } from './app';
test('health endpoint returns the schema contract', async () => {
  const app = createApp();
  const result = await app.inject({ method: 'GET', url: '/api/health' });
  expect(result.statusCode).toBe(200);
  expect(result.json()).toEqual({ status: 'ok', schemaVersion: 4 });
  await app.close();
});
