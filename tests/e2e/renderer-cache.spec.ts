import { test, expect, type Page } from '@playwright/test';
import {
  createDemo,
  layerSchema,
  type Project,
} from '../../packages/project-schema/src/index';
async function load(page: Page, project: Project) {
  await page.getByLabel('Import project JSON').setInputFiles({
    name: 'cache.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(project)),
  });
  await expect
    .poll(() => page.evaluate(() => window.studio!.getProject()))
    .toEqual(project);
  await page.evaluate(() => window.studio!.renderer.ready());
}
test('unchanged evaluated route geometry avoids source updates; changed coordinates and same-ID type replacements invalidate safely', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForFunction(() => !!window.studio);
  const project = createDemo();
  project.scenes[0]!.layers = [
    layerSchema.parse({
      id: 'same-layer',
      name: 'Country reference',
      type: 'countryHighlight',
      timeRange: { start: 0, end: 12 },
      countryCodes: ['VNM'],
      style: { color: '#ffb866', stroke: '#9ef0cd', width: 1, dimOutside: 0 },
    }),
  ];
  await load(page, project);
  expect(
    await page.evaluate(
      () => window.studio!.renderer.map.getLayer('ams-same-layer-line')?.source,
    ),
  ).toBe('countries');
  project.scenes[0]!.layers = [
    layerSchema.parse({
      id: 'same-layer',
      name: 'Illustrative path',
      type: 'route',
      timeRange: { start: 0, end: 12 },
      coordinates: [
        [105.85, 21.03],
        [106.7, 10.82],
      ],
      style: { color: '#ffcc55', width: 4, dash: false, arrow: true },
    }),
  ];
  await load(page, project);
  expect(
    await page.evaluate(
      () => window.studio!.renderer.map.getLayer('ams-same-layer-line')?.source,
    ),
  ).toBe('ams-same-layer');
  await page.evaluate(() => {
    const source = window.studio!.renderer.map.getSource(
      'ams-same-layer',
    )! as unknown as {
      setData: (input: unknown) => unknown;
      updateCount: number;
    };
    const original = source.setData.bind(source);
    source.updateCount = 0;
    source.setData = (input: unknown) => {
      source.updateCount++;
      return original(input);
    };
  });
  for (const time of [1, 6, 1]) {
    await page.evaluate((t) => window.studio!.seek(t), time);
    await page.evaluate(() => window.studio!.renderer.ready());
  }
  expect(
    await page.evaluate(
      () =>
        (
          window.studio!.renderer.map.getSource(
            'ams-same-layer',
          ) as unknown as { updateCount: number }
        ).updateCount,
    ),
  ).toBe(0);
  const layer = project.scenes[0]!.layers[0]!;
  if (layer.type !== 'route') throw new Error('Expected route');
  layer.coordinates[1] = [108.2, 16.06];
  await load(page, project);
  expect(
    await page.evaluate(
      () =>
        (
          window.studio!.renderer.map.getSource(
            'ams-same-layer',
          ) as unknown as { updateCount: number }
        ).updateCount,
    ),
  ).toBeGreaterThan(0);
  project.scenes[0]!.layers = [
    layerSchema.parse({
      id: 'same-layer',
      name: 'Country reference restored',
      type: 'countryHighlight',
      timeRange: { start: 0, end: 12 },
      countryCodes: ['THA'],
      style: { color: '#ffb866', stroke: '#9ef0cd', width: 1, dimOutside: 0 },
    }),
  ];
  await load(page, project);
  expect(
    await page.evaluate(() =>
      window.studio!.renderer.map.getSource('ams-same-layer'),
    ),
  ).toBeUndefined();
  expect(
    await page.evaluate(
      () => window.studio!.renderer.map.getLayer('ams-same-layer-line')?.source,
    ),
  ).toBe('countries');
});
