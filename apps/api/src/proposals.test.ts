import { test, expect } from 'vitest';
import {
  createDemo,
  projectProposalSchema,
  projectProposalJsonSchema,
  migrateProject,
} from '@animatemap/project-schema';
import { proposalFixture } from '../../../packages/project-schema/src/proposals.fixture';
import { normalizeProposal, proposalContext } from './proposals';
import { evaluateProjectAt } from '../../../packages/animation-core/src/index';
test('normalization uses exact source geometry, preserves canvas/style and creates ordinary deterministic layers', () => {
  const original = createDemo(),
    before = JSON.stringify(original),
    project = normalizeProposal(
      proposalFixture,
      original,
      '2026-10-12T00:00:00.000Z',
    );
  expect(JSON.stringify(original)).toBe(before);
  expect(project.id).toBe(original.id);
  expect(project.canvas).toEqual(original.canvas);
  expect(project.map).toEqual(original.map);
  expect(
    project.scenes[0]!.layers.find((l) => l.type === 'marker'),
  ).toMatchObject({
    anchor: { type: 'map', coordinates: [105.848068, 21.035273] },
    geographySource: { provider: 'natural-earth', sourceId: 'ne-1159151251' },
  });
  expect(migrateProject(JSON.parse(JSON.stringify(project)))).toEqual(project);
  expect(evaluateProjectAt(project, 1)).toEqual(evaluateProjectAt(project, 1));
  expect(projectProposalSchema.safeParse(proposalFixture).success).toBe(true);
  expect(JSON.stringify(projectProposalJsonSchema)).not.toContain('oneOf');
});
test('executable/remote/boundary content, unknown references, unsupported output and invalid scene timing reject', () => {
  for (const change of [
    (p: Record<string, unknown>) => {
      p.executable = 'shell command';
    },
    (p: Record<string, unknown>) => {
      p.version = 2;
    },
    (p: Record<string, unknown>) => {
      p.scenes = Array.from({ length: 6 }, () => proposalFixture.scenes[0]);
    },
  ]) {
    const proposal = structuredClone(proposalFixture) as unknown as Record<
      string,
      unknown
    >;
    change(proposal);
    expect(() => normalizeProposal(proposal, createDemo())).toThrow();
  }
  const bad = structuredClone(proposalFixture);
  bad.scenes[0]!.layers.push({
    type: 'polygon',
    url: 'https://external.invalid/polygons',
  } as never);
  expect(() => normalizeProposal(bad, createDemo())).toThrow();
  const country = structuredClone(proposalFixture);
  const highlight = country.scenes[0]!.layers[0]!;
  if (highlight.type === 'countryHighlight') highlight.countryCodes = ['ZZZ'];
  expect(() => normalizeProposal(country, createDemo())).toThrow('unknown');
  const place = structuredClone(proposalFixture);
  const marker = place.scenes[0]!.layers[1]!;
  if (marker.type === 'marker') marker.placeId = 'ne-0';
  expect(() => normalizeProposal(place, createDemo())).toThrow('unknown');
  const timing = structuredClone(proposalFixture);
  timing.scenes[0]!.layers[0]!.end = 5;
  expect(() => normalizeProposal(timing, createDemo())).toThrow();
  const camera = structuredClone(proposalFixture);
  camera.scenes[0]!.camera.push({ ...camera.scenes[0]!.camera[0]! });
  expect(() => normalizeProposal(camera, createDemo())).toThrow();
  expect(() =>
    normalizeProposal(
      {
        ...proposalFixture,
        supported: false,
        summary: 'Historical polygons are unavailable',
        scenes: [],
      },
      createDemo(),
    ),
  ).toThrow('cannot support');
});
test('bounded prompt context prioritizes named cities over generic words and excludes media/private content', () => {
  const project = createDemo();
  project.scenes[0]!.layers.push({
    ...project.scenes[0]!.layers.find((l) => l.type === 'text')!,
    id: 'private-text',
    text: 'private-text-not-for-model',
  } as never);
  const context = proposalContext(
    project,
    'Create a 2-second illustrative Vietnam travel map with Hanoi and Ho Chi Minh City; keep the camera fixed and add a title.',
  );
  expect(context.places).toHaveLength(80);
  expect(context.places.some((p) => p.id === 'ne-1159151251')).toBe(true);
  expect(context.places.some((p) => p.name === 'Ho Chi Minh City')).toBe(true);
  expect(JSON.stringify(context)).not.toContain('private-text-not-for-model');
  expect(JSON.stringify(context)).not.toContain('data:');
});
