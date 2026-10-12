import { buildingHeightMetres, type Layer } from '@animatemap/project-schema';
import { NumberField } from './NumberField';
import { useEditor } from './store';
export function BuildingInspector({
  layer,
}: {
  layer: Extract<Layer, { type: 'buildings' }>;
}) {
  const editor = useEditor(),
    dataset = editor.project.buildingDatasets.find(
      (d) => d.id === layer.buildingDatasetId,
    );
  if (!dataset) return <p role="alert">Missing building dataset</p>;
  const heights = dataset.records.map((r) =>
    buildingHeightMetres(r.height, dataset.heightUnit),
  );
  return (
    <>
      <NumberField
        label="Building height scale"
        min={0}
        max={3}
        value={layer.heightScale}
        onChange={(v) =>
          editor.patchLayer((l) => {
            if (l.type === 'buildings') l.heightScale = v;
          })
        }
      />
      <label className="check">
        <input
          type="checkbox"
          aria-label="Building vertical gradient"
          checked={layer.style.verticalGradient}
          onChange={(e) =>
            editor.patchLayer((l) => {
              if (l.type === 'buildings')
                l.style.verticalGradient = e.target.checked;
            })
          }
        />
        Vertical shading
      </label>
      <button
        onClick={() =>
          editor.patchLayer((l) => {
            if (l.type !== 'buildings') return;
            l.tracks.heightScale = [
              { time: l.timeRange.start, value: 0, easing: 'easeInOut' },
              {
                time: Math.min(l.timeRange.start + 1, l.timeRange.end),
                value: 1,
                easing: 'linear',
              },
            ];
          })
        }
      >
        Animate building growth
      </button>
      <p className="hint">
        Height scale is a stylized animation of the recorded height. Scale 1
        shows the reported measurement. Editable keys use scene-local time.
      </p>
      <details className="source-review" open>
        <summary>Building source</summary>
        <p>
          {dataset.name} · {dataset.records.length} footprint elements ·{' '}
          {Math.min(...heights).toFixed(2)}–{Math.max(...heights).toFixed(2)}{' '}
          metres above grade.
        </p>
        <p>{dataset.provenance.credit}</p>
        <p>
          {dataset.provenance.license} ·{' '}
          {dataset.provenance.surveyYear ?? 'Year unspecified'}
        </p>
        <p>{dataset.provenance.uncertainty}</p>
        <a
          href={dataset.provenance.licenseURL}
          target="_blank"
          rel="noreferrer"
        >
          Source license
        </a>
      </details>
    </>
  );
}
