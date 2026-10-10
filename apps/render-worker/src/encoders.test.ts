import { expect, test } from 'vitest';
import { encodingSteps, validateExportDimensions } from './encoders';
test('encoders preserve fixed-frame counts and paths as individual arguments', () => {
  const frames = 'C:/workspace with spaces/frames';
  const output = 'C:/workspace with spaces/$(output).mp4';
  const mp4 = encodingSteps('mp4', 60, 60, frames, output)[0]!;
  expect(mp4).toContain('libx264');
  expect(mp4).toContain('yuv420p');
  expect(mp4).toContain('+faststart');
  expect(mp4.at(-1)).toBe(output);
  expect(mp4[mp4.indexOf('-frames:v') + 1]).toBe('60');
  expect(mp4[mp4.indexOf('-framerate') + 1]).toBe('60');
  const webm = encodingSteps('webm', 30, 30, frames, 'output.webm')[0]!;
  expect(webm).toContain('libvpx-vp9');
  expect(webm).toContain('yuv420p');
  const gif = encodingSteps('gif', 30, 30, frames, 'output.gif');
  expect(gif).toHaveLength(2);
  expect(gif[0]).toContain('palettegen=reserve_transparent=0');
  expect(gif[1]).toContain('paletteuse=dither=bayer:bayer_scale=3');
  expect(gif[1]![gif[1]!.indexOf('-frames:v') + 1]).toBe('30');
  expect(encodingSteps('png', 30, 1, frames, 'output.png')).toEqual([]);
});
test('video formats reject odd dimensions while GIF and PNG preserve them', () => {
  for (const format of ['mp4', 'webm'] as const)
    expect(() => validateExportDimensions(format, 1921, 1080)).toThrow('even');
  for (const format of ['gif', 'png'] as const)
    expect(() => validateExportDimensions(format, 1921, 1081)).not.toThrow();
});
