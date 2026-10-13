import { test, expect } from 'vitest';
import { createDemo } from './index';
import {
  decodeWindowDepth,
  multipassManifestSchema,
  validateMultipassProject,
} from './multipass';
const frame = (index: number) => {
  const prefix = `frames/${String(index).padStart(6, '0')}/`;
  return {
    index,
    timeSeconds: index / 30,
    camera: { lng: 103.8, lat: 22.3, zoom: 14, pitch: 55, bearing: 25 },
    incomingWeight: 1,
    reference: `${prefix}reference.png`,
    captions: `${prefix}captions.png`,
    incoming: {
      sceneId: 'scene',
      map: `${prefix}incoming-map.png`,
      overlay: `${prefix}incoming-overlay.png`,
      depth: `${prefix}incoming-depth.png`,
      depthMetadata: {
        encoding: 'rgb24-window-depth',
        width: 1920,
        height: 1080,
        depthBits: 24,
        stencilBits: 8,
      },
    },
  };
};
test('graphic manifest enforces exact frame times/counts/plane names/dimensions and explicit depth meaning; job limits preserve ordinary projects', () => {
  const manifest = {
    version: 1,
    projectId: 'demo',
    projectSchemaVersion: 14,
    width: 1920,
    height: 1080,
    fps: 30,
    durationSeconds: 1,
    frameCount: 30,
    composition:
      'incoming-map + incoming-overlay; outgoing group over incoming at 1-incomingWeight; captions over both',
    background: '#101e2d',
    colorSpace: 'srgb',
    alpha: 'straight',
    depthMeaning:
      'Normalized GPU window depth; includes MapLibre layer ranges; not linear metres. DOM overlays have no depth.',
    sourceCredits: ['Authored test metadata'],
    frames: Array.from({ length: 30 }, (_, i) => frame(i)),
  };
  expect(multipassManifestSchema.safeParse(manifest).success).toBe(true);
  for (const value of [
    { ...manifest, version: 2 },
    { ...manifest, frameCount: 4 },
    { ...manifest, frames: [frame(1), frame(0), ...manifest.frames.slice(2)] },
    {
      ...manifest,
      frames: [{ ...frame(0), timeSeconds: 0.5 }, ...manifest.frames.slice(1)],
    },
    {
      ...manifest,
      frames: [
        { ...frame(0), reference: '../evil.png' },
        ...manifest.frames.slice(1),
      ],
    },
    {
      ...manifest,
      frames: [
        { ...frame(0), incomingWeight: 0.5 },
        ...manifest.frames.slice(1),
      ],
    },
  ])
    expect(multipassManifestSchema.safeParse(value).success).toBe(false);
  const p = createDemo(),
    before = structuredClone(p);
  expect(() => validateMultipassProject(p)).not.toThrow();
  expect(p).toEqual(before);
  p.durationSeconds = 21;
  expect(() => validateMultipassProject(p)).toThrow('600 frames');
  p.durationSeconds = 1;
  p.canvas.width = 3840;
  p.canvas.height = 3840;
  expect(() => validateMultipassProject(p)).toThrow('pixel budget');
  expect(decodeWindowDepth(0, 0, 0)).toBe(0);
  expect(decodeWindowDepth(255, 255, 255)).toBe(1);
  expect(decodeWindowDepth(128, 0, 0)).toBeGreaterThan(0.5);
  expect(() => decodeWindowDepth(-1, 0, 0)).toThrow('bytes');
});
