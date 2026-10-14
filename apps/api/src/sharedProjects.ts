import { readdir, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { migrateProject } from '@animatemap/project-schema';
import {
  MAX_SHARED_BYTES,
  sharedDocumentSchema,
  sharedMembershipSchema,
  sharedUpdateSchema,
  type Account,
  type SharedDocument,
} from '@animatemap/project-schema/collaboration';
import {
  atomicJSON,
  boundedJSON,
  SerializedOperations,
  ServiceError,
} from './sharedStorage';
import { AccountService } from './accounts';
export class SharedConflict extends ServiceError {
  constructor(public document: SharedDocument) {
    super(
      'Shared project changed; load the server revision or save your draft as a separate project',
      409,
    );
  }
}
export class SharedProjects {
  private operations = new SerializedOperations();
  constructor(
    private directory: string,
    private accounts: AccountService,
  ) {}
  private path(id: string) {
    if (
      !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id)
    )
      throw new ServiceError('Invalid shared project identifier', 400);
    return join(this.directory, `${id}.json`);
  }
  private async files() {
    try {
      return (await readdir(this.directory)).filter((file) =>
        /^[a-f0-9-]{36}\.json$/.test(file),
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }
  }
  private async read(id: string) {
    try {
      const document = sharedDocumentSchema.parse(
        await boundedJSON(this.path(id), MAX_SHARED_BYTES),
      );
      if (document.id !== id)
        throw new ServiceError('Stored shared project identity mismatch', 503);
      return document;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT')
        throw new ServiceError('Shared project not found', 404);
      throw error;
    }
  }
  private member(
    document: SharedDocument,
    account: Account,
    write = false,
    owner = false,
  ) {
    const member = document.members.find((member) => member.id === account.id);
    if (!member) throw new ServiceError('Shared project not found', 404);
    if (
      (write && member.role === 'viewer') ||
      (owner && member.role !== 'owner')
    )
      throw new ServiceError(
        'Your shared project role does not permit this action',
        403,
      );
    return member;
  }
  private revision(document: SharedDocument, expected: number) {
    if (document.revision !== expected) throw new SharedConflict(document);
  }
  private async save(document: SharedDocument) {
    const parsed = sharedDocumentSchema.parse(document);
    const bytes = Buffer.byteLength(JSON.stringify(parsed));
    let total = bytes;
    const files = await this.files();
    if (files.length >= 30 && !files.includes(`${document.id}.json`))
      throw new ServiceError('Shared document limit reached (30)', 429);
    for (const file of files)
      if (file !== `${document.id}.json`)
        total += (await stat(join(this.directory, file))).size;
    if (total > 256 * 1024 * 1024)
      throw new ServiceError(
        'Shared storage limit reached (256 MiB); delete unused documents',
        413,
      );
    await atomicJSON(this.path(document.id), parsed, MAX_SHARED_BYTES);
    return parsed;
  }
  list(account: Account) {
    return this.operations.run(async () => {
      const documents = [];
      for (const file of await this.files()) {
        const document = await this.read(file.slice(0, -5));
        const membership = document.members.find(
          (member) => member.id === account.id,
        );
        if (membership)
          documents.push({
            id: document.id,
            revision: document.revision,
            name: document.project.name,
            role: membership.role,
            updatedAt: document.updatedAt,
          });
      }
      return documents;
    });
  }
  get(account: Account, id: string) {
    return this.operations.run(async () => {
      const document = await this.read(id);
      this.member(document, account);
      return document;
    });
  }
  create(account: Account, input: unknown) {
    return this.operations.run(async () =>
      this.save({
        format: 'animatemap-shared-project',
        version: 1,
        id: randomUUID(),
        revision: 1,
        updatedAt: new Date().toISOString(),
        project: migrateProject(input),
        members: [{ ...account, role: 'owner' }],
      }),
    );
  }
  update(account: Account, id: string, input: unknown) {
    return this.operations.run(async () => {
      const document = await this.read(id);
      this.member(document, account, true);
      const update = sharedUpdateSchema.parse(input);
      this.revision(document, update.revision);
      return this.save({
        ...document,
        project: update.project,
        revision: document.revision + 1,
        updatedAt: new Date().toISOString(),
      });
    });
  }
  membership(account: Account, id: string, input: unknown) {
    return this.operations.run(async () => {
      const document = await this.read(id);
      this.member(document, account, true, true);
      const update = sharedMembershipSchema.parse(input);
      this.revision(document, update.revision);
      const target = await this.accounts.lookup(update.username);
      if (!target)
        throw new ServiceError(
          'Account name not found; the collaborator must register first',
          404,
        );
      if (
        document.members.find((member) => member.id === target.id)?.role ===
        'owner'
      )
        throw new ServiceError(
          'The project owner cannot be changed or removed',
          403,
        );
      const members = document.members.filter(
        (member) => member.id !== target.id,
      );
      if (update.role) members.push({ ...target, role: update.role });
      return this.save({
        ...document,
        members,
        revision: document.revision + 1,
        updatedAt: new Date().toISOString(),
      });
    });
  }
  delete(account: Account, id: string, expected: number) {
    return this.operations.run(async () => {
      if (!Number.isSafeInteger(expected) || expected < 1)
        throw new ServiceError('A valid shared revision is required', 400);
      const document = await this.read(id);
      this.member(document, account, true, true);
      this.revision(document, expected);
      await rm(this.path(id));
      return { deleted: true };
    });
  }
}
