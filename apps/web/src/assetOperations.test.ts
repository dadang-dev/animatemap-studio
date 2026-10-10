import { expect, test } from 'vitest';
import { createDemo, migrateProject } from '@animatemap/project-schema';
import {
  evaluateProjectAt,
  createAnimationStyle,
} from '@animatemap/animation-core';
import { testImage } from '../../../packages/project-schema/src/assets.fixture';
import { addAssetLayer, deleteUnusedAsset } from './assetOperations';
import { useEditor } from './store';
import { instantiateTemplate, savedTemplate } from './templates';
import { jpegDimensions } from './imageImport';

test('shared assets survive scene/template copies, history and failed referenced deletion', () => {
  const state = () => useEditor.getState();
  state().load(createDemo());
  state().edit((project) =>
    addAssetLayer(
      project,
      'scene-1',
      testImage(),
      'image',
      'VNM',
      'image-layer',
    ),
  );
  const project = state().project;
  const image = project.scenes[0]!.layers.find(
    (layer) => layer.type === 'image',
  )!;
  const template = instantiateTemplate(savedTemplate('Images', project));
  expect(template.assets).toEqual(project.assets);
  expect(
    template.scenes[0]!.layers.find((layer) => layer.type === 'image')!.assetId,
  ).toBe(image.assetId);
  state().undo();
  expect(state().project.assets).toHaveLength(0);
  state().redo();
  expect(state().project).toEqual(project);
  state().edit((project) => deleteUnusedAsset(project, image.assetId));
  expect(state().project).toBe(project);
  expect(state().error).toContain('used by a layer');
  const copied = structuredClone(project);
  addAssetLayer(copied, 'scene-1', testImage(), 'image', 'VNM', 'second-image');
  expect(copied.assets).toHaveLength(1);
  expect(migrateProject(copied)).toEqual(copied);
});
test('image animation evaluates deterministic absolute transforms and opacity', () => {
  const project = createDemo();
  addAssetLayer(project, 'scene-1', testImage(), 'image', 'VNM', 'image-layer');
  const image = project.scenes[0]!.layers.at(-1)!;
  Object.assign(image.tracks, createAnimationStyle(image, 'pop', 1));
  const value = evaluateProjectAt(project, 0.5);
  expect(value).toEqual(evaluateProjectAt(project, 0.5));
  expect(value.layers.at(-1)!.transform.scale).toBeGreaterThan(0.1);
  expect(value.layers.at(-1)!.opacity).toBe(0.75);
});
test('JPEG frame header dimensions reject oversized/truncated data before decoding', () => {
  const input = new Uint8Array([255, 216, 255, 192, 0, 8, 8, 0, 32, 0, 64, 0]);
  expect(jpegDimensions(input)).toEqual({ width: 64, height: 32 });
  input[9] = 32;
  expect(() => jpegDimensions(input)).toThrow('4096');
  expect(() => jpegDimensions(input.subarray(0, 8))).toThrow('Truncated');
});
