import { z } from 'zod';
import {
  migrateProject,
  cameraSchema,
  type Project,
  TERRAIN_CREDIT,
} from '@animatemap/project-schema';
export const MAX_AE_SAMPLES = 250000;
const identifier = z.string().min(1).max(200);
const interchangeCameraSchema = cameraSchema.extend({
  targetAltitudeAboveGround: z.number().finite().min(0).max(10000).optional(),
});
export const aeAnchorSampleSchema = z.strictObject({
  id: identifier,
  position: z.tuple([
    z.number().finite().min(-1e8).max(1e8),
    z.number().finite().min(-1e8).max(1e8),
  ]),
  scale: z.number().finite().min(0.01).max(20),
  rotation: z.number().finite(),
  opacity: z.number().finite().min(0).max(1),
  labelHidden: z.boolean(),
});
const frameSchema = z.strictObject({
  index: z.number().int().min(0),
  time: z.number().finite().min(0),
  sceneId: identifier.nullable(),
  camera: interchangeCameraSchema,
  outgoing: z
    .strictObject({
      sceneId: identifier,
      camera: interchangeCameraSchema,
      weight: z.number().min(0).max(1),
    })
    .optional(),
  anchors: z.array(aeAnchorSampleSchema).max(100),
});
export const aeManifestSchema = z
  .strictObject({
    version: z.literal(1),
    kind: z.literal('AnimateMap After Effects interchange'),
    projectId: identifier,
    name: identifier,
    canvas: z.strictObject({
      width: z.number().int().min(320).max(3840),
      height: z.number().int().min(320).max(3840),
      fps: z.union([z.literal(24), z.literal(30), z.literal(60)]),
    }),
    durationSeconds: z.number().finite().positive().max(300),
    projection: z.literal(
      'Baked Web Mercator composition pixels; camera is geographic metadata, not an AE 3D camera',
    ),
    attribution: z.array(z.string().max(2000)).max(100),
    anchors: z
      .array(
        z.strictObject({
          id: identifier,
          sceneId: identifier,
          layerId: identifier,
          name: identifier,
          type: z.enum(['marker', 'text', 'image']),
        }),
      )
      .max(100),
    frames: z.array(frameSchema).min(1).max(18000),
  })
  .superRefine((manifest, ctx) => {
    const ids = new Set(manifest.anchors.map((a) => a.id));
    if (
      ids.size !== manifest.anchors.length ||
      manifest.frames.length * Math.max(1, ids.size) > MAX_AE_SAMPLES
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Duplicate anchors or interchange sample budget exceeded',
      });
    if (
      manifest.frames.length !==
      Math.ceil(manifest.durationSeconds * manifest.canvas.fps)
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Interchange frame count does not match duration/FPS',
      });
    manifest.frames.forEach((frame, index) => {
      if (
        frame.index !== index ||
        Math.abs(frame.time - index / manifest.canvas.fps) > 1e-9
      )
        ctx.addIssue({
          code: 'custom',
          message: 'Interchange frames must be ordered at i/fps',
        });
      if (
        new Set(frame.anchors.map((a) => a.id)).size !== frame.anchors.length ||
        frame.anchors.some((a) => !ids.has(a.id))
      )
        ctx.addIssue({
          code: 'custom',
          message: 'Unknown or duplicate sampled anchor',
        });
    });
    if (
      new TextEncoder().encode(JSON.stringify(manifest)).length >
      32 * 1024 * 1024
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Interchange JSON exceeds 32 MiB',
      });
  });
export type AEAnchorSample = z.infer<typeof aeAnchorSampleSchema>;
export type AEFrame = z.infer<typeof frameSchema>;
export type AEManifest = z.infer<typeof aeManifestSchema>;
export function aeManifestBase(input: Project): Omit<AEManifest, 'frames'> {
  const project = migrateProject(input);
  const anchors = project.scenes.flatMap((scene) =>
    scene.layers.flatMap((layer) =>
      layer.type === 'marker' || layer.type === 'text' || layer.type === 'image'
        ? [
            {
              id: layer.id,
              sceneId: scene.id,
              layerId: layer.id,
              name: layer.name,
              type: layer.type,
            },
          ]
        : [],
    ),
  );
  const count = Math.ceil(project.durationSeconds * project.canvas.fps);
  if (
    anchors.length > 100 ||
    count * Math.max(1, anchors.length) > MAX_AE_SAMPLES
  )
    throw new Error(
      'After Effects interchange exceeds 100 anchors/250000 samples; split the project into shorter sections',
    );
  const attribution = new Set(project.map.attribution);
  if (project.map.terrain)
    attribution.add(`${TERRAIN_CREDIT} · Sa Pa coverage`);
  project.assets.forEach((a) => attribution.add(a.provenance.credit));
  project.modelAssets.forEach((a) => attribution.add(a.provenance.credit));
  project.audioAssets.forEach((a) => attribution.add(a.provenance.credit));
  project.datasets.forEach((d) => attribution.add(d.provenance.credit));
  project.buildingDatasets.forEach((d) =>
    attribution.add(
      `${d.provenance.credit}${d.provenance.surveyYear ? ` · ${d.provenance.surveyYear} survey` : ''}`,
    ),
  );
  project.scenes.forEach((scene) =>
    scene.layers.forEach((layer) => {
      if (layer.type === 'model' && layer.motion.geographySource)
        attribution.add(layer.motion.geographySource.credit);
      if (
        (layer.type === 'marker' || layer.type === 'route') &&
        layer.geographySource
      )
        attribution.add(layer.geographySource.credit);
    }),
  );
  return {
    version: 1,
    kind: 'AnimateMap After Effects interchange',
    projectId: project.id,
    name: project.name,
    canvas: project.canvas,
    durationSeconds: project.durationSeconds,
    projection:
      'Baked Web Mercator composition pixels; camera is geographic metadata, not an AE 3D camera',
    anchors,
    attribution: [...attribution],
  };
}
// JSON data is an escaped object literal, never evaluated input or executable project text.
function scriptLiteral(value: unknown) {
  return JSON.stringify(value).replace(
    /[\u0080-\uffff<>]/g,
    (character) =>
      `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`,
  );
}
export function afterEffectsJSX(input: AEManifest) {
  const manifest = aeManifestSchema.parse(input);
  return `/* AnimateMap Studio: trusted ES3 importer. Host validation remains required.
Import your rendered map footage separately, retain its credits and align its start to 0.
Nulls are baked 2D attachment controls; camera sliders are geographic metadata.
No file/network access, project save, commands or expressions. */
(function () {
  var data = ${scriptLiteral(manifest)};
  if (!app.project) app.newProject();
  app.beginUndoGroup("Import AnimateMap anchors");
  var comp = null;
  try {
    comp = app.project.items.addComp(data.name + " - AnimateMap", data.canvas.width, data.canvas.height, 1, data.frames.length / data.canvas.fps, data.canvas.fps);
    comp.comment = data.projection + "\\n" + data.attribution.join(" | ");
    var times = [], i, j, frame;
    for (i = 0; i < data.frames.length; i++) times.push(data.frames[i].time);
    function keys(property, values, spatial) {
      property.setValuesAtTimes(times, values);
      for (var k = 1; k <= property.numKeys; k++) {
        property.setInterpolationTypeAtKey(k, KeyframeInterpolationType.HOLD, KeyframeInterpolationType.HOLD);
        if (spatial) { property.setSpatialAutoBezierAtKey(k, false); property.setSpatialContinuousAtKey(k, false); }
      }
    }
    var meta = comp.layers.addNull(comp.duration);
    meta.name = "AnimateMap geographic camera (metadata)";
    meta.startTime = 0; meta.inPoint = 0; meta.outPoint = comp.duration;
    meta.comment = "Not an AE 3D camera. Use sampled 2D anchors with the rendered footage.";
    var fields = ["lng", "lat", "zoom", "bearing", "pitch"];
    for (i = 0; i < data.frames.length; i++) if (data.frames[i].camera.targetAltitudeAboveGround !== undefined) { fields.push("targetAltitudeAboveGround"); break; }
    for (j = 0; j < fields.length; j++) {
      var values = [];
      for (i = 0; i < data.frames.length; i++) values.push(data.frames[i].camera[fields[j]] !== undefined ? data.frames[i].camera[fields[j]] : 0);
      var effect = meta.property("ADBE Effect Parade").addProperty("ADBE Slider Control");
      effect.name = "Map " + fields[j];
      keys(effect.property("ADBE Slider Control-0001"), values, false);
    }
    for (j = 0; j < data.anchors.length; j++) {
      var anchor = data.anchors[j], layer = comp.layers.addNull(comp.duration);
      layer.name = anchor.name; layer.comment = anchor.sceneId + " / " + anchor.layerId;
      layer.startTime = 0; layer.inPoint = 0; layer.outPoint = comp.duration; layer.threeDLayer = false;
      var group = layer.property("ADBE Transform Group"), positions = [], scales = [], rotations = [], opacities = [], last = [0, 0];
      group.property("ADBE Anchor Point").setValue([0, 0]);
      for (i = 0; i < data.frames.length; i++) {
        frame = data.frames[i]; var sample = null;
        for (var n = 0; n < frame.anchors.length; n++) if (frame.anchors[n].id === anchor.id) { sample = frame.anchors[n]; break; }
        if (sample) last = sample.position;
        positions.push([last[0], last[1]]);
        scales.push(sample ? [sample.scale * 100, sample.scale * 100] : [100, 100]);
        rotations.push(sample ? sample.rotation : 0); opacities.push(sample ? sample.opacity * 100 : 0);
      }
      keys(group.property("ADBE Position"), positions, true);
      keys(group.property("ADBE Scale"), scales, false);
      keys(group.property("ADBE Rotate Z"), rotations, false);
      keys(group.property("ADBE Opacity"), opacities, false);
    }
    comp.openInViewer();
  } catch (error) {
    if (comp) comp.remove();
    throw error;
  } finally { app.endUndoGroup(); }
}());
`;
}
