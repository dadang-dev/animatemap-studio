# APEC — Pacific editorial design

Requested23 October2026. Source `.local/apec/`; Studio <http://127.0.0.1:3024/APEC>. User asked for a different design from EU/ASEAN and real imagery. Reused the deterministic render/audio infrastructure, authored a Pacific-centered map treatment, turquoise/orange identity, a geographic journey through all21 member economies, cargo-link illustration, two common-scale2024 charts, real archival photographs and Vietnam hosting tickets. Direct Remotion composite; no new HyperFrames/Vox Director execution claimed.

## Content contract

APEC is an economic forum of21 member economies, not21 sovereign countries or a military alliance. Official labels Hong Kong, China and Chinese Taipei appear with their accession years. Geographic grouping is editorial, not an APEC organizational structure. Founding12 in1989, totals15/17/18/21 in1991/1993/1994/1998. Vietnam1998, hosted2006/2017, preparing2027. From APEC in Charts2025: nominal GDP61% and goods+commercial services trade46%, both2024. Do not substitute2026 or merchandise-only values.

Sources/definitions/URLs and licenses are in SOURCES.md and LICENSE-PHOTOS.md. Da Nang10 November2017 photo is Kremlin.ru CC BY4.0, with credit in its scene; Port of Los Angeles17 March2003 is U.S. Coast Guard / PA3 Louis Hebert, public domain, explicitly illustrative. Neither is current footage. Charts are original graphics from cited factual values, not copied NC-SA PDF artwork. NASA January2004, Natural Earth5.1.2, flag-icons7.5.0 and Noto retain provenance. Russia receives a neutral outline and callout flag rather than flag-filled geometry including Crimea.

## Voice and timing

One paid text-only Anh Khôi1.0 task, with transcript disabled after the ASEAN provider delay. Actual audio cached; no audio upload. Local faster-whisper1.2.1 small/int8 finished in60.03seconds,291 timing groups. Explicit spelling corrections retained with the raw ASR; no independent listening or phoneme accuracy claimed.14scenes,106.933333seconds/3208frames,60caption pages. Hook speech ends2.44seconds. Regrouping preserves audio and word intervals, protects multiword names and percentage units.

## Corrections and gates

- HKG locator fell in harbour water: sampled the nearest land point within the original polygon respecting holes; all21 containment tests pass. OneDrive reparse attributes alone do not identify a symlink/junction.
- ASR serialized61/46 as digits: the first graph used fallback cues and revealed both values early. Cue normalization now matches equivalent spoken phrases to actual numeric timestamps; a regression test verifies the two distinct real cues.
- Vietnam host-year text crossed the map: moved map and all anchors upward and placed the host line in the gap above the photograph. Speech/master/timing unchanged.
- Country-shot QA must sample the actual half-open card lifetime, including its250ms lead; sampling merely at word+550ms can hit the next short name and report the wrong economy.

Nine unit tests, strict TypeScript and ESLint pass. Final129-frame preflight, all21 economy-card captures and14 independent Studio/render comparisons pass on one fingerprint. Final media/source delivery and cleanup are complete.

Viewport culling omits only whole offscreen world copies/features, preserving original geometry. All129 before/after samples are within the established mean-RGBA<0.05 criterion;26 samples have sparse one-level differences (maximum mean0.000004943, maximum channel1), so this is explicitly not pixel-identical. The exact-zero diagnostic is retained. Independent Studio parity passes separately. Two-thread benchmark35.77seconds/60frames beat four-thread37.77seconds; the earlier uncullled sample was30.78seconds, so no performance improvement from culling is claimed. Full-film timing is measured separately.

## Encoding correction and final evidence

The first PNG/CRF16 export failed one of150 decoded samples: frame1675 mean RGB3.2355 exceeded the existing3/255 limit. Tolerances were not relaxed. A60-frame JPEG100/CRF12 probe reduced that frame to1.3559. Full JPEG capture produced yuvj420p/full-range with BT601 coefficients despite the requested pixel-format setting; this was rejected by the output-contract gate. Normalize the full stream to BT601 limited-range, preserving its coefficients and using CRF8/yuv420p; do not merely flip a range tag or silently change the matrix. A probe using BT709 conversion exceeded the image threshold, so it was not chosen. Same-coefficient limited-range probe achieved1.7846. The source finish helper performs the actual conversion, and all150 final decoded samples pass. Keep PNG basemap/photo inputs for stable source rasterization; JPEG here is the output-capture format, not a return to the earlier unstable JPEG map asset.

All3208 runtime audits pass. H.264/yuv420p1080×1920/30fps, faststart, AAC48kHz stereo; container/video/audio endpoint106.933333seconds. Audio correlation0.999784, SNR33.58dB, zero clipping,−15.3LUFS integrated and−1.5dBFS true peak. The final mux preserves all3208 normalized-video packet hashes/PTS/DTS; the reference is the range-normalized stream, not the original full-range Remotion stream. ZIP integrity and credential scans pass. MP4 SHA256:70db74ede44de3304f2fe48263d9e6ffb60db326fff2ed7d7eadfe2ad6dd921c.

Files: `.local/apec/APEC-Vanh-Dai-Thai-Binh-Duong.mp4` (110,773,185bytes), `.local/apec/APEC-editable-source.zip`; metadata and hashes in delivery.json. Generated QA, rejected encodes and duplicated draft media were removed after final verification, freeing1,516,117,772bytes. Source/voice/timings/cache/shared runtimes remain. See docs/VIDEO_LIBRARY.md for verified local delivery links.

Measured full render:627.68seconds with PNG/CRF16,420.79seconds with JPEG100/CRF12 on this film. The latter also required range normalization and full re-verification; this is not an end-to-end20–40-minute claim or a general benchmark guarantee. JSON native is planning/basemap/caption only; Remotion source/public assets reproduce the complete film. Historical before/after culling screenshots were intentionally cleaned; retain the JSON evidence rather than claim a fresh comparison after cleanup.
