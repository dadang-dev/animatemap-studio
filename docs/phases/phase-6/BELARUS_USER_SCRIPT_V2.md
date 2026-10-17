# Belarus–Ukraina: user-script cut V2

## Scope

On 17 October 2026, after delivery of the sourced explanatory version, the user explicitly requested a separate video using all eight supplied narration segments without factual research, additions or removals. That instruction applies to this cut and supersedes the ordinary editorial research workflow for this request. The first delivered MP4/project and its evidence remain intact. This report documents technical reproduction, not factual verification of the narration.

Working directory: `.local/belarus-ukraine-script-v2/`. Project ID: `belarus-ukraine-user-script-v2`. Original narration is retained in `story.json` and `SCRIPT_NGUYEN_VAN.md`; no counterarguments or source-checking commentary from the earlier cut is carried into the narration or captions.

## Authoring

- 1080 × 1920, 30 fps; 87 seconds / 2,610 frames, including a five-second media-credit card. Scene durations follow complete speech at the selected speed instead of cutting words to fit the suggested 70-second outline.
- HN - Anh Khôi, provider `vbee`, ID `vbee_hn_male_phuthang_news65dt_44k-fhg`, speed 1.0. Eight narration clips, 267 actual provider timing units, 52 caption pages. No audio uploaded for ASR.
- Full-script comparison uses only punctuation/case, same-entity spelling and equivalent number/unit orthography. The initial seventh clip returned “từ” for “tử”; it is preserved under `voice/take-1/`. A replacement changes only capitalization in the TTS input (“TỬ THẦN”), preserving the requested words, and passes full-script comparison. Seven other clips are reused without another paid generation.
- Satellite-composite background, licensed country flags, eight map-anchored name callouts and schematic directional arrows. Original Natural Earth geometry is retained, including the existing neutral Crimea/Sevastopol display. The arrows illustrate the supplied script and are not measured military positions. No new geographic incident locator is invented.
- All narrated content remains the supplied script. The separate end card contains media attribution only. Provenance is retained without representing this cut as independently fact-checked.
- Authored music/SFX and the same shared mix model as preview. Measured gain adjustment 1.396368361 yields −16.50 LUFS and −1.87 dBTP; PCM peak 0.806732178 with no clipped samples.

## Verification

Schema, deterministic evaluation of all 2,610 frame times, full eight-clip script comparison, caption coverage of the entire supplied script and exact API persistence pass. All 52 caption pages and nine native scenes have no overflow, caption collision or browser error. Eight callout instances cover all three countries; polygon containment, licensed assets and three pan/zoom/pitch/bearing anchor checks pass. The Russia leader in the pincer scene is rerouted around the directional diagram and the final media-credit backing fills the canvas. All affected checks are repeated on the final snapshot.

Preview/export comparison across all nine scenes has maximum mean RGBA error 0.000014950/255 (< 0.05/255); refresh restores the exact project. No application code or dependency changes are required.

Technical commands (from repository root): `node --import tsx .local/belarus-ukraine-script-v2/transcript-check.ts`, `node --import tsx .local/belarus-ukraine-script-v2/audit.ts`, and `node .local/belarus-ukraine-script-v2/{callout-preflight,preflight,parity}.mjs` (run each filename separately) pass on the final snapshot. `node --import tsx .local/belarus-ukraine-script-v2/render.ts` uses the existing renderer. Post-encode verification uses `capture-transits.mjs`, `verify.mjs` and `package.mjs` in the same directory; final results are recorded below. Documentation formatting uses `pnpm exec prettier --check docs/phases/phase-6/BELARUS_USER_SCRIPT_V2.md` and `git diff --check`.

## Final encoded delivery

All final checks pass. `ffprobe` confirms exactly 87 seconds / 2,610 frames at 1080 × 1920 / 30 fps, H.264/yuv420p and AAC 48 kHz stereo; faststart ordering is verified. The immutable render snapshot exactly matches the delivered project.

All 97 distinct decoded caption/scene/callout/camera-transition/hook/final samples pass: maximum mean RGB error 1.951760224/255 (< 3), maximum fraction of pixels with any channel difference over 30 is 0.803867670% (< 2%). Decoded AAC versus the shared PCM mix has correlation 0.999823765, signal-to-error ratio 34.466772153 dB, RMS ratio 0.997565589 and peak 0.802231073. Encoded output has normal measured compression differences; it is not described as pixel-identical.

Final file: `.local/belarus-ukraine-script-v2/Belarus-Ukraina-nguyen-van-script-v2.mp4`, 16,349,344 bytes. SHA-256: `7b4b61f3f0b842b793c36098433f80dcd5ca264ba34c7ef2faf62f61d5953613`.

Companions: validated `project.animatemap.json`, `subtitles.srt`, `word-timestamps.json`, `SCRIPT_NGUYEN_VAN.md`, `delivery.json`, `DELIVERY.md`, `verification.json`, flag provenance and full MIT license. Karaoke is visible in the MP4 and stored in project/word-timing data; SRT contains text and timings. The delivery manifest records checksums, measurements and media provenance. Previous delivered videos are preserved. These results verify reproduction and rendering, not the factual accuracy of the supplied narrative.
