# Phase 6H — Deterministic label collision

Status: gate passed on 2026-10-10; embedded-assets gate passed first.

Files/interfaces: preserve schema v6 and introduce v7 text/marker collision settings (`allow` or `hide`, integer priority 0–100). Legacy projects migrate to `allow`, retaining every existing label. Inspector edits settings in the existing validated transaction/history. Animation core owns a pure rectangle-selection function; MapRenderer supplies projected project-pixel bounds measured with the bundled font, evaluated transforms and camera. No placement depends on prior frames, playback direction, wall time or selection.

Policy: always-show labels reserve space. Optional labels are accepted by descending priority, then frontmost layer order, then stable identifier. Overlaps within a four-project-pixel margin hide the lower-priority label. Marker pins remain visible when their text is hidden. Images, route arrows and attribution are outside this label policy. Clip bounds to the viewport; offscreen labels reserve no visible space. Recompute independently per scene during crossfade. Rotated/scaled labels use conservative axis-aligned bounds. No automatic movement or temporal hysteresis.

Font/project coordinates: measure at full project font size, so resizing the editor does not change the selected labels. Explicit newlines remain supported; labels use intrinsic width rather than viewport-dependent soft wrapping. Recompute after font readiness and camera movement. Hidden text remains editable through the layer list/Inspector. Export calls the same adapter after bundled-font readiness.

Acceptance:

- [x] Tested v1–v6 migration preserves content; invalid collision mode/priority rejects.
- [x] Pure tests cover overlap margin, edge clipping, rotation/scale, priority/order, always-show obstacles and repeated/reversed seeks.
- [x] UI edits respect undo/redo, locking, persistence and JSON round-trip; marker pins survive hidden labels.
- [x] Resize/pan/zoom/pitch and crossfade use reproducible label decisions without previous-frame state.
- [x] A real PNG/MP4 matches preview, including Unicode labels and hide/show changes from camera/animation.
- [x] Static/unit/integration/build/format and relevant browser/golden checks pass.

Risks: conservative rotated bounds may hide labels that have no glyph overlap; four-pixel padding intentionally protects against small rasterization differences. Always-show labels can overlap by explicit user choice. This module does not move anchors or infer cartographic label priorities.

Implementation: `labelLayout.ts` owns pure transformed bounds, visible clipping and stateless priority selection. MapRenderer measures font metrics at full project size, with at most 100 cached measurements, and applies the same evaluated overlay transform origin to layout and DOM. Readiness clears provisional measurements once bundled fonts load. Intrinsic text width preserves explicit Unicode/newlines and avoids resizing-induced soft-wrap decisions. Empty/zero-opacity/inactive labels reserve no space. Scene blend renderers select independently. The Inspector exposes mode/priority; hidden text remains selectable from layers. Schema v7 preserves validated v1–v6 contracts and defaults to always-show.

Targeted validation: `pnpm check` passed typecheck, lint, 69 unit/integration tests and production build. Format check passed. `pnpm exec playwright test tests/e2e/label-collision.spec.ts tests/e2e/visual.spec.ts tests/e2e/reliability.spec.ts` passed all five cases, covering controls, locked fields, priority/always-show, resize/pitch/pan, refresh/API/JSON and resource recovery/golden frames. Invalid priority returns 400 without replacing the saved project. Repeated seeks produced identical PNG pixel data.

Export evidence: actual two-scene 1920×1080/30 H.264 MP4 has 60 frames. Samples 0/15/29/37/59 have mean RGB-channel differences 0.884/0.905/0.884/2.028/0.887, below the 3/255 limit. Frame-37 PNG equals preview pixels exactly. `labels-ffprobe.json` and `labels-parity.json` retain metadata/results. Reviewed local artifacts: `.local/reviewed/labels/editor.png`, `collision.mp4`, `frame.png`.

Additional regression: all 14 cases in assets/map/polish/crossfade passed, including actual image MP4/PNG, missing images/fonts/map data, antimeridian arrows, geographic framing, keyboard input and plain-text security. This gate ran 19 distinct relevant browser cases; the clean full 36-case baseline was recorded immediately before this module. No open collision acceptance failures. Remaining renderer-plane ordering and conservative bounds are documented limitations. Next module: CSV/XLSX data import and choropleth animation.
