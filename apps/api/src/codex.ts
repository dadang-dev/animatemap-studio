import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  stat,
  lstat,
  rm,
  writeFile,
} from 'node:fs/promises';
import {
  dirname,
  basename,
  isAbsolute,
  join,
  resolve,
  delimiter,
} from 'node:path';
import { randomUUID } from 'node:crypto';
import { StringDecoder } from 'node:string_decoder';
import {
  migrateProject,
  projectProposalJsonSchema,
  projectProposalSchema,
  proposalRequestSchema,
  type Project,
} from '@animatemap/project-schema';
import { normalizeProposal, proposalContext } from './proposals';

const disabledFeatures = [
  'shell_tool',
  'unified_exec',
  'multi_agent',
  'multi_agent_v2',
  'plugins',
  'remote_plugin',
  'apps',
  'browser_use',
  'browser_use_external',
  'computer_use',
  'in_app_browser',
  'image_generation',
  'view_image',
  'sleep_tool',
  'hooks',
  'skill_search',
  'workspace_dependencies',
  'code_mode_host',
  'shell_snapshot',
];
export function codexArguments(
  directory: string,
  schema: string,
  output: string,
) {
  return [
    '--no-daemon',
    '-a',
    'never',
    ...disabledFeatures.flatMap((name) => ['--disable', name]),
    '-c',
    'web_search="disabled"',
    'exec',
    '--ignore-user-config',
    '--ignore-rules',
    '--ephemeral',
    '--skip-git-repo-check',
    '--sandbox',
    'read-only',
    '--cd',
    directory,
    '--color',
    'never',
    '--output-schema',
    schema,
    '--output-last-message',
    output,
    '--json',
    '-',
  ];
}
export function codexEnvironment(): NodeJS.ProcessEnv {
  const allowed = [
    'PATH',
    'SystemRoot',
    'SYSTEMROOT',
    'WINDIR',
    'COMSPEC',
    'TEMP',
    'TMP',
    'LOCALAPPDATA',
    'APPDATA',
    'USERPROFILE',
    'HOME',
    'CODEX_HOME',
    'HTTPS_PROXY',
    'HTTP_PROXY',
    'NO_PROXY',
    'SSL_CERT_FILE',
    'SSL_CERT_DIR',
  ];
  return Object.fromEntries(
    allowed
      .filter((key) => process.env[key] !== undefined)
      .map((key) => [key, process.env[key]]),
  );
}
export async function discoverCodex() {
  const configured = process.env.ANIMATEMAP_CODEX_PATH;
  if (configured) {
    if (!isAbsolute(configured))
      throw new Error(
        'ANIMATEMAP_CODEX_PATH must be an absolute executable path',
      );
    await access(configured);
    return configured;
  }
  const binary = process.platform === 'win32' ? 'codex.exe' : 'codex';
  for (const directory of (process.env.PATH ?? '')
    .split(delimiter)
    .filter(Boolean)) {
    const candidate = join(directory, binary);
    try {
      await access(candidate);
      if ((await stat(candidate)).isFile()) return candidate;
    } catch {
      /* Continue discovery without reading account files. */
    }
  }
  if (process.env.LOCALAPPDATA && process.platform === 'win32') {
    const directory = join(process.env.LOCALAPPDATA, 'OpenAI', 'Codex', 'bin');
    try {
      const entries = (
        await readdir(directory, { withFileTypes: true })
      ).filter(
        (entry) => entry.isDirectory() && /^[a-f0-9]{16,64}$/.test(entry.name),
      );
      const candidates = await Promise.all(
        entries.map(async (entry) => {
          const path = join(directory, entry.name, binary);
          try {
            return { path, mtime: (await stat(path)).mtimeMs };
          } catch {
            return null;
          }
        }),
      );
      const selected = candidates
        .filter((c): c is { path: string; mtime: number } => !!c)
        .sort((a, b) => b.mtime - a.mtime)[0];
      if (selected) return selected.path;
    } catch {
      /* No bundled installation. */
    }
  }
  throw new Error(
    'Codex CLI is unavailable. Install/sign in to Codex, or configure ANIMATEMAP_CODEX_PATH; no separate API key is required',
  );
}
type SpawnCodex = (
  command: string,
  args: string[],
  options: { cwd: string; env: NodeJS.ProcessEnv },
) => ChildProcessWithoutNullStreams;
export async function removeCodexRun(root: string, directory: string) {
  const actual = resolve(directory);
  if (
    dirname(actual) !== resolve(root) ||
    !/^run-[A-Za-z0-9]+$/.test(basename(actual))
  )
    throw new Error('Unsafe Codex temporary path');
  const entry = await lstat(actual);
  if (entry.isSymbolicLink() || !entry.isDirectory())
    throw new Error('Unsafe Codex temporary directory');
  await rm(actual, {
    recursive: true,
    force: true,
    maxRetries: 3,
    retryDelay: 100,
  });
}
export class CodexError extends Error {
  constructor(
    message: string,
    public statusCode = 400,
  ) {
    super(message);
  }
}
export class CodexService {
  private active: {
    id: string;
    controller: AbortController;
    child: ChildProcessWithoutNullStreams | null;
  } | null = null;
  constructor(
    private root: string,
    private discover = discoverCodex,
    private launch: SpawnCodex = (command, args, options) =>
      spawn(command, args, {
        ...options,
        shell: false,
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe'],
      }),
    private timeoutMs = 120000,
  ) {
    this.root = resolve(root);
  }
  async status() {
    try {
      await this.discover();
      return {
        available: true,
        busy: !!this.active,
        provider: 'Codex CLI',
        model: 'Installed CLI default',
        requiresSeparateApiKey: false,
      };
    } catch {
      return {
        available: false,
        busy: !!this.active,
        provider: 'Codex CLI',
        model: 'Installed CLI default',
        requiresSeparateApiKey: false,
      };
    }
  }
  cancel(id?: string) {
    if (this.active && (!id || id === this.active.id)) {
      this.active.controller.abort(
        new CodexError('Codex generation cancelled; project unchanged', 409),
      );
      return true;
    }
    return false;
  }
  async generate(input: {
    prompt: unknown;
    project: unknown;
    generationId?: unknown;
  }) {
    const request = proposalRequestSchema.parse({
      ...input,
      generationId: input?.generationId ?? randomUUID(),
    });
    const original = migrateProject(request.project),
      prompt = request.prompt;
    if (this.active)
      throw new CodexError(
        'A Codex proposal is already running; cancel it or wait',
        409,
      );
    const active = {
      id: request.generationId,
      controller: new AbortController(),
      child: null as ChildProcessWithoutNullStreams | null,
    };
    this.active = active;
    const started = performance.now();
    let directory = '';
    const timeout = setTimeout(
      () =>
        active.controller.abort(
          new CodexError(
            'Codex generation timed out after two minutes; retry a smaller request',
            504,
          ),
        ),
      this.timeoutMs,
    );
    const kill = () => {
      if (active.child && !active.child.killed) active.child.kill('SIGKILL');
    };
    active.controller.signal.addEventListener('abort', kill, { once: true });
    try {
      const executable = await this.discover();
      active.controller.signal.throwIfAborted();
      await mkdir(this.root, { recursive: true });
      directory = await mkdtemp(join(this.root, 'run-'));
      const schema = join(directory, 'schema.json'),
        output = join(directory, 'proposal.json');
      await writeFile(schema, JSON.stringify(projectProposalJsonSchema));
      active.controller.signal.throwIfAborted();
      const child = this.launch(
        executable,
        codexArguments(directory, schema, output),
        { cwd: directory, env: codexEnvironment() },
      );
      active.child = child;
      let stdoutBytes = 0,
        stderrBytes = 0,
        partial = '',
        usage: Record<string, number> = {};
      const decoder = new StringDecoder('utf8');
      const forbidden = new Set([
        'command_execution',
        'mcp_tool_call',
        'web_search',
        'file_change',
        'function_call',
        'tool_call',
        'collab_tool_call',
        'image_generation',
        'browser_action',
      ]);
      const allowedItems = new Set(['agent_message', 'reasoning', 'error']);
      const acceptLine = (line: string) => {
        let event: {
          type?: string;
          item?: { type?: string };
          usage?: Record<string, unknown>;
        };
        try {
          event = JSON.parse(line);
        } catch {
          return;
        }
        if (
          forbidden.has(event.type ?? '') ||
          forbidden.has(event.item?.type ?? '') ||
          (event.item?.type && !allowedItems.has(event.item.type))
        )
          active.controller.abort(
            new CodexError(
              'Codex attempted an unsupported tool action; proposal discarded',
              502,
            ),
          );
        if (event.type === 'turn.completed' && event.usage)
          usage = Object.fromEntries(
            Object.entries(event.usage).filter(
              (entry): entry is [string, number] =>
                typeof entry[1] === 'number' &&
                Number.isFinite(entry[1]) &&
                entry[1] >= 0,
            ),
          );
      };
      child.stdout.on('data', (chunk: Buffer) => {
        stdoutBytes += chunk.length;
        if (stdoutBytes > 512 * 1024) {
          active.controller.abort(
            new CodexError(
              'Codex output exceeded 512 KiB; proposal discarded',
              502,
            ),
          );
          return;
        }
        partial += decoder.write(chunk);
        let newline = partial.indexOf('\n');
        while (newline >= 0) {
          acceptLine(partial.slice(0, newline));
          partial = partial.slice(newline + 1);
          newline = partial.indexOf('\n');
        }
      });
      child.stderr.on('data', (chunk: Buffer) => {
        stderrBytes += chunk.length;
        if (stderrBytes > 64 * 1024)
          active.controller.abort(
            new CodexError(
              'Codex diagnostic output exceeded its limit; proposal discarded',
              502,
            ),
          );
      });
      child.stdin.on('error', () => {
        /* Process exit/close provides an actionable error; never log prompt/account data. */
      });
      const closed = new Promise<number | null>((ok, no) => {
        child.once('error', () =>
          no(
            new CodexError(
              'Codex executable could not start; check local installation',
              503,
            ),
          ),
        );
        child.once('close', ok);
      });
      const context = proposalContext(original, prompt);
      child.stdin.end(
        `You generate AnimateMap Studio JSON proposals. No tools, commands, browsing, files, external messages or executable content. Use only the supplied country/place references. Marker/route IDs must exist in the catalog. Routes are illustrative geographic connections, never driving routes. Do not invent historical borders or polygon geometry. If unsupported, supported=false with empty scenes and explain. Camera/layer times are scene-local and within duration; camera keys strictly ordered. Return only schema JSON.\nVerified context: ${JSON.stringify(context)}\nUser request: ${prompt}`,
      );
      const code = await closed;
      partial += decoder.end();
      acceptLine(partial);
      active.controller.signal.throwIfAborted();
      if (code !== 0)
        throw new CodexError(
          'Codex failed to generate a proposal. Check CLI sign-in/network and retry; project unchanged',
          502,
        );
      let value: unknown;
      try {
        const file = await lstat(output);
        if (!file.isFile() || file.isSymbolicLink() || file.size > 128 * 1024)
          throw new Error('Invalid proposal file');
        value = JSON.parse(
          (await readFile(output, 'utf8')).replace(/^\uFEFF/, ''),
        );
      } catch {
        throw new CodexError(
          'Codex returned missing, oversized or malformed JSON; project unchanged',
          502,
        );
      }
      let project: Project,
        proposal: ReturnType<typeof projectProposalSchema.parse>;
      try {
        proposal = projectProposalSchema.parse(value);
        project = normalizeProposal(proposal, original);
      } catch (error) {
        throw new CodexError(
          error instanceof Error &&
            error.message.startsWith('Codex cannot support')
            ? error.message
            : 'Codex returned invalid timing, coordinates or source references; proposal discarded',
          502,
        );
      }
      return {
        generationId: active.id,
        project,
        summary: proposal.summary,
        proposal,
        provider: {
          name: 'Codex CLI',
          model: 'Installed CLI default',
          toolCalls: 0,
          elapsedMs: Math.round(performance.now() - started),
          usage,
        },
      };
    } finally {
      clearTimeout(timeout);
      active.controller.signal.removeEventListener('abort', kill);
      try {
        if (directory) await removeCodexRun(this.root, directory);
      } finally {
        if (this.active === active) this.active = null;
      }
    }
  }
}
