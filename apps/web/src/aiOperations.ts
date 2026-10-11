import { migrateProject, type Project } from '@animatemap/project-schema';
import { useEditor } from './store';
export function lockedProject(project: Project) {
  return (
    project.scenes.some((scene) =>
      scene.layers.some((layer) => layer.locked),
    ) ||
    project.audioTracks.some((track) => track.locked) ||
    project.captions.cues.some((cue) => cue.locked)
  );
}
export function applyReviewedProposal(project: unknown, base: string) {
  const editor = useEditor.getState();
  if (JSON.stringify(editor.project) !== base)
    throw new Error(
      'The project changed during review; generate again before applying',
    );
  if (lockedProject(editor.project))
    throw new Error(
      'Unlock existing layers/audio/captions before replacing the project',
    );
  const parsed = migrateProject(project);
  editor.applyTemplate(parsed);
  if (useEditor.getState().error) throw new Error(useEditor.getState().error);
}
