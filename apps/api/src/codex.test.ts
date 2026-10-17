import { test, expect, vi } from 'vitest';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { mkdtemp, writeFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, resolve, basename } from 'node:path';
import { randomUUID } from 'node:crypto';
import { CodexService, codexArguments, codexEnvironment } from './codex';
import { createApp } from './app';
import { GeographyService } from './geography';
import { createDemo } from '@animatemap/project-schema';
import { proposalFixture } from '../../../packages/project-schema/src/proposals.fixture';
import { directorFixture } from '../../../packages/project-schema/src/director.fixture';

// A real owned child process implements CLI protocol failure cases; it never counts as live Codex.
async function harness(mode = 'normal', timeout = 3000) {
  const directory = await mkdtemp(join(tmpdir(), 'animatemap-codex-test-')),
    root = join(directory, 'runs'),
    helper = join(directory, 'fixture-cli.mjs');
  await writeFile(
    helper,
    `import { writeFile } from 'node:fs/promises';
const mode=process.argv[2],args=process.argv.slice(3),output=args[args.indexOf('--output-last-message')+1];
let prompt='';for await(const chunk of process.stdin)prompt+=chunk.toString();
if(!prompt.includes(mode.startsWith('director')?'Project context:':'Verified context:')||!prompt.includes('User request:'))process.exit(8);
if(mode==='slow'){setInterval(()=>{},1000);}else if(mode==='failure'){process.stderr.write('private diagnostic should not enter API');process.exit(3);}else{
let proposal=${JSON.stringify(proposalFixture)};
if(mode.startsWith('director'))proposal=${JSON.stringify(directorFixture(createDemo()))};
if(mode==='director-invalid')proposal.shots[0].assetIds=['missing'];
if(mode==='invalid')proposal.scenes[0].camera[0].time=50;
if(mode==='unsupported'){proposal.supported=false;proposal.scenes=[];proposal.summary='Historical geometry unavailable';}
await writeFile(output,mode==='bad-json'?'{oops':mode==='big-file'?' '.repeat(130*1024):JSON.stringify(proposal));
if(mode==='oversize')process.stdout.write('x'.repeat(600*1024));
else if(mode==='tool')console.log(JSON.stringify({type:'item.started',item:{type:'command_execution',command:'not executed; protocol fixture'}}));
else console.log(JSON.stringify({type:'turn.completed',usage:{input_tokens:100,output_tokens:50}}));
}`,
  );
  let child: ChildProcessWithoutNullStreams | null = null,
    recorded: {
      command: string;
      args: string[];
      env: NodeJS.ProcessEnv;
    } | null = null;
  const launch = (
    command: string,
    args: string[],
    options: { cwd: string; env: NodeJS.ProcessEnv },
  ) => {
    recorded = { command, args, env: options.env };
    child = spawn(process.execPath, [helper, mode, ...args], {
      ...options,
      shell: false,
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return child;
  };
  const service = new CodexService(
    root,
    async () => process.execPath,
    launch,
    timeout,
  );
  return {
    service,
    root,
    get child() {
      return child;
    },
    get recorded() {
      return recorded;
    },
    async dispose() {
      service.cancel();
      if (child && child.exitCode === null && !child.killed) child.kill();
      if (
        dirname(resolve(directory)) !== resolve(tmpdir()) ||
        !basename(directory).startsWith('animatemap-codex-test-')
      )
        throw new Error('Unsafe fixture cleanup');
      await rm(directory, {
        recursive: true,
        force: true,
        maxRetries: 3,
        retryDelay: 100,
      });
    },
  };
}
test('shell-free read-only ephemeral arguments disable tools and restrict inherited environment; discovery failure is explicit', async () => {
  const args = codexArguments(
    'owned-directory',
    'schema.json',
    'proposal.json',
  );
  expect(args).toContain('--no-daemon');
  expect(args).toContain('--ignore-user-config');
  expect(args).toContain('--ignore-rules');
  expect(args).toContain('read-only');
  expect(args).toContain('--ephemeral');
  expect(args).toContain('never');
  expect(args.join(' ')).toContain('--disable multi_agent');
  expect(args.join(' ')).toContain('--disable shell_tool');
  expect(args.join(' ')).toContain('--disable plugins');
  expect(args.join(' ')).toContain('web_search="disabled"');
  expect(args).not.toContain('--model');
  vi.stubEnv('OPENAI_API_KEY', 'test-key-not-to-inherit');
  vi.stubEnv('UNRELATED_SECRET', 'test-private-value');
  try {
    expect(codexEnvironment()).not.toHaveProperty('OPENAI_API_KEY');
    expect(codexEnvironment()).not.toHaveProperty('UNRELATED_SECRET');
  } finally {
    vi.unstubAllEnvs();
  }
  const unavailable = new CodexService(
    join(tmpdir(), 'never-created-codex-root'),
    async () => {
      throw new Error('Codex unavailable');
    },
  );
  expect((await unavailable.status()).available).toBe(false);
  await expect(
    unavailable.generate({ prompt: 'test', project: createDemo() }),
  ).rejects.toThrow('unavailable');
  expect((await unavailable.status()).busy).toBe(false);
});
test('actual protocol subprocess returns validated normalized JSON, never mutates the original and removes only owned run files', async () => {
  const h = await harness();
  try {
    const project = createDemo(),
      before = JSON.stringify(project),
      result = await h.service.generate({
        prompt: 'A two-second Vietnam reference map',
        project,
      });
    expect(JSON.stringify(project)).toBe(before);
    expect(result.project.name).toBe(proposalFixture.title);
    expect(result.provider.toolCalls).toBe(0);
    expect(result.provider.usage.output_tokens).toBe(50);
    expect(h.recorded?.command).toBe(process.execPath);
    expect(h.recorded?.args.at(-1)).toBe('-');
    expect(await readdir(h.root)).toEqual([]);
    expect((await h.service.status()).busy).toBe(false);
  } finally {
    await h.dispose();
  }
});
test('JSON/file/stream limits, unsupported content, tool attempts and nonzero exits discard proposals and clean owned directories', async () => {
  for (const [mode, message] of [
    ['bad-json', 'malformed JSON'],
    ['big-file', 'oversized'],
    ['invalid', 'invalid timing'],
    ['unsupported', 'cannot support'],
    ['oversize', '512 KiB'],
    ['tool', 'tool action'],
    ['failure', 'failed to generate'],
  ] as const) {
    const h = await harness(mode);
    try {
      await expect(
        h.service.generate({
          prompt: 'Authored protocol fixture',
          project: createDemo(),
        }),
      ).rejects.toThrow(message);
      expect(await readdir(h.root)).toEqual([]);
      expect((await h.service.status()).busy).toBe(false);
    } finally {
      await h.dispose();
    }
  }
});
test('single active invocation, scoped cancellation and bounded timeout terminate the real owned subprocess and clean up', async () => {
  for (const mode of ['cancel', 'timeout']) {
    const h = await harness('slow', mode === 'timeout' ? 500 : 3000),
      id = randomUUID();
    try {
      const promise = h.service.generate({
        prompt: 'A reference map',
        project: createDemo(),
        generationId: id,
      });
      // Attach rejection handler before asynchronous cancellation/deadline.
      const failure = expect(promise).rejects.toThrow(
        mode === 'cancel' ? 'cancelled' : 'timed out',
      );
      await expect.poll(() => h.child !== null, { timeout: 1500 }).toBe(true);
      await expect(
        h.service.generate({
          prompt: 'another proposal',
          project: createDemo(),
        }),
      ).rejects.toThrow('already running');
      expect(h.service.cancel(randomUUID())).toBe(false);
      expect((await h.service.status()).busy).toBe(true);
      if (mode === 'cancel') expect(h.service.cancel(id)).toBe(true);
      await failure;
      expect(h.child?.killed).toBe(true);
      expect(await readdir(h.root)).toEqual([]);
      expect((await h.service.status()).busy).toBe(false);
    } finally {
      await h.dispose();
    }
  }
});
test('API proposal validation/review is read-only; saved projects survive provider and input failures', async () => {
  const h = await harness(),
    app = createApp(
      join(h.root, 'projects'),
      new GeographyService(),
      h.service,
    );
  try {
    const project = createDemo();
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/projects',
          payload: project,
        })
      ).statusCode,
    ).toBe(200);
    const response = await app.inject({
      method: 'POST',
      url: '/api/ai/propose',
      payload: {
        prompt: 'A reference composition',
        project,
        generationId: randomUUID(),
      },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().project.name).toBe(proposalFixture.title);
    expect(
      (
        await app.inject({ method: 'GET', url: `/api/projects/${project.id}` })
      ).json(),
    ).toEqual(project);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/ai/propose',
          payload: { prompt: 'x', project },
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (await app.inject({ method: 'POST', url: '/api/ai/cancel', payload: {} }))
        .statusCode,
    ).toBe(400);
    expect(
      (
        await app.inject({ method: 'GET', url: `/api/projects/${project.id}` })
      ).json(),
    ).toEqual(project);
  } finally {
    await app.close();
    await h.dispose();
  }
});

test('director endpoint uses restricted Codex runner, validates asset references and leaves projects unchanged', async () => {
  for (const mode of ['director', 'director-invalid']) {
    const h = await harness(mode),
      app = createApp(h.root, new GeographyService(), h.service),
      p = createDemo(),
      before = JSON.stringify(p);
    try {
      const response = await app.inject({
        method: 'POST',
        url: '/api/director/plan',
        payload: {
          project: p,
          prompt: 'Plan visual shots only',
          generationId: randomUUID(),
        },
      });
      expect(response.statusCode).toBe(mode === 'director' ? 200 : 502);
      if (mode === 'director') {
        expect(response.json().plan).toEqual(directorFixture(p));
        expect(response.json().provider.toolCalls).toBe(0);
        expect(response.json().project).toBeUndefined();
      }
      expect(JSON.stringify(p)).toBe(before);
      expect(await readdir(h.root)).toEqual([]);
    } finally {
      await app.close();
      await h.dispose();
    }
  }
});
