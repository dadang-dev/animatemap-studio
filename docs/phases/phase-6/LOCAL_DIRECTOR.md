# Local Vox Director / HyperFrames integration

Verified 2026-10-18. User requested both repositories and Codex instead of the Atlas API, then selected local forks first. Existing video projects and deliveries are preserved.

## Checklist and boundary

- [x] Identify canonical sources, licenses and immutable commits; keep upstream remotes.
- [x] Create isolated local forks and reproducible pinned runtime without changing the main dependency graph.
- [x] Share the existing hardened Codex runner; add strict shot contracts, API and CLI.
- [x] Preserve narration, timing, map rendering and media provenance.
- [x] Validate unit/integration, real inference, browser layout/runtime and real encoding.
- [x] Compare decoded frames/audio and document limitations.

Interfaces: `project-schema/director.ts` owns plan validation/context; `CodexService.planShots` owns inference; `/api/director/plan` owns request lifecycle; `directorComposition` owns trusted HTML; `scripts/director.ts` verifies native delivery hashes and authors an isolated composition. Setup/adapters live in `integrations/` and `scripts/`.

Risks checked: model-generated code is rejected; existing media bytes are excluded from inference context; missing assets/gaps/reordering fail validation; output paths preserve prior compositions; one active Codex run and finite subprocess limits remain enforced. HyperFrames runs as a separate local CLI rather than a public untrusted HTML service.

## Verification

| Check                                       | Result                                                                                                                                    |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm typecheck`, `pnpm lint`, `pnpm build` | Pass; existing Vite chunk-size advisory remains                                                                                           |
| `pnpm exec vitest run`                      | 73 files, 185 tests pass                                                                                                                  |
| Director tests                              | Strict output, contiguous coverage, no mutation, invalid references, API subprocess lifecycle                                             |
| Live `director plan`                        | Codex CLI returned 19 valid shots, zero tool calls, about 36.8 seconds                                                                    |
| `director:setup` repeated twice             | Pass, no reset or overwrite                                                                                                               |
| HyperFrames `check --json`                  | Browser enabled; zero lint/runtime/layout findings; nine layout samples                                                                   |
| HyperFrames snapshots                       | Five points: 0, 1, 2.4, 4, 5.5 seconds; reviewed UAV, impact, callout and karaoke                                                         |
| Real render                                 | 180 frames, 1080×1920, 30 fps, H.264/yuv420p and AAC 48 kHz; approximately 107 seconds                                                    |
| Decoded RGB comparison                      | All five samples below existing mean 3/255 and 2% pixels above channel difference 30; maximum mean 2.72525/255, maximum fraction 0.43167% |
| Decoded audio vs source excerpt             | 576,000 interleaved samples each; correlation 0.9997134, SNR 32.37 dB, RMS ratio 0.9971941, peak 0.743459; pass                           |

The API tests use labeled protocol subprocess fixtures. The separate successful live planning call is the evidence of actual provider integration. Initial sandbox-only atomic-rename EPERM disappeared when the suite ran with appropriate filesystem access; no tests/thresholds were loosened.

## Example delivery

Local directory: `.local/integrations/hyperframes-demo`.

- `demo.mp4`: 6 seconds, 2,726,228 bytes, SHA-256 `538dddc1a4c43a489cf3b8261a13091837f528a73d936595ef7b777b86069c65`.
- Source: approved V3 video excerpt at project seconds 10–16. Source video hash `f1bfc263c6dd2246a7788153b7d984bb1fdc48f33609f77048edfe8b7163bc7a`.
- `index.html`, `plan.json`, `BASELINE.json`, `CREDITS.json`, `LICENSE-FLAGS.txt`, `verification.json` and snapshots accompany the example.
- The source full video still contains its original end card; this short technical excerpt carries source attribution in its companion instead.

## Lessons and remaining scope

Windows render preflight hung on GUI Chromium `--version` despite successful snapshots → use matching installed Playwright headless shell → rerun strict render and verify all 180 frames. Browser launch validation was retained rather than bypassed.

Published runtime and source commit are pinned separately; no claim is made that the upstream Bun monorepo was built/tested. HyperFrames usage result was unknown. The adapter adds one paper detail-window treatment to non-hold shots; distinct push-in/action-focus presets, automatic actor-centred crop and a GUI review/apply workflow remain future enhancements. Codex plans visuals but does not emulate Atlas media-generation models. No full replacement cut, remote GitHub fork or publish was performed.
