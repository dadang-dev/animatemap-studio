# Implementation checklist

- [x] Phase 0: workspace, schemas, fixtures, API health, shell, CI, unit/integration/e2e checks.
- [x] Phase 1: local MapLibre, countries, styles, selection, camera, anchors, editor layout.
- [x] Phase 2: deterministic evaluator, easing, geodesic routes, seek/playback tests.
- [x] Phase 3: layer/route/text/marker/keyframe editing, history, project management, persistence.
- [x] Phase 4: actual PNG/MP4 jobs, progress/cancel/retry, ffprobe and frame parity.
- [x] Phase 5: performance, accessibility, security, visual regression, local release checks (hosted CI awaits a remote repository).
- [x] Phase 6A: multi-scene controls, deterministic cuts, timeline scene overview, history/persistence, and actual MP4 cut parity. Acceptance recorded in `docs/phases/phase-6/SCENE_EDITOR.md`.
- [x] Phase 6B: bundled/local template library and deterministic camera presets, including portrait orbit MP4 parity. Evidence in `docs/phases/phase-6/TEMPLATES_PRESETS.md`.
- [x] Phase 6C: schema v2 migration, deterministic crossfade compositor and real MP4 parity. Evidence in `docs/phases/phase-6/CROSSFADE.md`.
- [x] Phase 6D: schema v3 migration, editable animation styles and scalar transform tracks, real MP4 parity. Evidence in `docs/phases/phase-6/ANIMATION_STYLES.md`.
- [x] Phase 6E: schema v4/60 FPS, real 4K MP4, WebM/GIF, isolated temporary frames and startup failure cleanup. Evidence in `docs/phases/phase-6/EXPORT_FORMATS.md`.
- [x] Phase 6F: schema v5 shapes, antimeridian Bezier sampling, projected controls, UI history/persistence and real MP4 parity. Evidence and recovery-test reruns in `docs/phases/phase-6/SHAPES.md`.
- [x] Phase 6G: schema v6 embedded PNG assets, licensed flags/textures, active image cache/readiness, real MP4/PNG parity and clean 36-scenario browser regression. Evidence in `docs/phases/phase-6/ASSETS.md`.
- [x] Phase 6H: schema v7 label collision, stateless full-project-pixel priority layout, UI history/persistence and real MP4/PNG parity. 69 unit/integration and 19 relevant browser scenarios passed; evidence in `docs/phases/phase-6/LABEL_COLLISION.md`.

- [x] Phase 6I: schema v8 datasets/choropleth, bounded local CSV/XLSX review/import, editable data-year tracks and fixed-domain colors/legend. 83 unit/integration and clean 41-scenario browser regression passed, followed by four affected data/golden scenarios after final review. Real MP4/PNG parity, licenses and audit recorded in `docs/phases/phase-6/DATA_IMPORT.md`.

- [x] Phase 6J: schema v9 catalog-based Admin 1 highlights/outlines, verified lazy country geometry, selection/search/focus and persistence. 91 unit/integration and 25 relevant browser scenarios passed; real MP4/PNG parity, failure recovery and source preservation are recorded in `docs/phases/phase-6/ADMIN1.md`.

- [x] Phase 6K: schema v10 canonical WAV assets, microphone voiceover, project-time clips, captions and real AAC/Opus exports. 101 unit/integration tests, eight audio/foundation browser scenarios and 24 broader regressions passed. Exact PNG and decoded audio/video parity evidence is recorded in `docs/phases/phase-6/AUDIO_CAPTIONS.md`.

Remaining modules and gates: `docs/phases/phase-6/ROADMAP.md`.

- [x] Phase 7A.1 terrain: schema v12 with actual v11 migration, nine original SHA-verified Sa Pa DEM tiles, native-resolution preview, source-aware camera limits and editable height/hillshade. 129 unit/integration and 15 unique relevant browser scenarios passed; real 60-frame 1080p MP4, exact PNG/seeks/ground anchors, cancellation and resource recovery evidence in `docs/phases/phase-6/TERRAIN.md`. Buildings/models/follow/multi-pass remain required.

- [ ] Phase 7D Adobe host gate: real camera/anchor JSON and trusted executable JSX are implemented and downloaded through the editor. 123 unit/integration tests and ten final relevant browser scenarios passed; exact repeated sampling, <0.005-pixel position parity, cancellation and actual resource failure are covered. Actual Adobe import/render remains unverified. Details: `docs/phases/phase-6/AFTER_EFFECTS.md`.

- [x] Phase 7C: actual installed Codex CLI JSON proposals with source validation, explicit review, atomic apply/history, scoped cancellation and bounded read-only execution. 120 unit/integration tests, four module/foundation browser scenarios and ten broader regressions passed; actual generated 1080p/30 FPS MP4 has 60 frames and PNG is pixel-identical to preview. Evidence: `docs/phases/phase-6/CODEX_AI.md`.

- [ ] Phase 6L live-service gate: real offline city search, source-preserving review and bounded optional geocoding/routing adapter are implemented; 111 unit/integration and 16 relevant browser scenarios passed. The user declined external accounts/API keys, so real routing/account terms remain unverified. Details and explicitly labeled contract-fixture export evidence: `docs/phases/phase-6/GEOCODING_ROUTING.md`.
