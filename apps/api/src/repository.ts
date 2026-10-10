import {
  mkdir,
  readFile,
  readdir,
  rename,
  writeFile,
  rm,
} from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { migrateProject, type Project } from '@animatemap/project-schema';
export class JsonRepository {
  constructor(private directory: string) {}
  private path(id: string) {
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id))
      throw new Error('Invalid project identifier');
    return join(this.directory, `${id}.json`);
  }
  async save(input: unknown) {
    const project = migrateProject(input);
    await mkdir(this.directory, { recursive: true });
    const target = this.path(project.id);
    const tmp = `${target}.${randomUUID()}.tmp`;
    try {
      await writeFile(tmp, JSON.stringify(project));
      await rename(tmp, target);
    } finally {
      await rm(tmp, { force: true });
    }
    return project;
  }
  async read(id: string): Promise<Project> {
    return migrateProject(JSON.parse(await readFile(this.path(id), 'utf8')));
  }
  async list() {
    await mkdir(this.directory, { recursive: true });
    const files = await readdir(this.directory);
    const projects = await Promise.all(
      files
        .filter((f) => f.endsWith('.json'))
        .map((f) => this.read(f.slice(0, -5))),
    );
    return projects.map(({ id, name }) => ({ id, name }));
  }
  async delete(id: string) {
    await rm(this.path(id), { force: true });
  }
}
