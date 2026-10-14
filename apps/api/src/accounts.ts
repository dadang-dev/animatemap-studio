import {
  randomBytes,
  randomUUID,
  createHash,
  scrypt,
  timingSafeEqual,
} from 'node:crypto';
import { join } from 'node:path';
import {
  accountStoreSchema,
  credentialsSchema,
  type Account,
} from '@animatemap/project-schema/collaboration';
import {
  atomicJSON,
  boundedJSON,
  SerializedOperations,
  ServiceError,
} from './sharedStorage';
const SESSION_MS = 7 * 24 * 60 * 60 * 1000,
  AUTH_BYTES = 512 * 1024;
const digest = (token: string) =>
  createHash('sha256').update(token).digest('hex');
const publicAccount = (user: Account): Account => ({
  id: user.id,
  username: user.username,
});
async function derive(password: string, salt: string) {
  return new Promise<Buffer>((resolve, reject) =>
    scrypt(
      Buffer.from(password, 'utf8'),
      Buffer.from(salt, 'hex'),
      64,
      { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 },
      (error, key) => (error ? reject(error) : resolve(key)),
    ),
  );
}
export class AccountService {
  private operations = new SerializedOperations();
  private attempts = new Map<string, { start: number; count: number }>();
  constructor(
    private directory: string,
    private clock = Date.now,
  ) {}
  private async read() {
    try {
      return accountStoreSchema.parse(
        await boundedJSON(join(this.directory, 'accounts.json'), AUTH_BYTES),
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT')
        return accountStoreSchema.parse({
          version: 1,
          users: [],
          sessions: [],
        });
      throw error;
    }
  }
  private limit(key: string) {
    const now = this.clock();
    for (const [id, attempt] of this.attempts)
      if (now - attempt.start >= 60000) this.attempts.delete(id);
    const attempt = this.attempts.get(key) ?? { start: now, count: 0 };
    if (
      attempt.count >= 10 ||
      (!this.attempts.has(key) && this.attempts.size >= 1000)
    )
      throw new ServiceError(
        'Too many sign-in attempts; retry in one minute',
        429,
      );
    attempt.count++;
    this.attempts.set(key, attempt);
  }
  authenticate(token: string | undefined) {
    return this.operations.run(async () => {
      if (!token || !/^[a-f0-9]{64}$/.test(token))
        throw new ServiceError('Sign in required', 401);
      const store = await this.read();
      const session = store.sessions.find(
        (session) =>
          session.tokenHash === digest(token) &&
          session.expiresAt > this.clock(),
      );
      const user = store.users.find((user) => user.id === session?.userId);
      if (!user) throw new ServiceError('Session expired; sign in again', 401);
      return publicAccount(user);
    });
  }
  async credentials(input: unknown, register: boolean, client: string) {
    this.limit(`ip:${client}`);
    const credentials = credentialsSchema.parse(input);
    this.limit(`name:${credentials.username}`);
    return this.operations.run(async () => {
      const store = await this.read();
      let user = store.users.find(
        (user) => user.username === credentials.username,
      );
      if (register) {
        if (user)
          throw new ServiceError('Account name is already registered', 409);
        if (store.users.length >= 100)
          throw new ServiceError('Local account limit reached', 429);
        const salt = randomBytes(16).toString('hex'),
          key = await derive(credentials.password, salt);
        user = {
          id: randomUUID(),
          username: credentials.username,
          salt,
          hash: key.toString('hex'),
          algorithm: 'scrypt-N131072-r8-p1' as const,
        };
        store.users.push(user);
      } else {
        const key = await derive(
          credentials.password,
          user?.salt ?? '0'.repeat(32),
        );
        const matches = timingSafeEqual(
          key,
          Buffer.from(user?.hash ?? '0'.repeat(128), 'hex'),
        );
        if (!user || !matches)
          throw new ServiceError('Invalid account name or password', 401);
      }
      const token = randomBytes(32).toString('hex');
      store.sessions = store.sessions.filter(
        (session) => session.expiresAt > this.clock(),
      );
      if (
        store.sessions.filter((session) => session.userId === user.id).length >=
          5 ||
        store.sessions.length >= 200
      )
        throw new ServiceError(
          'Session limit reached; sign out an existing session',
          429,
        );
      store.sessions.push({
        tokenHash: digest(token),
        userId: user.id,
        expiresAt: this.clock() + SESSION_MS,
      });
      await atomicJSON(
        join(this.directory, 'accounts.json'),
        accountStoreSchema.parse(store),
        AUTH_BYTES,
      );
      return { account: publicAccount(user), token };
    });
  }
  logout(token: string | undefined) {
    return this.operations.run(async () => {
      const store = await this.read();
      store.sessions = store.sessions.filter(
        (session) => session.tokenHash !== digest(token ?? ''),
      );
      await atomicJSON(
        join(this.directory, 'accounts.json'),
        store,
        AUTH_BYTES,
      );
    });
  }
  lookup(username: string) {
    return this.operations.run(async () => {
      const user = (await this.read()).users.find(
        (user) => user.username === username,
      );
      return user ? publicAccount(user) : null;
    });
  }
}
