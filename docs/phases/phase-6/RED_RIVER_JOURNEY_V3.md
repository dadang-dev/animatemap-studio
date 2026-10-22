# Red River journey V3 — geographic camera and place-specific visuals

Approved 22 October 2026 after the V2/reference review. This is a visual revision: script, Anh Khôi voice/speed, audio master, duration, subtitle pages, word timestamps and SRT remain locked. V2 remains the delivery until the new export and archive pass verification.

## Implemented

- Replace the 700 px main geography window with a 950 px window; remove repeated scope/icon rows and reserve an independent header position for the full-Vietnam locator. National context remains available during close views; opening/closing retain all original Vietnam geometry, islands and holes.
- Use a single Web Mercator coordinate system for raster atlases, original country polygons, river centerlines and geographic anchors. Lossless NASA GIBS tile atlases support continuous camera motion instead of cuts between six independently framed plates. This is a projected raster/vector composite, not a claim of a live MapLibre instance in Remotion.
- Apply the existing actual Vox Director 23-shot review proposal: treatment controls camera travel/arrival/hold; place-specific targets supply geographic intent. The previously generated HyperFrames title PNGs remain in use at a smaller size. No new director, HyperFrames generation, TTS or ASR call.
- Preserve the revealed main river through the hook/overview boundary at 2.2 seconds. Add separately sourced OpenStreetMap Lô ways 202674826 and 202867485 without joining invented segments. Đà/Lô emphasis follows actual spoken-word cues; source differences/generalization are documented.
- Add licensed photographs of Hòa Bình, Long Biên, Hanoi riverbank/islands and Xuân Thủy, with dates, authors and licenses. A separate dike cross-section explains protection from flooding; it is labelled as a principle illustration, not a reconstruction of the 1108 structure. Historical Thăng Long uses its own locator label rather than the modern Long Biên label.
- Lock immutable audio/caption inputs and validate unchanged reused assets. Preserve short attribution where required; no technical-credit end scene.

## Validation and delivery

Authoring source and evidence: `.local/red-river-journey-v3/`. Preview: <http://127.0.0.1:3020/Red-River-Journey-V3>, bound to loopback.

Ten unit/contract tests cover byte locks, all-frame deterministic evaluation, camera continuity, persistent reveal, complete country framing, original Lô geometry, distinct confluences, photo provenance, word-based cues and director coverage. Strict TypeScript and ESLint pass. Browser audits measure real font/SVG geometry, subtitle timing/safe area, label intersections and whether active river paths pass underneath illustration/locator panels.

The native JSON is a planning/content source; the Remotion/HyperFrames source archive is needed to reproduce the full V3 composite.

## Completed delivery

- Fresh final snapshot: `58219473d1869a5c13d2174904b6fa8e87b9ae92be653cff0d941864cda7fa7e`. All329 actual Studio samples pass, including24 sampled frames checking the historical Thăng Long label;14 independent renderStill comparisons pass with maximum meanRGBA0.0070294415509259255/255, below0.05. Source remained unchanged after cleanup.
- Full render:2,857 unique frame audits, zero missing frames, word/flow timing failures, country-context failures, layout/path occlusions or browser errors. MP4:1080×1920,30fps,95.233333seconds,H.264/yuv420p/faststart,AAC stereo48kHz; every video PTS verified at frameIndex/30 and container/video/audio endpoints checked.
- Fourteen decoded-frame comparisons pass: maximum meanRGB1.5392687435699588/255 and fraction above channel difference30 is0.002828896604938272, below unchanged limits3/255 and2%. Final mux retains all2,857 newly rendered video packets and their PTS/DTS. All4,466 original V2 AAC packets and PTS/DTS are unchanged. Decoded correlation0.9998381702472837,SNR34.84377537616066dB,zero clipped samples,−15.7LUFS/−1.5dBFS true peak.
- MP4:`Hanh-Trinh-Song-Hong-V3.mp4`,34,902,690bytes,SHA256 `8353a0dcead06c4866d6c49ebed3b0367b21730c86d9c31697015841e20a5828`.
- Editable archive:`Hanh-Trinh-Song-Hong-V3-editable-source.zip`,54,988,952bytes,637entries,SHA256 `67e78be9ecf237e1f592b90e19502e05aaae7ba05113cc01e0ee2c69005a0d9b`. Entry integrity and exact-key/pattern credential scans pass; dependencies/raw paid responses/QA frames excluded. A standalone lossless AAC cache preserves re-export after V2 MP4 deletion.
- New native planning ID `red-river-journey-v3` passes exact API JSON round trip. Source/package contain the projected composite and explicitly distinguish it from the native planning source.
- Cleanup removes817files/875,258,193bytes, including obsolete V2 MP4/ZIP and regenerable V3 bundles/frames/draft. Original source, paid voice cache, licensed assets and shared runtime remain. A fresh Chromium browser reopens3 final scenes after cleanup, verifying locator, new photos and historical label. Final archive was refreshed afterward to include the standalone AAC cache and final instructions; MP4 and frozen composition remain unchanged.
