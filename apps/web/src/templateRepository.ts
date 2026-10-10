import { get, update } from 'idb-keyval';
import { migrateProject } from '@animatemap/project-schema';
import type { Template } from './templates';
const key = 'animatemap.templates.v1';

export function validateSavedTemplates(input: unknown): Template[] {
  if (input === undefined) return [];
  if (!Array.isArray(input) || input.length > 30)
    throw new Error('Invalid saved template library');
  const ids = new Set<string>();
  return input.map((value: unknown) => {
    if (!value || typeof value !== 'object')
      throw new Error('Invalid saved template');
    const record = value as Record<string, unknown>;
    if (
      typeof record.id !== 'string' ||
      !/^[a-zA-Z0-9_-]{1,100}$/.test(record.id) ||
      ids.has(record.id) ||
      typeof record.name !== 'string' ||
      !record.name.trim() ||
      record.name.length > 200 ||
      record.category !== 'Saved'
    )
      throw new Error('Invalid saved template metadata');
    ids.add(record.id);
    return {
      id: record.id,
      name: record.name,
      category: 'Saved',
      description: 'Saved on this device',
      project: migrateProject(record.project),
    };
  });
}

export async function readTemplates(): Promise<Template[]> {
  return validateSavedTemplates(await get(key));
}
async function changeTemplates(
  change: (templates: Template[]) => Template[],
): Promise<Template[]> {
  let result: Template[] = [];
  await update(key, (current: unknown) => {
    result = validateSavedTemplates(change(validateSavedTemplates(current)));
    if (JSON.stringify(result).length > 10 * 1024 * 1024)
      throw new Error(
        'Template library exceeds 10 MB. Delete an unused template first.',
      );
    return result;
  });
  return result;
}
export const addTemplate = (template: Template) =>
  changeTemplates((templates) => [...templates, template]);
export const deleteTemplate = (id: string) =>
  changeTemplates((templates) =>
    templates.filter((template) => template.id !== id),
  );
