import { evaluateProjectAt } from '@animatemap/animation-core';
import { NumberField } from './NumberField';
import { useEditor } from './store';
export function CameraFollowPanel() {
  const editor = useEditor(),
    scene = editor.project.scenes.find(
      (s) => s.id === evaluateProjectAt(editor.project, editor.time).sceneId,
    );
  if (!scene) return null;
  const models = scene.layers.filter((l) => l.type === 'model'),
    follow = scene.camera.follow;
  if (!models.length && !follow) return null;
  const change = (fn: (target: NonNullable<typeof follow>) => void) => {
    editor.edit((p) => {
      const target = p.scenes.find((s) => s.id === scene.id)!.camera.follow;
      if (target) fn(target);
    });
    useEditor.getState().seek(editor.time);
  };
  return (
    <section className="source-review">
      <h3>Camera follows object</h3>
      <label className="field">
        Follow target
        <select
          aria-label="Camera follow target"
          value={follow?.layerId ?? ''}
          onChange={(e) => {
            editor.edit((p) => {
              p.scenes.find((s) => s.id === scene.id)!.camera.follow = e.target
                .value
                ? {
                    layerId: e.target.value,
                    zoom: editor.camera.zoom,
                    pitch: editor.camera.pitch,
                    bearingMode: 'heading',
                    bearing: 0,
                  }
                : null;
            });
            useEditor.getState().seek(editor.time);
          }}
        >
          <option value="">Use stored camera keys</option>
          {models.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </label>
      {follow && (
        <>
          <NumberField
            label="Follow zoom"
            value={follow.zoom}
            min={0}
            max={18}
            onChange={(v) =>
              change((f) => {
                f.zoom = v;
              })
            }
          />
          <NumberField
            label="Follow pitch"
            value={follow.pitch}
            min={0}
            max={60}
            onChange={(v) =>
              change((f) => {
                f.pitch = v;
              })
            }
          />
          <label className="field">
            Bearing mode
            <select
              aria-label="Follow bearing mode"
              value={follow.bearingMode}
              onChange={(e) =>
                change((f) => {
                  f.bearingMode = e.target.value as 'heading' | 'fixed';
                })
              }
            >
              <option value="heading">Model heading + offset</option>
              <option value="fixed">Fixed world bearing</option>
            </select>
          </label>
          <NumberField
            label="Follow bearing"
            value={follow.bearing}
            min={-360}
            max={360}
            onChange={(v) =>
              change((f) => {
                f.bearing = v;
              })
            }
          />
          <p className="hint">
            Evaluated model controls centre and these camera settings. Stored
            manual keys remain available after disabling follow. Terrain follow
            must stay inside verified coverage.
          </p>
        </>
      )}
    </section>
  );
}
