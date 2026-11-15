import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtemp, readFile, writeFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'),
  req = createRequire(join(root, 'integrations/remotion/package.json')),
  { PNG } = req('pngjs');
const run = (args) => {
  const p = spawnSync(
    process.execPath,
    [join(root, 'scripts/video-runtime.mjs'), ...args],
    { cwd: root, windowsHide: true, stdio: 'inherit' },
  );
  if (p.status !== 0) throw Error('Smoke step failed: ' + args[0]);
};
try {
  await mkdir(join(root, '.local/portability'), { recursive: true });
  const dir = await mkdtemp(join(root, '.local/portability/smoke-')),
    project = join(dir, 'project'),
    out = join(dir, 'render');
  run(['doctor', '--core-only']);
  run(['init', project]);
  run(['render', project, out]);
  const verification = JSON.parse(
    await readFile(join(out, 'verification.json'), 'utf8'),
  );
  const checks = [];
  for (const frame of [0, 61, 121]) {
    const reference = PNG.sync.read(
        await readFile(
          join(root, 'tests/fixtures/video-smoke/golden', frame + '.png'),
        ),
      ),
      actual = PNG.sync.read(
        await readFile(join(out, 'references', frame + '.png')),
      );
    let sum = 0,
      bad = 0;
    for (let i = 0; i < reference.data.length; i += 4) {
      let worst = 0;
      for (let c = 0; c < 3; c++) {
        const d = Math.abs(reference.data[i + c] - actual.data[i + c]);
        sum += d;
        worst = Math.max(worst, d);
      }
      if (worst > 30) bad++;
    }
    const meanRGB = sum / (1080 * 1920 * 3),
      fractionAbove30 = bad / (1080 * 1920);
    checks.push({
      frame,
      meanRGB,
      fractionAbove30,
      pass: meanRGB < 3 && fractionAbove30 < 0.02,
    });
  }
  const report = {
    pass: verification.pass && checks.every((c) => c.pass),
    goldenChecks: checks,
    output: dir,
    verification: 'render/verification.json',
    scope:
      'Neutral fixture: common map/islands/font/image identity/karaoke/actions, full MP4 decoded references and audio. No paid calls, no real speech or creative-content approval. Not a cross-GPU pixel identity guarantee.',
  };
  await writeFile(
    join(dir, 'smoke-report.json'),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
  if (!report.pass) process.exitCode = 1;
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
}
