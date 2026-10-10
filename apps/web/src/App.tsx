import { useState, useRef } from 'react';
import {
  createDemo,
  type Camera,
  type Project,
} from '@animatemap/project-schema';
import { MapSurface } from './MapSurface';
import type { MapRenderer } from '@animatemap/map-engine';
import {
  Layers,
  MapPin,
  Route,
  Type,
  Globe2,
  Undo2,
  Redo2,
  Download,
  SlidersHorizontal,
  Plus,
  Play,
} from 'lucide-react';
declare global {
  interface Window {
    studio?: { renderer: MapRenderer; getProject: () => Project };
  }
}
export function App() {
  const [project, setProject] = useState(createDemo);
  const current = useRef(project);
  current.current = project;
  const [camera, setCamera] = useState<Camera>(
    project.scenes[0]!.camera.keyframes[0]!.value,
  );
  const [selected, setSelected] = useState('highlight-vn');
  const [country, setCountry] = useState('VNM');
  const [leftWidth, setLeftWidth] = useState(240);
  const [rightWidth, setRightWidth] = useState(260);
  const layer = project.scenes[0]!.layers.find((l) => l.id === selected);
  function color(value: string) {
    setProject((p) => {
      const next = structuredClone(p);
      const l = next.scenes[0]!.layers.find((l) => l.id === selected);
      if (l) l.style.color = value;
      return next;
    });
  }
  return (
    <div className="studio">
      <header className="topbar">
        <div className="brand">
          <Globe2 size={24} />
          <h1>
            AnimateMap <span>Studio</span>
          </h1>
        </div>
        <div className="project-title">
          {project.name}
          <span className="badge">LOCAL</span>
        </div>
        <button title="Undo (Phase 3)" disabled>
          <Undo2 size={17} />
        </button>
        <button title="Redo (Phase 3)" disabled>
          <Redo2 size={17} />
        </button>
        <span className="spec">1920 × 1080 · 30 FPS</span>
        <button
          className="primary"
          disabled
          title="Available after export pipeline validation"
        >
          <Download size={16} /> Export
        </button>
      </header>
      <div
        className="workspace"
        style={{
          gridTemplateColumns: `${leftWidth}px minmax(440px,1fr) ${rightWidth}px`,
        }}
      >
        <aside className="left-panel panel">
          <div className="panel-heading">
            PROJECT <SlidersHorizontal size={14} />
          </div>
          <label className="field">
            Map style
            <select
              aria-label="Map style"
              value={project.map.styleId}
              onChange={(e) =>
                setProject({
                  ...project,
                  map: {
                    ...project.map,
                    styleId: e.target.value as Project['map']['styleId'],
                  },
                })
              }
            >
              <option value="dark">Midnight</option>
              <option value="light">Daylight</option>
              <option value="muted">Slate</option>
            </select>
          </label>
          <div className="panel-heading">
            SCENES <Plus size={14} />
          </div>
          <div className="scene-card">
            <span className="scene-thumb">
              <Globe2 />
            </span>
            <div>
              Opening<small>12.00 seconds</small>
            </div>
            <span className="badge">01</span>
          </div>
          <div className="panel-heading">
            LAYERS <Layers size={14} />
          </div>
          <div className="layer-list">
            {project.scenes[0]!.layers.map((l) => (
              <button
                key={l.id}
                className={`layer-row ${selected === l.id ? 'selected' : ''}`}
                onClick={() => setSelected(l.id)}
              >
                {l.type === 'route' ? (
                  <Route size={16} />
                ) : l.type === 'text' ? (
                  <Type size={16} />
                ) : l.type === 'marker' ? (
                  <MapPin size={16} />
                ) : (
                  <Globe2 size={16} />
                )}
                <span>{l.name}</span>
                <i style={{ background: l.style.color }} />
              </button>
            ))}
          </div>
          <div className="panel-foot">
            <label className="field">
              Panel width
              <input
                aria-label="Layers panel width"
                type="range"
                min="210"
                max="350"
                value={leftWidth}
                onChange={(e) => setLeftWidth(Number(e.target.value))}
              />
            </label>
            COUNTRY DATA
            <small>
              Natural Earth · 1:10m
              <br />
              Bundled locally · No API key
            </small>
          </div>
        </aside>
        <section className="viewport">
          <div className="viewport-toolbar">
            <span>
              <span className="live-dot" /> MAP PREVIEW
            </span>
            <span>16:9 / Fit</span>
          </div>
          <div className="canvas-wrap">
            <div
              className="composition"
              style={{
                aspectRatio: `${project.canvas.width}/${project.canvas.height}`,
              }}
            >
              <MapSurface
                project={project}
                camera={camera}
                onCamera={setCamera}
                onCountry={(code) => {
                  setCountry(code);
                  setSelected('highlight-vn');
                }}
                onReady={(renderer) => {
                  window.studio = {
                    renderer,
                    getProject: () => current.current,
                  };
                }}
              />
            </div>
          </div>
          <div className="viewport-footer">
            <span>Drag to pan · Scroll to zoom · Right-drag to rotate</span>
            <span>
              WGS84 · {camera.lng.toFixed(3)}, {camera.lat.toFixed(3)}
            </span>
          </div>
        </section>
        <aside className="right-panel panel">
          <label className="field">
            Panel width
            <input
              aria-label="Inspector panel width"
              type="range"
              min="230"
              max="350"
              value={rightWidth}
              onChange={(e) => setRightWidth(Number(e.target.value))}
            />
          </label>
          <div className="panel-heading">
            INSPECTOR <SlidersHorizontal size={14} />
          </div>
          <h2>{layer?.name ?? 'Camera'}</h2>
          <span className="type-label">{layer?.type}</span>
          {layer && (
            <>
              <label className="field">
                Color
                <div className="color-field">
                  <input
                    aria-label="Layer color"
                    type="color"
                    value={layer.style.color}
                    onChange={(e) => color(e.target.value)}
                  />
                  <span>{layer.style.color.toUpperCase()}</span>
                </div>
              </label>
              <label className="field">
                Selected country
                <input value={country} readOnly aria-label="Selected country" />
              </label>
              {layer.type === 'countryHighlight' && (
                <button
                  onClick={() =>
                    setProject((p) => ({
                      ...p,
                      scenes: p.scenes.map((s) => ({
                        ...s,
                        layers: s.layers.map((l) =>
                          l.id === selected && l.type === 'countryHighlight'
                            ? { ...l, countryCodes: [country] }
                            : l,
                        ),
                      })),
                    }))
                  }
                >
                  Highlight {country}
                </button>
              )}
            </>
          )}
          <div className="panel-heading section-heading">CAMERA</div>
          <div className="camera-grid">
            {(['lng', 'lat', 'zoom', 'bearing', 'pitch'] as const).map(
              (key) => (
                <label key={key} className="field">
                  {key}
                  <input
                    aria-label={`Camera ${key}`}
                    type="number"
                    step="0.1"
                    value={Number(camera[key].toFixed(3))}
                    onChange={(e) =>
                      setCamera({ ...camera, [key]: Number(e.target.value) })
                    }
                  />
                </label>
              ),
            )}
          </div>
          <p className="hint">
            Changes update the map immediately. Camera animation arrives in
            Phase 2.
          </p>
        </aside>
      </div>
      <section className="timeline">
        <div className="timeline-toolbar">
          <button disabled title="Playback arrives in Phase 2">
            <Play size={17} />
          </button>
          <strong>00:00.000</strong>
          <span className="muted">/ 00:12.000</span>
          <span className="timeline-title">TIMELINE</span>
          <span className="badge">30 FPS</span>
        </div>
        <div className="timeline-ruler">
          <span>TRACKS</span>
          {[0, 2, 4, 6, 8, 10, 12].map((t) => (
            <span key={t}>{t}s</span>
          ))}
        </div>
        <div className="track">
          <span>◈ Camera</span>
          <div className="track-body">
            {[0, 5, 12].map((t) => (
              <i
                className="keyframe"
                key={t}
                style={{ left: `${(t / 12) * 97}%` }}
              />
            ))}
          </div>
        </div>
        {project.scenes[0]!.layers.slice(0, 3).map((l) => (
          <div className="track" key={l.id}>
            <span>{l.name}</span>
            <div className="track-body">
              <div
                className="clip"
                style={{
                  background: `${l.style.color}35`,
                  borderColor: l.style.color,
                }}
              >
                {l.type}
              </div>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
