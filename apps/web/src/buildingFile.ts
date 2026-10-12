import type { BuildingDataset } from '@animatemap/project-schema';
import type { BuildingImportOptions } from './buildingImport';
export function buildingWorker(
  bytes: ArrayBuffer,
): Promise<{ fields: string[]; count: number; sourceSha256: string }>;
export function buildingWorker(
  bytes: ArrayBuffer,
  options: BuildingImportOptions,
  builtin: boolean,
): Promise<BuildingDataset>;
export async function buildingWorker(
  bytes: ArrayBuffer,
  options?: BuildingImportOptions,
  builtin = false,
) {
  const worker = new Worker(
    new URL('./buildingImport.worker.ts', import.meta.url),
    { type: 'module' },
  );
  try {
    return await new Promise<
      | BuildingDataset
      | { fields: string[]; count: number; sourceSha256: string }
    >((resolve, reject) => {
      const timer = setTimeout(
        () =>
          reject(new Error('Building validation timed out after 15 seconds')),
        15000,
      );
      worker.onmessage = (
        e: MessageEvent<{
          result?:
            | BuildingDataset
            | { fields: string[]; count: number; sourceSha256: string };
          error?: string;
        }>,
      ) => {
        clearTimeout(timer);
        if (e.data.result) resolve(e.data.result);
        else reject(new Error(e.data.error ?? 'Building validation failed'));
      };
      worker.onerror = () => {
        clearTimeout(timer);
        reject(new Error('Building worker unavailable; reload and retry'));
      };
      const copy = bytes.slice(0);
      worker.postMessage({ bytes: copy, options, builtin }, [copy]);
    });
  } finally {
    worker.terminate();
  }
}
