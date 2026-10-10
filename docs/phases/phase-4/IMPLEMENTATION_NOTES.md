# Phase 4

Add fixed-frame render page, immutable snapshot jobs, bounded queue, cancel/retry/download API, Playwright worker and shell-free FFmpeg encoder; CLI shares worker. Capture current-frame PNG and MP4 with source credit. Bundle Noto Sans fonts. Tests: real 360-frame 1080p render, ffprobe, decoded frame parity, portrait, PNG, cancellation/resource failure. Readiness errors must terminate jobs honestly, never fabricate output.
