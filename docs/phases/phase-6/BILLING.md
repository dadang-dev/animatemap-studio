# Phase 7F — Provider billing

Status: exact-byte signature-verification foundation implemented and tested after local collaboration gates passed. Provider adapter, scoped raw-body route, billing ledger and UI integration remain pending. No provider account/API configuration exists; the real test-mode lifecycle gate remains open. This module is not complete.

Sources: [Stripe checkout subscription API](https://docs.stripe.com/api/checkout/sessions/create?api-version=2025-09-30.clover), [Stripe subscription object](https://docs.stripe.com/api/subscriptions/object?api-version=2025-09-30.clover), [Stripe webhook raw-body/signature and replay/idempotency guidance](https://docs.stripe.com/events/manage-webhook-endpoints), [Stripe's primary Node signature implementation](https://github.com/stripe/stripe-node/blob/master/src/Webhooks.ts). Pin the supported 2025-09-30.clover API contract (also recorded by Stripe's own SDK version mapping); do not infer newly changed subscription fields from memory.

Files/interfaces planned:

- Independent provider configuration/adapter and billing ledger contracts. Default is explicitly unconfigured. Server-only keys remain outside project/autosave/Git/logs. Development lifecycle accepts only test-mode provider configuration; no implicit live charging. Checkout creation uses authenticated account IDs, fixed official HTTPS API/checkout origins, server-side configured recurring prices, bounded requests/retries and idempotency keys. The adapter returns only provider-issued checkout URLs, never fabricated success.
- Exact-byte webhook signature verification before JSON parsing: HMAC-SHA256 of timestamp + dot + raw body, constant-time comparison, five-minute freshness, bounded bodies/headers and rotating v1 signatures. A separate scoped Fastify parser must retain bytes for only the webhook route; existing project APIs keep their JSON parser. Signed events need stored event IDs/idempotency, authenticated account/customer linkage, configured prices, API/test-mode checks and subscription lifecycle reconciliation before changing entitlements. Out-of-order events and cancellation/past-due status cannot silently grant paid access. A checkout redirect alone does not prove payment.
- Account-scoped billing status/checkout/portal controls with unconfigured/error states. Existing local editing/export remains independent; no fake payment or silent restrictions on working offline features. User actions that can begin a real checkout stay explicit.
- Authored webhook/provider contract fixtures clearly labeled as fixtures, plus actual raw-byte signature/parser/lifecycle storage tests. No fixture checkout/invoice counts as Stripe verification. Live test-mode lifecycle must be validated against a real configured account before closing the gate; no repeated request for credentials in chat.

Acceptance:

- [ ] Unconfigured/invalid configuration never starts a checkout or grants entitlements; keys never enter public responses/project JSON.
- [ ] Exact raw-body verification rejects modified/missing/stale/future/malformed signatures, with bounded CPU/memory.
- [ ] Verified event replay/order/customer/price/test-mode reconciliation preserves saved projects and billing state on failures.
- [ ] Authenticated UI uses real adapter responses and actionable status, with explicit local-mode limits and no simulated paid success.
- [ ] Static/unit/integration/build/format/audit and browser gates pass.
- [ ] Real provider test-mode checkout, webhook delivery, subscription update/cancel, retry and account isolation are observed; until then the live-service gate is visibly open.

Risks: no payment provider account is configured. A public endpoint requires the separate actual cloud/TLS deployment gate. Fixture protocol tests are necessary but insufficient to prove external billing. Payment/account terms, price catalog and webhook-version configuration need their actual environment; Codex authentication cannot substitute for a payment provider.

Foundation: `stripeSignature.ts` authenticates the exact Buffer with HMAC-SHA256 and constant-time v1 comparisons before any parsing, enforces ±300-second freshness, canonical single timestamps, at most five rotation signatures/ten header fields, 1024-byte headers and 1 MiB bodies. Missing/invalid configuration throws an explicit 503 without exposing keys. The standalone verifier does not grant entitlements, parse events, start checkout or claim provider connectivity. Three known-answer authored fixture tests passed: original Unicode bytes/rotation, modified whitespace/Unicode, malformed/ambiguous/missing/oversized inputs and exact freshness boundaries. Fixture secret/event names are expressly authored examples, not real Stripe credentials or signed provider events. Next: wire a scoped raw-body parser, real fixed-origin test-mode adapter, account-scoped ledger/idempotency/reconciliation and UI, then validate against an actual configured provider before closing the service gate.
