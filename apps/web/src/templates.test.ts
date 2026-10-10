import { expect, test } from 'vitest';
import { migrateProject } from '@animatemap/project-schema';
import {
  builtInTemplates,
  instantiateTemplate,
  savedTemplate,
} from './templates';
import { validateSavedTemplates } from './templateRepository';
import { useEditor } from './store';

test('every bundled template validates, retains attribution and has isolated instances', () => {
  for (const template of builtInTemplates) {
    expect(migrateProject(template.project)).toEqual(template.project);
    const snapshot = JSON.stringify(template.project);
    const a = instantiateTemplate(template),
      b = instantiateTemplate(template);
    const ids = (project: typeof a) => [
      project.id,
      ...project.scenes.flatMap((scene) => [
        scene.id,
        ...scene.layers.map((layer) => layer.id),
      ]),
    ];
    expect(ids(a).some((id) => ids(b).includes(id))).toBe(false);
    expect(a.map.attribution).toEqual(template.project.map.attribution);
    a.scenes[0]!.layers.find(
      (layer) => layer.type === 'countryHighlight',
    )!.style.color = '#000000';
    expect(JSON.stringify(template.project)).toBe(snapshot);
  }
  expect(
    builtInTemplates.find((template) => template.category === 'Portrait')!
      .project.canvas,
  ).toEqual({ width: 1080, height: 1920, fps: 30 });
  expect(
    builtInTemplates.find((template) => template.category === 'Story')!.project
      .scenes,
  ).toHaveLength(2);
});
test('saved template records validate and snapshot project content', () => {
  const project = instantiateTemplate(builtInTemplates[0]!);
  const template = savedTemplate('My trip', project);
  project.name = 'Changed';
  expect(template.project.name).not.toBe('Changed');
  expect(validateSavedTemplates([template])).toEqual([template]);
  expect(validateSavedTemplates(undefined)).toEqual([]);
  expect(() => savedTemplate(' ', project)).toThrow('name');
  expect(() => validateSavedTemplates([template, template])).toThrow(
    'metadata',
  );
  expect(() =>
    validateSavedTemplates([{ ...template, project: { schemaVersion: 2 } }]),
  ).toThrow();
});
test('template and preset application each undo and redo without losing prior project', () => {
  useEditor.getState().load(builtInTemplates[0]!.project);
  const s = () => useEditor.getState();
  const original = s().project;
  s().applyTemplate(instantiateTemplate(builtInTemplates[2]!));
  const portrait = s().project;
  s().undo();
  expect(s().project).toBe(original);
  s().redo();
  expect(s().project).toBe(portrait);
  s().seek(3);
  s().applyCameraPreset('orbit');
  expect(s().project.scenes[0]!.camera.keyframes).toHaveLength(9);
  const preset = s().project;
  s().undo();
  expect(s().project).toBe(portrait);
  s().redo();
  expect(s().project).toBe(preset);
  s().applyCameraPreset('orbit', -10);
  expect(s().project).toBe(preset);
  expect(s().error).toContain('angle');
});
