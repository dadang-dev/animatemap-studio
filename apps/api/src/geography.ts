import { createHash } from 'node:crypto';
import {
  directionsRequestSchema,
  geocodeRequestSchema,
  geographyConfigurationSchema,
  geocodeResponseSchema,
  roadRouteResultSchema,
  orsGeocodeSchema,
  orsDirectionsSchema,
  type GeographyConfiguration,
  type GeographySource,
} from '@animatemap/project-schema';
import places from '../../../data/places/catalog.json';
import provenance from '../../../data/places/PROVENANCE.json';

const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLocaleLowerCase('en')
    .trim();
const searchIndex = places.map((place) => ({
  place,
  text: fold([...place.names, place.country].join(' ')),
  names: place.names.map(fold),
}));
function meters(a: number[], b: number[]) {
  const rad = Math.PI / 180;
  const lat = (b[1]! - a[1]!) * rad,
    lng = (b[0]! - a[0]!) * rad;
  const h =
    Math.sin(lat / 2) ** 2 +
    Math.cos(a[1]! * rad) * Math.cos(b[1]! * rad) * Math.sin(lng / 2) ** 2;
  return 6371008.8 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}
export class GeographyError extends Error {
  constructor(
    message: string,
    public statusCode = 400,
  ) {
    super(message);
  }
}
export class GeographyService {
  private config: GeographyConfiguration | null = null;
  private controller: AbortController | null = null;
  private minute: number[] = [];
  private day: number[] = [];
  private blockedUntil = 0;
  constructor(
    private fetcher: typeof fetch = fetch,
    private now: () => number = Date.now,
    private timeoutMs = 15000,
  ) {}
  status() {
    const now = this.now();
    this.minute = this.minute.filter((t) => t > now - 60000);
    this.day = this.day.filter((t) => t > now - 86400000);
    return {
      configured: !!this.config,
      provider: 'openrouteservice',
      origin: 'https://api.openrouteservice.org',
      busy: !!this.controller,
      quota: {
        perMinute: this.config?.perMinute ?? 0,
        perDay: this.config?.perDay ?? 0,
        usedMinute: this.minute.length,
        usedDay: this.day.length,
      },
      retryAfterSeconds: Math.max(
        0,
        Math.ceil((this.blockedUntil - now) / 1000),
      ),
      gazetteer: {
        provider: 'natural-earth',
        release: provenance.release,
        places: provenance.count,
        sha256: provenance.sha256,
      },
    };
  }
  configure(input: unknown) {
    const config = geographyConfigurationSchema.parse(input);
    this.cancel();
    this.config = config;
    // Reconfiguration does not erase account usage or rate-limit cooldowns.
    return this.status();
  }
  clear() {
    this.cancel();
    this.config = null;
    return this.status();
  }
  cancel() {
    this.controller?.abort(
      new GeographyError('Provider request cancelled', 409),
    );
  }
  async search(input: unknown) {
    const request = geocodeRequestSchema.parse(input);
    if (request.provider === 'natural-earth') {
      const text = fold(request.text),
        tokens = text.split(/\s+/);
      const results = searchIndex
        .filter((row) => tokens.every((token) => row.text.includes(token)))
        .sort(
          (a, b) =>
            Number(b.names.includes(text)) - Number(a.names.includes(text)) ||
            a.place.name.localeCompare(b.place.name, 'en') ||
            a.place.id.localeCompare(b.place.id),
        )
        .slice(0, 10)
        .map(({ place }) => ({
          id: place.id,
          label: `${place.name}, ${place.country}`,
          country: place.country,
          coordinates: place.coordinates,
          source: {
            provider: 'natural-earth',
            kind: 'place',
            sourceId: place.id,
            source: 'https://www.naturalearthdata.com/',
            license: 'Public domain',
            credit: `Natural Earth places · v${provenance.release}`,
            retrievedAt: new Date(this.now()).toISOString(),
            datasetVersion: provenance.release,
            sha256: provenance.sha256,
          },
        }));
      return geocodeResponseSchema.parse({ results });
    }
    const result = await this.request(
      '/geocode/search',
      'GET',
      new URLSearchParams({
        text: request.text,
        size: '10',
        sources: 'openstreetmap',
      }),
    );
    const parsed = orsGeocodeSchema.safeParse(result.json);
    if (!parsed.success)
      throw new GeographyError(
        'Provider returned invalid place geometry or labels',
        502,
      );
    if (
      new Set(parsed.data.features.map((feature) => feature.properties.gid))
        .size !== parsed.data.features.length
    )
      throw new GeographyError(
        'Provider returned duplicate place identifiers',
        502,
      );
    return geocodeResponseSchema.parse({
      results: parsed.data.features.map((feature) => ({
        id: feature.properties.gid,
        label: feature.properties.label,
        country: feature.properties.country ?? '',
        coordinates: feature.geometry.coordinates,
        source: this.source(
          'place',
          feature.properties.gid,
          result.sha256,
          'Hosted Pelias',
        ),
      })),
    });
  }
  async route(input: unknown) {
    const request = directionsRequestSchema.parse(input);
    const result = await this.request(
      `/v2/directions/${request.profile}/geojson`,
      'POST',
      undefined,
      {
        coordinates: request.coordinates,
        instructions: false,
        elevation: false,
      },
    );
    const parsed = orsDirectionsSchema.safeParse(result.json);
    if (!parsed.success)
      throw new GeographyError(
        'Provider returned invalid road geometry or distance',
        502,
      );
    const feature = parsed.data.features[0]!;
    const coords = feature.geometry.coordinates;
    if (coords.every((c) => c[0] === coords[0]![0] && c[1] === coords[0]![1]))
      throw new GeographyError(
        'Provider returned a zero-length road route',
        502,
      );
    const length = coords
      .slice(1)
      .reduce((sum, point, i) => sum + meters(coords[i]!, point), 0);
    if (length > 6000000)
      throw new GeographyError(
        'Provider route geometry exceeds 6,000 km; use a shorter route',
        502,
      );
    if (
      meters(coords[0]!, request.coordinates[0]!) > 10000 ||
      meters(coords.at(-1)!, request.coordinates.at(-1)!) > 10000
    )
      throw new GeographyError(
        'Provider route endpoints are more than 10 km from reviewed waypoints',
        502,
      );
    return roadRouteResultSchema.parse({
      coordinates: coords,
      source: {
        ...this.source(
          'road-route',
          `ors-${result.sha256.slice(0, 24)}`,
          result.sha256,
          parsed.data.metadata?.engine?.graph_date ??
            parsed.data.metadata?.engine?.version ??
            'Provider graph date unavailable',
        ),
        profile: request.profile,
        distanceMeters: feature.properties.summary.distance,
      },
    });
  }
  private source(
    kind: GeographySource['kind'],
    sourceId: string,
    sha256: string,
    datasetVersion: string,
  ): GeographySource {
    return {
      provider: 'openrouteservice',
      kind,
      sourceId,
      source: 'https://openrouteservice.org/',
      license: 'ODbL-1.0',
      credit:
        'openrouteservice · © OpenStreetMap contributors · openstreetmap.org/copyright',
      retrievedAt: new Date(this.now()).toISOString(),
      datasetVersion,
      sha256,
    };
  }
  private async request(
    path: string,
    method: string,
    params?: URLSearchParams,
    body?: unknown,
  ) {
    if (!this.config)
      throw new GeographyError(
        'Configure Openrouteservice and confirm account terms before requesting roads or addresses',
        409,
      );
    if (this.controller)
      throw new GeographyError(
        'Another provider request is active; cancel it or wait',
        409,
      );
    this.status();
    if (
      this.now() < this.blockedUntil ||
      this.minute.length >= this.config.perMinute ||
      this.day.length >= this.config.perDay
    )
      throw new GeographyError(
        'Provider quota reached; wait or check your account limits',
        429,
      );
    const controller = new AbortController();
    this.controller = controller;
    const timeout = setTimeout(
      () =>
        controller.abort(
          new GeographyError(
            'Provider timed out; retry the explicit request',
            504,
          ),
        ),
      this.timeoutMs,
    );
    this.minute.push(this.now());
    this.day.push(this.now());
    try {
      const url = new URL(path, 'https://api.openrouteservice.org');
      if (params) url.search = params.toString();
      const response = await this.fetcher(url, {
        method,
        redirect: 'error',
        signal: controller.signal,
        headers: {
          Authorization: this.config.apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      if (!response.ok) {
        await response.body?.cancel();
        if (response.status === 429) {
          const seconds = Number(response.headers.get('retry-after'));
          this.blockedUntil =
            this.now() +
            Math.min(
              86400000,
              Math.max(
                60000,
                Number.isFinite(seconds) ? seconds * 1000 : 60000,
              ),
            );
        }
        throw new GeographyError(
          response.status === 401 || response.status === 403
            ? 'Provider rejected the account key or permissions; check configuration'
            : response.status === 429
              ? 'Provider rate limit reached; check account quota and wait'
              : `Provider request failed (${response.status}); check locations and account service`,
          response.status === 429 ? 429 : 502,
        );
      }
      if (!response.body)
        throw new GeographyError('Provider returned an empty response', 502);
      const max = 2 * 1024 * 1024,
        reader = response.body.getReader();
      let length = 0;
      const chunks: Uint8Array[] = [];
      try {
        for (;;) {
          controller.signal.throwIfAborted();
          const part = await reader.read();
          if (part.done) break;
          length += part.value.length;
          if (length > max)
            throw new GeographyError(
              'Provider response exceeds 2 MiB; use a shorter route',
              502,
            );
          chunks.push(part.value);
        }
      } finally {
        await reader.cancel().catch(() => undefined);
        reader.releaseLock();
      }
      const bytes = Buffer.concat(chunks, length);
      controller.signal.throwIfAborted();
      if (bytes.toString('utf8').includes(this.config!.apiKey))
        throw new GeographyError(
          'Provider response contained credential material; it was discarded',
          502,
        );
      let json: unknown;
      try {
        json = JSON.parse(bytes.toString('utf8'));
      } catch {
        throw new GeographyError('Provider returned invalid JSON', 502);
      }
      return { json, sha256: createHash('sha256').update(bytes).digest('hex') };
    } catch (error) {
      if (controller.signal.aborted) throw controller.signal.reason;
      if (error instanceof GeographyError) throw error;
      // Never echo remote content, URLs, fetch errors or Authorization values.
      throw new GeographyError(
        'Provider connection failed; check network and account configuration',
        502,
      );
    } finally {
      clearTimeout(timeout);
      if (this.controller === controller) this.controller = null;
    }
  }
}
