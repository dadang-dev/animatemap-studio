import { validateDirectorPlan, type Project } from '@animatemap/project-schema';

/** HTML is template-owned; Codex may select typed treatments, never supply executable markup. */
export function directorComposition(
  project: Project,
  value: unknown,
  from = 0,
  duration = project.durationSeconds - from,
) {
  const plan = validateDirectorPlan(value, project);
  if (
    !Number.isFinite(from) ||
    !Number.isFinite(duration) ||
    from < 0 ||
    duration <= 0 ||
    from + duration > project.durationSeconds + 1e-6
  )
    throw new Error('Composition range must stay within the source project');
  const { width, height } = project.canvas;
  const shots = plan.shots
    .map((shot) => ({
      ...shot,
      absolute:
        project.scenes.find((s) => s.id === shot.sceneId)!.startSeconds +
        shot.start,
    }))
    .filter(
      (s) =>
        s.treatment !== 'hold' &&
        s.absolute < from + duration &&
        s.absolute + s.end - s.start > from,
    );
  const panels = shots.map((s, i) => {
    const start = Math.max(0, s.absolute - from),
      end = Math.min(duration, s.absolute + s.end - s.start - from);
    return `<div class="clip panel" data-start="${start}" data-duration="${end - start}"><div id="paper-${i}" class="paper"><div class="crop"><video id="detail-${i}" class="clip" src="source.mp4" muted playsinline data-start="${start}" data-duration="${end - start}" data-media-start="${from + start}" data-track-index="${i + 1}"></video></div></div></div>`;
  });
  // Media timing belongs on video, never on a timed ancestor. Panel windows are controlled by GSAP children.
  const correctedPanels = panels.map((html) =>
    html.replace(
      /class="clip panel" data-start="[^"]+" data-duration="[^"]+"/,
      'class="panel"',
    ),
  );
  const tweens = shots.map((s, i) => {
    const start = Math.max(0, s.absolute - from),
      length = Math.min(duration, s.absolute + s.end - s.start - from) - start;
    const fade = Math.min(0.3, length / 4);
    return `tl.fromTo('#paper-${i}',{opacity:0,y:52,rotation:-2},{opacity:1,y:0,rotation:0,duration:${fade},ease:'power2.out'},${start});tl.to('#paper-${i}',{opacity:0,y:-14,duration:${fade},ease:'power1.in'},${start + length - fade});`;
  });
  return `<!doctype html><html lang="vi"><head><meta charset="UTF-8"><meta name="viewport" content="width=${width}, height=${height}"><title>AnimateMap · local director preview</title><script src="gsap.min.js"></script><style>
html,body{margin:0;width:100%;height:100%;background:#101e2d;overflow:hidden}#root{position:relative;width:100%;height:100%;overflow:hidden}#source{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}.panel{position:absolute;left:6%;top:29%;width:88%;height:37%;pointer-events:none}.paper{position:relative;width:100%;height:100%;box-sizing:border-box;padding:14px;background:#fff8e5;box-shadow:0 18px 48px #0009;opacity:0;clip-path:polygon(0 2%,3% 0,17% 1%,26% 0,42% 1%,58% 0,77% 1%,98% 0,100% 4%,99% 28%,100% 51%,99% 79%,100% 98%,97% 100%,74% 99%,51% 100%,27% 99%,2% 100%,0 97%,1% 70%,0 48%,1% 21%)}.crop{width:100%;height:100%;overflow:hidden;background:#101e2d;position:relative}.crop video{position:absolute;width:${width}px;height:${height}px;left:-${width * 0.06}px;top:-${height * 0.31}px;max-width:none;object-fit:contain}
</style></head><body><div id="root" data-composition-id="animatemap" data-width="${width}" data-height="${height}" data-duration="${duration}"><video id="source" class="clip" src="source.mp4" playsinline data-has-audio="true" data-start="0" data-duration="${duration}" data-media-start="${from}" data-track-index="0"></video>${correctedPanels.join('')}</div><script>const tl=gsap.timeline({paused:true});${tweens.join('')}tl.to({}, {duration:${duration}},0);window.__timelines=window.__timelines||{};window.__timelines.animatemap=tl;</script></body></html>`;
}
