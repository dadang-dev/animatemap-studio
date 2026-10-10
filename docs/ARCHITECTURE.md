# Architecture

React editor → versioned project → pure animation evaluator → MapLibre adapter and DOM overlays. The render worker uses the same renderer in Chromium at fixed timestamps, then FFmpeg. Fastify serves local persistence and jobs on loopback. No external tile service is enabled by default.

Workspace packages expose TypeScript sources consumed by Vite/tsx. Root TypeScript checks all packages together. Schema boundaries reject invalid data before persistence or render. UI state (selection, playback, history) is separate from project JSON.

## Ownership and interfaces

- `project-schema`: Zod project v6 contracts, typed layers, embedded PNG/provenance registry, bounded pixel validation, tested v1–v5 migration, job response contracts and fixture factory. Scene/keyframe times are local seconds; scene start maps them to project time. Unsupported versions fail explicitly.
- `animation-core`: `evaluateProjectAt(project, seconds)` returns scene ID, camera and evaluated layer copies, plus an optional outgoing scene state and incoming blend weight. Crossfade holds the preceding final visible frame and evaluates the incoming scene live. Easing registry, short-arc longitude/bearing and length-based geodesic trim have no React/DOM/clock dependency. Route arcs are sampled at ≤50 km intervals and longitude-unwrapped for rendering.
- `map-engine`: MapRenderer owns MapLibre, geometry sources, projected overlays, local worker URL and readiness checks. During crossfade it owns a second inert renderer for the outgoing frame; readiness and failure handling cover both, and the secondary renderer is disposed after the transition. User IDs are namespaced away from internal base-map layers. Preview scales project zoom/line widths/fonts; export scale is 1. Polygons retain islands and holes.
- `web`: Zustand project transactions validate snapshots and hold bounded undo history. Selection, draft camera, drawing points and playback are transient. Pure scene operations mutate transaction clones and reflow a contiguous sequence, maintaining transition bounds. ScenePanel owns scene controls, Timeline shows global scene bounds and scene-local keys. IndexedDB autosave and atomic local templates are separate from explicit API saves. Inspector, ProjectMenu and ExportPanel own UI concerns; MapSurface is shared by editor and RenderView.
- `api`: loopback Fastify routes wrap JsonRepository and JobQueue. Repository uses temporary-file rename for atomic writes. Worker queue clones submitted projects, serializes jobs and aborts Chromium/FFmpeg on cancellation. Cross-origin requests, hostile hosts and unsupported providers are rejected.
- `render-worker`: isolated production renderer at port 5174, fixed frame-index evaluation, readiness/retry, screenshots, shell-free FFmpeg, cleanup and reports. Editor port 5173 supports HMR independently.

## Project and API contracts

Project v6 contains canvas/FPS/duration, bundled provider/style/provenance, embedded assets, scenes with cut/crossfade transitions, camera tracks and discriminated layers. Layers carry visibility, locking, time range, opacity, transforms and opacity/reveal and overlay transform tracks. Text/marker/image anchors are WGS84 map coordinates or normalized screen coordinates. Image layers and country textures reference validated asset IDs. ImageResources evicts inactive references, bounds decoding readiness and uses local pixels; source metadata is never fetched. Shapes store line/arrow points or exactly four cubic Bezier controls; render state adds a sampled, geodesically trimmed path without mutating project controls. Longitudes unwrap before cubic sampling. Editor-only projected controls live outside MapRenderer. Validated v1 projects migrate with cuts; v1/v2 migrations add empty transform tracks; v1–v5 add an empty asset registry. Original fixtures remain v1 to exercise migration. The evaluator expects validated projects; persistence and jobs enforce that boundary.

Routes: GET health/projects/project-by-ID; POST projects; DELETE project-by-ID. Health returns `{status:"ok",schemaVersion:6}`; project list returns `[{id,name}]`. Render routes and response states are documented in RENDER_PIPELINE. All project names/text use plain text DOM APIs; there is no rich HTML rendering.

## Limits

No provider credentials or remote URL loading. Natural Earth is a country-scale basemap, not a street-map service. Vector layers render below DOM overlays, with reorder within each plane. API job status is in memory; saved JSON projects and completed artifacts persist. Production hosting, authentication, distributed jobs and P1/P2 require additional design.
