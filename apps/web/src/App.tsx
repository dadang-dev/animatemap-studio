import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { evaluateProjectAt } from '@animatemap/animation-core';
import {
  admin1Reference,
  type Admin1Properties,
  type Project,
} from '@animatemap/project-schema';
import type { MapRenderer } from '@animatemap/map-engine';
import {
  Globe2,
  Undo2,
  Redo2,
  Layers,
  MapPin,
  Route,
  Type,
  Eye,
  EyeOff,
  Lock,
  Unlock,
} from 'lucide-react';
import { MapSurface } from './MapSurface';
import { useEditor } from './store';
import { Inspector } from './Inspector';
import { ScenePanel } from './ScenePanel';
import { Timeline } from './Timeline';
import { ProjectMenu } from './ProjectMenu';
import { ExportPanel } from './ExportPanel';
import { AssetLibrary } from './AssetLibrary';
import { DataLibrary } from './DataLibrary';
import { Admin1Panel } from './Admin1Panel';
import { AudioPanel } from './AudioPanel';
import { GeographyPanel } from './GeographyPanel';
import { AIPanel } from './AIPanel';
import { AfterEffectsPanel } from './AfterEffectsPanel';
import { TerrainPanel } from './TerrainPanel';
import { BuildingLibrary } from './BuildingLibrary';
import { ModelLibrary } from './ModelLibrary';
import { api, useAutosave } from './persistence';
import { usePlayback } from './usePlayback';
declare global {
  interface Window {
    studio?: {
      renderer: MapRenderer;
      getProject: () => Project;
      seek: (time: number) => void;
      evaluate: (time: number) => ReturnType<typeof evaluateProjectAt>;
      audioState: () => {
        state: string;
        scheduled: string[];
        decodedAssets: string[];
      };
    };
  }
}
export function App() {
  const s = useEditor();
  const autosave = useAutosave();
  const playback = usePlayback();
  const canvasWrap = useRef<HTMLDivElement>(null);
  const [canvasSpace, setCanvasSpace] = useState({ width: 600, height: 400 });
  useLayoutEffect(() => {
    const element = canvasWrap.current;
    if (!element) return;
    const update = () =>
      setCanvasSpace({
        width: Math.max(1, element.clientWidth - 44),
        height: Math.max(1, element.clientHeight - 44),
      });
    const observer = new ResizeObserver(update);
    observer.observe(element);
    update();
    return () => observer.disconnect();
  }, []);
  const canvasWidth = Math.min(
    canvasSpace.width,
    (canvasSpace.height * s.project.canvas.width) / s.project.canvas.height,
  );
  const state = useMemo(
    () => evaluateProjectAt(s.project, s.time),
    [s.project, s.time],
  );
  const [country, setCountry] = useState('VNM');
  const [search, setSearch] = useState('');
  const [assetsOpen, setAssetsOpen] = useState(false);
  const [dataOpen, setDataOpen] = useState(false);
  const [regionsOpen, setRegionsOpen] = useState(false);
  const [audioOpen, setAudioOpen] = useState(false);
  const [geographyOpen, setGeographyOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aeOpen, setAeOpen] = useState(false);
  const [terrainOpen, setTerrainOpen] = useState(false);
  const [buildingsOpen, setBuildingsOpen] = useState(false);
  const [modelsOpen, setModelsOpen] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<Admin1Properties | null>(
    null,
  );
  const [leftWidth, setLeftWidth] = useState(240);
  const [rightWidth, setRightWidth] = useState(280);
  const renderer = useRef<MapRenderer | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const scene =
    s.project.scenes.find((v) => v.id === state.sceneId) ??
    s.project.scenes[0]!;
  const selectedShape = scene.layers.find(
    (layer) => layer.id === s.selected && layer.type === 'shape',
  );
  const previousScene = useRef(scene.id);
  useEffect(() => {
    if (
      previousScene.current !== scene.id ||
      (s.pointEdit && s.pointEdit.id !== s.selected)
    )
      useEditor.setState({ tool: 'select', points: [], pointEdit: null });
    previousScene.current = scene.id;
  }, [scene.id, s.selected, s.pointEdit]);
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (
        (e.target as HTMLElement).closest(
          'input,textarea,select,[contenteditable]',
        )
      )
        return;
      const editor = useEditor.getState();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) editor.redo();
        else editor.undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void api('/projects', {
          method: 'POST',
          body: JSON.stringify(editor.project),
        }).catch((e: Error) => useEditor.setState({ error: e.message }));
      } else if (e.code === 'Space') {
        e.preventDefault();
        if (editor.time === editor.project.durationSeconds) editor.seek(0);
        useEditor.setState({ playing: !editor.playing });
      } else if (e.key.toLowerCase() === 'k') editor.addCameraKey();
      else if (e.key === 'Delete') editor.deleteLayer();
      else if (e.key === 'Escape')
        useEditor.setState({ tool: 'select', points: [], pointEdit: null });
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, []);
  function moveLayer(id: string, amount: number) {
    s.edit((p) => {
      const layers = p.scenes.find((v) => v.id === scene.id)!.layers;
      const index = layers.findIndex((l) => l.id === id);
      if (layers[index]?.locked) return;
      const target = index + amount;
      if (target >= 0 && target < layers.length)
        [layers[index], layers[target]] = [layers[target]!, layers[index]!];
    });
  }
  function chooseCountry(code: string) {
    const editor = useEditor.getState();
    if (editor.tool !== 'select') return;
    setCountry(code);
    setSelectedRegion(null);
    const existing = editor.project.scenes
      .find(
        (scene) =>
          scene.id === evaluateProjectAt(editor.project, editor.time).sceneId,
      )
      ?.layers.find(
        (l) => l.type === 'countryHighlight' && l.countryCodes.includes(code),
      );
    if (existing) useEditor.setState({ selected: existing.id });
  }
  return (
    <div className="studio">
      <div className="desktop-notice">
        AnimateMap Studio needs a desktop viewport of at least 1000 pixels.
        Expand your window for the full editor.
      </div>
      <header className="topbar">
        <div className="brand">
          <Globe2 size={24} />
          <h1>
            AnimateMap <span>Studio</span>
          </h1>
        </div>
        <ProjectMenu />
        <div className="project-title">
          {s.project.name}
          <span className="badge">LOCAL</span>
        </div>
        <button
          aria-label="Undo"
          title="Undo · Ctrl+Z"
          disabled={!s.past.length}
          onClick={s.undo}
        >
          <Undo2 size={17} />
        </button>
        <button
          aria-label="Redo"
          title="Redo · Ctrl+Shift+Z"
          disabled={!s.future.length}
          onClick={s.redo}
        >
          <Redo2 size={17} />
        </button>
        <span className="spec">
          {s.project.canvas.width} × {s.project.canvas.height} ·{' '}
          {s.project.canvas.fps} FPS
        </span>
        <ExportPanel />
      </header>
      {s.error && (
        <div className="error-banner" role="alert">
          {s.error.slice(0, 600)}
          <button onClick={() => useEditor.setState({ error: '' })}>
            Dismiss
          </button>
        </div>
      )}
      {assetsOpen && (
        <AssetLibrary
          sceneId={scene.id}
          country={country}
          onClose={() => setAssetsOpen(false)}
        />
      )}
      {dataOpen && (
        <DataLibrary sceneId={scene.id} onClose={() => setDataOpen(false)} />
      )}
      {regionsOpen && (
        <Admin1Panel
          country={country}
          initialRegion={selectedRegion?.code}
          sceneId={scene.id}
          renderer={renderer.current}
          onCountry={(code) => {
            setCountry(code);
            setSelectedRegion(null);
          }}
          onSelect={setSelectedRegion}
          onClose={() => setRegionsOpen(false)}
        />
      )}
      {audioOpen && <AudioPanel onClose={() => setAudioOpen(false)} />}
      {aiOpen && <AIPanel onClose={() => setAiOpen(false)} />}
      {terrainOpen && <TerrainPanel onClose={() => setTerrainOpen(false)} />}
      {buildingsOpen && (
        <BuildingLibrary onClose={() => setBuildingsOpen(false)} />
      )}
      {modelsOpen && <ModelLibrary onClose={() => setModelsOpen(false)} />}
      {aeOpen && (
        <AfterEffectsPanel
          countries={renderer.current?.countries}
          onClose={() => setAeOpen(false)}
        />
      )}
      {geographyOpen && (
        <GeographyPanel
          sceneId={scene.id}
          onClose={() => setGeographyOpen(false)}
        />
      )}
      <div
        className="workspace"
        style={{
          gridTemplateColumns: `${leftWidth}px minmax(440px,1fr) ${rightWidth}px`,
        }}
      >
        <aside className="left-panel panel">
          <div className="panel-heading">PROJECT</div>
          <label className="field">
            Map style
            <select
              aria-label="Map style"
              value={s.project.map.styleId}
              onChange={(e) =>
                s.edit((p) => {
                  p.map.styleId = e.target.value as Project['map']['styleId'];
                })
              }
            >
              <option value="dark">Midnight</option>
              <option value="light">Daylight</option>
              <option value="muted">Slate</option>
            </select>
          </label>
          <label className="field">
            Canvas
            <select
              aria-label="Canvas preset"
              value={`${s.project.canvas.width}x${s.project.canvas.height}`}
              onChange={(e) =>
                s.edit((p) => {
                  const [width, height] = e.target.value.split('x').map(Number);
                  p.canvas.width = width!;
                  p.canvas.height = height!;
                })
              }
            >
              <option value="1920x1080">16:9 · 1920 × 1080</option>
              <option value="1080x1920">9:16 · 1080 × 1920</option>
              <option value="1080x1080">1:1 · 1080 × 1080</option>
              <option value="3840x2160">16:9 · 4K 3840 × 2160</option>
              <option value="2160x3840">9:16 · 4K 2160 × 3840</option>
            </select>
          </label>
          <label className="field">
            FPS
            <select
              aria-label="FPS"
              value={s.project.canvas.fps}
              onChange={(e) =>
                s.edit((p) => {
                  p.canvas.fps = Number(e.target.value) as 24 | 30 | 60;
                })
              }
            >
              <option>24</option>
              <option>30</option>
              <option>60</option>
            </select>
          </label>
          <label className="field">
            Find country
            <input
              aria-label="Find country"
              placeholder="Vietnam, Thailand…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          {search &&
            renderer.current?.countries.features
              .filter(
                (f) =>
                  f.properties.name
                    .toLowerCase()
                    .includes(search.toLowerCase()) ||
                  f.properties.code.toLowerCase() === search.toLowerCase(),
              )
              .slice(0, 8)
              .map((f) => (
                <button
                  className="saved-project"
                  key={f.properties.code}
                  onClick={() => {
                    setCountry(f.properties.code);
                    useEditor.setState({
                      camera: {
                        ...s.camera,
                        lng: f.properties.labelLng,
                        lat: f.properties.labelLat,
                        zoom: 4.5,
                      },
                    });
                    setSearch('');
                  }}
                >
                  {f.properties.name} · {f.properties.code}
                </button>
              ))}
          <ScenePanel sceneId={scene.id} />
          <div className="panel-heading section-heading">
            LAYERS <Layers size={14} />
          </div>
          <div className="tool-row">
            <button
              aria-label="Draw route"
              title="Click at least two map points, then Finish route"
              className={s.tool === 'route' ? 'active' : ''}
              onClick={() => useEditor.setState({ tool: 'route', points: [] })}
            >
              <Route size={16} />
            </button>
            <button
              aria-label="Add marker"
              title="Click map to place marker"
              className={s.tool === 'marker' ? 'active' : ''}
              onClick={() => useEditor.setState({ tool: 'marker' })}
            >
              <MapPin size={16} />
            </button>
            <button aria-label="Add text" onClick={() => s.addLayer('text')}>
              <Type size={16} />
            </button>
            <button
              aria-label="Add highlight"
              onClick={() => s.addLayer('countryHighlight', undefined, country)}
            >
              <Globe2 size={16} />
            </button>
          </div>
          <div className="tool-row shape-tools">
            {(['line', 'arrow', 'bezier'] as const).map((kind) => (
              <button
                key={kind}
                aria-label={`Draw ${kind} shape`}
                title={
                  kind === 'bezier'
                    ? 'Click start, two control points, then end'
                    : 'Click at least two map points'
                }
                className={
                  s.tool === 'shape' && s.shapeKind === kind ? 'active' : ''
                }
                onClick={() =>
                  useEditor.setState({
                    tool: 'shape',
                    shapeKind: kind,
                    points: [],
                    pointEdit: null,
                  })
                }
              >
                {kind === 'line'
                  ? '╱ Line'
                  : kind === 'arrow'
                    ? '↗ Arrow'
                    : '⌁ Bezier'}
              </button>
            ))}
          </div>
          <button onClick={() => setAssetsOpen(true)}>
            Image assets / logo
          </button>
          <button onClick={() => setDataOpen(true)}>
            Country data · CSV / Excel
          </button>
          <button onClick={() => setRegionsOpen(true)}>Admin 1 regions</button>
          <button onClick={() => setAudioOpen(true)}>Audio & captions</button>
          <button onClick={() => setAiOpen(true)}>Create with Codex</button>
          <button onClick={() => setTerrainOpen(true)}>
            Offline 3D terrain
          </button>
          <button onClick={() => setBuildingsOpen(true)}>
            3D buildings · GeoJSON
          </button>
          <button onClick={() => setModelsOpen(true)}>3D models · OBJ</button>
          <button onClick={() => setAeOpen(true)}>
            After Effects interchange
          </button>
          <button onClick={() => setGeographyOpen(true)}>
            Places & road routes
          </button>
          {s.tool !== 'select' && (
            <div className="tool-notice">
              {s.tool === 'route' || s.tool === 'shape'
                ? `${s.points.length} points · Click map to add`
                : s.tool === 'shapePoint'
                  ? `Click map to reposition point ${(s.pointEdit?.index ?? 0) + 1}`
                  : 'Click map to place marker'}
              {s.tool === 'route' && (
                <button
                  disabled={s.points.length < 2}
                  onClick={() => s.addLayer('route')}
                >
                  Finish route
                </button>
              )}
              {s.tool === 'shape' && (
                <>
                  {s.shapeKind === 'bezier' && (
                    <small>Start → Control 1 → Control 2 → End</small>
                  )}
                  <button
                    disabled={
                      s.shapeKind === 'bezier'
                        ? s.points.length !== 4
                        : s.points.length < 2
                    }
                    onClick={() => s.addLayer('shape')}
                  >
                    Finish shape
                  </button>
                </>
              )}
              <button
                onClick={() =>
                  useEditor.setState({
                    tool: 'select',
                    points: [],
                    pointEdit: null,
                  })
                }
              >
                Cancel tool
              </button>
            </div>
          )}
          <div className="layer-list">
            {scene.layers.map((l, i) => (
              <div
                className={`layer-item ${s.selected === l.id ? 'selected' : ''}`}
                key={l.id}
              >
                <button
                  className="layer-row"
                  onClick={() => useEditor.setState({ selected: l.id })}
                >
                  <span>{l.name}</span>
                  <i
                    style={{
                      background:
                        l.type === 'image' ? '#a8b8cc' : l.style.color,
                    }}
                  />
                </button>
                <div className="layer-actions">
                  <button
                    aria-label={`Toggle visibility ${l.name}`}
                    onClick={() =>
                      s.edit((p) => {
                        const v = p.scenes
                          .find((v) => v.id === scene.id)!
                          .layers.find((v) => v.id === l.id)!;
                        if (!v.locked) v.visible = !v.visible;
                      })
                    }
                  >
                    {l.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                  </button>
                  <button
                    aria-label={`Toggle lock ${l.name}`}
                    onClick={() =>
                      s.edit((p) => {
                        const v = p.scenes
                          .find((v) => v.id === scene.id)!
                          .layers.find((v) => v.id === l.id)!;
                        v.locked = !v.locked;
                      })
                    }
                  >
                    {l.locked ? <Lock size={12} /> : <Unlock size={12} />}
                  </button>
                  <button
                    aria-label={`Move up ${l.name}`}
                    disabled={i === 0 || l.locked}
                    onClick={() => moveLayer(l.id, -1)}
                  >
                    ↑
                  </button>
                  <button
                    aria-label={`Move down ${l.name}`}
                    disabled={i === scene.layers.length - 1 || l.locked}
                    onClick={() => moveLayer(l.id, 1)}
                  >
                    ↓
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            disabled={
              !s.selected ||
              !!scene.layers.find((l) => l.id === s.selected)?.locked
            }
            onClick={s.deleteLayer}
          >
            Delete selected layer
          </button>
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
              Natural Earth · Public domain
              <br />
              {autosave}
            </small>
          </div>
        </aside>
        <section className="viewport">
          <div className="viewport-toolbar">
            <span>
              <span className="live-dot" />
              MAP PREVIEW
            </span>
            <span>
              {s.project.canvas.width} × {s.project.canvas.height} / Fit
            </span>
          </div>
          <div className="canvas-wrap" ref={canvasWrap}>
            <div
              className="composition"
              style={{
                aspectRatio: `${s.project.canvas.width}/${s.project.canvas.height}`,
                width: canvasWidth,
                height:
                  (canvasWidth * s.project.canvas.height) /
                  s.project.canvas.width,
              }}
            >
              <MapSurface
                project={s.project}
                camera={scene.camera.follow ? state.camera : s.camera}
                layers={state.layers}
                blend={state.blend}
                captions={state.captions}
                editCoordinates={
                  !s.playing &&
                  s.tool === 'select' &&
                  s.showShapeControls &&
                  selectedShape?.type === 'shape' &&
                  !selectedShape.locked
                    ? selectedShape.coordinates
                    : undefined
                }
                onEditPoint={(index) => {
                  if (selectedShape && !selectedShape.locked)
                    useEditor.setState({
                      tool: 'shapePoint',
                      pointEdit: { id: selectedShape.id, index },
                    });
                }}
                onCountry={chooseCountry}
                onRegion={(code) => {
                  const editor = useEditor.getState();
                  if (editor.tool !== 'select') return;
                  const parent = admin1Reference.get(code);
                  const region =
                    parent &&
                    renderer.current
                      ?.regionsForCountry(parent)
                      ?.features.find(
                        (region) => region.properties.code === code,
                      );
                  if (!region) return;
                  setCountry(region.properties.countryCode);
                  setSelectedRegion(region.properties);
                  const existing = scene.layers.find(
                    (layer) =>
                      layer.type === 'admin1Highlight' &&
                      layer.regionCodes.includes(code),
                  );
                  useEditor.setState({ selected: existing?.id ?? '' });
                }}
                onLayer={(id) => {
                  if (useEditor.getState().tool === 'select')
                    useEditor.setState({ selected: id });
                }}
                onCamera={(camera) => useEditor.setState({ camera })}
                onPoint={(point) => {
                  const editor = useEditor.getState();
                  if (editor.tool === 'route')
                    useEditor.setState({ points: [...editor.points, point] });
                  else if (editor.tool === 'shape') {
                    if (
                      editor.shapeKind !== 'bezier' ||
                      editor.points.length < 4
                    )
                      useEditor.setState({ points: [...editor.points, point] });
                  } else if (editor.tool === 'shapePoint') {
                    const target = editor.pointEdit;
                    if (target?.id === editor.selected)
                      editor.patchLayer((layer) => {
                        if (
                          layer.type === 'shape' &&
                          layer.coordinates[target.index]
                        )
                          layer.coordinates[target.index] = point;
                      });
                    useEditor.setState({ tool: 'select', pointEdit: null });
                  } else if (editor.tool === 'marker')
                    editor.addLayer('marker', point);
                }}
                onReady={(r) => {
                  renderer.current = r;
                  setMapReady(true);
                  window.studio = {
                    audioState: () => ({
                      state: playback.current?.state ?? 'idle',
                      scheduled: [...(playback.current?.scheduled ?? [])],
                      decodedAssets: playback.current?.decodedAssets ?? [],
                    }),
                    renderer: r,
                    getProject: () => useEditor.getState().project,
                    seek: (t) => useEditor.getState().seek(t),
                    evaluate: (t) =>
                      evaluateProjectAt(useEditor.getState().project, t),
                  };
                }}
              />
            </div>
          </div>
          <div className="viewport-footer">
            <span>
              {mapReady
                ? 'Drag to pan · Scroll to zoom · Right-drag to rotate'
                : 'Loading map…'}
            </span>
            <span>
              WGS84 · {s.camera.lng.toFixed(3)}, {s.camera.lat.toFixed(3)}
            </span>
          </div>
        </section>
        <aside className="right-panel panel">
          <Inspector
            country={country}
            region={selectedRegion}
            onRegions={() => setRegionsOpen(true)}
          />
          <label className="field">
            Panel width
            <input
              aria-label="Inspector panel width"
              type="range"
              min="230"
              max="360"
              value={rightWidth}
              onChange={(e) => setRightWidth(Number(e.target.value))}
            />
          </label>
        </aside>
      </div>
      <Timeline />
    </div>
  );
}
