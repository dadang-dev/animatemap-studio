import React, { useRef, useLayoutEffect } from 'react';
import {
  AbsoluteFill,
  Img,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { Audio } from '@remotion/media';
import data from '../public/project.json';
import reference from '../public/geo/reference.json';
import { VietnamLocator, merc } from './shared/Geo';
import { CaptionWords } from './shared/CaptionWords';
import { Boat, House, Fish, ease } from './shared/Actors';
import './style.css';
export const Film: React.FC = () => {
  const frame = useCurrentFrame(),
    { fps } = useVideoConfig(),
    t = frame / fps,
    ref = useRef<HTMLDivElement>(null),
    scene =
      data.scenes.find((s) => t >= s.start && t < s.end) ?? data.scenes.at(-1)!,
    local = t - scene.start;
  const scale = 1080 / ((data.map.widthDegrees / 360) * 65536),
    c = merc(data.map.center),
    tx = 540 - c[0] * scale,
    ty = 790 - c[1] * scale,
    transform = `translate(${tx} ${ty}) scale(${scale})`,
    caption = data.captions.find((c) => t >= c.start && t < c.end),
    geo = reference;
  useLayoutEffect(() => {
    let cancelled = false;
    const el = ref.current!;
    Promise.all([
      document.fonts.ready,
      ...[...el.querySelectorAll<HTMLImageElement>('img')].map((i) =>
        i.decode(),
      ),
    ]).then(() => {
      if (cancelled) return;
      const parent = el.getBoundingClientRect(),
        factor = 1080 / parent.width,
        boxes = [...el.querySelectorAll<HTMLElement>('[data-box]')].map((n) => {
          const b = n.getBoundingClientRect();
          return {
            id: n.dataset.box,
            x: (b.x - parent.x) * factor,
            y: (b.y - parent.y) * factor,
            w: b.width * factor,
            h: b.height * factor,
          };
        }),
        cap = el.querySelector<HTMLElement>('.caption-text');
      console.log(
        'PORTABLE_AUDIT ' +
          JSON.stringify({
            frame,
            scene: scene.id,
            image: scene.image ?? null,
            fontReady: document.fonts.check('700 43px Noto', 'Đường Trường Sa'),
            imagesReady: [
              ...el.querySelectorAll<HTMLImageElement>('img'),
            ].every((i) => i.complete && i.naturalWidth > 0),
            mainIslands: el.querySelectorAll('[data-main-islands] path').length,
            locatorIslands: el.querySelectorAll('.vn-locator path').length - 1,
            overflow: boxes.filter(
              (b) =>
                b.x < 25 || b.x + b.w > 1060 || b.y < 0 || b.y + b.h > 1850,
            ),
            captionOverflow: !!cap && cap.scrollWidth > cap.clientWidth + 1,
            active: [...el.querySelectorAll('[data-active="true"]')].map((n) =>
              n.textContent?.trim(),
            ),
            boxes,
          }),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [frame, scene.id]);
  return (
    <AbsoluteFill className="film" ref={ref}>
      <div className="map-space">
        <Img
          src={staticFile('basemap/world.jpg')}
          style={{
            position: 'absolute',
            width: 65536,
            height: 65536,
            transform: `translate(${tx}px,${ty - 270}px) scale(${scale})`,
            transformOrigin: '0 0',
          }}
        />
      </div>
      <svg className="geography" viewBox="0 0 1080 1920">
        <defs>
          <clipPath id="map">
            <rect x="0" y="270" width="1080" height="1240" />
          </clipPath>
        </defs>
        <g clipPath="url(#map)">
          <g transform={transform}>
            {Object.entries(geo.countries).map(([id, path]) => (
              <path
                key={id}
                d={path}
                fill={id === 'VNM' ? '#63b9a940' : 'none'}
                fillRule="evenodd"
                stroke="#d3ebdf"
                strokeWidth={0.6 / scale}
                opacity={id === 'VNM' ? 1 : 0.35}
              />
            ))}
            <g data-main-islands>
              {geo.islands.map((a, i) => (
                <path
                  key={i}
                  d={a.path}
                  fill="#ffcf76"
                  stroke="#ffcf76"
                  strokeWidth={1.4 / scale}
                />
              ))}
            </g>
          </g>
          {geo.archipelagos.map((a) => {
            const q = [tx + a.anchor[0] * scale, ty + a.anchor[1] * scale];
            return (
              <g key={a.name}>
                <circle cx={q[0]} cy={q[1]} r="4" fill="#ffcf76" />
                <text
                  x={q[0] + 10}
                  y={q[1]}
                  fontSize="25"
                  fill="#ffcf76"
                  stroke="#071f2b"
                  strokeWidth="6"
                  paintOrder="stroke"
                >
                  {a.name}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
      <div className="top-shade" />
      <div className="bottom-shade" />
      <div className="eyebrow" data-box="eyebrow">
        {data.title}
      </div>
      <div className="headline" data-box="headline">
        {scene.title}
      </div>
      <VietnamLocator geo={geo} />
      {scene.image && (
        <div className="sample-photo" data-box="photo" key={scene.id}>
          <Img
            key={scene.image}
            src={staticFile(scene.image)}
            style={{
              width: 960,
              height: 340,
              objectFit: 'cover',
              transform: `scale(${1 + 0.02 * ease(local / 2)})`,
            }}
          />
          <b>{scene.photoLabel}</b>
        </div>
      )}
      <svg className="actors" viewBox="0 0 1080 1920">
        {scene.action === 'boat' && (
          <Boat x={200 + 600 * ease(local / 2)} y={1250} p={local} />
        )}{' '}
        {scene.action === 'house' && (
          <House x={540} y={880} p={ease(local / 0.7) * 1.6} />
        )}{' '}
        {scene.action === 'fish' && (
          <Fish x={200 + 600 * ease(local / 2)} y={850} scale={2} />
        )}
      </svg>
      {caption && (
        <div className="caption" data-box="caption">
          <div className="caption-text">
            <CaptionWords
              words={caption.words}
              time={t}
              protectedNames={data.protectedNames}
            />
          </div>
        </div>
      )}
      <div className="source" data-box="source">
        {data.credits}
        <small>
          Mẫu kiểm kỹ thuật · hình và âm thử tự tạo · không phải lời đọc
        </small>
      </div>
      <Sequence
        from={0}
        durationInFrames={Math.ceil(data.duration * fps)}
        premountFor={fps}
      >
        <Audio src={staticFile(data.audio)} premountFor={fps} />
      </Sequence>
    </AbsoluteFill>
  );
};
