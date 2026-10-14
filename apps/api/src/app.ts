import Fastify from 'fastify';
import { JsonRepository } from './repository';
import { resolve } from 'node:path';
import { dirname, join } from 'node:path';
import { createReadStream } from 'node:fs';
import { JobQueue } from './jobs';
import { GeographyService } from './geography';
import { CodexService } from './codex';
import { collaborationRoutes } from './collaborationRoutes';
import {
  CURRENT_SCHEMA_VERSION,
  exportFormatSchema,
  exportFormats,
  MAX_PROJECT_BODY_BYTES,
} from '@animatemap/project-schema';
export function createApp(
  directory = resolve('.local/projects'),
  geography = new GeographyService(),
  codex = new CodexService(join(dirname(directory), 'ai')),
) {
  const app = Fastify({ bodyLimit: MAX_PROJECT_BODY_BYTES });
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
    if (request.url.startsWith('/api/shared'))
      reply.header('Cache-Control', 'no-store');
  });
  app.get('/api/health', async () => ({
    status: 'ok',
    schemaVersion: CURRENT_SCHEMA_VERSION,
  }));
  const repository = new JsonRepository(directory);
  const jobs = new JobQueue(join(dirname(directory), 'renders'));
  app.addHook('onClose', async () => {
    jobs.stop();
    geography.cancel();
    codex.cancel();
  });
  app.get('/api/ai/status', async () => codex.status());
  app.post<{
    Body: { prompt: unknown; project: unknown; generationId?: string };
  }>('/api/ai/propose', async (request) => {
    const aborted = () => {
      if (request.body?.generationId) codex.cancel(request.body.generationId);
    };
    request.raw.once('aborted', aborted);
    try {
      return await codex.generate(request.body);
    } finally {
      request.raw.removeListener('aborted', aborted);
    }
  });
  app.post<{ Body: { generationId?: string } }>(
    '/api/ai/cancel',
    { bodyLimit: 1024 },
    async (request) => {
      const id = request.body?.generationId;
      if (!id || !/^[a-f0-9-]{36}$/i.test(id))
        throw new Error('Generation identifier required');
      return { cancelled: codex.cancel(id) };
    },
  );
  app.get('/api/geography/status', async () => geography.status());
  app.post('/api/geography/configure', { bodyLimit: 2048 }, async (request) =>
    geography.configure(request.body),
  );
  app.delete('/api/geography/configure', async () => geography.clear());
  app.post('/api/geography/cancel', async () => {
    geography.cancel();
    return { cancelled: true };
  });
  app.post('/api/geography/search', { bodyLimit: 2048 }, async (request) =>
    geography.search(request.body),
  );
  app.post('/api/geography/route', { bodyLimit: 4096 }, async (request) =>
    geography.route(request.body),
  );
  app.post<{ Body: { project: unknown; format: string; frameIndex?: number } }>(
    '/api/jobs',
    async (request) => {
      const body = request.body;
      if (!body) throw new Error('Render request required');
      return jobs.create(
        body.project,
        exportFormatSchema.parse(body.format),
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
      reply.type(exportFormats[e.job.format].mime);
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
  collaborationRoutes(app, join(dirname(directory), 'collaboration'));
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
