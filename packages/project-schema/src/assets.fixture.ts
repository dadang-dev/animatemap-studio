import { PNG } from 'pngjs';
import { imageAssetSchema } from './index';

export function testImage(width = 8, height = 8) {
  const png = new PNG({ width, height });
  png.data.fill(255);
  return imageAssetSchema.parse({
    id: 'logo',
    name: 'Logo Hà Nội',
    type: 'image',
    mime: 'image/png',
    width,
    height,
    dataUrl: `data:image/png;base64,${PNG.sync.write(png).toString('base64')}`,
    provenance: {
      source: 'Generated test fixture',
      author: 'AnimateMap tests',
      license: 'CC0-1.0',
      credit: 'Logo · Tests · CC0',
    },
  });
}
