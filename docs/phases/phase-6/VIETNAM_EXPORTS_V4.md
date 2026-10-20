# Vietnam exports V4 — approved visual revision A

The user approved option A from the V3 review: improve visual storytelling while preserving narration, data and duration. Authoring root `.local/vietnam-exports-v4`, composition `Vietnam-Exports-V4`, Studio `http://127.0.0.1:3015/Vietnam-Exports-V4`; the actual listener is `127.0.0.1`.

## Scope and implementation

- Preserve the 2025 source snapshot, script, Anh Khôi voice/speed, PCM master, 322 timing units, 68 karaoke pages, SRT and timeline: 2,978 frames at 1080×1920/30 fps, 99.2666666667 seconds. Thirty-two byte hashes compare these inputs, analytics and the shot plan against V3. No TTS or ASR calls.
- `HookReveal` changes rice into three product symbols during the unchanged hook. Voice hook ends at the previously verified 1.64 seconds.
- `VisualStory` replaces the repeated six-row product table with object, split and shelf layouts. Products retain a fixed comparison denominator of USD107.7 billion and their actual numeric cues; the label states that these are six illustrative groups, not an exhaustive list or top six.
- The total structure appears at the existing number cue. Satellite background, original country geometry, map plates, fonts and flags are retained.
- Cargo arrival is tied to the actual market-value phrase. Three arrivals span that phrase; pure progress is bounded, monotonic and never wraps. This remains schematic trade imagery, not a claimed shipping route or category-specific market flow.
- The FDI diagram uses 100 cells with a partially filled final cell from the unrounded amount ratio. Before reveal, neutral cells avoid suggesting that the entire basket belongs to the domestic sector. FDI includes crude oil; turnover is distinguished from profit and domestic value added.
- Closing uses six product choices and a single main question. Source information is split into two four-second pages inside the original eight-second slot, retaining acknowledgements and the full companion source/license material.

Remotion renders the new scene components, captions and vector graphics. The actual 23-shot Vox Director/Codex CLI plan is deliberately reused; detail framing changes object emphasis and market framing. HyperFrames' existing 180 product-title frames and 180 share frames, with transparent PNGs and HTML/GSAP source, are reused in the composition. No new director or HyperFrames job is claimed. The native JSON remains basemap/camera/caption source; Remotion/HyperFrames source represents the complete composite.

## Verification

- Remotion ESLint and strict TypeScript passed.
- Sixteen authoring/revision/model tests passed, including source scope, integer totals, all 32 locked hashes, original captions, fractional waffle-cell totals and arrival timing/bounds.
- API exact JSON round trip and browser refresh restoration passed for the separate V4 project ID.
- Preflight passed 246 samples covering scenes, all 68 caption pages, numeric cues, shot boundaries, hook, FDI reveal and final source page. Three repeated seeks had zero raster differences. Layout, overflow, geographic-window and caption-safe-region checks passed.
- Studio/native parity passed 18 samples. Maximum mean RGBA difference was 0.00022135416666666666/255, maximum channel difference 1; samples with nonzero differences are not described as pixel-identical.
- Native scene/product contact sheets, all caption-page sheets, the complete FDI reveal, early hook and second credit page were visually inspected.

Final gates passed. Runtime audits cover all 2,978 frames, without missing frames, caption-timing failures, layout failures or browser errors. The 246 decoded samples pass the unchanged tolerances: maximum mean RGB 1.614207015174897/255, maximum fraction of pixels above channel difference 30: 0.0058039158950617285. Native and decoded scene/caption sheets, final FDI state and both source pages were reviewed.

Audio correlation 0.9998407694599919, SNR 34.909951080312936 dB, RMS ratio 0.9977390264401117, zero clipped samples; expected/decoded 9529600 float samples. Integrated loudness -15.5 LUFS, true peak -1.6 dBFS. All frame PTS and video/audio/container endpoints match 99.2666666667 seconds. Final audio mux preserves all video packet hashes, PTS/DTS and codec configuration.

MP4: Viet-Nam-Ban-Gi-Cho-The-Gioi-V4.mp4, 13514884 bytes, SHA-256 37e6f985770d1a3f4bc914a4e2f82ef84c4cc901a701ff7bb6c7432f254f2e79. H.264/yuv420p/faststart,1080×1920/30fps,AAC stereo48kHz.

Editable source ZIP: Viet-Nam-Ban-Gi-Cho-The-Gioi-V4-editable-source.zip, 28016130 bytes, 504 entries, SHA-256 534e188b2dd897362df3764454bbd10d97b46f66764dc001aacb1fda089996c3. ZIP entry and actual credential-content scans pass with zero hits. Includes the editable composite, source/public media/fonts, actual reused Vox/HyperFrames outputs, voice/timing/SRT, analytics, provenance/licenses and instructions; excludes credentials, dependencies and QA frame directories.

After all gates passed, cleanup removed 955 files / 1017507545 bytes, including superseded V3 MP4/ZIP, the duplicate V4 render and regenerable V4 bundles/QA frames. All 21 protected outputs across the 13 topics retained their expected hashes. V3 source inputs remain where the V4 lock/tests reference them. Only the obsolete Studio3014 was stopped; Studio3015 remains available. The clickable latest-video index was updated. Local cleanup-plan/result and STATUS.json record this completed delivery.

## Reusable lessons

An infographic can be numerically accurate at its final state yet imply the wrong category before reveal. Use neutral placeholders until the cue, and verify both initial and final frames. Preserve the original ratio behind rounded published percentages; do not silently turn 77.3% into 77 whole cells. Repeated data tables can be replaced by varied product-led scenes without changing script, audio or the denominator. Add timing-relative movement inside existing slots rather than shifting the locked narration to accommodate effects.

After cleanup, all 16 authoring/model tests passed again. A fresh Chromium smoke check loaded the V4 map stage with fonts/images ready, no page errors and API health ok (schema 18). No application/schema dependencies changed.
