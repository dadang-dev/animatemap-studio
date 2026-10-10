import { evaluateProjectAt } from '@animatemap/animation-core';
import type { Camera, Project } from '@animatemap/project-schema';

export type Scene = Project['scenes'][number];
export type SceneOperation =
  | { type: 'add'; camera: Camera }
  | { type: 'duplicate'; id: string }
  | { type: 'delete'; id: string }
  | { type: 'move'; id: string; direction: -1 | 1 }
  | { type: 'resize'; id: string; duration: number };

function reflow(project: Project) {
  let start = 0;
  for (const scene of project.scenes) {
    scene.startSeconds = start;
    start += scene.durationSeconds;
  }
  project.durationSeconds = start;
  if (start > 300)
    throw new Error('Project duration cannot exceed 300 seconds');
}

/** Mutates only a transaction clone; returns the scene to focus. */
export function applySceneOperation(
  project: Project,
  operation: SceneOperation,
  newId: () => string = () => crypto.randomUUID(),
): string {
  if (operation.type === 'add') {
    if (project.scenes.length >= 20) throw new Error('Maximum 20 scenes');
    const remaining =
      300 -
      project.scenes.reduce((sum, scene) => sum + scene.durationSeconds, 0);
    if (remaining < 1)
      throw new Error('Not enough time for another scene (300-second limit)');
    const scene: Scene = {
      id: newId(),
      name: `Scene ${project.scenes.length + 1}`,
      startSeconds: 0,
      durationSeconds: Math.min(5, remaining),
      camera: {
        keyframes: [
          { time: 0, value: { ...operation.camera }, easing: 'linear' },
        ],
      },
      layers: [],
    };
    project.scenes.push(scene);
    reflow(project);
    return scene.id;
  }
  const index = project.scenes.findIndex((scene) => scene.id === operation.id);
  if (index < 0) throw new Error('Scene not found');
  const scene = project.scenes[index]!;
  let focus = scene.id;
  if (operation.type === 'duplicate') {
    if (project.scenes.length >= 20) throw new Error('Maximum 20 scenes');
    const copy = structuredClone(scene);
    copy.id = newId();
    copy.name = `${scene.name.slice(0, 195)} copy`;
    for (const layer of copy.layers) layer.id = newId();
    project.scenes.splice(index + 1, 0, copy);
    focus = copy.id;
  } else if (operation.type === 'delete') {
    if (project.scenes.length === 1) throw new Error('Keep at least one scene');
    project.scenes.splice(index, 1);
    focus = project.scenes[Math.min(index, project.scenes.length - 1)]!.id;
  } else if (operation.type === 'move') {
    const target = index + operation.direction;
    if (target < 0 || target >= project.scenes.length) return focus;
    [project.scenes[index], project.scenes[target]] = [
      project.scenes[target]!,
      scene,
    ];
  } else {
    const duration = operation.duration;
    if (!Number.isFinite(duration) || duration < 1 || duration > 300)
      throw new Error('Scene duration must be between 1 and 300 seconds');
    const oldDuration = scene.durationSeconds;
    // Only used if a valid imported scene has no key before the new end.
    const camera = evaluateProjectAt(
      project,
      scene.startSeconds + duration,
    ).camera;
    scene.durationSeconds = duration;
    scene.camera.keyframes = scene.camera.keyframes.filter(
      (key) => key.time <= duration,
    );
    if (!scene.camera.keyframes.length)
      scene.camera.keyframes = [{ time: 0, value: camera, easing: 'linear' }];
    for (const layer of scene.layers) {
      layer.timeRange.start = Math.min(
        layer.timeRange.start,
        duration - 1 / project.canvas.fps,
      );
      layer.timeRange.end =
        layer.timeRange.end === oldDuration
          ? duration
          : Math.min(layer.timeRange.end, duration);
      layer.tracks.opacity = layer.tracks.opacity.filter(
        (key) => key.time <= duration,
      );
      layer.tracks.reveal = layer.tracks.reveal.filter(
        (key) => key.time <= duration,
      );
    }
  }
  reflow(project);
  return focus;
}
