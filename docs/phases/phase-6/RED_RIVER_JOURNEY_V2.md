# Red River journey V2 — retain full Vietnam context

User correction, 22 October 2026: the original close views did not sufficiently show the river's position within Vietnam from start to finish. This is a visual-only revision; script, voice, speed, master audio, duration, caption words/timestamps, SRT, original Vox plan and HyperFrames title frames are locked.

## Implementation and scope

- Hook, overview and closing now fit the original full Vietnam geometry north–south, plus the Red River's upstream endpoint in Yunnan and Ba Lạt mouth. The complete original Vietnam Polygon/MultiPolygon, islands and holes are retained and outlined in gold; the view is not a country-area chart or a legal boundary survey.
- The nine close-up scenes retain their original satellite plates and projected geography exactly. A separate locator shows the full Vietnam outline, whole river and the landmark being narrated. Lào Cai and Hòa Bình use a left-side inset; the remaining close views use the right side to avoid their labels.
- Main geography, overlay and country paths share the actual MapLibre projection and common existing Vox reframe. The independent locator uses the full-country projection, with its own explicit context role rather than an incorrectly attached geographic label.
- New river-start locator uses the original Natural Earth Hong endpoint; mouth remains explicitly generalized. A dashed mouth extension retains its on-screen schematic explanation.
- Reuse existing actual outputs: Vox Director/Codex CLI 24 shots, HyperFrames 360 title PNGs, Anh Khôi 1.0 with actual provider timestamps. No new TTS, ASR, director call or HyperFrames generation.
- 22 locked inputs plus 376 reused title/font/flag assets are hash-checked. A new API project ID and separate V2 composition/source preserve the previous working version until final gates pass.

## Checks

- [x] Full Vietnam and both river endpoints fit the overview, including maximum 1.025 reframe.
- [x] Detailed map data/plates remain byte-identical; all reused voice/timing/asset hashes match.
- [x] Strict TypeScript and actual sample images inspected; locator collision with the Lào Cai label found and corrected.
- [x] API exact JSON round trip and native browser refresh restoration.
- [x] Full new preflight:331 samples; independent Studio/renderer parity:14 samples, all below0.05/255 meanRGBA.
- [x] Final render, all-frame geography/word/layout audit, decoded frames/audio and packaging.
- [x] Latest-video index, AGENTS update and safe superseded/intermediate-media cleanup.

Preview: http://127.0.0.1:3019/Red-River-Journey-V2 . Main native JSON is camera/caption source; editable Remotion/HyperFrames composition reproduces the complete composite. Full-country context is checked in every output frame, not only the opening screenshot.

The explicit overview callouts identify Yunnan/China and Ba Lạt/Vietnam together; the old generic “source/mouth” labels are not the only geographic cues. Full-country and locator contexts are also required by the complete render audit.

## Final delivery and evidence

Completed22 October2026.12 tests pass without skips, strict TypeScript and ESLint pass.331 fresh real-Studio samples and14 independent renderStill parity samples pass; maximum meanRGBA 0.007086950231481481/255, below0.05. All2,857 frames runtime-audited, zero missing frames, country-context failures, caption/flow timing failures, layout failures or browser errors.

Final MP4:95.233333seconds,1080×1920/30fps,H.264/yuv420p,faststart,AAC stereo48kHz, exact video/audio/container endpoints and frame PTS.14 decoded comparisons pass: max meanRGB 1.489767232510288/255, max fraction above channel difference30 0.002564621913580247, thresholds unchanged at3/255 and2%. All original newly rendered video packet payloads/PTS/DTS survive final audio mux unchanged.

Audio is stronger than waveform parity: all 4466 AAC packets and their PTS/DTS are byte-identical to the approved V1. PCM/timing/script locks also match. Decoded correlation 0.9998381702472837, SNR 34.84377537616066dB, RMS ratio 0.9977944276254795, zero clipped samples, −15.7LUFS/−1.5dBFS true peak.

Video:Hanh-Trinh-Song-Hong-V2.mp4,19069532bytes,SHA256 02ed5d90896fcab8c816e8b74c4dde5d68fa0e593e8234c9d203896482c01c68.

Archive:Hanh-Trinh-Song-Hong-V2-editable-source.zip,48842636bytes,605entries,SHA256 e8c5b764a32c480e738ed42d632124a51180437e6cfefebd96c3436d4002807c. Full editable Remotion composite, native planning source, reused real Vox/HyperFrames outputs, voice/timing/SRT, licenses, lock evidence and source maps. Integrity and exact-key/pattern credential scans pass; dependencies, raw paid responses and QA images are excluded.

Cleanup removed813files/704197347bytes: regenerable V2 frames/bundle/draft and superseded V1 MP4/ZIP. Original source/audit and paid voice cache remain as explicit revision dependencies, shared runtime untouched. New MP4/ZIP/master/source hashes survive cleanup. Fresh Chromium Studio verifies the full-country overview and close-scene locator after cleanup; source fingerprint unchanged. Latest video index points to V2.
