# Country density — silent 195-country ranking

Superseded by [V2](COUNTRY_DENSITY_V2.md): the user removed the technical-credit scene. V1 MP4/ZIP were cleaned after V2 passed. The historical evidence below records the initial release.

Status: completed; final MP4, editable archive and post-cleanup preview passed. Authoring root `.local/country-density`, composition `Country-Density`, Studio `http://127.0.0.1:3016/Country-Density` (verified listener `127.0.0.1`).

## Contract and content

The user supplied “Every country, sorted from emptiest to most crowded.mp4” and explicitly chose no voice: country names, statistics, music and SFX. No narration, TTS, ASR or reference-audio upload is part of this production. Reference footage/soundtrack/watermark are not copied. The full reference timeline was sampled and its falling-outline/continent-colour direction was inspected.

Use one coherent complete dataset: UN DESA World Population Prospects 2024, estimates for 2023, `PopDensity` (people/km²). Scope is 193 UN members plus Holy See and State of Palestine, explicitly excluding dependencies/other entities. The contemporaneous World Bank 2024 API snapshot lacks Nicaragua; no cross-year/source backfill is used. The 195-country ranking sorts original density values, formats one decimal in Vietnamese and retains the original population/density fields in companion data. It is not presented as observed 2026 density. Monaco and Mongolia are the extremes; Vietnam is ascending rank 167, crowded rank 29, 320.1956 people/km² before display rounding.

Source: https://population.un.org/wpp/ . Methodology: https://population.un.org/wpp/assets/Files/WPP2024_Methodology.pdf . Raw compressed source SHA-256: `286ac36bb1415e2e1ade03acfef0a29f0e4c087e2f78e38c48f50c5df89082bc` (16,557,272 bytes). Copyright United Nations, CC BY 3.0 IGO; transformations and scope are disclosed. Current flag assets identify countries; they are not historical flag reconstructions for 2023.

## Implementation and review scope

- 1080×1920, 30fps, 4,368 frames, 145.6 seconds. Three-second opening, all 195 countries, longer holds for the first four, Vietnam and final six, six-country summary and two source pages. The previous two country names/values remain as a reading trail.
- Natural Earth5.1.2 Polygon/MultiPolygon rings, holes and islands are retained. Each falling outline has a uniform fit in its own cell; countries do not share an area scale. This warning appears alongside the grid and on the source page. Density is supplied by UN, not inferred from Mercator/shape pixels. Current country locators are tested against polygon interiors. Reference boundaries do not adjudicate sovereignty.
- MapLibre supplies a real satellite world plate with the existing shared renderer, ready after map/fonts/assets. The SVG world locator and continent-coloured outlines use source geography. No paid map provider or new account is required.
- Vox Director creates an actual managed Codex CLI plan of 38 shots, validated against 20 native macro scenes. Detail framing controls foreground metric emphasis while ranking order and geographic framing remain stable. No fake API/token reuse.
- HyperFrames0.8.168/GSAP3.14.2 produces the 90-frame transparent opening title with lint/runtime/layout checks. Remotion4.0.536 consumes its local PNG frames, native plate, flags, source geometry, fonts, shot plan and original PCM audio. Motion is a pure integer-frame model, without wall clock, CSS autoplay or random physics state.
- Original CC0 synthesized instrumental bed and 195 landing chimes. Stereo PCM48kHz, 145.6 seconds; no voice. Master loudness -16.8LUFS and true peak -3.1dBFS. No reference soundtrack is used. No karaoke or SRT is promised for a video without spoken captions.
- Native source JSON represents the map/planning source, not the entire composite. The full editable source includes Remotion, HyperFrames, plan, media, data, timelineCSV, licenses and pinned lockfiles.

The main project contract is unchanged. Long country lists use short layer IDs/names to respect the 200-character layer-name limit. Native scene duration is bounded by `nextStart - start`; a subnanosecond decrement prevents floating-point overlap when necessary. Composite timing remains exact integer frames. No scene/image/audio limits were raised.

## Completed checks before export

Eight model/content tests passed (195-country scope and exact raw values; unrounded ranks; every timeline boundary; repeated evaluation/settled grid; original ring/coordinate coverage and flags; native schema/actual director plan). Strict Remotion TypeScript and ESLint passed. Browser font measurement covers all195names with pinned Noto, minimum38px. Exact API JSON round trip and IndexedDB refresh restoration passed for the separate project ID.

600 native-resolution Studio samples cover every country at start/mid/settled entry, opening, summary and source-page boundaries. No audited text/container overflow, overlapping regions or browser errors. Entry clipping at the top of the shape viewport is intentional entrance motion; settled geometry remains inside its cell. The audit does not claim equal-area geography or readability of every tiny island at thumbnail size.

Independent `renderStill` parity covers13samples using the same Chromium headless shell1208/GL angle/sRGB/DPR1/fonts. Maximum meanRGBA difference0.0004803240740740741/255 (threshold0.05); some samples have nonzero raster differences and are not described as pixel-identical. Three repeated renderer seeks have zero raster differences. Native frame examples and the scene contact sheet were inspected. Source/public/lockfile fingerprint is frozen before export.

Final gates passed. All 4368 runtime frames are audited without missing frames, layout failures or browser errors. All 600 decoded samples pass unchanged thresholds (mean RGB <3/255 and fraction of pixels with channel difference >30 below2%). Maximum meanRGB 2.0385591885288066; maximum fraction 0.006376350308641975.

Audio correlation 0.9999699933578918, SNR 42.18993748108399dB, RMS ratio 0.9993508412700741, zero clipped samples; expected and decoded 13977600 interleaved float samples. Loudness -16.8LUFS, true peak -3.1dBFS. Video/audio/container endpoints and all frame PTS match145.6seconds; final mux preserves all4368video packet hashes, PTS/DTS and codec configuration. Download/source/geography and all195flag checksums are tested; every locator is tested inside its source polygon and outside holes; no world-map ring has a longitude jump above180degrees.

MP4: 195-Quoc-Gia-Tu-Thua-Den-Dong-Dan.mp4, 15143768bytes, SHA-256 45a12b1fa3eee985a220af3528ce7263f6093d383f231a6a526dc5ecae48bd35. H.264/yuv420p/faststart,1080×1920/30fps,AAC stereo48kHz. Native and decoded contact sheets, Vietnam, extremes and both source pages were visually inspected. No application/schema dependencies changed.

Editable source ZIP: 195-Quoc-Gia-Tu-Thua-Den-Dong-Dan-editable-source.zip, 64288680 bytes, 367 entries, SHA-256 2e48b06c282f4d24b2a1c731e052c670b84bac0116f1de1741120c582652a9e5. Entry, unpacked integrity and actual credential-content scans passed with zero hits. It includes the complete composite, native map/planning source, original UN snapshot, ranking/timeline CSV, geography, fonts, flags, audio, actual Vox/HyperFrames outputs, licenses and instructions. Dependencies, credentials, reference media and QA frame directories are excluded. Post caption/source attribution is supplied for publication by the user.

After all gates passed, cleanup removed 1573 files / 1334641332 bytes of duplicate render, bundles and regenerable QA images, preserving final MP4/ZIP hashes and the shared runtime junction. OneDrive cloud placeholders were distinguished from junctions/symlinks before bounded native PowerShell deletion. No reference in Downloads or other topic output was deleted. Source fingerprint, exact saved native project, all eight tests and a fresh Chromium Studio load passed after cleanup. The latest-video index now includes this topic as number14. Local delivery.json, verification.json, archive.json, cleanup-plan/result and post-cleanup.json retain the evidence.
