import {
  imageAssetSchema,
  inspectPng,
  type ImageAsset,
} from '@animatemap/project-schema';

type Provenance = ImageAsset['provenance'];
function assertDimensions(width: number, height: number) {
  if (!width || !height || width > 4096 || height > 4096)
    throw new Error('Image dimensions must be between 1 and 4096 pixels');
}
export function jpegDimensions(bytes: Uint8Array) {
  if (bytes[0] !== 255 || bytes[1] !== 216)
    throw new Error('Invalid JPEG signature');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 2;
  while (offset + 4 < bytes.length) {
    if (bytes[offset++] !== 255) throw new Error('Invalid JPEG marker');
    while (bytes[offset] === 255) offset++;
    const marker = bytes[offset++]!;
    if (marker === 217 || marker === 218) break;
    if (marker === 1 || (marker >= 208 && marker <= 215)) continue;
    if (offset + 2 > bytes.length) break;
    const length = view.getUint16(offset);
    if (length < 2 || offset + length > bytes.length)
      throw new Error('Truncated JPEG segment');
    if (
      [
        192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207,
      ].includes(marker)
    ) {
      if (length < 8) throw new Error('Invalid JPEG dimensions');
      const height = view.getUint16(offset + 3),
        width = view.getUint16(offset + 5);
      assertDimensions(width, height);
      return { width, height };
    }
    offset += length;
  }
  throw new Error('JPEG frame dimensions unavailable');
}
function bytesDataUrl(bytes: Uint8Array) {
  let binary = '';
  for (let start = 0; start < bytes.length; start += 8192)
    binary += String.fromCharCode(...bytes.subarray(start, start + 8192));
  return `data:image/png;base64,${btoa(binary)}`;
}
export async function importImage(
  file: File,
  provenance: Provenance,
): Promise<ImageAsset> {
  if (file.size > 10 * 1024 * 1024)
    throw new Error('Image input exceeds 10 MB');
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (file.type === 'image/png') inspectPng(bytesDataUrl(bytes));
  else if (file.type === 'image/jpeg') jpegDimensions(bytes);
  else
    throw new Error(
      'Import a static PNG or JPEG; SVG, GIF and remote URLs are unsupported',
    );
  return rasterize(file, file.name, provenance);
}
async function rasterize(
  blob: Blob,
  name: string,
  provenance: Provenance,
  target?: { width: number; height: number },
): Promise<ImageAsset> {
  const url = URL.createObjectURL(blob),
    image = new Image();
  image.src = url;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      image.decode(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error('Image decoding timed out')),
          10000,
        );
      }),
    ]);
    assertDimensions(image.naturalWidth, image.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = target?.width ?? image.naturalWidth;
    canvas.height = target?.height ?? image.naturalHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image canvas is unavailable');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return imageAssetSchema.parse({
      id: crypto.randomUUID(),
      name,
      type: 'image',
      mime: 'image/png',
      width: canvas.width,
      height: canvas.height,
      dataUrl: canvas.toDataURL('image/png'),
      provenance,
    });
  } finally {
    clearTimeout(timer);
    image.src = '';
    URL.revokeObjectURL(url);
  }
}
export const builtInImages = [
  {
    id: 'vnm',
    name: 'Vietnam flag',
    author: 'Wikimedia Commons contributors',
    license: 'Public domain (PD-common property)',
    source:
      'https://commons.wikimedia.org/w/index.php?title=File:Flag_of_Vietnam.svg&oldid=1254205846',
  },
  {
    id: 'tha',
    name: 'Thailand flag',
    author: 'Zscout370 / Wikimedia Commons',
    license: 'Public domain (PD-simple / common property)',
    source:
      'https://commons.wikimedia.org/w/index.php?title=File:Flag_of_Thailand.svg&oldid=1278665795',
  },
] as const;
export async function importBuiltInFlag(id: 'vnm' | 'tha') {
  const item = builtInImages.find((item) => item.id === id)!;
  const response = await fetch(`/assets/flags/${id}.svg`);
  if (!response.ok)
    throw new Error(
      `Bundled flag ${item.name} unavailable (${response.status})`,
    );
  const source = await response.arrayBuffer();
  const expected =
    id === 'vnm'
      ? '175120e06bb95dda22133758395f352acb46433ff81eee449326db54e78af2c4'
      : 'f137bb494e00c3c29e9d03fbf4d15c2650d82f2a8f02cf51341f6a4557117db9';
  const digest = await crypto.subtle.digest('SHA-256', source);
  const checksum = [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
  if (checksum !== expected)
    throw new Error('Bundled flag source checksum mismatch');
  return rasterize(
    new Blob([source], { type: 'image/svg+xml' }),
    item.name,
    {
      source: item.source,
      author: item.author,
      license: item.license,
      credit: `${item.name} · Commons · Public domain`,
    },
    { width: 192, height: 128 },
  );
}
export function createTexture(kind: 'hatch' | 'dots'): ImageAsset {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 32;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Texture canvas unavailable');
  context.fillStyle = '#307e72';
  context.fillRect(0, 0, 32, 32);
  context.strokeStyle = '#75d9bd';
  context.lineWidth = 3;
  if (kind === 'hatch') {
    for (let x = -32; x < 64; x += 16) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x + 32, 32);
      context.stroke();
    }
  } else {
    context.fillStyle = '#75d9bd';
    for (const x of [8, 24])
      for (const y of [8, 24]) {
        context.beginPath();
        context.arc(x, y, 3, 0, Math.PI * 2);
        context.fill();
      }
  }
  return imageAssetSchema.parse({
    id: crypto.randomUUID(),
    name: `${kind === 'hatch' ? 'Hatch' : 'Dots'} texture`,
    type: 'image',
    mime: 'image/png',
    width: 32,
    height: 32,
    dataUrl: canvas.toDataURL(),
    provenance: {
      source: 'AnimateMap Studio / imageImport.ts procedural texture',
      author: 'AnimateMap Studio contributors',
      license: 'CC0-1.0',
      credit: 'Texture · AnimateMap · CC0',
    },
  });
}
