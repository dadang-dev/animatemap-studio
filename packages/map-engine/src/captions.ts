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
  cues.forEach((cue, cueIndex) => {
    if (cueIndex) box.append(document.createTextNode('\n'));
    if (!style.wordHighlight || !cue.words) {
      box.append(document.createTextNode(cue.text));
      return;
    }
    let cursor = 0;
    cue.words.forEach((word, index) => {
      const escape = (text: string) =>
        text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const match = new RegExp(
        word.text.split(/\s+/).map(escape).join('\\s+'),
        'u',
      ).exec(cue.text.slice(cursor));
      if (!match) return;
      box.append(
        document.createTextNode(cue.text.slice(cursor, cursor + match.index)),
      );
      const span = document.createElement('span');
      span.textContent = match[0];
      span.dataset.captionWord = String(index);
      const active = cue.activeWordIndex === index;
      span.dataset.active = String(active);
      Object.assign(span.style, {
        color: active ? '#08141f' : style.color,
        backgroundColor: active
          ? (style.highlightColor ?? '#ffe16b')
          : 'transparent',
        borderRadius: `${5 * ratio}px`,
        padding: `0 ${3 * ratio}px`,
      });
      box.append(span);
      cursor += match.index + match[0].length;
    });
    box.append(document.createTextNode(cue.text.slice(cursor)));
  });
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
