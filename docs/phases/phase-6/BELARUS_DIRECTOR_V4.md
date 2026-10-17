# Belarus–Ukraina V4 — reference-led re-edit

The user explicitly requested another review of `_05f8.mp4`, the Markdown guidance, and a revised video using HyperFrames, Remotion and Vox Director. The eight approved user-script segments, Anh Khôi narration at speed 1.0, existing mix and real karaoke timing remain locked. This is visual re-editing, not a new factual review. V3 and prior deliveries are preserved.

Working directory: `.local/belarus-ukraine-director-v4`. The local reference is 71.096644 seconds, 720×1280/30 fps. Review covers its whole duration and denser UAV/two-front animation sequences. Its footage, voice, music and watermark are not copied.

## Checklist and actual tool roles

- Vox Director's local fork invokes the hardened Codex bridge, returning a new strict **22-shot** plan with zero tool calls. Wide/detail timings drive final reframes; narration, scene order and duration cannot be changed through that contract.
- The native renderer creates nine satellite map plates and projects country/target/Kyiv anchors using MapLibre. Natural Earth geometry and neutral Crimea overlays are retained. Colour fills identify countries, not military control.
- Remotion **4.0.536** is isolated in an ignored project with pinned npm lockfile. It authors the full 1080×1920/30 fps timeline: countryballs/expressions, leaders, a quadcopter with rotating blades, truck, flash/smoke, red-line schematic, relationship arrows, symbolic projectiles, titles and karaoke. Each of nine scenes has its own JSX Sequence. This is actual compositing, not muxing voice onto unchanged video.
- HyperFrames **0.8.168** creates the paper protest note. Browser checks cover runtime/layout and eleven successful contrast checks. It renders **108 alpha PNG frames**, used at project seconds 22.4–26. No Atlas media-generation API is emulated.
- Map plates and projected actors move in one deterministic group. Reframing is a modest 2D treatment of fixed map plates, not a new 3D geographic camera engine.
- Captions retain all original text and actual provider bounds, with `[start,end)` at project time. The precise karaoke requirement uses a custom renderer and exports Remotion `Caption[]`, original SRT and word JSON. No new TTS/ASR request or upload occurs.

## Gates and fixes

Native-source Zod validation, 2,610 repeated pure evaluations and exact API source-project round trip pass. Remotion ESLint/TypeScript checks pass. Preflight samples all 52 caption pages, every scene, shot boundaries, UAV approach/impact/smoke, note reveal/stamp, routes/projectiles and final card: 151 native-resolution frames. Geometry audits measure drawn SVG paths rather than full-canvas SVG viewports; zero-progress arrows are omitted.

Visual review found the closing question mark touching the Russia label; it was moved into clear space. An extra PNG byte-equality assertion exposed small GPU glyph/shadow raster differences, confined to a handful of channels at 1–2/255. Removing an unnecessary glyph rotation reduced these. The reported pixel comparison uses the **existing AGENTS threshold of mean RGBA <0.05/255**; nonzero differences are not described as pixel-identical, and golden images are not replaced to hide failures. Source/asset/lockfile fingerprints prevent rendering a snapshot different from preflight.

Studio initially bound all interfaces. A process-local `RenderInternals.getPortConfig` adapter now binds `127.0.0.1`, verified from the actual listener. Its printed Network URL is not evidence of its binding. Existing native servers/storage were reused, not restarted or broadly killed.

Studio parity initially used different browser launch defaults and produced mean RGBA error 0.5303/255. Pinning the same Chromium executable, GL mode, sRGB profile, DPR 1 and native zoom resolved the harness mismatch without changing the visual threshold or reference frames. Ten actual Studio/export samples pass; maximum mean RGBA is **0.001979288/255**. Two repeated seeks have zero pixel error; the closing glyph repeat has mean **0.000001206/255**, maximum channel difference 1.

## Final verification and delivery

The first Remotion output declared an AAC endpoint about 19 ms beyond the project. Stream-copy remux alone retained it. The final pass copies all **2,610 video packets, DTS/PTS, duration and decoder configuration unchanged**, encoding the approved unmodified PCM master with native FFmpeg AAC and setting the project endpoint to exactly 87 seconds. There is no picture re-encoding, TTS generation or timing adjustment. Raw AAC decoders can expose codec padding beyond a declared track endpoint; PCM comparison uses the validated 0–87-second media window. `mux-evidence.json` retains the packet/configuration proof and both earlier draft files remain available.

`ffprobe` confirms 87 seconds in both format and tracks, 2,610 frames, 1080×1920/30 fps, H.264/yuv420p, faststart and stereo AAC 48 kHz. Every video presentation timestamp equals `i/30`. All 151 decoded-frame comparisons pass the unchanged mean RGB <3/255 and fraction above channel difference 30 <2% criteria: maximum mean **1.655142104/255**, maximum fraction **0.783951%**. The full render has 2,610 layout audits, no recorded browser errors and no caption collisions/overflows.

Decoded audio has exactly 8,352,000 interleaved samples in the project window, correlation **0.999823765**, SNR **34.466772 dB**, RMS ratio **0.997565589**, peak **0.802231073**, zero clipped samples. Final loudness is **−16.52 LUFS / −1.90 dBTP**, LRA 4.0. Master bytes and all original caption text/timing are unchanged.

Final file: `.local/belarus-ukraine-director-v4/Belarus-Ukraina-reference-Remotion-HyperFrames-V4.mp4`, **62,986,177 bytes**. SHA-256: `f53f5f5e6c222f80211a007c830ebe8ba708b832cbb74a73271c2b102b901e18`. The source archive is `Belarus-Ukraina-V4-editable-source.zip`; it excludes dependencies, credentials and generated verification frames, retaining 136 composition source/asset files plus native source, plan, captions, licenses and evidence. Studio preview is `http://127.0.0.1:3002/Belarus-V4`.

## Editable delivery boundary

The complete edit is Remotion source/public assets plus `hyperframes-note/index.html` and the Vox plan. Preserved `project.animatemap.json` is the native V3-derived source; AnimateMap JSON alone does not reproduce this Remotion composite. `map-plates.animatemap.json`, `HUONG_DAN.md`, provenance, SRT, word timing, Remotion captions and software/flag/font licenses accompany the result. Application/schema source did not change, so verification targets this authored project and actual media, without repeating unrelated app suites.
