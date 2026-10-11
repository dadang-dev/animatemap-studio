import { createApp } from './app';
import { resolve } from 'node:path';
const app = createApp(
  process.env.ANIMATEMAP_STORAGE_DIR
    ? resolve(process.env.ANIMATEMAP_STORAGE_DIR)
    : undefined,
);
await app.listen({ host: '127.0.0.1', port: 3001 });
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () => {
    void app.close();
  });
