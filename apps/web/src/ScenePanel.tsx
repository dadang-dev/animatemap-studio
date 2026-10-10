import { Globe2 } from 'lucide-react';
import { useEditor } from './store';
import { NumberField } from './Inspector';

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
        Cut transitions · {s.project.durationSeconds.toFixed(2)}s total
      </p>
    </section>
  );
}
