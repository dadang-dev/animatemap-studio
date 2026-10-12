import {
  inspectBuildingBytes,
  importBuildingBytes,
  type BuildingImportOptions,
} from './buildingImport';
self.onmessage = (
  e: MessageEvent<{
    bytes: ArrayBuffer;
    options?: BuildingImportOptions;
    builtin?: boolean;
  }>,
) => {
  const bytes = new Uint8Array(e.data.bytes);
  void (
    e.data.options
      ? importBuildingBytes(bytes, e.data.options, e.data.builtin)
      : inspectBuildingBytes(bytes).then(({ fields, count, sourceSha256 }) => ({
          fields,
          count,
          sourceSha256,
        }))
  ).then(
    (result) => self.postMessage({ result }),
    (error: unknown) =>
      self.postMessage({
        error:
          error instanceof Error ? error.message : 'Building import failed',
      }),
  );
};
