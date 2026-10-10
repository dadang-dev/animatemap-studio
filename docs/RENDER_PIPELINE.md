# Fixed-frame export

`POST /api/jobs` accepts `{project, format: "mp4"|"png", frameIndex?}`. It validates and clones the project. `GET /api/jobs/:id` reports status/progress; POST `cancel` or `retry`; GET `download` returns an actual completed file. One worker runs at a time; up to five active/queued jobs are allowed.

The worker opens `/render` on the production preview server at 127.0.0.1:5174, at the project's exact dimensions with deviceScaleFactor 1. `pnpm dev` builds this server before launching services, insulating exports from Vite's editor hot reload. Restart services after renderer code changes. `window.renderStudio.load(project)` initializes the same MapSurface/MapRenderer as the editor. `frame(i)` calls the shared pure evaluator at i/fps, applies an instant camera jump and layer state, then waits for fonts and map resources with timeouts. Map style transitions and tile fades are disabled. All requests are restricted to the local origin.

MP4 contains ceil(duration×fps) PNG captures encoded by shell-free FFmpeg with libx264, yuv420p, CRF 18 and faststart. PNG uses the chosen frame index. Snapshots/reports/outputs are retained under the local render directory; temporary frames are removed on success, cancellation and error. Cancellation closes Chromium and terminates FFmpeg. Frame readiness gets one retry. Job status is in memory; restarting the API abandons jobs, but never modifies saved projects.

CLI: start `pnpm dev`, then `pnpm render examples/travel-vietnam.json .local/travel mp4`. FFmpeg/ffprobe must be on PATH; optional FFMPEG_PATH overrides the encoder executable.
