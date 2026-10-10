# Phase 6A — Scene editor

Status: passed locally. P0 gates and the subsequent reliability review passed before starting this module.

Scope: add, duplicate, rename, reorder, delete, and resize scenes through the editor. Show scene boundaries in the timeline. Use existing schema v1 and deterministic cut transitions; crossfade remains deferred pending a compositing contract.

Implementation checklist:

- [x] Pure scene operations, fresh scene/layer IDs for duplication, schema validation.
- [x] Store transactions, one undo step per operation, scene selection and local-time preservation.
- [x] Accessible scene controls and timeline overview with explicit cuts.
- [x] Unit tests for reflow, duplication isolation, duration bounds, trim, and last-scene protection.
- [x] Browser workflow covering multiple scenes, history, refresh, JSON, and deterministic cut rendering.
- [x] Real short MP4 across a cut with ffprobe and decoded-frame comparison.
- [x] Typecheck, lint, formatting, unit/integration tests, production build, relevant browser checks.

Interfaces: `sceneOperations.ts` mutates a cloned Project inside validated store transactions. Existing `evaluateProjectAt` handles scene-local keys and cut boundaries; map adapter and worker continue to use that evaluator.

Timing policy: structural scene edits lay scenes consecutively from zero, preserving each scene's local keys. Imported gaps remain untouched until a structural scene edit. Resize clips keys/layer ranges after the new end without rescaling time; if all camera keys are clipped, hold the camera evaluated at the new end. Extending a scene extends layers that previously ended at the old scene end. Reorder/resize preserve the active scene's local playhead where possible. Delete selects the next available scene. Limits remain 20 scenes and 300 project seconds.

Risks: scene overlap, duplicate IDs, keyframes becoming invalid on trim, stale selection after history edits, and renderer mismatch at cuts. Acceptance requires original v1 projects to round-trip without migration or content changes on load, operations to undo/redo, and output before/at/after cuts to agree with preview.

Changed files: new `apps/web/src/sceneOperations.ts` and tests, `ScenePanel.tsx`; integrated App/store/Timeline and editor styles. Country selection now searches the current scene, and history/seeking keep layer selection within the current scene. Timeline key selection has scene/layer/property scope; endpoint keys at an internal cut preview the preceding scene's final visible frame so they remain editable. Renderer, evaluator, worker, project contracts and original fixtures are unchanged.

Validation: `pnpm check` passed typecheck, lint, 26 unit/integration tests and production build. `pnpm format:check` passed. Full `pnpm test:e2e` passed 17 scenarios in 3.6 minutes. Scene tests cover editing, endpoint keys, undo/redo, autosave refresh, actual JSON export/import, unchanged v1 load, scene/time limits, atomic rejection, and deterministic cut boundaries. The existing 360-frame MP4, portrait/cancellation, antimeridian, resource failures, and golden frames passed again.

New export evidence: `test-results/scenes/cuts.mp4` is a two-second 1920×1080, 30fps, H.264/yuv420p video with 60 decoded frames. Frames 29/30/31 span the cut at one second and are compared against full-resolution editor preview with mean absolute RGB channel error below 3/255. `parity.json` and `ffprobe.json` alongside this note retain measured results; screenshot `test-results/phase-6-scenes.png` was visually inspected.

Remaining limits: cut transitions only; imported gaps close upon structural scene edits; trimmed later keys are discarded (undo restores them). No hosted CI run without a remote; the existing MapLibre chunk-size warning remains. Next module: template library or camera presets, with its own acceptance contract. Crossfade requires shared compositing design before implementation.
