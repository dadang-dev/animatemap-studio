# Karaoke captions and voice selection

Scope: remove the current video's footer block, preserve source provenance in an end card/accompanying files, provide a live AI33 voice catalogue with samples and generation controls, and highlight the currently spoken word using actual timestamps. Existing exports remain unchanged.

Interfaces: version 18 adds optional word timestamps, caption highlight styling and footer visibility. The pure evaluator chooses the active word with half-open time boundaries; the same native renderer draws editor and export. Wordless SRT stays plain, never receives fabricated alignment. Caption edits invalidate word alignment when text changes; trims retain valid word bounds. API credentials stay server-side. AI33 requests have bounded downloads, timeouts, provider/CDN allowlists and cancellation. Generation requires an explicit user action; catalogue samples do not create paid TTS tasks.

Checks: schema migration/invalid word ranges; Unicode and boundary evaluation; history/trim handling; API catalogue, validation, failure/cancellation; browser highlighting, seek repeatability and editor/export parity; final MP4 metadata and decoded-frame comparisons. Risks include phrase tokens from the speech provider, voice duration changes and retaining required source acknowledgement without a persistent footer.

## Choose another voice

1. Open **Audio & captions** and choose **Provider**. Select **Load Vietnamese voices**.
2. Select **AI33 voice**. Edge currently offers Hoài My (female) and Nam Minh (male). The live Vbee catalogue includes northern/southern voices; availability belongs to AI33 and can change.
3. Listen to the built-in sample when available. **Generate short sample · uses credits** creates an optional real sample without modifying the project. Loading the catalogue and playing an existing sample do not create a paid task.
4. Select the narration in **Voice track to replace**, set speed, and use **Generate video voice from captions**. Generation sends the caption text to AI33 and consumes account credits.
5. Listen under **Review generated voice**, then select **Apply reviewed voice and karaoke**. This applies one undoable project edit. Choosing a voice alone never replaces existing narration.

Scene/camera durations stay fixed. If speech is too long, the application reports the affected scene; shorten its text, increase voice speed or extend the scene before retrying. Stop cancels local work; AI33 may already have charged for a remote task. Persisted task identifiers allow the same account/voice/script/speed to resume without submitting another synthesis task. Existing voice and saved projects survive failures. Provider timestamps can contain phrase tokens; the application does not invent subdivisions for them.

## Current video

The user's approved upload contains only the newly generated narration. Actual AI33 speech recognition supplied **174 individual words** across **32 caption pages**, including separate timing for “năm” and “1945”. All recognized words matched the original caption script after case/punctuation normalization. The existing Nam Minh recording, music and transition effects are retained. The source/qualification footer layers are removed; required acknowledgements and factual sources appear on a separate 2.5-second final card and remain in project provenance.

The new project is schema 18, 1080 × 1920, 30 fps, 63.066667 seconds / 1,892 frames. Project JSON preserves word timing/highlight styling. A conventional SRT preserves sentence timing and text but cannot encode this rendered word highlight.

## Verification

- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`: passed.
- `pnpm test`: **180/180** tests passed in 71 files, including schema/migration, Unicode boundaries, scene assembly and API failure/cancellation tests. FFmpeg protocol tests are identified as fixtures, not live provider evidence.
- Relevant Playwright audio/karaoke suites: **10/10** scenarios passed. Repeated seeks and editor/native-renderer screenshots match; optional short samples preserve the project; explicit voice review/apply and Undo pass with clearly identified protocol fixtures. Existing real Web Audio, recording, MP4/WebM/crossfade/PNG export and cancellation tests pass. The extended run initially pointed the cleanup assertion at the default isolated test directory while reusing the running development API; rerunning that scenario with `ANIMATEMAP_E2E_RENDER_DIR=apps/api/.local/renders` passed, including saved-project preservation and owned-file cleanup.
- Separate actual AI33 checks returned Vietnamese Edge (2), Vbee (35), Minimax (18) entries and a playable provider sample. A real short Nam Minh synthesis returned 2.186 seconds and four timestamped words, charged 12 credits; repeating the same request reused the stored task and reported zero additional credits. Neither check changed project audio.
- Native preflight checked all 32 caption pages and 96 word positions with no text overflow, caption/layer collision, footer remnants or browser errors; the final source card rendered correctly. Final encoded-file verification is recorded below after rendering.

Generated audio/video, transcripts, API credentials and source snapshots are local ignored artifacts under `.local`; no secrets or generated media are tracked.

Final encoded-file validation passed: FFprobe confirms 1,892 H.264/yuv420p frames, 1080 × 1920 at 30 fps, 63.066667 seconds and stereo AAC at 48 kHz. All 32 caption-page samples plus the final source card meet the existing tolerance (mean RGB error below 3/255; fewer than 2% of pixels with any channel error above 30). Maximum observed mean error is 1.987/255. Decoded audio versus the unchanged shared PCM mix has correlation 0.999832, signal-to-error 34.717 dB, RMS ratio 0.998315 and peak 0.700954.

Delivery: `.local/karaoke/vi-sao-lang-gieng-doi-dau-karaoke.mp4` (34,296,836 bytes; SHA-256 `d5b34ac60a3d226111ca4bfe45a5d49939f6c594ed47e004f660988717a92066`). Companion files include editable `project.animatemap.json`, plain `subtitles.srt`, `word-timestamps.json`, `credits.json`, `FLAG-LICENSE.txt`, `KIEM_CHUNG_NOI_DUNG.md`, Vietnamese `HUONG_DAN.md` and detailed `verification.json`. Existing videos remain unchanged. The saved project is open in the editor with the voice picker ready; selecting another voice does not change the current Nam Minh recording until reviewed/applied. This request has no remaining blocked checks.
