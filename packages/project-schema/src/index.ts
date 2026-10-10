import { z } from 'zod';

const finite = z.number().finite();
const id = z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
export const coordinateSchema = z.tuple([
  finite.min(-180).max(180),
  finite.min(-90).max(90),
]);
export const easingSchema = z.enum([
  'linear',
  'easeIn',
  'easeOut',
  'easeInOut',
]);
export type Easing = z.infer<typeof easingSchema>;
export const cameraSchema = z.object({
  lng: finite.min(-180).max(180),
  lat: finite.min(-85).max(85),
  zoom: finite.min(0).max(18),
  bearing: finite.min(-360).max(360),
  pitch: finite.min(0).max(60),
});
export type Camera = z.infer<typeof cameraSchema>;
function track<T extends z.ZodType>(value: T) {
  return z
    .array(
      z.object({
        time: finite.min(0),
        value,
        easing: easingSchema.default('linear'),
      }),
    )
    .max(1000)
    .superRefine((keys, ctx) => {
      keys.forEach((key, i) => {
        if (i && key.time <= keys[i - 1]!.time)
          ctx.addIssue({
            code: 'custom',
            message: 'Keyframe times must be strictly increasing',
            path: [i, 'time'],
          });
      });
    });
}
export const cameraTrackSchema = track(cameraSchema).refine(
  (v) => v.length > 0,
  'Camera requires a keyframe',
);
const scalarTrack = track(finite.min(0).max(1));
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const anchorSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('map'), coordinates: coordinateSchema }),
  z.object({
    type: z.literal('screen'),
    x: finite.min(0).max(1),
    y: finite.min(0).max(1),
  }),
]);
const common = {
  id,
  name: z.string().min(1).max(200),
  visible: z.boolean().default(true),
  locked: z.boolean().default(false),
  timeRange: z
    .object({ start: finite.min(0), end: finite.min(0) })
    .refine((v) => v.end > v.start, 'Layer end must follow start'),
  opacity: finite.min(0).max(1).default(1),
  transform: z
    .object({
      scale: finite.min(0.01).max(10),
      rotation: finite.min(-360).max(360),
      offsetX: finite.min(-4000).max(4000),
      offsetY: finite.min(-4000).max(4000),
    })
    .default({ scale: 1, rotation: 0, offsetX: 0, offsetY: 0 }),
  tracks: z
    .object({
      opacity: scalarTrack.default([]),
      reveal: scalarTrack.default([]),
    })
    .default({ opacity: [], reveal: [] }),
};
const layerV1Schema = z.discriminatedUnion('type', [
  z.object({
    ...common,
    type: z.literal('countryHighlight'),
    countryCodes: z
      .array(z.string().regex(/^[A-Z]{3}$/))
      .min(1)
      .max(300),
    style: z.object({
      color,
      stroke: color,
      width: finite.min(0).max(20),
      dimOutside: finite.min(0).max(0.9).default(0),
    }),
  }),
  z.object({
    ...common,
    type: z.literal('route'),
    coordinates: z.array(coordinateSchema).min(2).max(10000),
    style: z.object({
      color,
      width: finite.min(1).max(40),
      dash: z.boolean().default(false),
      arrow: z.boolean().default(false),
    }),
  }),
  z.object({
    ...common,
    type: z.literal('marker'),
    anchor: anchorSchema,
    label: z.string().max(500),
    style: z.object({
      color,
      size: finite.min(4).max(200),
      icon: z.enum(['pin', 'circle', 'plane']).default('pin'),
    }),
  }),
  z.object({
    ...common,
    type: z.literal('text'),
    anchor: anchorSchema,
    text: z.string().max(10000),
    style: z.object({
      color,
      fontSize: finite.min(8).max(400),
      fontWeight: z.enum(['normal', 'bold']),
      align: z.enum(['left', 'center', 'right']),
    }),
  }),
]);
const projectV1Base = z.object({
  schemaVersion: z.literal(1),
  id,
  name: z.string().min(1).max(200),
  canvas: z.object({
    width: z.number().int().min(256).max(3840),
    height: z.number().int().min(256).max(3840),
    fps: z.union([z.literal(24), z.literal(30)]),
  }),
  durationSeconds: finite.min(1).max(300),
  map: z.object({
    providerId: z.literal('natural-earth'),
    styleId: z.enum(['light', 'dark', 'muted']),
    attribution: z.array(z.string().max(500)).min(1).max(10),
  }),
  metadata: z.object({
    dataSource: z.string().max(500),
    dataVersion: z.string().max(100),
    license: z.string().max(500),
  }),
  scenes: z
    .array(
      z.object({
        id,
        name: z.string().max(200),
        startSeconds: finite.min(0),
        durationSeconds: finite.min(0.01),
        camera: z.object({ keyframes: cameraTrackSchema }),
        layers: z.array(layerV1Schema).max(100),
      }),
    )
    .min(1)
    .max(20),
});
function validateTiming(
  project: Pick<z.infer<typeof projectV1Base>, 'scenes' | 'durationSeconds'>,
  ctx: z.RefinementCtx,
) {
  const ids = new Set<string>();
  let previousEnd = 0;
  project.scenes.forEach((scene, s) => {
    const issue = (message: string, path: (string | number)[]) =>
      ctx.addIssue({ code: 'custom', message, path: ['scenes', s, ...path] });
    if (ids.has(scene.id)) issue('Duplicate identifier', ['id']);
    ids.add(scene.id);
    if (
      scene.startSeconds < previousEnd ||
      scene.startSeconds + scene.durationSeconds > project.durationSeconds
    )
      issue('Scenes must not overlap or exceed project duration', [
        'startSeconds',
      ]);
    previousEnd = scene.startSeconds + scene.durationSeconds;
    scene.camera.keyframes.forEach((k, i) => {
      if (k.time > scene.durationSeconds)
        issue('Keyframe exceeds scene duration', ['camera', 'keyframes', i]);
    });
    scene.layers.forEach((layer, l) => {
      if (ids.has(layer.id)) issue('Duplicate identifier', ['layers', l, 'id']);
      ids.add(layer.id);
      if (layer.timeRange.end > scene.durationSeconds)
        issue('Layer exceeds scene duration', ['layers', l, 'timeRange']);
      for (const [property, keys] of Object.entries(layer.tracks))
        keys.forEach((k, i) => {
          if (k.time > scene.durationSeconds)
            issue('Keyframe exceeds scene duration', [
              'layers',
              l,
              'tracks',
              property,
              i,
            ]);
        });
    });
  });
}
export const projectV1Schema = projectV1Base.superRefine(validateTiming);
export const transitionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('cut') }),
  z.object({
    type: z.literal('crossfade'),
    durationSeconds: finite.min(0.1).max(5),
  }),
]);
const sceneV2Schema = projectV1Base.shape.scenes.element.extend({
  transition: transitionSchema.default({ type: 'cut' }),
});
const projectV2Base = z.object({
  ...projectV1Base.shape,
  schemaVersion: z.literal(2),
  scenes: z.array(sceneV2Schema).min(1).max(20),
});
function validateTransitions(
  project: Pick<z.infer<typeof projectV2Base>, 'scenes'>,
  ctx: z.RefinementCtx,
) {
  project.scenes.forEach((scene, index) => {
    if (scene.transition.type !== 'crossfade') return;
    const previous = project.scenes[index - 1];
    if (
      !previous ||
      Math.abs(
        previous.startSeconds + previous.durationSeconds - scene.startSeconds,
      ) > 1e-8 ||
      scene.transition.durationSeconds > scene.durationSeconds
    )
      ctx.addIssue({
        code: 'custom',
        message:
          'Crossfade requires an adjacent previous scene and cannot exceed scene duration',
        path: ['scenes', index, 'transition'],
      });
  });
}
export const projectV2Schema = projectV2Base
  .superRefine(validateTiming)
  .superRefine(validateTransitions);
export const scalarProperties = [
  'opacity',
  'reveal',
  'scale',
  'rotation',
  'offsetX',
  'offsetY',
] as const;
export type ScalarProperty = (typeof scalarProperties)[number];
export const scalarLimits: Record<ScalarProperty, readonly [number, number]> = {
  opacity: [0, 1],
  reveal: [0, 1],
  scale: [0.01, 10],
  rotation: [-360, 360],
  offsetX: [-4000, 4000],
  offsetY: [-4000, 4000],
};
const tracksV3Schema = z
  .object({
    opacity: scalarTrack.default([]),
    reveal: scalarTrack.default([]),
    scale: track(finite.min(0.01).max(10)).default([]),
    rotation: track(finite.min(-360).max(360)).default([]),
    offsetX: track(finite.min(-4000).max(4000)).default([]),
    offsetY: track(finite.min(-4000).max(4000)).default([]),
  })
  .default({
    opacity: [],
    reveal: [],
    scale: [],
    rotation: [],
    offsetX: [],
    offsetY: [],
  });
export const layerSchema = z.discriminatedUnion('type', [
  layerV1Schema.options[0].extend({ tracks: tracksV3Schema }),
  layerV1Schema.options[1].extend({ tracks: tracksV3Schema }),
  layerV1Schema.options[2].extend({ tracks: tracksV3Schema }),
  layerV1Schema.options[3].extend({ tracks: tracksV3Schema }),
]);
export type Layer = z.infer<typeof layerSchema>;
export function propertiesForLayer(layer: Layer): ScalarProperty[] {
  return layer.type === 'marker' || layer.type === 'text'
    ? ['opacity', 'scale', 'rotation', 'offsetX', 'offsetY']
    : layer.type === 'route'
      ? ['opacity', 'reveal']
      : ['opacity'];
}
export const CURRENT_SCHEMA_VERSION = 3;
export const projectSchema = z
  .object({
    ...projectV2Base.shape,
    schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
    scenes: z
      .array(sceneV2Schema.extend({ layers: z.array(layerSchema).max(100) }))
      .min(1)
      .max(20),
  })
  .superRefine(validateTiming)
  .superRefine(validateTransitions)
  .superRefine((project, ctx) => {
    project.scenes.forEach((scene, s) =>
      scene.layers.forEach((layer, l) => {
        if (layer.type === 'marker' || layer.type === 'text') return;
        for (const property of [
          'scale',
          'rotation',
          'offsetX',
          'offsetY',
        ] as const)
          if (layer.tracks[property].length)
            ctx.addIssue({
              code: 'custom',
              message: 'Transform tracks require a marker or text overlay',
              path: ['scenes', s, 'layers', l, 'tracks', property],
            });
      }),
    );
  });
export type Project = z.infer<typeof projectSchema>;
export type Anchor = z.infer<typeof anchorSchema>;
export type ScalarKeyframe = Layer['tracks']['opacity'][number];
export function migrateProject(input: unknown): Project {
  if (
    input &&
    typeof input === 'object' &&
    'schemaVersion' in input &&
    (input.schemaVersion === 1 || input.schemaVersion === 2)
  ) {
    const legacy =
      input.schemaVersion === 1
        ? projectV2Schema.parse({
            ...projectV1Schema.parse(input),
            schemaVersion: 2,
          })
        : projectV2Schema.parse(input);
    return projectSchema.parse({
      ...legacy,
      schemaVersion: CURRENT_SCHEMA_VERSION,
    });
  }
  return projectSchema.parse(input);
}
export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
});
export const jobSchema = z.object({
  id,
  state: z.enum([
    'queued',
    'rendering',
    'encoding',
    'completed',
    'failed',
    'cancelled',
  ]),
  progress: finite.min(0).max(1),
  format: z.enum(['mp4', 'png']),
  error: z.string().optional(),
  elapsedMs: finite.optional(),
});
export type RenderJob = z.infer<typeof jobSchema>;

export function createDemo(kind: 'travel' | 'highlight' = 'travel'): Project {
  const base = {
    visible: true,
    locked: false,
    timeRange: { start: 0, end: 12 },
    opacity: 1,
    transform: { scale: 1, rotation: 0, offsetX: 0, offsetY: 0 },
    tracks: { opacity: [], reveal: [] },
  };
  return projectSchema.parse({
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id: `demo-${kind}`,
    name:
      kind === 'travel'
        ? 'Vietnam · A journey south'
        : 'Southeast Asia · In focus',
    canvas: { width: 1920, height: 1080, fps: 30 },
    durationSeconds: 12,
    map: {
      providerId: 'natural-earth',
      styleId: 'dark',
      attribution: ['Natural Earth · Public domain'],
    },
    metadata: {
      dataSource: 'Natural Earth Admin 0 Countries',
      dataVersion: '5.1.2',
      license: 'Public domain',
    },
    scenes: [
      {
        id: 'scene-1',
        name: 'Opening',
        startSeconds: 0,
        durationSeconds: 12,
        camera: {
          keyframes: [
            {
              time: 0,
              value: { lng: 108, lat: 16, zoom: 4, bearing: 0, pitch: 0 },
              easing: 'easeInOut',
            },
            {
              time: 5,
              value: { lng: 106.5, lat: 18.5, zoom: 5, bearing: 8, pitch: 20 },
              easing: 'easeInOut',
            },
            {
              time: 12,
              value: { lng: 107, lat: 12, zoom: 5, bearing: -5, pitch: 15 },
              easing: 'easeInOut',
            },
          ],
        },
        layers: [
          {
            ...base,
            id: 'highlight-vn',
            name: 'Vietnam',
            type: 'countryHighlight',
            countryCodes: kind === 'travel' ? ['VNM'] : ['VNM', 'THA'],
            style: {
              color: '#307e72',
              stroke: '#75d9bd',
              width: 1.5,
              dimOutside: 0.2,
            },
          },
          ...(kind === 'travel'
            ? [
                {
                  ...base,
                  id: 'route-1',
                  name: 'Hanoi → Ho Chi Minh City',
                  type: 'route',
                  coordinates: [
                    [105.85, 21.03],
                    [108.2, 16.06],
                    [106.7, 10.82],
                  ],
                  style: {
                    color: '#ffd087',
                    width: 5,
                    dash: false,
                    arrow: true,
                  },
                  tracks: {
                    opacity: [],
                    reveal: [
                      { time: 0, value: 0, easing: 'linear' },
                      { time: 10, value: 1, easing: 'easeInOut' },
                    ],
                  },
                },
                ...[
                  [105.85, 21.03, 'Hà Nội'],
                  [108.2, 16.06, 'Đà Nẵng'],
                  [106.7, 10.82, 'TP. Hồ Chí Minh'],
                ].map(([lng, lat, label], i) => ({
                  ...base,
                  id: `marker-${i}`,
                  name: label,
                  type: 'marker',
                  anchor: { type: 'map', coordinates: [lng, lat] },
                  label,
                  style: { color: '#ffd087', size: 18, icon: 'pin' },
                })),
              ]
            : []),
          {
            ...base,
            id: 'title-1',
            name: 'Opening title',
            type: 'text',
            text:
              kind === 'travel' ? 'VIETNAM\nA journey south' : 'SOUTHEAST ASIA',
            anchor: { type: 'screen', x: 0.07, y: 0.14 },
            style: {
              color: '#ffffff',
              fontSize: 52,
              fontWeight: 'bold',
              align: 'left',
            },
          },
        ],
      },
    ],
  });
}
