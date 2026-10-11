import { readFile } from 'node:fs/promises';
import { expect, test } from 'vitest';
import {
  createDemo,
  migrateProject,
  type Admin1Regions,
} from '@animatemap/project-schema';
import { evaluateProjectAt } from '@animatemap/animation-core';
import { useEditor } from './store';
import { instantiateTemplate, savedTemplate } from './templates';
import { addAdmin1Highlight, focusAdmin1Region } from './admin1Operations';

test('region highlight transactions preserve geometry references, history/locking/templates and deterministic opacity', async () => {
  const regions = JSON.parse(
    await readFile(
      new URL(
        '../../../apps/web/public/data/admin1/VNM.geojson',
        import.meta.url,
      ),
      'utf8',
    ),
  ) as Admin1Regions;
  const region = regions.features.find(
    (region) => region.properties.name === 'Kon Tum',
  )!;
  useEditor.getState().load(createDemo());
  useEditor
    .getState()
    .edit((project) =>
      addAdmin1Highlight(project, 'scene-1', [region], 'region-test'),
    );
  useEditor.setState({ selected: 'region-test' });
  useEditor.getState().patchLayer((layer) => {
    layer.tracks.opacity = [
      { time: 0, value: 0, easing: 'linear' },
      { time: 12, value: 1, easing: 'linear' },
    ];
  });
  const project = useEditor.getState().project;
  expect(
    evaluateProjectAt(project, 6).layers.find(
      (layer) => layer.id === 'region-test',
    )!.opacity,
  ).toBe(0.5);
  expect(migrateProject(JSON.parse(JSON.stringify(project)))).toEqual(project);
  expect(
    instantiateTemplate(savedTemplate('Regions', project)).scenes[0]!.layers.at(
      -1,
    )!.type,
  ).toBe('admin1Highlight');
  useEditor.getState().undo();
  useEditor.getState().redo();
  expect(useEditor.getState().project).toEqual(project);
  useEditor.getState().edit((project) => {
    project.scenes[0]!.layers.at(-1)!.locked = true;
  });
  const locked = useEditor.getState().project;
  useEditor.getState().patchLayer((layer) => {
    layer.opacity = 0;
  });
  expect(useEditor.getState().project).toBe(locked);
  expect(
    focusAdmin1Region(region, project.scenes[0]!.camera.keyframes[0]!.value)
      .lng,
  ).toBe(region.properties.labelLng);
});
test('missing label focus uses short dateline bounds and clamps polar camera latitude', () => {
  const region: Admin1Regions['features'][number] = {
    type: 'Feature',
    properties: {
      code: 'test',
      sourceCode: 'test',
      countryCode: 'test',
      name: 'Synthetic geometry for focus test',
      localName: null,
      type: null,
      isoCode: null,
      labelLng: null,
      labelLat: null,
    },
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [179, 89],
          [-179, 89],
          [-179, 90],
          [179, 90],
          [179, 89],
        ],
      ],
    },
  };
  const camera = focusAdmin1Region(region, {
    lng: 0,
    lat: 0,
    zoom: 1,
    bearing: 17,
    pitch: 30,
  });
  expect(Math.abs(camera.lng)).toBe(180);
  expect(camera.lat).toBe(85);
  expect(camera.bearing).toBe(17);
});
