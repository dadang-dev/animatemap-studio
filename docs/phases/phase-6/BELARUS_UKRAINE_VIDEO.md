# Belarus–Ukraine video: Bryansk incident and northern-front risk

## Request, scope and authoring contract

The user requested a new video on the subject of a supplied 71-second vertical map explainer, then supplied its complete time-coded script. The sample claims a Ukrainian drone struck a vehicle on Belarusian territory and presents Belarus entering the war as imminent. This subject must be researched beyond its imagery. The supplied script is reference content, not verified evidence.

- Working files: `.local/belarus-ukraine/`; reference visual review and supplied script: `.local/reference-05f8/`.
- Native project: `belarus-ukraine-northern-front`; previous projects/videos preserved.
- 1080 × 1920 / 30 fps; 96 seconds / 2,880 frames; 11 scenes, ten complete narration clips.
- HN - Anh Khôi (`vbee_hn_male_phuthang_news65dt_44k-fhg`), speed 1.0; real provider timing; karaoke captions; authored quiet music and transition SFX.
- Hook: “Một mặt trận thứ hai từ Belarus?” ends at 1.905 seconds and is visibly framed as hypothetical, not a confirmed attack.
- Native schema/evaluator, MapLibre/overlay/fonts and Chromium/FFmpeg pipeline reused without dependency or application source changes.

## Content correction and evidence

The exact incident was identified after the user supplied the script. Earlier research into an August 2024 drone allegation is retained as superseded background and is not used as the date/source of this October 2026 incident. Six appropriate narration clips are reused; affected clips are replaced, with earlier takes preserved. No sample audio or new voice audio is uploaded for ASR; the user's script removes the need for that step.

The [official Belarus MFA post of 9 October 2026](https://t.me/BelarusMFA/1330), read in full from its public widget and retained with checksums, says that the vehicle carried Belarusian registration but was in **Bryansk Oblast, Russian Federation**, during the alleged incident on **8 October 2026**. It describes a severely injured Belarusian woman, without establishing that she was the driver. The video attributes the claimed Ukrainian responsibility to Belarus; it does not present that allegation as independently proved.

The same statement announces a diplomatic summons and a protest note and reserves appropriate response measures. It does not announce a new military offensive or say “the harshest measures.” The dramatic reference's imminent second front, closing pincer and inevitable collapse are replaced by a clearly conditional explanation.

[Radio Svoboda, 10 October 2026](https://www.radiosvoboda.org/a/news-mzs-ukrainy-bilorus/33874130.html), quotes the Ukrainian MFA's 9 October response rejecting responsibility assigned without convincing evidence. Its linked [primary Ukrainian MFA page](https://mfa.gov.ua/news/komentar-rechnika-mzs-shchodo-vikliku-v-minsku-timchasovogo-povirenogo-u-spravah-ukrayini-v-respublici-bilorus) returns HTTP 403; the report explicitly records reliance on the published quotation rather than claiming direct access.

Historical context is distinguished from current claims: the [UK government statement of July 2022](https://www.gov.uk/government/news/uk-to-implement-further-punishing-economic-measures-on-belarus) describes Russia launching troops and missiles from Belarusian territory. The [UN account of ES-11/1](https://press.un.org/en/2022/ga12407.doc.htm) records the Assembly deploring Belarus' involvement. Schematic historical/hypothetical arrows are labelled accordingly and are not precise operational routes or evidence of a current attack.

## Geographic accuracy and licensing

Three licensed flag textures and ten country-name callout instances identify Belarus, Ukraine and Russia. Both ends of each leader/card remain map anchored. The approximate Bryansk locator [33, 53] is checked inside both Russia and the actual bundled RU-BRY Admin 1 polygon, not merely placed near the border; it does not claim the truck's exact location. Russia's leader is routed around the Bryansk text with an explicit line/rectangle intersection check.

Natural Earth v5.1.2 Polygon/MultiPolygon rings, holes and islands remain unchanged. Its de facto Admin 0 grouping places Crimea in RUS, which would otherwise put a Russian flag there. The final project overlays the original Crimea and Sevastopol Admin 1 polygons (`ne-1159309535`, `ne-1159315877`) in neutral grey and records Ukrainian sovereignty versus Russian occupation in its end card and companion notes. [UN status reference](https://mandates.un.org/mandate/A/RES/78/221). It does not present country fills as military control.

NASA Blue Marble is the January 2004 composite. Flags are flag-icons v7.5.0 MIT, with full license and SVG/PNG checksums. Music/SFX/graphics are authored CC0 assets. Reference footage, explosions, voice and music are not copied. Sources and credits appear on the end card and in companion notes rather than a persistent long footer.

## Pre-render checks

- Strict full-script comparison, including explicit same-entity spelling variants Kyiv/Kiev and Ukraine/Ukraina; no normalization of different dates or omitted/repeated words.
- Zod validation, deterministic evaluation of all 2,880 frames, exact API JSON round-trip, credential exclusion and speech tails pass.
- 53 semantic caption pages / 266 real timing units; native review covers all 11 scenes and 30 camera-boundary samples.
- Shared PCM has no clipped samples, peak 0.807312. Measured master adjustment 1.388353 gives −16.51 LUFS and −1.83 dBTP; project track gains carry the same adjustment into preview/export.
- Final geometric checks pass: all ten callout instances, three countries, both country and RU-BRY containment, leader/text intersection exclusion and three pan/zoom/pitch/bearing tests. All 53 caption pages, 11 scenes and 30 camera-boundary samples have no overflow, caption collision or browser error. Preview/export parity across all scenes has maximum mean RGBA error 0.000013624/255 (< 0.05/255); refresh restores the exact project. Readability fixes keep text clear of the yellow flag and give the end card a dark backing.

## Delivery verification

Final render and decoded-media validation passed. `ffprobe` confirms 2,880 H.264/yuv420p frames, 1080 × 1920 / 30 fps, exactly 96 seconds and AAC 48 kHz stereo. The MP4 has faststart ordering.

All 107 distinct decoded caption/scene/callout/camera-flight/hook/final frame samples pass: maximum mean RGB error 2.067468/255 (< 3), maximum fraction of pixels with any channel difference above 30 is 1.012443% (< 2%). Decoded audio versus the shared PCM mix has correlation 0.999802630, signal-to-error ratio 33.972403 dB, RMS ratio 0.997364580 and peak 0.805114389. These are measured compression differences, not a claim of pixel-identical encoded output.

Delivery: `.local/belarus-ukraine/Belarus-Ukraine-Bryansk-va-nguy-co-mat-tran-moi.mp4`, 21,133,076 bytes. SHA-256: `cb89a1c919aefb5e6091528ac252b507ac79699608e6875c13c3f07f1c3b3675`.

Companions include the validated editable project, SRT, real word-timing JSON, Vietnamese fact-check/storyboard notes, source manifest, licenses, audit and verification reports. SRT carries text/timing; karaoke styling is in the MP4 and project/word-timing data. No application code changed, so verification focused on the authored artifact and actual native/browser/API/render pipeline rather than repeating unrelated application suites. The primary Ukrainian statement remains inaccessible directly; its published quotation is explicitly attributed to Radio Svoboda.
