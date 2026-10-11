# Phase 6K — Local audio, voiceover and captions

Status: technical preparation; implementation begins after the Admin 1 gate.

Files/interfaces: versioned project audio registry and project-time tracks, bounded PCM WAV import/recording, pure timing/gain/caption evaluation, disposable Web Audio playback, accessible audio/caption editor, FFmpeg mixing module and source reports. Existing visual rendering stays frame-index driven; captions render through the same shared preview/export surface. Audio is mixed offline, never captured from real-time playback.

Contracts: audio tracks use project seconds, source in/out, gain, fade-in/out, mute and lock. Keep audio timing independent of scene crossfades. Preserve Unicode caption cues and explicit start/end boundaries; import reviewed SRT/VTT and allow manual edits. Declared source/author/license/credit accompany user audio; recordings stay local. New migrations preserve older project frames and default to empty tracks/captions. GIF/PNG explicitly omit audio.

Bound storage/decoded samples/input bytes and recording duration; reject malformed WAV metadata, missing references and out-of-range clips atomically. Microphone capture starts only from the user's Record action and stops tracks on completion, cancellation, dialog close or disposal. Playback errors surface rather than silently skipping a track. MP4 uses AAC and WebM uses Opus. FFmpeg receives separate fixed arguments, with owned temporary input cleanup, cancellation and bounded encoding time.

Initial format decision: import PCM 16-bit WAV (mono/stereo, 8–96 kHz) and preserve its sample rate/channels, stripping ancillary chunks into canonical WAV. Each asset is limited to 16 MiB/300 seconds; five assets and 32 MiB aggregate, ten tracks. This supports self-contained JSON without introducing orphaned local-media references. API requests increase to a bounded 48 MiB to cover base64 media plus existing image/schema budgets. MP3/AAC imports are explicitly unavailable initially rather than decoded without a trustworthy expansion bound. Voiceover records at most 60 seconds through MediaRecorder from a user-started microphone; only this trusted browser recording is decoded into bounded PCM WAV. Source limits and actual recording lifecycle require tests. Playback and export hard-clip summed gain; fades are linear and their combined length cannot exceed the clip. Captions use project time and remain independent of scene crossfades.

Acceptance:

- [ ] Schema/migrations, WAV validation, cue parsing and pure gain/timing boundaries pass.
- [ ] Import/edit/mute/lock/undo/redo/autosave and recording work in a real browser; no microphone remains active after close/cancel.
- [ ] Seek/pause/resume use correct source offsets and identical gain envelopes; repeated caption seeks are deterministic.
- [ ] Real MP4/WebM contain verified audio streams and expected onset/offset/fade/mix levels; decoded captions match preview and attribution remains visible.
- [ ] Cancellation/failure cleanup preserves saved projects and no external audio URL is requested.
- [ ] Static/unit/integration/build/format, browser regressions and license checks pass before proceeding.

Primary references: [FFmpeg audio filters](https://ffmpeg.org/ffmpeg-filters.html), [Web Audio scheduled source start](https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode/start), [MediaRecorder lifecycle](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder). Import/recording format and budget tradeoffs must be recorded before their implementation.
