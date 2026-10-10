# Phase 6B — Templates and camera presets

Status: passed locally. Phase 6A passed before this module starts.

Scope: bundled travel, highlight, portrait and multi-scene templates; local saved templates; create independent projects from templates; deterministic camera orbit/sweep/bounce/fly-to presets stored as ordinary editable v1 camera keyframes. No new project schema or external provider.

Acceptance checklist:

- [x] Template factories validate against schema v1 and preserve source attribution.
- [x] Template instances receive fresh project/scene/layer identifiers; content and saved snapshots remain independent.
- [x] Local template save/open/delete and search work through the interface and survive refresh.
- [x] Applying templates/presets supports undo/redo; presets replace the current scene's camera track and update preview immediately.
- [x] Pure preset builder handles bounds, dateline/bearing wrap and complete 360° orbit via short segments.
- [x] Unit tests, browser workflows, snapshot persistence, and real portrait/template MP4 parity pass.
- [x] Typecheck, lint, format, build, original editing/golden regressions pass.

Architecture: template factories and IndexedDB library live in the web application; pure camera preset generation lives in animation-core. Preview/export consume the same generated keyframes via evaluateProjectAt. Templates contain data and animation, not pre-rendered footage. Local templates preserve project provenance and require no service credentials.

Risks: accidentally sharing IDs/references, clearing the current project without recovery, shortest-bearing interpolation collapsing a full orbit, invalid keys at duration boundaries, and preset preview/export mismatch. Creating a template project is one undoable transaction; current project is recoverable with Undo. Saved template edits do not mutate instantiated projects and vice versa.

Validation: `pnpm check` passed strict typecheck, ESLint, 33 unit/integration tests and production build. Targeted Playwright run passed five scenarios: existing UI-built project, saved/bundled templates, preset editing and history, real portrait orbit MP4, and original golden frames. An additional cross-tab test verifies atomic saved-library updates. Template-library screenshot was visually inspected. `pnpm format:check` passed.

Actual portrait export: 1080×1920, H.264/yuv420p, 30fps, 60 decoded frames. Frames 0/15/30/45 render bearings 0/90/−180/−90 and compare against editor preview with mean RGB errors 1.867/0.973/1.920/0.969 (threshold 3). Reports: `templates-parity.json`, `templates-ffprobe.json`; output: `test-results/templates/portrait-orbit.mp4`.

Limits: saved templates are device-local (30 records/10 MB); presets intentionally replace scene camera keys. No schema changes. Next module: explicit versioned crossfade contract and shared compositing renderer.
