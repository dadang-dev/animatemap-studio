# Vietnam historical boundaries — V2

Authoring date: 2026-10-18. User-authorized correction of V1's editorial failure:
modern locators could not show territorial change. Independent artifact directory
`.local/vietnam-area-history-v2`, composition `Vietnam-Area-History-V2`, loopback
Studio port3006. V1 retained. No application/schema changes or guard increases.

## Scope and reconstruction

17 scenes, 12 historical scenes, 181.7 seconds / 5,451 frames at 1080×1920/30fps.
Selected outlines: early XI, 1069, 1306, late XV, 1611, 1653, 1698–1757 and early
XIX. Separate Thuận Thành status/1832 administration change, Trấn Tây temporary
administration1835 and withdrawal1841. No claim to cover every territorial change.
The modern statistics scene explicitly jumps across later XIX–XX developments.

Historical raster: CGlassey, Gryffindor and Night Lantern, Wikimedia Commons
[curid1440137](https://commons.wikimedia.org/w/index.php?curid=1440137), CC BY2.5.
Raw GIF SHA-256 `1d537e3b7c472d6e2e5dd78ee7a20257f25b6d7ec1fdf5d86d3aee170baf0a08`.
Changes: raster digitization, georegistration, recoloring and animated masks.
Attribution/license/change notice appear on the end card and source package.
Other downloaded maps were research-only and excluded from the production ZIP.

Explicit region palettes remove source labels/legend from the masks. Regression
checks prevent quantized white text becoming false islands. Closed WGS84
MultiPolygon rings retain derived holes. Nine town control points fit source pixels
to longitude/Mercator Y. In-sample RMSE8.2456178km is a calibration residual, **not**
independent historical validation or an accuracy confidence interval. Source
frontiers are schematic. Western uncertainties use distinct gray hatching.
Thuận Thành's local status hatch is illustrative, not a precise independent border.
Trấn Tây uses a separate digitized polygon and is not counted as stable territory.
GIS spherical areas are diagnostic only, never displayed as ancient national km².

Every scene uses camera107.6E/18.2N, zoom5.25, zero pitch/bearing: old dashed
outline and new bright land share one scale, without scene-specific zoom bias.
Withdrawal animation starts at the actual TTS token “rút”; annex status at “sáp”.
Modern area is only the 2024 inventory, published2026:33,214,437ha /332,144.37km².
Source URLs, claims and data definitions are retained in content-sources.json.

## Engines and voice

Actual Vox Director managed-Codex output:34 shots, zero tool calls. MapLibre
captures NASA01/2004 plates and projects historical geometry/pins with the same
camera. Remotion4.0.536 renders the composition. HyperFrames0.8.168/GSAP3.14.2
renders `historical-map-legend`:120 alpha PNGs at30fps; method scene holds frame110
after reveal. Lint/runtime/layout pass; contrast analyzer inspected zero nodes, so
its empty result is not claimed as an executed contrast test. Visual review applies.

Anh Khôi1.0:16 voiced scenes, four byte-identical V1 clips and12 newly generated
clips. Actual provider timings, full-script comparison,110 caption pages. No ASR
upload. Retired incorrect-provider-transcript variants are preserved locally but
excluded from delivery. Hook ends1.64s. Master includes authored music/chimes.

## Gates

- `node --test .local/vietnam-area-history-v2/authoring.test.mjs`:9/9 pass.
- `npm run lint` in V2 Remotion: TypeScript/ESLint pass.
- Schema and pure evaluator:all5,451 frame times deterministic;12/12 pin containment.
- API JSON round-trip and IndexedDB refresh restore:exact, V2 project ID.
- Preflight:280 samples, all17 scenes/110 caption pages, shot boundaries and
  intermediate annex/occupation/withdrawal moments; no overflow/timing/browser errors.
- Repeated seek:three frames, meanRGBA0/max0. Studio/native comparisons pass,
  exact pixels on sampled frames using identical Chromium/GLangle/sRGB/DPR1.
- Manually inspected every scene and all110 caption pages; no missing/duplicate words.

Native schema exposed a one-ULP accumulated scene endpoint over the canonical
integer-frame total. Serialize the final silent credit duration as total minus its
start, preserving240 credit frames and all speech. No schema tolerance relaxed.

## Final media and delivery

Real render completed and audited all5,451 unique frames, no missing frames,
runtime/browser errors or word-timing failures. Final mux preserves every video
packet hash, DTS/PTS, duration and decoder configuration. ffprobe confirms H.264,
yuv420p, faststart,1080×1920/30fps,181.7s,5,451 frames; AAC stereo48kHz and exact
container/video/audio endpoints. All frame times equal integer frame index/30.

All280 decoded reference comparisons pass unchanged thresholds: maximum meanRGB
1.616104/255, maximum fraction with any channel error>30 is1.263648% (<2%).
23 Studio/reference samples are pixel-identical. These measurements apply to the
sampled frames, not a claim that lossy MP4 is pixel-identical.

Decoded audio:17,443,200 float samples, exact expected sample count;
correlation0.99986023, SNR35.47494dB, RMS ratio0.99787215, zero clipped samples.
Integrated loudness−16.2LUFS, true peak−1.7dBFS. Voice/master/timing hashes retain
their locked values. Native and decoded scene/caption contact sheets retained
locally; no QA PNGs in the delivered source archive.

- MP4: `Viet-Nam-Ranh-Gioi-Lich-Su-V2.mp4`,19,073,349bytes,
  SHA-256 `2042b21b8187cb2171768382401f2c43f8d1fa2eece5b887acba0921690fe72a`.
- Editable ZIP: `Viet-Nam-Ranh-Gioi-Lich-Su-V2-editable-source.zip`,36,865,734bytes,
  264 audited entries, SHA-256
  `10d086780d25a2b04806fe4a5eafd9825fa0727b53d5e5f067f788f0d83ba7e0`.

Source contains full composite, raw used map/derived GeoJSON, licensing,
HyperFrames/GSAP assets, shot plan, fonts, sanitized production voice metadata,
WAVs, master, SRT, word timing, native planning JSON and package locks. Excludes
credentials, node_modules, Git data, QA frames and unused research maps. Native
JSON alone does not recreate the full Remotion/HyperFrames composite. Rebuild
instructions state workspace/helper dependencies and machine-specific Chromium
paths. Verification/provenance/delivery/archive evidence is in the artifact folder.
Prior deliveries remain intact. No application code changed, so no unrelated
monorepo suite was repeated for this authoring-only correction.
