import { test, expect } from 'vitest';
import {
  createDemo,
  migrateProject,
  projectV15Schema,
  projectSchema,
} from './index';
import { evaluateProjectAt } from '../../animation-core/src/index';
test('real v15 migration retains content; v16 counter is scene-local, bounded and deterministic', () => {
  const old = projectV15Schema.parse({ ...createDemo(), schemaVersion: 15 });
  const p = migrateProject(old);
  expect(projectV15Schema.parse({ ...p, schemaVersion: 15 })).toEqual(old);
  p.map.basemap = 'blue-marble';
  const text = p.scenes[0]!.layers.find((l) => l.type === 'text')!;
  if (text.type !== 'text') throw Error('Expected text');
  text.counter = {
    from: 0,
    to: 1451,
    start: 1,
    end: 2,
    decimals: 0,
    locale: 'vi-VN',
    easing: 'linear',
  };
  const project = projectSchema.parse(p);
  const value = (time: number) =>
    evaluateProjectAt(project, time).layers.find((l) => l.id === text.id);
  expect(value(0)).toMatchObject({ text: '0' });
  expect(value(1.5)).toMatchObject({ text: '726' });
  expect(value(2)).toMatchObject({ text: '1.451' });
  expect(value(2)).toEqual(value(2));
  expect(text.text).not.toBe('1.451');
  text.counter.end = 13;
  expect(() => projectSchema.parse(p)).toThrow('Counter exceeds');
  expect(() => migrateProject({ ...p, schemaVersion: 999 })).toThrow();
});
