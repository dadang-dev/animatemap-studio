import { z } from 'zod';
import { projectSchema } from './index';
export const accountNameSchema = z
  .string()
  .min(3)
  .max(40)
  .regex(/^[a-zA-Z0-9_-]+$/)
  .transform((value) => value.toLowerCase());
export const credentialsSchema = z.strictObject({
  username: accountNameSchema,
  password: z
    .string()
    .min(12)
    .max(128)
    .refine(
      (value) => new TextEncoder().encode(value).length <= 256,
      'Password exceeds 256 UTF-8 bytes',
    ),
});
export const accountSchema = z.strictObject({
  id: z.uuid(),
  username: accountNameSchema,
});
export type Account = z.infer<typeof accountSchema>;
export const sharedRoleSchema = z.enum(['owner', 'editor', 'viewer']);
export const sharedMemberSchema = accountSchema.extend({
  role: sharedRoleSchema,
});
export const sharedHeaderSchema = z
  .strictObject({
    format: z.literal('animatemap-shared-project'),
    version: z.literal(1),
    id: z.uuid(),
    revision: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
    updatedAt: z.iso.datetime(),
    members: z.array(sharedMemberSchema).min(1).max(20),
  })
  .superRefine((document, ctx) => {
    if (
      document.members.filter((member) => member.role === 'owner').length !==
        1 ||
      new Set(document.members.map((member) => member.id)).size !==
        document.members.length
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Shared project requires exactly one owner and unique members',
      });
  });
export const sharedDocumentSchema = sharedHeaderSchema.safeExtend({
  project: projectSchema,
});
export type SharedDocument = z.infer<typeof sharedDocumentSchema>;
export const sharedUpdateSchema = z.strictObject({
  revision: z.number().int().positive(),
  project: projectSchema,
});
export const sharedMembershipSchema = z.strictObject({
  revision: z.number().int().positive(),
  username: accountNameSchema,
  role: z.enum(['editor', 'viewer']).nullable(),
});
export const MAX_SHARED_BYTES = 32 * 1024 * 1024;

const secret = z.string().regex(/^[a-f0-9]{128}$/),
  salt = z.string().regex(/^[a-f0-9]{32}$/),
  tokenHash = z.string().regex(/^[a-f0-9]{64}$/);
export const accountStoreSchema = z
  .strictObject({
    version: z.literal(1),
    users: z
      .array(
        accountSchema.extend({
          salt,
          hash: secret,
          algorithm: z.literal('scrypt-N131072-r8-p1'),
        }),
      )
      .max(100),
    sessions: z
      .array(
        z.strictObject({
          tokenHash,
          userId: z.uuid(),
          expiresAt: z.number().int().nonnegative().max(8640000000000000),
        }),
      )
      .max(200),
  })
  .superRefine((store, ctx) => {
    if (
      new Set(store.users.map((user) => user.id)).size !== store.users.length ||
      new Set(store.users.map((user) => user.username)).size !==
        store.users.length ||
      new Set(store.sessions.map((session) => session.tokenHash)).size !==
        store.sessions.length ||
      store.sessions.some(
        (session) => !store.users.some((user) => user.id === session.userId),
      )
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Invalid account/session identities',
      });
  });
