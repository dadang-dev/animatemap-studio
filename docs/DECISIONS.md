# Decisions

- English UI, Vietnamese Unicode text supported.
- Local Natural Earth geography; no OSM Foundation tile requests. Light, dark, muted styles use identical geometry.
- Schema v1 is the initial version; unknown versions are rejected rather than guessed.
- Node 24, pnpm 11. Source package exports avoid unnecessary build ordering for development.
- Phase 0 shell intentionally has disabled export until real rendering is validated.
- Shared accessible native controls and CSS currently replace Tailwind/shadcn and React Hook Form; all edits validate through Zod. Reorder uses keyboard-accessible up/down buttons rather than dnd-kit. These choices reduce UI dependencies while preserving behavior; draggable enhancements can be added without changing project contracts.
- Map vector geometry renders beneath DOM text/markers. Layer ordering is honored within each rendering plane; arbitrary interleaving needs a separate compositing implementation.
- Render workers use the production build on port 5174; editor development uses port 5173. A failed acceptance render exposed hot reload interrupting an active export. Production rendering removes that dependency.
- Phase 5 dependency audit prompted MapLibre 6.4.1 and Fastify 5.12.5. MapLibre now uses named ESM imports and a Vite-bundled local worker; WebGL2 is required. Production dependency audit has zero advisories after upgrade.
- Project zoom describes full-resolution framing; preview subtracts log2(canvasWidth/previewWidth), so resizing does not change geographic framing. User camera reads invert that correction. Screen anchors and map styles scale in project pixels.
- Post-MVP reliability review: renderer failures remain terminal until reload, including during updates and resize. Teardown ignores its own context-loss event. Each render-page load mounts a new renderer and rejects overlapping loads, so retrying failed initialization and loading another snapshot are deterministic. Unchanged editor transactions preserve undo/redo history; duration changes clamp the playhead.
- Phase 6A starts P1 with multi-scene editing and existing deterministic cuts. No schema fields or migration change. Structural scene edits create a contiguous sequence, keeping scene-local animation times; load/rename preserve imported gaps. Duplicates receive fresh scene/layer IDs. Trim discards later keys without rescaling remaining keys, and extension extends layer ranges that ended at the old scene end. Endpoint-key selection previews the last visible frame before an internal cut; direct seeking at the boundary uses the next scene. Crossfade awaits a separate compositing contract.
