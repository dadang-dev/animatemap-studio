import { expect, test } from 'vitest';
import { createDemo } from '@animatemap/project-schema';
import { directorFixture } from '../../../packages/project-schema/src/director.fixture';
import { directorComposition } from './directorComposition';
test('HyperFrames composition uses finite seekable timing, owned markup and framework-owned media', () => {
  const p = createDemo(),
    plan = directorFixture(p),
    html = directorComposition(p, plan, 1, 4);
  expect(html).toContain('data-duration="4"');
  expect(html).toContain('data-media-start="1"');
  expect(html).toContain('window.__timelines.animatemap=tl');
  expect(html).toContain('src="gsap.min.js"');
  expect(html).not.toMatch(/https?:|Math\.random|Date\.now|\.play\(/);
  plan.shots[0]!.rationale = '<script>alert(1)</script>';
  expect(directorComposition(p, plan)).not.toContain('alert(1)');
  expect(() => directorComposition(p, plan, -1, 4)).toThrow();
  expect(() => directorComposition(p, plan, 0, 999)).toThrow();
});
