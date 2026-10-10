import { expect, test } from 'vitest';
import { createApp } from './app';
import { CURRENT_SCHEMA_VERSION } from '@animatemap/project-schema';
test('health endpoint returns the schema contract', async () => {
  const app = createApp();
  const result = await app.inject({ method: 'GET', url: '/api/health' });
  expect(result.statusCode).toBe(200);
  expect(result.json()).toEqual({
    status: 'ok',
    schemaVersion: CURRENT_SCHEMA_VERSION,
  });
  await app.close();
});
