# Phase 6E — 4K/60 FPS and export formats

Status: passed; animation style gate passed first.

Files/interfaces: project-schema v4 permits 24/30/60 FPS and retains v1–v3 migration. Existing 3840-pixel dimension limits allow 3840×2160 and 2160×3840 presets. Render format contract adds WebM/VP9 and GIF; schema metadata drives API validation, MIME and editor controls. Render-worker encoder module produces trusted argument arrays, with no shell or user filter text. API jobs/CLI retain immutable snapshots, progress, cancel/retry and cleanup.

All formats capture `ceil(duration×fps)` frames at `i/fps` with the shared renderer. GIF uses a palette generation pass followed by palette encoding, avoiding an in-memory split of all 4K frames; GIF timing is quantized to centiseconds and browser playback may impose further limits. MP4/WebM require even dimensions. PNG retains exact current-frame behavior. Larger exports require more time/disk; no real-time rendering guarantee is introduced.

Acceptance:

- [x] Valid v1–v3 migration; 60 FPS accepted only in the current contract; unsupported rates/formats rejected.
- [x] Encoder commands are shell-free, explicitly select H.264/VP9/GIF and correct pixel/timing settings.
- [x] API, editor and CLI expose the real formats with correct download MIME/extension.
- [x] Real 3840×2160/60 FPS MP4 has 60 frames for a one-second scene; decoded frames match preview.
- [x] Real WebM and GIF frame counts/durations/dimensions validated; Unicode/attribution remain visible.
- [x] Cancellation/retry/resource failure preserve projects and clean temporary files.
- [x] Static/unit/integration/build/format checks and relevant browser regressions pass.

Validation: `pnpm check` passes 45 unit/integration tests, strict typecheck/lint/build. `pnpm format:check` passes. Eight targeted browser scenarios passed (new formats, transform animation, original 360-frame MP4, portrait PNG/MP4/cancel, golden frames); after isolating temp directories, five scenarios passed again (all formats, portrait/cancel, actual missing-map-resource failure). Startup failure cleanup is covered by a filesystem integration test which preserves existing user `frames/keep.txt` and snapshot while removing only owned temporary frames.

Real 4K60 MP4: 3840×2160, H.264/yuv420p, 60 frames, one second. Decoded frame mean RGB errors at 0/30/59: 0.773/0.786/0.831 (limit 3/255). Capture/encode took 57.2 seconds on the development machine; this is a measurement, not an SLA. WebM: 1920×1080 VP9, 30 frames/one second, errors 0.763/0.931/0.937 (limit 3/255). GIF: 1920×1080, 30 frames/approximately one second, errors 1.909/1.922/1.938 (palette tolerance 5/255). Reviewed outputs remain ignored in `.local/reviewed/`; adjacent export JSON files retain ffprobe and parity evidence.

References: [FFmpeg libvpx](https://ffmpeg.org/ffmpeg-codecs.html#libvpx), [palettegen/paletteuse](https://ffmpeg.org/ffmpeg-filters.html#palettegen). Installed FFmpeg encoder/muxer capabilities are checked before implementation.
