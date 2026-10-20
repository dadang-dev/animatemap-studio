# Vietnam–Thailand GDP video

Completed with real voice, 20 October 2026. Artifact directory:
`.local/vietnam-thailand-gdp`; composition `Vietnam-Thailand-GDP`.
The user supplied the reference script instead of authorizing an audio upload.
No reference audio or new synthesized audio has been uploaded for ASR.

## Content contract

Fourteen scenes cover the hook, 1990 comparison, 1990–2025 change, football
analogy, Malaysia/Philippines, Finland/Denmark, per-capita GDP, nominal versus
PPP, purchasing-power illustration, 2026 PPP forecast, Southeast Asian PPP
ranking, nominal gap, conclusion and sources. Voice remains Anh Khôi at 1.0.

Nominal and per-capita comparisons use one World Bank WDI snapshot, not a mix
of IMF nominal estimates and World Bank observations. Raw observations are
retained; only display values are rounded. Important corrections to the sample:

- 1990: Vietnam USD6.471740806bn, Thailand USD85.343190719bn, ratio13.187.
- 2025: Vietnam USD514.697215165bn, Thailand USD577.009981112bn.
- Current-USD multiple79.52995 is not real GDP growth.
- Vietnam nominal total exceeds Malaysia, Philippines, Finland and Denmark in
  that snapshot; this does not imply higher per-capita living standards.
- Per-capita GDP USD5,065.990919 versus USD8,056.563598, ratio62.8803%.
- Nominal gap10.7993% below Thailand, relative to Thailand.
- IMF DataMapper PPPGDP2026: Vietnam2058.905, Thailand1983.943,
  Indonesia5483.042 billion international dollars. Forecast, not cash USD.
- Southeast Asian forecast ranking includes all eleven countries. Exact global
  “top32” is omitted: World Bank observed2025 coverage is incomplete.

URLs, original values, definitions and checksums are in
`data-provenance.json`. World Bank WDI is CC BY4.0 with its additional terms;
IMF data retains its own copyright/usage terms, not CC0.

## Actual engine outputs

- MapLibre: five captured satellite views and projected original country paths,
  shared cameras and seven point-in-polygon checks. Islands/holes retained.
- Vox Director / managed Codex CLI:24 shots, all14 scenes, strict contiguous
  scene-local coverage, no external tool calls. Layout timing is explicitly a
  draft. `retime-plan.ts` preserves the original plan, proportionally retimes it
  after actual TTS and validates against the final project. It splits shots only
  when necessary to retain the seven-second cap.
- HyperFrames0.8.168 / GSAP3.14.2: actual `gdp-measures` timeline,120RGBA PNGs,
  920×280/30fps, used in the method scene. Lint/runtime/layout check passed.
- Remotion4.0.536: scene components, original football/pho/plane vectors, flag
  textures, leader lines, zero-baseline charts and frame-based shared reframing.

The native JSON is a planning/basemap/caption source. The full composite lives
in Remotion/HyperFrames, not solely in native project JSON.

## Checks completed on the silent layout draft

- `node --test .local/vietnam-thailand-gdp/authoring.test.mjs`:8/8 pass, including
  number equivalence and rejection of changed years or omitted forecast labels.
- `npm run lint` in the Remotion directory: ESLint and TypeScript pass.
- HyperFrames check and120-frame alpha render:pass.
- Remotion preflight:130 frames pass, including scene/shot boundaries and fast
  illustrative action. Three repeat seeks have meanRGBA0.
- Studio/renderer parity:20 samples pass, maximum meanRGBA below0.05/255;
  report stores actual small raster differences rather than claiming all are0.
- No text/painted-country-path collisions or tested viewport overflow. Draft has
  no captions: final caption/timing gates remain pending real TTS.
- API3001, web5173 and Studio3009 confirmed listening on127.0.0.1 only.

Visual inspection caught oversized flags: Remotion CanvasImage renders a
canvas, so CSS targeting `img` did not size it. Fixed explicit dimensions on
CanvasImage and local coordinates inside SVG flag patterns. The latest draft
preflight and parity reports refer to the corrected source snapshot.

## Historical provider blocker and pending gates before voice completion

AI33 accepted a hook task but returned repeated HTTP503 “Task polling
temporarily busy”, followed by `doing` without downloadable audio/timestamps.
No successful voice clip has been fabricated or substituted. Task IDs remain
in the ignored server cache. A separate body task groups the twelve remaining
unsubmitted scenes to avoid twelve queued requests; it uses the same script,
voice and speed. `split-batch.mjs` requires an exact normalized transcript and
cuts at actual silence midpoints, preserving provider timestamps. It does not
invent word timings or upload audio.

`complete.mjs` resumes the cached tasks and then runs split, build, pagination,
Vox retiming, authoring, persistence/refresh, preflight/parity, real render,
final mux, decoded-frame/audio verification and source packaging. Any failed
step stops the pipeline. The renderer explicitly rejects `draft:true` for final
export. Final MP4, SRT/word timing, audio checks, final restore, decoded parity
and clean source ZIP are not yet complete. Do not report delivery as finished
until `verification.json` and `delivery.json` exist and pass for the real-voice
snapshot. Earlier delivered videos remain intact.

## Verified silent visual preview

`Ban-dung-hinh-GDP-chua-voice.mp4` is explicitly a visual draft, not final
delivery. It has no audio or karaoke and uses layout timing, not fabricated
speech timing. Final export remains guarded against drafts.

- H.264/yuv420p,1080×1920,30fps,121 seconds,3630 decoded frames.
- 17,301,726 bytes; SHA-256
  `21629cb60f40722361eb71d6213ccc60031ddeacdd2f46d24e7db091ee9ae0df`.
- All3630 runtime frame audits passed, with no missing frames or browser errors.
- 130 decoded-reference samples passed: maximum meanRGB1.498178/255;
  maximum fraction of pixels differing by more than30 is1.535735% (<2%).
- Studio parity20 samples passed; 8 authoring tests passed. Canvas/image child
  bounds are audited as well as parent boxes. A rotating SVG ball receives
  sufficient padding, rather than relaxing the overflow tolerance.
- `visual-preview-verification.json` records `completeVideo:false`,
  `voiceAvailable:false`, `captionsAvailable:false`.

Latest provider check,19 October17:56UTC /20 October00:56 local: both existing
hook and body tasks still `doing`, with no downloadable audio or timing URL.
The bounded complete-pipeline attempt stopped on the provider failure. No local
retry loop or final render is left running; remote task IDs are preserved for
resumption. Studio3009 remains available for reviewing the draft.

## Real voice update — 20 October 2026

The user requested the missing voice for the previous day's video. The Global
Brands deliverable was checked and already contains AAC narration; the GDP file
is the remaining silent draft. Both original GDP AI33 tasks now report `done`
with downloadable audio and provider timestamp JSON. The existing task/cache
was resumed, without submitting duplicate paid tasks or uploading any audio.

Actual Anh Khôi 1.0 narration: separate hook 1.9471875 seconds and body batch
112.3929167 seconds. Twelve body scenes are split at real silence midpoints;
all thirteen spoken scenes match the locked script, including the original
number/forecast qualifiers. There are 390 real timing units and 76 protected
caption pages. Hook speech ends at 1.66 seconds; final speech ends at 121.24
seconds. Seven seconds of credits follow the spoken sequence. Final project
timeline is 3,860 frames, 128.6666667 seconds, 1080×1920/30 fps.

The real-audio update retimed the existing actual Vox plan to 27 validated
shots. Map plates, country geometries, HyperFrames graphics, authored objects
and narration text were preserved. This is a fresh complete render using the
new timing and captions, not a mux of voice onto old silent-draft frames.
The previous `Ban-dung-hinh-GDP-chua-voice.mp4` remains unchanged.

Pre-render results: ESLint/TypeScript pass; 10/10 authoring tests (the original
eight plus real voice/transcript and exact word interval/page coverage);
deterministic evaluation across all 3,860 frames; API exact round-trip and
refresh restore pass. Preflight passes 215 samples including all 76 pages,
scene/shot boundaries and illustrative action. Three repeat seeks have zero
pixel differences. Studio/native parity passes 20 samples, maximum mean RGBA
0.000167583/255, maximum channel difference 1. All scenes, sources and every
caption page were visually reviewed.

### Final encoded-file gate — passed

- All 3,860 runtime frame audits passed: zero missing frames, word timing
  failures, layout failures or browser errors.
- `ffprobe` confirms H.264/yuv420p/faststart, 1080×1920/30 fps, 3,860 frames,
  128.6666667 seconds; AAC stereo 48 kHz. Container, video and audio endpoints
  match the project. All video packet hashes, DTS/PTS and decoder configuration
  are unchanged by final muxing from the approved PCM master.
- 215 decoded-frame comparisons pass the declared thresholds: maximum mean RGB
  error 1.551111/255; maximum fraction with any channel error above 30 is
  1.535735%, below 2%. Decoded contact sheets cover all scenes and all 76 pages.
- Audio: exact 12,352,000 interleaved samples; correlation 0.99982113,
  SNR 34.39753 dB, RMS ratio 0.99745961, zero clipped samples. Integrated
  loudness -16.4 LUFS, true peak -1.6 dBFS. Narration is present in the final
  encoded file, not only in Studio.
- Source ZIP: 270 entries, 38,565,046 bytes; source, media, fonts, locks,
  real HyperFrames frames, actual Vox plans, provenance and licenses retained.
  Entry and credential-content audits pass; no key, environment, node_modules,
  Git or QA frame directories are included. Packaging initially referenced an
  unused absent `remotion.config.ts`; the archive list was corrected to the
  actual project files, without changing the frozen render inputs.

Final MP4: `.local/vietnam-thailand-gdp/Viet-Nam-Thai-Lan-Cuoc-Dua-GDP.mp4`,
23,217,623 bytes. SHA-256:
`58749820dd949c99e19a0fd7a733a1e52e560f0ef126d839d165b335f6417c24`.
Source ZIP SHA-256:
`7dafcd6c767f8217898b9ab265a6432dad48031757264b56b28c022ecdfe8a81`.
`STATUS.json`, `verification.json`, `delivery.json` and `archive.json` record
completion. The silent draft and other delivered videos remain unchanged.
No blocking issue remains for this voice update.
