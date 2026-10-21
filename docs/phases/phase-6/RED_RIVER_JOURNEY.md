# Hành trình sông Hồng — implementation and delivery notes

Work started 21 October 2026; final validation completed on 22 October. User supplied `_e3a7.mp4` and explicitly chose Anh Khôi + karaoke. Scope: a complete original narrated vertical map video based on the Red River topic, without the reference's product advertisement. No source audio or newly synthesized audio was uploaded for ASR.

## Implementation checklist

- [x] Read AGENTS.md, river/voice phase notes and relevant Remotion guidance; inspect the reference across the timeline.
- [x] Independently source the geography and historical/environmental facts; write 12-scene script and storyboard.
- [x] Actual Vbee Anh Khôi 1.0 narration; cache batch task, preserve real timestamps, split at silence; audited equivalent years and provider transcription spelling for Ba Lạt.
- [x] Original Natural Earth Hong/Da MultiLineString geometry, downstream ordering, Turf-weighted reveal; separate Đà and Lô confluence locators, no invented Lô centerline.
- [x] Actual MapLibre camera plates and matching anchors; improve close-up imagery using 42 cached NASA GIBS tiles, August 2004 composite, with checksums and licensing.
- [x] Actual local Vox Director / managed Codex CLI output: 24 validated shots driving common map/overlay reframing.
- [x] Actual HyperFrames / GSAP paused timeline: 12 animated titles, 360 RGBA PNG frames at 30fps, lint 0 errors/warnings.
- [x] Remotion 4.0.536 composition with river flow, flags, map labels, authored SVG illustrations, karaoke and shared PCM mix.
- [x] Eight unit/content/timing/geometry/coverage/sampling tests, strict TypeScript; exact API persistence and browser refresh restoration.
- [x] 331 real Studio layout/timing samples; 14 independent renderer parity samples, all below meanRGBA 0.05/255.
- [x] Full MP4 render and all-frame runtime audit.
- [x] ffprobe/faststart/packet identity, decoded visual/audio/loudness validation.
- [x] Source ZIP credential/integrity check, final links and regenerable-data cleanup.

## Scope and reusable decisions

The 95.233333-second composition has 2,857 frames, 1080×1920 at 30fps, 61 caption pages and 302 provider timing units. Actual spoken hook ends at 1.68 seconds. Year timestamps may cover a whole spoken number; they are not split into fabricated word intervals. Script words and transcript are compared with only equivalent numeric spellings and reviewed Ba Lạt transliteration normalization; original cached response remains intact.

The native JSON is a camera/basemap/caption planning source, not the full SVG/HyperFrames composite. Editable Remotion source reproduces the final composition. All camera plates and geographical overlays share a projection and common reframe. No technical-credit end scene is present; provenance/licenses and suggested post caption are companion documents.

Natural Earth lacks a Lô centerline in the bundled river dataset; the Lô confluence is a locator, not a fabricated river polyline. Hong's generalized endpoint is inland of the Ba Lạt mouth: a short dashed direction indicator has an on-screen schematic note. The current river map does not purport to reconstruct the 1108 river course/dike line. The exact Ramsar designation date and treaty-entry date are not conflated: narration uses only “first Ramsar site in Vietnam.” Historic hydropower year is not a claim about current installed capacity.

The old map-capture helper's maxZoom 7 was too restrictive for city scenes. Higher local camera zooms initially exposed the low global image resolution; 500m NASA GIBS imagery is now cached locally and replaces the low-resolution raster only during plate capture. Independent final pixel checks use the new plates. No application dependency/schema/renderer changes were needed.

Media and editable sources remain ignored under `.local/red-river-journey/`.

## Final verification and artifacts

All 2,857 final frames passed runtime layout, caption and flow audits; zero missing frames, timing failures, geometry-label overflow or browser errors. Fourteen decoded comparisons passed, maximum meanRGB 1.4578051054526748/255 and maximum fraction above channel difference30 0.0018721064814814815; thresholds remain3/255 and2%. ffprobe confirms exact frame PTS, frame count, 95.233333-second endpoint, H.264/yuv420p, faststart and AAC stereo48kHz. All original encoded video packet hashes/PTS/DTS and decoder configuration survive final mux unchanged.

Decoded audio: correlation 0.9998381702472837, SNR 34.84377537616066dB, RMS ratio 0.9977944276254795, zero clipped samples, exact 9142400 expected/decoded float samples. Loudness −15.7LUFS; true peak −1.5dBFS.

The first decoded audit incorrectly compared an unsorted parity frame list [60,33,...] against chronological FFmpeg-select output [33,60,...]. This produced false failures. Sorting/deduplicating expected frames fixed the audit; a regression test enforces the association. An experimental CRF10 opening patch was investigated but excluded from delivery: the original complete CRF16 render passes with the corrected audit. No thresholds were relaxed; source/timing/audio remain unchanged.

MP4: Hanh-Trinh-Song-Hong.mp4; 19502394bytes; SHA256 b4ba9a34b58028da8e186679223e0493cf3476bb33f690642b193e8eba43a541.

ZIP: Hanh-Trinh-Song-Hong-editable-source.zip; 48371651bytes; 542entries; SHA256 70e7e4e3cdf42d8aac5f64775c5eb2bf37e1b0933bfbd36f0a885c3129349acc. Full editable composition, immutable assets/master, 12 HyperFrames titles, real Vox output, native planning source, timing/SRT, evidence and licenses. Integrity, credential-pattern and exact local-key content scans pass. No dependencies, API credentials, raw paid response, QA frame directories or abandoned quality experiment are included.

Cleanup removed 821files / 703736574bytes from this topic only, including QA images, compiled bundle and intermediate videos. Final MP4/ZIP and paid voice/source assets retain their hashes. A fresh Chromium Studio load and final source fingerprint pass after cleanup. Latest video index includes this as topic15. Preview listener verified127.0.0.1:3018. No application code/schema/dependency changes.
