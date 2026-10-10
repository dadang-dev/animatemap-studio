import { useEffect, useRef, useState } from 'react';
import type { ImageAsset } from '@animatemap/project-schema';
import { useEditor } from './store';
import {
  builtInImages,
  createTexture,
  importBuiltInFlag,
  importImage,
} from './imageImport';
import {
  addAssetLayer,
  assetReferences,
  deleteUnusedAsset,
} from './assetOperations';

export function AssetLibrary({
  sceneId,
  country,
  onClose,
}: {
  sceneId: string;
  country: string;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const editor = useEditor();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [provenance, setProvenance] = useState({
    source: '',
    author: '',
    license: '',
    credit: '',
  });
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  async function perform(operation: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await operation();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Asset operation failed',
      );
    } finally {
      setBusy(false);
    }
  }
  function add(asset: ImageAsset, kind: 'image' | 'texture') {
    const before = useEditor.getState().project;
    let selected = '';
    editor.edit((project) => {
      selected = addAssetLayer(project, sceneId, asset, kind, country);
    });
    const state = useEditor.getState();
    if (state.project === before)
      throw new Error(state.error || 'Asset was not added');
    useEditor.setState({
      selected,
      playing: false,
      tool: 'select',
      points: [],
    });
  }
  return (
    <dialog
      ref={dialog}
      className="template-dialog asset-dialog"
      aria-labelledby="asset-library-title"
      onCancel={(event) => {
        if (busy) event.preventDefault();
        else onClose();
      }}
    >
      <header className="template-header">
        <div>
          <h2 id="asset-library-title">Image assets</h2>
          <p>Embedded pixels and source credits travel with your project.</p>
        </div>
        <button onClick={onClose} disabled={busy}>
          Close assets
        </button>
      </header>
      {error && <p role="alert">{error}</p>}
      <fieldset disabled={busy}>
        <h3>Flags and textures</h3>
        <div className="template-grid">
          {builtInImages.map((item) => (
            <article className="template-card" key={item.id}>
              <img
                className="asset-preview"
                src={`/assets/flags/${item.id}.svg`}
                alt={item.name}
              />
              <h3>{item.name}</h3>
              <p>Commons · Public domain</p>
              <button
                onClick={() =>
                  void perform(async () =>
                    add(await importBuiltInFlag(item.id), 'image'),
                  )
                }
              >
                Add {item.name}
              </button>
              <button
                onClick={() =>
                  void perform(async () =>
                    add(await importBuiltInFlag(item.id), 'texture'),
                  )
                }
              >
                Fill {country} with {item.name}
              </button>
            </article>
          ))}
          {(['hatch', 'dots'] as const).map((kind) => (
            <article className="template-card" key={kind}>
              <h3>{kind === 'hatch' ? 'Hatch' : 'Dots'} texture</h3>
              <p>Procedural · CC0 · Repeats in project pixels</p>
              <button
                onClick={() =>
                  void perform(async () => add(createTexture(kind), 'texture'))
                }
              >
                Fill {country} with {kind}
              </button>
            </article>
          ))}
        </div>
        <form
          className="template-save"
          onSubmit={(event) => {
            event.preventDefault();
            if (file)
              void perform(async () => {
                add(await importImage(file, provenance), 'image');
                setFile(null);
              });
          }}
        >
          <h3>Import image / logo</h3>
          <label className="field">
            Static PNG or JPEG
            <input
              aria-label="Image file"
              type="file"
              accept="image/png,image/jpeg"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>
          <p className="hint">
            Up to 4096 pixels per edge. JPEG input ≤10 MB; PNG and normalized
            output ≤2 MB. Total project assets ≤3 MB compressed / 24 million
            pixels. Normalization preserves alpha and does not resize.
          </p>
          <div className="template-grid">
            {(['source', 'author', 'license', 'credit'] as const).map((key) => (
              <label className="field" key={key}>
                {key === 'credit' ? 'Visible credit' : `Asset ${key}`}
                <input
                  aria-label={`Asset ${key}`}
                  required
                  maxLength={
                    key === 'credit' ? 80 : key === 'source' ? 500 : 200
                  }
                  value={provenance[key]}
                  onChange={(event) =>
                    setProvenance({ ...provenance, [key]: event.target.value })
                  }
                />
              </label>
            ))}
          </div>
          <p className="hint">
            Record the actual source and usage permission; these fields declare
            provenance and do not grant rights.
          </p>
          <button disabled={!file} type="submit">
            Import image overlay
          </button>
        </form>
        <h3>Project assets ({editor.project.assets.length}/20)</h3>
        <div className="template-grid">
          {editor.project.assets.map((asset) => {
            const uses = assetReferences(editor.project, asset.id).length;
            return (
              <article className="template-card" key={asset.id}>
                <img
                  className="asset-preview"
                  src={asset.dataUrl}
                  alt={asset.name}
                />
                <h3>{asset.name}</h3>
                <p>
                  {asset.width} × {asset.height} · {uses} layer references
                  <br />
                  {asset.provenance.credit}
                </p>
                <button
                  onClick={() => void perform(async () => add(asset, 'image'))}
                >
                  Add overlay {asset.name}
                </button>
                <button
                  disabled={asset.width > 512 || asset.height > 512}
                  onClick={() =>
                    void perform(async () => add(asset, 'texture'))
                  }
                >
                  Use texture {asset.name}
                </button>
                <button
                  disabled={uses > 0}
                  onClick={() =>
                    editor.edit((project) =>
                      deleteUnusedAsset(project, asset.id),
                    )
                  }
                >
                  Delete unused {asset.name}
                </button>
              </article>
            );
          })}
        </div>
      </fieldset>
      {busy && <p role="status">Decoding image…</p>}
    </dialog>
  );
}
