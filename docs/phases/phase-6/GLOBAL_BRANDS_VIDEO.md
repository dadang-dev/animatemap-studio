# Global Brands — eight countries, 22 brands

## Scope and inputs

Created 20 October 2026 from the user's `_8c2a.mp4` reference and supplied script. User selected Vietnamese HN - Anh Khôi with karaoke. Deliver a complete portrait video, including music/SFX and editable sources. Preserve earlier videos.

Reference reviewed across its complete 29.93-second timeline: country silhouette on satellite imagery, accumulating brand logos and country cuts. Reference footage, soundtrack and watermark are excluded. No reference audio or new voice audio was uploaded for ASR.

Checklist: USA 5 brands; UK 3; France/European Airbus 3; Germany 3; Spain 2; China 2; Japan 2; South Korea 2. Coverage is 8 countries and 22 distinct brands. Scope is country of origin, not present ownership or manufacturing location. Airbus is explicitly a European company with operational headquarters in France; Rolls-Royce Motor Cars is British heritage under BMW; TikTok is associated through ByteDance. Official source URLs, logo-specific copyright metadata and source checksums are stored with the artifact.

## Architecture and authoring

Artifact: `.local/global-brands`; composition: `Global-Brands`; loopback Studio port 3010. Remotion 4.0.536, HyperFrames 0.8.168, GSAP 3.14.2. Existing runtimes reused; no global dependency changes.

Vox Director actually produced a managed Codex CLI shot plan. Preserve original `vox-layout-result.json`; `vox-result.json` retimes within each unchanged scene to actual TTS, splits shots longer than seven seconds, and validates the final 11 shots. Remotion applies this plan to a shared map/anchor/callout group. HyperFrames actually rendered 240 RGBA title frames, 920×160, paused timeline `brand-countries`; lint/runtime/layout passed. MapLibre generated eight plates and projected paths/anchors with the same camera. Original Natural Earth 5.1.2 geometries, including islands and holes, remain intact. USA framing focuses on the contiguous main region and France on metropolitan Europe; scope is documented.

Twenty-two logo SVGs: 19 from pinned Simple Icons 13.0.0; Burberry, Louis Vuitton and Chanel from Commons with file-level metadata. Copyright status does not remove trademark rights. Eight flag-icons 7.5.0 assets retain MIT license and checksums. Noto Sans Unicode fonts are local and pinned. NASA Blue Marble is a January 2004 composite.

Real AI33/Vbee TTS reuses the existing paid task/cache, selected voice ID `vbee_hn_male_phuthang_news65dt_44k-fhg`, speed 1.0. Full transcript matches the narration after punctuation/case normalization only. 93 provider timing units, 22 caption pages. Batch splits use actual silence midpoints without tempo changes. Logo reveals match actual spoken brand intervals. Native project time is derived from integer frame indices. Hook speech ends at 1.4 seconds. Final timeline: 1,430 frames, 47.666667 seconds, 1080×1920/30 fps. Original music and SFX share the preview/export PCM master.

Native JSON is the camera/basemap/caption source; complete compositing requires the Remotion/HyperFrames source. SRT carries sentence timing, not karaoke effects.

## Verification and lessons

Commands: `node --test .local/global-brands/authoring.test.mjs`; Remotion `npm run lint`; `node render.mjs preflight`; `node .local/global-brands/studio-parity.mjs`; `node render.mjs render`; `node .local/global-brands/finalize.mjs`; `node .local/global-brands/verify.mjs`; `node .local/global-brands/review.mjs --decoded`; `node .local/global-brands/package.mjs`.

Five authoring tests cover requested brand/country coverage, licensed asset hashes, selected voice/full transcript, actual logo cue intervals, canonical timeline/caption entity boundaries, map anchors/original geometry evidence, Vox/HyperFrames outputs and API round-trip/refresh restore. Schema and evaluator checks cover every frame. Preflight samples every scene, every caption page, logo reveal boundaries and shot boundaries, including late frames showing all logos. Final runtime checks inspect all frames for word/logo timing, overflow, collisions and safe areas. Manual review includes every caption page, all 22 logos, all countries and credits.

Lessons:

- Scene selection at a transition can be wrong by one floating-point ULP even when the actual Remotion sequence is correct. Test scene ranges using rounded integer frame boundaries; compute local time from the frame offset, not subtraction of floating-point seconds.
- A Commons SVG can use CSS `fill:#1D1D1B` rather than a black fill attribute. Replacing only `#000` leaves the logo invisible on dark cards. A style definition may be unused by the path; set an explicit root fill when needed and match whitespace after `<svg`, including newlines. Inspect the actual rendered logo, change paint without changing paths, update asset hashes and rerun preflight/parity.
- CanvasImage is rendered as canvas. Explicit dimensions and nested media bounds must be audited, not only the parent text/card box.
- The real provider task may complete after a lengthy queue. Resume the cached task; do not create duplicate paid jobs, fabricate word timings or hand over a silent draft as the completed video.

## Final results — passed

- Authoring tests: 5/5; Remotion lint/TypeScript: passed. Native schema/evaluator: 1,430 deterministic frames. API exact JSON round-trip and refresh restore: passed.
- Preflight: 183 samples; repeated seeks produced identical pixels on the three checked frames. Studio/native: 16 samples, maximum mean RGBA error 0.000105614/255, maximum channel error 1. Small raster differences are reported rather than called pixel-identical.
- Final runtime audit: all 1,430 frames, no missing frames, zero word/logo timing failures, browser errors, overflow or collision failures. Manual native and decoded reviews cover every country, all 22 logos, all 22 caption pages and credits. Logo Chanel is white in the final decoded image.
- MP4: H.264, yuv420p, faststart; 1080×1920, 30 fps, 1,430 frames, 47.666667 seconds; AAC stereo 48 kHz. Container/video/audio endpoints passed. Finalization preserved all video packet hashes, codec configuration and DTS/PTS.
- Decoded frames: 183 comparisons, maximum mean RGB error 1.417154/255; maximum fraction with any channel difference above 30 is 1.7310%, below the predeclared 2% limit. No failing samples.
- Decoded audio: correlation 0.99984142, SNR 34.92446 dB, RMS ratio 0.99768686, zero clipped samples; integrated -16.2 LUFS, true peak -1.5 dBFS. Exact PCM sample count matched.
- Local services verified at 127.0.0.1 on ports 3001, 5173 and 3010. No app/schema changes were needed.

Delivery: `.local/global-brands/Thuong-Hieu-Noi-Tieng-Den-Tu-Dau.mp4`, 8,215,305 bytes. SHA-256: `5ea60d3699fc0c465e069a988b49c78989a1c28f2dc0ead65adbb665b1483d8b`. Editable ZIP contains source, pinned locks/fonts, plates, logos, flags, real title frames, narration clips/timing, shot plans, licenses and source metadata. ZIP entries are audited to exclude keys, environments, node_modules, Git and QA frames. Detailed evidence and archive checksum are in `verification.json`, `archive.json` and `delivery.json` beside the video. Earlier videos are preserved. No remaining blocking issue for this video.
