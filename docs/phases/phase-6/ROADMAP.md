# Phase 6 module checklist

P0 Phases 0–5 passed before this work. The user explicitly confirmed the complete P1 and P2 scope, including 3D, AI and After Effects interchange. Continue modules in value order with individual acceptance gates. External services are enabled only with verified terms and configured credentials. Dataset-dependent features require real licensed data and expose missing-data states rather than invented geography.

- [x] 6A: multi-scene controls and deterministic cuts.
- [x] 6B: bundled/local templates and camera presets.
- [x] 6C: deterministic crossfade and v1→v2 migration.
- [x] 6D: animation styles, scalar overlay transform tracks, v1/v2 migration.
- [x] 6E: real 4K/60 FPS, WebM and GIF export, format validation and frame parity.
- [x] 6F: line/arrow/Bezier shapes and curve editing, geographic dateline tests.
- [x] 6G: image/logo overlays, licensed flag/texture assets, bounded local asset ingestion and readiness.
- [x] 6H: deterministic label collision policy shared by preview/export.
- [x] 6I: country/year/value CSV and Excel import, choropleth and data keyframes.
- [x] 6J: licensed Admin 1 boundaries and selection/highlighting.
- [x] 6K: local audio/voiceover tracks, captions and real FFmpeg mixing.
- [ ] 6L live-service gate: offline city search and bounded optional geocoding/routing adapter implemented; static/111 unit/integration and 16 browser scenarios passed. External routing/terms remain unverified because the user declined accounts/keys. See GEOCODING_ROUTING.md; continue independent Codex work without requesting credentials again.
- [ ] P1 release gate: full regression, security/dependency/license audit, fresh setup docs and updated benchmarks.

P2 modules:

- [ ] 7A: 3D terrain/buildings/models with a separate validated asset pipeline, camera follow and multi-pass graphics.
- [x] 7A.1 terrain: pinned offline Sa Pa DEM, native preview, ground anchors, camera/source validation and real 60-frame H.264/PNG parity. 129 unit/integration tests and 15 unique relevant browser scenarios passed; evidence/costs in TERRAIN.md.
- [ ] 7A.2 buildings: licensed footprint/height import, measured units/provenance and actual extrusions.
- [ ] 7A.3 models/follow: bounded licensed local 3D assets, deterministic poses and camera follow.
- [ ] 7A.4 multi-pass: deterministic beauty/depth/overlay outputs and compositing validation.
- [ ] 7B: licensed time-aware historical border import, year slider, uncertainty/source labels and topology validation before morphing.
- [x] 7C: Actual signed-in Codex CLI proposes validated JSON, with explicit review before applying, source-resolved places, locked/stale protection and no invented polygons. 120 unit/integration, four module/foundation browser scenarios and ten broader regressions passed; real 60-frame H.264/PNG parity evidence in CODEX_AI.md.
- [ ] 7D host gate: actual camera/anchor JSON and executable JSX artifact workflow implemented; 123 unit/integration tests and ten final relevant browser scenarios passed, with repeated 90-frame sampling and <0.005-pixel preview position error. Adobe host import/render remains unverified because the host is absent. See AFTER_EFFECTS.md.
- [ ] 7E: authenticated collaborative cloud persistence and concurrency/conflict handling.
- [ ] 7F: SaaS billing with configured payment provider, verified webhooks and test-mode lifecycle.
- [ ] Complete release gate: all P0/P1/P2 acceptance scenarios, local CI-equivalent checks, live external-service/host checks where configured, performance/security/license reports.

No placeholder UI counts as completed functionality. Each module records files/interfaces/risks before implementation and test/export evidence after its gate. Live cloud deployment, payment processing and After Effects host verification depend on their actual environments; unverified gates remain visibly open.
