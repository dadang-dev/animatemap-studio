import {
  admin1Files,
  admin1Reference,
  MAX_ADMIN1_COUNTRIES,
  type Admin1Regions,
} from '@animatemap/project-schema';

/** Active local geography only. Catalog paths and checksums never come from project URLs. */
export class Admin1Resources {
  private active = new Set<string>();
  private loaded = new Map<string, Admin1Regions>();
  private pending = new Map<
    string,
    { abort: AbortController; promise: Promise<void> }
  >();
  private error?: Error;
  private disposed = false;
  constructor(
    private onChange: () => void,
    private onFailure: (error: Error) => void,
  ) {}

  use(countries: readonly string[]) {
    if (this.disposed) throw new Error('Admin 1 resources disposed');
    if (this.error) throw this.error;
    const active = new Set(countries);
    if (active.size > MAX_ADMIN1_COUNTRIES)
      throw new Error('Admin 1 resources exceed eight countries');
    for (const code of active)
      if (!admin1Files.has(code))
        throw new Error(`Admin 1 coverage unavailable for ${code}`);
    this.active = active;
    for (const [code, entry] of this.pending)
      if (!active.has(code)) {
        this.pending.delete(code);
        entry.abort.abort();
      }
    for (const code of this.loaded.keys())
      if (!active.has(code)) this.loaded.delete(code);
    for (const code of active) {
      if (this.loaded.has(code) || this.pending.has(code)) continue;
      const abort = new AbortController();
      const entry = { abort, promise: Promise.resolve() };
      this.pending.set(code, entry);
      entry.promise = this.load(code, abort)
        .then((regions) => {
          if (
            this.disposed ||
            this.pending.get(code) !== entry ||
            !this.active.has(code)
          )
            return;
          this.loaded.set(code, regions);
          this.onChange();
        })
        .catch((error: unknown) => {
          if (
            this.disposed ||
            this.pending.get(code) !== entry ||
            !this.active.has(code)
          )
            return;
          this.error = new Error(
            `Admin 1 ${code} resources failed: ${error instanceof Error ? error.message : 'unknown error'}`,
          );
          this.onFailure(this.error);
        })
        .finally(() => {
          if (this.pending.get(code) === entry) this.pending.delete(code);
        });
    }
  }
  private async load(
    code: string,
    abort: AbortController,
  ): Promise<Admin1Regions> {
    const file = admin1Files.get(code)!;
    const timer = setTimeout(
      () => abort.abort(new Error('Local geography timed out')),
      15000,
    );
    try {
      const response = await fetch(`/data/admin1/${file.file}`, {
        signal: abort.signal,
      });
      if (!response.ok)
        throw new Error(`Local geography unavailable (${response.status})`);
      if (!response.body)
        throw new Error('Local geography response has no body');
      const reader = response.body.getReader(),
        bytes = new Uint8Array(file.bytes);
      let offset = 0;
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          if (offset + value.length > bytes.length)
            throw new Error('Local geography exceeds pinned byte length');
          bytes.set(value, offset);
          offset += value.length;
        }
      } finally {
        await reader.cancel();
        reader.releaseLock();
      }
      if (offset !== bytes.length)
        throw new Error('Local geography is truncated');
      const digest = new Uint8Array(
        await crypto.subtle.digest('SHA-256', bytes),
      );
      if (
        Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join(
          '',
        ) !== file.sha256
      )
        throw new Error('Local geography checksum mismatch');
      const regions = JSON.parse(
        new TextDecoder('utf-8', { fatal: true }).decode(bytes),
      ) as Admin1Regions;
      if (
        regions.type !== 'FeatureCollection' ||
        regions.features.length !== file.features ||
        regions.features.some(
          (region) => admin1Reference.get(region.properties.code) !== code,
        )
      )
        throw new Error('Local geography catalog mismatch');
      return regions;
    } finally {
      clearTimeout(timer);
    }
  }
  get(country: string) {
    return this.loaded.get(country);
  }
  collection(countries: readonly string[]): Admin1Regions {
    return {
      type: 'FeatureCollection',
      features: countries.flatMap(
        (code) => this.loaded.get(code)?.features ?? [],
      ),
    };
  }
  async ready() {
    while (!this.disposed && this.pending.size)
      await Promise.all(
        [...this.pending.values()].map((entry) => entry.promise),
      );
    if (this.disposed) throw new Error('Admin 1 resources disposed');
    if (this.error) throw this.error;
    for (const code of this.active)
      if (!this.loaded.has(code))
        throw new Error(`Admin 1 ${code} geography unavailable`);
  }
  destroy() {
    this.disposed = true;
    for (const entry of this.pending.values()) entry.abort.abort();
    this.pending.clear();
    this.loaded.clear();
    this.active.clear();
  }
}
