import { create } from 'zustand';
import {
  createDemo,
  migrateProject,
  layerSchema,
  type Camera,
  type Layer,
  type Project,
} from '@animatemap/project-schema';
import { evaluateProjectAt } from '@animatemap/animation-core';
type Tool = 'select' | 'route' | 'marker' | 'text';
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
  error: string;
  edit: (change: (project: Project) => void) => void;
  load: (project: unknown) => void;
  seek: (time: number) => void;
  undo: () => void;
  redo: () => void;
  patchLayer: (change: (layer: Layer) => void) => void;
  addLayer: (
    type: Layer['type'],
    point?: [number, number],
    code?: string,
  ) => void;
  deleteLayer: () => void;
  addCameraKey: () => void;
}
const initial = createDemo();
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
        error: '',
      });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Invalid project' });
    }
  },
  seek(seconds) {
    const { project } = get();
    const time = Math.max(0, Math.min(project.durationSeconds, seconds));
    set({ time, camera: evaluateProjectAt(project, time).camera });
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
      name: type === 'countryHighlight' ? code : `New ${type}`,
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
      type === 'route'
        ? {
            coordinates: s.points,
            style: { color: '#ffd087', width: 6, dash: false, arrow: true },
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
