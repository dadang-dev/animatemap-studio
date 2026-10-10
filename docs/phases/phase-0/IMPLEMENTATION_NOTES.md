# Phase 0

Status: passed. `pnpm install`, `pnpm check` (typecheck/lint/4 tests/build), `pnpm format:check`, and `pnpm test:e2e` (1 browser test) passed. Initial browser test ran before Chromium download completed; rerun passed after installation. pnpm requires execution outside the Windows sandbox because realpath is denied. Original planning files preserved. Next: Phase 1 map editor.

Create workspace manifests, strict TS/lint/format configuration, schema contracts and demo fixtures, Fastify health, React launch shell, Vitest and Playwright infrastructure, CI and architecture docs. APIs: health response, Project v1, Layer union, migration entry point. Tests: fixtures, invalid coordinates/timing/IDs/versions, health integration, browser launch. Risks: dependency downloads and Chromium availability; do not advance until launch checks pass.
