import { z } from 'zod';
export const proposalRequestSchema = z
  .object({
    generationId: z.string().uuid(),
    prompt: z.string().trim().min(3).max(2000),
    project: z.unknown(),
  })
  .strict();
const finite = z.number().finite(),
  color = z.string().regex(/^#[a-fA-F0-9]{6}$/);
const range = { start: finite.min(0).max(60), end: finite.positive().max(60) };
const camera = z
  .object({
    time: finite.min(0).max(60),
    lng: finite.min(-180).max(180),
    lat: finite.min(-85).max(85),
    zoom: finite.min(0).max(14),
    bearing: finite.min(-360).max(360),
    pitch: finite.min(0).max(60),
    easing: z.enum(['linear', 'easeIn', 'easeOut', 'easeInOut']),
  })
  .strict();
const layer = z.discriminatedUnion('type', [
  z
    .object({
      type: z.literal('countryHighlight'),
      name: z.string().min(1).max(100),
      ...range,
      countryCodes: z
        .array(z.string().regex(/^[A-Z]{3}$/))
        .min(1)
        .max(10),
      color,
    })
    .strict(),
  z
    .object({
      type: z.literal('route'),
      name: z.string().min(1).max(100),
      ...range,
      placeIds: z
        .array(z.string().regex(/^ne-\d+$/))
        .min(2)
        .max(10),
      color,
      width: finite.min(1).max(20),
    })
    .strict(),
  z
    .object({
      type: z.literal('marker'),
      name: z.string().min(1).max(100),
      ...range,
      placeId: z.string().regex(/^ne-\d+$/),
      color,
      size: finite.min(4).max(100),
    })
    .strict(),
  z
    .object({
      type: z.literal('text'),
      name: z.string().min(1).max(100),
      ...range,
      text: z.string().min(1).max(500),
      x: finite.min(0).max(1),
      y: finite.min(0).max(1),
      fontSize: finite.min(12).max(150),
      color,
    })
    .strict(),
]);
export const projectProposalSchema = z
  .object({
    version: z.literal(1),
    supported: z.boolean(),
    title: z.string().min(1).max(100),
    summary: z.string().min(1).max(600),
    scenes: z
      .array(
        z
          .object({
            name: z.string().min(1).max(100),
            durationSeconds: finite.min(1).max(60),
            camera: z.array(camera).min(1).max(12),
            layers: z.array(layer).min(1).max(20),
          })
          .strict(),
      )
      .max(5),
  })
  .strict();
export type ProjectProposal = z.infer<typeof projectProposalSchema>;
function structuredSchema(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(structuredSchema);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key === 'oneOf' ? 'anyOf' : key,
        structuredSchema(item),
      ]),
    );
  return value;
}
// Literal-discriminated branches are disjoint; anyOf is equivalent and supported by structured output.
export const projectProposalJsonSchema = structuredSchema(
  z.toJSONSchema(projectProposalSchema, { target: 'draft-7' }),
);
