import { test, expect } from 'vitest';
import {
  createDemo,
  migrateProject,
  projectSchema,
  CURRENT_SCHEMA_VERSION,
} from './index';
import { evaluateMediaAt } from '../../animation-core/src/audio';
test('v17 migrates without changing caption text or inventing timestamps', () => {
  const p = createDemo(),
    old = { ...p, schemaVersion: 17 };
  const next = migrateProject(old);
  expect(next.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  expect(next.captions).toEqual(p.captions);
  expect(next.map.creditVisibility).toBeUndefined();
  expect(() =>
    migrateProject({ ...p, schemaVersion: CURRENT_SCHEMA_VERSION + 1 }),
  ).toThrow();
});
test('real word ranges validate complete Unicode text, bounds and non-overlap', () => {
  const p = createDemo();
  p.captions.cues = [
    {
      id: 'words',
      text: 'Hà Nội\nViệt Nam',
      locked: false,
      startSeconds: 0,
      endSeconds: 2,
      words: [
        { text: 'Hà', startSeconds: 0.1, endSeconds: 0.3 },
        { text: 'Nội', startSeconds: 0.3, endSeconds: 0.6 },
        { text: 'Việt', startSeconds: 0.8, endSeconds: 1 },
        { text: 'Nam', startSeconds: 1, endSeconds: 1.3 },
      ],
    },
  ];
  expect(projectSchema.parse(p)).toEqual(p);
  for (const edit of [
    (x: typeof p) => {
      x.captions.cues[0]!.words![1]!.startSeconds = 0.2;
    },
    (x: typeof p) => {
      x.captions.cues[0]!.words![0]!.endSeconds = NaN;
    },
    (x: typeof p) => {
      x.captions.cues[0]!.words![0]!.text = 'Sai';
    },
    (x: typeof p) => {
      x.captions.cues[0]!.words![3]!.endSeconds = 3;
    },
  ]) {
    const copy = structuredClone(p);
    edit(copy);
    expect(projectSchema.safeParse(copy).success).toBe(false);
  }
  p.captions.style.wordHighlight = true;
  for (const [t, index] of [
    [0, -1],
    [0.1, 0],
    [0.3, 1],
    [0.6, -1],
    [0.8, 2],
    [1, 3],
    [1.3, -1],
  ] as const) {
    expect(evaluateMediaAt(p, t).captions[0]?.activeWordIndex).toBe(index);
    expect(evaluateMediaAt(p, t)).toEqual(evaluateMediaAt(p, t));
  }
  p.captions.style.wordHighlight = false;
  expect(evaluateMediaAt(p, 0.3).captions[0]?.activeWordIndex).toBeUndefined();
});
