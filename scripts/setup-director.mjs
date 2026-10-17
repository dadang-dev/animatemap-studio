import { mkdir, readFile, writeFile, copyFile, access } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
const root = resolve('.'),
  base = join(root, '.local/integrations'),
  sources = JSON.parse(await readFile('integrations/upstreams.json', 'utf8'));
const run = (exe, args, options = {}) => {
  const r = spawnSync(exe, args, {
    shell: false,
    windowsHide: true,
    encoding: 'utf8',
    ...options,
  });
  if (r.status !== 0)
    throw Error(
      (r.stderr ?? r.error?.message ?? 'Command failed').slice(0, 1600),
    );
  return r.stdout.trim();
};
const exists = async (p) => {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
};
const ownedWrite = async (path, value) => {
  if (await exists(path)) {
    if (
      (await readFile(path, 'utf8')).replace(/\r\n/g, '\n') !==
      value.replace(/\r\n/g, '\n')
    )
      throw Error('Preserving changed local adapter: ' + path);
  } else {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, value);
  }
};
await mkdir(join(base, 'repos'), { recursive: true });
for (const [name, source] of Object.entries(sources)) {
  const target = join(base, 'repos', name),
    git = (...args) =>
      run('git', ['-c', 'safe.directory=' + target, '-C', target, ...args], {
        env: { ...process.env, GIT_LFS_SKIP_SMUDGE: '1' },
      });
  if (!(await exists(join(target, '.git')))) {
    run(
      'git',
      [
        '-c',
        'core.longpaths=true',
        'clone',
        '--depth',
        '1',
        '--filter=blob:none',
        '--sparse',
        source.url,
        target,
      ],
      { env: { ...process.env, GIT_LFS_SKIP_SMUDGE: '1' } },
    );
    git('remote', 'rename', 'origin', 'upstream');
    git('fetch', '--depth', '1', 'upstream', source.commit);
    git('checkout', '-b', 'codex/animatemap-local', source.commit);
  }
  if (git('remote', 'get-url', 'upstream') !== source.url)
    throw Error('Unexpected upstream ' + name);
  git('merge-base', '--is-ancestor', source.commit, 'HEAD');
  git('config', 'core.longpaths', 'true');
  const patterns =
    name === 'hyperframes'
      ? '/*\n!/*/\n/animatemap/\n/packages/\n/skills/\n/docs/\n!/packages/**/tests/\n!/packages/**/__fixtures__/\n'
      : '/*\n!/*/\n/scripts/\n/references/\n/examples/\n';
  run(
    'git',
    [
      '-c',
      'safe.directory=' + target,
      '-C',
      target,
      'sparse-checkout',
      'set',
      '--no-cone',
      '--stdin',
    ],
    { input: patterns, env: { ...process.env, GIT_LFS_SKIP_SMUDGE: '1' } },
  );
  const local = await readFile(
    'integrations/' +
      name +
      '/' +
      (name === 'hyperframes' ? 'run.mjs' : 'animatemap-director.mjs'),
    'utf8',
  );
  await ownedWrite(
    join(
      target,
      name === 'hyperframes' ? 'animatemap/run.mjs' : 'animatemap-director.mjs',
    ),
    local,
  );
  await ownedWrite(
    join(target, 'ANIMATEMAP_LOCAL.md'),
    `# AnimateMap local edition\n\nUpstream: ${source.url}\nPinned source: ${source.commit}\nLicense: ${source.license} (original LICENSE retained).\n\nSee ../../../../integrations/README.md. Local Codex plans visual shots only; HyperFrames renders authored HTML. No Atlas key is needed in this local workflow. Original Atlas generation remains opt-in and is not emulated.\n`,
  );
  if (name === 'vox-director') {
    const file = join(target, 'AGENTS.md'),
      original = await readFile(file, 'utf8');
    if (!original.includes('## AnimateMap local edition'))
      await writeFile(
        file,
        original +
          '\n## AnimateMap local edition\n\nThe user requested Codex instead of Atlas for this local fork. Default to `node animatemap-director.mjs plan|compose`; see ANIMATEMAP_LOCAL.md. The Atlas-key prerequisite and paid generation stages apply only when the user explicitly selects the legacy Atlas workflow. Codex produces validated shot-plan JSON, not image/video/TTS API jobs. Preserve narration and review the visual plan before applying a new creative cut.\n',
      );
  }
  console.log(name + ' local fork ready at ' + target);
}
await mkdir(join(base, 'runtime'), { recursive: true });
for (const f of ['package.json', 'package-lock.json'])
  await copyFile(
    join(root, 'integrations/runtime', f),
    join(base, 'runtime', f),
  );
if (
  !(await exists(
    join(base, 'runtime/node_modules/hyperframes/bin/hyperframes.mjs'),
  ))
) {
  const candidates = [
    process.env.ANIMATEMAP_NPM_CLI,
    join(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js'),
    resolve(
      dirname(process.execPath),
      '../lib/node_modules/npm/bin/npm-cli.js',
    ),
    '/usr/share/nodejs/npm/bin/npm-cli.js',
  ].filter(Boolean);
  let cli;
  for (const p of candidates)
    if (await exists(p)) {
      cli = p;
      break;
    }
  if (!cli)
    throw Error('Set ANIMATEMAP_NPM_CLI to the absolute npm-cli.js path');
  run(
    process.execPath,
    [
      cli,
      'ci',
      '--prefix',
      join(base, 'runtime'),
      '--ignore-scripts',
      '--no-fund',
      '--no-audit',
    ],
    {
      env: {
        ...process.env,
        PUPPETEER_SKIP_DOWNLOAD: 'true',
        PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '1',
      },
    },
  );
}
console.log(
  'Pinned runtime ready. Existing source modifications and generated videos are preserved.',
);
