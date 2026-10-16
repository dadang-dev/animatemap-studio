import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { PNG } from 'pngjs';
import {
  createDemo,
  wavDataUrl,
  type Project,
} from '../../packages/project-schema/src/index';
import { toneWav } from '../../packages/project-schema/src/audio.fixture';
function fixture() {
  const p = createDemo();
  p.id = 'karaoke-browser-fixture';
  p.canvas = { width: 960, height: 540, fps: 30 };
  p.durationSeconds = 2;
  p.scenes = [
    {
      ...p.scenes[0]!,
      durationSeconds: 2,
      camera: {
        ...p.scenes[0]!.camera,
        keyframes: [p.scenes[0]!.camera.keyframes[0]!],
      },
      layers: [],
    },
  ];
  p.captions = {
    enabled: true,
    style: {
      fontSize: 36,
      color: '#ffffff',
      background: '#111820',
      x: 0.5,
      y: 0.8,
      width: 0.8,
    },
    cues: [
      {
        id: 'unicode-words',
        text: 'Hà Nội\nViệt Nam',
        startSeconds: 0,
        endSeconds: 1.5,
        locked: false,
        words: [
          { text: 'Hà', startSeconds: 0.1, endSeconds: 0.3 },
          { text: 'Nội', startSeconds: 0.3, endSeconds: 0.5 },
          { text: 'Việt', startSeconds: 0.7, endSeconds: 0.9 },
          { text: 'Nam', startSeconds: 0.9, endSeconds: 1.2 },
        ],
      },
    ],
  };
  return p;
}
async function load(page: import('@playwright/test').Page, p: Project) {
  await page.goto('/');
  await page.waitForFunction(() => !!window.studio);
  await page.getByLabel('Import project JSON').setInputFiles({
    name: 'karaoke.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(p)),
  });
  await expect
    .poll(() => page.evaluate(() => window.studio!.getProject().id))
    .toBe(p.id);
}
test('karaoke UI uses half-open real word ranges, preserves Unicode/newlines, footer setting and refresh', async ({
  page,
}) => {
  await load(page, fixture());
  await page
    .getByRole('button', { name: 'Audio & captions', exact: true })
    .click();
  await page.getByLabel('Highlight spoken word').check();
  await page.getByLabel('Word highlight color').fill('#ffd84d');
  await page.getByLabel('Show source footer').uncheck();
  await page.getByRole('button', { name: 'Close audio', exact: true }).click();
  for (const [t, text] of [
    [0.2, 'Hà'],
    [0.3, 'Nội'],
    [0.8, 'Việt'],
    [1, 'Nam'],
  ] as const) {
    await page.evaluate(async (t) => {
      window.studio!.seek(t);
      await window.studio!.renderer.ready();
    }, t);
    await expect(
      page.locator('.project-captions [data-active="true"]'),
    ).toHaveText(text);
    await expect(page.locator('.project-captions')).toHaveText(
      'Hà Nội\nViệt Nam',
    );
    await expect(page.locator('.map-credit')).toHaveCount(0);
  }
  await page.evaluate(async () => {
    window.studio!.seek(0.6);
    await window.studio!.renderer.ready();
  });
  await expect(
    page.locator('[data-caption-word][data-active="true"]'),
  ).toHaveCount(0);
  const p = await page.evaluate(() => window.studio!.getProject());
  await expect(page.getByText('Saved locally', { exact: false })).toBeVisible();
  await page.reload();
  await page.waitForFunction(() => !!window.studio);
  await expect
    .poll(() => page.evaluate(() => window.studio!.getProject()))
    .toEqual(p);
});
test('word highlighting is pixel-identical in editor and native export renderer across repeated seeks', async ({
  page,
  context,
}) => {
  const p = fixture();
  p.captions.style.wordHighlight = true;
  p.map.creditVisibility = 'hidden';
  await load(page, p);
  await page.evaluate(() =>
    Object.assign(document.querySelector<HTMLElement>('.composition')!.style, {
      position: 'fixed',
      left: '0',
      top: '0',
      width: '960px',
      height: '540px',
      maxHeight: 'none',
      zIndex: '50',
    }),
  );
  const render = await context.newPage();
  await render.setViewportSize({ width: 960, height: 540 });
  await render.goto('http://127.0.0.1:5174/render');
  await render.waitForFunction(() => !!window.renderStudio);
  await render.evaluate((p) => window.renderStudio!.load(p), p);
  for (const frame of [6, 9, 18, 24, 33]) {
    await page.evaluate(async (t) => {
      window.studio!.seek(t);
      await window.studio!.renderer.ready();
    }, frame / 30);
    await render.evaluate((i) => window.renderStudio!.frame(i), frame);
    const a = PNG.sync.read(await page.getByTestId('map-surface').screenshot()),
      b = PNG.sync.read(await render.screenshot());
    expect(a.data.equals(b.data)).toBe(true);
    await page.evaluate(async () => {
      window.studio!.seek(1.8);
      await window.studio!.renderer.ready();
    });
    await page.evaluate(async (t) => {
      window.studio!.seek(t);
      await window.studio!.renderer.ready();
    }, frame / 30);
    expect(
      PNG.sync
        .read(await page.getByTestId('map-surface').screenshot())
        .data.equals(a.data),
    ).toBe(true);
  }
  await render.close();
});
test('voice selection previews then explicitly applies scene voice with undo; network is a labelled protocol fixture', async ({
  page,
}) => {
  const p = fixture();
  p.captions.cues = [
    {
      id: 'script',
      text: 'Xin chào.',
      startSeconds: 0,
      endSeconds: 0.8,
      locked: false,
    },
  ];
  await page.route('**/api/voice/voices?**', (route) =>
    route.fulfill({
      json: {
        voices: [
          {
            id: 'edge_fixture',
            name: 'Fixture female',
            gender: 'Female',
            locale: 'vi-VN',
            preview: false,
          },
        ],
        pagination: { has_more: false },
      },
    }),
  );
  await page.route('**/api/voice/generate', async (route) => {
    expect(route.request().postDataJSON().voiceId).toBe('edge_fixture');
    await route.fulfill({
      json: {
        voiceId: 'edge_fixture',
        voiceName: 'Fixture female',
        durationSeconds: 0.5,
        creditCost: 0,
        dataUrl: wavDataUrl(toneWav(0.5, 1)),
        words: [
          { text: 'Xin', startSeconds: 0.05, endSeconds: 0.2 },
          { text: 'chào.', startSeconds: 0.2, endSeconds: 0.4 },
        ],
      },
    });
  });
  await load(page, p);
  await page
    .getByRole('button', { name: 'Audio & captions', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Load Vietnamese voices', exact: true })
    .click();
  await expect(page.getByLabel('AI33 voice', { exact: true })).toHaveValue(
    'edge_fixture',
  );
  const beforeSample = await page.evaluate(() => window.studio!.getProject());
  await page
    .getByRole('button', {
      name: 'Generate short sample · uses credits',
      exact: true,
    })
    .click();
  await expect(page.getByLabel('Generated short voice sample')).toBeVisible();
  expect(await page.evaluate(() => window.studio!.getProject())).toEqual(
    beforeSample,
  );
  await page
    .getByRole('button', {
      name: 'Generate video voice from captions',
      exact: true,
    })
    .click();
  await expect(
    page.getByRole('region', { name: 'Review generated voice' }),
  ).toBeVisible();
  expect(
    (await page.evaluate(() => window.studio!.getProject())).audioTracks,
  ).toHaveLength(0);
  await page
    .getByRole('button', {
      name: 'Apply reviewed voice and karaoke',
      exact: true,
    })
    .click();
  await page.getByRole('button', { name: 'Close audio', exact: true }).click();
  const next = await page.evaluate(() => window.studio!.getProject());
  expect(next.audioTracks).toHaveLength(1);
  expect(next.captions.cues[0]!.words).toHaveLength(2);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  expect(
    (await page.evaluate(() => window.studio!.getProject())).audioTracks,
  ).toHaveLength(0);
  await mkdir('test-results/karaoke', { recursive: true });
  await writeFile(
    'test-results/karaoke/voice-protocol-fixture.json',
    JSON.stringify({
      purpose: 'Synthetic UI protocol fixture; no real API billing in E2E',
      passed: true,
    }),
  );
});
