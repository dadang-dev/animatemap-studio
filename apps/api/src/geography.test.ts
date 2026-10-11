import { test, expect, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { GeographyService } from './geography';
import { createApp } from './app';
import { createDemo } from '@animatemap/project-schema';
import { addGeographicLayer } from '../../web/src/geographyOperations';
import places from '../../../data/places/catalog.json';
import provenance from '../../../data/places/PROVENANCE.json';

// Synthetic protocol fixture only: this is not a live road-provider acceptance run.
const routeFixture = {
  features: [
    {
      geometry: {
        type: 'LineString',
        coordinates: [
          [105.848068, 21.035273],
          [105.85, 21.037],
          [105.853, 21.036],
        ],
      },
      properties: { summary: { distance: 600 } },
    },
  ],
  metadata: {
    engine: {
      version: 'test-fixture',
      graph_date: 'synthetic-contract-fixture',
    },
  },
};
const routeRequest = {
  coordinates: [
    [105.848068, 21.035273],
    [105.853, 21.036],
  ],
  profile: 'foot-walking',
};
const config = {
  apiKey: 'contract-test-secret',
  termsAccepted: true,
  perMinute: 10,
  perDay: 20,
};

test('bundled gazetteer hash/count and accented names resolve exact licensed source coordinates without network', async () => {
  const bytes = await readFile(
    new URL('../../../data/places/catalog.json', import.meta.url),
  );
  expect(createHash('sha256').update(bytes).digest('hex')).toBe(
    provenance.catalogSha256,
  );
  expect(places).toHaveLength(7342);
  const fetcher = vi.fn<typeof fetch>(),
    service = new GeographyService(fetcher);
  const result = await service.search({
    provider: 'natural-earth',
    text: 'Hà Nội',
  });
  expect(result.results[0]!.coordinates).toEqual([105.848068, 21.035273]);
  expect(result.results[0]!.source.sha256).toBe(provenance.sha256);
  expect(
    await service.search({
      provider: 'natural-earth',
      text: 'place-not-in-the-release',
    }),
  ).toEqual({ results: [] });
  expect(
    (await service.search({ provider: 'natural-earth', text: 'San' })).results
      .length,
  ).toBeLessThanOrEqual(10);
  expect(fetcher).not.toHaveBeenCalled();
});

test('unconfigured/invalid requests fail before network; fixed HTTPS origin and no redirect/key-in-URL; validated result hashes', async () => {
  const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify(routeFixture))),
    service = new GeographyService(fetcher);
  await expect(service.route(routeRequest)).rejects.toThrow('Configure');
  expect(fetcher).not.toHaveBeenCalled();
  expect(() =>
    service.configure({ ...config, origin: 'https://evil.example' }),
  ).toThrow();
  expect(() =>
    service.configure({ ...config, termsAccepted: false }),
  ).toThrow();
  service.configure(config);
  await expect(
    service.route({
      ...routeRequest,
      coordinates: [
        [Infinity, 0],
        [1, 0],
      ],
    }),
  ).rejects.toThrow();
  const result = await service.route(routeRequest);
  const [url, options] = fetcher.mock.calls[0]!;
  expect(String(url)).toBe(
    'https://api.openrouteservice.org/v2/directions/foot-walking/geojson',
  );
  expect(options?.redirect).toBe('error');
  expect(options?.headers).toMatchObject({ Authorization: config.apiKey });
  expect(JSON.stringify(result)).not.toContain(config.apiKey);
  expect(result.source.sha256).toBe(
    createHash('sha256').update(JSON.stringify(routeFixture)).digest('hex'),
  );
  expect(result.coordinates).toEqual(
    routeFixture.features[0]!.geometry.coordinates,
  );
  expect(result.source.credit).toContain('openstreetmap.org/copyright');
});

test('OSM-only geocoder requests retain source identity and reject other mixed-license sources', async () => {
  const fixture = {
    features: [
      {
        geometry: { type: 'Point', coordinates: [105.85, 21.03] },
        properties: {
          gid: 'openstreetmap:venue:123',
          source: 'openstreetmap',
          label: 'Fixture place',
          country: 'Vietnam',
        },
      },
    ],
  };
  const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(async () => new Response(JSON.stringify(fixture))),
    service = new GeographyService(fetcher);
  service.configure(config);
  expect(
    (await service.search({ provider: 'openrouteservice', text: 'example' }))
      .results[0]!.source.sourceId,
  ).toBe('openstreetmap:venue:123');
  expect(String(fetcher.mock.calls[0]![0])).toContain('sources=openstreetmap');
  fixture.features[0]!.properties.source = 'geonames';
  await expect(
    service.search({ provider: 'openrouteservice', text: 'example' }),
  ).rejects.toThrow('invalid');
});

test('quota usage survives reconfigure/forget and remote cooldown; credential contents are never echoed', async () => {
  let now = Date.now();
  const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify(routeFixture))),
    service = new GeographyService(fetcher, () => now);
  service.configure({ ...config, perMinute: 1 });
  await service.route(routeRequest);
  service.clear();
  service.configure({ ...config, perMinute: 1 });
  await expect(service.route(routeRequest)).rejects.toThrow('quota');
  expect(fetcher).toHaveBeenCalledTimes(1);
  now += 60001;
  fetcher.mockResolvedValueOnce(
    new Response(`secret ${config.apiKey}`, {
      status: 429,
      headers: { 'retry-after': '120' },
    }),
  );
  await expect(service.route(routeRequest)).rejects.toThrow('rate limit');
  expect(service.status().retryAfterSeconds).toBe(120);
  service.configure(config);
  await expect(service.route(routeRequest)).rejects.toThrow('quota');
  expect(JSON.stringify(service.status())).not.toContain(config.apiKey);
  now += 120001;
  fetcher.mockRejectedValueOnce(
    new Error(`https://remote?key=${config.apiKey}`),
  );
  await expect(service.route(routeRequest)).rejects.toThrow(
    'Provider connection failed',
  );
  fetcher.mockResolvedValueOnce(
    new Response(JSON.stringify({ ...routeFixture, echo: config.apiKey })),
  );
  await expect(service.route(routeRequest)).rejects.toThrow(
    'credential material',
  );
});

test('response budgets, malformed JSON/coordinates/empty paths and authentication failures are actionable', async () => {
  const fetcher = vi.fn<typeof fetch>(),
    service = new GeographyService(fetcher);
  service.configure({ ...config, perMinute: 20 });
  for (const [response, message] of [
    [new Response('x'.repeat(2 * 1024 * 1024 + 1)), '2 MiB'],
    [new Response('not json'), 'invalid JSON'],
    [
      new Response(
        JSON.stringify({
          features: [{ geometry: { type: 'Polygon', coordinates: [] } }],
        }),
      ),
      'invalid road',
    ],
    [new Response('secret body', { status: 401 }), 'key or permissions'],
    [
      new Response(
        JSON.stringify({
          ...routeFixture,
          features: [
            {
              ...routeFixture.features[0],
              geometry: {
                type: 'LineString',
                coordinates: [
                  [0, 0],
                  [0, 0],
                ],
              },
            },
          ],
        }),
      ),
      'zero-length',
    ],
  ] as const) {
    fetcher.mockResolvedValueOnce(response);
    await expect(service.route(routeRequest)).rejects.toThrow(message);
    expect(service.status().busy).toBe(false);
  }
});

test('geographic bounds reject world-spanning response geometry and endpoints unrelated to reviewed waypoints', async () => {
  const fetcher = vi.fn<typeof fetch>(),
    service = new GeographyService(fetcher);
  service.configure(config);
  for (const [coordinates, message] of [
    [
      [
        [0, 0],
        [90, 0],
      ],
      '6,000 km',
    ],
    [
      [
        [0, 0],
        [0.01, 0],
      ],
      '10 km',
    ],
  ] as const) {
    fetcher.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ...routeFixture,
          features: [
            {
              ...routeFixture.features[0],
              geometry: { type: 'LineString', coordinates },
            },
          ],
        }),
      ),
    );
    await expect(service.route(routeRequest)).rejects.toThrow(message);
  }
});

test('serial requests, actual AbortSignal cancellation and readiness deadline release ownership', async () => {
  const fetcher = vi.fn<typeof fetch>().mockImplementation(
    (_url, options) =>
      new Promise((_resolve, reject) => {
        options!.signal!.addEventListener(
          'abort',
          () => reject(options!.signal!.reason),
          { once: true },
        );
      }),
  );
  const service = new GeographyService(fetcher, Date.now, 35);
  service.configure(config);
  const first = service.route(routeRequest);
  await expect(service.route(routeRequest)).rejects.toThrow('active');
  service.cancel();
  await expect(first).rejects.toThrow('cancelled');
  expect(service.status().busy).toBe(false);
  await expect(service.route(routeRequest)).rejects.toThrow('timed out');
  expect(service.status().busy).toBe(false);
});

test('API configure/search/review provenance persists atomically; failed routes and invalid source metadata leave saved projects intact', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'animatemap-geography-')),
    service = new GeographyService(
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response(JSON.stringify(routeFixture))),
    ),
    app = createApp(join(dir, 'projects'), service);
  try {
    const search = await app.inject({
      method: 'POST',
      url: '/api/geography/search',
      payload: { provider: 'natural-earth', text: 'Hanoi' },
    });
    expect(search.statusCode).toBe(200);
    const project = createDemo();
    addGeographicLayer(
      project,
      project.scenes[0]!.id,
      search.json().results[0],
      'place',
      'reviewed-place',
    );
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/projects',
          payload: project,
        })
      ).statusCode,
    ).toBe(200);
    const failed = await app.inject({
      method: 'POST',
      url: '/api/geography/route',
      payload: routeRequest,
    });
    expect(failed.statusCode).toBe(409);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/geography/configure',
          payload: config,
        })
      ).body,
    ).not.toContain(config.apiKey);
    const result = await app.inject({
      method: 'POST',
      url: '/api/geography/route',
      payload: routeRequest,
    });
    expect(result.statusCode).toBe(200);
    addGeographicLayer(
      project,
      project.scenes[0]!.id,
      result.json(),
      'road-route',
      'reviewed-route',
    );
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/projects',
          payload: project,
        })
      ).statusCode,
    ).toBe(200);
    const bad = structuredClone(project),
      route = bad.scenes[0]!.layers.find((l) => l.id === 'reviewed-route');
    if (route?.type === 'route')
      route.geographySource!.source = 'https://evil.example' as never;
    expect(
      (await app.inject({ method: 'POST', url: '/api/projects', payload: bad }))
        .statusCode,
    ).toBe(400);
    expect(
      (
        await app.inject({ method: 'GET', url: `/api/projects/${project.id}` })
      ).json(),
    ).toEqual(project);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/geography/route',
          payload: { ...routeRequest, url: 'https://evil.example' },
        })
      ).statusCode,
    ).toBe(400);
  } finally {
    await app.close();
    await rm(dir, { recursive: true, force: true });
  }
});
