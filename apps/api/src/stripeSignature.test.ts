import { test, expect } from 'vitest';
import {
  verifyStripeSignature,
  MAX_STRIPE_WEBHOOK_BYTES,
} from './stripeSignature';
const body = Buffer.from('{"id":"evt_authored","name":"Việt Nam"}', 'utf8'),
  secret = 'whsec_authored_fixture_only',
  timestamp = '1800000000',
  signature =
    '6fcef6fdd3ba33e2f04a3670002ea894dbb20f063e1bb19131a620406399f512',
  header = `t=${timestamp},v1=${signature}`,
  clock = () => 1800000000000;
// Authored known-answer protocol fixture, not a real Stripe event or provider verification.
test('known-answer raw UTF-8 fixture authenticates without parsing, including bounded rotating v1 signatures', () => {
  expect(() =>
    verifyStripeSignature(body, header, secret, clock),
  ).not.toThrow();
  expect(() =>
    verifyStripeSignature(
      body,
      `t=${timestamp},v1=${'0'.repeat(64)},v0=legacy,v1=${signature}`,
      secret,
      clock,
    ),
  ).not.toThrow();
  expect(() =>
    verifyStripeSignature(
      Buffer.from(body.toString().replace(':', ': ')),
      header,
      secret,
      clock,
    ),
  ).toThrow('Invalid');
  expect(() =>
    verifyStripeSignature(
      Buffer.from(body.toString().replace('Việt', 'Viet')),
      header,
      secret,
      clock,
    ),
  ).toThrow('Invalid');
});
test('missing/unconfigured/malformed/ambiguous and oversized inputs reject without exposing keys or accepting arbitrary signatures', () => {
  expect(() => verifyStripeSignature(body, header, undefined, clock)).toThrow(
    'not configured',
  );
  for (const value of [
    undefined,
    '',
    `t=${timestamp}`,
    `t=${timestamp},t=${timestamp},v1=${signature}`,
    `t=01800000000,v1=${signature}`,
    `t=NaN,v1=${signature}`,
    `t=${timestamp},v1=not-hex`,
    `t=${timestamp},${Array.from({ length: 6 }, () => `v1=${signature}`).join(',')}`,
    'x'.repeat(1025),
  ])
    expect(() => verifyStripeSignature(body, value, secret, clock)).toThrow(
      'Invalid',
    );
  expect(() =>
    verifyStripeSignature(
      Buffer.alloc(MAX_STRIPE_WEBHOOK_BYTES + 1),
      header,
      secret,
      clock,
    ),
  ).toThrow('1 MiB');
  expect(() =>
    verifyStripeSignature(
      body,
      `t=${timestamp},v1=${'a'.repeat(64)}`,
      secret,
      clock,
    ),
  ).toThrow('Invalid');
});
test('five-minute timestamp boundary is explicit; stale/future and invalid clocks reject', () => {
  for (const seconds of [-300, 300])
    expect(() =>
      verifyStripeSignature(
        body,
        header,
        secret,
        () => clock() + seconds * 1000,
      ),
    ).not.toThrow();
  for (const seconds of [-301, 301])
    expect(() =>
      verifyStripeSignature(
        body,
        header,
        secret,
        () => clock() + seconds * 1000,
      ),
    ).toThrow('tolerance');
  expect(() => verifyStripeSignature(body, header, secret, () => NaN)).toThrow(
    'tolerance',
  );
});
