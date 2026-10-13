import type { Page } from 'playwright';
import type { RenderState } from '@animatemap/animation-core';
import {
  depthFrameMetadataSchema,
  multipassFrameSchema,
  type MultipassFrame,
  type GraphicPass,
  type GraphicPlane,
} from '@animatemap/project-schema';
import type { GraphicArchive } from './graphicArchive';

/** The frame is evaluated once; all passes read that same ready scene state. */
export async function captureGraphicFrame(
  page: Page,
  index: number,
  fps: number,
  state: RenderState,
  archive: GraphicArchive,
  sourceCredits: Set<string>,
): Promise<MultipassFrame> {
  const prefix = `frames/${String(index).padStart(6, '0')}/`;
  async function png(
    pass: GraphicPass,
    name: string,
    plane: GraphicPlane = 'incoming',
  ) {
    const result = await page.evaluate(
      async ({ pass, plane }) => window.renderStudio!.pass(pass, plane),
      { pass, plane },
    );
    for (const credit of result.sourceCredits) sourceCredits.add(credit);
    await archive.add(
      `${prefix}${name}.png`,
      await page.screenshot({
        type: 'png',
        animations: 'disabled',
        omitBackground: true,
      }),
    );
    return result.depth;
  }
  await png('reference', 'reference');
  await png('captions', 'captions');
  async function scene(plane: GraphicPlane, sceneId: string | null) {
    await png('map', `${plane}-map`, plane);
    await png('overlay', `${plane}-overlay`, plane);
    const depthMetadata = depthFrameMetadataSchema.parse(
      await png('depth', `${plane}-depth`, plane),
    );
    return {
      sceneId,
      map: `${prefix}${plane}-map.png`,
      overlay: `${prefix}${plane}-overlay.png`,
      depth: `${prefix}${plane}-depth.png`,
      depthMetadata,
    };
  }
  const incoming = await scene('incoming', state.sceneId ?? null),
    outgoing = state.blend
      ? await scene('outgoing', state.blend.outgoing.sceneId)
      : undefined;
  return multipassFrameSchema.parse({
    index,
    timeSeconds: index / fps,
    camera: state.camera,
    incomingWeight: state.blend?.incomingWeight ?? 1,
    reference: `${prefix}reference.png`,
    captions: `${prefix}captions.png`,
    incoming,
    ...(outgoing ? { outgoing } : {}),
  });
}
