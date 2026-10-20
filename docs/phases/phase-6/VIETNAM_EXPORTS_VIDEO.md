# Vietnam merchandise exports — 2025 basket

## Contract and sources

User approved topic 2, “Việt Nam bán gì cho thế giới?”, and requested a complete
video. Preserve previous deliveries. Authoring directory `.local/vietnam-exports`,
composition `Vietnam-Exports`, loopback Studio port 3012.

Portrait 1080×1920/30 fps; HN–Anh Khôi, Vbee via AI33, speed 1.0; actual provider
timing, karaoke above the TikTok bottom area, original quiet music and SFX.
The hook “Việt Nam đâu chỉ bán gạo!” ends at 1.64 seconds. Actual batch audio
was reused after synthesis; no reference or generated audio was uploaded for ASR.

Use one 2025 merchandise-trade snapshot, published by NSO in January 2026,
with the Government five-year review appendix confirming category values.
Do not mix later Customs revisions, partial 2026 data, services or GDP.

- Merchandise exports: USD475.04 billion.
- Electronics, computers and components: 107.7; machinery/equipment/tools/parts:
  59.1; phones/components: 56.7; textiles: 39.6; footwear: 24.2; wood/products: 17.2.
- These are six illustrative categories, not exhaustive coverage or a top-six
  ranking. Transport equipment/parts at 17.5 exceeds wood but is outside this
  selected set.
- United States: 153.2, the largest destination for total merchandise exports;
  do not attribute that total to any individual product group.
- FDI share: 77.3%, including crude oil. Gross exports are not profits, GDP or
  domestic value added; production location is not brand ownership.

Primary URLs, check date, values, units, scope, publication dates and downloaded
snapshot checksums are in `sources/content-sources.json`:

- [NSO annual 2025 report](https://www.nso.gov.vn/du-lieu-va-so-lieu-thong-ke/2026/01/bao-cao-tinh-hinh-kinh-te-xa-hoi-quy-iv-va-nam-2025/).
- [NSO trade analysis, 8 January 2026](https://www.nso.gov.vn/du-lieu-va-so-lieu-thong-ke/2026/01/ket-qua-hoat-dong-xuat-nhap-khau-hang-hoa-nam-2025-but-pha-ky-luc-va-chuyen-dich-manh-me-sang-cong-nghe-cao/).
- [Government appendix, page 4, footnote 6](https://bcp.cdnchinhphu.vn/334894974524682240/2026/2/6/phu-luc-danh-gia-5-nam-1770388196146892212318.pdf).

## Actual engines and architecture

MapLibre captured two satellite plates and projected original Natural Earth
5.1.2 Polygon/MultiPolygon rings and anchors. NASA Blue Marble is the January
2004 composite. Flag-icons7.5.0 assets have hashes and MIT license; Noto Sans
fonts and OFL license are bundled. Country geometry keeps islands and holes.
Vietnam locator was tested against the polygon, including holes.

The Pacific view required normalizing the camera longitude to the schema's
[-180,180] interval and unwrapping positive longitudes by -360 consistently in
SVG paths and anchors. Keep world wrapping enabled. The mainland-US texture
frame is a visual focus; original Alaska/Hawaii geometry is retained.

Vox Director actually invoked managed Codex CLI, producing 24 shots with zero
tool calls. The plan is consumed by the composition. Map plate, masks, leaders,
pins and cards share the same modest frame-based reframe.

HyperFrames0.8.168 / GSAP3.14.2 rendered 180 transparent PNGs at 920×160/30fps
from the paused `export-products` timeline. Six product-category banners are
used by Remotion4.0.536. Product illustrations are authored SVG components;
`motion.ts` provides pure bounded quadratic movement. Three shipments are
staggered by 0.8 seconds and hidden after arrival, preventing piles of icons.
Connections are explicitly schematic, not AIS tracks or actual shipping lanes.

Native JSON contains camera/basemap/caption planning source. The complete
composite lives in Remotion/HyperFrames source and media; do not claim the
native JSON alone recreates its product graphics.

## Checks and delivery

Actual voice yields 12 scenes, 322 provider timing units, 68 karaoke pages,
99.2666666667 seconds and 2,978 frames. Protected entities include Vietnam,
United States, product names, number phrases and “tỷ đô la”. Re-pagination
preserves every word/timestamp and the master audio hash.

Commands: `node --import tsx --test .local/vietnam-exports/authoring.test.mjs`,
`npm run lint` in the Remotion directory, `persist.mjs`, `restore.mjs`,
`node render.mjs preflight`, `studio-parity.mjs`, `review.mjs`,
`node render.mjs render`, `finalize.mjs`, `verify.mjs`, `review.mjs --decoded`
and `package.mjs`. Browser/network commands require the local execution
environment's escalation. Run one heavy render at a time.

Eight unit tests cover source/category consistency, non-exhaustive selection,
FDI/gross-value definitions, deterministic movement at 0/50/100%, scale bounds,
Pacific anchors, voice/caption coverage and real engine outputs. Lint/TypeScript,
API exact JSON round trip and refresh restoration passed. Preflight passed
206 frame samples, including every scene/caption page and fast-motion samples.

Final gates passed:

- Studio: 18 samples, maximum mean RGBA error 0.00012140721450617285/255. Small raster differences remain; do not call this pixel-identical.
- Repeat seeks: 3 samples, maximum mean RGBA 0/255.
- Runtime: 2978 audits; all 2978 unique frames, no missing frames, timing/layout/browser failures.
- Decoded MP4: 206 samples, maximum mean RGB error 1.5342595807613169/255; maximum fraction with any channel difference >30 is 0.017906057098765433. Both original thresholds passed.
- Audio correlation 0.9998407694599919; SNR 34.909951080312936dB; RMS ratio 0.9977390264401117; clipped samples 0. PCM/AAC endpoints and decoded sample counts match.
- H.264/yuv420p/faststart, 1080×1920/30fps, 2978frames; AAC stereo48kHz; 99.26666666666667seconds. Every video PTS equals frameIndex/30. Final audio mux preserved all video packets, DTS/PTS and codec configuration.
- Manual contact-sheet review covered all scenes and 68 caption pages, plus departure/middle/arrival samples. Decoded reviews repeated that coverage.

Delivery: `Viet-Nam-Ban-Gi-Cho-The-Gioi.mp4`, 18417260bytes, SHA-256 `d9ee0b296cdb8a05c96944b7644d4b0c726546a089728d1da1ce2e89572bce52`.

Editable source: `Viet-Nam-Ban-Gi-Cho-The-Gioi-editable-source.zip`, 25853303bytes, 307entries, SHA-256 `7967fa3dee7ca166ca1046ccfc2bb47f8eafffb84ead2b6d6a3efe08cf9c96ec`. ZIP entry and actual credential-content scans passed with zero hits; no node_modules, .git, .env, keys, raw base64 TTS response or QA frame directories. Includes source, media/fonts, voice clips, timing, SRT, project JSON, real Vox plan, HyperFrames HTML/GSAP, provenance and licenses.

Full metrics, fingerprints and evidence remain in the local artifact reports.
