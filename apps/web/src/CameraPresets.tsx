import { useState } from 'react';
import {
  cameraPresetKinds,
  type CameraPresetKind,
} from '@animatemap/animation-core';
import { useEditor } from './store';
const settings = {
  orbit: {
    title: 'Orbit angle (degrees)',
    value: 360,
    min: 45,
    max: 360,
    step: 45,
  },
  sweep: {
    title: 'Longitude span (degrees)',
    value: 6,
    min: 0.1,
    max: 30,
    step: 0.1,
  },
  bounce: {
    title: 'Zoom bounce amount',
    value: 1,
    min: 0.1,
    max: 4,
    step: 0.1,
  },
};
export function CameraPresets() {
  const [kind, setKind] = useState<CameraPresetKind>('orbit');
  const [amount, setAmount] = useState(360);
  const apply = useEditor((state) => state.applyCameraPreset);
  const config = kind === 'flyTo' ? null : settings[kind];
  return (
    <section className="camera-presets" aria-label="Camera presets">
      <label className="field">
        Camera preset
        <select
          aria-label="Camera preset"
          value={kind}
          onChange={(event) => {
            const next = event.target.value as CameraPresetKind;
            setKind(next);
            setAmount(next === 'flyTo' ? 0 : settings[next].value);
          }}
        >
          {cameraPresetKinds.map((value) => (
            <option key={value} value={value}>
              {value === 'flyTo'
                ? 'Fly to current camera'
                : value[0]!.toUpperCase() + value.slice(1)}
            </option>
          ))}
        </select>
      </label>
      {config && (
        <label className="field">
          {config.title}
          <input
            aria-label={config.title}
            type="number"
            min={config.min}
            max={config.max}
            step={config.step}
            value={amount}
            onChange={(event) => setAmount(Number(event.target.value))}
          />
        </label>
      )}
      <button onClick={() => apply(kind, config ? amount : undefined)}>
        Apply camera preset
      </button>
      <p className="hint">
        Replaces this scene's camera keys. Undo restores them. Fly-to uses the
        scene's initial camera and the current camera.
      </p>
    </section>
  );
}
