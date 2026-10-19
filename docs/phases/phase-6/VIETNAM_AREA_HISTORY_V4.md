# Vietnam history V4 — separate header and territorial map

2026-10-19. User reported that the scope note and legend still covered northern
Vietnam in V3. V3's text/text collision audit did not include painted territory,
so its passing layout evidence did not establish map/text separation. V3 remains
preserved. New composition `Vietnam-Area-History-V4`, artifacts
`.local/vietnam-area-history-v4`, loopback Studio3008.

Move series/index/headline/year to y60/110/150/315; hook note370; scope470 with
18px font; legend530. Modern area number315/90px, unit36px and details490/22px.
These edits reserve a header above the territorial polygons. Map, geometry, pins,
callouts and karaoke retain V3 positioning and scale. Status notes move from
y1380 over the southern tip to a270px card at x720/y850 in empty sea, checked
against every painted path rectangle and other labels. Caption safe region remains
y1430–1532.640625, right150px, bottom387.359375px. No timeline reinstated.

New per-frame collision audit measures actual SVG paths via DOM rects after shared
map transform, excluding paths inside defs/masks. Current/previous/temporary and
modern-reference outlines define a conservative top boundary. Every header element
must end at least16px above it. The full SVG viewport is not used as territory
bounds. This rule supplements text/text collisions and platform caption bounds.

Voice clips, master, script, every timing token, all110 caption pages, shot plan,
duration181.7s and5,451frames remain identical to V3. No TTS/ASR requests. Existing
licensed reconstruction/content/provenance unchanged:see
[V2](VIETNAM_AREA_HISTORY_V2.md). New V4 native planning ID saved separately.

Pre-render gates:12 tests pass (nine authoring, three immutability/layout/
regression). TypeScript/ESLint pass.280 preflight samples pass, all17 scenes and
110 caption pages covered. Minimum measured header-to-path gap19.7999878px,
required16px. Applying the new check to V3 rejects272 prior samples.23 Studio/
native reference samples and three repeated seeks are pixel-identical. Caption
region comparison is pixel-identical to V3 for all110 pages. Native planning JSON
round-trip/refresh restore exact. Source/public/lockfile snapshot frozen before
render. No application/schema changes; unrelated monorepo suite not repeated.

## Final media

Real render audits all5,451 unique frames, no missing frames, text/text,
header/map or status/map collisions, word-timing failures or browser errors.
Final mux preserves all video packets/timestamps and decoder configuration.
ffprobe:H.264/yuv420p/faststart,1080×1920,30fps,181.7s,5,451frames;AAC stereo48kHz,
exact container/video/audio endpoints.8,519 encoded audio packets/timestamps
identical to V3. All280 decoded comparisons pass:maximum meanRGB1.616269/255,
maximum pixel fraction with channel error>30 is1.263937%, within unchanged gates.
Audio correlation0.99986023,SNR35.47494dB,RMSratio0.99787215,zero clipping,
−16.2LUFS,truepeak−1.7dBFS. Decoded scene/caption review assets retained locally.

- MP4:`Viet-Nam-Ranh-Gioi-Lich-Su-V4.mp4`,18,868,810bytes, SHA-256
  `1ae3549acea610c9c101550d0cbb7c6eb1479de8b416796acbceffa70c5327cd`.
- Source:`Viet-Nam-Ranh-Gioi-Lich-Su-V4-editable-source.zip`,36,873,380bytes,
  270 audited entries, SHA-256
  `25358c06f3a540d3154c45899440a6ad1f3ee8e4c312e00cbdde2e3aeee096d4`.

Source includes all composite assets, timing, licenses, correction/regression
evidence and locks, with no credentials, dependencies, retired voice variants,
unused research maps or QA PNGs. Native project is planning only; full composite
requires the included Remotion/HyperFrames source. V1–V3 preserved. No HeyGen
assets/services were used for this correction.
