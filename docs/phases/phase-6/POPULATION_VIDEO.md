# Population video visual treatment

The user approved the reference-inspired treatment on 2026-10-15: portrait 1080×1920, 45 seconds, top ten, UN WPP 2024 statistics, satellite background, fitted flags, deterministic number counters and camera travel. The original JSON and MP4 remain separate under `.local/population-video`; the new editable artifact and MP4 are under `.local/population-video-v2`. No Remotion/HyperFrames dependency is necessary for this composition.

## Interfaces and decisions

- Project v16 preserves actual v15 validation and migrates by changing the version. Optional `map.basemap` selects vector or a fixed local NASA Blue Marble image. No arbitrary URL/provider is accepted. The source is the January 2004 MODIS composite with shaded topography/bathymetry, not contemporary aerial imagery. Its original and derived hashes, row sampling, dimensions, source URL and NASA credit are in the bundled provenance JSON. The 8192px WebMercator JPEG is sufficient for country framing; close-up detail is limited by the source and resampling.
- Optional text `counter` stores scene-local timing, finite endpoints, decimal precision, locale and registry easing. The pure evaluator formats its render-state copy; it never mutates project text or uses the wall clock. Inspector edits are ordinary undoable project transactions.
- Optional highlight `textureFit: country` clips one fitted flag per disconnected polygon with even-odd holes. Masks use original bundled Natural Earth coordinates projected into WebMercator, longitude-unwrapped around the source label. Bounded 2048px canvases are map-native sources, so the map camera governs placement. Per-scene workload is capped at 20 masks. Repeat mode remains unchanged for old projects. Flags are decorative fitted textures, not indicators of disputed sovereignty or population density.
- Flag assets come from pinned `lipis/flag-icons` v7.5.0; the MIT notice and original SVG hashes remain bundled. Export captures only local resources and displays Natural Earth, flag and NASA credits. Render reports retain basemap provenance.

## Verification

Typecheck, lint, production build and unit/integration tests cover actual legacy migration, counter boundaries/determinism, preservation of polygon holes/islands/dateline coordinates and atomic persistence rejecting invalid edits. The real Playwright editor test covers MapLibre raster layers, counter midpoint, exact repeated-seek pixels, undo and IndexedDB restoration. Twelve full-size render-page screenshots cover all authored scenes and assert no overflowing labels or browser errors. The final MP4 is checked with ffprobe for 1350 frames, 45 seconds, 30 fps, 1080×1920 H.264/yuv420p; decoded scene samples are compared to the same renderer's PNGs. Evidence is retained beside the new video.

The composition has no narration or music. Existing wider release gates (Adobe host, hosted collaboration and live provider integrations) are unaffected by this video work.
