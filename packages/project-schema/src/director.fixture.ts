import type { Project } from './index';
import type { DirectorPlan } from './director';
export function directorFixture(project: Project): DirectorPlan {
  return {
    version: 1,
    style: 'paper-collage',
    summary: 'Visual presentation only',
    shots: project.scenes.flatMap((s) => {
      const shots: DirectorPlan['shots'] = [];
      for (let start = 0; start < s.durationSeconds; start += 6)
        shots.push({
          sceneId: s.id,
          start,
          end: Math.min(s.durationSeconds, start + 6),
          framing: 'detail',
          treatment: 'paper-reveal',
          assetIds: [],
          rationale: 'Reveal an existing visual without changing narration',
        });
      return shots;
    }),
  };
}
