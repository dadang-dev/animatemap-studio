import Fastify from 'fastify';
export function createApp() {
  const app = Fastify({ bodyLimit: 5 * 1024 * 1024 });
  app.get('/api/health', async () => ({ status: 'ok', schemaVersion: 1 }));
  return app;
}
