# Phase 6J — Natural Earth Admin 1 boundaries

Status: complete; Phase 6J acceptance gate passed.

Source inspection: pinned Natural Earth vector v5.1.2 `ne_10m_admin_1_states_provinces.geojson` contains 4596 features, with unique `adm1_code` and `ne_id`. Raw bytes: 40726851; SHA-256 `22d0e3ad85eb3e27f17cabf8ba2d50e554fbc27a87796ff891d958185da62fb5`. [Release source](https://github.com/nvkelso/natural-earth-vector/blob/v5.1.2/geojson/ne_10m_admin_1_states_provinces.geojson), [public-domain terms](https://www.naturalearthdata.com/about/terms-of-use/). The [Admin 1 documentation](https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-1-states-provinces/) describes coverage/accuracy limitations and its default de facto perspective. This is release 5.1.2 geography, not a claim about current administrative divisions. Names/codes may have changed since release; expose that version in selection and export credit.

Files/interfaces:

- Reproducible `scripts/fetch-admin1.mjs`, per-country local GeoJSON and catalog/provenance/checksums. Retain source Polygon/MultiPolygon coordinates, ring order, islands and holes without simplification. Derive country crosswalk from the same pinned Admin 0 source rather than guessing codes. Record unresolved relationships explicitly.
- Versioned schema: immutable catalog references, Admin 1 highlight layer, bounded country boundary visibility, tested previous-version migration. Reject unknown/duplicate region IDs and invalid layer references at persistence/job boundaries.
- Map adapter: load only required country files from fixed local paths; verify bytes/checksums, bound cache/fetch time, propagate resource failures and wait before frame capture. Selection works in preview; geographic fills/outlines share the existing adapter and deterministic opacity tracks in export, including crossfades.
- Editor: selected country's region search/list, version/source properties, show/hide boundaries, focus a region, add/edit highlights, locking/history/reorder and persistence. Avoid duplicating a full global geometry payload in project JSON.

Acceptance:

- [x] Bundle/crosswalk/checksum and unchanged geometry tests pass; missing coverage is explicit.
- [x] Old projects migrate unchanged; malformed region IDs/duplicates/budgets reject atomically.
- [x] Real map selection/search/focus/highlights work for Vietnam and another country; camera/style changes preserve geographic alignment.
- [x] History/locking/timeline, refresh/API/JSON/template round-trip preserve references and source version.
- [x] Real PNG/MP4 match preview, retaining islands/holes and visible source credit; unavailable/corrupt local files fail with actionable errors and leave projects intact.
- [x] Static/unit/integration/build/format, browser regression and license checks pass before proceeding.

Risks: large geometry, source-country code differences, unavailable/ambiguous names, dateline polygons and stale administrative boundaries. Do not invent absent regions or recast this reference release as current legal geography. Keep resource ownership/loading independent of animation evaluation.

Implementation: schema v9 retains v8 validation and migrates v1–v8 with empty Admin 1 visibility. `ne_id` is the stable internal identifier (`ne-…`); raw `adm1_code`, including nonstandard values such as `GAZ+00?`, remains in source properties rather than being rewritten. All 4596 parent relationships resolve through the verified Admin 0 crosswalk. The 251 country files total 30208517 bytes; geometry digest `bd766ab9b4fc05ca606be804aff0ed46b3183a3a5cc374d774fe733e681aa0b7` verifies every source ring/component. Vietnam has 63 and Thailand 77 reference regions in this release. The UI states release/version limitations and never calls these current divisions.

Project coverage is capped at eight countries across outlines and region highlights, including all scenes. Per-renderer resources retain active countries only, stream at the pinned byte length, verify SHA-256 and use 15-second fetch/readiness limits. Inactive loads abort and caches evict; disposal suppresses its own abort failure. A shared source feeds preview selection, optional persistent outlines and ordered geographic highlights. Opacity tracks use the existing pure evaluator; both crossfade renderers wait for their own geography. Credits name Admin 1 release 5.1.2.

Validation: `pnpm check` passed strict typecheck, lint, 91 unit/integration tests in 30 files and the production build. Three Admin 1 browser scenarios and the original map scenario passed in 1.8 minutes. Region selection/focus, style/pitch/bearing alignment, appearance/history/locking/opacity keys, invalid-reference rejection, Bangkok highlighting and API/autosave restoration passed. Real missing/corrupt-file readiness/recovery passed, with saved projects unchanged. The first UI test incorrectly expected Add keyframe to select its diamond; the test now explicitly selects the visible key before editing its value.

Actual export: 1920×1080 H.264/yuv420p at 30 FPS, two seconds/60 decoded frames, Kon Tum and Bangkok outlines/highlights with opacity styles and crossfade. Frames 0/15/29/37/59 have mean absolute RGB error 0.806/0.805/0.804/1.304/0.815 against preview, below the existing tolerance 3. PNG frame 37 is pixel-identical (zero changed channels); reverse/repeated seeks are identical. Reports: `admin1-ffprobe.json`, `admin1-parity.json`. Reviewed local artifacts: `.local/reviewed/admin1/editor.png`, `regions.mp4`, `frame.png`. Visual inspection confirms the highlighted regions, country outlines, Unicode labels and visible Admin 1 release credit.

Final regression: 21 additional browser scenarios passed in 5.8 minutes covering assets, crossfade, CSV/XLSX, choropleth export, labels, golden frames, camera framing, shortcuts, font/map/WebGL failures and recovery. Together with the four Admin 1/map scenarios, 25 relevant browser scenarios passed. `pnpm format:check` passed after formatting the two evidence reports; `pnpm audit --prod` found no known vulnerabilities. Source licenses/provenance were reviewed. Remaining warning: large MapLibre/ExcelJS bundles and added catalog bytes; country geometry is lazy. Next module: 6K audio/voiceover/captions.
