import { test, expect } from '@playwright/test';
test('build a project through UI, undo/redo, keyframes, and restore autosave', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForFunction(() => !!window.studio);
  await page.getByRole('button', { name: 'Project ▾' }).click();
  await page.getByRole('button', { name: 'New project', exact: true }).click();
  await page.getByRole('button', { name: 'Close menu' }).click();
  await page
    .getByRole('button', { name: 'Add highlight', exact: true })
    .click();
  await page.getByLabel('Layer color').fill('#aa8844');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByLabel('Layer color')).toHaveValue('#307e72');
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(page.getByLabel('Layer color')).toHaveValue('#aa8844');
  await page.getByRole('button', { name: 'Draw route' }).click();
  const map = page.getByTestId('map-surface');
  await map.click({ position: { x: 200, y: 100 } });
  await map.click({ position: { x: 300, y: 200 } });
  await map.click({ position: { x: 250, y: 300 } });
  await page.getByRole('button', { name: 'Finish route' }).click();
  await page.getByRole('button', { name: 'Add marker', exact: true }).click();
  await map.click({ position: { x: 260, y: 220 } });
  await page.getByLabel('Marker label').fill('Hà Nội');
  await page.getByRole('button', { name: 'Add text', exact: true }).click();
  await page.getByLabel('Text', { exact: true }).fill('Việt Nam · Hành trình');
  await page.getByLabel('Playhead').fill('3');
  await page.getByLabel('Camera zoom').fill('5');
  await page.getByRole('button', { name: 'Add camera keyframe · K' }).click();
  await expect(
    page.getByRole('button', { name: 'Camera keyframe 3', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Camera keyframe 3', exact: true })
    .click();
  await page.getByLabel('Keyframe time').fill('4');
  await expect(
    page.getByRole('button', { name: 'Camera keyframe 4', exact: true }),
  ).toBeVisible();
  const project = await page.evaluate(() => window.studio!.getProject());
  expect(project.scenes[0]!.layers.map((l) => l.type)).toEqual([
    'countryHighlight',
    'route',
    'marker',
    'text',
  ]);
  await expect(page.getByText('Saved locally', { exact: false })).toBeVisible();
  await page.reload();
  await page.waitForFunction(() => !!window.studio);
  expect(await page.evaluate(() => window.studio!.getProject())).toEqual(
    project,
  );
  await page.getByRole('button', { name: 'Project ▾' }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect
    .poll(async () => (await page.request.get('/api/projects')).json())
    .toContainEqual({ id: project.id, name: project.name });
  await page.screenshot({ path: 'test-results/phase-3-editor.png' });
});
