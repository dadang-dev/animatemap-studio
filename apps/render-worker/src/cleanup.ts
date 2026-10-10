import { rm } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
export async function removeTemporaryDirectory(
  directory: string,
  parent: string,
  prefix: string,
) {
  const target = resolve(directory);
  if (
    dirname(target) !== resolve(parent) ||
    !basename(target).startsWith(prefix)
  )
    throw new Error('Refusing unsafe temporary directory cleanup');
  await rm(target, { recursive: true, force: true });
}
