# BRICS video — members and expansion

## Scope and content contract

New portrait video following the established satellite map, country flag texture, map-anchored callout, Anh Khôi narration, karaoke captions and quiet authored music/SFX style. No application dependency or renderer change. Previous videos remain intact in their own directories.

- Authoring: `.local/brics/`; native project ID `brics-expansion-anh-khoi`.
- Canvas: 1080 × 1920, 30 fps. Actual narration determines 134 seconds / 4,020 frames across 17 scenes.
- Hook: “BRICS đã vượt xa năm nước!”; actual speech ends at 1.725 seconds.
- Coverage: all eleven countries in the Indian BRICS presidency's September 2026 list, plus Vietnam in a separate partner scene. Brazil, Russia, India and China are identified as founders in 2006, with the first summit in 2009. South Africa joined in December 2010 and first attended a summit in 2011.
- Saudi Arabia is explicitly qualified in narration and on screen: India's presidency includes it in the 2024 expansion, while earlier Saudi Press Agency notices described participation as an invited country. The video attributes the eleven-country list and date rather than claiming all sources agree on status.
- Indonesia's formal admission is dated 6 January 2025. Vietnam's partner status is dated 13 June 2025; it is not represented as a full member.
- No unsupported demographic/GDP percentage, common-currency claim or military guarantee is used. NDB's infrastructure/sustainable-development role is supported by NDB itself.

## Sources and rights

Checked 17 October 2026:

- [Indian government, BRICS overview, 10 September 2026](https://www.pib.gov.in/PressNoteDetails.aspx?ModuleId=3&NoteId=159946&id=159946&lang=1&reg=3).
- [Saudi Press Agency, invited-country wording, July 2025](https://www.spa.gov.sa/en/N2353352).
- [South African government, December 2010 membership and first 2011 summit](https://www.gov.za/news/media-statements/president-zuma-arrives-china-attend-brics-summit-13-apr-2011).
- [Brazilian presidency, Indonesia admission](https://brics.br/en/news/brazil-announces-indonesia-as-full-member-of-brics).
- [Vietnam Ministry of Public Security, partner status since 13 June 2025](https://en.mps.gov.vn/article/vietnam-joins-bricss-counter-terrorism-effort-1764839747).
- [New Development Bank mandate](https://www.ndb.int/what-we-do/).

Twelve current country flags from flag-icons v7.5.0 are rasterized without aspect distortion; full MIT license and SVG/PNG SHA-256 records accompany the project. Natural Earth 5.1.2 modern geometry remains unchanged. NASA Blue Marble is the January 2004 composite. End card and companion notes retain source/credit/scope information. Music, graphics and seeded SFX are authored CC0 assets. Voice is generated under configured AI33 account/provider terms; no voice audio is uploaded for ASR.

## Checks before encoding

- Real Anh Khôi TTS, speed 1.0, cached tasks and clips. Full script comparison passes for all sixteen spoken scenes, with only explicit equivalent numeric/day orthography normalization.
- A provider transcript confused 2011 with 2010 and BRIC with BRICS. Three affected scripts were rewritten for unambiguous spoken years/group references, clips regenerated, and old clips preserved. Different years are never normalized into equality.
- Reused template captions were cleared before changing duration and intermediate scene validation; stale 147-second captions must not accompany a shorter project while measuring callouts. Both lessons are recorded in root AGENTS.md.
- Zod, deterministic evaluation for all 4,020 frames, API JSON round-trip, refresh restore and all membership/partner distinctions pass.
- Native Chromium preflight: 17 scenes, 68 caption pages / 345 real TTS timing units, 48 camera boundary samples; no overflow, caption collisions or browser errors.
- Twelve country callouts: all locator points inside actual Polygon/MultiPolygon geography including holes, one visible card per country scene; pan/zoom/pitch/bearing alignment checks pass.
- Preview/export comparison across every scene: maximum mean RGBA error 0.000038822/255 (existing tolerance < 0.05/255).
- Shared PCM mix: no clipping, sample peak 0.849030; measured integrated loudness −16.53 LUFS and true peak −1.42 dBTP. Gain adjustment is encoded in project tracks, so preview and export share the mix.

## Verified delivery

Final MP4: `.local/brics/BRICS-cac-nuoc-va-hanh-trinh-mo-rong.mp4`, 30,475,458 bytes, SHA-256 `076c26c9c5529a4bf6f8ccd8ef81a19ebd663df32e5ed0a484cad778cd04ec9a`. FFprobe confirms H.264/yuv420p, 1080 × 1920, 30 fps, 4,020 frames and 134 seconds; AAC 48 kHz stereo. MP4 atom inspection confirms faststart.

All 151 deduplicated decoded reference comparisons pass the existing mean RGB error < 3/255 and fewer than 2% of pixels with channel error > 30. Samples cover all caption pages, every scene/country callout, 48 camera boundary points, hook and final frame. Maximum mean RGB error is 1.832982/255.

Decoded AAC versus the shared PCM mix: correlation 0.999793, signal-to-error 33.757 dB, RMS ratio 0.997148, peak 0.847812; all thresholds pass. Full reports are in `verification.json`, `audit.json`, `visual-checks.json`, `callout-checks.json`, `editor-parity.json` and `loudness.json`.

Companion deliverables: editable `project.animatemap.json`, `subtitles.srt`, `word-timestamps.json`, story/script, source notes, credits and flag license/checksums. No application source, dependency or schema change was needed; verification focused on authored artifacts and native browser integration. Documentation formatting and internal links pass. Previous videos remain intact.
