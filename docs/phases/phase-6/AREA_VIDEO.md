# Top 10 countries by surface area

The user requested research and a new video in the established population series. The separate local project `area-top10-un2023` is a 45-second 1080×1920/30 fps composition: two-second opening, ten four-second country scenes counting down from #10, and a three-second ranked overview. Original population projects and videos are preserved.

## Research and data contract

All final numbers come from UN Demographic Yearbook 2023, Table 3, the 2023 Surface area column. Table notes define total land plus inland waters, subject to national coverage footnotes. Only sovereign countries are ranked; Antarctica, continents, the EU and dependencies are excluded. The ten are Russia, Canada, United States, China, Brazil, Australia, India, Argentina, Kazakhstan and Algeria. The display uses million km² with three Vietnamese decimal places; dataset records preserve unrounded km² and year 2023. This is not a ranking by land area alone or by rendered Mercator polygon size.

- [Table 3](https://unstats.un.org/unsd/demographic-social/products/dyb/documents/dyb2023/table03.pdf)
- [Table definitions](https://unstats.un.org/unsd/demographic-social/products/dyb/documents/dyb2023/Notes03.pdf)

The source-selection audit is retained in `.local/area-video`: the current World Bank API returns a substantially different Canadian value, and current UNdata profiles revise Brazil and Kazakhstan. Those releases were cross-checks, not mixed into the final single-table dataset. Original source PDFs, per-country page references, raw profile HTML, SHA-256 checksums, the chosen values and rejected-source rationale are retained. The snapshot year is stated visibly; it is not presented as a 2026 dataset.

## Rendering and assets

Uses the existing pure evaluator, shared MapLibre adapter and actual Chromium/FFmpeg pipeline. Cameras are fitted against bundled Natural Earth polygons, including Canada's archipelago. US camera framing emphasizes the contiguous states while source geometry retains Alaska and Hawaii. Ten flags use pinned flag-icons v7.5.0 with the full MIT notice. NASA Blue Marble retains its January 2004 composite provenance and visible credit. Two original CC0 music/SFX stems from the series are embedded with the same gains, fades and eleven scene-start whooshes. No external account, API key or new runtime dependency is required.

The wide Russia scene exposed a real preview/export background difference outside the Mercator coverage: the editor surface was transparent while the render root had an opaque background. Giving `.map-surface` the same `#101e2d` background fixes this without changing geographic content. Native editor/render pixel comparisons cover the Russia scene as well as Algeria and China.

## Verification

Before export: `pnpm check` passes strict TypeScript, ESLint, 174 unit/integration tests and production build; `pnpm format:check` passes. The existing real MapLibre population-visual E2E scenario passes. New artifact checks validate schema, 1350 repeated deterministic evaluations, no visible zero counters, final-value holds of 2.7 seconds, twelve real scene captures without overflowing text/browser errors, native editor/render parity and twelve antimeridian transition samples. PCM mixing uses the actual worker audio function, with stereo 48 kHz output and zero clipping.

Final export checks and evidence are recorded beside the MP4: `verification.json` checks ffprobe and 24 decoded-frame comparisons; `encoded-audio-checks.json` checks duration, AAC format, RMS, peak and correlation to the PCM mix. Scripts and the editable project remain in `.local/area-video`; generated video is not committed.

The final export passes: 1350 frames, 45 seconds, 1080×1920/30 fps H.264/yuv420p, with stereo AAC at 48 kHz. All 24 decoded-frame comparisons pass the existing tolerance (mean absolute RGB error ≤3/255, <2% of pixels with any channel error >30). Three native editor/render captures have zero pixel difference. AAC correlation to the shared PCM mix is 0.991; musical passages have 40.46 dB signal-to-error, with zero PCM clipping. An independent data audit checks the ten exact source values against the project dataset, ranked scene, flag, evaluated counter/unit, and full API JSON round trip. Delivery filename and checksum are in `.local/area-video/delivery.json`.
