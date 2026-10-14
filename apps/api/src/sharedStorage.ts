import { mkdir, open, readFile, rename, rm, stat } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
export class ServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message);
  }
}
export async function boundedJSON(
  path: string,
  limit: number,
): Promise<unknown> {
  if ((await stat(path)).size > limit)
    throw new ServiceError(
      'Stored collaboration file exceeds its byte limit',
      503,
    );
  const bytes = await readFile(path);
  if (bytes.byteLength > limit)
    throw new ServiceError(
      'Stored collaboration file exceeds its byte limit',
      503,
    );
  return JSON.parse(bytes.toString('utf8'));
}
export async function atomicJSON(path: string, value: unknown, limit: number) {
  const bytes = Buffer.from(JSON.stringify(value));
  if (bytes.length > limit)
    throw new ServiceError('Collaboration storage byte limit exceeded', 413);
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    const file = await open(temporary, 'wx', 0o600);
    try {
      await file.writeFile(bytes);
      await file.sync();
    } finally {
      await file.close();
    }
    await rename(temporary, path);
  } finally {
    await rm(temporary, { force: true });
  }
}
export class SerializedOperations {
  private pending = 0;
  private tail: Promise<unknown> = Promise.resolve();
  run<T>(operation: () => Promise<T>): Promise<T> {
    if (this.pending >= 8)
      return Promise.reject(
        new ServiceError('Collaboration service busy; retry shortly', 429),
      );
    this.pending++;
    const result = this.tail.then(operation);
    this.tail = result.catch(() => undefined);
    return result.finally(() => {
      this.pending--;
    });
  }
}
