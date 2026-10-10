import { defaultDataDomain, type Layer } from '@animatemap/project-schema';
import { useEditor } from './store';
import { NumberField } from './NumberField';
import { dataYearKeys } from './datasetOperations';
export function ChoroplethInspector({
  layer,
}: {
  layer: Extract<Layer, { type: 'choropleth' }>;
}) {
  const editor = useEditor();
  const dataset = editor.project.datasets.find(
    (dataset) => dataset.id === layer.datasetId,
  )!;
  const duration = editor.project.scenes.find((scene) =>
    scene.layers.some((item) => item.id === layer.id),
  )!.durationSeconds;
  const minYear = Math.min(...dataset.records.map((record) => record.year));
  const maxYear = Math.max(...dataset.records.map((record) => record.year));
  const patch = (
    change: (layer: Extract<Layer, { type: 'choropleth' }>) => void,
  ) =>
    editor.patchLayer((layer) => {
      if (layer.type === 'choropleth') change(layer);
    });
  return (
    <>
      <label className="field">
        Data source
        <select
          aria-label="Choropleth dataset"
          value={layer.datasetId}
          onChange={(event) =>
            patch((target) => {
              const replacement = editor.project.datasets.find(
                (dataset) => dataset.id === event.target.value,
              )!;
              target.datasetId = replacement.id;
              target.domain = defaultDataDomain(replacement.records);
              target.dataYear = Math.min(
                ...replacement.records.map((record) => record.year),
              );
              target.tracks.dataYear = dataYearKeys(replacement, duration);
            })
          }
        >
          {editor.project.datasets.map((dataset) => (
            <option key={dataset.id} value={dataset.id}>
              {dataset.name}
            </option>
          ))}
        </select>
      </label>
      <NumberField
        label="Data year"
        min={minYear}
        max={maxYear}
        value={layer.dataYear}
        onChange={(value) =>
          patch((target) => {
            target.dataYear = value;
          })
        }
      />
      <p className="hint">
        Base year applies without year keys. Timeline dataYear keys animate{' '}
        {minYear}–{maxYear}.
      </p>
      <label className="field">
        Between observations
        <select
          aria-label="Data sampling"
          value={layer.sampling}
          onChange={(event) =>
            patch((target) => {
              target.sampling = event.target.value as 'linear' | 'step';
            })
          }
        >
          <option value="linear">Linear · interpolated estimates</option>
          <option value="step">Step · hold preceding observation</option>
        </select>
      </label>
      <div className="camera-grid">
        {(['min', 'max'] as const).map((field) => (
          <NumberField
            key={field}
            label={`Data domain ${field}`}
            value={layer.domain[field]}
            onChange={(value) =>
              patch((target) => {
                target.domain[field] = value;
              })
            }
          />
        ))}
      </div>
      {(['highColor', 'missingColor', 'stroke'] as const).map((field) => (
        <label className="field" key={field}>
          {field === 'highColor'
            ? 'High value color'
            : field === 'missingColor'
              ? 'Missing color'
              : 'Data border color'}
          <input
            type="color"
            aria-label={`Data ${field}`}
            value={layer.style[field]}
            onChange={(event) =>
              patch((target) => {
                target.style[field] = event.target.value;
              })
            }
          />
        </label>
      ))}
      <NumberField
        label="Data border width"
        min={0}
        max={20}
        value={layer.style.width}
        onChange={(value) =>
          patch((target) => {
            target.style.width = value;
          })
        }
      />
      <label className="check">
        <input
          type="checkbox"
          aria-label="Show data legend"
          checked={layer.legend.visible}
          onChange={(event) =>
            patch((target) => {
              target.legend.visible = event.target.checked;
            })
          }
        />{' '}
        Show legend
      </label>
      <div className="camera-grid">
        {(['x', 'y'] as const).map((field) => (
          <NumberField
            key={field}
            label={`Legend ${field}`}
            min={0}
            max={1}
            value={layer.legend[field]}
            onChange={(value) =>
              patch((target) => {
                target.legend[field] = value;
              })
            }
          />
        ))}
      </div>
      <p className="hint">
        Fixed domain across years. Missing values are outside a country's
        observed range. {dataset.provenance.credit} ·{' '}
        {dataset.provenance.license}
      </p>
    </>
  );
}
