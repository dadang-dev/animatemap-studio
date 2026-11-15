import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join, relative, sep } from 'node:path';
import {
  readFile,
  writeFile,
  readdir,
  mkdir,
  copyFile,
  cp,
  statfs,
  unlink,
  access,
} from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..'),
  runtime = join(repo, 'integrations/remotion'),
  req = createRequire(join(runtime, 'package.json'));
const quality = JSON.parse(
  await readFile(join(repo, 'config/video-quality.json'), 'utf8'),
);
const sha = (b) => createHash('sha256').update(b).digest('hex');
const json = async (p) => {
  try {
    return JSON.parse(await readFile(p, 'utf8'));
  } catch (e) {
    const error = Error('Cannot read JSON ' + p + ': ' + e.message);
    error.code = e.code;
    throw error;
  }
};
const save = async (p, d) => {
  await mkdir(dirname(p), { recursive: true });
  await writeFile(p, JSON.stringify(d, null, 2) + '\n');
};
const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg',
  ffprobe = process.env.FFPROBE_PATH || 'ffprobe';
function run(exe, args, options = {}) {
  const p = spawnSync(exe, args, {
    windowsHide: true,
    shell: false,
    maxBuffer: 256 * 1024 * 1024,
    ...options,
  });
  if (p.status !== 0)
    throw Error(
      `${exe}: ${(p.stderr?.toString() || p.error?.message || 'failed').slice(-1800)}`,
    );
  return p.stdout;
}
async function files(dir) {
  const out = [];
  for (const e of (await readdir(dir, { withFileTypes: true })).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    if (e.isSymbolicLink())
      throw Error('Symlink not allowed in source/assets: ' + e.name);
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await files(p)));
    else out.push(p);
  }
  return out;
}
function validate(d) {
  if (
    d.version !== 1 ||
    typeof d.id !== 'string' ||
    !d.id.match(/^[A-Za-z0-9-]+$/)
  )
    throw Error('Invalid project version/id');
  if (
    d.width !== 1080 ||
    d.height !== 1920 ||
    d.fps !== 30 ||
    !(d.duration > 0 && d.duration <= quality.maxDurationSeconds)
  )
    throw Error(
      'This profile requires 1080x1920, 30fps and duration in (0,300]',
    );
  if (!Array.isArray(d.scenes) || !d.scenes.length || d.scenes.length > 20)
    throw Error('Expected 1..20 scenes');
  if (
    !Array.isArray(d.map?.center) ||
    d.map.center.length !== 2 ||
    !d.map.center.every(Number.isFinite) ||
    Math.abs(d.map.center[0]) > 180 ||
    Math.abs(d.map.center[1]) > 85.05112878 ||
    !(d.map.widthDegrees > 0 && d.map.widthDegrees <= 360)
  )
    throw Error('Invalid Mercator camera center/widthDegrees');
  let end = 0;
  for (const s of d.scenes) {
    if (s.start !== end || !(s.end > s.start) || typeof s.title !== 'string')
      throw Error('Scenes must be contiguous, ordered and have titles');
    end = s.end;
  }
  if (Math.abs(end - d.duration) > 1e-9)
    throw Error('Scene end differs from project duration');
  for (const c of d.captions ?? []) {
    if (
      !(c.start >= 0 && c.end > c.start && c.end <= d.duration) ||
      !Array.isArray(c.words)
    )
      throw Error('Invalid caption interval');
    for (const w of c.words)
      if (
        !(
          w.startSeconds >= c.start &&
          w.endSeconds > w.startSeconds &&
          w.endSeconds <= c.end
        ) ||
        typeof w.text !== 'string'
      )
        throw Error('Invalid word timing; do not invent word intervals');
  }
  return d;
}
async function checkAssets(project, d) {
  const root = join(project, 'public');
  for (const p of [d.audio, ...d.scenes.map((s) => s.image)].filter(Boolean)) {
    if (
      typeof p !== 'string' ||
      p.includes('://') ||
      !resolve(root, p).startsWith(root + sep)
    )
      throw Error('Asset must be a local path within public/: ' + p);
    await access(resolve(root, p));
  }
  if (d.audio) {
    const probe = JSON.parse(
      run(ffprobe, [
        '-v',
        'error',
        '-show_streams',
        '-of',
        'json',
        resolve(root, d.audio),
      ]),
    );
    const audio = probe.streams.find((s) => s.codec_type === 'audio');
    if (
      !audio ||
      audio.codec_name !== 'pcm_s16le' ||
      +audio.sample_rate !== 48000 ||
      audio.channels !== 2 ||
      Math.abs(+audio.duration - Math.ceil(d.duration * d.fps) / d.fps) >
        0.000021
    )
      throw Error(
        'Master must be stereo PCM16/48kHz WAV with the full exact timeline endpoint; do not truncate or silently pad speech',
      );
  }
  const m = await json(join(repo, 'shared/assets/manifest.json'));
  for (const a of m.assets) {
    if (sha(await readFile(join(repo, 'shared/assets', a.path))) !== a.sha256)
      throw Error('Common asset hash changed: ' + a.path);
  }
}
async function load(project) {
  const d = validate(await json(join(project, 'public/project.json')));
  await checkAssets(project, d);
  return d;
}
function core() {
  try {
    req('./loopback.cjs');
    return {
      renderer: req('@remotion/renderer'),
      bundler: req('@remotion/bundler'),
      PNG: req('pngjs').PNG,
    };
  } catch (e) {
    throw Error(
      'Remotion runtime unavailable; run setup-machine.ps1 or npm ci --prefix integrations/remotion. ' +
        e.message,
    );
  }
}
async function fingerprint(project, browser) {
  const h = createHash('sha256');
  for (const folder of ['src', 'public'])
    for (const p of await files(join(project, folder))) {
      h.update(relative(project, p).split(sep).join('/'));
      h.update(await readFile(p));
    }
  h.update(await readFile(fileURLToPath(import.meta.url)));
  h.update(await readFile(join(runtime, 'package-lock.json')));
  h.update(JSON.stringify(quality));
  h.update(JSON.stringify({ browser, gl: quality.gl }));
  return h.digest('hex');
}
async function bundleProject(project, out) {
  const { bundler } = core();
  const modules = join(runtime, 'node_modules');
  return bundler.bundle({
    entryPoint: join(project, 'src/index.tsx'),
    rootDir: project,
    outDir: out,
    rspack: true,
    rspackOverride: (c) => ({
      ...c,
      resolve: {
        ...c.resolve,
        modules: [modules, ...(c.resolve?.modules ?? ['node_modules'])],
      },
    }),
  });
}
function referenceFrames(d) {
  const n = Math.ceil(d.duration * d.fps),
    set = new Set([0, n - 1]);
  for (const s of d.scenes)
    for (const t of [s.start, s.start + 0.7, (s.start + s.end) / 2, s.end])
      for (const k of [-1, 0, 1]) set.add(Math.round(t * d.fps) + k);
  for (const c of d.captions ?? []) {
    for (const t of [c.start, (c.start + c.end) / 2, c.end])
      for (const k of [-1, 0, 1]) set.add(Math.round(t * d.fps) + k);
    for (const w of c.words) set.add(Math.ceil(w.startSeconds * d.fps));
  }
  return [...set].filter((f) => f >= 0 && f < n).sort((a, b) => a - b);
}
function auditPass(a, d) {
  const t = a?.frame / d.fps,
    expected =
      (d.captions ?? [])
        .find((c) => t >= c.start && t < c.end)
        ?.words.filter((w) => t >= w.startSeconds && t < w.endSeconds)
        .map((w) => w.text) ?? [];
  return (
    a &&
    a.fontReady &&
    a.imagesReady &&
    a.locatorIslands === 77 &&
    a.mainIslands === 77 &&
    a.overflow.length === 0 &&
    !a.captionOverflow &&
    JSON.stringify(a.active) === JSON.stringify(expected)
  );
}
async function init(project) {
  if (existsSync(project))
    throw Error('Output directory already exists; choose a new directory');
  await mkdir(project, { recursive: true });
  await cp(join(repo, 'templates/video-starter'), project, { recursive: true });
  await cp(join(repo, 'shared/video-components'), join(project, 'src/shared'), {
    recursive: true,
  });
  for (const n of ['fonts', 'basemap', 'geo', 'licenses'])
    await cp(join(repo, 'shared/assets', n), join(project, 'public', n), {
      recursive: true,
    });
  await cp(join(repo, 'shared/assets/smoke'), join(project, 'public'), {
    recursive: true,
  });
  await copyFile(
    join(repo, 'shared/assets/manifest.json'),
    join(project, 'public/common-assets-manifest.json'),
  );
  await copyFile(join(runtime, 'package.json'), join(project, 'package.json'));
  await copyFile(
    join(runtime, 'package-lock.json'),
    join(project, 'package-lock.json'),
  );
  console.log(
    JSON.stringify({
      project,
      notes:
        'No dependency junctions, paid calls or personal project media. Shared components are copied so projects remain editable.',
    }),
  );
}
async function doctor() {
  const checks = [];
  for (const [name, exe, args] of [
    ['node', process.execPath, ['--version']],
    ['ffmpeg', ffmpeg, ['-version']],
    ['ffprobe', ffprobe, ['-version']],
  ])
    try {
      checks.push({
        name,
        pass: true,
        version: run(exe, args).toString().split('\n')[0],
      });
    } catch (e) {
      checks.push({ name, pass: false, error: e.message });
    }
  try {
    core();
    const fetcher = req(
      join(
        dirname(req.resolve('@remotion/renderer')),
        'browser/BrowserFetcher.js',
      ),
    );
    const browser = fetcher.getRevisionInfo('headless-shell');
    const actual = fetcher.readVersionFile('headless-shell'),
      expected = fetcher.getExpectedVersion({
        version: null,
        chromeMode: 'headless-shell',
        platform: fetcher.getPlatform(),
      });
    checks.push({
      name: 'remotion',
      pass: req('remotion/package.json').version === '4.0.536',
      version: req('remotion/package.json').version,
    });
    checks.push({
      name: 'browser',
      pass:
        browser.local &&
        existsSync(browser.executablePath) &&
        actual === expected,
      version: actual,
      expected,
      path: browser.executablePath,
    });
  } catch (e) {
    checks.push({ name: 'remotion', pass: false, error: e.message });
  }
  const manifest = await json(join(repo, 'shared/assets/manifest.json'));
  for (const a of manifest.assets)
    checks.push({
      name: 'asset:' + a.path,
      pass:
        sha(await readFile(join(repo, 'shared/assets', a.path))) === a.sha256,
    });
  checks.push({
    name: 'node24+',
    pass: Number(process.versions.node.split('.')[0]) >= 24,
  });
  if (!process.argv.includes('--core-only')) {
    try {
      const { chromium } = createRequire(join(repo, 'package.json'))(
        '@playwright/test',
      );
      const { hyperframesBrowserPath } =
        await import('./hyperframes-browser.mjs');
      const path = hyperframesBrowserPath(chromium);
      checks.push({
        name: 'hyperframes-browser',
        pass: existsSync(path),
        path,
      });
    } catch (e) {
      checks.push({
        name: 'hyperframes-browser',
        pass: false,
        error: e.message,
      });
    }

    for (const [name, src, dst] of [
      [
        'vox-director',
        'integrations/vox-director/animatemap-director.mjs',
        '.local/integrations/repos/vox-director/animatemap-director.mjs',
      ],
      [
        'hyperframes-adapter',
        'integrations/hyperframes/run.mjs',
        '.local/integrations/repos/hyperframes/animatemap/run.mjs',
      ],
    ]) {
      const local = join(repo, dst);
      checks.push({
        name,
        pass:
          existsSync(local) &&
          (await readFile(local, 'utf8')).replaceAll('\r\n', '\n') ===
            (await readFile(join(repo, src), 'utf8')).replaceAll('\r\n', '\n'),
      });
    }
    const h = join(repo, '.local/integrations/runtime/package-lock.json');
    checks.push({
      name: 'hyperframes-runtime-lock',
      pass:
        existsSync(h) &&
        sha(await readFile(h)) ===
          sha(
            await readFile(
              join(repo, 'integrations/runtime/package-lock.json'),
            ),
          ) &&
        existsSync(
          join(
            repo,
            '.local/integrations/runtime/node_modules/hyperframes/bin/hyperframes.mjs',
          ),
        ),
    });
  }
  const report = {
    pass: checks.every((c) => c.pass),
    checks,
    optional: {
      ai33Configured: !!process.env.AI33_API_KEY,
      codex:
        'Install/sign in separately for new AI plans; doctor does not transmit anything.',
    },
    limits:
      'Tests installed tools/assets, not creativity, paid-service availability or GPU portability.',
  };
  console.log(JSON.stringify(report, null, 2));
  if (!report.pass) process.exitCode = 1;
}
async function render(project, out) {
  const d = await load(project),
    n = Math.ceil(d.duration * d.fps),
    { renderer, PNG } = core();
  await mkdir(out, { recursive: true });
  const lock = join(out, 'worker-lock.json');
  let oldLock;
  try {
    oldLock = await json(lock);
  } catch {
    // A missing/stale lock does not own this output directory.
  }
  if (oldLock?.pid && oldLock.pid !== process.pid) {
    let alive = false;
    try {
      process.kill(oldLock.pid, 0);
      alive = true;
    } catch {
      // A dead worker may be resumed from its verified checkpoints.
    }
    if (alive) throw Error('Another render worker owns this directory');
  }
  await save(lock, { pid: process.pid });
  const progress = (stage, extra = {}) =>
    save(join(out, 'progress.json'), {
      stage,
      sourceHash,
      frames: n,
      ...extra,
    });
  const info = await renderer.ensureBrowser(),
    sourceHash = await fingerprint(project, info.path);
  let state = { chunks: [], audits: [], sourceHash };
  try {
    state = await json(join(out, 'checkpoint.json'));
    if (state.sourceHash !== sourceHash)
      throw Error(
        'Output contains a different snapshot; choose another output directory',
      );
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
  const refs = referenceFrames(d);
  await mkdir(join(out, 'references'), { recursive: true });
  await mkdir(join(out, 'frames'), { recursive: true });
  await mkdir(join(out, 'chunks'), { recursive: true });
  for (const c of state.chunks)
    if (sha(await readFile(c.path)) !== c.sha256)
      throw Error('Cached chunk changed');
  const url = await bundleProject(project, join(out, 'bundle'));
  const browser = await renderer.openBrowser('chrome', {
    browserExecutable: info.path,
    chromiumOptions: { gl: quality.gl },
    logLevel: 'error',
  });
  const audits = new Map(),
    errors = [];
  const onBrowserLog = (l) => {
    if (l.text.startsWith('PORTABLE_AUDIT ')) {
      const a = JSON.parse(l.text.slice(15));
      audits.set(a.frame, a);
    } else if (l.type === 'error') errors.push(l.text.slice(0, 500));
  };
  try {
    const composition = await renderer.selectComposition({
      serveUrl: url,
      id: d.id,
      puppeteerInstance: browser,
      onBrowserLog,
      logLevel: 'error',
    });
    for (let start = 0; start < n; start += quality.chunkFrames) {
      if (state.chunks.some((c) => c.start === start)) continue;
      const disk = await statfs(out);
      if (disk.bavail * disk.bsize < quality.minFreeBytes)
        throw Error(
          'Insufficient disk space; keep checkpoints and resume after freeing space',
        );
      const end = Math.min(n, start + quality.chunkFrames),
        frames = Array.from({ length: end - start }, (_, i) => start + i),
        rows = [];
      await progress('rendering', { completed: start });
      await renderer.renderFrames({
        serveUrl: url,
        composition,
        frames,
        concurrency: quality.concurrency,
        puppeteerInstance: browser,
        onBrowserLog,
        imageFormat: 'png',
        outputDir: null,
        logLevel: 'error',
        onFrameBuffer: async (b, f) => {
          await writeFile(
            join(out, 'frames', String(f).padStart(6, '0') + '.png'),
            b,
          );
          if (refs.includes(f))
            await writeFile(join(out, 'references', f + '.png'), b);
          const p = PNG.sync.read(b),
            rgb = Buffer.alloc(p.width * p.height * 3);
          for (let i = 0, j = 0; i < p.data.length; i += 4) {
            if (p.data[i + 3] !== 255) throw Error('Expected opaque output');
            rgb[j++] = p.data[i];
            rgb[j++] = p.data[i + 1];
            rgb[j++] = p.data[i + 2];
          }
          rows.push({ frame: f, rgbSHA256: sha(rgb) });
        },
      });
      for (const f of frames)
        if (!auditPass(audits.get(f), d))
          throw Error('Layout/image/karaoke audit failed at frame ' + f);
      if (errors.length) throw Error(errors.join('\n'));
      rows.sort((a, b) => a.frame - b.frame);
      const chunk = join(out, 'chunks', start + '.mkv');
      run(ffmpeg, [
        '-v',
        'error',
        '-y',
        '-framerate',
        String(d.fps),
        '-start_number',
        String(start),
        '-i',
        join(out, 'frames', '%06d.png'),
        '-frames:v',
        String(frames.length),
        '-an',
        '-c:v',
        'libx264rgb',
        '-crf',
        '0',
        '-preset',
        'veryfast',
        '-threads',
        '2',
        '-pix_fmt',
        'rgb24',
        chunk,
      ]);
      const hashes = run(ffmpeg, [
        '-v',
        'error',
        '-i',
        chunk,
        '-pix_fmt',
        'rgb24',
        '-f',
        'framemd5',
        '-hash',
        'sha256',
        '-',
      ])
        .toString()
        .split('\n')
        .filter((l) => l && !l.startsWith('#'))
        .map((l) => l.split(',').at(-1).trim());
      if (
        hashes.length !== rows.length ||
        hashes.some((h, i) => h !== rows[i].rgbSHA256)
      )
        throw Error('Lossless intermediate proof failed');
      state.chunks.push({
        start,
        end,
        path: chunk,
        sha256: sha(await readFile(chunk)),
        rgbProof: rows,
      });
      state.audits.push(...frames.map((f) => audits.get(f)));
      await save(join(out, 'checkpoint.json'), state);
      for (const f of frames) {
        const p = resolve(out, 'frames', String(f).padStart(6, '0') + '.png');
        if (!p.startsWith(resolve(out, 'frames') + sep))
          throw Error('Invalid temporary frame path');
        await unlink(p);
      }
      console.log(`Frames ${end}/${n}`);
    }
  } finally {
    await browser.close({ silent: true });
  }
  const chunks = state.chunks.sort((a, b) => a.start - b.start),
    concat = join(out, 'concat.txt');
  await writeFile(
    concat,
    chunks
      .map(
        (c) => `file '${c.path.split(sep).join('/').replaceAll("'", "'\\''")}'`,
      )
      .join('\n'),
  );
  await progress('encoding');
  const draft = join(out, 'draft.mp4'),
    enc = quality.encoder;
  run(ffmpeg, [
    '-v',
    'error',
    '-y',
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    concat,
    '-an',
    '-frames:v',
    String(n),
    '-vf',
    'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p',
    '-c:v',
    enc.codec,
    '-preset',
    enc.preset,
    '-crf',
    String(enc.crf),
    '-threads',
    '2',
    '-colorspace',
    'bt709',
    '-color_primaries',
    'bt709',
    '-color_trc',
    'bt709',
    '-color_range',
    'tv',
    '-movflags',
    '+faststart',
    draft,
  ]);
  const output = join(out, 'video.mp4');
  if (d.audio)
    run(ffmpeg, [
      '-v',
      'error',
      '-y',
      '-i',
      draft,
      '-i',
      join(project, 'public', d.audio),
      '-map',
      '0:v:0',
      '-map',
      '1:a:0',
      '-c:v',
      'copy',
      '-c:a',
      'aac',
      '-b:a',
      enc.audioBitrate,
      '-ar',
      String(enc.audioRate),
      '-ac',
      '2',
      '-t',
      String(n / d.fps),
      '-movflags',
      '+faststart',
      output,
    ]);
  else await copyFile(draft, output);
  await save(join(out, 'render-audit.json'), {
    pass: true,
    sourceHash,
    frames: n,
    audits: state.audits,
    referenceFrames: refs,
    browser: info.path,
    profile: quality,
  });
  await progress('rendered');
  await verify(project, out);
  await progress('complete');
  await save(lock, { pid: null });
  console.log(JSON.stringify({ output, pass: true, frames: n }));
}
async function verify(project, out) {
  const d = await load(project),
    { PNG } = core(),
    file = join(out, 'video.mp4'),
    audit = await json(join(out, 'render-audit.json')),
    sourceHash = await fingerprint(project, audit.browser);
  if (sourceHash !== audit.sourceHash || !audit.pass)
    throw Error('Stale source/audit; no verification');
  const probe = JSON.parse(
      run(ffprobe, [
        '-v',
        'error',
        '-count_frames',
        '-show_streams',
        '-show_format',
        '-of',
        'json',
        file,
      ]),
    ),
    v = probe.streams.find((s) => s.codec_type === 'video'),
    a = probe.streams.find((s) => s.codec_type === 'audio'),
    n = Math.ceil(d.duration * d.fps);
  if (
    v.codec_name !== 'h264' ||
    v.width !== d.width ||
    v.height !== d.height ||
    v.pix_fmt !== 'yuv420p' ||
    v.avg_frame_rate !== d.fps + '/1' ||
    +v.nb_read_frames !== n ||
    Math.abs(+v.duration - n / d.fps) > 0.002
  )
    throw Error('Video contract failed');
  const pts = JSON.parse(
    run(ffprobe, [
      '-v',
      'error',
      '-select_streams',
      'v:0',
      '-show_frames',
      '-show_entries',
      'frame=best_effort_timestamp_time',
      '-of',
      'json',
      file,
    ]),
  ).frames;
  if (
    pts.length !== n ||
    pts.some(
      (p, i) =>
        Math.abs(+p.best_effort_timestamp_time - i / d.fps) >
        quality.verification.frameTimeToleranceSeconds,
    )
  )
    throw Error('CFR/PTS failed');
  const bytes = await readFile(file),
    atoms = [];
  for (let i = 0; i < bytes.length; ) {
    let len = bytes.readUInt32BE(i);
    const type = bytes.toString('ascii', i + 4, i + 8);
    if (len === 1) len = Number(bytes.readBigUInt64BE(i + 8));
    if (len === 0) len = bytes.length - i;
    if (len < 8) throw Error('Invalid MP4');
    atoms.push({ type, i });
    i += len;
  }
  if (
    atoms.find((x) => x.type === 'moov').i >
    atoms.find((x) => x.type === 'mdat').i
  )
    throw Error('Missing faststart');
  await mkdir(join(out, 'decoded'), { recursive: true });
  const comparisons = [];
  for (let k = 0; k < audit.referenceFrames.length; k += 40) {
    const batch = audit.referenceFrames.slice(k, k + 40);
    run(ffmpeg, [
      '-v',
      'error',
      '-y',
      '-i',
      file,
      '-vf',
      'select=' + batch.map((f) => `eq(n\\,${f})`).join('+'),
      '-fps_mode',
      'passthrough',
      '-frames:v',
      String(batch.length),
      '-start_number',
      String(k),
      join(out, 'decoded', '%06d.png'),
    ]);
    for (let i = 0; i < batch.length; i++) {
      const x = PNG.sync.read(
          await readFile(join(out, 'references', batch[i] + '.png')),
        ),
        y = PNG.sync.read(
          await readFile(
            join(out, 'decoded', String(k + i).padStart(6, '0') + '.png'),
          ),
        );
      let sum = 0,
        bad = 0;
      for (let j = 0; j < x.data.length; j += 4) {
        let worst = 0;
        for (let c = 0; c < 3; c++) {
          const z = Math.abs(x.data[j + c] - y.data[j + c]);
          sum += z;
          worst = Math.max(worst, z);
        }
        if (worst > 30) bad++;
      }
      const meanRGB = sum / (d.width * d.height * 3),
        fractionAbove30 = bad / (d.width * d.height);
      comparisons.push({
        frame: batch[i],
        meanRGB,
        fractionAbove30,
        pass:
          meanRGB < quality.verification.meanRGB &&
          fractionAbove30 < quality.verification.fractionAbove30,
      });
    }
  }
  let sound = null;
  if (d.audio) {
    if (
      !a ||
      a.codec_name !== 'aac' ||
      +a.sample_rate !== 48000 ||
      a.channels !== 2 ||
      Math.abs(+a.duration - n / d.fps) > 0.002
    )
      throw Error('Audio contract failed');
    const raw = (p) =>
        run(ffmpeg, [
          '-v',
          'error',
          '-i',
          p,
          '-t',
          String(n / d.fps),
          '-vn',
          '-ar',
          '48000',
          '-ac',
          '2',
          '-f',
          'f32le',
          'pipe:1',
        ]),
      x = raw(join(project, 'public', d.audio)),
      y = raw(file);
    if (
      x.length !== y.length ||
      x.length !== Math.round((n / d.fps) * 48000) * 8
    )
      throw Error('Audio sample count mismatch; no silent trim');
    let xx = 0,
      yy = 0,
      xy = 0,
      error = 0,
      clipped = 0;
    for (let i = 0; i < x.length; i += 4) {
      const u = x.readFloatLE(i),
        z = y.readFloatLE(i);
      xx += u * u;
      yy += z * z;
      xy += u * z;
      error += (u - z) ** 2;
      if (Math.abs(z) >= 1) clipped++;
    }
    sound = {
      correlation: xy / Math.sqrt(xx * yy),
      snrDB: 10 * Math.log10(xx / error),
      samples: x.length / 4,
      clipped,
    };
    if (
      !Number.isFinite(sound.correlation) ||
      sound.correlation <= quality.verification.audioCorrelation ||
      sound.snrDB <= quality.verification.audioSNRdB ||
      clipped
    )
      throw Error('Decoded audio comparison failed');
  }
  const pass =
    comparisons.every((c) => c.pass) &&
    audit.audits.length === n &&
    audit.audits.every((a) => auditPass(a, d));
  const report = {
    pass,
    sourceHash,
    frames: n,
    duration: n / d.fps,
    comparisons,
    sound,
    sha256: sha(bytes),
    bytes: bytes.length,
  };
  await save(join(out, 'verification.json'), report);
  if (!pass) throw Error('Decoded image/audit comparison failed');
  console.log(
    JSON.stringify({
      verified: true,
      frames: n,
      references: comparisons.length,
      sha256: report.sha256,
    }),
  );
}
const [command, ...args] = process.argv.slice(2);
try {
  if (command === 'doctor') await doctor();
  else if (command === 'install-browser') {
    const { renderer } = core();
    console.log(JSON.stringify(await renderer.ensureBrowser()));
  } else if (command === 'init') await init(resolve(args[0]));
  else if (command === 'render')
    await render(resolve(args[0]), resolve(args[1]));
  else if (command === 'verify')
    await verify(resolve(args[0]), resolve(args[1]));
  else if (command === 'check-verified') {
    const project = resolve(args[0]),
      out = resolve(args[1]);
    await load(project);
    const a = await json(join(out, 'render-audit.json')),
      v = await json(join(out, 'verification.json'));
    if (
      !v.pass ||
      !a.pass ||
      (await fingerprint(project, a.browser)) !== v.sourceHash ||
      sha(await readFile(join(out, 'video.mp4'))) !== v.sha256
    )
      throw Error('Stale/changed verification or output');
    console.log('Verified snapshot unchanged');
  } else if (command === 'validate') {
    await load(resolve(args[0]));
    console.log('Project valid');
  } else
    throw Error(
      'Use the Python video_tool.py CLI: doctor, init, render, verify, align, mix, package',
    );
} catch (e) {
  console.error('Video tool: ' + e.message);
  process.exitCode = 1;
}
