import { create } from 'zustand';
import {
  createDemo,
  migrateProject,
  layerSchema,
  type Camera,
  type Layer,
  type Project,
} from '@animatemap/project-schema';
import {
  evaluateProjectAt,
  createCameraPreset,
  type CameraPresetKind,
} from '@animatemap/animation-core';
import { applySceneOperation, type SceneOperation } from './sceneOperations';
type Tool = 'select' | 'route' | 'marker' | 'text' | 'shape' | 'shapePoint';
interface EditorState {
  project: Project;
  past: Project[];
  future: Project[];
  selected: string;
  time: number;
  playing: boolean;
  camera: Camera;
  tool: Tool;
  points: [number, number][];
  shapeKind: 'line' | 'arrow' | 'bezier';
  pointEdit: { id: string; index: number } | null;
  showShapeControls: boolean;
  error: string;
  edit: (change: (project: Project) => void) => void;
  load: (project: unknown) => void;
  seek: (time: number) => void;
  undo: () => void;
  redo: () => void;
  patchLayer: (change: (layer: Layer) => void) => void;
  addLayer: (
    type: Exclude<Layer['type'], 'image' | 'choropleth' | 'admin1Highlight'>,
    point?: [number, number],
    code?: string,
  ) => void;
  deleteLayer: () => void;
  addCameraKey: () => void;
  selectScene: (id: string) => void;
  sceneOperation: (operation: SceneOperation) => void;
  applyTemplate: (project: unknown) => void;
  applyCameraPreset: (kind: CameraPresetKind, amount?: number) => void;
}
const initial = createDemo();
function selectionAt(project: Project, time: number, selected: string) {
  const scene = project.scenes.find(
    (scene) => scene.id === evaluateProjectAt(project, time).sceneId,
  );
  return scene?.layers.some((layer) => layer.id === selected)
    ? selected
    : (scene?.layers[0]?.id ?? '');
}
export const useEditor = create<EditorState>((set, get) => ({
  project: initial,
  past: [],
  future: [],
  selected: 'highlight-vn',
  time: 0,
  playing: false,
  camera: evaluateProjectAt(initial, 0).camera,
  tool: 'select',
  points: [],
  shapeKind: 'line',
  pointEdit: null,
  showShapeControls: true,
  error: '',
  edit(change) {
    const state = get(),
      next = structuredClone(state.project);
    try {
      change(next);
      const parsed = migrateProject(next);
      if (JSON.stringify(parsed) === JSON.stringify(state.project)) {
        set({ error: '' });
        return;
      }
      const time = Math.min(state.time, parsed.durationSeconds);
      set({
        project: parsed,
        time,
        ...(time !== state.time
          ? { camera: evaluateProjectAt(parsed, time).camera }
          : {}),
        past: [...state.past.slice(-99), state.project],
        future: [],
        error: '',
      });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Invalid project edit' });
    }
  },
  load(input) {
    try {
      const project = migrateProject(input);
      set({
        project,
        past: [],
        future: [],
        selected: project.scenes[0]!.layers[0]?.id ?? '',
        time: 0,
        playing: false,
        camera: evaluateProjectAt(project, 0).camera,
        points: [],
        tool: 'select',
        pointEdit: null,
        error: '',
      });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Invalid project' });
    }
  },
  applyTemplate(input) {
    const previous = get().project;
    get().edit((project) => {
      Object.assign(project, migrateProject(input));
    });
    if (get().project === previous) return;
    get().seek(0);
    set({ playing: false, tool: 'select', points: [] });
  },
  applyCameraPreset(kind, amount) {
    const state = get();
    const sceneId = evaluateProjectAt(state.project, state.time).sceneId;
    state.edit((project) => {
      const scene = project.scenes.find((scene) => scene.id === sceneId);
      if (!scene)
        throw new Error('Select a scene before applying a camera preset');
      scene.camera.keyframes = createCameraPreset(
        kind,
        state.camera,
        scene.durationSeconds,
        amount,
        scene.camera.keyframes[0]!.value,
      );
    });
    if (get().project !== state.project) get().seek(state.time);
  },
  seek(seconds) {
    const { project, selected } = get();
    const time = Math.max(0, Math.min(project.durationSeconds, seconds));
    set({
      time,
      selected: selectionAt(project, time, selected),
      camera: evaluateProjectAt(project, time).camera,
    });
  },
  selectScene(id) {
    const scene = get().project.scenes.find((scene) => scene.id === id);
    if (!scene) return;
    get().seek(scene.startSeconds);
    set({
      selected: scene.layers[0]?.id ?? '',
      playing: false,
      tool: 'select',
      points: [],
    });
  },
  sceneOperation(operation) {
    const state = get();
    const active = state.project.scenes.find(
      (scene) =>
        scene.id === evaluateProjectAt(state.project, state.time).sceneId,
    );
    const local = active ? state.time - active.startSeconds : 0;
    let focus = '';
    state.edit((project) => {
      focus = applySceneOperation(project, operation);
    });
    if (get().project === state.project) return;
    const scene = get().project.scenes.find((scene) => scene.id === focus)!;
    const preserve = active?.id === focus;
    get().seek(
      scene.startSeconds +
        (preserve
          ? Math.min(
              local,
              Math.max(0, scene.durationSeconds - 1 / state.project.canvas.fps),
            )
          : 0),
    );
    set({
      selected:
        preserve && scene.layers.some((layer) => layer.id === state.selected)
          ? state.selected
          : (scene.layers[0]?.id ?? ''),
      playing: false,
      tool: 'select',
      points: [],
    });
  },
  undo() {
    const s = get(),
      previous = s.past.at(-1);
    if (previous) {
      const time = Math.min(s.time, previous.durationSeconds);
      set({
        project: previous,
        past: s.past.slice(0, -1),
        future: [s.project, ...s.future],
        time,
        selected: selectionAt(previous, time, s.selected),
        camera: evaluateProjectAt(previous, time).camera,
        error: '',
      });
    }
  },
  redo() {
    const s = get(),
      next = s.future[0];
    if (next) {
      const time = Math.min(s.time, next.durationSeconds);
      set({
        project: next,
        past: [...s.past, s.project],
        future: s.future.slice(1),
        time,
        selected: selectionAt(next, time, s.selected),
        camera: evaluateProjectAt(next, time).camera,
        error: '',
      });
    }
  },
  patchLayer(change) {
    get().edit((p) => {
      const l = p.scenes
        .flatMap((s) => s.layers)
        .find((l) => l.id === get().selected);
      if (l && !l.locked) change(l);
    });
  },
  addLayer(type, point, code = 'VNM') {
    const s = get();
    const scene =
      s.project.scenes.find(
        (scene) => scene.id === evaluateProjectAt(s.project, s.time).sceneId,
      ) ?? s.project.scenes[0]!;
    const id = crypto.randomUUID();
    const common = {
      id,
      name:
        type === 'countryHighlight'
          ? code
          : `New ${type === 'shape' ? s.shapeKind : type}`,
      type,
      timeRange: { start: 0, end: scene.durationSeconds },
      opacity: 1,
      visible: true,
      locked: false,
    };
    const anchor = {
      type: 'map',
      coordinates: point ?? [s.camera.lng, s.camera.lat],
    };
    const detail =
      type === 'route' || type === 'shape'
        ? {
            coordinates: s.points,
            ...(type === 'shape' ? { kind: s.shapeKind } : {}),
            style: {
              color: '#ffd087',
              width: 6,
              dash: false,
              arrow: type === 'route' || s.shapeKind === 'arrow',
            },
            tracks: {
              opacity: [],
              reveal: [
                { time: 0, value: 0, easing: 'linear' },
                { time: scene.durationSeconds, value: 1, easing: 'easeInOut' },
              ],
            },
          }
        : type === 'countryHighlight'
          ? {
              countryCodes: [code],
              style: {
                color: '#307e72',
                stroke: '#75d9bd',
                width: 1.5,
                dimOutside: 0.2,
              },
            }
          : type === 'marker'
            ? {
                anchor,
                label: 'New place',
                style: { color: '#ffd087', size: 22, icon: 'pin' },
              }
            : {
                text: 'Your title',
                anchor: { type: 'screen', x: 0.08, y: 0.12 },
                style: {
                  color: '#ffffff',
                  fontSize: 52,
                  fontWeight: 'bold',
                  align: 'left',
                },
              };
    try {
      const layer = layerSchema.parse({ ...common, ...detail });
      get().edit((p) =>
        p.scenes.find((v) => v.id === scene.id)!.layers.push(layer),
      );
      set({ selected: id, tool: 'select', points: [] });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Cannot create layer' });
    }
  },
  deleteLayer() {
    const s = get();
    const selected = s.project.scenes
      .flatMap((scene) => scene.layers)
      .find((layer) => layer.id === s.selected);
    if (!selected || selected.locked) return;
    s.edit((p) => {
      for (const scene of p.scenes)
        scene.layers = scene.layers.filter(
          (l) => l.id !== s.selected || l.locked,
        );
    });
    set({ selected: '' });
  },
  addCameraKey() {
    const s = get();
    s.edit((p) => {
      const scene =
        p.scenes.find((v) => v.id === evaluateProjectAt(p, s.time).sceneId) ??
        p.scenes[0]!;
      const time = Math.min(
        scene.durationSeconds,
        Math.max(0, s.time - scene.startSeconds),
      );
      const keys = scene.camera.keyframes;
      const existing = keys.find((k) => Math.abs(k.time - time) < 0.001);
      if (existing) existing.value = { ...s.camera };
      else keys.push({ time, value: { ...s.camera }, easing: 'easeInOut' });
      keys.sort((a, b) => a.time - b.time);
    });
  },
}));
