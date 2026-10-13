import type { Layer } from '@animatemap/project-schema';
import { NumberField } from './NumberField';
import { useEditor } from './store';
import { wrap } from '@animatemap/animation-core';
export function ModelInspector({
  layer,
}: {
  layer: Extract<Layer, { type: 'model' }>;
}) {
  const editor = useEditor(),
    asset = editor.project.modelAssets.find((a) => a.id === layer.modelAssetId),
    scene = editor.project.scenes.find((s) =>
      s.layers.some((l) => l.id === layer.id),
    )!;
  const points =
    layer.motion.type === 'path'
      ? layer.motion.coordinates
      : [layer.motion.coordinates];
  return (
    <>
      <NumberField
        label="Model scale"
        value={layer.transform.scale}
        min={0.01}
        max={10}
        onChange={(v) =>
          editor.patchLayer((l) => {
            if (l.type === 'model') l.transform.scale = v;
          })
        }
      />
      <NumberField
        label="Model heading offset"
        value={layer.transform.rotation}
        min={-360}
        max={360}
        onChange={(v) =>
          editor.patchLayer((l) => {
            if (l.type === 'model') l.transform.rotation = v;
          })
        }
      />
      <NumberField
        label="Model altitude above ground"
        value={layer.altitude}
        min={0}
        max={10000}
        onChange={(v) =>
          editor.patchLayer((l) => {
            if (l.type === 'model') l.altitude = v;
          })
        }
      />
      {(['pitch', 'roll'] as const).map((axis) => (
        <NumberField
          key={axis}
          label={`Model ${axis}`}
          value={layer.orientation[axis]}
          min={axis === 'pitch' ? -90 : -180}
          max={axis === 'pitch' ? 90 : 180}
          onChange={(v) =>
            editor.patchLayer((l) => {
              if (l.type === 'model') l.orientation[axis] = v;
            })
          }
        />
      ))}
      <label className="field">
        Copy route into model motion
        <select
          aria-label="Model route snapshot"
          value=""
          onChange={(e) => {
            const route = scene.layers.find((l) => l.id === e.target.value);
            if (route?.type !== 'route') return;
            editor.patchLayer((l) => {
              if (l.type === 'model') {
                l.motion = {
                  type: 'path',
                  coordinates: structuredClone(route.coordinates),
                  alignHeading: true,
                  ...(route.geographySource
                    ? {
                        geographySource: structuredClone(route.geographySource),
                      }
                    : {}),
                };
                l.tracks.motionProgress = [
                  { time: l.timeRange.start, value: 0, easing: 'linear' },
                  { time: l.timeRange.end, value: 1, easing: 'linear' },
                ];
              }
            });
            editor.seek(editor.time);
          }}
        >
          <option value="">Choose an existing route</option>
          {scene.layers
            .filter((l) => l.type === 'route')
            .map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
        </select>
      </label>
      <p className="hint">
        Copies stored coordinates and source reference into editable scene-local
        0→1 progress. Later route edits do not silently change this snapshot.
      </p>
      {points.map((point, i) => (
        <div key={i} className="camera-grid">
          {(['longitude', 'latitude'] as const).map((name, axis) => (
            <NumberField
              key={name}
              label={`Model point ${i + 1} ${name}`}
              value={point[axis]!}
              min={axis === 0 ? -180 : -85}
              max={axis === 0 ? 180 : 85}
              step={0.001}
              onChange={(v) =>
                editor.patchLayer((l) => {
                  if (l.type !== 'model') return;
                  const p =
                    l.motion.type === 'path'
                      ? l.motion.coordinates[i]!
                      : l.motion.coordinates;
                  p[axis] = v;
                })
              }
            />
          ))}
        </div>
      ))}
      <button
        onClick={() =>
          editor.patchLayer((l) => {
            if (l.type !== 'model') return;
            const p =
              l.motion.type === 'path'
                ? l.motion.coordinates.at(-1)!
                : l.motion.coordinates;
            l.motion =
              l.motion.type === 'path'
                ? {
                    ...l.motion,
                    coordinates: [
                      ...l.motion.coordinates,
                      [wrap(p[0] + 0.001), p[1]],
                    ],
                  }
                : {
                    type: 'path',
                    coordinates: [p, [wrap(p[0] + 0.001), p[1]]],
                    alignHeading: true,
                    ...(l.motion.geographySource
                      ? { geographySource: l.motion.geographySource }
                      : {}),
                  };
          })
        }
      >
        Add model motion point
      </button>
      {layer.motion.type === 'path' && (
        <>
          <NumberField
            label="Model path progress"
            value={layer.motionProgress}
            min={0}
            max={1}
            onChange={(v) =>
              editor.patchLayer((l) => {
                if (l.type === 'model') l.motionProgress = v;
              })
            }
          />
          <label className="check">
            <input
              aria-label="Model aligns with path"
              type="checkbox"
              checked={layer.motion.alignHeading}
              onChange={(e) =>
                editor.patchLayer((l) => {
                  if (l.type === 'model' && l.motion.type === 'path')
                    l.motion.alignHeading = e.target.checked;
                })
              }
            />
            Align heading to path
          </label>
          <button
            onClick={() =>
              editor.patchLayer((l) => {
                if (l.type === 'model')
                  l.tracks.motionProgress = [
                    { time: l.timeRange.start, value: 0, easing: 'linear' },
                    { time: l.timeRange.end, value: 1, easing: 'linear' },
                  ];
              })
            }
          >
            Animate model journey
          </button>
          <button
            onClick={() =>
              editor.patchLayer((l) => {
                if (l.type === 'model' && l.motion.type === 'path')
                  l.motion = {
                    type: 'stationary',
                    coordinates: l.motion.coordinates[0]!,
                    ...(l.motion.geographySource
                      ? { geographySource: l.motion.geographySource }
                      : {}),
                  };
              })
            }
          >
            Use stationary model at first point
          </button>
        </>
      )}
      {asset && (
        <details className="source-review" open>
          <summary>Model source</summary>
          <p>
            {asset.provenance.credit} · {asset.provenance.license}
          </p>
          <p>{asset.provenance.source}</p>
          <p>
            {asset.unit} · {asset.sourceUpAxis} up · {asset.placementOrigin} ·{' '}
            {asset.triangles.length} triangles
          </p>
        </details>
      )}
    </>
  );
}
