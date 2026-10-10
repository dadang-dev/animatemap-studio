import Fastify from 'fastify';
import { JsonRepository } from './repository';
import { resolve } from 'node:path';
export function createApp(directory = resolve('.local/projects')) {
  const app = Fastify({ bodyLimit: 5 * 1024 * 1024 });
  app.get('/api/health', async () => ({ status: 'ok', schemaVersion: 1 }));
  const repository = new JsonRepository(directory);
  app.setErrorHandler((error, _request, reply) => {
    const e = error as Error & { code?: string };
    void reply.code(e.code === 'ENOENT' ? 404 : 400).send({ error: e.message });
  });
  app.get('/api/projects', async () => repository.list());
  app.get<{ Params: { id: string } }>('/api/projects/:id', async (request) =>
    repository.read(request.params.id),
  );
  app.post('/api/projects', async (request) => repository.save(request.body));
  app.delete<{ Params: { id: string } }>(
    '/api/projects/:id',
    async (request) => {
      await repository.delete(request.params.id);
      return { deleted: true };
    },
  );
  return app;
}
