import { useEditor } from './store';
import { NumberField } from './NumberField';
export function NumberCounterInspector() {
  const s = useEditor();
  const scene = s.project.scenes.find((scene) =>
    scene.layers.some((l) => l.id === s.selected),
  );
  const layer = scene?.layers.find((l) => l.id === s.selected);
  if (!scene || layer?.type !== 'text') return null;
  return (
    <fieldset disabled={layer.locked}>
      <label>
        <input
          type="checkbox"
          aria-label="Animate number"
          checked={!!layer.counter}
          onChange={(e) =>
            s.patchLayer((l) => {
              if (l.type === 'text')
                l.counter = e.target.checked
                  ? {
                      from: 0,
                      to: 100,
                      start: 0,
                      end: Math.min(1, scene.durationSeconds),
                      decimals: 0,
                      locale: 'vi-VN',
                      easing: 'easeOut',
                    }
                  : undefined;
            })
          }
        />
        Animate number
      </label>
      {layer.counter && (
        <>
          {(['from', 'to', 'start', 'end', 'decimals'] as const).map((key) => (
            <NumberField
              key={key}
              label={`Counter ${key}`}
              value={layer.counter![key]}
              onChange={(value) =>
                s.patchLayer((l) => {
                  if (l.type === 'text' && l.counter) l.counter[key] = value;
                })
              }
            />
          ))}
          <label className="field">
            Number locale
            <select
              aria-label="Counter locale"
              value={layer.counter.locale}
              onChange={(e) =>
                s.patchLayer((l) => {
                  if (l.type === 'text' && l.counter)
                    l.counter.locale = e.target.value as 'vi-VN' | 'en-US';
                })
              }
            >
              <option value="vi-VN">Vietnamese</option>
              <option value="en-US">English</option>
            </select>
          </label>
        </>
      )}
    </fieldset>
  );
}
