# Phase 6D — Animation styles and transform tracks

Status: passed; crossfade gate passed first.

Files/interfaces: project-schema v3 adds scalar scale/rotation/offsetX/offsetY tracks while retaining the v1/v2 validators. Migration supplies empty tracks, preserving all legacy camera, layer and transition content. Animation core evaluates absolute overlay transform tracks with the existing easing registry. Presets produce ordinary editable keys. Inspector owns preset choices; Timeline exposes each supported property. Scene trim handles every scalar track.

Scope: fade in/out for all layers, draw for routes, pop/slide for marker/text overlays. Transform animation is restricted to overlays because country/route geometry has geographic coordinates. No CSS transitions control animation. Presets replace only their named tracks, in one undoable operation, within the layer's local time range.

Acceptance:

- [x] v1/v2 migration preserves content; future versions and invalid track values/times fail.
- [x] Fade/pop/slide/draw keys respect layer bounds, base opacity/transform and preserve unrelated tracks.
- [x] Pure evaluation reproduces transform values after repeated seeks, without mutating input.
- [x] Inspector presets and timeline key edit/copy/move/delete support undo/redo, locking, trim, persistence and JSON round-trip.
- [x] Real browser overlays and decoded MP4 frames match at animation boundaries and midpoints.
- [x] Typecheck, lint, unit/integration, build, format and relevant browser regressions pass.

Validation: `pnpm check` passes 40 unit/integration tests and all static/build checks. Five targeted Playwright scenarios pass, covering new editing/export workflows, both crossfade regressions and original golden frames. Real 1920×1080/30 FPS MP4 has 60 frames; mean RGB errors at frames 0/15/21/30 are 0.769/0.796/0.801/0.795 against a 3/255 limit. Repeated seeks reproduce identical PNG bytes. Evidence is retained in adjacent animation-styles JSON reports and ignored `.local/reviewed/animation-styles.mp4`.

Risks: silently stripping legacy transition fields, unexpected jumps when base values differ, off-screen slide offsets, stale key selection, unsupported vector transforms, and leftover keys after trim. Limits remain explicit in schema and UI.
