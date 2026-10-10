import type { DataTable } from './dataImport';
export async function readDataFile(file: File): Promise<DataTable[]> {
  if (file.size > 5 * 1024 * 1024) throw new Error('Data input exceeds 5 MiB');
  const extension = file.name.split('.').at(-1)?.toLowerCase();
  if (extension !== 'csv' && extension !== 'xlsx')
    throw new Error('Import CSV or unencrypted XLSX; XLS/XLSM are unsupported');
  const bytes = await file.arrayBuffer();
  const worker = new Worker(
    new URL('./dataImport.worker.ts', import.meta.url),
    { type: 'module' },
  );
  try {
    return await new Promise<DataTable[]>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('Data import timed out after 15 seconds')),
        15000,
      );
      worker.onmessage = (
        event: MessageEvent<{ tables?: DataTable[]; error?: string }>,
      ) => {
        clearTimeout(timer);
        if (event.data.tables) resolve(event.data.tables);
        else reject(new Error(event.data.error ?? 'Data import failed'));
      };
      worker.onerror = () => {
        clearTimeout(timer);
        reject(new Error('Data importer unavailable; reload and retry'));
      };
      worker.postMessage({ bytes, kind: extension }, [bytes]);
    });
  } finally {
    worker.terminate();
  }
}
