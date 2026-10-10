# Phase 1

Status: passed. `pnpm check`: typecheck/lint/4 unit-integration tests/build pass. `pnpm test:e2e`: 2 pass, including real WebGL country selection/color/style/camera/anchor and MultiPolygon checks. Screenshot: `test-results/phase-1-editor.png`, visually inspected. Fixed React ownership of MapLibre container so loading-state removal cannot erase the canvas. Residual: large MapLibre bundle; profile/split in Phase 5. Timeline resizing is completed with the full timeline in Phase 3.

Build shared MapLibre adapter, country loader, three local styles, project-driven highlights and map anchors. Add three-panel editor, camera Inspector, timeline shell, and accessible loading/error states. Bundle pinned Natural Earth GeoJSON without simplifying islands; record checksum. Tests: country click selection, color/style changes, camera movement, projected anchor positions and MultiPolygon retention. Risks: software WebGL and first-load country parsing.
