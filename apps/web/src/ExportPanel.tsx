import { useEffect, useState } from 'react';
import {
  exportFormats,
  type ExportFormat,
  type RenderJob,
} from '@animatemap/project-schema';
import { useEditor } from './store';
import { api } from './persistence';
export function ExportPanel() {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<ExportFormat>('mp4');
  const [job, setJob] = useState<RenderJob | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const s = useEditor();
  const busy = job && ['queued', 'rendering', 'encoding'].includes(job.state);
  useEffect(() => {
    if (!job || !busy) return;
    let alive = true;
    const timer = setInterval(() => {
      void api<RenderJob>(`/jobs/${job.id}`)
        .then((j) => {
          if (alive) setJob(j);
        })
        .catch((e: Error) => {
          if (alive) setError(e.message);
        });
    }, 500);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [job?.id, busy]);
  async function start() {
    setSubmitting(true);
    setError('');
    try {
      setJob(
        await api<RenderJob>('/jobs', {
          method: 'POST',
          body: JSON.stringify({
            project: s.project,
            format,
            frameIndex: Math.min(
              Math.ceil(s.project.durationSeconds * s.project.canvas.fps) - 1,
              Math.floor(s.time * s.project.canvas.fps),
            ),
          }),
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <div className="menu-wrap">
      <button className="primary" onClick={() => setOpen(!open)}>
        ↓ Export
      </button>
      {open && (
        <div className="project-menu export-menu">
          <h2>Render your map</h2>
          <p className="hint">
            {s.project.canvas.width} × {s.project.canvas.height} ·{' '}
            {s.project.canvas.fps} FPS · {s.project.durationSeconds}s
          </p>
          <label className="field">
            Format
            <select
              aria-label="Export format"
              value={format}
              disabled={!!busy}
              onChange={(e) => setFormat(e.target.value as ExportFormat)}
            >
              {(
                Object.entries(exportFormats) as [
                  ExportFormat,
                  (typeof exportFormats)[ExportFormat],
                ][]
              ).map(([value, metadata]) => (
                <option key={value} value={value}>
                  {metadata.label}
                </option>
              ))}
            </select>
          </label>
          {format === 'gif' && (
            <p className="hint">
              GIF has 256 colors and centisecond timing. Playback speed depends
              on the viewer.
            </p>
          )}
          {format === 'zip' && (
            <p className="hint">
              Multi-pass PNG sequence: map, transparent overlays/captions, GPU
              window depth and full reference. Up to 600 frames / 4K pixels / 1
              GiB. Keep source-credit overlays when compositing. Audio remains
              available in MP4/WebM.
            </p>
          )}
          {s.project.canvas.width > 1920 && (
            <p className="hint">
              4K capture requires more time and temporary disk space.
            </p>
          )}
          <p className="hint">
            Natural Earth credit is included. Frames use the same timeline
            evaluator as preview.
          </p>
          <button disabled={!!busy || submitting} onClick={() => void start()}>
            Start export
          </button>
          {job && (
            <div className="export-status" role="status">
              <strong>
                {job.state} · {Math.round(job.progress * 100)}%
              </strong>
              <progress max="1" value={job.progress} />
              {busy && (
                <button
                  onClick={() =>
                    void api<RenderJob>(`/jobs/${job.id}/cancel`, {
                      method: 'POST',
                    })
                      .then(setJob)
                      .catch((e: Error) => setError(e.message))
                  }
                >
                  Cancel export
                </button>
              )}
              {job.state === 'completed' && (
                <a
                  className="download-link"
                  href={`/api/jobs/${job.id}/download`}
                >
                  Download {job.format.toUpperCase()}
                </a>
              )}
              {['failed', 'cancelled'].includes(job.state) && (
                <button
                  onClick={() =>
                    void api<RenderJob>(`/jobs/${job.id}/retry`, {
                      method: 'POST',
                    })
                      .then(setJob)
                      .catch((e: Error) => setError(e.message))
                  }
                >
                  Retry export
                </button>
              )}
              {job.error && (
                <p role="alert" className="hint">
                  {job.error}
                </p>
              )}
            </div>
          )}
          {error && <p role="alert">{error}</p>}
          <button onClick={() => setOpen(false)}>Close export</button>
        </div>
      )}
    </div>
  );
}
