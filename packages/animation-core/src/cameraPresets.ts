import {
  cameraSchema,
  type Camera,
  type Project,
} from '@animatemap/project-schema';
import { clamp, wrap } from './numeric';

export const cameraPresetKinds = ['orbit', 'sweep', 'bounce', 'flyTo'] as const;
export type CameraPresetKind = (typeof cameraPresetKinds)[number];
export type CameraKeys = Project['scenes'][number]['camera']['keyframes'];

/** Presets are editable keyframes, evaluated identically in preview and export. */
export function createCameraPreset(
  kind: CameraPresetKind,
  camera: Camera,
  duration: number,
  amount?: number,
  from: Camera = camera,
): CameraKeys {
  cameraSchema.parse(camera);
  cameraSchema.parse(from);
  if (!Number.isFinite(duration) || duration <= 0 || duration > 300)
    throw new Error('Preset duration must be positive and at most 300 seconds');
  const key = (fraction: number, value: Camera): CameraKeys[number] => ({
    time: fraction * duration,
    value: cameraSchema.parse(value),
    easing: 'easeInOut',
  });
  if (amount !== undefined && !Number.isFinite(amount))
    throw new Error('Preset amount must be finite');
  switch (kind) {
    case 'orbit': {
      const degrees = amount ?? 360;
      if (degrees < 45 || degrees > 360)
        throw new Error('Orbit angle must be 45–360 degrees');
      const steps = Math.ceil(degrees / 45);
      return Array.from({ length: steps + 1 }, (_, index) => ({
        ...key(index / steps, {
          ...camera,
          bearing: wrap(camera.bearing + (degrees * index) / steps),
          pitch: Math.max(30, camera.pitch),
        }),
        easing: 'linear',
      }));
    }
    case 'sweep': {
      const span = amount ?? 6;
      if (span <= 0 || span > 30)
        throw new Error('Sweep span must be between 0 and 30 degrees');
      return [
        key(0, {
          ...camera,
          lng: wrap(camera.lng - span / 2),
          bearing: wrap(camera.bearing - 15),
        }),
        key(0.5, { ...camera, bearing: wrap(camera.bearing) }),
        key(1, {
          ...camera,
          lng: wrap(camera.lng + span / 2),
          bearing: wrap(camera.bearing + 15),
        }),
      ];
    }
    case 'bounce': {
      const zoom = amount ?? 1;
      if (zoom <= 0 || zoom > 4)
        throw new Error('Bounce amount must be between 0 and 4 zoom levels');
      return [
        key(0, { ...camera }),
        key(0.4, { ...camera, zoom: clamp(camera.zoom + zoom, 0, 18) }),
        key(0.7, { ...camera, zoom: clamp(camera.zoom - zoom / 4, 0, 18) }),
        key(1, { ...camera }),
      ];
    }
    case 'flyTo':
      return [key(0, { ...from }), key(1, { ...camera })];
    default:
      throw new Error('Unknown camera preset');
  }
}
