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
- [ ] 7B: licensed time-aware historical border import, year slider, uncertainty/source labels and topology validation before morphing.
- [ ] 7C: Codex proposes validated JSON through an actual installed/configured invocation, with explicit user review before applying; no invented historical polygons. The user selected Codex rather than a separate API provider.
- [ ] 7D: After Effects camera/anchor interchange and executable import script, with documented projection limitations and host validation.
- [ ] 7E: authenticated collaborative cloud persistence and concurrency/conflict handling.
- [ ] 7F: SaaS billing with configured payment provider, verified webhooks and test-mode lifecycle.
- [ ] Complete release gate: all P0/P1/P2 acceptance scenarios, local CI-equivalent checks, live external-service/host checks where configured, performance/security/license reports.

No placeholder UI counts as completed functionality. Each module records files/interfaces/risks before implementation and test/export evidence after its gate. Live cloud deployment, payment processing and After Effects host verification depend on their actual environments; unverified gates remain visibly open.
