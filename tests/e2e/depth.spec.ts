import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { PNG } from 'pngjs';
import { createDemo } from '../../packages/project-schema/src/index';
import {
  importModelOBJ,
  aircraftOptions,
  authoredAircraftOBJ,
} from '../../apps/web/src/modelImport';
import { addModelLayer } from '../../apps/web/src/modelOperations';
test('render-page reload releases actual depth textures/framebuffers and preserves map pixels', async ({
  page,
}) => {
  const project = createDemo();
  project.canvas = { width: 640, height: 360, fps: 24 };
  project.durationSeconds = 1;
  project.scenes[0]!.durationSeconds = 1;
  project.scenes[0]!.layers = [];
  project.scenes[0]!.camera.keyframes = [
    {
      time: 0,
      value: { lng: 106.7, lat: 16, zoom: 6, pitch: 0, bearing: 0 },
      easing: 'linear',
    },
  ];
  await page.goto('/render');
  await page.waitForFunction(() => !!window.renderStudio);
  await page.evaluate((p) => window.renderStudio!.load(p), project);
  await page.evaluate(() => window.renderStudio!.frame(0));
  await page.evaluate(() => {
    const gl = document
      .querySelector<HTMLCanvasElement>('.maplibregl-canvas')!
      .getContext('webgl2')!;
    const textures = new Set<WebGLTexture>(),
      framebuffers = new Set<WebGLFramebuffer>(),
      deletedTextures = new Set<WebGLTexture>(),
      deletedFramebuffers = new Set<WebGLFramebuffer>();
    const createTexture = gl.createTexture.bind(gl),
      createFramebuffer = gl.createFramebuffer.bind(gl),
      deleteTexture = gl.deleteTexture.bind(gl),
      deleteFramebuffer = gl.deleteFramebuffer.bind(gl);
    gl.createTexture = () => {
      const value = createTexture();
      if (value) textures.add(value);
      return value;
    };
    gl.createFramebuffer = () => {
      const value = createFramebuffer();
      if (value) framebuffers.add(value);
      return value;
    };
    gl.deleteTexture = (value) => {
      if (value) deletedTextures.add(value);
      deleteTexture(value);
    };
    gl.deleteFramebuffer = (value) => {
      if (value) deletedFramebuffers.add(value);
      deleteFramebuffer(value);
    };
    (
      window as unknown as {
        depthAllocationCheck: () => {
          textures: number;
          framebuffers: number;
          released: boolean;
        };
      }
    ).depthAllocationCheck = () => ({
      textures: textures.size,
      framebuffers: framebuffers.size,
      released:
        [...textures].every((t) => deletedTextures.has(t)) &&
        [...framebuffers].every((f) => deletedFramebuffers.has(f)),
    });
  });
  await page.evaluate(() => window.renderStudio!.pass('depth'));
  await page.evaluate(() => window.renderStudio!.pass('reference'));
  const before = await page.screenshot();
  await page.evaluate((p) => window.renderStudio!.load(p), project);
  await page.evaluate(() => window.renderStudio!.frame(0));
  const allocations = await page.evaluate(() =>
    (
      window as unknown as {
        depthAllocationCheck: () => {
          textures: number;
          framebuffers: number;
          released: boolean;
        };
      }
    ).depthAllocationCheck(),
  );
  expect(allocations.textures).toBeGreaterThanOrEqual(2);
  expect(allocations.framebuffers).toBeGreaterThanOrEqual(2);
  expect(allocations.released).toBe(true);
  expect((await page.screenshot()).equals(before)).toBe(true);
});
test('actual WebGL depth encodes terrain/model geometry, repeats, preserves beauty and rejects lost context', async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 2200, height: 1400 });
  await page.goto('/');
  await page.waitForFunction(() => !!window.studio);
  const project = createDemo(),
    scene = project.scenes[0]!;
  project.durationSeconds = 1;
  scene.durationSeconds = 1;
  scene.layers = [];
  project.map.terrain = {
    packId: 'sapa-2026-10-12',
    exaggeration: 1.2,
    hillshade: true,
  };
  scene.camera.keyframes = [
    {
      time: 0,
      value: { lng: 103.8, lat: 22.3, zoom: 14.5, pitch: 55, bearing: 25 },
      easing: 'linear',
    },
  ];
  const asset = await importModelOBJ(
    new TextEncoder().encode(authoredAircraftOBJ()),
    aircraftOptions('depth-aircraft'),
  );
  addModelLayer(
    project,
    scene.id,
    asset,
    scene.camera.keyframes[0]!.value,
    'depth-model',
  );
  const model = scene.layers[0]!;
  if (model.type !== 'model') throw new Error('Expected model');
  model.altitude = 300;
  model.transform.scale = 10;
  scene.camera.follow = {
    layerId: model.id,
    zoom: 14.5,
    pitch: 55,
    bearingMode: 'fixed',
    bearing: 25,
  };
  await page.getByLabel('Import project JSON').setInputFiles({
    name: 'depth.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(project)),
  });
  await expect
    .poll(() => page.evaluate(() => window.studio!.getProject()))
    .toEqual(project);
  await page.evaluate(() =>
    Object.assign(document.querySelector<HTMLElement>('.composition')!.style, {
      position: 'fixed',
      left: '0',
      top: '0',
      width: '1920px',
      height: '1080px',
      maxHeight: 'none',
      zIndex: '50',
    }),
  );
  await page.evaluate(() => window.studio!.renderer.ready());
  const before = PNG.sync.read(
    await page.getByTestId('map-surface').screenshot(),
  );
  async function capture() {
    return page.evaluate(async () => {
      const result = await window.studio!.renderer.captureDepth();
      return {
        metadata: result.metadata,
        png: result.canvas.toDataURL('image/png'),
      };
    });
  }
  const first = await capture();
  const bytes = Buffer.from(first.png.split(',')[1]!, 'base64'),
    depth = PNG.sync.read(bytes);
  expect(first.metadata).toMatchObject({
    encoding: 'rgb24-window-depth',
    width: 1920,
    height: 1080,
  });
  expect(first.metadata.depthBits).toBeGreaterThanOrEqual(16);
  const terrainDepths = new Set<number>(),
    modelDepths = new Set<number>();
  let opaque = true;
  for (let y = 0; y < depth.height; y += 3)
    for (let x = 0; x < depth.width; x += 3) {
      const offset = (y * depth.width + x) * 4,
        packed =
          depth.data[offset]! * 65536 +
          depth.data[offset + 1]! * 256 +
          depth.data[offset + 2]!;
      if (depth.data[offset + 3] !== 255) opaque = false;
      if (Math.abs(x - 960) < 100 && Math.abs(y - 540) < 100)
        modelDepths.add(packed);
      else if (y > 200 && y < 900) terrainDepths.add(packed);
    }
  expect(modelDepths.size).toBeGreaterThan(100);
  expect(terrainDepths.size).toBeGreaterThan(1000);
  expect(opaque).toBe(true);
  await page.evaluate(() => window.studio!.renderer.ready());
  expect(
    PNG.sync
      .read(await page.getByTestId('map-surface').screenshot())
      .data.equals(before.data),
  ).toBe(true);
  const repeated = await capture();
  expect(repeated.png).toBe(first.png);
  await mkdir('test-results/depth', { recursive: true });
  await writeFile('test-results/depth/terrain-model-depth.png', bytes);
  await writeFile(
    'test-results/depth/metadata.json',
    JSON.stringify(
      {
        ...first.metadata,
        terrainDepthValues: terrainDepths.size,
        modelDepthValues: modelDepths.size,
        repeatIdentical: true,
        beautyUnchanged: true,
      },
      null,
      2,
    ),
  );
  await page.evaluate(() =>
    window
      .studio!.renderer.map.getCanvas()
      .getContext('webgl2')!
      .getExtension('WEBGL_lose_context')!
      .loseContext(),
  );
  await expect
    .poll(() =>
      page.evaluate(async () => {
        try {
          await window.studio!.renderer.captureDepth();
          return '';
        } catch (error) {
          return String(error);
        }
      }),
    )
    .toContain('context lost');
  expect(await page.evaluate(() => window.studio!.getProject())).toEqual(
    project,
  );
});
