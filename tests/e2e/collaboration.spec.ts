import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { PNG } from 'pngjs';
async function panel(page: Page) {
  await page.getByRole('button', { name: 'Project ▾' }).click();
  await page
    .getByRole('button', { name: 'Shared projects · accounts' })
    .click();
  await expect(
    page.getByRole('dialog', { name: 'Shared projects', exact: true }),
  ).toBeVisible();
}
async function register(page: Page, username: string) {
  await panel(page);
  await page.getByLabel('Shared account name').fill(username);
  await page
    .getByLabel('Shared account password')
    .fill('Authored-browser-password-123');
  await page.getByRole('button', { name: 'Register local account' }).click();
  await expect(page.getByRole('dialog')).toContainText(
    `Signed in as ${username}`,
  );
}
async function close(page: Page) {
  await page.getByRole('button', { name: 'Close shared projects' }).click();
}
async function rename(page: Page, name: string) {
  await close(page);
  await page.getByRole('button', { name: 'Project ▾' }).click();
  await page.getByLabel('Project name').fill(name);
  await page.getByRole('button', { name: 'Close menu' }).click();
  await panel(page);
}
test('two actual account sessions edit shared revisions; stale saves preserve drafts and resolve as an independent copy; membership revocation and cookie logout are enforced', async ({
  page,
  browser,
}) => {
  test.setTimeout(120000);
  const otherContext = await browser.newContext(),
    other = await otherContext.newPage(),
    suffix = Date.now().toString(36);
  const owner = `owner_${suffix}`,
    collaborator = `editor_${suffix}`;
  try {
    await page.goto('/');
    await other.goto('/');
    await page.waitForFunction(() => !!window.studio);
    await other.waitForFunction(() => !!window.studio);
    await register(page, owner);
    await register(other, collaborator);
    await page
      .getByRole('button', { name: 'Save local project as shared copy' })
      .click();
    await expect(page.getByRole('dialog')).toContainText('Loaded revision 1');
    const original = await page.evaluate(() => window.studio!.getProject());
    await page.getByLabel('Collaborator account name').fill(collaborator);
    await page.getByLabel('Collaborator role').selectOption('editor');
    await page.getByRole('button', { name: 'Grant shared access' }).click();
    await expect(page.getByRole('dialog')).toContainText('Loaded revision 2');
    await other
      .getByRole('button', { name: 'Refresh shared projects' })
      .click();
    await other
      .getByRole('button', { name: `Open shared ${original.name}` })
      .click();
    await expect(other.getByRole('dialog')).toContainText('Loaded revision 2');
    await rename(page, 'Owner saved revision');
    await page.getByRole('button', { name: 'Save shared revision' }).click();
    await expect(page.getByRole('dialog')).toContainText('Loaded revision 3');
    await rename(other, 'Editor unsaved draft');
    await other.getByRole('button', { name: 'Save shared revision' }).click();
    await expect(
      other
        .getByRole('region', { name: 'Shared revision conflict' })
        .or(other.locator('section[aria-label="Shared revision conflict"]')),
    ).toContainText('Server revision 3');
    expect((await other.evaluate(() => window.studio!.getProject())).name).toBe(
      'Editor unsaved draft',
    );
    await other
      .getByRole('button', { name: 'Keep draft as separate shared copy' })
      .click();
    await expect(other.getByRole('dialog')).toContainText('Loaded revision 1');
    expect((await other.evaluate(() => window.studio!.getProject())).name).toBe(
      'Editor unsaved draft',
    );
    await page
      .getByRole('button', { name: `Revoke shared ${collaborator}` })
      .click();
    await expect(page.getByRole('dialog')).toContainText('Loaded revision 4');
    await other
      .getByRole('button', { name: 'Refresh shared projects' })
      .click();
    await expect(
      other.getByRole('button', { name: 'Open shared Owner saved revision' }),
    ).toHaveCount(0);
    await other.getByRole('button', { name: 'Sign out', exact: true }).click();
    await expect(other.getByLabel('Shared account name')).toBeVisible();
    const denied = await other.request.get('/api/shared/projects');
    expect(denied.status()).toBe(401);
    expect((await other.evaluate(() => window.studio!.getProject())).name).toBe(
      'Editor unsaved draft',
    );
    await close(page);
    await page.reload();
    await page.waitForFunction(() => !!window.studio);
    await panel(page);
    await expect(page.getByRole('dialog')).toContainText(
      `Signed in as ${owner}`,
    );
    await page
      .getByRole('button', { name: 'Open shared Owner saved revision' })
      .click();
    expect((await page.evaluate(() => window.studio!.getProject())).name).toBe(
      'Owner saved revision',
    );
  } finally {
    await otherContext.close();
  }
});
test('real viewer permissions, failed requests and source-preserving shared loads keep the local project and ordinary rendering usable', async ({
  page,
  browser,
}) => {
  test.setTimeout(120000);
  const otherContext = await browser.newContext(),
    viewer = await otherContext.newPage(),
    suffix = Date.now().toString(36),
    viewerName = `viewer_${suffix}`;
  try {
    await page.goto('/');
    await viewer.goto('/');
    await page.waitForFunction(() => !!window.studio);
    await viewer.waitForFunction(() => !!window.studio);
    await register(page, `owner2_${suffix}`);
    await register(viewer, viewerName);
    const original = await page.evaluate(() => window.studio!.getProject());
    await page
      .getByRole('button', { name: 'Save local project as shared copy' })
      .click();
    await expect(page.getByRole('dialog')).toContainText('Loaded revision 1');
    await page.getByLabel('Collaborator account name').fill(viewerName);
    await page.getByRole('button', { name: 'Grant shared access' }).click();
    await expect(page.getByRole('dialog')).toContainText('Loaded revision 2');
    await viewer
      .getByRole('button', { name: 'Refresh shared projects' })
      .click();
    await viewer
      .getByRole('button', { name: `Open shared ${original.name}` })
      .click();
    await expect(viewer.getByRole('dialog')).toContainText('Loaded revision 2');
    await expect(
      viewer.getByRole('button', { name: 'Save shared revision' }),
    ).toBeDisabled();
    expect(await viewer.evaluate(() => window.studio!.getProject())).toEqual(
      original,
    );
    await close(viewer);
    await viewer.evaluate(() => window.studio!.seek(6));
    await viewer.evaluate(() => window.studio!.renderer.ready());
    expect(
      (await viewer.getByTestId('map-surface').screenshot()).length,
    ).toBeGreaterThan(10000);
    const compositionStyle = await viewer
      .locator('.composition')
      .getAttribute('style');
    await viewer.evaluate(() =>
      Object.assign(
        document.querySelector<HTMLElement>('.composition')!.style,
        {
          position: 'fixed',
          left: '0',
          top: '0',
          width: '1920px',
          height: '1080px',
          maxHeight: 'none',
          zIndex: '50',
        },
      ),
    );
    await viewer.evaluate(() => window.studio!.seek(6));
    await viewer.evaluate(() => window.studio!.renderer.ready());
    const preview = PNG.sync.read(
      await viewer.getByTestId('map-surface').screenshot(),
    );
    const queuedResponse = await viewer.request.post('/api/jobs', {
      data: {
        project: original,
        format: 'png',
        frameIndex: 6 * original.canvas.fps,
      },
    });
    expect(queuedResponse.ok()).toBe(true);
    const queued = await queuedResponse.json();
    await expect
      .poll(
        async () => {
          const status = await (
            await viewer.request.get(`/api/jobs/${queued.id}`)
          ).json();
          if (status.state === 'failed') throw new Error(status.error);
          return status.state;
        },
        { timeout: 60000 },
      )
      .toBe('completed');
    const png = await (
      await viewer.request.get(`/api/jobs/${queued.id}/download`)
    ).body();
    expect(PNG.sync.read(png).data.equals(preview.data)).toBe(true);
    await mkdir('test-results/collaboration', { recursive: true });
    await writeFile('test-results/collaboration/shared-viewer.png', png);
    await viewer.locator('.composition').evaluate((element, style) => {
      if (style === null) element.removeAttribute('style');
      else element.setAttribute('style', style);
    }, compositionStyle);
    await panel(viewer);
    await viewer.getByRole('button', { name: 'Sign out', exact: true }).click();
    await viewer.getByLabel('Shared account name').fill(viewerName);
    await viewer
      .getByLabel('Shared account password')
      .fill('Incorrect-browser-password');
    await viewer.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(viewer.getByRole('alert')).toContainText('Invalid account');
    expect(await viewer.evaluate(() => window.studio!.getProject())).toEqual(
      original,
    );
  } finally {
    await otherContext.close();
  }
});
