import { test, expect } from '@playwright/test';
test('real map selects Vietnam, styles preserve camera, and anchors stay projected', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForFunction(() => !!window.studio);
  const point = await page.evaluate(() => {
    const p = window.studio!.renderer.map.project([106.4, 18.4]);
    return { x: p.x, y: p.y };
  });
  await page.getByTestId('map-surface').click({ position: point });
  await expect(page.getByLabel('Selected country')).toHaveValue('VNM');
  await page.getByLabel('Layer color').fill('#ff8800');
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.studio!.renderer.map.getPaintProperty(
          'ams-highlight-vn-fill',
          'fill-color',
        ),
      ),
    )
    .toBe('#ff8800');
  const camera = await page.evaluate(() =>
    window.studio!.renderer.map.getCenter().toArray(),
  );
  await page.getByLabel('Map style').selectOption('light');
  expect(
    await page.evaluate(() =>
      window.studio!.renderer.map.getCenter().toArray(),
    ),
  ).toEqual(camera);
  await page.getByLabel('Camera zoom').fill('5');
  await page.getByLabel('Camera pitch').fill('25');
  const aligned = await page.evaluate(() => {
    const p = window.studio!.renderer.map.project([105.85, 21.03]);
    const el = document.querySelector<HTMLElement>(
      '[data-layer-id="marker-0"]',
    )!;
    return (
      Math.abs(parseFloat(el.style.left) - p.x) < 0.01 &&
      Math.abs(parseFloat(el.style.top) - p.y) < 0.01
    );
  });
  expect(aligned).toBe(true);
  const polygons = await page.evaluate(
    () =>
      window.studio!.renderer.countries.features.find(
        (f) => f.properties.code === 'VNM',
      )!.geometry.type,
  );
  expect(polygons).toBe('MultiPolygon');
  await page.screenshot({ path: 'test-results/phase-1-editor.png' });
});
