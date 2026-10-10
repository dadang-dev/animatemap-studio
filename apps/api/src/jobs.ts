import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { renderProject, type RenderOptions } from '@animatemap/render-worker';
import {
  migrateProject,
  type Project,
  type RenderJob,
} from '@animatemap/project-schema';
type Entry = {
  job: RenderJob;
  project: Project;
  frameIndex: number;
  controller: AbortController;
  output?: string;
};
export class JobQueue {
  private entries = new Map<string, Entry>();
  private running = false;
  private stopping = false;
  constructor(
    private directory: string,
    private runner: (options: RenderOptions) => Promise<string> = renderProject,
  ) {}
  create(input: unknown, format: 'mp4' | 'png', frameIndex = 0) {
    if (this.stopping) throw new Error('Worker shutting down');
    const project = structuredClone(migrateProject(input));
    if (
      format === 'mp4' &&
      (project.canvas.width % 2 || project.canvas.height % 2)
    )
      throw new Error('Video canvas dimensions must be even');
    if (
      !Number.isInteger(frameIndex) ||
      frameIndex < 0 ||
      frameIndex >= Math.ceil(project.durationSeconds * project.canvas.fps)
    )
      throw new Error('Frame index outside project');
    if (
      [...this.entries.values()].filter((v) =>
        ['queued', 'rendering', 'encoding'].includes(v.job.state),
      ).length >= 5
    )
      throw new Error('Render queue full (maximum 5 jobs)');
    const id = randomUUID();
    const entry: Entry = {
      job: { id, state: 'queued', progress: 0, format },
      project,
      frameIndex,
      controller: new AbortController(),
    };
    this.entries.set(id, entry);
    void this.drain();
    return { ...entry.job };
  }
  get(id: string) {
    const entry = this.entries.get(id);
    if (!entry) throw new Error('Render job not found');
    return entry;
  }
  cancel(id: string) {
    const entry = this.get(id);
    if (!['completed', 'failed', 'cancelled'].includes(entry.job.state)) {
      entry.controller.abort();
      entry.job.state = 'cancelled';
    }
    return { ...entry.job };
  }
  retry(id: string) {
    const e = this.get(id);
    if (!['failed', 'cancelled'].includes(e.job.state))
      throw new Error('Only failed or cancelled jobs can be retried');
    return this.create(e.project, e.job.format, e.frameIndex);
  }
  stop() {
    this.stopping = true;
    for (const id of this.entries.keys()) this.cancel(id);
  }
  private async drain() {
    if (this.running) return;
    this.running = true;
    try {
      let entry: Entry | undefined;
      while (
        (entry = [...this.entries.values()].find(
          (e) => e.job.state === 'queued',
        ))
      ) {
        const current = entry,
          start = performance.now();
        try {
          current.job.state = 'rendering';
          current.output = await this.runner({
            project: current.project,
            format: current.job.format,
            frameIndex: current.frameIndex,
            directory: join(this.directory, current.job.id),
            webURL: 'http://127.0.0.1:5174',
            signal: current.controller.signal,
            onProgress: (state, progress) => {
              if (!current.controller.signal.aborted) {
                if (state !== 'completed') current.job.state = state;
                current.job.progress = state === 'completed' ? 0.99 : progress;
              }
            },
          });
          if (!current.controller.signal.aborted) {
            current.job.state = 'completed';
            current.job.progress = 1;
          }
        } catch (e) {
          current.job.state = current.controller.signal.aborted
            ? 'cancelled'
            : 'failed';
          current.job.error = e instanceof Error ? e.message : 'Render failed';
        } finally {
          current.job.elapsedMs = performance.now() - start;
        }
      }
    } finally {
      this.running = false;
    }
  }
}
