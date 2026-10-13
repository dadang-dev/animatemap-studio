import { expect, test } from 'vitest';
import { createDemo } from '@animatemap/project-schema';
import { JobQueue } from './jobs';
test('multi-pass job validates bounded frames/pixels before starting a worker and uses an immutable snapshot', async () => {
  let starts = 0;
  const queue = new JobQueue('.local/test', async (options) => {
    starts++;
    expect(options.format).toBe('zip');
    return 'output.zip';
  });
  const oversized = createDemo();
  oversized.durationSeconds = 21;
  expect(() => queue.create(oversized, 'zip')).toThrow('600 frames');
  oversized.durationSeconds = 12;
  oversized.canvas.width = 3840;
  oversized.canvas.height = 3840;
  expect(() => queue.create(oversized, 'zip')).toThrow('pixel budget');
  expect(starts).toBe(0);
  const p = createDemo(),
    job = queue.create(p, 'zip');
  p.name = 'Changed after submit';
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(queue.get(job.id).job.state).toBe('completed');
  expect(queue.get(job.id).project.name).not.toBe(p.name);
  expect(starts).toBe(1);
});
test('one worker, immutable snapshot, cancellation, failures and retry', async () => {
  let active = 0,
    maximum = 0;
  const snapshots: string[] = [];
  const queue = new JobQueue('.local/test', async (options) => {
    active++;
    maximum = Math.max(maximum, active);
    snapshots.push(options.project.name);
    try {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, 20);
        options.signal.addEventListener(
          'abort',
          () => {
            clearTimeout(timer);
            reject(new Error('Cancelled'));
          },
          { once: true },
        );
      });
      return 'result.mp4';
    } finally {
      active--;
    }
  });
  const p = createDemo();
  const a = queue.create(p, 'mp4');
  p.name = 'Changed';
  const b = queue.create(p, 'mp4');
  queue.cancel(b.id);
  await new Promise((r) => setTimeout(r, 50));
  expect(queue.get(a.id).job.state).toBe('completed');
  expect(queue.get(b.id).job.state).toBe('cancelled');
  expect(snapshots[0]).toBe('Vietnam · A journey south');
  expect(maximum).toBe(1);
  const retried = queue.retry(b.id);
  await new Promise((r) => setTimeout(r, 50));
  expect(queue.get(retried.id).job.state).toBe('completed');
  const failing = new JobQueue('.local/test', async () => {
    throw new Error('Resource timeout');
  });
  const failed = failing.create(p, 'mp4');
  await new Promise((r) => setTimeout(r, 0));
  expect(failing.get(failed.id).job.error).toBe('Resource timeout');
});
