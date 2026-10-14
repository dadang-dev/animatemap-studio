import {
  historicalManifestSchema,
  MAX_HISTORY_BYTES,
} from '@animatemap/project-schema';
self.onmessage = (event: MessageEvent<ArrayBuffer>) => {
  try {
    if (event.data.byteLength > MAX_HISTORY_BYTES)
      throw new Error('Historical manifest exceeds 10 MiB');
    const manifest = historicalManifestSchema.parse(
      JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(event.data)),
    );
    self.postMessage({ result: manifest.dataset });
  } catch (error) {
    self.postMessage({
      error:
        error instanceof Error ? error.message : 'Invalid historical manifest',
    });
  }
};
