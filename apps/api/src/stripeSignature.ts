import { createHmac, timingSafeEqual } from 'node:crypto';
import { ServiceError } from './sharedStorage';
export const MAX_STRIPE_WEBHOOK_BYTES = 1024 * 1024;
/** Authenticate exact provider bytes; parsing, event dedupe and entitlement reconciliation happen separately. */
export function verifyStripeSignature(
  body: Buffer,
  header: string | undefined,
  secret: string | undefined,
  clock = Date.now,
) {
  if (!secret || !/^whsec_[\x21-\x7e]{10,240}$/.test(secret))
    throw new ServiceError('Billing webhook is not configured', 503);
  if (body.length > MAX_STRIPE_WEBHOOK_BYTES)
    throw new ServiceError('Billing webhook exceeds 1 MiB', 413);
  if (!header || header.length > 1024)
    throw new ServiceError('Invalid billing webhook signature', 400);
  const fields = header.split(',').map((field) => field.trim());
  if (fields.length > 10)
    throw new ServiceError('Invalid billing webhook signature', 400);
  const timestamps = fields
      .filter((field) => field.startsWith('t='))
      .map((field) => field.slice(2)),
    signatures = fields
      .filter((field) => field.startsWith('v1='))
      .map((field) => field.slice(3));
  if (
    timestamps.length !== 1 ||
    !/^(0|[1-9][0-9]{0,11})$/.test(timestamps[0]!) ||
    !signatures.length ||
    signatures.length > 5 ||
    signatures.some((signature) => !/^[a-fA-F0-9]{64}$/.test(signature))
  )
    throw new ServiceError('Invalid billing webhook signature', 400);
  const timestamp = timestamps[0]!,
    now = Math.floor(clock() / 1000);
  if (!Number.isFinite(now) || Math.abs(now - Number(timestamp)) > 300)
    throw new ServiceError(
      'Billing webhook timestamp outside five-minute tolerance',
      400,
    );
  const expected = createHmac('sha256', secret)
    .update(timestamp)
    .update('.')
    .update(body)
    .digest();
  let verified = false;
  for (const signature of signatures)
    verified =
      timingSafeEqual(expected, Buffer.from(signature, 'hex')) || verified;
  if (!verified)
    throw new ServiceError('Invalid billing webhook signature', 400);
}
