# Vietnam municipal-history video

Started 2026-10-18. Working directory: `.local/vietnam-cities-2026`. The user requested a new video based on `_df7c.mp4`, using the existing local Vox Director, Remotion and HyperFrames integrations. Previous videos are preserved.

## Scope and content decisions

The reference is 44.302268 seconds, 720×1280/30 fps. Chronological frame sampling covers its full duration, with full-resolution title and regional views. The user provided its complete script rather than authorizing audio upload; no reference audio or new voice was uploaded for ASR. Reference footage, audio, music and watermark are not copied.

The user explicitly approved sourced corrections to Hải Phòng and Nam Định. The video covers nine present municipalities, retaining the supplied order and closing question. Displayed dates represent the event named in the narration, rather than a uniform claim of original city foundation:

- Hà Nội: placed directly under the central government in 1945, Decree 77.
- Hải Phòng: direct central jurisdiction in 1955, Decree 221/SL; merger with Kiến An in 1962 is a separate event.
- Hồ Chí Minh City: official renaming in 1976, not a claim that its entire administrative history began then.
- Đà Nẵng 1997, Cần Thơ 2004, Huế 2025; Đồng Nai, Quảng Ninh and Bắc Ninh in 2026, according to the specific decisions recorded in the source manifest.
- Nam Định: jurisdiction under Bắc Bộ in Decree 77 is distinguished from the 1957 provincial merger. The unsupported continuous “1945–1956 directly under central government” assertion is removed with approval.
- Khánh Hòa, Ninh Bình and Hưng Yên in the closing question remain possibilities, not enacted municipalities.

`SCRIPT_USER.md` preserves the supplied wording; `story.json` is the corrected production script. `sources/content-sources.json` records exact URLs, checked date and claim scope. Primary sources include the government legal portal, municipal government portals and Vietnam archival administration; VietnamPlus corroborates the 1957 Nam Định event. A Nam Định PDF search result was found, but its full-text fetch timed out and is not represented as a successful document read.

## Geometry and actual tool roles

The provincial dataset is pinned to `thanglequoc/vietnamese-provinces-database` commit `8b78ba5118715e1fa81769286724db79346abf52`. Its repository declares MIT; upstream GIS provenance is retained separately. All 34 MultiPolygon features retain their source coordinates, islands and holes. They are **modern locator geometry**, not historical boundaries or a depiction of actual territorial control. Close-up cameras may frame the mainland; the complete geometry remains in the source. NASA Blue Marble is the January 2004 composite, not live imagery.

- Native AnimateMap/MapLibre creates four satellite plates and projects every provincial path and locator using the same camera. All ten requested pins are tested against their complete province polygon, including holes.
- The local Vox Director fork invokes managed Codex CLI, returning 18 validated shots with zero tool calls. Its shot-local framing drives the composite's restrained 2D reframes. It does not emulate Atlas image/video/TTS APIs or read private auth files.
- Remotion 4.0.536 authors fourteen scenes, separate editable Sequence nodes and connected scene compositions, country/province paths, geographic leaders and callouts, titles, timeline and exact karaoke.
- HyperFrames 0.8.168 authors and renders the two-milestone Hải Phòng graphic: 120 transparent PNG frames at 30 fps. Browser validation passes with zero lint/runtime/layout findings and twenty successful contrast checks. Capture reports screenshot mode with hardware GPU. The graphic shares the map group's reframe and leader; it is not a screen-fixed label attached to a moving map.
- HN - Anh Khôi, Vbee, speed 1.0 is confirmed in the live catalogue. Existing local API/cache resumes completed tasks. Real TTS audio and timing cover every narrated segment; normalized full-script comparisons pass. Year tokens grouped by the provider are retained without fabricated subdivisions. Original low-level music and scene chimes are authored locally and mixed with ducking.

Native JSON is a validated planning/basemap source, **not the complete final composite**. The editable delivery requires Remotion/HyperFrames source, media and lockfiles. Main application/schema code and dependency graph are unchanged; the isolated Remotion lockfile includes its PNG verification dependency for independent installation.

## Checks completed before export

- Zod validation and repeated pure evaluation at all 2,547 times pass; exact API JSON save/read round trip and exact IndexedDB restoration after browser refresh pass.
- Nine-city coverage, complete corrected narration, real timing bounds and speech tails pass. Hook ends at 2.54 seconds. Duration is measured from complete speech: 84.9 seconds, not forced to match the reference.
- Remotion ESLint and TypeScript pass. Workspace TypeScript also passes; unrelated application suites are not repeated for authoring-only work.
- 132 native-resolution samples cover every scene, all 43 caption pages, shot/caption boundaries, the HyperFrames graphic, hook and last frame. Repeated seek mean RGBA error stays below the existing 0.05/255 threshold; nonzero raster differences are not called pixel-identical.
- Seventeen actual Studio/export comparisons use the same Chromium, GL mode, sRGB, DPR 1, native zoom 100% and fonts. Maximum mean RGBA error is 0.023515866/255, below 0.05/255.
- Scene and caption contact sheets are visually reviewed. A small overlap between the graphic's full image box and timeline was fixed by reducing/repositioning the graphic; the same collision gate was rerun without loosening its tolerance.

## Final export gate

All final gates pass. The complete render records 2,547 unique frame audits, no missing frames, no collisions/overflows and no browser errors. Native FFmpeg encodes the approved master PCM to AAC with an exact project endpoint while copying all 2,547 H.264 packets, decoder configuration, DTS and PTS unchanged. The Remotion draft is retained separately.

`ffprobe` confirms 84.9 seconds, 1080×1920/30 fps, 2,547 frames, H.264/yuv420p, faststart and stereo AAC 48 kHz. Every video presentation timestamp matches `i/30`. All 132 decoded comparisons pass the existing mean RGB <3/255 and fraction above channel error 30 <2% criteria: maximum mean 1.540769676/255 and maximum fraction 1.009741512%. Seventeen Studio comparisons and repeated seeks also pass without threshold changes.

Decoded PCM comparison covers exactly 8,150,400 interleaved samples in the validated project window. Correlation is 0.999841094, SNR 34.911332 dB, RMS ratio 0.997613035, peak 0.842399061 and clipped samples zero. Final loudness is −16.6 LUFS / −1.5 dBTP, LRA 2.5 LU. Codec padding outside the declared endpoint is distinguished from timing changes; no speech tail is removed.

Final file: `.local/vietnam-cities-2026/Viet-Nam-9-thanh-pho-truc-thuoc-trung-uong.mp4`, 27,534,317 bytes, SHA-256 `bdcda1238a3021fe9ec1af093d5843c72932182fb939bf9b0988b4297e9dd6c1`.

Editable archive: `Viet-Nam-9-thanh-pho-editable-source.zip`, 23,359,474 bytes, SHA-256 `307d13536b7fbaa83582933293bf3196e787c41ff327d541f6d435e139e1a3d7`. Its 233 entries include source, pinned lockfile, local media, stripped voice metadata, script, native project, exact timing, sources and license texts. The entry audit excludes credentials, `.env`, Git metadata, dependencies and generated QA frames. `delivery.json`, `verification.json`, `HUONG_DAN.md`, SRT and word timing accompany the result. Preview: `http://127.0.0.1:3003/Vietnam-Cities-2026`.

## Reusable lessons

- Historical municipality lists mix foundation, restoration, central jurisdiction, merger and renaming dates → label the event type explicitly and correct the script with the user's approval → verify narration, title, year label and source manifest together.
- A local service can appear unreachable inside the restricted network sandbox while its port is already active → verify the actual connection/process in the appropriate execution context before starting another service → preserve the existing API, storage and preview and stop only an inadvertently started duplicate.
- A transparent graphic's full image box can reach a nearby timeline during zoom → reserve clearance at the maximum authored scale and keep graphic/leader in one map group → audit intermediate frames as well as held shots.
