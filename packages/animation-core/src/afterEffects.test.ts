import { test, expect } from 'vitest';
import { runInNewContext } from 'node:vm';
import { createDemo } from '@animatemap/project-schema';
import { evaluateProjectAt } from './index';
import {
  aeManifestBase,
  aeManifestSchema,
  afterEffectsJSX,
  type AEManifest,
} from './afterEffects';
function fixture(): AEManifest {
  const project = createDemo();
  project.durationSeconds = 1;
  project.scenes[0]!.durationSeconds = 1;
  project.scenes[0]!.camera.keyframes = [
    project.scenes[0]!.camera.keyframes[0]!,
  ];
  project.scenes[0]!.layers = [
    project.scenes[0]!.layers.find((l) => l.type === 'text')!,
  ];
  project.scenes[0]!.layers[0]!.timeRange = { start: 0, end: 1 };
  project.scenes[0]!.layers[0]!.tracks.opacity = [];
  const base = aeManifestBase(project),
    id = base.anchors[0]!.id;
  return aeManifestSchema.parse({
    ...base,
    frames: Array.from({ length: 30 }, (_, index) => {
      const state = evaluateProjectAt(project, index / 30);
      return {
        index,
        time: index / 30,
        sceneId: state.sceneId,
        camera: state.camera,
        anchors:
          index === 1
            ? []
            : [
                {
                  id,
                  position: [200 + index, 300],
                  scale: 1.2,
                  rotation: 15,
                  opacity: 0.5,
                  labelHidden: false,
                },
              ],
      };
    }),
  });
}
test('frame count, timing, finite projected coordinates, references and bounded sample budget reject invalid manifests', () => {
  const value = fixture();
  expect(value.frames.length).toBe(30);
  for (const mutate of [
    (m: AEManifest) => {
      m.frames[0]!.time = 1;
    },
    (m: AEManifest) => {
      m.frames.pop();
    },
    (m: AEManifest) => {
      m.frames[0]!.anchors[0]!.position[0] = Infinity;
    },
    (m: AEManifest) => {
      m.frames[0]!.anchors[0]!.id = 'unknown';
    },
    (m: AEManifest) => {
      m.anchors.push(m.anchors[0]!);
    },
  ]) {
    const copy = structuredClone(value);
    mutate(copy);
    expect(() => aeManifestSchema.parse(copy)).toThrow();
  }
  const original = createDemo(),
    before = JSON.stringify(original);
  aeManifestBase(original);
  expect(JSON.stringify(original)).toBe(before);
  original.durationSeconds = 300;
  original.scenes[0]!.durationSeconds = 300;
  original.canvas.fps = 60;
  const layer = original.scenes[0]!.layers.find((l) => l.type === 'text')!;
  original.scenes[0]!.layers = Array.from({ length: 100 }, (_, i) => ({
    ...structuredClone(layer),
    id: `anchor-${i}`,
  }));
  expect(() => aeManifestBase(original)).toThrow('250000');
});

// Contract harness only: it executes the actual emitted script against explicit API expectations,
// never counts as Adobe installation/import/render validation.
function host(failure = false) {
  class Property {
    times: number[] = [];
    values: unknown[] = [];
    value: unknown;
    numKeys = 0;
    setValue(value: unknown) {
      this.value = value;
    }
    setValuesAtTimes(times: number[], values: unknown[]) {
      if (failure) throw new Error('host contract failure');
      this.times = times;
      this.values = values;
      this.numKeys = times.length;
    }
    setInterpolationTypeAtKey(_key: number, inType: string, outType: string) {
      expect(inType).toBe('hold');
      expect(outType).toBe('hold');
    }
    setSpatialAutoBezierAtKey(_key: number, value: boolean) {
      expect(value).toBe(false);
    }
    setSpatialContinuousAtKey(_key: number, value: boolean) {
      expect(value).toBe(false);
    }
  }
  class Group {
    properties = new Map<string, Property>();
    effects: Group[] = [];
    name = '';
    property(key: string) {
      if (!this.properties.has(key)) this.properties.set(key, new Property());
      return this.properties.get(key)!;
    }
    addProperty(name: string) {
      expect(name).toBe('ADBE Slider Control');
      const group = new Group();
      this.effects.push(group);
      return group;
    }
  }
  class Layer {
    name = '';
    groups = new Map<string, Group>();
    property(name: string) {
      if (!this.groups.has(name)) this.groups.set(name, new Group());
      return this.groups.get(name)!;
    }
  }
  const layers: Layer[] = [];
  let removed = false,
    opened = false,
    ended = false;
  const comp = {
    duration: 1,
    layers: {
      addNull(duration: number) {
        expect(duration).toBe(1);
        const layer = new Layer();
        layers.push(layer);
        return layer;
      },
    },
    openInViewer() {
      opened = true;
    },
    remove() {
      removed = true;
    },
  };
  const calls: unknown[][] = [];
  const app = {
    project: {
      items: {
        addComp(...args: unknown[]) {
          calls.push(args);
          return comp;
        },
      },
    },
    beginUndoGroup(name: string) {
      expect(name).toBe('Import AnimateMap anchors');
    },
    endUndoGroup() {
      ended = true;
    },
  };
  return {
    app,
    layers,
    calls,
    get removed() {
      return removed;
    },
    get opened() {
      return opened;
    },
    get ended() {
      return ended;
    },
  };
}
test('trusted JSX executes camera sliders and hold-keyed attachment nulls; Unicode/injection text stays literal', () => {
  const manifest = fixture();
  manifest.name = 'Việt Nam 😀\u2028"; throw new Error("injected"); //';
  manifest.anchors[0]!.name = '</script><script>arbitrary()</script>';
  const script = afterEffectsJSX(manifest);
  expect(
    Array.from(script).every((character) => character.charCodeAt(0) <= 127),
  ).toBe(true);
  expect(script).not.toContain('</script>');
  expect(script).not.toMatch(/\beval\s*\(|\bSystem\b|\bFile\s*\(/);
  const h = host();
  runInNewContext(
    script,
    { app: h.app, KeyframeInterpolationType: { HOLD: 'hold' } },
    { timeout: 1000 },
  );
  expect(h.calls[0]).toEqual([
    `${manifest.name} - AnimateMap`,
    1920,
    1080,
    1,
    1,
    30,
  ]);
  expect(h.layers).toHaveLength(2);
  expect(h.layers[1]!.name).toBe(manifest.anchors[0]!.name);
  const camera = h.layers[0]!.groups.get('ADBE Effect Parade')!;
  expect(camera.effects).toHaveLength(5);
  expect(
    camera.effects[0]!.property('ADBE Slider Control-0001').values,
  ).toEqual(manifest.frames.map((f) => f.camera.lng));
  const transform = h.layers[1]!.groups.get('ADBE Transform Group')!;
  expect(transform.property('ADBE Position').values.slice(0, 3)).toEqual([
    [200, 300],
    [200, 300],
    [202, 300],
  ]);
  expect(transform.property('ADBE Opacity').values.slice(0, 3)).toEqual([
    50, 0, 50,
  ]);
  expect(transform.property('ADBE Scale').values.slice(0, 3)).toEqual([
    [120, 120],
    [100, 100],
    [120, 120],
  ]);
  expect(h.opened).toBe(true);
  expect(h.ended).toBe(true);
  expect(h.removed).toBe(false);
});
test('importer errors remove only the newly created composition and close its undo group', () => {
  const h = host(true);
  expect(() =>
    runInNewContext(afterEffectsJSX(fixture()), {
      app: h.app,
      KeyframeInterpolationType: { HOLD: 'hold' },
    }),
  ).toThrow('host contract failure');
  expect(h.removed).toBe(true);
  expect(h.ended).toBe(true);
});
