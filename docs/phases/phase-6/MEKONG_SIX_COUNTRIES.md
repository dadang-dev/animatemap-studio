# Mekong — six riparian countries

## Contract and research

User approved topic 1 and requested a complete video, authored voice, a hook
within three seconds, and real Remotion, HyperFrames and Vox Director outputs.
Artifact directory `.local/mekong-six-countries`; composition
`Mekong-Six-Countries`; loopback Studio port 3011. Keep prior deliveries.

Portrait 1080×1920/30 fps. Cover China, Myanmar, Laos, Thailand, Cambodia and
Vietnam, then explain sediment/ecosystem connections and multiple pressures.
Distinguish six riparian countries from four MRC members; boundary reaches
from rivers crossing a country's interior; Tonle Sap seasonal reversal from
reversal of the Mekong mainstream. No current water-level or flood claims.

Primary research: MRC Geography, Geographic Regions, Sediment Monitoring,
Basin Development Strategy 2021–2030 and MRC membership pages. Full URLs,
claims, scope and check date are in `sources/content-sources.json`. The stated
approximately 4,900 km comes from MRC, not measurement of generalized GIS.

## Real assets and architecture

Natural Earth 5.1.2 public-domain river centerlines downloaded from the pinned
release with SHA-256, original features retained. Thirteen separate original
segments cover Lancang/Mekong and Tonle Sap. They omit some headwater and
delta reaches; dashed direction marks into the sea are expressly schematic,
not digitized distributaries or navigation channels. Labels for Tiền/Hậu use
the corresponding branches. Country Polygon/MultiPolygon geometries retain
islands and holes; cameras frame the river corridor, not entire countries.

MapLibre captures nine NASA Blue Marble plates and projects country/river
paths, landmarks and anchors with each plate's camera. Six anchors pass
point-in-polygon checks. Flags use flag-icons 7.5.0 MIT, fonts pinned Noto Sans
OFL. NASA imagery is a January 2004 composite. Credits are in the end card and
companions; karaoke is raised into the established TikTok safe region.

Turf 7.3.1 computes cumulative geodesic segment distances. Pure `flow.ts`
reveals the projected original path using those weights. The ordered upstream
chain reaches the Phnom Penh junction before both delta branches start; it
does not connect disjoint segments across land. Particles are illustrative,
not a measurement of velocity or discharge. The seasonal direction changes
at the actual provider cue for “mùa khô”.

Vox Director local really calls managed Codex CLI: 23 strict shots across
13 scenes, tool calls 0. It controls restrained shared map/leader/callout
reframing. HyperFrames 0.8.168 / GSAP 3.14.2 really renders 180 RGBA frames,
920×160/30 fps, paused `mekong-countries` timeline. Lint/runtime/layout pass.
Remotion 4.0.536 composites scenes, river action, labels, karaoke and sound.
Native JSON is only camera/basemap/caption source; source Remotion/HyperFrames
is required for the full composite. No private Codex token is accessed.

## Voice, timing and checks

AI33/Vbee HN - Anh Khôi ID `vbee_hn_male_phuthang_news65dt_44k-fhg`, speed 1.0.
One cached TTS batch returned 79.269646 seconds and 277 real timing units.
The complete transcript matches the script, with only equivalent spelling
normalization “Mê Kông”/“Mekong” and “kilomet”/“ki lô mét”. No audio uploaded
for ASR. Twelve clips split at true silence midpoints, no tempo change.

Hook: “Sáu nước chung một dòng sông!” ends at 1.58 seconds. Final timeline:
2,789 frames, 92.966667 seconds, including seven seconds of source credit.
Fifty-eight caption pages retain every original timing interval and protect
multiword names. Original music/SFX share the preview/export PCM master.

Commands: `node --import tsx --test .local/mekong-six-countries/authoring.test.mjs`;
Remotion `npm run lint`; persistence/restore; `node render.mjs preflight`;
`studio-parity.mjs`; `node render.mjs render`; `finalize.mjs`; `verify.mjs`;
`review.mjs --decoded`; `package.mjs`.

Eight authoring tests pass: six-country coverage/border wording; original
geometry/flag checksums/anchors; weighted 0/50/100 reveal; real seasonal
direction; actual voice/script/hook/word timing/pages; actual Vox/HyperFrames;
upstream network order and delta fork; semantic phrase pagination. TypeScript/ESLint pass. Native schema
and deterministic evaluation pass for every frame. API exact round-trip and
refresh restore pass. Preflight: 186 samples, including every page, scene,
shot and reversal boundary; three repeated seeks have zero pixel difference.
Flow-state checks pass on all 186 samples, including wet and dry directions.
Studio parity: 19 samples, maximum mean RGBA below 0.05/255 (small raster
differences are reported, not called pixel-identical). Every scene, every
caption page, flags, route branches and credits were visually reviewed.

## Lessons

- Separate river features can have the same name and local segment index.
  Include the feature index in IDs; duplicate React keys can reuse the wrong
  path as direction changes. Validate all 13 IDs are unique.
- Latitude sorting is insufficient for a river bending north/east. Use an
  explicit connected chain for the pinned source, with shared junction offsets
  for distributaries, and test the fork rather than drawing connectors.
- Generalized centerlines do not establish the exact source, full delta network
  or real river length. Preserve source gaps; distinguish schematic extensions
  and do not invent a surveyed path to make the narrative look complete.
- Browser evaluate closures transpiled by TSX can reference `__name`. Supply
  the harmless helper in the test page before navigation, or use a browser-safe
  bundle; this is not an application API or a reason to loosen readiness.

Pagination review caught “miền Tây” and “phù sa” split across pages. The final paginator protects region names and semantic compounds; audio SHA and every word timestamp remain unchanged. The earlier partial encode was stopped, then persistence, preflight/parity and final rendering repeated for the corrected snapshot. Final encoded-file results and hashes are recorded below.


## Final export — passed

- All 2,789 runtime frames pass: no missing frames, word/flow timing failures, browser errors or layout failures. Decoded contact sheets reviewed for every scene and all 58 pages, including the dry-season reversal.
- H.264/yuv420p/faststart, 1080×1920/30fps, 2,789 frames, 92.966667 seconds; AAC stereo48kHz. Exact container/video/audio endpoint and every frame timestamp pass. Final mux preserves all video packet hashes, DTS/PTS and decoder configuration.
- 186 decoded comparisons pass: maximum mean RGB error 1.436376/255; maximum fraction of pixels differing by over30 in any channel is1.832562%, below the declared2% limit. Studio max mean RGBA0.000412326/255, max channel1. No thresholds were loosened.
- Decoded audio: 8,924,800 interleaved samples, correlation0.99984366, SNR34.98878dB, RMS ratio0.99774712, zero clipped samples; -15.1LUFS integrated, -1.5dBFS true peak. Speech tail preserved.
- MP4: `.local/mekong-six-countries/Mekong-Sau-Nuoc-Mot-Dong-Song.mp4`, 14,509,581 bytes. SHA-256 `7fdb52aca1cad977cf95f5360fa3d3855c2d8f33d9ab68ac5186c4b41e3faddb`.
- Editable ZIP: 328 audited entries, 35,053,160 bytes. SHA-256 `88af253308f2820d3ef7b2541634ec1ec8d4d3b0bd6372963ef759c55be124c1`. Entry and exact credential-content scans pass. Source/media/fonts/locks/licenses are included; keys, environments, dependencies, Git and QA frames are excluded.
- Studio3011 verified listening on127.0.0.1. No app/schema changes. STATUS.json, verification.json, delivery.json and archive.json record completion. All earlier videos are preserved; no blocking issue remains.
