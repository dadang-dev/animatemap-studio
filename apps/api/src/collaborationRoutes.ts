import type { FastifyInstance, FastifyRequest } from 'fastify';
import { join } from 'node:path';
import { MAX_SHARED_BYTES } from '@animatemap/project-schema/collaboration';
import { AccountService } from './accounts';
import { SharedProjects, SharedConflict } from './sharedProjects';
const cookieName = 'animatemap_session';
function token(request: FastifyRequest) {
  return request.headers.cookie
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`))
    ?.slice(cookieName.length + 1);
}
export function collaborationRoutes(app: FastifyInstance, directory: string) {
  const accounts = new AccountService(join(directory, 'accounts')),
    projects = new SharedProjects(join(directory, 'documents'), accounts);
  const account = (request: FastifyRequest) =>
    accounts.authenticate(token(request));
  const cookie = (value: string, maxAge: number) =>
    `${cookieName}=${value}; Path=/api/shared; HttpOnly; SameSite=Strict; Max-Age=${maxAge}`;
  app.get('/api/shared/session', async (request) => ({
    account: await account(request),
  }));
  for (const action of ['register', 'login'] as const)
    app.post(
      `/api/shared/${action}`,
      { bodyLimit: 2048 },
      async (request, reply) => {
        const session = await accounts.credentials(
          request.body,
          action === 'register',
          request.ip,
        );
        reply.header('Cache-Control', 'no-store');
        reply.header('Set-Cookie', cookie(session.token, 7 * 24 * 60 * 60));
        return { account: session.account };
      },
    );
  app.post('/api/shared/logout', async (request, reply) => {
    await accounts.logout(token(request));
    reply.header('Set-Cookie', cookie('', 0));
    return { loggedOut: true };
  });
  app.get('/api/shared/projects', async (request) =>
    projects.list(await account(request)),
  );
  app.post(
    '/api/shared/projects',
    { bodyLimit: MAX_SHARED_BYTES },
    async (request) => projects.create(await account(request), request.body),
  );
  app.get<{ Params: { id: string } }>(
    '/api/shared/projects/:id',
    async (request) => projects.get(await account(request), request.params.id),
  );
  async function mutation(
    request: FastifyRequest<{ Params: { id: string } }>,
    action: 'update' | 'membership',
    reply: Parameters<Parameters<FastifyInstance['setErrorHandler']>[0]>[2],
  ) {
    try {
      return await projects[action](
        await account(request),
        request.params.id,
        request.body,
      );
    } catch (error) {
      if (error instanceof SharedConflict)
        return reply
          .code(409)
          .send({ error: error.message, document: error.document });
      throw error;
    }
  }
  app.put<{ Params: { id: string } }>(
    '/api/shared/projects/:id',
    { bodyLimit: MAX_SHARED_BYTES },
    async (request, reply) => mutation(request, 'update', reply),
  );
  app.put<{ Params: { id: string } }>(
    '/api/shared/projects/:id/members',
    { bodyLimit: 2048 },
    async (request, reply) => mutation(request, 'membership', reply),
  );
  app.delete<{ Params: { id: string }; Body: { revision?: number } }>(
    '/api/shared/projects/:id',
    { bodyLimit: 1024 },
    async (request, reply) => {
      try {
        return await projects.delete(
          await account(request),
          request.params.id,
          request.body?.revision ?? 0,
        );
      } catch (error) {
        if (error instanceof SharedConflict)
          return reply
            .code(409)
            .send({ error: error.message, document: error.document });
        throw error;
      }
    },
  );
}
