import { test, expect } from 'vitest';
import { mkdtemp, readFile, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, basename, resolve } from 'node:path';
import { createApp } from './app';
import { AccountService } from './accounts';
import { SharedProjects } from './sharedProjects';
import { atomicJSON, boundedJSON } from './sharedStorage';
import { randomUUID } from 'node:crypto';
import { createDemo } from '@animatemap/project-schema';
import { historicalManifestSchema } from '@animatemap/project-schema';
import { addHistoricalLayer } from '../../web/src/historyOperations';
import { type SharedDocument } from '@animatemap/project-schema/collaboration';
async function cleanup(directory: string) {
  if (
    dirname(resolve(directory)) !== resolve(tmpdir()) ||
    !basename(directory).startsWith('ams-collaboration-')
  )
    throw new Error('Unsafe collaboration cleanup');
  await rm(directory, {
    recursive: true,
    force: true,
    maxRetries: 3,
    retryDelay: 100,
  });
}
test('shared document and byte quotas reject atomically, keeping prior files and clearing owned temporary files', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'ams-collaboration-'));
  try {
    const accounts = new AccountService(join(directory, 'accounts')),
      projects = new SharedProjects(join(directory, 'documents'), accounts),
      owner = { id: randomUUID(), username: 'quota_owner' },
      project = createDemo();
    let first;
    for (let i = 0; i < 30; i++) {
      const saved = await projects.create(owner, project);
      first ??= saved;
    }
    await expect(projects.create(owner, project)).rejects.toThrow(
      'document limit',
    );
    expect(await projects.get(owner, first!.id)).toEqual(first);
    const target = join(directory, 'bounded.json');
    await atomicJSON(target, { intact: true }, 32);
    await expect(
      atomicJSON(target, { value: 'x'.repeat(100) }, 32),
    ).rejects.toThrow('byte limit');
    expect(await boundedJSON(target, 32)).toEqual({ intact: true });
    await expect(boundedJSON(target, 2)).rejects.toThrow('byte limit');
    expect(
      (await readdir(join(directory, 'documents'))).some((file) =>
        file.endsWith('.tmp'),
      ),
    ).toBe(false);
  } finally {
    await cleanup(directory);
  }
}, 20000);
test('actual salted hashes and hashed tokens persist across restart, expire/logout correctly, and queue/rate/input limits reject abuse', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'ams-collaboration-'));
  try {
    let now = 1000000;
    const service = new AccountService(directory, () => now),
      password = 'Authored-test-password-123';
    const a = await service.credentials(
      { username: 'Alice', password },
      true,
      'fixture-client',
    );
    const b = await service.credentials(
      { username: 'Bob', password },
      true,
      'fixture-client',
    );
    const persisted = await readFile(join(directory, 'accounts.json'), 'utf8'),
      raw = JSON.parse(persisted);
    expect(persisted).not.toContain(password);
    expect(persisted).not.toContain(a.token);
    expect(raw.users[0].salt).not.toBe(raw.users[1].salt);
    expect(raw.users[0].hash).not.toBe(raw.users[1].hash);
    expect(
      await new AccountService(directory, () => now).authenticate(a.token),
    ).toEqual(a.account);
    await expect(
      service.credentials(
        { username: 'alice', password: 'Incorrect-test-password' },
        false,
        'fixture-client',
      ),
    ).rejects.toThrow('Invalid account');
    await expect(
      service.credentials(
        { username: 'nobody', password },
        false,
        'fixture-client',
      ),
    ).rejects.toThrow('Invalid account');
    await service.logout(a.token);
    await expect(service.authenticate(a.token)).rejects.toThrow(
      'Session expired',
    );
    now += 8 * 24 * 60 * 60 * 1000;
    await expect(service.authenticate(b.token)).rejects.toThrow(
      'Session expired',
    );
    await expect(
      service.credentials(
        { username: '../bad', password },
        true,
        'fixture-client',
      ),
    ).rejects.toThrow();
    const burst = await Promise.allSettled(
      Array.from({ length: 10 }, () =>
        service.credentials({ username: 'bob', password }, false, 'rate-test'),
      ),
    );
    expect(
      burst.filter((result) => result.status === 'rejected').length,
    ).toBeGreaterThan(0);
    expect(
      (await readdir(directory)).some((file) => file.endsWith('.tmp')),
    ).toBe(false);
  } finally {
    await cleanup(directory);
  }
}, 20000);
test('role-protected real API persists source JSON, serializes revision conflicts and protects saved documents from revoked viewers/invalid updates/restart', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'ams-collaboration-'));
  let app = createApp(join(directory, 'local'));
  try {
    async function register(username: string) {
      const response = await app.inject({
        method: 'POST',
        url: '/api/shared/register',
        payload: { username, password: 'Authored-test-password-123' },
      });
      expect(response.statusCode).toBe(200);
      expect(response.headers['set-cookie']).toContain('HttpOnly');
      return String(response.headers['set-cookie']).split(';')[0]!;
    }
    const owner = await register('owner'),
      editor = await register('editor'),
      viewer = await register('viewer');
    const call = (
      cookie: string,
      method: 'GET' | 'POST' | 'PUT' | 'DELETE',
      url: string,
      payload?: unknown,
    ) =>
      app.inject({
        method,
        url,
        headers: { cookie, 'content-type': 'application/json' },
        ...(payload === undefined ? {} : { payload: JSON.stringify(payload) }),
      });
    expect(
      (await app.inject({ method: 'GET', url: '/api/shared/projects' }))
        .statusCode,
    ).toBe(401);
    const project = createDemo();
    const historical = historicalManifestSchema.parse(
      JSON.parse(
        await readFile(
          'apps/web/public/data/history/dc-wards-1982-2011.json',
          'utf8',
        ),
      ),
    );
    addHistoricalLayer(
      project,
      project.scenes[0]!.id,
      historical.dataset,
      true,
      'shared-history',
    );
    const created = await call(owner, 'POST', '/api/shared/projects', project);
    expect(created.statusCode).toBe(200);
    let document = created.json() as SharedDocument;
    expect(
      (await call(viewer, 'GET', `/api/shared/projects/${document.id}`))
        .statusCode,
    ).toBe(404);
    for (const [username, role] of [
      ['editor', 'editor'],
      ['viewer', 'viewer'],
    ]) {
      const response = await call(
        owner,
        'PUT',
        `/api/shared/projects/${document.id}/members`,
        { revision: document.revision, username, role },
      );
      expect(response.statusCode).toBe(200);
      document = response.json();
    }
    expect(
      (
        await call(viewer, 'PUT', `/api/shared/projects/${document.id}`, {
          revision: document.revision,
          project,
        })
      ).statusCode,
    ).toBe(403);
    expect(
      (
        await call(
          editor,
          'PUT',
          `/api/shared/projects/${document.id}/members`,
          { revision: document.revision, username: 'owner', role: null },
        )
      ).statusCode,
    ).toBe(403);
    const revision = document.revision;
    const results = await Promise.all([
      call(owner, 'PUT', `/api/shared/projects/${document.id}`, {
        revision,
        project: { ...project, name: 'Owner edit' },
      }),
      call(editor, 'PUT', `/api/shared/projects/${document.id}`, {
        revision,
        project: { ...project, name: 'Editor edit' },
      }),
    ]);
    expect(results.map((result) => result.statusCode).sort()).toEqual([
      200, 409,
    ]);
    document = results.find((result) => result.statusCode === 200)!.json();
    expect(document.project.historicalDatasets).toEqual(
      project.historicalDatasets,
    );
    expect(
      results.find((result) => result.statusCode === 409)!.json().document,
    ).toEqual(document);
    const invalid = await call(
      editor,
      'PUT',
      `/api/shared/projects/${document.id}`,
      { revision: document.revision, project: { ...project, scenes: [] } },
    );
    expect(invalid.statusCode).toBe(400);
    expect(
      (await call(owner, 'GET', `/api/shared/projects/${document.id}`)).json(),
    ).toEqual(document);
    await app.close();
    app = createApp(join(directory, 'local'));
    expect(
      (await call(owner, 'GET', `/api/shared/projects/${document.id}`)).json(),
    ).toEqual(document);
    const revoked = await call(
      owner,
      'PUT',
      `/api/shared/projects/${document.id}/members`,
      { revision: document.revision, username: 'editor', role: null },
    );
    expect(revoked.statusCode).toBe(200);
    document = revoked.json();
    expect(
      (await call(editor, 'GET', `/api/shared/projects/${document.id}`))
        .statusCode,
    ).toBe(404);
    expect(
      (
        await call(
          owner,
          'PUT',
          `/api/shared/projects/${document.id}/members`,
          { revision: document.revision, username: 'owner', role: null },
        )
      ).statusCode,
    ).toBe(403);
    expect(
      (
        await call(viewer, 'DELETE', `/api/shared/projects/${document.id}`, {
          revision: document.revision,
        })
      ).statusCode,
    ).toBe(403);
    expect(
      (
        await call(owner, 'DELETE', `/api/shared/projects/${document.id}`, {
          revision: document.revision,
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (await call(owner, 'GET', `/api/shared/projects/${document.id}`))
        .statusCode,
    ).toBe(404);
    const loggedOut = await app.inject({
      method: 'POST',
      url: '/api/shared/logout',
      headers: { cookie: owner },
    });
    expect(loggedOut.statusCode).toBe(200);
    expect(loggedOut.headers['cache-control']).toBe('no-store');
    expect(
      (
        await app.inject({
          method: 'GET',
          url: '/api/shared/session',
          headers: { cookie: owner },
        })
      ).statusCode,
    ).toBe(401);
  } finally {
    await app.close();
    await cleanup(directory);
  }
}, 20000);
