# Phase 6C — Crossfade

Status: passed; Phase 6B passed and was committed first.

Contract: schema v2 adds an incoming scene transition (`cut` or `crossfade` with duration). Real v1 projects migrate to v2 with cuts; no camera/layer/data content changes. Reject unsupported future versions. Crossfades require an adjacent preceding scene and a duration bounded by the incoming scene.

Compositing model: the next scene starts at the existing boundary. During its transition, blend its live deterministic state over the previous scene's final visible frame. The outgoing frame is held; scene/project durations and scene-local keys are unchanged. Opacity is linear project time, with no CSS animation or wall clock. Preview and export use the same two-map compositor. At most two map instances are live; readiness and failures cover both.

Acceptance checklist:

- [x] Validated v2 transition contract and tested v1 migration/content preservation.
- [x] Pure blend state at 0/50/100%, correct layers/cameras, cuts unchanged.
- [x] Shared compositor renders actual map/text/marker crossfade and awaits both maps.
- [x] Scene controls, undo/redo, persistence, resize/reorder/delete invariants.
- [x] Browser checks repeated seeks, canvas cleanup, legacy import, failure handling.
- [x] Real MP4/decoded-frame parity through transition plus original 360-frame/golden regressions.
- [x] Typecheck, lint, unit/integration tests, format and production build pass.

Validation: `pnpm check` passed 36 unit/integration tests, strict typecheck, lint and production builds. `pnpm test:e2e` passed all 23 scenarios in 5 minutes, including the original 360-frame export, portrait orbit and scene cuts. `pnpm format:check` passes after formatting reports. The crossfade MP4 is 1920×1080/30 FPS with 90 frames. Decoded frame errors at frames 30/45/60 are 0.783/0.729/0.822 mean RGB units (limit 3/255); reports are adjacent JSON files. Reviewed video is retained locally at `.local/reviewed/crossfade.mp4` and excluded from Git.

Risks: migration dropping animation, invalid first-scene fades, resource leaks, using incoming coordinates for outgoing overlays, asynchronous map readiness, and alpha differences across encoding. Earlier schema reports remain historical evidence; current documentation must identify v2.
