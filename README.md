# AnimateMap Studio

Local-first animated map editor. Implementation follows `PLAN_CODEX_ANIMATEMAP_STUDIO.md`; phase evidence lives in `docs/phases`.

Prerequisites: Node 24+, pnpm 11; FFmpeg/ffprobe on PATH for video export.

```sh
pnpm install
pnpm exec playwright install chromium
pnpm dev
```

Open http://127.0.0.1:5173. API binds http://127.0.0.1:3001; the isolated production renderer runs on port 5174. `pnpm dev` builds the renderer before starting all three services. Restart it after renderer changes. No map API keys or internet connection are needed after installation: geography and fonts are bundled.

Create a project from the Project menu, choose 16:9, 9:16 or square, and search countries by name/ISO code. Add country highlights from Inspector; draw routes by clicking at least two map points and choosing Finish route. Routes are geographic connections, not road directions. Add markers by clicking the map and text from the toolbar. Inspector edits appearance, coordinates, screen anchors and timing. Layer controls change visibility, locking and order. Text/markers render above vector geometry.

Set the playhead, position the camera, then add a camera keyframe. Timeline diamonds expose time, value and easing; keys can be copied/deleted. Opacity and route-reveal tracks use the same evaluator as camera animation. Project edits support undo/redo; selection and draft camera are editor state. Save JSON or use local API Save/Open; IndexedDB autosave restores the last project after refresh.

The Scenes panel adds blank scenes, duplicates complete scenes with independent layers, renames, reorders, deletes and resizes scenes. Scene bars in the timeline show the whole sequence and let you jump between scenes. Transitions are cuts: the exact boundary renders the next scene with its own local keyframes. Selecting an endpoint key at an internal cut previews the preceding scene's final visible frame so the key remains editable. Structural scene edits close imported gaps and update project duration; original JSON remains unchanged when merely loaded. Scene operations support undo/redo, autosave and JSON round-trip. Limits: 20 scenes and 300 seconds; crossfade remains deferred.

Export → MP4 or current-frame PNG → Start export. Progress, cancellation, retry and download are real worker operations. H.264 uses even dimensions, yuv420p, and fixed timestamps; source attribution remains in output. For CLI use:

```sh
pnpm render examples/travel-vietnam.json .local/travel mp4
```

On Windows install FFmpeg with `winget install Gyan.FFmpeg`; on Ubuntu use `sudo apt-get install ffmpeg`. Check `ffmpeg -version` and `ffprobe -version`. If Chromium is missing, rerun `pnpm exec playwright install chromium`. On Linux use `pnpm exec playwright install --with-deps chromium`. Optional `FFMPEG_PATH` specifies an encoder executable. Installation needs network access; the default app and render pipeline do not.

Run `pnpm check`, `pnpm format:check`, and `pnpm test:e2e`. E2E includes a real 360-frame 1080p render and takes several minutes. Golden frames use pinned Chromium/Noto Sans and allow 2% pixel difference for GPU rasterization across operating systems. `pnpm benchmark` profiles the evaluator and a 300-frame render with local services running. CI installs FFmpeg and Chromium before testing.

Shortcuts: Space play/pause; Ctrl/Cmd+Z undo; Ctrl/Cmd+Shift+Z redo; Ctrl/Cmd+S save; K capture camera key; Delete remove selected unlocked layer; +/- timeline zoom; Escape cancel drawing. Shortcuts are ignored inside text/form inputs.

Local saved projects and render outputs live in `apps/api/.local/`; CLI output uses the explicit directory. Temp frames are cleaned on completion/failure/cancellation. Completed outputs remain until you remove them. Job status is in memory and does not resume after restarting the API. Failed rendering does not modify projects. API listens only on loopback and rejects foreign origins/hosts; this is a local development application, not a hardened public hosting service.

Data provenance and font licenses: `docs/MAP_DATA_LICENSES.md`. Pipeline: `docs/RENDER_PIPELINE.md`. Architecture and deviations from the suggested UI dependencies: `docs/DECISIONS.md`. Natural Earth boundaries reflect the source dataset, including its territorial point of view. The first P1 module adds multi-scene editing with cuts; crossfade, templates, street routing/geocoding, audio, 4K, 3D and AI remain deferred.
