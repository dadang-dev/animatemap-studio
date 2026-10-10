# Phase 6F — Geographic shapes and Bezier editor

Status: gate passed on 2026-10-10; real export-format gate passed first.

Files/interfaces: schema v5 adds a discriminated `shape` layer with line/arrow/Bezier kinds, WGS84 coordinates, line styling and reveal track. Bezier stores exactly four control points; evaluated render state carries its sampled path separately. Retain v1–v4 validators/migration and existing data. Shared geometry core unwraps control longitudes before cubic interpolation, samples a deterministic curve, and trims it geodesically. MapRenderer draws shapes through the same sources/arrow overlays as routes.

Editor: toolbar tools create line/arrow from two or more map clicks and Bezier from four clicks (start, control 1, control 2, end). Inspector edits coordinates and can reposition a selected point with a map click; projected numbered controls show the curve while editing. Edits are single undoable transactions; locking prevents geometry edits. Controls belong to the editor and are excluded from exports.

Acceptance:

- [x] v1–v4 migration preserves content; malformed shape/control coordinates and future versions reject.
- [x] Cubic endpoints/midpoint, repeated evaluation, reveal 0/50/100% and antimeridian paths are correct and deterministic.
- [x] Users create and edit line/arrow/Bezier through the UI; styling/reveal, locking/history/persistence/JSON round-trip work.
- [x] Control overlays stay aligned during pan/zoom/pitch and never enter export frames.
- [x] Real MP4 shape animation matches preview at sampled reveal times.
- [x] Static/unit/integration/build/format and relevant browser/golden regressions pass.

Validation: `pnpm check` passed typecheck, lint, 49 unit/integration tests and production build. `pnpm format:check` passed. Full `pnpm test:e2e` ran 31 scenarios: 30 passed, with one font timeout in the network-fault recovery test. Trace showed an unfinished font request when Playwright interception was removed. The unchanged recovery scenario passed three isolated repeats; after synchronizing initial font readiness and route-handler removal, both recovery and WebGL-failure scenarios passed three repeats each (`pnpm exec playwright test tests/e2e/reliability.spec.ts --repeat-each=3`). All 31 distinct scenarios therefore passed, including real 4K60/WebM/GIF, 360-frame MP4, portrait, cuts/crossfade, shapes and golden regression. The initial failed run remains recorded here rather than being counted as a clean full-suite run.

Evidence: `shapes-ffprobe.json` verifies a real H.264 1920×1080/30 FPS MP4 with 60 frames. `shapes-parity.json` compares frames 0/30/59 with mean RGB-channel error below 1 on a 0–255 scale (limit 3). Reviewed editor screenshot and video are retained locally in `.local/reviewed/shapes/editor.png` and `.local/reviewed/curve.mp4`. The screenshot shows projected numbered controls and edited reveal; exported frames exclude them.

Remaining issues: no open Shapes acceptance failures. The GPU/browser rasterization tolerance and vector-below-overlay ordering remain documented limits. Next module: embedded image/logo assets and licensed flags/textures; full regression will run again after its renderer changes.

Risks: confusing control coordinates with rendered sampled paths, curve discontinuity at ±180°, accidentally exporting edit handles, stale point selection when scene/layer changes, and duplicate/invalid points. Shapes are illustrative geographic graphics; they do not imply road or historical-boundary accuracy.
