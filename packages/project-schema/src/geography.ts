import { z } from 'zod';

const coordinate = z.tuple([
  z.number().finite().min(-180).max(180),
  z.number().finite().min(-90).max(90),
]);
export const geographySourceSchema = z
  .object({
    provider: z.enum(['natural-earth', 'openrouteservice']),
    kind: z.enum(['place', 'road-route']),
    sourceId: z.string().trim().min(1).max(200),
    source: z.enum([
      'https://www.naturalearthdata.com/',
      'https://openrouteservice.org/',
    ]),
    license: z.enum(['Public domain', 'ODbL-1.0']),
    credit: z.string().trim().min(1).max(200),
    retrievedAt: z.string().datetime(),
    datasetVersion: z.string().trim().min(1).max(100),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    profile: z
      .enum(['driving-car', 'cycling-regular', 'foot-walking'])
      .optional(),
    distanceMeters: z.number().finite().positive().max(6000000).optional(),
  })
  .superRefine((source, ctx) => {
    if (
      source.provider === 'natural-earth' &&
      (source.kind !== 'place' ||
        source.license !== 'Public domain' ||
        source.source !== 'https://www.naturalearthdata.com/')
    )
      ctx.addIssue({
        code: 'custom',
        message:
          'Natural Earth provides release-reference places, not road routes',
      });
    if (
      source.provider === 'openrouteservice' &&
      (source.license !== 'ODbL-1.0' ||
        source.source !== 'https://openrouteservice.org/' ||
        !source.credit.includes('openstreetmap.org/copyright'))
    )
      ctx.addIssue({
        code: 'custom',
        message: 'ORS source requires retained OpenStreetMap/ODbL attribution',
      });
    if (
      source.kind === 'road-route' &&
      (!source.profile || !source.distanceMeters)
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Road route requires profile and measured distance',
      });
  });
export type GeographySource = z.infer<typeof geographySourceSchema>;
export const placeResultSchema = z.object({
  id: z.string().min(1).max(200),
  label: z.string().min(1).max(300),
  country: z.string().max(100),
  coordinates: coordinate,
  source: geographySourceSchema,
});
export const geocodeResponseSchema = z.object({
  results: z.array(placeResultSchema).max(10),
});
export type PlaceResult = z.infer<typeof placeResultSchema>;
export const roadRouteResultSchema = z.object({
  coordinates: z.array(coordinate).min(2).max(10000),
  source: geographySourceSchema.refine(
    (s) => s.kind === 'road-route',
    'Road route source required',
  ),
});
export type RoadRouteResult = z.infer<typeof roadRouteResultSchema>;
export const geocodeRequestSchema = z
  .object({
    provider: z.enum(['natural-earth', 'openrouteservice']),
    text: z.string().trim().min(2).max(150),
  })
  .strict();
export const directionsRequestSchema = z
  .object({
    coordinates: z.array(coordinate).min(2).max(10),
    profile: z.enum(['driving-car', 'cycling-regular', 'foot-walking']),
  })
  .strict();
export const geographyConfigurationSchema = z
  .object({
    apiKey: z
      .string()
      .trim()
      .min(10)
      .max(300)
      .regex(/^[A-Za-z0-9_.-]+$/),
    termsAccepted: z.literal(true),
    perMinute: z.number().int().min(1).max(20),
    perDay: z.number().int().min(1).max(500),
  })
  .strict();
export type GeographyConfiguration = z.infer<
  typeof geographyConfigurationSchema
>;
export const orsGeocodeSchema = z.object({
  features: z
    .array(
      z.object({
        geometry: z.object({
          type: z.literal('Point'),
          coordinates: coordinate,
        }),
        properties: z.object({
          gid: z
            .string()
            .regex(/^openstreetmap:/)
            .min(1)
            .max(200),
          source: z.literal('openstreetmap'),
          label: z.string().min(1).max(300),
          country: z.string().max(100).optional(),
        }),
      }),
    )
    .max(10),
});
export const orsDirectionsSchema = z.object({
  features: z
    .array(
      z.object({
        geometry: z.object({
          type: z.literal('LineString'),
          coordinates: z.array(coordinate).min(2).max(10000),
        }),
        properties: z.object({
          summary: z.object({
            distance: z.number().finite().positive().max(6000000),
          }),
        }),
      }),
    )
    .min(1)
    .max(3),
  metadata: z
    .object({
      engine: z
        .object({
          version: z.string().max(100),
          graph_date: z.string().max(100).optional(),
        })
        .optional(),
    })
    .optional(),
});
