# Vietnam–Thailand GDP video

Work in progress, 20 October 2026. Artifact directory:
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

- `node --test .local/vietnam-thailand-gdp/authoring.test.mjs`:7/7 pass.
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

## External blocker and remaining gates

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
