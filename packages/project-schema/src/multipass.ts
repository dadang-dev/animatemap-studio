import { z } from 'zod';
import type { Project } from './index';
export const MAX_MULTIPASS_FRAMES = 600;
export const MAX_MULTIPASS_PIXELS = 8294400;
export const MAX_MULTIPASS_ARCHIVE_BYTES = 1024 * 1024 * 1024;
export const MAX_MULTIPASS_ENTRY_BYTES = 64 * 1024 * 1024;
export type GraphicPass =
  | 'reference'
  | 'map'
  | 'overlay'
  | 'captions'
  | 'depth';
export type GraphicPlane = 'incoming' | 'outgoing';
export function validateMultipassProject(project: Project) {
  if (
    Math.ceil(project.durationSeconds * project.canvas.fps) >
    MAX_MULTIPASS_FRAMES
  )
    throw new Error(
      'Multi-pass sequence exceeds 600 frames; trim the project or reduce FPS',
    );
  if (project.canvas.width * project.canvas.height > MAX_MULTIPASS_PIXELS)
    throw new Error(
      'Multi-pass canvas exceeds the 4K pixel budget (8294400 pixels)',
    );
}
const id = z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/),
  finite = z.number().finite();
export const depthFrameMetadataSchema = z.strictObject({
  encoding: z.literal('rgb24-window-depth'),
  width: z.number().int().min(1).max(3840),
  height: z.number().int().min(1).max(3840),
  depthBits: z.union([z.literal(16), z.literal(24), z.literal(32)]),
  stencilBits: z.union([z.literal(0), z.literal(8)]),
});
const path = z
  .string()
  .regex(
    /^frames\/\d{6}\/(?:reference|captions|incoming-(?:map|overlay|depth)|outgoing-(?:map|overlay|depth))\.png$/,
  );
const plane = z.strictObject({
  sceneId: id.nullable(),
  map: path,
  overlay: path,
  depth: path,
  depthMetadata: depthFrameMetadataSchema,
});
const camera = z.strictObject({
  lng: finite.min(-180).max(180),
  lat: finite.min(-85).max(85),
  zoom: finite.min(0).max(18),
  bearing: finite.min(-360).max(360),
  pitch: finite.min(0).max(60),
  targetAltitudeAboveGround: finite.min(0).max(10000).optional(),
});
export const multipassFrameSchema = z.strictObject({
  index: z
    .number()
    .int()
    .min(0)
    .max(MAX_MULTIPASS_FRAMES - 1),
  timeSeconds: finite.min(0),
  camera,
  incomingWeight: finite.min(0).max(1),
  reference: path,
  captions: path,
  incoming: plane,
  outgoing: plane.optional(),
});
export const multipassManifestSchema = z
  .strictObject({
    version: z.literal(1),
    projectId: id,
    projectSchemaVersion: z.union([z.literal(14), z.literal(15)]),
    width: z.number().int().min(256).max(3840),
    height: z.number().int().min(256).max(3840),
    fps: z.union([z.literal(24), z.literal(30), z.literal(60)]),
    durationSeconds: finite.min(1).max(300),
    frameCount: z.number().int().min(1).max(MAX_MULTIPASS_FRAMES),
    composition: z.literal(
      'incoming-map + incoming-overlay; outgoing group over incoming at 1-incomingWeight; captions over both',
    ),
    background: z.literal('#101e2d'),
    colorSpace: z.literal('srgb'),
    alpha: z.literal('straight'),
    depthMeaning: z.literal(
      'Normalized GPU window depth; includes MapLibre layer ranges; not linear metres. DOM overlays have no depth.',
    ),
    sourceCredits: z.array(z.string().min(1).max(2048)).max(5000),
    frames: z.array(multipassFrameSchema).min(1).max(MAX_MULTIPASS_FRAMES),
  })
  .superRefine((manifest, ctx) => {
    const issue = (message: string) =>
      ctx.addIssue({ code: 'custom', message });
    if (manifest.width * manifest.height > MAX_MULTIPASS_PIXELS)
      issue('Multi-pass canvas exceeds pixel budget');
    if (
      manifest.frameCount !== manifest.frames.length ||
      manifest.frameCount !== Math.ceil(manifest.durationSeconds * manifest.fps)
    )
      issue('Multi-pass frame count must match ceil(duration × FPS)');
    for (const [i, frame] of manifest.frames.entries()) {
      if (
        frame.index !== i ||
        Math.abs(frame.timeSeconds - i / manifest.fps) > 1e-9
      )
        issue(
          'Multi-pass frames must have contiguous indices and exact project times',
        );
      const prefix = `frames/${String(i).padStart(6, '0')}/`;
      if (
        frame.reference !== `${prefix}reference.png` ||
        frame.captions !== `${prefix}captions.png`
      )
        issue('Multi-pass image paths must match their frame');
      for (const [name, p] of [
        ['incoming', frame.incoming],
        ['outgoing', frame.outgoing],
      ] as const)
        if (p) {
          for (const pass of ['map', 'overlay', 'depth'] as const)
            if (p[pass] !== `${prefix}${name}-${pass}.png`)
              issue('Multi-pass plane paths must match their frame');
          if (
            p.depthMetadata.width !== manifest.width ||
            p.depthMetadata.height !== manifest.height
          )
            issue('Multi-pass depth dimensions differ from canvas');
        }
      if (!frame.outgoing && frame.incomingWeight !== 1)
        issue('Multi-pass blend weights require an outgoing scene');
    }
  });
export type MultipassFrame = z.infer<typeof multipassFrameSchema>;
export type MultipassManifest = z.infer<typeof multipassManifestSchema>;
/** RGB24 PNG values are data, not a grayscale image or a distance field. */
export function decodeWindowDepth(r: number, g: number, b: number) {
  if ([r, g, b].some((v) => !Number.isInteger(v) || v < 0 || v > 255))
    throw new Error('Depth components must be bytes');
  return (r * 65536 + g * 256 + b) / 16777215;
}
