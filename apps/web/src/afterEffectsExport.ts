import { MapRenderer, type Countries } from '@animatemap/map-engine';
import {
  evaluateProjectAt,
  aeManifestBase,
  aeManifestSchema,
  type AEFrame,
  type AEManifest,
} from '@animatemap/animation-core';
import { migrateProject, type Project } from '@animatemap/project-schema';
export async function sampleAfterEffects(
  input: Project,
  countries: Countries,
  signal: AbortSignal,
  onProgress: (progress: number) => void,
): Promise<AEManifest> {
  const project = migrateProject(input),
    base = aeManifestBase(project);
  const host = document.createElement('div');
  host.dataset.interchangeRenderer = 'true';
  host.setAttribute('aria-hidden', 'true');
  Object.assign(host.style, {
    position: 'fixed',
    left: '-100000px',
    top: '0',
    width: `${project.canvas.width}px`,
    height: `${project.canvas.height}px`,
    pointerEvents: 'none',
    overflow: 'hidden',
  });
  let renderer: MapRenderer | null = null,
    disposed = false;
  const dispose = () => {
    if (!disposed) {
      disposed = true;
      renderer?.destroy();
      host.remove();
    }
  };
  signal.addEventListener('abort', dispose, { once: true });
  const timeout = setTimeout(dispose, 600000);
  try {
    signal.throwIfAborted();
    document.body.append(host);
    const initial = evaluateProjectAt(project, 0);
    renderer = new MapRenderer(host, countries, initial.camera);
    await renderer.ready();
    const frames: AEFrame[] = [],
      count = Math.ceil(project.durationSeconds * project.canvas.fps);
    for (let index = 0; index < count; index++) {
      signal.throwIfAborted();
      if (disposed)
        throw new Error(
          'After Effects sampling exceeded its ten-minute deadline; split the project',
        );
      const state = evaluateProjectAt(project, index / project.canvas.fps);
      renderer.apply(
        project,
        state.camera,
        state.layers,
        true,
        state.blend,
        state.captions,
      );
      await renderer.ready();
      signal.throwIfAborted();
      frames.push({
        index,
        time: index / project.canvas.fps,
        sceneId: state.sceneId,
        camera: state.camera,
        ...(state.blend
          ? {
              outgoing: {
                sceneId: state.blend.outgoing.sceneId,
                camera: state.blend.outgoing.camera,
                weight: 1 - state.blend.incomingWeight,
              },
            }
          : {}),
        anchors: renderer.anchorSamples(),
      });
      onProgress((index + 1) / count);
    }
    return aeManifestSchema.parse({ ...base, frames });
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener('abort', dispose);
    dispose();
  }
}
export function downloadInterchange(
  content: string,
  name: string,
  mime: string,
) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
