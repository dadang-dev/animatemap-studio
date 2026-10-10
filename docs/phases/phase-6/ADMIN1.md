# Phase 6J — Natural Earth Admin 1 boundaries

Status: preimplementation checklist; begin implementation after the Phase 6I regression gate passes.

Source inspection: pinned Natural Earth vector v5.1.2 `ne_10m_admin_1_states_provinces.geojson` contains 4596 features, with unique `adm1_code` and `ne_id`. Raw bytes: 40726851; SHA-256 `22d0e3ad85eb3e27f17cabf8ba2d50e554fbc27a87796ff891d958185da62fb5`. [Release source](https://github.com/nvkelso/natural-earth-vector/blob/v5.1.2/geojson/ne_10m_admin_1_states_provinces.geojson), [public-domain terms](https://www.naturalearthdata.com/about/terms-of-use/). The [Admin 1 documentation](https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-1-states-provinces/) describes coverage/accuracy limitations and its default de facto perspective. This is release 5.1.2 geography, not a claim about current administrative divisions. Names/codes may have changed since release; expose that version in selection and export credit.

Files/interfaces:

- Reproducible `scripts/fetch-admin1.mjs`, per-country local GeoJSON and catalog/provenance/checksums. Retain source Polygon/MultiPolygon coordinates, ring order, islands and holes without simplification. Derive country crosswalk from the same pinned Admin 0 source rather than guessing codes. Record unresolved relationships explicitly.
- Versioned schema: immutable catalog references, Admin 1 highlight layer, bounded country boundary visibility, tested previous-version migration. Reject unknown/duplicate region IDs and invalid layer references at persistence/job boundaries.
- Map adapter: load only required country files from fixed local paths; verify bytes/checksums, bound cache/fetch time, propagate resource failures and wait before frame capture. Selection works in preview; geographic fills/outlines share the existing adapter and deterministic opacity tracks in export, including crossfades.
- Editor: selected country's region search/list, version/source properties, show/hide boundaries, focus a region, add/edit highlights, locking/history/reorder and persistence. Avoid duplicating a full global geometry payload in project JSON.

Acceptance:

- [ ] Bundle/crosswalk/checksum and unchanged geometry tests pass; missing coverage is explicit.
- [ ] Old projects migrate unchanged; malformed region IDs/duplicates/budgets reject atomically.
- [ ] Real map selection/search/focus/highlights work for Vietnam and another country; camera/style changes preserve geographic alignment.
- [ ] History/locking/timeline, refresh/API/JSON/template round-trip preserve references and source version.
- [ ] Real PNG/MP4 match preview, retaining islands/holes and visible source credit; unavailable/corrupt local files fail with actionable errors and leave projects intact.
- [ ] Static/unit/integration/build/format, browser regression and license checks pass before proceeding.

Risks: large geometry, source-country code differences, unavailable/ambiguous names, dateline polygons and stale administrative boundaries. Do not invent absent regions or recast this reference release as current legal geography. Keep resource ownership/loading independent of animation evaluation.
