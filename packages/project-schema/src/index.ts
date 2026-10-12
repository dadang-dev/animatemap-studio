import { z } from 'zod';
import { terrainSchema, terrainCameraSupported } from './terrain';
export {
  terrainSchema,
  terrainPack,
  TERRAIN_CREDIT,
  TERRAIN_MIN_ZOOM,
  terrainCameraSupported,
  type TerrainConfiguration,
} from './terrain';
export {
  proposalRequestSchema,
  projectProposalSchema,
  projectProposalJsonSchema,
  type ProjectProposal,
} from './proposals';
import { geographySourceSchema } from './geography';
export {
  orsGeocodeSchema,
  orsDirectionsSchema,
  type GeographyConfiguration,
} from './geography';
export {
  geographySourceSchema,
  placeResultSchema,
  roadRouteResultSchema,
  geocodeResponseSchema,
  geocodeRequestSchema,
  directionsRequestSchema,
  geographyConfigurationSchema,
  type GeographySource,
  type PlaceResult,
  type RoadRouteResult,
} from './geography';
import {
  audioAssetSchema,
  audioTrackSchema,
  captionsSchema,
  inspectEmbeddedWav,
  MAX_AUDIO_TOTAL_BYTES,
  MAX_PROJECT_BODY_BYTES,
} from './audio';
export {
  audioAssetSchema,
  audioTrackSchema,
  captionsSchema,
  inspectWav,
  inspectEmbeddedWav,
  pcmWav,
  wavBytes,
  wavDataUrl,
  MAX_AUDIO_BYTES,
  MAX_AUDIO_TOTAL_BYTES,
  MAX_PROJECT_BODY_BYTES,
  type AudioAsset,
  type AudioTrack,
  type CaptionCue,
  type WavInfo,
} from './audio';
import {
  admin1CountryCodesSchema,
  admin1RegionCodesSchema,
  admin1CountriesForRegions,
  admin1Reference,
  MAX_ADMIN1_COUNTRIES,
} from './admin1';
export {
  admin1CountryCodesSchema,
  admin1RegionCodesSchema,
  admin1CountriesForRegions,
  admin1Reference,
  admin1Files,
  ADMIN1_RELEASE,
  MAX_ADMIN1_COUNTRIES,
  type Admin1Regions,
  type Admin1Properties,
} from './admin1';
export { crc32 } from './checksum';
import { datasetSchema } from './datasets';
export {
  countryCatalog,
  datasetSchema,
  dataRecordSchema,
  defaultDataDomain,
  type Dataset,
} from './datasets';
import {
  imageAssetSchema,
  MAX_ASSET_TOTAL_BYTES,
  MAX_ASSET_PIXELS,
  inspectPng,
} from './assets';
export {
  imageAssetSchema,
  assetProvenanceSchema,
  inspectPng,
  MAX_ASSET_BYTES,
  MAX_ASSET_TOTAL_BYTES,
  MAX_ASSET_PIXELS,
  type ImageAsset,
} from './assets';

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
  project: {
    durationSeconds: number;
    scenes: {
      id: string;
      startSeconds: number;
      durationSeconds: number;
      camera: { keyframes: { time: number }[] };
      layers: {
        id: string;
        timeRange: { end: number };
        tracks: Record<string, { time: number }[]>;
      }[];
    }[];
  },
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
  project: {
    scenes: {
      startSeconds: number;
      durationSeconds: number;
      transition: z.infer<typeof transitionSchema>;
    }[];
  },
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
  'dataYear',
] as const;
export type ScalarProperty = (typeof scalarProperties)[number];
export const scalarLimits: Record<ScalarProperty, readonly [number, number]> = {
  opacity: [0, 1],
  reveal: [0, 1],
  scale: [0.01, 10],
  rotation: [-360, 360],
  offsetX: [-4000, 4000],
  offsetY: [-4000, 4000],
  dataYear: [1, 9999],
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
const layerV3Schema = z.discriminatedUnion('type', [
  layerV1Schema.options[0].extend({ tracks: tracksV3Schema }),
  layerV1Schema.options[1].extend({ tracks: tracksV3Schema }),
  layerV1Schema.options[2].extend({ tracks: tracksV3Schema }),
  layerV1Schema.options[3].extend({ tracks: tracksV3Schema }),
]);
export const shapeSchema = z
  .object({
    ...common,
    tracks: tracksV3Schema,
    type: z.literal('shape'),
    kind: z.enum(['line', 'arrow', 'bezier']),
    coordinates: z.array(coordinateSchema).min(2).max(10000),
    style: z.object({
      color,
      width: finite.min(1).max(40),
      dash: z.boolean().default(false),
      arrow: z.boolean().default(false),
    }),
  })
  .refine(
    (shape) => shape.kind !== 'bezier' || shape.coordinates.length === 4,
    'Bezier requires exactly four control points',
  );
const layerV5Schema = z.discriminatedUnion('type', [
  ...layerV3Schema.options,
  shapeSchema,
]);
const imageLayerSchema = z.object({
  ...common,
  tracks: tracksV3Schema,
  type: z.literal('image'),
  assetId: id,
  anchor: anchorSchema,
  style: z.object({
    width: finite.min(1).max(3840),
    height: finite.min(1).max(3840),
    fit: z.enum(['contain', 'cover']),
  }),
});
const layerV6Schema = z.discriminatedUnion('type', [
  layerV3Schema.options[0].extend({ textureAssetId: id.optional() }),
  layerV3Schema.options[1],
  layerV3Schema.options[2],
  layerV3Schema.options[3],
  shapeSchema,
  imageLayerSchema,
]);
export const labelCollisionSchema = z
  .object({
    mode: z.enum(['allow', 'hide']).default('allow'),
    priority: z.number().int().min(0).max(100).default(50),
  })
  .default({ mode: 'allow', priority: 50 });
const layerV7Schema = z.discriminatedUnion('type', [
  layerV6Schema.options[0],
  layerV6Schema.options[1],
  layerV6Schema.options[2].extend({ collision: labelCollisionSchema }),
  layerV6Schema.options[3].extend({ collision: labelCollisionSchema }),
  shapeSchema,
  imageLayerSchema,
]);
const tracksV8Schema = tracksV3Schema
  .unwrap()
  .extend({
    dataYear: track(finite.min(1).max(9999)).default([]),
  })
  .default({
    opacity: [],
    reveal: [],
    scale: [],
    rotation: [],
    offsetX: [],
    offsetY: [],
    dataYear: [],
  });
const choroplethSchema = z.object({
  ...common,
  tracks: tracksV8Schema,
  type: z.literal('choropleth'),
  datasetId: id,
  dataYear: finite.min(1).max(9999),
  sampling: z.enum(['linear', 'step']).default('linear'),
  domain: z
    .object({ min: finite, max: finite })
    .refine(
      (domain) => domain.max > domain.min,
      'Domain maximum must exceed minimum',
    ),
  style: z.object({
    color,
    highColor: color,
    missingColor: color,
    stroke: color,
    width: finite.min(0).max(20),
  }),
  legend: z
    .object({
      visible: z.boolean().default(true),
      x: finite.min(0).max(1),
      y: finite.min(0).max(1),
    })
    .default({ visible: true, x: 0.04, y: 0.78 }),
});
const layerV8Schema = z.discriminatedUnion('type', [
  layerV7Schema.options[0].extend({ tracks: tracksV8Schema }),
  layerV7Schema.options[1].extend({ tracks: tracksV8Schema }),
  layerV7Schema.options[2].extend({ tracks: tracksV8Schema }),
  layerV7Schema.options[3].extend({ tracks: tracksV8Schema }),
  shapeSchema.safeExtend({ tracks: tracksV8Schema }),
  imageLayerSchema.extend({ tracks: tracksV8Schema }),
  choroplethSchema,
]);
const admin1HighlightSchema = z.object({
  ...common,
  type: z.literal('admin1Highlight'),
  tracks: tracksV8Schema,
  regionCodes: admin1RegionCodesSchema,
  style: z.object({
    color,
    stroke: color,
    width: finite.min(0).max(20),
    dimOutside: finite.min(0).max(0.9).default(0),
  }),
});
const layerV9Schema = z.discriminatedUnion('type', [
  ...layerV8Schema.options,
  admin1HighlightSchema,
]);
export const layerSchema = z.discriminatedUnion('type', [
  layerV8Schema.options[0],
  layerV8Schema.options[1].extend({
    geographySource: geographySourceSchema.optional(),
  }),
  layerV8Schema.options[2].extend({
    geographySource: geographySourceSchema.optional(),
  }),
  layerV8Schema.options[3],
  layerV8Schema.options[4],
  layerV8Schema.options[5],
  layerV8Schema.options[6],
  admin1HighlightSchema,
]);
export type Layer = z.infer<typeof layerSchema>;
export function propertiesForLayer(layer: Layer): ScalarProperty[] {
  return layer.type === 'marker' ||
    layer.type === 'text' ||
    layer.type === 'image'
    ? ['opacity', 'scale', 'rotation', 'offsetX', 'offsetY']
    : layer.type === 'choropleth'
      ? ['opacity', 'dataYear']
      : layer.type === 'route' || layer.type === 'shape'
        ? ['opacity', 'reveal']
        : ['opacity'];
}
const projectV3Base = z.object({
  ...projectV2Base.shape,
  schemaVersion: z.literal(3),
  scenes: z
    .array(sceneV2Schema.extend({ layers: z.array(layerV3Schema).max(100) }))
    .min(1)
    .max(20),
});
function validateTransformTracks(
  project: {
    scenes: {
      layers: {
        type: string;
        tracks: {
          scale: unknown[];
          rotation: unknown[];
          offsetX: unknown[];
          offsetY: unknown[];
        };
      }[];
    }[];
  },
  ctx: z.RefinementCtx,
) {
  project.scenes.forEach((scene, s) =>
    scene.layers.forEach((layer, l) => {
      if (
        layer.type === 'marker' ||
        layer.type === 'text' ||
        layer.type === 'image'
      )
        return;
      for (const property of [
        'scale',
        'rotation',
        'offsetX',
        'offsetY',
      ] as const)
        if (layer.tracks[property].length)
          ctx.addIssue({
            code: 'custom',
            message: 'Transform tracks require a marker, text or image overlay',
            path: ['scenes', s, 'layers', l, 'tracks', property],
          });
    }),
  );
}
export const projectV3Schema = projectV3Base
  .superRefine(validateTiming)
  .superRefine(validateTransitions)
  .superRefine(validateTransformTracks);
const projectV4Base = projectV3Base.extend({
  schemaVersion: z.literal(4),
  canvas: projectV3Base.shape.canvas.extend({
    fps: z.union([z.literal(24), z.literal(30), z.literal(60)]),
  }),
});
export const projectV4Schema = projectV4Base
  .superRefine(validateTiming)
  .superRefine(validateTransitions)
  .superRefine(validateTransformTracks);
const projectV5Base = projectV4Base.extend({
  schemaVersion: z.literal(5),
  scenes: z
    .array(sceneV2Schema.extend({ layers: z.array(layerV5Schema).max(100) }))
    .min(1)
    .max(20),
});
export const projectV5Schema = projectV5Base
  .superRefine(validateTiming)
  .superRefine(validateTransitions)
  .superRefine(validateTransformTracks);
const projectV6Base = projectV5Base.extend({
  schemaVersion: z.literal(6),
  assets: z.array(imageAssetSchema).max(20).default([]),
  scenes: z
    .array(sceneV2Schema.extend({ layers: z.array(layerV6Schema).max(100) }))
    .min(1)
    .max(20),
});
export const projectV6Schema = projectV6Base
  .superRefine(validateTiming)
  .superRefine(validateTransitions)
  .superRefine(validateTransformTracks)
  .superRefine(validateAssetReferences);
function validateAssetReferences(
  project: {
    assets: z.infer<typeof imageAssetSchema>[];
    scenes: {
      layers: { type: string; assetId?: string; textureAssetId?: string }[];
    }[];
  },
  ctx: z.RefinementCtx,
) {
  const assets = new Set<string>();
  let bytes = 0,
    pixels = 0;
  project.assets.forEach((asset, index) => {
    if (assets.has(asset.id))
      ctx.addIssue({
        code: 'custom',
        message: 'Duplicate asset identifier',
        path: ['assets', index, 'id'],
      });
    assets.add(asset.id);
    pixels += asset.width * asset.height;
    // Individual invalid data has already received a precise schema issue.
    try {
      bytes += inspectPng(asset.dataUrl).bytes;
    } catch {
      /* handled above */
    }
  });
  if (bytes > MAX_ASSET_TOTAL_BYTES || pixels > MAX_ASSET_PIXELS)
    ctx.addIssue({
      code: 'custom',
      message:
        'Project asset budget exceeded: 3 MB compressed / 24 million pixels',
      path: ['assets'],
    });
  project.scenes.forEach((scene, s) =>
    scene.layers.forEach((layer, l) => {
      const reference =
        layer.type === 'image'
          ? layer.assetId
          : layer.type === 'countryHighlight'
            ? layer.textureAssetId
            : undefined;
      if (reference && !assets.has(reference))
        ctx.addIssue({
          code: 'custom',
          message: `Missing image asset ${reference}`,
          path: ['scenes', s, 'layers', l],
        });
      if (layer.type === 'countryHighlight' && layer.textureAssetId) {
        const asset = project.assets.find(
          (asset) => asset.id === layer.textureAssetId,
        );
        if (asset && (asset.width > 512 || asset.height > 512))
          ctx.addIssue({
            code: 'custom',
            message: 'Repeating texture dimensions cannot exceed 512 pixels',
            path: ['scenes', s, 'layers', l, 'textureAssetId'],
          });
      }
    }),
  );
}
const projectV7Base = projectV6Base.extend({
  schemaVersion: z.literal(7),
  scenes: z
    .array(sceneV2Schema.extend({ layers: z.array(layerV7Schema).max(100) }))
    .min(1)
    .max(20),
});
export const projectV7Schema = projectV7Base
  .superRefine(validateTiming)
  .superRefine(validateTransitions)
  .superRefine(validateTransformTracks)
  .superRefine(validateAssetReferences);
const projectV8Base = projectV7Base.extend({
  schemaVersion: z.literal(8),
  datasets: z.array(datasetSchema).max(5).default([]),
  scenes: z
    .array(sceneV2Schema.extend({ layers: z.array(layerV8Schema).max(100) }))
    .min(1)
    .max(20),
});
export const projectV8Schema = projectV8Base
  .superRefine(validateTiming)
  .superRefine(validateTransitions)
  .superRefine(validateTransformTracks)
  .superRefine(validateAssetReferences)
  .superRefine(validateDatasetReferences);
function validateDatasetReferences(
  project: z.infer<typeof projectV8Base> | z.infer<typeof projectV9Base>,
  ctx: z.RefinementCtx,
) {
  const ids = new Set<string>();
  let observations = 0;
  project.datasets.forEach((dataset, index) => {
    if (ids.has(dataset.id))
      ctx.addIssue({
        code: 'custom',
        message: 'Duplicate dataset identifier',
        path: ['datasets', index, 'id'],
      });
    ids.add(dataset.id);
    observations += dataset.records.length;
  });
  if (observations > 10000)
    ctx.addIssue({
      code: 'custom',
      message: 'Project exceeds 10000 observations',
      path: ['datasets'],
    });
  project.scenes.forEach((scene, s) =>
    scene.layers.forEach((layer, l) => {
      if (layer.type !== 'choropleth') {
        if (layer.tracks.dataYear.length)
          ctx.addIssue({
            code: 'custom',
            message: 'Data-year keys require a choropleth layer',
            path: ['scenes', s, 'layers', l, 'tracks', 'dataYear'],
          });
        return;
      }
      const dataset = project.datasets.find(
        (dataset) => dataset.id === layer.datasetId,
      );
      if (!dataset) {
        ctx.addIssue({
          code: 'custom',
          message: 'Missing choropleth dataset',
          path: ['scenes', s, 'layers', l, 'datasetId'],
        });
        return;
      }
      const years = dataset.records.map((record) => record.year);
      const min = Math.min(...years),
        max = Math.max(...years);
      if (
        [layer.dataYear, ...layer.tracks.dataYear.map((key) => key.value)].some(
          (year) => year < min || year > max,
        )
      )
        ctx.addIssue({
          code: 'custom',
          message: 'Data year must stay within observed dataset years',
          path: ['scenes', s, 'layers', l, 'dataYear'],
        });
    }),
  );
}
export const CURRENT_SCHEMA_VERSION = 12;
const projectV9Base = projectV8Base.extend({
  schemaVersion: z.literal(9),
  map: projectV8Base.shape.map.extend({
    admin1Countries: admin1CountryCodesSchema,
  }),
  scenes: z
    .array(sceneV2Schema.extend({ layers: z.array(layerV9Schema).max(100) }))
    .min(1)
    .max(20),
});
const projectV9Schema = projectV9Base
  .superRefine(validateTiming)
  .superRefine(validateTransitions)
  .superRefine(validateTransformTracks)
  .superRefine(validateAssetReferences)
  .superRefine(validateDatasetReferences)
  .superRefine((project, ctx) => {
    const countries = new Set(project.map.admin1Countries);
    for (const scene of project.scenes)
      for (const layer of scene.layers)
        if (layer.type === 'admin1Highlight')
          for (const country of admin1CountriesForRegions(
            layer.regionCodes.filter((code) => admin1Reference.has(code)),
          ))
            countries.add(country);
    if (countries.size > MAX_ADMIN1_COUNTRIES)
      ctx.addIssue({
        code: 'custom',
        message: `Project Admin 1 coverage exceeds ${MAX_ADMIN1_COUNTRIES} countries`,
        path: ['map', 'admin1Countries'],
      });
  });
const projectV10Base = projectV9Base.extend({
  schemaVersion: z.literal(10),
  audioAssets: z.array(audioAssetSchema).max(5).default([]),
  audioTracks: z.array(audioTrackSchema).max(10).default([]),
  captions: captionsSchema,
});
const projectV10Schema = projectV10Base.superRefine((project, ctx) => {
  const legacy = projectV9Schema.safeParse({ ...project, schemaVersion: 9 });
  if (!legacy.success)
    for (const issue of legacy.error.issues)
      ctx.addIssue({
        code: 'custom',
        message: issue.message,
        path: issue.path,
      });
  const unique = (items: { id: string }[], key: string) => {
    if (new Set(items.map((item) => item.id)).size !== items.length)
      ctx.addIssue({
        code: 'custom',
        message: `Duplicate ${key} identifier`,
        path: [key],
      });
  };
  unique(project.audioAssets, 'audioAssets');
  unique(project.audioTracks, 'audioTracks');
  unique(project.captions.cues, 'captions');
  let bytes = 0;
  const info = new Map<string, ReturnType<typeof inspectEmbeddedWav>>();
  for (const asset of project.audioAssets) {
    try {
      const value = inspectEmbeddedWav(asset.dataUrl);
      info.set(asset.id, value);
      bytes += value.bytes;
    } catch {
      /* Asset schema reports malformed bytes. */
    }
  }
  if (bytes > MAX_AUDIO_TOTAL_BYTES)
    ctx.addIssue({
      code: 'custom',
      message: 'Project audio exceeds 32 MiB',
      path: ['audioAssets'],
    });
  project.audioTracks.forEach((track, index) => {
    const source = info.get(track.assetId);
    const error = !source
      ? 'Missing audio asset'
      : track.startSeconds + track.durationSeconds >
          project.durationSeconds + 1e-9
        ? 'Audio track exceeds project duration'
        : track.sourceStartSeconds + track.durationSeconds >
            source.duration + 1e-9
          ? 'Audio track exceeds source duration'
          : track.fadeInSeconds + track.fadeOutSeconds >
              track.durationSeconds + 1e-9
            ? 'Audio fades exceed clip duration'
            : null;
    if (error)
      ctx.addIssue({
        code: 'custom',
        message: error,
        path: ['audioTracks', index],
      });
  });
  project.captions.cues.forEach((cue, index) => {
    if (
      cue.startSeconds >= cue.endSeconds ||
      cue.endSeconds > project.durationSeconds ||
      (index &&
        cue.startSeconds < project.captions.cues[index - 1]!.startSeconds)
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Caption cues require ordered starts and valid project bounds',
        path: ['captions', 'cues', index],
      });
  });
  const audioCharacters = project.audioAssets.reduce(
    (sum, asset) => sum + asset.dataUrl.length,
    0,
  );
  const imageCharacters = project.assets.reduce(
    (sum, asset) => sum + asset.dataUrl.length,
    0,
  );
  const metadataBytes = new TextEncoder().encode(
    JSON.stringify({
      ...project,
      audioAssets: project.audioAssets.map((asset) => ({
        ...asset,
        dataUrl: '',
      })),
      assets: project.assets.map((asset) => ({ ...asset, dataUrl: '' })),
    }),
  ).length;
  if (
    audioCharacters + imageCharacters + metadataBytes >
    MAX_PROJECT_BODY_BYTES - 65536
  )
    ctx.addIssue({
      code: 'custom',
      message: 'Project exceeds the embedded JSON request budget (48 MiB)',
      path: [],
    });
});
const projectV11Base = projectV10Base.extend({
  schemaVersion: z.literal(11),
  scenes: z
    .array(sceneV2Schema.extend({ layers: z.array(layerSchema).max(100) }))
    .min(1)
    .max(20),
});
export const projectV11Schema = projectV11Base.superRefine((project, ctx) => {
  const legacy = projectV10Schema.safeParse({
    ...project,
    schemaVersion: 10,
  });
  if (!legacy.success)
    for (const issue of legacy.error.issues)
      ctx.addIssue({
        code: 'custom',
        message: issue.message,
        path: issue.path,
      });
  project.scenes.forEach((scene, s) =>
    scene.layers.forEach((layer, l) => {
      if (
        (layer.type === 'route' || layer.type === 'marker') &&
        layer.geographySource &&
        layer.geographySource.kind !==
          (layer.type === 'route' ? 'road-route' : 'place')
      )
        ctx.addIssue({
          code: 'custom',
          message: 'Geographic source does not match layer type',
          path: ['scenes', s, 'layers', l, 'geographySource'],
        });
    }),
  );
  if (
    new TextEncoder().encode(JSON.stringify(project)).length >
    MAX_PROJECT_BODY_BYTES - 65536
  )
    ctx.addIssue({
      code: 'custom',
      message: 'Project exceeds the embedded JSON request budget (48 MiB)',
      path: [],
    });
});
export const projectSchema = projectV11Base
  .extend({
    schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
    map: projectV11Base.shape.map.extend({ terrain: terrainSchema }),
  })
  .superRefine((project, ctx) => {
    const legacy = projectV11Schema.safeParse({
      ...project,
      schemaVersion: 11,
    });
    if (!legacy.success)
      for (const issue of legacy.error.issues)
        ctx.addIssue({
          code: 'custom',
          message: issue.message,
          path: issue.path,
        });
    if (project.map.terrain)
      project.scenes.forEach((scene, s) =>
        scene.camera.keyframes.forEach((key, k) => {
          if (!terrainCameraSupported(key.value))
            ctx.addIssue({
              code: 'custom',
              message:
                'Terrain cameras must remain inside the verified Sa Pa pack at zoom 10 or greater',
              path: ['scenes', s, 'camera', 'keyframes', k],
            });
        }),
      );
    if (
      new TextEncoder().encode(JSON.stringify(project)).length >
      MAX_PROJECT_BODY_BYTES - 65536
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Project exceeds the embedded JSON request budget (48 MiB)',
        path: [],
      });
  });
export type Project = z.infer<typeof projectSchema>;
export type Anchor = z.infer<typeof anchorSchema>;
export type ScalarKeyframe = Layer['tracks']['opacity'][number];
export function migrateProject(input: unknown): Project {
  if (
    input &&
    typeof input === 'object' &&
    'schemaVersion' in input &&
    (input.schemaVersion === 1 ||
      input.schemaVersion === 2 ||
      input.schemaVersion === 3 ||
      input.schemaVersion === 4 ||
      input.schemaVersion === 5 ||
      input.schemaVersion === 6 ||
      input.schemaVersion === 7 ||
      input.schemaVersion === 8 ||
      input.schemaVersion === 9 ||
      input.schemaVersion === 10 ||
      input.schemaVersion === 11)
  ) {
    const legacy =
      input.schemaVersion === 11
        ? projectV11Schema.parse(input)
        : input.schemaVersion === 10
          ? projectV10Schema.parse(input)
          : input.schemaVersion === 9
            ? projectV9Schema.parse(input)
            : input.schemaVersion === 8
              ? projectV8Schema.parse(input)
              : input.schemaVersion === 7
                ? projectV7Schema.parse(input)
                : input.schemaVersion === 6
                  ? projectV6Schema.parse(input)
                  : input.schemaVersion === 5
                    ? projectV5Schema.parse(input)
                    : input.schemaVersion === 4
                      ? projectV4Schema.parse(input)
                      : input.schemaVersion === 3
                        ? projectV3Schema.parse(input)
                        : input.schemaVersion === 1
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
export const exportFormatSchema = z.enum(['mp4', 'png', 'webm', 'gif']);
export type ExportFormat = z.infer<typeof exportFormatSchema>;
export const exportFormats: Record<
  ExportFormat,
  { label: string; mime: string; evenDimensions: boolean }
> = {
  mp4: { label: 'MP4 · H.264', mime: 'video/mp4', evenDimensions: true },
  png: {
    label: 'PNG · Current frame',
    mime: 'image/png',
    evenDimensions: false,
  },
  webm: { label: 'WebM · VP9', mime: 'video/webm', evenDimensions: true },
  gif: { label: 'GIF · Animated', mime: 'image/gif', evenDimensions: false },
};
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
  format: exportFormatSchema,
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
