# Video data cleanup — 21 October 2026

The user explicitly requested keeping only the latest complete video per topic and deleting superseded versions and associated disposable data. This supersedes earlier delivery notes that preserved every revision. No video content, narration, timing, or final source archive was changed.

## Result

- Deleted **11,745 files / 16,365,250,563 bytes** (16.37 GB, 15.24 GiB), plus 125 empty generated directories.
- Kept **13 complete MP4s and eight latest editable ZIPs**. SHA-256 checks before and after deletion confirm all 21 outputs are unchanged. `ffprobe` confirmed video and audio streams in every retained MP4.
- Removed superseded MP4/ZIP deliveries, silent/intermediate drafts, duplicate render outputs, disposable Remotion bundles, QA screenshots/render frames and decoded/reference PCM scratch data.
- Kept final editable projects, source code, narration, timestamp/caption files, paid-provider task caches, provenance/licenses, JSON verification reports and shared runtimes. No API project storage, application test fixtures, reference videos in Downloads, credentials or shared integration installations were deleted.
- Stopped only obsolete Exports V1/V2 Studio processes on ports 3012/3013. The latest V3 Studio on port 3014 and the application/API remain available.

## Latest retained videos

Paths below are relative to the workspace's ignored `.local/` directory. A clickable local index is available at `.local/cleanup-2026-10-21/VIDEOS-MOI-NHAT.md`.

| Topic                    | Latest complete MP4                                                                 |
| ------------------------ | ----------------------------------------------------------------------------------- |
| Population               | `voice/population/top-10-dan-so-voice-subtitle.mp4`                                 |
| Country area ranking     | `voice/area/top-10-dien-tich-voice-subtitle.mp4`                                    |
| Neighbour conflicts      | `karaoke/vi-sao-lang-gieng-doi-dau-karaoke.mp4`                                     |
| NATO                     | `nato-flags-callouts/NATO-32-nuoc-quoc-ky-callout.mp4`                              |
| BRICS                    | `brics/BRICS-cac-nuoc-va-hanh-trinh-mo-rong.mp4`                                    |
| Belarus–Ukraine          | `belarus-ukraine-director-v4/Belarus-Ukraina-reference-Remotion-HyperFrames-V4.mp4` |
| Vietnamese cities        | `vietnam-cities-2026/Viet-Nam-9-thanh-pho-truc-thuoc-trung-uong.mp4`                |
| Provincial consolidation | `vietnam-province-merger-2025/Viet-Nam-63-con-34-tinh-thanh.mp4`                    |
| Vietnam historical area  | `vietnam-area-history-v4/Viet-Nam-Ranh-Gioi-Lich-Su-V4.mp4`                         |
| Vietnam–Thailand GDP     | `vietnam-thailand-gdp/Viet-Nam-Thai-Lan-Cuoc-Dua-GDP.mp4`                           |
| Global brands            | `global-brands/Thuong-Hieu-Noi-Tieng-Den-Tu-Dau.mp4`                                |
| Mekong                   | `mekong-six-countries/Mekong-Sau-Nuoc-Mot-Dong-Song.mp4`                            |
| Vietnam exports          | `vietnam-exports-v3/Viet-Nam-Ban-Gi-Cho-The-Gioi-V3.mp4`                            |

## Dependency preservation and deletion boundaries

Some directories retaining old version names remain as source dependencies, without their old MP4/ZIP deliveries. For example, Exports V3 tests compare narration hashes against V2 and caption data against V1; History V4 tests use V3 layout evidence and V1 voice clips; Belarus V4 preparation reads the V3 native project/assets; NATO callout authoring reads the all-members native project. These inputs were preserved deliberately rather than breaking regeneration or weakening the tests.

Twelve Remotion `node_modules` junctions still resolve to the unchanged shared runtime under Belarus V4. File inventories excluded junction traversal and dependency directories. Every selected deletion was validated as a regular file under the resolved workspace `.local` root; neither recursive shell deletion nor junction deletion was used. OneDrive cloud placeholders were distinguished from actual symbolic links and junctions. Only empty directories were subsequently removed, without recursive deletion.

## Verification and local evidence

- `node .local/cleanup-2026-10-21/prepare.mjs`: inventoried final files, hashes, stream metadata, explicit deletion allowlist and runtime links before deletion.
- `.local/cleanup-2026-10-21/execute.ps1`: dry run passed; execution deleted exactly the selected 11,745 files. The executor intentionally refuses to run twice once a deletion receipt exists.
- `node .local/cleanup-2026-10-21/verify.mjs`: all 21 protected output hashes unchanged, all selected deleted files absent, all 12 runtime junction targets unchanged.
- `node --import tsx --test .local/vietnam-exports-v3/authoring.test.mjs .local/vietnam-exports-v3/revision.test.mjs .local/vietnam-area-history-v4/authoring.test.mjs .local/vietnam-area-history-v4/layout-lock.test.mjs`: **25/25 passed**. An initial invocation without the required `tsx` loader failed to import a TypeScript module; rerunning with the proper loader passed without changing source.
- `node .local/cleanup-2026-10-21/smoke.mjs`: actual Chromium loaded `http://127.0.0.1:3014/Vietnam-Exports-V3`, displayed the map stage with loaded images/fonts and no page errors; API health returned `ok`, schema 18.

Ignored local evidence includes `inventory-before.json`, `plan.json`, append-only `deleted.jsonl`, `result.json`, `verification.json`, `browser-smoke.json`, `latest-studio.png`, the clickable latest-video index, and the exact cleanup scripts. These files contain no API credentials. The deletion receipt records irreversible removal; prior delivery notes and their historical measurements remain documentation, not claims that deleted media is still available.
