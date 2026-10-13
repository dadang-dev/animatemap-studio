import { importModelOBJ, type ModelImportOptions } from './modelImport';
self.onmessage = (
  e: MessageEvent<{ bytes: ArrayBuffer; options: ModelImportOptions }>,
) => {
  void importModelOBJ(new Uint8Array(e.data.bytes), e.data.options).then(
    (asset) => self.postMessage({ asset }),
    (error: unknown) =>
      self.postMessage({
        error: error instanceof Error ? error.message : 'Model import failed',
      }),
  );
};
