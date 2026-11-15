# G7 — geography, membership and an informal forum

Requested 22 October 2026: a complete G7 video with a meaningful animation/chart/infographic every one or two sentences, keeping the map as the main background. Authoring source and paid voice cache: `.local/g7/`. Loopback Studio: <http://127.0.0.1:3021/G7>.

## Treatment and scope

- Ten scenes, 78.866667 seconds, 1080 × 1920 at 30 fps. Camera travels from a world overview to North America, Europe and Japan. All seven countries have a flag, name and a geographic leader callout; original Natural Earth polygons, islands and holes are retained.
- Animated seats explain membership; common-scale bars count two North American, four European and one Asian member. The historical timeline explains G6 in 1975 and Canada's accession in 1976. EU participation since 1977 is separate from the seven-country count. Three topic nodes explain dialogue and coordination. No GDP ranking or military alliance is implied.
- Official German finance ministry, Canadian G7 materials and EU Council sources are recorded in `SOURCES.md`. Current flags/borders serve as locators, not historical reconstructions. NASA Blue Marble is a 2004 composite. Flag-icons 7.5.0 MIT, Noto Sans OFL, public-domain geography and authored CC0 music/SFX have companion license records. No technical-credit ending scene.
- Anh Khôi at speed 1.0; 240 actual provider-timed words and 48 karaoke pages. The hook finishes at 2.24 seconds. One paid batch is split at actual silence midpoints; no new ASR upload and no repeated TTS request. Spoken-number normalization only accepts equivalent years, preserving all words and timing.
- This composition uses Remotion directly. It does not claim new HyperFrames or Vox Director execution. The native AnimateMap JSON is validated planning/content data; the Remotion source/public assets reproduce the full camera/infographic composite.

## Checks and renderer decision

Seven Node unit/contract tests pass, covering complete unique membership, provider transcript equivalence, hook duration, every frame's half-open scene membership, caption word coverage/non-overlap, scene treatment coverage and count totals. ESLint and TypeScript pass. One hundred independent rendered preflight samples audit actual font boxes, overflow, intersections and active karaoke words.

Ten actual Studio screenshots at 100% are independently compared with renderStill output. Initial JPEG map sampling produced mean RGBA differences of 0.054–0.106/255 even with identical browser launch settings. Converting the same resampled image to lossless PNG resolves this: the maximum mean difference is 0.000023268711419753086/255, below the original 0.05 limit. No tolerance was increased. The original geographic source and voice/timing remain unchanged. The PNG and source fingerprint are preserved in the package.

Final media verification and delivery metadata are recorded after the full render in `.local/g7/verification.json` and `delivery.json`; do not call a draft a completed delivery.

## Completed delivery

- Frozen composition fingerprint: `b029ed0c46291d5f52be0c72397a00f27b37619cae15ee1ec26e26f0d991439d`. All 2,366 unique frame audits pass, with no browser errors, missing frames, text overflow/intersections or active-word failures.
- Final MP4: `G7-Bay-Nuoc-Suc-Anh-Huong-Toan-Cau.mp4`, 29,629,149 bytes, SHA256 `8f954bf82667e252082fdf0a655c01c584c642145fb28e42012e7643ca49f77e`. H.264/yuv420p, 1080 × 1920, 30 fps, 78.866667 seconds, faststart; AAC stereo 48 kHz. Every video PTS and all stream/container endpoints pass. Final audio mux preserves all video packet hashes, PTS and DTS.
- Ten decoded comparisons pass unchanged limits: maximum mean RGB difference 1.66718/255, maximum fraction above channel difference 30 is 0.6881%, below 3/255 and 2%. Audio correlation 0.9998277, SNR 34.555 dB, zero clipped decoded samples, −16.8 LUFS and −1.5 dBFS true peak.
- Editable source ZIP: 27,393,953 bytes, 59 entries, SHA256 `ac35bd60f3c9269117fce51f5ce7922e8343a010c869e8d9b01dd6b49aca8e95`. Entry integrity and credential pattern/exact-key checks pass. Contains source, pinned lockfile, fonts/flags/map, audio master, captions, provenance/licenses and verification. Excludes dependencies and raw paid API responses.
- Cleanup removes 190 regenerable files, 334,134,012 bytes, limited to G7 QA frames, bundle and draft MP4. Final MP4/ZIP, authoring inputs, shared runtime and paid voice cache remain. Other video topics are untouched. Seven unit tests pass again after cleanup.
