import { useEffect, useState } from 'react';
import { ADMIN1_RELEASE, type Layer } from '@animatemap/project-schema';
import { useEditor } from './store';
import { NumberField } from './NumberField';
export function Admin1Inspector({
  layer,
}: {
  layer: Extract<Layer, { type: 'admin1Highlight' }>;
}) {
  const editor = useEditor();
  const [ids, setIds] = useState(layer.regionCodes.join(','));
  useEffect(() => {
    setIds(layer.regionCodes.join(','));
  }, [layer.regionCodes]);
  return (
    <>
      <p className="hint">
        Natural Earth Admin 1 reference release {ADMIN1_RELEASE}. Islands and
        holes retain source geometry.
      </p>
      <label className="field">
        Region identifiers
        <textarea
          aria-label="Admin 1 region identifiers"
          rows={3}
          value={ids}
          onChange={(event) => setIds(event.target.value)}
          onBlur={() =>
            editor.patchLayer((target) => {
              if (target.type === 'admin1Highlight')
                target.regionCodes = ids
                  .split(',')
                  .map((code) => code.trim())
                  .filter(Boolean);
            })
          }
        />
      </label>
      <p className="hint">
        Use pinned ne_id identifiers, separated by commas. Unknown/duplicate
        regions reject without changing the project.
      </p>
      <label className="field">
        Region stroke
        <input
          aria-label="Admin 1 stroke"
          type="color"
          value={layer.style.stroke}
          onChange={(event) =>
            editor.patchLayer((target) => {
              if (target.type === 'admin1Highlight')
                target.style.stroke = event.target.value;
            })
          }
        />
      </label>
      <NumberField
        label="Admin 1 stroke width"
        value={layer.style.width}
        min={0}
        max={20}
        onChange={(value) =>
          editor.patchLayer((target) => {
            if (target.type === 'admin1Highlight') target.style.width = value;
          })
        }
      />
      <NumberField
        label="Admin 1 dim outside"
        value={layer.style.dimOutside}
        min={0}
        max={0.9}
        onChange={(value) =>
          editor.patchLayer((target) => {
            if (target.type === 'admin1Highlight')
              target.style.dimOutside = value;
          })
        }
      />
    </>
  );
}
