import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Project, RenderJob } from '@animatemap/project-schema';
export type RenderOptions = {
  project: Project;
  format: 'mp4' | 'png';
  frameIndex?: number;
  directory: string;
  webURL: string;
  signal: AbortSignal;
  onProgress: (state: RenderJob['state'], progress: number) => void;
};
export async function renderProject(options: RenderOptions) {
  const { project, format, directory, signal, onProgress } = options;
  const url = new URL(options.webURL);
  if (url.hostname !== '127.0.0.1' || url.protocol !== 'http:')
    throw new Error('Render server must be local HTTP on 127.0.0.1');
  if (
    format === 'mp4' &&
    (project.canvas.width % 2 || project.canvas.height % 2)
  )
    throw new Error('H.264 requires even canvas dimensions');
  const frames = join(directory, 'frames');
  await mkdir(frames, { recursive: true });
  await writeFile(
    join(directory, 'snapshot.json'),
    JSON.stringify(project, null, 2),
  );
  const output = join(directory, `output.${format}`);
  const start = performance.now();
  const browser = await chromium.launch({
    headless: true,
    args: ['--enable-unsafe-swiftshader'],
  });
  const cancel = () => {
    void browser.close();
  };
  signal.addEventListener('abort', cancel, { once: true });
  try {
    signal.throwIfAborted();
    const page = await browser.newPage({
      viewport: { width: project.canvas.width, height: project.canvas.height },
      deviceScaleFactor: 1,
    });
    await page.route('**/*', async (route) => {
      const requestURL = new URL(route.request().url());
      if (
        requestURL.origin === url.origin ||
        ['blob:', 'data:'].includes(requestURL.protocol)
      )
        await route.continue();
      else await route.abort('blockedbyclient');
    });
    await page.goto(`${url.origin}/render`, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });
    await page.waitForFunction(() => !!window.renderStudio);
    await page.evaluate(async (project) => {
      await Promise.race([
        window.renderStudio!.load(project),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error('Renderer initialization timed out')),
            20000,
          ),
        ),
      ]);
    }, project);
    const count =
      format === 'png'
        ? 1
        : Math.ceil(project.durationSeconds * project.canvas.fps);
    for (let i = 0; i < count; i++) {
      signal.throwIfAborted();
      const index = format === 'png' ? (options.frameIndex ?? 0) : i;
      for (let attempt = 0; ; attempt++) {
        try {
          await page.evaluate(
            (index) => window.renderStudio!.frame(index),
            index,
          );
          break;
        } catch (e) {
          if (attempt >= 1 || signal.aborted) throw e;
        }
      }
      await page.screenshot({
        path:
          format === 'png'
            ? output
            : join(frames, `${String(i).padStart(6, '0')}.png`),
        type: 'png',
        animations: 'disabled',
      });
      onProgress('rendering', ((i + 1) / count) * 0.9);
    }
    if (format === 'mp4') {
      onProgress('encoding', 0.92);
      signal.throwIfAborted();
      await runFFmpeg(
        [
          '-y',
          '-framerate',
          String(project.canvas.fps),
          '-i',
          join(frames, '%06d.png'),
          '-frames:v',
          String(count),
          '-c:v',
          'libx264',
          '-preset',
          'fast',
          '-crf',
          '18',
          '-pix_fmt',
          'yuv420p',
          '-movflags',
          '+faststart',
          output,
        ],
        signal,
      );
    }
    signal.throwIfAborted();
    await writeFile(
      join(directory, 'report.json'),
      JSON.stringify(
        {
          frames: count,
          width: project.canvas.width,
          height: project.canvas.height,
          fps: project.canvas.fps,
          elapsedMs: performance.now() - start,
          attribution: project.map.attribution,
          pipeline: 'Chromium fixed-frame → FFmpeg libx264',
        },
        null,
        2,
      ),
    );
    onProgress('completed', 1);
    return output;
  } catch (e) {
    await rm(output, { force: true });
    throw e;
  } finally {
    signal.removeEventListener('abort', cancel);
    await browser.close();
    await rm(frames, { recursive: true, force: true });
  }
}
export function runFFmpeg(args: string[], signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.env.FFMPEG_PATH ?? 'ffmpeg', args, {
      shell: false,
      windowsHide: true,
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    let stderr = '';
    child.stderr.on('data', (chunk: Buffer) => {
      stderr = (stderr + chunk.toString()).slice(-8000);
    });
    const abort = () => child.kill('SIGKILL');
    const timeout = setTimeout(abort, 180000);
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
    const clean = () => {
      clearTimeout(timeout);
      signal.removeEventListener('abort', abort);
    };
    child.on('error', (e) => {
      clean();
      reject(new Error(`FFmpeg unavailable: ${e.message}`));
    });
    child.on('exit', (code) => {
      clean();
      if (signal.aborted) reject(new Error('Render cancelled'));
      else if (code === 0) resolve();
      else reject(new Error(`FFmpeg failed (${code}): ${stderr}`));
    });
  });
}
