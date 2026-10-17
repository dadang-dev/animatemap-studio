# Belarus–Ukraina V3: visible UAV approach and impact illustration

## Scope and unchanged material

The user identified a missing visual action: the UAV attack line had country flags, callouts and arrows but no UAV visibly flying toward a vehicle. V3 adds that action to the V2 incident scene. The existing request to reproduce the supplied eight-segment script without editorial changes remains in effect. This work is visual authoring and technical verification, not a new factual review.

Project ID: `belarus-ukraine-uav-v3`. Working directory: `.local/belarus-ukraine-uav-v3/`. V2 and the original sourced video are preserved. Canvas/duration remain 1080 × 1920, 30 fps, 87 seconds / 2,610 frames. All narration, audio assets/tracks, captions and timings are unchanged; no TTS generation or ASR upload is performed.

## Animation and assets

- Four authored SVG assets, rasterized transparently for the existing image-layer contract: UAV, civilian cargo truck, short impact flash and smoke. Sources and SVG/PNG SHA-256 values are retained in `assets/PROVENANCE.json`; authored illustrations are CC0. No reference footage/audio or external stock is copied.
- UAV departs at project time 10.195 seconds, matching the real TTS timing of “UAV”, and reaches the vehicle at 12.375 seconds, matching “xe”. The UAV disappears at impact; a short non-graphic flash and expanding/fading smoke follow.
- Image transforms use the existing scene-local keyframe evaluator. The actor is anchored to an illustrative map target with a screen-offset approach during the deliberately stationary camera interval. The target is checked inside the bundled Belarus polygon; it is not represented as a verified strike location or route.
- The truck, effects and UAV stay clear of the caption area. Country flags/callouts and media credits remain editable and intact.

## Pre-render evidence

Zod validation, deterministic evaluation of all 2,610 times, exact API persistence and all eight narration segments pass. Render state is compared to V2 at every one of the 2,310 frame times outside the incident scene and remains equal. Audio assets/tracks and caption objects are exactly equal to V2.

All 52 caption pages, nine scenes, eight callout instances and three pan/zoom/pitch anchor tests pass without overflow, collision or browser errors. Seven specific UAV frames verify takeoff, interpolation, arrival, disappearance at impact, flash, smoke and tail; bounds remain inside the map-safe area. Preview/export parity across all nine scenes passes with maximum mean RGBA error 0.000014950/255 (< 0.05/255). Six additional parity comparisons at actual UAV/flash/smoke times pass with maximum mean RGBA error 0.000002773/255. Both suites confirm exact project restore after refresh.

## Export method and final verification

The unchanged V2 source is pinned by SHA-256 `7b4b61f3f0b842b793c36098433f80dcd5ca264ba34c7ef2faf62f61d5953613`. Native frame capture uses the full V3 project and original project time `i / 30`, recapturing frames [210, 710), extending the changed scene to source IDR boundaries at 7 and 23⅔ seconds. The patch uses the existing H.264 encoder arguments. Unchanged prefix/suffix video and AAC are stream-copied; no second lossy encode is applied to unchanged material. Packet hashes, presentation times, boundary frames and full final media are checked before delivery.

Initial concatenation failed the strict unchanged-packet hash gate because FFmpeg's automatic H.264 conversion inserted headers. Decoder configuration (including extradata SHA-256), dimensions, format and time base were compared and found equal. Concatenation is therefore repeated with `auto_convert=0`, guarded by that configuration equality check; the gate is retained unchanged. All 2,110 reused video packets and their timestamps now match V2 byte for byte; all 4,080 AAC packets and timestamps also match. Every final presentation frame time matches `i / 30`. No new capture or voice generation is needed for this mux correction. `finalize-mux.ts` records the checks in `incremental-evidence.json` and is used by the incremental-render entry point.

Commands: `author.ts`, `audit.ts`, `callout-preflight.mjs`, `preflight.mjs`, `uav-preflight.mjs`, `parity.mjs`, `uav-parity.mjs`, `render-incremental.ts`, then `capture-transits.mjs`, `verify.mjs`, `package.mjs` under the working directory, using `node --import tsx` for TypeScript. No application source/dependency change is required.

## Verified delivery

All final gates pass. `ffprobe` confirms 87 seconds / 2,610 frames at 1080 × 1920 / 30 fps, H.264/yuv420p, faststart, AAC stereo 48 kHz. All 108 distinct decoded reference comparisons pass, including the new UAV samples and frames on both sides of the incremental splice. Maximum mean RGB error is 1.951760224/255 (< 3); maximum fraction of pixels with any channel difference over 30 is 0.803867670% (< 2%). The immutable full-project snapshot equals the delivered project.

Decoded audio correlation against the shared PCM is 0.999823765, signal-to-error ratio 34.466772153 dB, RMS ratio 0.997565589 and peak 0.802231073. These match V2, consistent with verified unchanged AAC packets. No visual or audio threshold is loosened.

Final file: `.local/belarus-ukraine-uav-v3/Belarus-Ukraina-UAV-bay-toi-xe-v3.mp4`, 16,509,388 bytes. SHA-256: `f1bfc263c6dd2246a7788153b7d984bb1fdc48f33609f77048edfe8b7163bc7a`.

Companions include editable `project.animatemap.json`, unchanged `subtitles.srt` / `word-timestamps.json`, original script, `delivery.json` / `DELIVERY.md`, verification and incremental evidence, authored SVG/PNG assets with provenance, and the flag MIT license. SRT has text/timing; karaoke remains in the MP4 and project/word-timing data. The root guide now requires checking visible action actors and mid-action frames, addressing the omission identified by the user.
