import React from 'react';
import { Img, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { ease } from './Actors';
export type Photo = {
  id: string;
  src: string;
  label: string;
  note: string;
  credit: string;
  objectPosition?: string;
};
export type PhotoWindow = { start: number; end: number; ids: string[] };
export const photoAt = (timeline: PhotoWindow[], time: number) =>
  timeline.find((p) => time >= p.start && time < p.end);
const cameraWindows = (timeline: PhotoWindow[]) =>
  timeline.reduce(
    (a, p) => {
      const last = a.at(-1);
      if (last && p.start <= last.end + 0.03)
        last.end = Math.max(last.end, p.end);
      else a.push({ start: p.start, end: p.end });
      return a;
    },
    [] as { start: number; end: number }[],
  );
export const photoCameraWeight = (timeline: PhotoWindow[], time: number) =>
  Math.max(
    0,
    ...cameraWindows(timeline).map(
      (p) =>
        ease((time - p.start + 0.9) / 0.9) * ease((p.end + 0.9 - time) / 0.9),
    ),
  );
export const PhotoSequence: React.FC<{
  compact: boolean;
  manifest: Photo[];
  timeline: PhotoWindow[];
}> = ({ compact, manifest, timeline }) => {
  const frame = useCurrentFrame(),
    { fps } = useVideoConfig(),
    time = frame / fps,
    entry = photoAt(timeline, time);
  if (!entry) return null;
  const progress = ease(
      (time - entry.start) / Math.max(0.5, entry.end - entry.start),
    ),
    reveal = ease((time - entry.start) / 0.35),
    multi = entry.ids.length > 1;
  return (
    <div
      className={
        'photo-stage ' +
        (compact ? 'compact' : 'large') +
        (multi ? ' multi' : '')
      }
      data-box="photo-stage"
      data-photo-entry={entry.start}
      style={{
        opacity: reveal,
        transform: `translateY(${(1 - reveal) * 16}px)`,
      }}
    >
      {entry.ids.map((id, index) => {
        const p = manifest.find((p) => p.id === id)!;
        return (
          <div
            className="photo-cell"
            key={entry.start + '-' + id}
            data-photo-id={id}
          >
            <div className="photo-image">
              <Img
                key={entry.start + '-' + id + '-image'}
                src={staticFile(p.src)}
                data-photo-image={id}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: p.objectPosition ?? 'center',
                  transform: `scale(${1 + progress * 0.045}) translateX(${multi ? 0 : (index % 2 ? 1 : -1) * progress * 4}px)`,
                }}
              />
            </div>
            <div className="photo-badge">ẢNH THỰC TẾ</div>
            <div className="photo-caption">
              <b>{p.label}</b>
              {!multi && <span>{p.note}</span>}
              <small>{p.credit} · Wikimedia Commons</small>
            </div>
          </div>
        );
      })}
    </div>
  );
};
