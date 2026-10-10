import { z } from 'zod';
import { Unzlib } from 'fflate';
import { crc32 as crc } from './checksum';

export const MAX_ASSET_BYTES = 2 * 1024 * 1024;
export const MAX_ASSET_TOTAL_BYTES = 3 * 1024 * 1024;
export const MAX_ASSET_PIXELS = 24 * 1024 * 1024;
const validated = new Map<
  string,
  { width: number; height: number; bytes: number }
>();
let cachedCharacters = 0;
function validatePixels(
  parts: Uint8Array[],
  width: number,
  height: number,
  depth: number,
  type: number,
  interlaced: number,
) {
  const channels: Record<number, number> = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };
  const bits = channels[type]! * depth;
  const passes = interlaced
    ? [
        [0, 0, 8, 8],
        [4, 0, 8, 8],
        [0, 4, 4, 8],
        [2, 0, 4, 4],
        [0, 2, 2, 4],
        [1, 0, 2, 2],
        [0, 1, 1, 2],
      ]
    : [[0, 0, 1, 1]];
  const rows: { length: number; count: number }[] = [];
  for (const [x, y, dx, dy] of passes as [number, number, number, number][]) {
    const w = Math.max(0, Math.ceil((width - x) / dx)),
      h = Math.max(0, Math.ceil((height - y) / dy));
    if (w && h) rows.push({ length: 1 + Math.ceil((w * bits) / 8), count: h });
  }
  const expected = rows.reduce(
    (total, row) => total + row.length * row.count,
    0,
  );
  const compressed = new Uint8Array(
    parts.reduce((total, part) => total + part.length, 0),
  );
  let offset = 0;
  for (const part of parts) {
    compressed.set(part, offset);
    offset += part.length;
  }
  if (compressed.length < 6) throw new Error('Invalid PNG compressed stream');
  const output = new Uint8Array(expected);
  let written = 0,
    ended = false;
  try {
    const decoder = new Unzlib((data, final) => {
      if (written + data.length > expected)
        throw new Error('PNG decompression exceeds declared dimensions');
      output.set(data, written);
      written += data.length;
      ended = final;
    });
    // Bound the expansion of any one compressed chunk, then enforce the total.
    for (let i = 0; i < compressed.length; i += 1024)
      decoder.push(
        compressed.subarray(i, i + 1024),
        i + 1024 >= compressed.length,
      );
  } catch (error) {
    throw new Error(
      `Invalid PNG compressed pixels: ${error instanceof Error ? error.message : 'decompression failed'}`,
    );
  }
  if (!ended || written !== expected)
    throw new Error('PNG pixel byte count does not match dimensions');
  let a = 1,
    b = 0;
  for (let start = 0; start < output.length; start += 5552) {
    for (let i = start; i < Math.min(start + 5552, output.length); i++) {
      a += output[i]!;
      b += a;
    }
    a %= 65521;
    b %= 65521;
  }
  if (
    ((b << 16) | a) >>> 0 !==
    new DataView(compressed.buffer).getUint32(compressed.length - 4)
  )
    throw new Error('PNG compressed pixel checksum mismatch');
  let rowOffset = 0;
  for (const pass of rows)
    for (let row = 0; row < pass.count; row++) {
      if (output[rowOffset]! > 4) throw new Error('Invalid PNG row filter');
      rowOffset += pass.length;
    }
}
/** Validate a static PNG container before handing its compressed pixels to Chromium. */
export function inspectPng(dataUrl: string) {
  const cached = validated.get(dataUrl);
  if (cached) return { ...cached };
  if (!/^data:image\/png;base64,[A-Za-z0-9+/]*={0,2}$/.test(dataUrl))
    throw new Error('Assets must be embedded PNG data, not URLs or SVG');
  const encoded = dataUrl.slice('data:image/png;base64,'.length);
  if (encoded.length % 4) throw new Error('Invalid PNG base64 padding');
  if (encoded.length > Math.ceil(MAX_ASSET_BYTES / 3) * 4)
    throw new Error('Normalized image exceeds 2 MB');
  const bytes = Uint8Array.from(atob(encoded), (value) => value.charCodeAt(0));
  if (bytes.length > MAX_ASSET_BYTES)
    throw new Error('Normalized image exceeds 2 MB');
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (signature.some((value, i) => bytes[i] !== value))
    throw new Error('Invalid PNG signature');
  const view = new DataView(bytes.buffer);
  let offset = 8,
    width = 0,
    height = 0,
    hasData = false,
    ended = false;
  let depth = 0,
    type = 0,
    interlaced = 0,
    palette = false;
  const dataParts: Uint8Array[] = [];
  while (offset + 12 <= bytes.length) {
    const length = view.getUint32(offset);
    const end = offset + 8 + length;
    if (end + 4 > bytes.length) throw new Error('Truncated PNG chunk');
    const kind = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
    if (view.getUint32(end) !== crc(bytes, offset + 4, end))
      throw new Error('PNG checksum mismatch');
    if (kind === 'acTL' || kind === 'fcTL' || kind === 'fdAT')
      throw new Error('Animated PNG is unsupported; import a static image');
    if (offset === 8 && (kind !== 'IHDR' || length !== 13))
      throw new Error('PNG requires an initial IHDR');
    if (kind === 'IHDR') {
      if (offset !== 8) throw new Error('Duplicate PNG header');
      width = view.getUint32(offset + 8);
      height = view.getUint32(offset + 12);
      depth = bytes[offset + 16]!;
      type = bytes[offset + 17]!;
      interlaced = bytes[offset + 20]!;
      const permitted: Record<number, number[]> = {
        0: [1, 2, 4, 8, 16],
        2: [8, 16],
        3: [1, 2, 4, 8],
        4: [8, 16],
        6: [8, 16],
      };
      if (!permitted[type]?.includes(depth))
        throw new Error('Unsupported PNG color type / bit depth');
      if (!width || !height || width > 4096 || height > 4096)
        throw new Error('Image dimensions must be between 1 and 4096 pixels');
      if (
        bytes[offset + 18] !== 0 ||
        bytes[offset + 19] !== 0 ||
        bytes[offset + 20]! > 1
      )
        throw new Error('Unsupported PNG compression/filter/interlace');
    }
    if (kind === 'PLTE') {
      if (length < 3 || length > 768 || length % 3)
        throw new Error('Invalid PNG palette');
      palette = true;
    }
    if (kind === 'IDAT') {
      hasData = true;
      dataParts.push(bytes.subarray(offset + 8, end));
    }
    if (
      !['IHDR', 'IDAT', 'IEND', 'PLTE'].includes(kind) &&
      (bytes[offset + 4]! & 32) === 0
    )
      throw new Error(`Unsupported critical PNG chunk ${kind}`);
    offset = end + 4;
    if (kind === 'IEND') {
      if (length !== 0 || offset !== bytes.length)
        throw new Error('Invalid PNG end/trailing data');
      ended = true;
      break;
    }
  }
  if (!ended || !hasData || !width) throw new Error('Incomplete PNG');
  if (type === 3 && !palette) throw new Error('Indexed PNG requires a palette');
  validatePixels(dataParts, width, height, depth, type, interlaced);
  const result = { width, height, bytes: bytes.length };
  // Cache only successful validation metadata; retain no decoded pixel buffers.
  while (
    validated.size &&
    (cachedCharacters + dataUrl.length > 8 * 1024 * 1024 ||
      validated.size >= 20)
  ) {
    const key = validated.keys().next().value!;
    cachedCharacters -= key.length;
    validated.delete(key);
  }
  validated.set(dataUrl, result);
  cachedCharacters += dataUrl.length;
  return { ...result };
}
export const assetProvenanceSchema = z.object({
  source: z.string().trim().min(1).max(500),
  author: z.string().trim().min(1).max(200),
  license: z.string().trim().min(1).max(200),
  credit: z.string().trim().min(1).max(80),
});
export const imageAssetSchema = z
  .object({
    id: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/),
    name: z.string().min(1).max(200),
    type: z.literal('image'),
    mime: z.literal('image/png'),
    width: z.number().int().min(1).max(4096),
    height: z.number().int().min(1).max(4096),
    dataUrl: z.string().max(Math.ceil(MAX_ASSET_BYTES / 3) * 4 + 22),
    provenance: assetProvenanceSchema,
  })
  .superRefine((asset, ctx) => {
    try {
      const inspected = inspectPng(asset.dataUrl);
      if (inspected.width !== asset.width || inspected.height !== asset.height)
        throw new Error('Asset dimensions do not match PNG header');
    } catch (error) {
      ctx.addIssue({
        code: 'custom',
        message: error instanceof Error ? error.message : 'Invalid PNG asset',
        path: ['dataUrl'],
      });
    }
  });
export type ImageAsset = z.infer<typeof imageAssetSchema>;
