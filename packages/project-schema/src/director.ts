import { z } from 'zod';
import type { Project } from './index';

export const directorPlanSchema = z
  .object({
    version: z.literal(1),
    summary: z.string().min(1).max(600),
    style: z.enum(['map-editorial', 'paper-collage']),
    shots: z
      .array(
        z
          .object({
            sceneId: z.string().min(1).max(100),
            start: z.number().finite().min(0),
            end: z.number().finite().positive(),
            framing: z.enum(['wide', 'detail', 'action']),
            treatment: z.enum([
              'hold',
              'paper-reveal',
              'push-in',
              'action-focus',
            ]),
            assetIds: z.array(z.string().max(100)).max(8),
            rationale: z.string().min(1).max(240),
          })
          .strict(),
      )
      .min(1)
      .max(96),
  })
  .strict();
export type DirectorPlan = z.infer<typeof directorPlanSchema>;
export const directorPlanJsonSchema = z.toJSONSchema(directorPlanSchema);

/** Plans can change presentation only. They contain no code, rewritten narration or new media URLs. */
export function validateDirectorPlan(
  value: unknown,
  project: Project,
): DirectorPlan {
  const plan = directorPlanSchema.parse(value);
  const assets = new Set(project.assets.map((a) => a.id));
  for (const shot of plan.shots) {
    const scene = project.scenes.find((s) => s.id === shot.sceneId);
    if (
      !scene ||
      shot.end <= shot.start ||
      shot.end > scene.durationSeconds + 1e-6 ||
      shot.end - shot.start > 7 + 1e-6
    )
      throw new Error('Invalid director shot bounds or unknown scene');
    if (shot.assetIds.some((id) => !assets.has(id)))
      throw new Error('Director referenced an unknown asset');
  }
  for (const scene of project.scenes) {
    const shots = plan.shots.filter((s) => s.sceneId === scene.id);
    let end = 0;
    for (const shot of shots) {
      if (Math.abs(shot.start - end) > 1e-6)
        throw new Error(
          'Director shots must be ordered, contiguous and non-overlapping',
        );
      end = shot.end;
    }
    if (Math.abs(end - scene.durationSeconds) > 1e-6)
      throw new Error(
        'Director must cover every scene without changing its duration',
      );
  }
  const ordered = plan.shots.map((s) =>
    project.scenes.findIndex((scene) => scene.id === s.sceneId),
  );
  if (ordered.some((n, i) => i > 0 && n < ordered[i - 1]!))
    throw new Error('Director cannot reorder scenes');
  return plan;
}

export function directorContext(project: Project) {
  return {
    canvas: project.canvas,
    durationSeconds: project.durationSeconds,
    scenes: project.scenes.map((s) => ({
      id: s.id,
      name: s.name,
      durationSeconds: s.durationSeconds,
      layers: s.layers.map((l) => ({
        id: l.id,
        name: l.name,
        type: l.type,
        start: l.timeRange.start,
        end: l.timeRange.end,
      })),
      // Existing captions are context only; the output contract cannot replace them.
      narration: project.captions.cues
        .filter(
          (c) =>
            c.startSeconds < s.startSeconds + s.durationSeconds &&
            c.endSeconds > s.startSeconds,
        )
        .map((c) => c.text)
        .join(' '),
    })),
    assets: project.assets.map((a) => ({
      id: a.id,
      name: a.name,
      license: a.provenance.license,
    })),
  };
}
