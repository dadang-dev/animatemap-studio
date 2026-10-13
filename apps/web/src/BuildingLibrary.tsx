import { useEffect, useRef, useState } from 'react';
import { evaluateProjectAt } from '@animatemap/animation-core';
import {
  MAX_BUILDING_BYTES,
  buildingHeightMetres,
  type BuildingDataset,
  type BuildingHeightUnit,
} from '@animatemap/project-schema';
import {
  vancouverImportOptions,
  type BuildingImportOptions,
} from './buildingImport';
import { buildingWorker } from './buildingFile';
import {
  addBuildingLayer,
  buildingReferences,
  deleteUnusedBuildings,
} from './buildingOperations';
import { useEditor } from './store';
export function BuildingLibrary({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null),
    editor = useEditor(),
    generation = useRef(0),
    mounted = useRef(true);
  const [input, setInput] = useState<{
    bytes: ArrayBuffer;
    builtin: boolean;
    fields: string[];
    count: number;
  } | null>(null);
  const [options, setOptions] = useState<BuildingImportOptions | null>(null);
  const [review, setReview] = useState<{
    dataset: BuildingDataset;
    base: string;
  } | null>(null);
  const [focus, setFocus] = useState(true),
    [aboveGrade, setAboveGrade] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    dialog.current?.showModal();
    return () => {
      mounted.current = false;
      generation.current++;
    };
  }, []);
  async function read(file?: File) {
    const token = ++generation.current;
    setBusy(true);
    setError('');
    setReview(null);
    setInput(null);
    setOptions(null);
    setAboveGrade(false);
    try {
      let bytes: ArrayBuffer;
      if (file) {
        if (
          file.size > MAX_BUILDING_BYTES ||
          !/\.(geojson|json)$/i.test(file.name)
        )
          throw new Error('Choose WGS84 GeoJSON/JSON up to 3 MiB');
        bytes = await file.arrayBuffer();
      } else {
        const response = await fetch('/data/buildings/vancouver-2009.geojson', {
          signal: AbortSignal.timeout(15000),
        });
        if (!response.ok)
          throw new Error(`Vancouver source unavailable (${response.status})`);
        const reader = response.body?.getReader();
        if (!reader) throw new Error('Building source body unavailable');
        const chunks: Uint8Array[] = [];
        let length = 0;
        try {
          for (;;) {
            const part = await reader.read();
            if (part.done) break;
            length += part.value.length;
            if (length > MAX_BUILDING_BYTES)
              throw new Error('Building source exceeds 3 MiB');
            chunks.push(part.value);
          }
        } finally {
          await reader.cancel();
        }
        const merged = new Uint8Array(length);
        let offset = 0;
        for (const chunk of chunks) {
          merged.set(chunk, offset);
          offset += chunk.length;
        }
        bytes = merged.buffer;
      }
      const inspected = await buildingWorker(bytes);
      if (!mounted.current || token !== generation.current) return;
      const id = crypto.randomUUID();
      setInput({
        bytes,
        builtin: !file,
        fields: inspected.fields,
        count: inspected.count,
      });
      setOptions(
        file
          ? {
              id,
              name: file.name.slice(0, 200),
              heightUnit: 'metres',
              idField: '',
              buildingIdField: '',
              provenance: {
                source: file.name,
                author: '',
                license: '',
                licenseURL: '',
                credit: '',
                accessedAt: new Date().toISOString(),
                surveyYear: null,
                uncertainty: '',
                sourceSha256: inspected.sourceSha256,
                heightField: '',
                heightReference: 'above-grade',
              },
            }
          : vancouverImportOptions(id),
      );
    } catch (e) {
      if (mounted.current && token === generation.current)
        setError(e instanceof Error ? e.message : 'Building import failed');
    } finally {
      if (mounted.current && token === generation.current) setBusy(false);
    }
  }
  function change(update: (next: BuildingImportOptions) => void) {
    if (!options) return;
    const next = structuredClone(options);
    update(next);
    setOptions(next);
    setReview(null);
  }
  async function validate() {
    if (!input || !options || !aboveGrade) return;
    const token = ++generation.current,
      base = JSON.stringify(useEditor.getState().project);
    setBusy(true);
    setError('');
    setReview(null);
    try {
      const dataset = await buildingWorker(input.bytes, options, input.builtin);
      if (mounted.current && token === generation.current)
        setReview({ dataset, base });
    } catch (e) {
      if (mounted.current && token === generation.current)
        setError(e instanceof Error ? e.message : 'Building validation failed');
    } finally {
      if (mounted.current && token === generation.current) setBusy(false);
    }
  }
  function apply(dataset: BuildingDataset, base?: string) {
    const state = useEditor.getState();
    if (base && JSON.stringify(state.project) !== base) {
      setError('Project changed during review; validate again');
      return;
    }
    const sceneId = evaluateProjectAt(state.project, state.time).sceneId;
    if (!sceneId) {
      setError('Seek inside a scene before adding buildings');
      return;
    }
    let id = '';
    state.edit((project) => {
      id = addBuildingLayer(project, sceneId, dataset, focus);
    });
    const result = useEditor.getState();
    if (result.error) {
      setError(result.error);
      return;
    }
    result.seek(result.time);
    useEditor.setState({ selected: id, playing: false, tool: 'select' });
    onClose();
  }
  const heights = review?.dataset.records.map((r) =>
    buildingHeightMetres(r.height, review.dataset.heightUnit),
  );
  return (
    <dialog
      ref={dialog}
      className="template-dialog"
      aria-labelledby="building-library-title"
      onCancel={onClose}
    >
      <header className="template-header">
        <h2 id="building-library-title">3D building footprints</h2>
        <button aria-label="Close building library" onClick={onClose}>
          Close
        </button>
      </header>
      <p>
        Real fill extrusions from measured height above grade. Prisms preserve
        original footprint holes and parts; they do not recreate roofs,
        interiors or current architecture.
      </p>
      <button disabled={busy} onClick={() => void read()}>
        Review Vancouver 2009 sample
      </button>
      <label className="field">
        Local WGS84 GeoJSON · 3 MiB / 500 footprints
        <input
          aria-label="Import building GeoJSON"
          type="file"
          accept=".geojson,.json"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void read(file);
            e.target.value = '';
          }}
        />
      </label>
      {input && options && (
        <section className="source-review">
          <h3>Map heights and review source · {input.count} elements</h3>
          <fieldset disabled={busy || input.builtin}>
            <label className="field">
              Dataset name
              <input
                aria-label="Building dataset name"
                value={options.name}
                onChange={(e) =>
                  change((o) => {
                    o.name = e.target.value;
                  })
                }
              />
            </label>
            <label className="field">
              Source ID field
              <select
                aria-label="Building ID field"
                value={options.idField}
                onChange={(e) =>
                  change((o) => {
                    o.idField = e.target.value;
                  })
                }
              >
                <option value="">GeoJSON feature.id</option>
                {input.fields.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </label>
            <label className="field">
              Building element group field
              <select
                aria-label="Building group field"
                value={options.buildingIdField}
                onChange={(e) =>
                  change((o) => {
                    o.buildingIdField = e.target.value;
                  })
                }
              >
                <option value="">No group</option>
                {input.fields.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </label>
            <label className="field">
              Height above grade field
              <select
                aria-label="Building height field"
                value={options.provenance.heightField}
                onChange={(e) =>
                  change((o) => {
                    o.provenance.heightField = e.target.value;
                  })
                }
              >
                <option value="">Choose measured height</option>
                {input.fields.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </label>
            <label className="field">
              Height units
              <select
                aria-label="Building height units"
                value={options.heightUnit}
                onChange={(e) =>
                  change((o) => {
                    o.heightUnit = e.target.value as BuildingHeightUnit;
                  })
                }
              >
                <option value="metres">Metres</option>
                <option value="feet">International feet · 0.3048 m</option>
                <option value="usSurveyFeet">
                  US survey feet · 1200/3937 m
                </option>
              </select>
            </label>
            {(
              [
                'source',
                'author',
                'license',
                'licenseURL',
                'credit',
                'uncertainty',
              ] as const
            ).map((key) => (
              <label className="field" key={key}>
                {key}
                <input
                  aria-label={`Building source ${key}`}
                  value={options.provenance[key]}
                  onChange={(e) =>
                    change((o) => {
                      o.provenance[key] = e.target.value;
                    })
                  }
                />
              </label>
            ))}
            <label className="field">
              Survey year (optional)
              <input
                type="number"
                aria-label="Building survey year"
                min={1}
                max={9999}
                value={options.provenance.surveyYear ?? ''}
                onChange={(e) =>
                  change((o) => {
                    o.provenance.surveyYear = e.target.value
                      ? Number(e.target.value)
                      : null;
                  })
                }
              />
            </label>
          </fieldset>
          <p>{options.provenance.credit}</p>
          <p>{options.provenance.uncertainty}</p>
          <label className="check">
            <input
              aria-label="Confirm height above grade"
              type="checkbox"
              checked={aboveGrade}
              onChange={(e) => {
                setAboveGrade(e.target.checked);
                setReview(null);
              }}
            />
            I confirm these heights are above grade in the selected units, and
            this source license permits my intended use.
          </label>
          <button
            disabled={busy || !aboveGrade}
            onClick={() => void validate()}
          >
            Validate building import
          </button>
          {review && heights && (
            <>
              <p role="status">
                Validated {review.dataset.records.length} footprints ·{' '}
                {Math.min(...heights).toFixed(2)}–
                {Math.max(...heights).toFixed(2)} metres above grade. Source
                checksum: {review.dataset.provenance.sourceSha256}
              </p>
              <button onClick={() => apply(review.dataset, review.base)}>
                Add reviewed buildings
              </button>
            </>
          )}
        </section>
      )}
      <label className="check">
        <input
          aria-label="Focus imported buildings"
          type="checkbox"
          checked={focus}
          onChange={(e) => setFocus(e.target.checked)}
        />
        Replace current scene camera keys with a pitched view of these
        footprints, disable its current follow and disable regional terrain.
        Undo restores the change.
      </label>
      <p className="hint">
        3D previews render at full project resolution. Local imports are
        embedded in project JSON; no source URL is fetched. Missing
        heights/invalid rings are rejected without changing saved projects.
      </p>
      {busy && <p role="status">Checking building source…</p>}
      {error && <p role="alert">{error}</p>}
      <h3>Project building datasets</h3>
      {editor.project.buildingDatasets.map((dataset) => (
        <div key={dataset.id} className="source-review">
          <p>
            {dataset.name} · {dataset.records.length} elements
          </p>
          <button disabled={busy} onClick={() => apply(dataset)}>
            Add building layer · {dataset.name}
          </button>
          <button
            disabled={!!buildingReferences(editor.project, dataset.id).length}
            onClick={() =>
              editor.edit((p) => deleteUnusedBuildings(p, dataset.id))
            }
          >
            Delete unused buildings · {dataset.name}
          </button>
        </div>
      ))}
    </dialog>
  );
}
