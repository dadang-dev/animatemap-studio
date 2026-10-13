import { join } from 'node:path';
import { exportFormats, type ExportFormat } from '@animatemap/project-schema';

/** Paths remain individual process arguments, including spaces or shell metacharacters. */
export function encodingSteps(
  format: ExportFormat,
  fps: number,
  count: number,
  frames: string,
  output: string,
): string[][] {
  const input = [
    '-y',
    '-framerate',
    String(fps),
    '-i',
    join(frames, '%06d.png'),
  ];
  const length = ['-frames:v', String(count)];
  if (format === 'png' || format === 'zip') return [];
  if (format === 'mp4')
    return [
      [
        ...input,
        ...length,
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
    ];
  if (format === 'webm')
    return [
      [
        ...input,
        ...length,
        '-c:v',
        'libvpx-vp9',
        '-b:v',
        '0',
        '-crf',
        '18',
        '-deadline',
        'good',
        '-cpu-used',
        '4',
        '-row-mt',
        '1',
        '-pix_fmt',
        'yuv420p',
        output,
      ],
    ];
  const palette = join(frames, 'palette.png');
  return [
    [
      ...input,
      '-vf',
      'palettegen=reserve_transparent=0',
      '-frames:v',
      '1',
      palette,
    ],
    [
      ...input,
      '-i',
      palette,
      '-lavfi',
      'paletteuse=dither=bayer:bayer_scale=3',
      ...length,
      '-fps_mode',
      'vfr',
      '-loop',
      '0',
      '-final_delay',
      String(Math.max(1, Math.round(100 / fps))),
      output,
    ],
  ];
}
export function validateExportDimensions(
  format: ExportFormat,
  width: number,
  height: number,
) {
  if (exportFormats[format].evenDimensions && (width % 2 || height % 2))
    throw new Error('Video canvas dimensions must be even');
}
