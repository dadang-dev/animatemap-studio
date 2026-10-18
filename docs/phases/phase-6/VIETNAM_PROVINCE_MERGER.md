# Vietnam provincial consolidation video

Started 2026-10-18. New output directory `.local/vietnam-province-merger-2025`; existing videos and source projects are preserved. User requested a complete video about the provincial count before and after consolidation, saying “64”. The production scope explains the historical 64 before the 2008 Hà Tây/Hà Nội merger, then the 2025 change from 63 to 34. It does not present 2025 province/city classification as the current 2026 classification.

## Content and geometry

Primary sources: Resolution 202/2025/QH15 on the government gazette; the Government News full 23-group account; government records of Hanoi's 1 August 2008 expansion and the December 2008 63-unit data integration project. Exact URLs and claim scope are in `sources/content-sources.json`. Resolution effective date 12 June 2025 is distinct from the new administrations' operation on 1 July 2025.

Coverage is exhaustive: 52 participating original units form 23 new units; 11 units do not consolidate in this round; all 63 original names occur exactly once. Net reduction 29, final count 34. Narration lists every merger and all eleven unchanged units. The resulting 133.9-second composition uses 19 native planning scenes, within the unchanged 20-scene/300-second contract.

Geometry comes from the already licensed Natural Earth 5.1.2 public-domain 63-feature reference, rather than treating the previous video's modern 34-feature dataset as historical data. Every source Polygon/MultiPolygon, island, hole and coordinate is retained; source name-to-display-name corrections use ISO codes. Polygon nesting is normalized only in the projection adapter. Sixty-three pins are tested against the entire corresponding geometry. Mainland close-ups do not delete offshore geometry.

After views combine group fills and cancel exact shared undirected source-coordinate edges, drawing exterior edges only. This removes obsolete internal lines without simplifying coordinates or claiming cadastral/legal boundary accuracy. Four views × 23 groups pass edge-accounting checks. NASA Blue Marble remains the January 2004 composite. End-card scope and full provenance accompany the video.

## Actual production roles and timing

- Native MapLibre captures four satellite plates and projects all geometry and geographic anchors with matching cameras.
- The local Vox Director fork invokes managed Codex CLI: 35 validated shots, zero tool calls. Its plan controls restrained overview framing; merger detail framing is fitted to the relevant group and held readable.
- Remotion 4.0.536 builds nineteen independently registered scenes, individual timeline nodes, geographic leaders/callouts, before/after fills and exact karaoke.
- HyperFrames 0.8.168 renders 120 transparent PNG frames at 30 fps for the 63→34 count card. The final composition holds its stable frame after the animation rather than restarting it. Lint/runtime/layout pass; the framework contrast probe reports zero checked nodes, so it is not claimed as a positive contrast test.
- HN - Anh Khôi, Vbee speed 1.0 is confirmed in the live catalogue. Eighteen real TTS clips retain all speech tails; no ASR upload. Complete provider transcript comparisons pass, allowing only equivalent written/spoken numbers. 394 real timing units form 83 caption pages. Semantic repagination protects 94 internal place-name boundaries, with no token/timestamp changes and an unchanged audio master hash. Hook speech ends at 1.88 seconds. Original music and scene chimes use deterministic local synthesis and ducking.

An early subtitle audit caught frame 382: adding scene-local floating time to a fractional scene start selected “sáu” one ULP early, during the provider's actual silence gap. Caption project time now uses summed integer frame indices / FPS. The regression asserts the old incorrect highlight and the correct empty active-word set; timestamps remain unchanged.

The 48 kHz stereo external compositing WAV exceeds the embedded project's 16 MiB asset guard. It is written as an ordinary external PCM WAV; the schema guard and main application remain unchanged. JSON native is only planning/basemap/caption source, not the complete composite. Full editable source includes Remotion/HyperFrames, assets, fonts, real timing and lockfiles.

## Verification status

- Eight authoring tests pass: exhaustive membership, unchanged source geometry, pins, speech cue ordering, the real subtitle-boundary regression, shared-edge accounting, schema/transcript/deterministic evaluation and lossless semantic pagination.
- Native Zod validation and repeated evaluation of all 4,017 frames pass.
- API exact JSON round-trip and browser IndexedDB restore after refresh pass.
- Isolated `npm run lint` (ESLint + strict TypeScript) passes. No application/schema dependency changes.
- Studio is served on `127.0.0.1:3004/Vietnam-63-to-34`; listener checked as loopback.
- Final-snapshot preflight passes 323 samples, every caption page, scene and group switch, shot boundaries, count graphic and last frame; all active words match actual provider timing, with no overflow/overlap/browser errors. Repeated seeks: max mean RGBA 0.000001688/255; not claimed pixel-identical.
- Studio/export parity passes 22 samples at 1080×1920, DPR1, zoom100%, identical Chromium/GL angle/sRGB settings. Max mean RGBA 0.023515023/255, below unchanged 0.05 threshold. All 42 scene/group contact samples and all 83 caption-page samples were visually reviewed.
- Final encoding/decoded media gates pass; see final-output evidence below. Full native contact review covers 42 scene/group samples plus all 23 after-merge groups and 83 caption pages. The corresponding 323 decoded frames pass numerical comparison; decoded after-group sheets and the long-name caption sheet were also visually reviewed.

## Final output and checks

`Viet-Nam-63-con-34-tinh-thanh.mp4`: **133.9 seconds, 1080×1920, 30 fps, 4,017 frames**, 32,451,773 bytes. H.264/yuv420p/faststart and AAC stereo 48 kHz. SHA-256: `27c36c2a14ac9ff87046a81e434c5511ff691a96ed844a392573ca77b566ffbc`.

`Viet-Nam-63-con-34-editable-source.zip`: 29,646,223 bytes, 259 audited entries. SHA-256: `225989a4ae8e5adad3b2193b2efeebf09a629f0e2346f181f8de5787beb5957f`. Contains editable Remotion/HyperFrames, plates, full reference geometry, font/media, 35-shot plan, word timing/SRT, stripped voice metadata and stems, checks, instructions, provenance and software/license/lock files. No node_modules, junction, Git metadata, credentials, .env or QA image directories. Native JSON is explicitly a partial planning/basemap source; the final composite is in Remotion/HyperFrames.

- `node render.mjs render`: 4,017 unique frames audited, zero missing frames, zero word-timing failures, overlap/overflow or browser errors. Source/public/lock fingerprint matched preflight and was rechecked during packaging.
- `node .../finalize.mjs`: retains all 4,017 video packet hashes, DTS/PTS, durations and decoder configuration; encodes the unchanged PCM master through native FFmpeg to match the exact project endpoint.
- `node .../verify.mjs`: ffprobe verifies codec, dimensions, FPS, container/video/audio endpoint, all frame timestamps and faststart. All 323 decoded samples pass unchanged tolerances: maximum mean RGB **1.571422326/255**; maximum fraction of pixels with any channel error >30 is **1.028356482%** (limit 2%).
- Full decoded audio window has 12,854,400 interleaved samples, exactly matching the master window. Correlation **0.999812631**, SNR **34.195674 dB**, RMS ratio **0.997390751**, peak **0.867051125**, clipped samples **0**. Integrated loudness **−16.7 LUFS**, LRA **2.4 LU**, true peak **−1.2 dBFS**. These are decoded-signal checks, not an assertion of a human listening review.
- `node --test .../authoring.test.mjs`: eight passing artifact tests. Native API exact round-trip and Playwright refresh restore use the final repaginated snapshot. `npm run lint` in the isolated Remotion project passes ESLint and strict TypeScript. Main application code/schema/dependencies are unchanged, so unrelated monorepo suites were not repeated for this authoring-only task.
- `node .../package-new.mjs`: required evidence/final source fingerprint/ZIP entry audit all pass. `delivery.json`, `DELIVERY.md`, `archive.json`, `verification.json`, `pagination-checks.json` and the source folder retain the evidence. Main video and prior deliveries are preserved.

No remaining failed gate. Limits: legal membership is sourced, but geometry is explicitly a Natural Earth reference rather than surveyed legal boundaries; grouped numeric provider tokens are not artificially split; no new audio was uploaded for ASR. The framework's zero-node contrast result is disclosed above rather than presented as an executed contrast test.
