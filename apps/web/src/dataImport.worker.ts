import { parseDataBytes } from './dataImport';
self.onmessage = (
  event: MessageEvent<{ bytes: ArrayBuffer; kind: 'csv' | 'xlsx' }>,
) => {
  void parseDataBytes(new Uint8Array(event.data.bytes), event.data.kind).then(
    (tables) => self.postMessage({ tables }),
    (error: unknown) =>
      self.postMessage({
        error: error instanceof Error ? error.message : 'Data import failed',
      }),
  );
};
