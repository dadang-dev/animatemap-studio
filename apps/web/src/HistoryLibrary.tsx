import { useEffect, useRef, useState } from 'react';
import {
  MAX_HISTORY_BYTES,
  type HistoricalDataset,
} from '@animatemap/project-schema';
import { evaluateProjectAt } from '@animatemap/animation-core';
import pack from '../../../data/history/pack.json';
import { addHistoricalLayer } from './historyOperations';
import { useEditor } from './store';
export function HistoryLibrary({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null),
    generation = useRef(0),
    active = useRef<Worker | null>(null);
  const [review, setReview] = useState<HistoricalDataset | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [rights, setRights] = useState(false),
    [focus, setFocus] = useState(true);
  useEffect(() => {
    dialog.current?.showModal();
    return () => {
      generation.current++;
      active.current?.terminate();
    };
  }, []);
  async function read(file?: File) {
    const token = ++generation.current;
    active.current?.terminate();
    setBusy(true);
    setError('');
    setReview(null);
    setRights(false);
    try {
      if (
        file &&
        (file.size > MAX_HISTORY_BYTES || !/\.json$/i.test(file.name))
      )
        throw new Error(
          'Choose an AnimateMap historical manifest JSON up to 10 MiB',
        );
      let bytes: ArrayBuffer;
      if (file) bytes = await file.arrayBuffer();
      else {
        const response = await fetch(pack.path, {
          signal: AbortSignal.timeout(15000),
        });
        if (!response.ok)
          throw new Error(`Historical source unavailable (${response.status})`);
        const reader = response.body?.getReader();
        if (!reader) throw new Error('Historical source body unavailable');
        const chunks: Uint8Array[] = [];
        let length = 0;
        try {
          for (;;) {
            const part = await reader.read();
            if (part.done) break;
            length += part.value.length;
            if (length > pack.bytes)
              throw new Error('Pinned historical source size mismatch');
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
        const hash = [
          ...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
        ]
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');
        if (length !== pack.bytes || hash !== pack.sha256)
          throw new Error('Pinned historical source checksum mismatch');
      }
      if (token !== generation.current) return;
      const worker = new Worker(
        new URL('./historyImport.worker.ts', import.meta.url),
        { type: 'module' },
      );
      active.current = worker;
      const dataset = await new Promise<HistoricalDataset>(
        (resolve, reject) => {
          const timer = setTimeout(
            () =>
              reject(
                new Error('Historical validation timed out after 15 seconds'),
              ),
            15000,
          );
          worker.onmessage = (
            event: MessageEvent<{ result?: HistoricalDataset; error?: string }>,
          ) => {
            clearTimeout(timer);
            if (event.data.result) resolve(event.data.result);
            else
              reject(
                new Error(event.data.error ?? 'Historical validation failed'),
              );
          };
          worker.onerror = () => {
            clearTimeout(timer);
            reject(new Error('Historical validation worker unavailable'));
          };
          worker.postMessage(bytes, [bytes]);
        },
      ).finally(() => worker.terminate());
      if (token === generation.current) setReview(dataset);
    } catch (error) {
      if (token === generation.current)
        setError(
          error instanceof Error
            ? error.message.slice(0, 600)
            : 'Historical import failed',
        );
    } finally {
      if (token === generation.current) setBusy(false);
    }
  }
  function apply() {
    if (!review || !rights) return;
    const editor = useEditor.getState(),
      sceneId = evaluateProjectAt(editor.project, editor.time).sceneId;
    if (!sceneId) {
      setError('Select an active scene');
      return;
    }
    const id = crypto.randomUUID(),
      previous = editor.project;
    editor.edit((project) => {
      addHistoricalLayer(project, sceneId, review, focus, id);
    });
    const current = useEditor.getState();
    if (current.project === previous) {
      setError(current.error);
      return;
    }
    current.seek(current.time);
    useEditor.setState({ selected: id, playing: false });
    onClose();
  }
  return (
    <dialog
      ref={dialog}
      onCancel={onClose}
      className="template-dialog"
      aria-label="Historical boundaries library"
    >
      <h2>Historical boundaries</h2>
      <button onClick={onClose}>Close</button>
      <p>
        Source snapshots retain original geometry. Coverage and uncertainty are
        declared by the dataset. Morph is an illustrative effect between
        snapshots.
      </p>
      <button disabled={busy} onClick={() => void read()}>
        Review DC wards 1982–2011
      </button>
      <label>
        Import historical manifest JSON
        <input
          type="file"
          accept=".json"
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void read(file);
            event.target.value = '';
          }}
        />
      </label>
      {busy && (
        <p role="status">Validating historical topology and provenance…</p>
      )}
      {error && <p role="alert">{error}</p>}
      {review && (
        <section>
          <h3>{review.name}</h3>
          <p>{review.scope}</p>
          <p>
            {review.provenance.credit} · {review.provenance.license}
          </p>
          <p>{review.provenance.derivation}</p>
          <p>{review.provenance.uncertainty}</p>
          <ul>
            {review.epochs.map((epoch) => (
              <li key={epoch.id}>
                {epoch.fromYear}–{epoch.toYear}: {epoch.uncertainty}
              </li>
            ))}
          </ul>
          <a
            href={review.provenance.licenseURL}
            target="_blank"
            rel="noreferrer"
          >
            Source license
          </a>
          <label>
            <input
              type="checkbox"
              checked={rights}
              onChange={(event) => setRights(event.target.checked)}
            />
            I reviewed source rights, year coverage and uncertainty
          </label>
          <label>
            <input
              type="checkbox"
              checked={focus}
              onChange={(event) => setFocus(event.target.checked)}
            />
            Focus source coverage; replace camera keys and disable
            terrain/follow
          </label>
          <button disabled={!rights} onClick={apply}>
            Add historical boundaries
          </button>
        </section>
      )}
    </dialog>
  );
}
