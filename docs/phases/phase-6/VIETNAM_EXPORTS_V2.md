# Vietnam exports V2 — visible data, varied chart layouts

## Approved visual-only revision

User found the first video visually repetitive and requested more on-screen
statistics, with careful use of Remotion, HyperFrames and Vox Director.
Keep V1. Authoring root `.local/vietnam-exports-v2`, composition
`Vietnam-Exports-V2`, loopback Studio port3013.

Freeze narration, voice, speed, master PCM, captions, word timestamps, SRT and
99.2666666667-second timeline. `audio-timing-lock.json` records 28 byte hashes
against V1. No TTS or ASR calls. Preserve 12 scenes, 322 timing units, 68 pages
and 2,978 frames. All source statistics retain the same January2026 NSO
snapshot of 2025 merchandise trade described in [V1](VIETNAM_EXPORTS_VIDEO.md).

## Actual new visual work

- Total exports: a segmented donut for USD475.04billion, six selected groups
  USD304.5billion/64.1%, and other merchandise USD170.54billion/35.9%.
- Six product scenes: multicolor comparison rows, one fixed 0–107.7billion
  scale, large current value, selected-row emphasis and timed share labels.
  Derived displayed shares: 22.7/12.4/11.9/8.3/5.1/3.6%. These groups are examples,
  not exhaustive or a top-six ranking.
- US destination: preserve the Pacific map, flags, leaders and moving cargo;
  add USD153.2billion and approximately32% of total merchandise exports.
- FDI/domestic: USD367.09/107.95billion with published rounded shares77.3/22.7%.
  FDI includes crude oil. This is not a domestic-value-added split.
- Closing: six summary cards; explicitly label the total as merchandise
  turnover of these six groups, not retained value or profits.

Integer units of USD0.01billion prevent addition drift. All derived ratios
retain unrounded values and their common denominator in `analytics.json`.
US share is32.2499…% from rounded published amounts; show approximately32%
instead of asserting32.3%. Sum original values, not rounded displayed shares.
`analytics.mjs` finds numeric cues at actual word boundaries in the locked TTS
timing. No equal-duration alignment or altered captions.

Remotion `Analytics.tsx` authors donuts, bars, numbers and SVG text, while
`Scene.tsx` keeps hook/market geography and switches chart scenes to a quiet
background. Active-row border emphasis consumes the actual Vox shot framing.
Vox Director made a fresh managed-Codex-CLI plan with23shots and zero tool calls.

HyperFrames rendered a new paused `export-shares` timeline into180RGBA PNGs at
920×120/30fps; six share badges use the matching numeric cue and slot. Its
lint/runtime/layout/contrast checks passed. Keep the unchanged V1 product title
images and their HTML source alongside the new source. MapLibre plates, source
geometry, flags/fonts and licensing are reused without modification.

## Gates

13 unit tests passed, covering source consistency, movement, ratios and integer
totals, voice/timing hashes, actual numeric boundaries and fresh engine outputs.
Remotion ESLint/TypeScript passed. API exact JSON round trip and refresh restore
passed under a new project ID. API/web were found stopped and started on their
existing loopback ports/storage; no unrelated Studio was stopped.

Preflight passed246frames, including all scenes, every caption page, shot
boundaries and numeric cues at -1/0/+1/+12/+28frames. Three repeated seeks were
pixel-identical. Audit SVG text against the real chart container, not just its
viewport. Native contact sheets covered all scenes/pages and share reveals.
Studio parity passed18samples; maximum meanRGBA error0.0002213542/255, maximum
per-channel difference1. Keep the existing0.05/255mean threshold.

Final gates passed:

- Runtime: 2978 audits, all2,978frames, zero missing frames or timing/layout/browser failures.
- Decoded comparison: 246samples, max meanRGB 1.605901813271605/255; max fractionAbove30 0.017906057098765433. Existing thresholds passed.
- Decoded audio: correlation0.9998407694599919, SNR34.909951080312936dB, RMS ratio0.9977390264401117, clip0, 9529600float samples match the master length. -15.5LUFS/-1.6dBFStruepeak.
- All frame PTS and container/video/audio endpoints match99.2666666667s. H.264/yuv420p/faststart,1080×1920/30fps,AACstereo48kHz. Final mux preserves all2,978video packets, DTS/PTS and codec configuration.
- Native and decoded contact sheets manually reviewed for every scene, all68caption pages and all6share reveals. All28audio/timing locks remain byte-identical to V1.

MP4: Viet-Nam-Ban-Gi-Cho-The-Gioi-V2.mp4, 10943211bytes, SHA-256 2f58bcc3e943ee59b30258e476333b569bf4349788278e3885bab5d524a7c525.

Editable source: Viet-Nam-Ban-Gi-Cho-The-Gioi-V2-editable-source.zip, 28012977bytes, 499entries, SHA-256 42fb99f5761c1da3df96202a49908c444cbbb30adf2a351789dca87c3e563963. ZIP entry audit and actual credential-content scan passed, zero hits. Bundles both HyperFrames sources and PNGs, Remotion source/media/fonts, real Vox plan, locked voice clips/timing/SRT, analytics/calculations, licenses, provenance and revision instructions. Excludes credentials, .env, node_modules, .git, raw TTS base64 responses and QA frame directories.

Full evidence remains in the artifact reports. V1 is preserved.
