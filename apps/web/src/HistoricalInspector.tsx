import type { Layer } from '@animatemap/project-schema';
import { evaluateProjectAt } from '@animatemap/animation-core';
import { useEditor } from './store';
import { NumberField } from './NumberField';
export function HistoricalInspector({
  layer,
}: {
  layer: Extract<Layer, { type: 'historical' }>;
}) {
  const editor = useEditor(),
    dataset = editor.project.historicalDatasets.find(
      (d) => d.id === layer.historicalDatasetId,
    )!;
  const state = evaluateProjectAt(editor.project, editor.time).layers.find(
    (l) => l.id === layer.id,
  )?.historical;
  const first = dataset.epochs[0]!.fromYear,
    last = dataset.epochs.at(-1)!.toYear;
  return (
    <section>
      <p>{dataset.provenance.credit}</p>
      <p>{dataset.scope}</p>
      <p role="status">{state?.label}</p>
      <p>{state?.uncertainty}</p>
      <NumberField
        label="Historical year"
        value={layer.historyYear}
        min={-10000}
        max={10000}
        step={0.1}
        onChange={(value) =>
          editor.patchLayer((l) => {
            if (l.type === 'historical') l.historyYear = value;
          })
        }
      />
      <label>
        Year slider
        <input
          aria-label="Historical year slider"
          type="range"
          min={first}
          max={last}
          step={0.1}
          value={layer.historyYear}
          onChange={(event) =>
            editor.patchLayer((l) => {
              if (l.type === 'historical')
                l.historyYear = Number(event.target.value);
            })
          }
        />
      </label>
      <p>
        Year keys in the timeline override the base year. Source mode uses
        declared whole-year coverage.
      </p>
      <label>
        Boundary mode
        <select
          aria-label="Historical boundary mode"
          value={layer.mode}
          onChange={(event) =>
            editor.patchLayer((l) => {
              if (l.type === 'historical')
                l.mode = event.target.value as 'source' | 'morph';
            })
          }
        >
          <option value="source">Documented source snapshots</option>
          <option value="morph" disabled={layer.regionIds.length !== 1}>
            Illustrative morph · one simple region
          </option>
        </select>
      </label>
      <p>
        Morph is not factual intermediate-year geography. Holes, multipart
        boundaries or unsafe topology produce a visible blocked state.
      </p>
      <fieldset>
        <legend>Historical regions</legend>
        {dataset.regions.map((region) => (
          <label key={region.id}>
            <input
              type="checkbox"
              aria-label={`Historical ${region.name}`}
              checked={layer.regionIds.includes(region.id)}
              disabled={
                layer.mode === 'morph' ||
                (layer.regionIds.length === 1 &&
                  layer.regionIds.includes(region.id))
              }
              onChange={(event) =>
                editor.patchLayer((l) => {
                  if (l.type === 'historical')
                    l.regionIds = event.target.checked
                      ? [...l.regionIds, region.id]
                      : l.regionIds.filter((id) => id !== region.id);
                })
              }
            />
            {region.name}
          </label>
        ))}
      </fieldset>
      <NumberField
        label="Historical border width"
        value={layer.style.borderWidth}
        min={0}
        max={20}
        onChange={(value) =>
          editor.patchLayer((l) => {
            if (l.type === 'historical') l.style.borderWidth = value;
          })
        }
      />
      <details>
        <summary>Historical provenance</summary>
        <p>{dataset.provenance.derivation}</p>
        <p>{dataset.provenance.uncertainty}</p>
        {dataset.epochs.map((epoch) => (
          <p key={epoch.id}>
            {epoch.fromYear}–{epoch.toYear}: {epoch.uncertainty}
          </p>
        ))}
      </details>
    </section>
  );
}
