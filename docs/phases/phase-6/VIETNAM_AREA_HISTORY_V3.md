# Vietnam history V3 — raised captions for TikTok

Layout follow-up: user reported scope/legend over northern Vietnam. The V3 audit
below measured text/text collisions and caption safety, not text/territory
separation. [V4](VIETNAM_AREA_HISTORY_V4.md) fixes this omission; V3 retained.

2026-10-18–19. User requested removal of the bottom milestone/progress strip and
higher subtitles because TikTok covers low captions. New composition
`Vietnam-Area-History-V3`, artifacts `.local/vietnam-area-history-v3`, loopback
Studio3007. V2 retained. Visual-only correction; no TTS or ASR requests.

Removed the actual timeline element. Karaoke moves from y1680 to1430, width940
to860, font45 to43; left70/right150px reserves space for platform controls.
Measured caption boxes must remain below1570px, leaving at least350px at bottom.
Map plate, geometry, pin and callout share a−85px translation. Legend moves to620,
status to1380 and HyperFrames card to1100. Modern statistics scene omits the
historical legend because it collided with km² and does not describe that scene.
Frame-by-frame audit rejects timeline presence or caption safe-region violations.

Byte-identical to V2:16 production voice clips/master, script, timings,110 caption
pages, SRT, edit-data, shot plan and duration181.7s/5,451frames.18 audio/timing file
hashes checked. Two new layout/immutability tests supplement nine existing
authoring tests. API round-trip and refresh restoration retain the separate V3 ID.
TypeScript/ESLint pass. Historical geography/content/provenance are unchanged;
see [V2](VIETNAM_AREA_HISTORY_V2.md) for sources and reconstruction limitations.

Platform safe region is a layout choice, not a guarantee about every TikTok
device or expanded description panel. Source, master and timestamp locks remain
in the editable archive.

## Verified final output

11/11 tests pass (nine authoring plus two correction locks). Preflight280 samples
pass; all110 caption pages remain within y1430–1532.640625, leaving387.359375px
bottom clearance and150px right. All timeline counts zero.23 Studio/native
samples pixel-identical, three repeated seeks exact.17 scenes/110 caption pages
visually reviewed in contact sheets. Full render audits all5,451 unique frames,
zero missing/overflow/overlap/timing/browser failures.

ffprobe confirms1080×1920,30fps,181.7s,5,451frames,H.264/yuv420p/faststart,AAC
stereo48kHz. Final mux preserves every video packet/timestamp/decoder config.
All8,519 AAC packets/timestamps exactly match V2, beyond unchanged master hashes.
Decoded280 samples: maximum meanRGB1.616080/255, fraction with channel error>30
maximum1.263648%, within unchanged thresholds. Audio correlation0.99986023,
SNR35.47494dB,RMSratio0.99787215,zero clipping,−16.2LUFS,truepeak−1.7dBFS.

- `Viet-Nam-Ranh-Gioi-Lich-Su-V3.mp4`:18,821,461bytes, SHA-256
  `5749a29c1a296af8e8480408fece11647cdb99eaee329e3525c46f72be312fde`.
- `Viet-Nam-Ranh-Gioi-Lich-Su-V3-editable-source.zip`:36,866,480bytes,
  268 audited entries, SHA-256
  `f6458faa784c91c680fa9c52e018e1c49205618d41a7042e8c8504ea33cb8617`.

Editable source includes correction tests, measured safe-region evidence,
audio bitstream lock and existing provenance/licenses. Source snapshot matches
preflight/render. Native planning JSON does not reproduce the complete composite;
Remotion/HyperFrames source does. Prior media retained. No app/schema changes.
