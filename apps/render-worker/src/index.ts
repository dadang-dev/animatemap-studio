import { chromium, type Browser } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type {
  ExportFormat,
  Project,
  RenderJob,
} from '@animatemap/project-schema';
import { encodingSteps, validateExportDimensions } from './encoders';
import { removeTemporaryDirectory } from './cleanup';
import admin1Provenance from '../../../data/admin1/PROVENANCE.json' with { type: 'json' };
import { admin1CountriesForRegions } from '@animatemap/project-schema';
export type RenderOptions = {
  project: Project;
  format: ExportFormat;
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
  validateExportDimensions(format, project.canvas.width, project.canvas.height);
  const outputDirectory = resolve(directory);
  await mkdir(outputDirectory, { recursive: true });
  const frames = await mkdtemp(join(outputDirectory, 'frames-'));
  const output = join(outputDirectory, `output.${format}`);
  const start = performance.now();
  let browser: Browser | undefined;
  const cancel = () => {
    void browser?.close();
  };
  signal.addEventListener('abort', cancel, { once: true });
  try {
    signal.throwIfAborted();
    await writeFile(
      join(outputDirectory, 'snapshot.json'),
      JSON.stringify(project, null, 2),
    );
    browser = await chromium.launch({
      headless: true,
      args: ['--enable-unsafe-swiftshader'],
    });
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
    if (format !== 'png') {
      onProgress('encoding', 0.92);
      signal.throwIfAborted();
      for (const args of encodingSteps(
        format,
        project.canvas.fps,
        count,
        frames,
        output,
      )) {
        signal.throwIfAborted();
        await runFFmpeg(args, signal);
      }
    }
    signal.throwIfAborted();
    await writeFile(
      join(outputDirectory, 'report.json'),
      JSON.stringify(
        {
          frames: count,
          width: project.canvas.width,
          height: project.canvas.height,
          fps: project.canvas.fps,
          elapsedMs: performance.now() - start,
          attribution: project.map.attribution,
          admin1Source: {
            release: admin1Provenance.release,
            source: admin1Provenance.source,
            license: admin1Provenance.license,
            sourceSha256: admin1Provenance.sourceSha256,
            files: admin1Provenance.files.filter((file) =>
              new Set([
                ...project.map.admin1Countries,
                ...project.scenes.flatMap((scene) =>
                  scene.layers.flatMap((layer) =>
                    layer.type === 'admin1Highlight'
                      ? admin1CountriesForRegions(layer.regionCodes)
                      : [],
                  ),
                ),
              ]).has(file.countryCode),
            ),
          },
          assetSources: project.assets.map(({ id, name, provenance }) => ({
            id,
            name,
            ...provenance,
          })),
          datasetSources: project.datasets.map(
            ({ id, name, unit, records, provenance }) => ({
              id,
              name,
              unit,
              observations: records.length,
              ...provenance,
            }),
          ),
          format,
          pipeline: `Chromium fixed-frame → ${format === 'png' ? 'PNG' : `FFmpeg ${format}`}`,
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
    try {
      await browser?.close();
    } finally {
      await removeTemporaryDirectory(frames, outputDirectory, 'frames-');
    }
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
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      abort();
    }, 600000);
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
      else if (timedOut)
        reject(
          new Error(
            'FFmpeg encoding timed out after 10 minutes. Try a shorter scene or lower resolution.',
          ),
        );
      else if (code === 0) resolve();
      else reject(new Error(`FFmpeg failed (${code}): ${stderr}`));
    });
  });
}
