import { useEffect, useMemo, useRef, useState } from 'react';
import {
  migrateProject,
  projectProposalSchema,
  type Project,
  type ProjectProposal,
} from '@animatemap/project-schema';
import { api } from './persistence';
import { useEditor } from './store';
import { lockedProject, applyReviewedProposal } from './aiOperations';
type Review = {
  project: Project;
  summary: string;
  proposal: ProjectProposal;
  provider: {
    name: string;
    model: string;
    toolCalls: number;
    elapsedMs: number;
    usage: Record<string, number>;
  };
};
export function AIPanel({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null),
    controller = useRef<AbortController | null>(null),
    generationId = useRef<string | null>(null),
    base = useRef('');
  const [status, setStatus] = useState<{
      available: boolean;
      busy: boolean;
    } | null>(null),
    [prompt, setPrompt] = useState(''),
    [review, setReview] = useState<Review | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const editor = useEditor();
  const locked = lockedProject(editor.project);
  const currentJSON = useMemo(
    () => JSON.stringify(editor.project),
    [editor.project],
  );
  const stale = !!review && currentJSON !== base.current;
  useEffect(() => {
    dialog.current?.showModal();
    let active = true;
    void api<{ available: boolean; busy: boolean }>('/ai/status')
      .then((s) => {
        if (active) setStatus(s);
      })
      .catch((e: unknown) => {
        if (active)
          setError(e instanceof Error ? e.message : 'Codex status unavailable');
      });
    return () => {
      active = false;
      controller.current?.abort();
    };
  }, []);
  const cancel = () => {
    controller.current?.abort();
    if (generationId.current)
      void api('/ai/cancel', {
        method: 'POST',
        body: JSON.stringify({ generationId: generationId.current }),
      }).catch(() => undefined);
  };
  const generate = async () => {
    setError('');
    setReview(null);
    setBusy(true);
    const owned = new AbortController();
    const id = crypto.randomUUID();
    generationId.current = id;
    controller.current = owned;
    const original = useEditor.getState().project;
    base.current = JSON.stringify(original);
    try {
      const value = await api<Review>('/ai/propose', {
        method: 'POST',
        signal: owned.signal,
        body: JSON.stringify({ prompt, project: original, generationId: id }),
      });
      if (owned.signal.aborted) return;
      const parsed = migrateProject(value.project),
        proposal = projectProposalSchema.parse(value.proposal);
      if (
        value.provider.toolCalls !== 0 ||
        typeof value.summary !== 'string' ||
        value.summary.length > 600
      )
        throw new Error('Invalid Codex review response; project unchanged');
      setReview({ ...value, project: parsed, proposal });
    } catch (e) {
      if (!owned.signal.aborted)
        setError(
          e instanceof Error
            ? e.message
            : 'Codex generation failed; project unchanged',
        );
    } finally {
      if (controller.current === owned) {
        controller.current = null;
        generationId.current = null;
        setBusy(false);
      }
    }
  };
  const close = () => {
    cancel();
    onClose();
  };
  return (
    <dialog
      ref={dialog}
      className="template-dialog ai-dialog"
      aria-labelledby="ai-title"
      onCancel={close}
    >
      <header className="template-header">
        <h2 id="ai-title">Create with Codex</h2>
        <button aria-label="Close Codex proposals" onClick={close}>
          Close
        </button>
      </header>
      <p>
        Generate a new map composition using your installed, signed-in Codex
        CLI. Your prompt and a bounded project summary plus verified
        place/country references are sent to that account. No separate API key
        is required. The installed CLI default model is used.
      </p>
      <p>
        Generation produces JSON for review. It cannot edit your project until
        you choose Apply. Supported: camera keys, current country highlights,
        verified city markers, illustrative connections and plain Unicode text.
        Historical borders, street navigation and external assets are outside
        this proposal contract.
      </p>
      <label className="field">
        Describe your map
        <textarea
          aria-label="Codex map prompt"
          rows={5}
          maxLength={2000}
          disabled={busy}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="A 12-second journey through Vietnam with Hanoi, Da Nang and Ho Chi Minh City, warm route colors and a Vietnamese title"
        />
      </label>
      <p>
        {status?.available
          ? 'Codex CLI found · local read-only run · tools disabled'
          : status
            ? 'Codex CLI unavailable; check local installation/sign-in or ANIMATEMAP_CODEX_PATH'
            : 'Checking Codex installation…'}
      </p>
      <button
        disabled={busy || !status?.available || prompt.trim().length < 3}
        onClick={() => {
          void generate();
        }}
      >
        Generate proposal
      </button>
      {busy && (
        <p role="status">
          Codex is generating a validated JSON proposal…{' '}
          <button onClick={cancel}>Cancel generation</button>
        </p>
      )}
      {review && (
        <section className="source-review" aria-label="Codex proposal review">
          <h3>{review.project.name}</h3>
          <p>{review.summary}</p>
          <p>
            {review.project.scenes.length} scenes ·{' '}
            {review.project.scenes.flatMap((s) => s.layers).length} layers ·{' '}
            {review.project.durationSeconds}s · {review.project.canvas.width}×
            {review.project.canvas.height}
          </p>
          <p>
            Verified Natural Earth places; connections are illustrative
            geographic paths. This replaces scenes/audio/captions after review
            and keeps canvas/style. You can Undo the complete replacement.
            Terrain is disabled in this new 2D proposal.
          </p>
          <p>
            {review.provider.name} · {review.provider.model} ·{' '}
            {review.provider.toolCalls} tool calls ·{' '}
            {(review.provider.elapsedMs / 1000).toFixed(1)}s
          </p>
          <details>
            <summary>Review proposed project JSON</summary>
            <textarea
              aria-label="Proposed project JSON"
              readOnly
              rows={12}
              value={JSON.stringify(review.project, null, 2)}
            />
          </details>
          {locked && (
            <p role="alert">
              Unlock existing layers/audio/captions before replacing the
              project.
            </p>
          )}
          {stale && (
            <p role="alert">
              The project changed during review. Generate again before applying.
            </p>
          )}
          <button
            disabled={locked || stale || busy}
            onClick={() => {
              try {
                applyReviewedProposal(review.project, base.current);
                setReview(null);
                setError('');
              } catch (error) {
                setError(
                  error instanceof Error
                    ? error.message
                    : 'Proposal could not be applied',
                );
              }
            }}
          >
            Apply reviewed proposal
          </button>
          <button
            onClick={() => {
              setReview(null);
              setError('');
            }}
          >
            Discard proposal
          </button>
        </section>
      )}
      {(error || editor.error) && <p role="alert">{error || editor.error}</p>}
    </dialog>
  );
}
