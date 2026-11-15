# EU — membership waves and three different European groupings

Requested 22 October 2026 as a complete video and a measured production-speed trial after G7. Read `docs/VIDEO_PRODUCTION_WORKFLOW.md`; do not treat its 20–40 minute target as achieved evidence.

## Scope and treatment

Source: `.local/eu/`; loopback Studio <http://127.0.0.1:3022/European-Union>. Fourteen scenes, 109.666667 seconds, 3,290 frames, 1080 × 1920 at 30 fps. Direct Remotion composite using one shared `model.ts` evaluator for preview and export. No new HyperFrames/Vox Director run is claimed. Native AnimateMap JSON passes schema/evaluator checks as planning/content; Remotion source is required for the complete composite.

The hook distinguishes Europe from EU. Introduce 27 current members, trace all eight founding/accession cohorts with country flags, names, dates and cumulative historical counts; keep UK until its 2020 withdrawal. EEC 1958 differs from the formal creation of EU in 1993. The market scene animates the four freedoms; comparison cards distinguish EU 27, euro area 21 and Schengen 29 (25 EU + 4 outside). A final 27-flag recap replaces technical credits. Current geography/flags are locators rather than historical territorial reconstructions or a legal treaty-scope map.

Official Council/Commission/ECB sources are recorded in `SOURCES.md`. Bulgaria's euro accession in January 2026 is included. Natural Earth 5.1.2 polygons retain islands/holes; NASA January 2004 composite, flag-icons 7.5.0 MIT, Noto Sans OFL and authored CC0 music/SFX have companion licenses.

Anh Khôi 1.0, 273 actual TTS timing groups, 55 karaoke pages; hook speech ends at 1.34 seconds. One paid task timed out locally, then resumed from the same persisted account/script task. No duplicate paid submission or ASR upload. Equivalent Luxembourg/Ireland/Lithuania names and numeric dates have explicit transcript aliases; year normalization replaces longest phrases first, preventing 2020 from consuming the prefix of 2026.

## Validation and measurement

- Eight unit tests pass: 27 current members plus separate former UK, unique complete cohorts, historical counts and Brexit state, hook duration, caption coverage/non-overlap, deterministic scene/camera selection over every frame, real spoken-name cue correspondence, all original polygon anchor containment including holes, and a visual plan for each one/two-sentence scene.
- ESLint and TypeScript pass. Eighteen smoke samples and 126 final rendered preflight samples pass actual font-box/overflow/intersection/caption/map checks. Fourteen independent Studio/renderStill comparisons pass the unchanged 0.05/255 mean-RGBA limit; maximum 0.00039003/255.
- A single representative 60-frame shot took 14.9396 seconds at concurrency 2 and 12.4807 seconds at concurrency 4. Use 4 for this film. This is not a statistical or whole-film benchmark, and cannot establish universal optimal concurrency.
- `run-log.json` records instrumented stages. First observed clock: 15:40:49 UTC; manifest creation 15:52:24 UTC. Early research before the first clock is excluded. Uninstrumented preparation remains part of total elapsed; file mtimes do not prove pure provider/CPU execution time. Rendering begins at 16:53:09 UTC. Do not claim a two-hour-to-20-minute speedup.

Final media verification and measured delivery figures belong in the completion section after the actual export passes.

## Completed delivery

- Snapshot a519861f0ec3afe9a85a01f839c7dee074fbaaa53ba56d7870a82dbfc9335a98: all 3,290 unique frame audits pass with no browser errors, text intersections/overflow or active-word failures. Final MP4 H.264/yuv420p/faststart, AAC stereo48kHz; video/audio/container endpoints and every frame PTS pass. All original video packet hashes/PTS/DTS remain unchanged after final mux.
- Fourteen decoded comparisons pass: maximum meanRGB 1.90324/255, fraction above channel difference30 at most 0.65143%, below unchanged limits3/255 and2%. Audio correlation0.9998221, SNR34.429dB, zero clipped samples; −15.5LUFS, −1.3dBFS true peak.
- MP4 38952984bytes, SHA256 335436e385c35990c50a26587b52ee8496785daf1763856a52acbd7c0b354dd9. Editable ZIP 27055950bytes, 82entries, SHA256 276d5005541a29f5db846dfd3c55b3187ee441c809e1cc3a0b4c2c3a5916190f; entry integrity and credential scans pass. Raw API responses/dependencies/QA frames excluded. Source includes exact asset manifest and production report.
- Measured elapsed: 86.2 minutes to verified initial MP4/package; 95.2 minutes to cleanup/delivery preparation since first clock observation. Render602.2seconds, preflight348.9seconds, parity47.3seconds, verify/package28.8seconds. Faster elapsed than the earlier G7 session, but not an equivalent workload benchmark and **not** the20–40minute target. Uninstrumented preparation remains the main wall-time gap.
- Cleanup: 246 regenerable files/455291442bytes; final video/source, all authoring inputs and paid cache retained, other topics untouched. Eight tests pass again after cleanup.
