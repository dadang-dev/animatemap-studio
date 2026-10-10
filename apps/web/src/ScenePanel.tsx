import { Globe2 } from 'lucide-react';
import { useEditor } from './store';
import { NumberField } from './NumberField';

export function ScenePanel({ sceneId }: { sceneId: string }) {
  const s = useEditor();
  const scene = s.project.scenes.find((scene) => scene.id === sceneId)!;
  const index = s.project.scenes.indexOf(scene);
  return (
    <section aria-label="Scenes">
      <div className="panel-heading section-heading">SCENES</div>
      <div className="scene-list">
        {s.project.scenes.map((item, i) => (
          <button
            className={`scene-card ${item.id === sceneId ? 'active' : ''}`}
            key={item.id}
            aria-label={`Select scene ${i + 1}: ${item.name}`}
            aria-pressed={item.id === sceneId}
            onClick={() => s.selectScene(item.id)}
          >
            <span className="scene-thumb">
              <Globe2 />
            </span>
            <span>
              {item.name}
              <small>
                {item.startSeconds.toFixed(2)}s ·{' '}
                {item.durationSeconds.toFixed(2)}s
              </small>
            </span>
            <span className="badge">{String(i + 1).padStart(2, '0')}</span>
          </button>
        ))}
      </div>
      <div className="scene-controls">
        <button
          disabled={
            s.project.scenes.length >= 20 || s.project.durationSeconds >= 300
          }
          onClick={() => s.sceneOperation({ type: 'add', camera: s.camera })}
        >
          Add scene
        </button>
        <button
          disabled={s.project.scenes.length >= 20}
          onClick={() => s.sceneOperation({ type: 'duplicate', id: sceneId })}
        >
          Duplicate scene
        </button>
      </div>
      <label className="field">
        Scene name
        <input
          aria-label="Scene name"
          maxLength={200}
          value={scene.name}
          onChange={(event) =>
            s.edit((project) => {
              project.scenes.find((item) => item.id === sceneId)!.name =
                event.target.value;
            })
          }
        />
      </label>
      <NumberField
        label="Scene duration"
        value={scene.durationSeconds}
        min={1}
        max={300}
        onChange={(duration) =>
          s.sceneOperation({ type: 'resize', id: sceneId, duration })
        }
      />
      <label className="field">
        Transition into scene
        <select
          aria-label="Scene transition"
          value={scene.transition.type}
          disabled={index === 0}
          onChange={(event) =>
            s.edit((project) => {
              const target = project.scenes.find(
                (item) => item.id === sceneId,
              )!;
              target.transition =
                event.target.value === 'cut'
                  ? { type: 'cut' }
                  : {
                      type: 'crossfade',
                      durationSeconds: Math.min(1, target.durationSeconds),
                    };
            })
          }
        >
          <option value="cut">Cut</option>
          <option value="crossfade" disabled={scene.durationSeconds < 0.1}>
            Crossfade from final frame
          </option>
        </select>
      </label>
      {scene.transition.type === 'crossfade' && (
        <NumberField
          label="Crossfade duration"
          value={scene.transition.durationSeconds}
          min={0.1}
          max={Math.min(5, scene.durationSeconds)}
          onChange={(duration) =>
            s.edit((project) => {
              const target = project.scenes.find(
                (item) => item.id === sceneId,
              )!;
              if (target.transition.type === 'crossfade')
                target.transition.durationSeconds = duration;
            })
          }
        />
      )}
      <div className="scene-controls">
        <button
          aria-label="Move scene earlier"
          disabled={index === 0}
          onClick={() =>
            s.sceneOperation({ type: 'move', id: sceneId, direction: -1 })
          }
        >
          ↑ Earlier
        </button>
        <button
          aria-label="Move scene later"
          disabled={index === s.project.scenes.length - 1}
          onClick={() =>
            s.sceneOperation({ type: 'move', id: sceneId, direction: 1 })
          }
        >
          ↓ Later
        </button>
        <button
          disabled={s.project.scenes.length === 1}
          onClick={() => s.sceneOperation({ type: 'delete', id: sceneId })}
        >
          Delete scene
        </button>
      </div>
      <p className="muted scene-hint">
        Cut / crossfade · {s.project.durationSeconds.toFixed(2)}s total
      </p>
    </section>
  );
}
