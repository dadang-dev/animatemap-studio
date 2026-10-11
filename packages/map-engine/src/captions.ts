import type { CaptionCue, Project } from '@animatemap/project-schema';

/** Global captions are outside both scene planes and retain project-pixel dimensions. */
export function drawCaptions(
  host: HTMLElement,
  project: Project,
  cues: CaptionCue[],
) {
  host.replaceChildren();
  if (!cues.length) return;
  const ratio = host.clientWidth / project.canvas.width,
    style = project.captions.style;
  const box = document.createElement('div');
  box.className = 'project-captions';
  box.textContent = cues.map((cue) => cue.text).join('\n');
  Object.assign(box.style, {
    position: 'absolute',
    left: `${Math.round((style.x - style.width / 2) * host.clientWidth)}px`,
    top: '0',
    width: `${Math.round(style.width * host.clientWidth)}px`,
    boxSizing: 'border-box',
    padding: `${12 * ratio}px ${20 * ratio}px`,
    font: `400 ${style.fontSize * ratio}px/1.35 "Noto Sans"`,
    textAlign: 'center',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
    color: style.color,
    backgroundColor: style.background,
  });
  host.append(box);
  box.style.top = `${Math.round(style.y * host.clientHeight - box.offsetHeight / 2)}px`;
}
