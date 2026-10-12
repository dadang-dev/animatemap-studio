import { useEffect, useRef, useState } from 'react';
import { afterEffectsJSX, type AEManifest } from '@animatemap/animation-core';
import type { Countries } from '@animatemap/map-engine';
import { useEditor } from './store';
import { sampleAfterEffects, downloadInterchange } from './afterEffectsExport';
export function AfterEffectsPanel({
  countries,
  onClose,
}: {
  countries?: Countries;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    controller = useRef<AbortController | null>(null);
  const [progress, setProgress] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [result, setResult] = useState<{
      manifest: AEManifest;
      jsx: string;
    } | null>(null);
  useEffect(() => {
    dialog.current?.showModal();
    return () => controller.current?.abort();
  }, []);
  const close = () => {
    controller.current?.abort();
    onClose();
  };
  const sample = async () => {
    if (!countries) {
      setError('Map is not ready; wait for geography to load');
      return;
    }
    const owned = new AbortController();
    controller.current = owned;
    setBusy(true);
    setError('');
    setResult(null);
    setProgress(0);
    try {
      const manifest = await sampleAfterEffects(
        useEditor.getState().project,
        countries,
        owned.signal,
        setProgress,
      );
      if (!owned.signal.aborted)
        setResult({ manifest, jsx: afterEffectsJSX(manifest) });
    } catch (error) {
      if (!owned.signal.aborted)
        setError(
          error instanceof Error
            ? error.message
            : 'After Effects sampling failed',
        );
    } finally {
      if (controller.current === owned) {
        controller.current = null;
        setBusy(false);
      }
    }
  };
  return (
    <dialog
      ref={dialog}
      className="template-dialog"
      aria-labelledby="ae-title"
      onCancel={close}
    >
      <header className="template-header">
        <h2 id="ae-title">After Effects interchange</h2>
        <button aria-label="Close After Effects interchange" onClick={close}>
          Close
        </button>
      </header>
      <p>
        Export camera metadata and baked 2D attachment anchors from an immutable
        project snapshot. Sampling uses the same full-size MapLibre renderer and
        timeline as your video.
      </p>
      <p>
        Camera longitude/latitude/zoom/bearing/pitch become metadata sliders,
        not an AE 3D camera. Marker/text/image anchors become 2D nulls with
        position, scale, rotation and visibility keys. Map geometry, fonts,
        audio and captions stay in the separately rendered map footage. Retain
        its attribution.
      </p>
      <p>
        The JSX importer has not been validated in an installed Adobe host on
        this machine. Run it in After Effects via File → Scripts → Run Script
        File. It creates a new composition in one undo group and does not save
        or overwrite your project. Import your rendered video at time 0; attach
        graphics to the matching nulls. Keys use Hold at the source FPS;
        subframe interpolation is outside this contract.
      </p>
      <button
        disabled={busy}
        onClick={() => {
          void sample();
        }}
      >
        Prepare camera & anchors
      </button>
      {busy && (
        <div role="status">
          Sampling frames · {Math.round(progress * 100)}%
          <progress max={1} value={progress} />
          <button onClick={() => controller.current?.abort()}>
            Cancel sampling
          </button>
        </div>
      )}
      {result && (
        <section
          aria-label="After Effects export review"
          className="source-review"
        >
          <h3>{result.manifest.name}</h3>
          <p>
            {result.manifest.frames.length} frames ·{' '}
            {result.manifest.anchors.length} anchors ·{' '}
            {result.manifest.canvas.width}×{result.manifest.canvas.height} ·{' '}
            {result.manifest.canvas.fps} FPS
          </p>
          <button
            onClick={() =>
              downloadInterchange(
                JSON.stringify(result.manifest, null, 2),
                'animatemap-camera-anchors.json',
                'application/json',
              )
            }
          >
            Download camera/anchor JSON
          </button>
          <button
            onClick={() =>
              downloadInterchange(
                result.jsx,
                'animatemap-import.jsx',
                'text/javascript;charset=utf-8',
              )
            }
          >
            Download JSX importer
          </button>
          <p>{result.manifest.attribution.join(' · ')}</p>
        </section>
      )}
      {error && <p role="alert">{error}</p>}
    </dialog>
  );
}
