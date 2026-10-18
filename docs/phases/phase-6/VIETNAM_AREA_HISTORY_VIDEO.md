# Diện tích Việt Nam qua các thời kỳ lịch sử

Editorial status: the user rejected V1's modern-locator approach because it did
not show changing territorial footprints. Technical QA below remains valid for
that preserved artifact, but does not establish editorial acceptance. Superseded
by [historical-boundary V2](VIETNAM_AREA_HISTORY_V2.md); V1 files remain intact.

Authoring date: 2026-10-18. Independent project `.local/vietnam-area-history`,
composition `Vietnam-Area-History`, Studio loopback port 3005. Previous deliveries
remain intact. No application/schema changes or limit increases.

## Scope and sources

Eight selected milestones: Hoa Lư/Đại Cồ Việt (968), three châu under Lý (1069),
Ô/Lý (1306), Quảng Nam thừa tuyên (1471), Gia Định administration (1698), Tầm Phong
Long (1757), Nguyễn dynasty/Huế (1802), state reunification/name (1976).
This is not an exhaustive territorial history. No consistent, appropriately
licensed set of historical Vietnam polygons and comparable dynasty-area estimates
was found in the researched sources. Therefore the video does **not** fabricate
ancient km² values or shade present provinces as historical territory. Historical
scenes visibly label their modern locator backdrop and its limits. Neutral modern
reference outlines are not a claim about ancient borders. Current flags are not
used as historical flags.

Historical publishers include the Vietnam National Museum of History, Huế culture
department, Quảng Bình science department journal, local official portals in Đà
Nẵng, Đồng Nai and An Giang, and Government News. Exact claims, URLs, retrieval
date, narration and shot order are retained in `sources/content-sources.json`,
`story.json` and `STORYBOARD.md` in the artifact directory.

Modern land inventory/statistics retain original integer hectares:

| Data year |   Hectares |        km² | Decision / publication   |
| --------- | ---------: | ---------: | ------------------------ |
| 2019      | 33,131,713 | 331,317.13 | 1435/QĐ-BTNMT, 2021      |
| 2023      | 33,133,831 | 331,338.31 | 3411/QĐ-BTNMT, 2024      |
| 2024      | 33,214,437 | 332,144.37 | 456/QĐ-BNNMT, 2026-02-03 |

The 2024 figure is reported by the Ministry's newspaper, with decision metadata on
the Ministry's site. The 2019 and 2023 figures are reproduced by official Bình
Phước and Khánh Hòa portals. Data year and publication year are separate on screen.
Conversion is exactly ha / 100. Differences between inventories are not presented
as evidence of annexation or attributed to an unverified cause. EEZ is excluded
from this land-area indicator. Source geography is not used to calculate area.

## Actual pipeline

- MapLibre produces NASA Blue Marble plates and projects the original Natural
  Earth 5.1.2 Vietnam feature and eight locators through the same camera. Country
  geometry, islands and rings remain unchanged; no historical polygons created.
- Vox Director local fork invokes managed Codex CLI, producing 32 actual shots
  with zero tool calls. IDs, narration and timing stay fixed. Framing influences
  the brief camera settle, then callouts remain stable.
- HyperFrames 0.8.168 with paused GSAP 3.14.2 timeline creates a real unit-conversion
  graphic (100 ha = 1 km²), exported as 120 RGBA PNGs at 30 fps.
- Remotion 4.0.536 composites 16 scene components, map plates, projected leaders,
  editable titles, exact values, karaoke and the shared PCM master.
- AI33/Vbee live catalogue confirms HN - Anh Khôi at speed 1.0. Fifteen actual TTS
  clips are cached by request hash. No ASR/audio upload. Full transcript comparison
  permits only explicit equivalent years, km spelling, Champa/Chăm Pa and mốt/một;
  different years or numeric values are never normalized to one another.
- Deterministic original music and scene chimes duck under speech. External stereo
  48 kHz WAV does not bypass or change embedded project audio limits.

## Validation and delivery

Production duration is 160.83333333333334 seconds / 4,825 frames at 30 fps,
1080×1920. Hook speech ends at 1.64 seconds. Semantic pagination produces 97 pages,
protecting multiword names, square-kilometre units and the full country name without
altering the master hash or timing tokens.

Seven focused authoring tests pass; Remotion ESLint/strict TypeScript pass.
Schema and repeated evaluator checks cover every project frame. Real API JSON
round-trip and IndexedDB refresh restoration pass. HyperFrames lint/runtime/layout
pass with zero findings; its contrast analyzer reports zero checked nodes, so it
is not cited as a successful executed contrast test. Visual inspection found a
low-contrast inherited index label, fixed before the final snapshot gate.

Final preflight covers 237 samples and all caption pages with no timing, overflow,
overlap or browser errors. Three repeated seeks are byte-identical. Studio/native
parity covers 22 samples, including HyperFrames, with zero mean/max RGBA difference.
Frozen source/public/lockfile fingerprint:
`2342388dd5c59b19cfcad6888aeab4b87e07b451ba4c07202a4b8c9329c517b9`.

The final MP4 passes ffprobe: H.264/yuv420p/faststart, 1080×1920, 30 fps, 4,825
frames, AAC stereo 48 kHz, exact project endpoint within the established 2 ms
container tolerance. Every video frame timestamp matches its index / 30. All 4,825
composition audits pass with no missing frames, timing failures or browser errors.
The final mux preserves every encoded video packet, timestamp and decoder config.

Decoded comparison: 237 samples, max mean RGB error 1.584526/255 and max pixel
fraction above 30 in any channel 1.153743%, within the unchanged 3/255 and 2% gates.
Audio: 15,440,000 interleaved decoded samples, matching the PCM master length;
correlation 0.99985184, SNR 35.215 dB, RMS ratio 0.997699, peak 0.824031, zero clipped
samples. Integrated loudness −16.2 LUFS; true peak −1.7 dBFS.

Final file: `Dien-tich-Viet-Nam-qua-cac-thoi-ky.mp4`, 20,716,848 bytes.
SHA-256: `6e387d11176107c7a872afde059399458f14f001e55640a51821983a0adaa0c2`.

Final media, decoded-frame/audio and archive evidence are recorded in the artifact
delivery report. Native JSON contains planning/basemap/captions;
the editable Remotion/HyperFrames source archive is required to reproduce the
final composite. Software, geography, fonts, voice and authored music have separate
licenses. The archive excludes dependency folders, credentials and QA images.

Source archive: `Dien-tich-Viet-Nam-editable-source.zip`, 35,208,445 bytes, 244
audited entries. SHA-256:
`bca0d7ef379fd7c99a833d017f4bdc6a77a37e0c0ed80f50fa82cef183f41ab5`.
All delivery gates pass; the documented limitation is the absence of comparable
ancient-area estimates and historical-border reconstruction, not a pending render
or an unverified simulated export.
