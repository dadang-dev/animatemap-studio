import { useEffect, useRef, useState } from 'react';
import { evaluateProjectAt } from '@animatemap/animation-core';
import {
  MAX_MODEL_BYTES,
  buildingHeightMetres,
  type ModelAsset,
  type BuildingHeightUnit,
} from '@animatemap/project-schema';
import {
  aircraftOptions,
  authoredAircraftOBJ,
  type ModelImportOptions,
} from './modelImport';
import { modelWorker } from './modelFile';
import {
  addModelLayer,
  modelReferences,
  deleteUnusedModel,
} from './modelOperations';
import { useEditor } from './store';
export function ModelLibrary({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null),
    editor = useEditor(),
    mounted = useRef(true),
    abort = useRef<AbortController | null>(null),
    generation = useRef(0);
  const [input, setInput] = useState<{
      bytes: ArrayBuffer;
      builtin: boolean;
    } | null>(null),
    [options, setOptions] = useState<ModelImportOptions | null>(null),
    [review, setReview] = useState<{ asset: ModelAsset; base: string } | null>(
      null,
    );
  const [confirmed, setConfirmed] = useState(false),
    [focus, setFocus] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    dialog.current?.showModal();
    return () => {
      mounted.current = false;
      generation.current++;
      abort.current?.abort();
    };
  }, []);
  async function read(file?: File) {
    const token = ++generation.current;
    abort.current?.abort();
    setBusy(true);
    setError('');
    setReview(null);
    setConfirmed(false);
    setInput(null);
    setOptions(null);
    try {
      let bytes: ArrayBuffer;
      if (file) {
        if (
          file.size > MAX_MODEL_BYTES ||
          !file.name.toLowerCase().endsWith('.obj')
        )
          throw new Error('Choose untextured triangle OBJ up to 3 MiB');
        bytes = await file.arrayBuffer();
      } else bytes = new TextEncoder().encode(authoredAircraftOBJ()).buffer;
      if (!mounted.current || token !== generation.current) return;
      setInput({ bytes, builtin: !file });
      setOptions(
        file
          ? {
              ...aircraftOptions(crypto.randomUUID()),
              name: file.name.slice(0, 200),
              sourceUpAxis: 'Y',
              provenance: {
                source: file.name,
                author: '',
                license: '',
                credit: '',
              },
            }
          : aircraftOptions(crypto.randomUUID()),
      );
    } catch (e) {
      if (mounted.current && token === generation.current)
        setError(e instanceof Error ? e.message : 'Model input failed');
    } finally {
      if (mounted.current && token === generation.current) setBusy(false);
    }
  }
  function change(fn: (next: ModelImportOptions) => void) {
    if (!options) return;
    const next = structuredClone(options);
    fn(next);
    setOptions(next);
    setReview(null);
  }
  async function validate() {
    if (!input || !options || !confirmed) return;
    const token = ++generation.current,
      controller = new AbortController();
    abort.current?.abort();
    abort.current = controller;
    const base = JSON.stringify(useEditor.getState().project);
    setBusy(true);
    setError('');
    setReview(null);
    try {
      const asset = await modelWorker(input.bytes, options, controller.signal);
      if (mounted.current && token === generation.current)
        setReview({ asset, base });
    } catch (e) {
      if (mounted.current && token === generation.current)
        setError(e instanceof Error ? e.message : 'Model validation failed');
    } finally {
      if (mounted.current && token === generation.current) setBusy(false);
    }
  }
  function apply(asset: ModelAsset, base?: string) {
    const state = useEditor.getState();
    if (base && JSON.stringify(state.project) !== base) {
      setError('Project changed during review; validate again');
      return;
    }
    const sceneId = evaluateProjectAt(state.project, state.time).sceneId;
    if (!sceneId) {
      setError('Seek inside a scene before adding a model');
      return;
    }
    let id = '';
    state.edit((p) => {
      id = addModelLayer(p, sceneId, asset, state.camera);
      if (focus) {
        const scene = p.scenes.find((s) => s.id === sceneId)!;
        scene.camera.follow = null;
        scene.camera.keyframes = [
          {
            time: 0,
            value: { ...state.camera, zoom: 17, pitch: 55 },
            easing: 'linear',
          },
        ];
      }
    });
    const next = useEditor.getState();
    if (next.error) {
      setError(next.error);
      return;
    }
    next.seek(next.time);
    useEditor.setState({ selected: id, playing: false, tool: 'select' });
    onClose();
  }
  const extent = review
    ? [0, 1, 2].map((axis) => {
        const values = review.asset.vertices.map((p) => p[axis]!);
        return buildingHeightMetres(
          Math.max(...values) - Math.min(...values),
          review.asset.unit,
        );
      })
    : [];
  return (
    <dialog
      ref={dialog}
      className="template-dialog"
      aria-labelledby="model-library-title"
      onCancel={onClose}
    >
      <header className="template-header">
        <h2 id="model-library-title">Local 3D models</h2>
        <button aria-label="Close model library" onClick={onClose}>
          Close
        </button>
      </header>
      <p>
        Real untextured triangle meshes · 3 MiB / 20,000 vertices and triangles.
        Materials, images, GLB/FBX and skeletal animation are unsupported by
        this first OBJ pipeline. Source files are parsed locally; external
        resources and code are rejected.
      </p>
      <button disabled={busy} onClick={() => void read()}>
        Review CC0 aircraft mesh
      </button>
      <label className="field">
        Local triangle OBJ
        <input
          aria-label="Import model OBJ"
          type="file"
          accept=".obj"
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
          <h3>Source, units and origin</h3>
          <fieldset disabled={busy || input.builtin}>
            <label className="field">
              Model name
              <input
                aria-label="Model asset name"
                value={options.name}
                onChange={(e) =>
                  change((o) => {
                    o.name = e.target.value;
                  })
                }
              />
            </label>
            <label className="field">
              Source units
              <select
                aria-label="Model source units"
                value={options.unit}
                onChange={(e) =>
                  change((o) => {
                    o.unit = e.target.value as BuildingHeightUnit;
                  })
                }
              >
                <option value="metres">Metres</option>
                <option value="feet">International feet</option>
                <option value="usSurveyFeet">US survey feet</option>
              </select>
            </label>
            <label className="field">
              Source up axis
              <select
                aria-label="Model up axis"
                value={options.sourceUpAxis}
                onChange={(e) =>
                  change((o) => {
                    o.sourceUpAxis = e.target.value as 'Y' | 'Z';
                  })
                }
              >
                <option value="Y">Y up · −Z forward</option>
                <option value="Z">Z up · +Y forward</option>
              </select>
            </label>
            <label className="field">
              Placement origin
              <select
                aria-label="Model origin"
                value={options.placementOrigin}
                onChange={(e) =>
                  change((o) => {
                    o.placementOrigin = e.target.value as
                      | 'preserve'
                      | 'ground-centre';
                  })
                }
              >
                <option value="ground-centre">
                  Centre horizontally, lowest vertex on ground
                </option>
                <option value="preserve">Preserve source origin</option>
              </select>
            </label>
            {(['source', 'author', 'license', 'credit'] as const).map((key) => (
              <label className="field" key={key}>
                {key}
                <input
                  aria-label={`Model source ${key}`}
                  value={options.provenance[key]}
                  onChange={(e) =>
                    change((o) => {
                      o.provenance[key] = e.target.value;
                    })
                  }
                />
              </label>
            ))}
          </fieldset>
          <p>{options.provenance.credit}</p>
          <p>
            Axes convert into X east / Y north / Z up. Ground-centre explicitly
            shifts the source origin; preserve-origin keeps it. Flat normals are
            derived from triangles. Asset dimensions are declared, not measured
            geospatial objects.
          </p>
          <label className="check">
            <input
              type="checkbox"
              aria-label="Confirm model units and rights"
              checked={confirmed}
              disabled={busy}
              onChange={(e) => {
                setConfirmed(e.target.checked);
                setReview(null);
              }}
            />
            I confirm the declared units/up axis/origin and this source license
            permits my intended use.
          </label>
          <button disabled={busy || !confirmed} onClick={() => void validate()}>
            Validate model import
          </button>
          {review && (
            <>
              <p role="status">
                Validated {review.asset.vertices.length} vertices /{' '}
                {review.asset.triangles.length} triangles · extents{' '}
                {extent.map((n) => n.toFixed(2)).join(' × ')} metres. Source
                SHA-256: {review.asset.sourceSha256}
              </p>
              <button onClick={() => apply(review.asset, review.base)}>
                Add reviewed model
              </button>
            </>
          )}
        </section>
      )}
      <label className="check">
        <input
          aria-label="Focus imported model"
          type="checkbox"
          checked={focus}
          onChange={(e) => setFocus(e.target.checked)}
        />
        Replace current scene camera keys with a close pitched view and disable
        its current follow. Regional terrain stays enabled. Undo restores the
        change.
      </label>
      <p className="hint">
        Models use native canvas preview and the same deterministic renderer
        during export. Motion paths are geographic illustrations unless supplied
        with verified routing provenance.
      </p>
      {busy && <p role="status">Validating local mesh…</p>}
      {error && <p role="alert">{error}</p>}
      <h3>Project model assets</h3>
      {editor.project.modelAssets.map((asset) => (
        <section className="source-review" key={asset.id}>
          <p>
            {asset.name} · {asset.triangles.length} triangles
          </p>
          <button disabled={busy} onClick={() => apply(asset)}>
            Add model layer · {asset.name}
          </button>
          <button
            disabled={!!modelReferences(editor.project, asset.id).length}
            onClick={() => editor.edit((p) => deleteUnusedModel(p, asset.id))}
          >
            Delete unused model · {asset.name}
          </button>
        </section>
      ))}
    </dialog>
  );
}
