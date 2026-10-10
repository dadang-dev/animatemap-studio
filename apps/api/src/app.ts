import Fastify from 'fastify';
import { JsonRepository } from './repository';
import { resolve } from 'node:path';
import { dirname, join } from 'node:path';
import { createReadStream } from 'node:fs';
import { JobQueue } from './jobs';
export function createApp(directory = resolve('.local/projects')) {
  const app = Fastify({ bodyLimit: 5 * 1024 * 1024 });
  app.addHook('onRequest', async (request, reply) => {
    if (!['127.0.0.1', 'localhost'].includes(request.hostname))
      return reply.code(403).send({ error: 'Local host required' });
    const origin = request.headers.origin;
    if (
      origin &&
      ![
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5174',
        'http://127.0.0.1:3001',
      ].includes(origin)
    )
      return reply.code(403).send({ error: 'Untrusted origin' });
    reply.header('X-Content-Type-Options', 'nosniff');
  });
  app.get('/api/health', async () => ({ status: 'ok', schemaVersion: 1 }));
  const repository = new JsonRepository(directory);
  const jobs = new JobQueue(join(dirname(directory), 'renders'));
  app.addHook('onClose', async () => {
    jobs.stop();
  });
  app.post<{ Body: { project: unknown; format: string; frameIndex?: number } }>(
    '/api/jobs',
    async (request) => {
      const body = request.body;
      if (!body || !['mp4', 'png'].includes(body.format))
        throw new Error('Choose MP4 or PNG');
      return jobs.create(
        body.project,
        body.format as 'mp4' | 'png',
        body.frameIndex,
      );
    },
  );
  app.get<{ Params: { id: string } }>('/api/jobs/:id', async (request) => ({
    ...jobs.get(request.params.id).job,
  }));
  app.post<{ Params: { id: string } }>(
    '/api/jobs/:id/cancel',
    async (request) => jobs.cancel(request.params.id),
  );
  app.post<{ Params: { id: string } }>('/api/jobs/:id/retry', async (request) =>
    jobs.retry(request.params.id),
  );
  app.get<{ Params: { id: string } }>(
    '/api/jobs/:id/download',
    async (request, reply) => {
      const e = jobs.get(request.params.id);
      if (e.job.state !== 'completed' || !e.output)
        return reply.code(409).send({ error: 'Render is not complete' });
      reply.header(
        'Content-Disposition',
        `attachment; filename="animatemap-${e.job.id}.${e.job.format}"`,
      );
      reply.type(e.job.format === 'mp4' ? 'video/mp4' : 'image/png');
      return reply.send(createReadStream(e.output));
    },
  );
  app.setErrorHandler((error, _request, reply) => {
    const e = error as Error & { code?: string; statusCode?: number };
    void reply
      .code(
        e.statusCode ??
          (e.code === 'ENOENT' || e.message === 'Render job not found'
            ? 404
            : 400),
      )
      .send({ error: e.message });
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
