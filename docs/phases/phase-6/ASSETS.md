# Phase 6G — Embedded image assets, flags and textures

Status: gate passed on 2026-10-10; Shapes gate passed first.

Files/interfaces: a versioned project asset registry stores normalized PNG bytes, dimensions and declared provenance. Image layers reference an asset ID, use WGS84 or normalized screen anchors, project-pixel dimensions, fit mode and existing scalar transform tracks. Country highlights can reference a repeating texture asset. Keep all previous validators and migrate with an empty registry; validate references, duplicate IDs, image signatures/dimensions, animation chunks and aggregate storage/pixel budgets. No arbitrary remote image URL or uploaded SVG executes in the renderer.

Ingestion: local PNG/JPEG imports decode and normalize through a browser canvas; preserve alpha and reject animated PNG. Require source/author/license/credit declarations instead of assuming ownership. A small bundled flag library uses verified Wikimedia Commons original SVGs, retained source checksums and public-domain license records; trusted built-ins rasterize once into embedded PNG. Procedural hatch/dot textures have owned source code and explicit provenance. Assets and their metadata travel with JSON, templates, persistence and immutable render snapshots.

Renderer: a bounded decoded-image cache and explicit image readiness cover both preview and export, including crossfades. Errors identify the asset and preserve saved projects. Image overlays use the same projected anchors, sizing and transforms as text/markers. MapLibre fill-pattern draws country textures; visible credits include referenced asset provenance. Editor edit handles remain absent from output.

Acceptance:

- [x] Tested migrations preserve v1–v5 content; corrupt/animated/oversized assets, external URLs, duplicate/missing references reject.
- [x] Import local transparent PNG/JPEG and built-in flags/textures; edit anchor, dimensions, fit and transforms with history/locking.
- [x] Project refresh, API persistence, templates and JSON round-trip preserve embedded pixels and declared provenance.
- [x] Image/map-pattern readiness is bounded; resource failures are actionable and leave saved projects intact.
- [x] Real image/texture MP4 and PNG match preview at sampled frames, including Unicode/source credits and map anchors during pitch/zoom.
- [x] Static/unit/integration/build/format and appropriate golden/regression browser checks pass.

Risks: base64 storage overhead, decompression memory, duplicate asset lifetime across scenes/history, unsupported image encodings, and repeated texture scale. Imported assets remain static images. Pattern fills explicitly repeat the texture in map pixels; an overlay flag is a rectangular image, and neither implies a new political boundary.

Implemented boundaries: schema v6 retains all previous validators; 20 assets, 2 MiB compressed per image, 3 MiB/project and 24 million decoded pixels, edges at most 4096. Repeating textures are limited to 512 pixels per edge. Static PNG validates CRCs, chunk ordering, compressed stream length, Adler checksum and scanline filters before decoding; fflate 0.8.3 supplies bounded streaming inflate. Metadata-only validation cache has 20-entry/8-MiB encoded-text limits. Project image cache retains only active references. JPEG imports validate dimensions before browser decoding, then normalize into PNG. Uploaded SVG is rejected; only checksum-pinned built-in flag SVGs rasterize locally.

Targeted validation: `pnpm check` passed typecheck/lint, 58 unit/integration tests and build; format passed. All five new browser scenarios passed, with the missing-font scenario repeated twice. Browser evidence includes transparent PNG alpha, JPEG normalization, unsafe uploads, HTTP failures, map-anchor projection during pitch, history/locking, template sharing and refresh/API/JSON persistence. Chromium tolerates some corrupt PNG streams, so a direct diagnostic led to strict stream validation rather than relying on `Image.decode()`. A separate explicit decoder fault injection verifies failure and renderer reload recovery. Missing-font coverage blocks both WOFF2 and the WOFF fallback.

Export evidence: real two-second 1920×1080/30 MP4 with crossfade has 60 frames (ffprobe). Sampled frames 0/15/30/37/59 have mean RGB channel errors 0.804/0.857/0.846/1.413/0.850 against preview, below the fixed 3/255 tolerance. Frame-37 PNG pixel data equals preview exactly. Machine-readable evidence: `assets-ffprobe.json`, `assets-parity.json`. Reviewed local artifacts: `.local/reviewed/assets/editor.png`, `flags-texture.mp4`, `frame.png` (ignored/generated).

Initial failures exposed the Vietnam source's UTF-8 BOM being stripped by text decoding, permissive native PNG decoding, and a font test that left the valid WOFF fallback available. Source hashes now use raw response bytes; invalid pixels reject before persistence; resource fault coverage exercises both font encodings. Complete gate command `pnpm check && pnpm format:check && pnpm test:e2e` passed: 58 unit/integration tests and all 36 browser scenarios, including every existing export/regression/golden scenario, in 9.1 minutes. Production dependency audit found no known vulnerabilities. No open asset acceptance failures; Vite's large MapLibre chunk remains a build warning. Next module: deterministic label collision.
