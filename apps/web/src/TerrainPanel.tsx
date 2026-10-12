import { useEffect, useRef } from 'react';
import { terrainPack, TERRAIN_CREDIT } from '@animatemap/project-schema';
import { useEditor } from './store';
export function TerrainPanel({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null),
    editor = useEditor();
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  const enabled = editor.project.map.terrain;
  const enable = () => {
    editor.edit((project) => {
      project.map.terrain = {
        packId: 'sapa-2026-10-12',
        exaggeration: 1,
        hillshade: true,
      };
      for (const scene of project.scenes)
        scene.camera.keyframes = [
          {
            time: 0,
            value: {
              lng: 103.8,
              lat: 22.3,
              zoom: 10.5,
              bearing: 20,
              pitch: 55,
            },
            easing: 'linear',
          },
        ];
    });
    if (!useEditor.getState().error) useEditor.getState().seek(editor.time);
  };
  return (
    <dialog
      ref={dialog}
      className="template-dialog"
      aria-labelledby="terrain-title"
      onCancel={onClose}
    >
      <header className="template-header">
        <h2 id="terrain-title">Offline 3D terrain</h2>
        <button aria-label="Close terrain settings" onClick={onClose}>
          Close
        </button>
      </header>
      <section className="source-review">
        <h3>{terrainPack.name}</h3>
        <p>
          Nine verified original Terrarium tiles · 256×256 · source zoom 9 ·
          approximately 280 metres per source pixel. Coverage:{' '}
          {terrainPack.bounds.map((v) => v.toFixed(5)).join(', ')}.
        </p>
        <p>{TERRAIN_CREDIT}</p>
        <p>
          Source snapshot accessed {terrainPack.accessedAt.slice(0, 10)}.
          Elevations retain source anomalies and are reference visualization
          data. Coverage is regional; no street/building or current survey
          accuracy is implied.
        </p>
        <p>
          Terrain previews render at full project resolution and scale visually
          to fit, keeping geometry and anchors aligned with exported video. This
          uses more GPU memory, especially at 4K.
        </p>
        {!enabled && (
          <>
            <p>
              Enable replaces camera keys in every scene with a Sa Pa view at
              zoom 10.5/pitch 55°. Existing layers/media stay intact. Review
              this replacement before proceeding; Undo restores it.
            </p>
            <button onClick={enable}>
              Enable terrain and replace camera keys
            </button>
          </>
        )}
        {enabled && (
          <>
            <label className="field">
              Height exaggeration
              <input
                aria-label="Terrain exaggeration"
                type="number"
                min={0.1}
                max={3}
                step={0.1}
                value={enabled.exaggeration}
                onChange={(e) =>
                  editor.edit((p) => {
                    if (p.map.terrain)
                      p.map.terrain.exaggeration = Number(e.target.value);
                  })
                }
              />
            </label>
            <label>
              <input
                aria-label="Terrain hillshade"
                type="checkbox"
                checked={enabled.hillshade}
                onChange={(e) =>
                  editor.edit((p) => {
                    if (p.map.terrain)
                      p.map.terrain.hillshade = e.target.checked;
                  })
                }
              />{' '}
              Show hillshade
            </label>
            <p>
              Camera keys must remain within this pack at zoom 10 or greater.
              Set editable camera keys and pitch/bearing normally. Frame export
              and ground anchors use the same verified elevation.
            </p>
            <button
              onClick={() =>
                editor.edit((p) => {
                  p.map.terrain = null;
                })
              }
            >
              Disable terrain
            </button>
          </>
        )}
      </section>
      {editor.error && <p role="alert">{editor.error}</p>}
    </dialog>
  );
}
