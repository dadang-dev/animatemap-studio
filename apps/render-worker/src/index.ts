import { chromium, type Browser } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile, rename } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type {
  ExportFormat,
  Project,
  RenderJob,
} from '@animatemap/project-schema';
import { encodingSteps, validateExportDimensions } from './encoders';
import { removeTemporaryDirectory } from './cleanup';
import { GraphicArchive } from './graphicArchive';
import { captureGraphicFrame } from './graphicFrames';
import { muxProjectAudio } from './audio';
import admin1Provenance from '../../../data/admin1/PROVENANCE.json' with { type: 'json' };
import basemapProvenance from '../../web/public/data/basemap/PROVENANCE.json' with { type: 'json' };
import {
  admin1CountriesForRegions,
  terrainPack,
  TERRAIN_CREDIT,
  validateMultipassProject,
  multipassManifestSchema,
  type MultipassFrame,
} from '@animatemap/project-schema';
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
  const { project, format, directory, onProgress } = options;
  if (format === 'zip') validateMultipassProject(project);
  const signal =
    format === 'zip'
      ? AbortSignal.any([options.signal, AbortSignal.timeout(600000)])
      : options.signal;
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
  let archive: GraphicArchive | undefined;
  const graphicFrames: MultipassFrame[] = [],
    sourceCredits = new Set<string>();
  let archiveReport: { bytes: number; entries: number } | undefined;
  let failed = false,
    failure: unknown;
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
    if (format === 'zip') {
      archive = await GraphicArchive.create(
        join(frames, 'sequence.zip'),
        signal,
      );
      await archive.add(
        'project.json',
        new TextEncoder().encode(JSON.stringify(project)),
      );
    }
    for (let i = 0; i < count; i++) {
      signal.throwIfAborted();
      const index = format === 'png' ? (options.frameIndex ?? 0) : i;
      let state:
        | Awaited<ReturnType<NonNullable<Window['renderStudio']>['frame']>>
        | undefined;
      for (let attempt = 0; ; attempt++) {
        try {
          state = await page.evaluate(
            (index) => window.renderStudio!.frame(index),
            index,
          );
          break;
        } catch (e) {
          if (attempt >= 1 || signal.aborted) throw e;
        }
      }
      if (archive) {
        if (!state) throw new Error('Graphic frame was not evaluated');
        graphicFrames.push(
          await captureGraphicFrame(
            page,
            index,
            project.canvas.fps,
            state,
            archive,
            sourceCredits,
          ),
        );
      } else
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
    if (format !== 'png' && format !== 'zip') {
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
      await muxProjectAudio(project, format, frames, output, signal, runFFmpeg);
    }
    if (archive) {
      onProgress('encoding', 0.92);
      const manifest = multipassManifestSchema.parse({
        version: 1,
        projectId: project.id,
        projectSchemaVersion: project.schemaVersion,
        width: project.canvas.width,
        height: project.canvas.height,
        fps: project.canvas.fps,
        durationSeconds: project.durationSeconds,
        frameCount: count,
        composition:
          'incoming-map + incoming-overlay; outgoing group over incoming at 1-incomingWeight; captions over both',
        background: '#101e2d',
        colorSpace: 'srgb',
        alpha: 'straight',
        depthMeaning:
          'Normalized GPU window depth; includes MapLibre layer ranges; not linear metres. DOM overlays have no depth.',
        sourceCredits: [...sourceCredits],
        frames: graphicFrames,
      });
      await archive.add(
        'manifest.json',
        new TextEncoder().encode(JSON.stringify(manifest, null, 2)),
      );
      await archive.add(
        'README.txt',
        new TextEncoder().encode(
          'AnimateMap Studio multi-pass v1\nFrames use t = index / FPS; count = ceil(duration * FPS). Visual PNGs are sRGB with straight alpha.\nComposite incoming-map then incoming-overlay; overlay outgoing map+overlay group at opacity 1-incomingWeight; add captions last. Keep source-credit overlays in the final composition. Reference PNGs show the expected complete frame.\nDepth PNGs encode normalized GPU window depth as (R*65536+G*256+B)/16777215. They are data, not grayscale or linear metres; MapLibre layer depth ranges are included. Decode raw bytes before color conversion, use nearest samples, and do not gamma-correct or interpolate packed RGB channels. DOM overlays/captions have no 3D depth. Keep separate outgoing/incoming depth during crossfade.\nSource geometry/licensing is preserved in project.json and manifest.json. Audio remains in separately exported MP4/WebM; ZIP does not mix audio.\n',
        ),
      );
      archiveReport = await archive.finish();
      signal.throwIfAborted();
      await rename(join(frames, 'sequence.zip'), output);
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
          basemapSource:
            project.map.basemap === 'blue-marble' ? basemapProvenance : null,
          terrainSource: project.map.terrain
            ? {
                configuration: project.map.terrain,
                credit: TERRAIN_CREDIT,
                pack: terrainPack,
              }
            : null,
          geographySources: project.scenes.flatMap((scene) =>
            scene.layers.flatMap((layer) =>
              (layer.type === 'route' || layer.type === 'marker') &&
              layer.geographySource
                ? [{ layerId: layer.id, ...layer.geographySource }]
                : [],
            ),
          ),
          modelMotionSources: project.scenes.flatMap((scene) =>
            scene.layers.flatMap((layer) =>
              layer.type === 'model' && layer.motion.geographySource
                ? [{ layerId: layer.id, ...layer.motion.geographySource }]
                : [],
            ),
          ),
          buildingSources: project.buildingDatasets.map(
            ({ id, name, heightUnit, records, provenance }) => ({
              id,
              name,
              heightUnit,
              footprints: records.length,
              ...provenance,
            }),
          ),
          modelSources: project.modelAssets.map(
            ({
              id,
              name,
              unit,
              sourceUpAxis,
              placementOrigin,
              sourceSha256,
              provenance,
              triangles,
              vertices,
            }) => ({
              id,
              name,
              unit,
              sourceUpAxis,
              placementOrigin,
              sourceSha256,
              triangles: triangles.length,
              vertices: vertices.length,
              ...provenance,
            }),
          ),
          audioSources: project.audioAssets.map(({ id, name, provenance }) => ({
            id,
            name,
            ...provenance,
          })),
          audioTracks: project.audioTracks,
          captions: {
            enabled: project.captions.enabled,
            cues: project.captions.cues.length,
          },
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
          ...(archiveReport ? { graphicArchive: archiveReport } : {}),
          pipeline: `Chromium fixed-frame → ${format === 'zip' ? 'real PNG passes → streaming ZIP' : format === 'png' ? 'PNG' : `FFmpeg ${format}`}`,
        },
        null,
        2,
      ),
    );
    signal.throwIfAborted();
  } catch (e) {
    failed = true;
    failure = e;
  } finally {
    signal.removeEventListener('abort', cancel);
    try {
      try {
        await browser?.close();
      } finally {
        try {
          await archive?.close();
        } finally {
          await removeTemporaryDirectory(frames, outputDirectory, 'frames-');
        }
      }
    } catch (error) {
      if (!failed) {
        failed = true;
        failure = error;
      }
    }
  }
  if (failed || signal.aborted) await rm(output, { force: true });
  if (format === 'zip' && signal.aborted && !options.signal.aborted)
    throw new Error(
      'Multi-pass render exceeded its ten-minute deadline; trim project or lower resolution',
    );
  signal.throwIfAborted();
  if (failed) throw failure;
  onProgress('completed', 1);
  return output;
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
