import { open, type FileHandle } from 'node:fs/promises';
import { Zip, ZipPassThrough } from 'fflate';
import {
  MAX_MULTIPASS_ARCHIVE_BYTES,
  MAX_MULTIPASS_ENTRY_BYTES,
} from '@animatemap/project-schema';
/** Serial, backpressured STORE archive: PNG is already compressed. */
export class GraphicArchive {
  private zip: Zip;
  private chunks: Uint8Array[] = [];
  private pendingBytes = 0;
  private totalBytes = 0;
  private names = new Set<string>();
  private error?: Error;
  private ended = false;
  private finalized = false;
  private closed = false;
  private constructor(
    private file: FileHandle,
    private signal: AbortSignal,
    private maximumBytes: number,
  ) {
    this.zip = new Zip((error, chunk, final) => {
      if (error) {
        this.error = error;
        return;
      }
      this.totalBytes += chunk.length;
      this.pendingBytes += chunk.length;
      if (
        this.totalBytes > this.maximumBytes ||
        this.pendingBytes > MAX_MULTIPASS_ENTRY_BYTES + 1024 * 1024
      ) {
        this.error = new Error(
          'Multi-pass ZIP exceeds its byte budget; trim project or lower resolution',
        );
        return;
      }
      this.chunks.push(chunk);
      if (final) this.finalized = true;
    });
  }
  static async create(
    path: string,
    signal: AbortSignal,
    maximumBytes = MAX_MULTIPASS_ARCHIVE_BYTES,
  ) {
    signal.throwIfAborted();
    return new GraphicArchive(await open(path, 'wx'), signal, maximumBytes);
  }
  async add(name: string, data: Uint8Array) {
    if (this.closed || this.ended)
      throw new Error('Multi-pass archive is closed');
    this.signal.throwIfAborted();
    if (
      !/^[a-zA-Z0-9_./-]{1,200}$/.test(name) ||
      name.startsWith('/') ||
      name.split('/').some((v) => !v || v === '.' || v === '..') ||
      this.names.has(name)
    )
      throw new Error('Unsafe or duplicate multi-pass entry');
    if (data.length > MAX_MULTIPASS_ENTRY_BYTES || this.names.size >= 5000)
      throw new Error('Multi-pass entry exceeds its budget');
    const entry = new ZipPassThrough(name);
    // Fixed archive timestamps make artifacts reproducible; source dates stay in metadata.
    entry.mtime = new Date(1980, 0, 1, 0, 0, 0);
    entry.os = 0;
    this.names.add(name);
    this.zip.add(entry);
    entry.push(data, true);
    await this.flush();
  }
  private async flush() {
    if (this.error) throw this.error;
    while (this.chunks.length) {
      this.signal.throwIfAborted();
      const chunk = this.chunks.shift()!;
      let offset = 0;
      while (offset < chunk.length) {
        this.signal.throwIfAborted();
        const result = await this.file.write(
          chunk,
          offset,
          chunk.length - offset,
        );
        if (!result.bytesWritten)
          throw new Error('Multi-pass ZIP write made no progress');
        offset += result.bytesWritten;
      }
      this.pendingBytes -= chunk.length;
    }
  }
  async finish() {
    if (this.closed || this.ended)
      throw new Error('Multi-pass archive is closed');
    this.ended = true;
    this.zip.end();
    await this.flush();
    if (!this.finalized) throw new Error('Multi-pass ZIP did not finalize');
    this.signal.throwIfAborted();
    await this.file.sync();
    await this.close();
    return { bytes: this.totalBytes, entries: this.names.size };
  }
  async close() {
    if (this.closed) return;
    this.closed = true;
    this.zip.terminate();
    this.chunks = [];
    this.pendingBytes = 0;
    await this.file.close();
  }
}
