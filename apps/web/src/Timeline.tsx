import { useState, useEffect } from 'react';
import { useEditor } from './store';
import { evaluateProjectAt } from '@animatemap/animation-core';
import {
  propertiesForLayer,
  scalarLimits,
  type ScalarProperty,
  type Easing,
  type Project,
} from '@animatemap/project-schema';
export function Timeline() {
  const s = useEditor();
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if (
        (event.target as HTMLElement).closest(
          'input,textarea,select,[contenteditable]',
        )
      )
        return;
      if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        setZoom((v) => Math.min(4, v + 0.25));
      }
      if (event.key === '-') {
        event.preventDefault();
        setZoom((v) => Math.max(1, v - 0.25));
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, []);
  const [snap, setSnap] = useState(true);
  const [height, setHeight] = useState(270);
  const [property, setProperty] = useState<'camera' | ScalarProperty>('camera');
  const [keyTime, setKeyTime] = useState<number | null>(null);
  const [keyScope, setKeyScope] = useState('');
  const scene =
    s.project.scenes.find(
      (v) => v.id === evaluateProjectAt(s.project, s.time).sceneId,
    ) ?? s.project.scenes[0]!;
  const layer = scene.layers.find((l) => l.id === s.selected);
  const keys =
    property === 'camera'
      ? scene.camera.keyframes
      : (layer?.tracks[property] ?? []);
  const scope = `${scene.id}/${property === 'camera' ? 'camera' : s.selected}/${property}`;
  const key =
    scope === keyScope ? keys.find((k) => k.time === keyTime) : undefined;
  useEffect(() => {
    if (
      property !== 'camera' &&
      layer &&
      !propertiesForLayer(layer).includes(property)
    ) {
      setProperty('opacity');
      setKeyTime(null);
    }
  }, [property, layer]);
  function seekKey(time: number) {
    const end = scene.startSeconds + scene.durationSeconds;
    const global = time + scene.startSeconds;
    // Keep endpoint keys editable in their own scene. At an internal cut,
    // preview the final visible frame; ordinary seeking still selects the next scene.
    s.seek(
      global === end && end < s.project.durationSeconds
        ? Math.max(scene.startSeconds, end - 1 / s.project.canvas.fps)
        : global,
    );
  }
  function editKey(
    change: (
      keys:
        | typeof scene.camera.keyframes
        | NonNullable<typeof layer>['tracks']['opacity'],
    ) => void,
  ) {
    s.edit((p) => {
      const target = p.scenes.find((v) => v.id === scene.id)!;
      if (property === 'camera') change(target.camera.keyframes);
      else {
        const l = target.layers.find((l) => l.id === s.selected);
        if (l && !l.locked) change(l.tracks[property]);
      }
    });
  }
  function move(time: number) {
    const value = snap
      ? Math.round(time * s.project.canvas.fps) / s.project.canvas.fps
      : time;
    editKey((k) => {
      const target = k.find((v) => v.time === keyTime);
      if (target) target.time = value;
      k.sort((a, b) => a.time - b.time);
    });
    setKeyTime(value);
  }
  function addScalar() {
    if (!layer) return;
    editKey((keys) => {
      const time = s.time - scene.startSeconds;
      if (!keys.some((k) => k.time === time)) {
        (
          keys as Project['scenes'][number]['layers'][number]['tracks']['opacity']
        ).push({
          time,
          value:
            property === 'camera' ||
            property === 'opacity' ||
            property === 'reveal'
              ? 1
              : evaluateProjectAt(s.project, s.time).layers.find(
                  (item) => item.id === layer.id,
                )!.transform[property],
          easing: 'linear',
        });
        keys.sort((a, b) => a.time - b.time);
      }
    });
  }
  return (
    <section className="timeline" style={{ height }}>
      <div className="timeline-toolbar">
        <button
          aria-label={s.playing ? 'Pause' : 'Play'}
          onClick={() => {
            if (s.time === s.project.durationSeconds) s.seek(0);
            useEditor.setState({ playing: !s.playing });
          }}
        >
          {s.playing ? 'Ⅱ' : '▶'}
        </button>
        <strong>{s.time.toFixed(3)}s</strong>
        <span className="muted">/ {s.project.durationSeconds}s</span>
        <input
          aria-label="Playhead"
          type="range"
          min={0}
          max={s.project.durationSeconds}
          step={1 / s.project.canvas.fps}
          value={s.time}
          onChange={(e) => {
            useEditor.setState({ playing: false });
            s.seek(Number(e.target.value));
          }}
        />
        <label className="check">
          <input
            type="checkbox"
            checked={snap}
            onChange={(e) => setSnap(e.target.checked)}
          />
          Snap
        </label>
        <label className="compact">
          Zoom
          <input
            aria-label="Timeline zoom"
            type="range"
            min="1"
            max="4"
            step="0.25"
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
        </label>
        <label className="compact">
          Height
          <input
            aria-label="Timeline height"
            type="range"
            min="170"
            max="440"
            value={height}
            onChange={(e) => setHeight(Number(e.target.value))}
          />
        </label>
      </div>
      <div className="timeline-scroll">
        <div style={{ width: `${zoom * 100}%` }}>
          <div className="timeline-ruler">
            <span>TRACKS</span>
            {Array.from({ length: 7 }, (_, i) => (
              <span key={i}>
                {((i * s.project.durationSeconds) / 6).toFixed(1)}s
              </span>
            ))}
          </div>
          <div className="track">
            <span>Scenes</span>
            <div className="track-body scene-track">
              {s.project.scenes.map((item, index) => (
                <button
                  key={item.id}
                  className={`scene-clip ${item.id === scene.id ? 'active' : ''}`}
                  aria-label={`Jump to scene ${index + 1}: ${item.name}`}
                  aria-pressed={item.id === scene.id}
                  title={`${item.name} · ${item.startSeconds.toFixed(2)}–${(item.startSeconds + item.durationSeconds).toFixed(2)}s · ${item.transition.type}`}
                  style={{
                    left: `${(item.startSeconds / s.project.durationSeconds) * 100}%`,
                    width: `${(item.durationSeconds / s.project.durationSeconds) * 100}%`,
                  }}
                  onClick={() => {
                    setKeyTime(null);
                    s.selectScene(item.id);
                  }}
                >
                  {index + 1} · {item.name}
                  {item.transition.type === 'crossfade' ? ' ◐' : ''}
                </button>
              ))}
            </div>
          </div>
          <div className="track">
            <span>◈ Camera</span>
            <div
              className="track-body"
              onClick={(e) => {
                const box = e.currentTarget.getBoundingClientRect();
                s.seek(
                  ((e.clientX - box.left) / box.width) *
                    s.project.durationSeconds,
                );
              }}
            >
              {scene.camera.keyframes.map((k) => (
                <button
                  title={`Camera keyframe ${k.time}s`}
                  aria-label={`Camera keyframe ${k.time}`}
                  className="keyframe"
                  key={k.time}
                  style={{
                    left: `${((k.time + scene.startSeconds) / s.project.durationSeconds) * 100}%`,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setProperty('camera');
                    setKeyTime(k.time);
                    setKeyScope(`${scene.id}/camera/camera`);
                    seekKey(k.time);
                  }}
                />
              ))}
            </div>
          </div>
          {scene.layers.map((l) => (
            <div className="track" key={l.id}>
              <button
                className="track-name"
                onClick={() => useEditor.setState({ selected: l.id })}
              >
                {l.name}
              </button>
              <div className="track-body">
                <div
                  className="clip"
                  style={{
                    position: 'absolute',
                    left: `${((scene.startSeconds + l.timeRange.start) / s.project.durationSeconds) * 100}%`,
                    width: `${((l.timeRange.end - l.timeRange.start) / s.project.durationSeconds) * 100}%`,
                    background: `${l.style.color}35`,
                    borderColor: l.style.color,
                  }}
                >
                  {l.type}
                </div>
                {propertiesForLayer(l).flatMap((prop) =>
                  l.tracks[prop].map((k) => (
                    <button
                      key={`${prop}-${k.time}`}
                      className="keyframe"
                      title={`${prop} ${k.time}s`}
                      aria-label={`${l.name} ${prop} keyframe ${k.time}`}
                      style={{
                        left: `${((k.time + scene.startSeconds) / s.project.durationSeconds) * 100}%`,
                      }}
                      onClick={() => {
                        useEditor.setState({ selected: l.id });
                        setProperty(prop);
                        setKeyTime(k.time);
                        setKeyScope(`${scene.id}/${l.id}/${prop}`);
                        seekKey(k.time);
                      }}
                    />
                  )),
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="key-editor">
        <select
          aria-label="Keyframe property"
          value={property}
          onChange={(e) => {
            setProperty(e.target.value as typeof property);
            setKeyTime(null);
          }}
        >
          <option value="camera">Camera</option>
          {(layer ? propertiesForLayer(layer) : (['opacity'] as const)).map(
            (prop) => (
              <option key={prop} value={prop}>
                {prop === 'reveal' ? 'Route reveal' : `Layer ${prop}`}
              </option>
            ),
          )}
        </select>
        <button
          onClick={() =>
            property === 'camera' ? s.addCameraKey() : addScalar()
          }
        >
          Add keyframe
        </button>
        {key && (
          <>
            <input
              aria-label="Keyframe time"
              type="number"
              min="0"
              max={scene.durationSeconds}
              step={1 / s.project.canvas.fps}
              value={key.time}
              onChange={(e) => move(Number(e.target.value))}
            />
            {typeof key.value === 'number' && (
              <input
                aria-label="Keyframe value"
                type="number"
                min={property === 'camera' ? 0 : scalarLimits[property][0]}
                max={property === 'camera' ? 1 : scalarLimits[property][1]}
                step="0.1"
                value={key.value}
                onChange={(e) =>
                  editKey((keys) => {
                    const k = keys.find((v) => v.time === keyTime);
                    if (k && typeof k.value === 'number')
                      k.value = Number(e.target.value);
                  })
                }
              />
            )}
            <select
              aria-label="Keyframe easing"
              value={key.easing}
              onChange={(e) =>
                editKey((keys) => {
                  const k = keys.find((v) => v.time === keyTime);
                  if (k) k.easing = e.target.value as Easing;
                })
              }
            >
              {['linear', 'easeIn', 'easeOut', 'easeInOut'].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
            <button
              onClick={() =>
                editKey((keys) => {
                  const k = keys.find((v) => v.time === keyTime);
                  if (k) {
                    keys.push({
                      ...structuredClone(k),
                      time: Math.min(scene.durationSeconds, k.time + 1),
                    } as never);
                    keys.sort((a, b) => a.time - b.time);
                  }
                })
              }
            >
              Copy keyframe
            </button>
            <button
              onClick={() => {
                editKey((keys) => {
                  if (property !== 'camera' || keys.length > 1) {
                    const i = keys.findIndex((v) => v.time === keyTime);
                    if (i >= 0) keys.splice(i, 1);
                  }
                });
                setKeyTime(null);
              }}
            >
              Delete keyframe
            </button>
          </>
        )}
      </div>
    </section>
  );
}
