import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
} from 'node:fs';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const root = resolve('.'),
  base = join(root, '.local/portability');
mkdirSync(base, { recursive: true });
const dir = mkdtempSync(join(base, 'unit-'));
const python = join(
    root,
    '.venv-video',
    process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python',
  ),
  cli = join(root, 'skills/animatemap-video/scripts/video_tool.py');
assert.ok(existsSync(python), 'Create the .venv-video environment first');
const call = (args) =>
    spawnSync(python, ['-X', 'utf8', cli, ...args], {
      cwd: root,
      encoding: 'utf8',
      windowsHide: true,
    }),
  sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
test('portable CLI explains commands and rejects missing input', () => {
  assert.equal(call(['--help']).status, 0);
  const p = call(['validate', '--project', join(dir, 'missing')]);
  assert.equal(p.status, 2);
  assert.match(p.stderr, /not found/i);
});
test('starter initializes once, validates, and refuses overwrite', () => {
  const out = join(dir, 'project');
  assert.equal(call(['init', '--output', out]).status, 0);
  assert.equal(call(['validate', '--project', out]).status, 0);
  assert.equal(call(['init', '--output', out]).status, 2);
  assert.ok(existsSync(join(out, 'public/licenses/LICENSE-NOTO-SANS.txt')));
});
test('malformed JSON and unsafe asset paths fail before rendering', () => {
  const out = join(dir, 'project'),
    p = join(out, 'public/project.json'),
    saved = readFileSync(p);
  writeFileSync(p, '{broken');
  assert.equal(call(['validate', '--project', out]).status, 2);
  writeFileSync(p, saved);
  const d = JSON.parse(saved);
  d.audio = '../../outside.wav';
  writeFileSync(p, JSON.stringify(d));
  const bad = call(['validate', '--project', out]);
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /local path/);
  writeFileSync(p, saved);
});
test('PCM mixer matches the original pre-extraction baseline for all stems', () => {
  const fixture = join(root, 'tests/fixtures/video-smoke/audio'),
    out = join(dir, 'audio');
  const p = call([
    'mix',
    '--voice',
    join(fixture, 'voice.wav'),
    '--timeline',
    join(fixture, 'timeline.json'),
    '--output',
    out,
  ]);
  assert.equal(p.status, 0, p.stderr);
  const expected = JSON.parse(readFileSync(join(fixture, 'baseline.json')));
  for (const c of expected.checks)
    assert.equal(sha(join(out, c.file)), c.sha256, c.file);
  assert.equal(
    call([
      'mix',
      '--voice',
      join(fixture, 'voice.wav'),
      '--timeline',
      join(fixture, 'timeline.json'),
      '--output',
      out,
    ]).status,
    2,
  );
});
test('ASR missing input fails locally, without downloading or uploading', () => {
  const p = call([
    'align',
    '--audio',
    join(dir, 'missing.wav'),
    '--script',
    join(dir, 'missing.txt'),
    '--cache-dir',
    join(dir, 'cache'),
    '--output',
    join(dir, 'words.json'),
  ]);
  assert.equal(p.status, 2);
  assert.match(p.stderr, /not found/);
  assert.ok(!existsSync(join(dir, 'words.json')));
});
