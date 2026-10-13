import type { ModelAsset } from '@animatemap/project-schema';
import type { ModelImportOptions } from './modelImport';
export async function modelWorker(
  bytes: ArrayBuffer,
  options: ModelImportOptions,
  signal?: AbortSignal,
) {
  signal?.throwIfAborted();
  const worker = new Worker(
    new URL('./modelImport.worker.ts', import.meta.url),
    { type: 'module' },
  );
  try {
    return await new Promise<ModelAsset>((resolve, reject) => {
      const finish = (error?: Error, asset?: ModelAsset) => {
        clearTimeout(timer);
        signal?.removeEventListener('abort', cancel);
        if (error) reject(error);
        else if (asset) resolve(asset);
      };
      const cancel = () => finish(new Error('Model import cancelled'));
      const timer = setTimeout(
        () => finish(new Error('Model import timed out after 15 seconds')),
        15000,
      );
      signal?.addEventListener('abort', cancel, { once: true });
      if (signal?.aborted) {
        cancel();
        return;
      }
      worker.onmessage = (
        e: MessageEvent<{ asset?: ModelAsset; error?: string }>,
      ) => {
        if (e.data.asset) finish(undefined, e.data.asset);
        else finish(new Error(e.data.error ?? 'Model import failed'));
      };
      worker.onerror = () =>
        finish(new Error('Model worker unavailable; reload and retry'));
      const copy = bytes.slice(0);
      worker.postMessage({ bytes: copy, options }, [copy]);
    });
  } finally {
    worker.terminate();
  }
}
