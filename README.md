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

The Scenes panel adds blank scenes, duplicates complete scenes with independent layers, renames, reorders, deletes and resizes scenes. Scene bars in the timeline show the whole sequence and let you jump between scenes. Choose cuts or “Crossfade from final frame”: during the incoming scene's transition, the preceding final visible frame fades over its live animation. This preserves scene timing and total duration. Selecting an endpoint key at an internal cut previews the preceding scene's final visible frame so the key remains editable. Structural scene edits close imported gaps and update project duration. Schema v1 files migrate with cuts without modifying source files. Scene operations support undo/redo, autosave and JSON round-trip. Limits: 20 scenes and 300 seconds; crossfade duration 0.1–5 seconds, bounded by the incoming scene.

Project → Template library provides travel, country highlight, portrait and two-scene starter projects. Search, save the current project as a local template, or delete a saved template. New instances have independent identifiers and support Undo back to the previous project. The library stores at most 30 templates/10 MB on this device, using atomic IndexedDB transactions. Inspector camera presets generate editable orbit, sweep, zoom bounce and fly-to keyframes for the current scene. Presets replace camera keys in one undoable operation and use the same evaluator during export.

Draw Line/Arrow with at least two map clicks, or Bezier with four clicks: start, control 1, control 2, end. Finish shape creates an editable geographic graphic. Inspector changes geometry, width, dashes and arrowheads; numbered controls or Move point buttons reposition a point on the map. Controls stay projected during camera changes and are excluded from exports. Shapes support reveal animation, locking, undo/redo and persistence. Bezier curves retain their original controls and follow the short longitude path across the antimeridian.

Inspector animation styles create fade in/out keys for all layers, draw keys for routes/shapes, and pop/slide keys for marker/text overlays. Timeline exposes opacity, reveal and supported scale/rotation/offset properties. Transform keys are absolute values in project pixels; opacity keys multiply base opacity. Presets replace only their affected tracks and respect layer time ranges, history and locking. Schema v3 adds empty transform tracks when migrating v1/v2 projects.

Image assets opens a local library for PNG/JPEG, Vietnam/Thailand flags and hatch/dot textures. Imports require source, author, license and visible credit; JPEG normalizes to static PNG and transparent PNG retains alpha. Add image overlays or repeating country fills, then edit map/screen anchors, dimensions, contain/cover fit and animated transforms. Assets support history, locking, templates and persistence. JSON embeds the pixels and provenance; previews/exports need no remote image server. Delete unused assets from the library. Limits: 20 assets, 2 MiB/image, 3 MiB/project compressed bytes, 24 million decoded pixels, 4096-pixel edges; country texture edges at most 512. Arbitrary SVG, animated PNG and remote image URLs are rejected.

Text/marker Inspector provides Label collision: Always show or Hide when overlapping, with priority 0–100. Higher priority wins; ties favor the frontmost layer. Always-show labels reserve space, and hidden marker text keeps its pin. Decisions use full project pixels, bundled fonts and evaluated camera/transforms, so resizing and seeking preserve the same policy in preview/export. Rotated bounds are conservative; labels are hidden rather than moved. Explicit line breaks are supported. Hidden layers can still be edited from the layer list. Existing projects migrate to Always show.

Country data opens a local CSV/XLSX importer. Select a worksheet, map country/year/value columns, declare source/author/license/credit and review observations before adding a choropleth. Countries match bundled ISO codes or exact names; unknown/duplicate rows and formulas reject with row errors. Inspector edits the fixed color domain, sampling, colors and legend. Timeline data-year keys interpolate observations or hold preceding values; missing years outside each country's range keep an explicit missing color. The legend distinguishes observed/interpolated values. Imported data stays in project JSON, templates, autosave and render snapshots. Limits: five datasets/10000 observations per project, 5 MiB input, 64 columns and 1000 characters/cell. XLSX parsing runs in a bounded worker and rejects external links/macros/formulas; no spreadsheet contents execute. Delete datasets only after removing their layer references.

Admin 1 regions opens the selected country's reference subdivisions. Enable boundaries, search source names/codes, select regions, focus or add a geographic highlight. Clicking a region exposes its source properties. Highlights support color, stroke, dimming, opacity keys, history, locking and persistence. Geometry loads from verified local country files only when needed, including during crossfades. This is Natural Earth v5.1.2 reference geography, with 63 Vietnam and 77 Thailand regions in that release; it does not assert current administrative divisions. Project coverage is limited to eight countries. Unknown IDs, corrupt files or unavailable resources reject with explicit errors.

Canvas presets include 3840×2160 and 2160×3840; choose 24, 30 or 60 FPS. Current schema v9 adds Admin 1 references and visibility, migrating valid v1–v8 projects while preserving their original frame rate, content and transitions.

Export → MP4, WebM, GIF or current-frame PNG → Start export. Progress, cancellation, retry and download are real worker operations. MP4/H.264 and WebM/VP9 use even dimensions, yuv420p, and fixed timestamps; source attribution remains in output. GIF uses a generated 256-color palette and centisecond frame delays, so its colors/timing differ slightly and viewer playback may be capped. All outputs keep canvas dimensions; there is no automatic downscale. 4K exports need more temporary disk and processing time. For CLI use:

```sh
pnpm render examples/travel-vietnam.json .local/travel mp4
```

The final CLI argument also accepts `webm`, `gif` and `png`. Temporary frame folders are unique to each invocation; cleanup preserves pre-existing user files. Encoding has a ten-minute timeout per pass, with actionable errors and retry.

On Windows install FFmpeg with `winget install Gyan.FFmpeg`; on Ubuntu use `sudo apt-get install ffmpeg`. Check `ffmpeg -version` and `ffprobe -version`. If Chromium is missing, rerun `pnpm exec playwright install chromium`. On Linux use `pnpm exec playwright install --with-deps chromium`. Optional `FFMPEG_PATH` specifies an encoder executable. Installation needs network access; the default app and render pipeline do not.

Run `pnpm check`, `pnpm format:check`, and `pnpm test:e2e`. E2E includes a real 360-frame 1080p render and takes several minutes. Golden frames use pinned Chromium/Noto Sans and allow 2% pixel difference for GPU rasterization across operating systems. `pnpm benchmark` profiles the evaluator and a 300-frame render with local services running. CI installs FFmpeg and Chromium before testing.

Shortcuts: Space play/pause; Ctrl/Cmd+Z undo; Ctrl/Cmd+Shift+Z redo; Ctrl/Cmd+S save; K capture camera key; Delete remove selected unlocked layer; +/- timeline zoom; Escape cancel drawing. Shortcuts are ignored inside text/form inputs.

Local saved projects and render outputs live in `apps/api/.local/`; CLI output uses the explicit directory. Temp frames are cleaned on completion/failure/cancellation. Completed outputs remain until you remove them. Job status is in memory and does not resume after restarting the API. Failed rendering does not modify projects. API listens only on loopback and rejects foreign origins/hosts; this is a local development application, not a hardened public hosting service.

Data provenance and font licenses: `docs/MAP_DATA_LICENSES.md`. Pipeline: `docs/RENDER_PIPELINE.md`. Architecture and deviations from the suggested UI dependencies: `docs/DECISIONS.md`. Natural Earth boundaries reflect the source dataset, including its territorial point of view. P1 currently includes multi-scene editing, cuts/crossfades, templates and camera presets. Further P1/P2 work is tracked in `docs/IMPLEMENTATION_CHECKLIST.md`.
