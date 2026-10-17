import { expect, test } from 'vitest';
import { createDemo } from './index';
import {
  validateDirectorPlan,
  directorContext,
  type DirectorPlan,
} from './director';
import { directorFixture } from './director.fixture';
test('director covers source timing without rewriting narration or allowing executable fields', () => {
  const p = createDemo(),
    before = JSON.stringify(p),
    plan = directorFixture(p);
  expect(validateDirectorPlan(plan, p)).toEqual(plan);
  expect(JSON.stringify(p)).toBe(before);
  expect(() =>
    validateDirectorPlan({ ...plan, script: 'rewrite' }, p),
  ).toThrow();
  expect(() =>
    validateDirectorPlan(
      { ...plan, shots: plan.shots.map((s) => ({ ...s, html: '<script>' })) },
      p,
    ),
  ).toThrow();
  expect(JSON.stringify(directorContext(p))).not.toContain('data:image');
});
test('director rejects gaps, overlaps, omitted scenes, unknown assets and reordering', () => {
  const p = createDemo(),
    plan = directorFixture(p);
  for (const change of [
    (v: DirectorPlan) => (v.shots[0]!.start = 0.1),
    (v: DirectorPlan) => (v.shots[0]!.end += 0.2),
    (v: DirectorPlan) => v.shots.pop(),
    (v: DirectorPlan) => v.shots[0]!.assetIds.push('unknown'),
    (v: DirectorPlan) => v.shots.reverse(),
  ]) {
    const value = structuredClone(plan);
    change(value);
    expect(() => validateDirectorPlan(value, p)).toThrow();
  }
});
