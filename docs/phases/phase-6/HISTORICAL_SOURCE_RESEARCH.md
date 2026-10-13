# Historical boundary source research

Research date: 2026-10-13. This is source selection research for module 7B, not an implementation or acceptance report. The complete original plan, `docs/AGENTS.md` and Phase 6 roadmap were read. No application, schema, API, build or test files were changed. No accounts, API keys, external messages or paid services were used.

## Recommended first offline dataset

Use the District of Columbia government's three historical election ward datasets as a small, real administrative history pack. Each covers eight wards. Label the pack **Washington, DC election wards, 1982–2011**. This provides actual temporal administrative boundaries; it does not supply historical national borders or worldwide coverage. The initial geometry can remain exactly as returned in WGS84, with factual changes represented by cuts between published eras.

The dataset-specific ArcGIS items are public and each currently has `licenseInfo` explicitly naming [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/). This was verified by anonymous HTTP requests to the items themselves, rather than inferred from a generic portal policy. Commercial redistribution and adaptation are allowed with credit, a license link and disclosure of modifications; do not imply government endorsement. Each item's license is also recorded in its official Data.gov catalog entry.

| Published dataset | Source-described years of use | ArcGIS item                        | Layer | Source identity field | Catalog                                                            |
| ----------------- | ----------------------------- | ---------------------------------- | ----- | --------------------- | ------------------------------------------------------------------ |
| Wards from 1982   | 1982–1991                     | `428a021728d94d96abb774ecdde9b8e4` | 51    | `WARDID`              | [Dataset record](https://catalog.data.gov/dataset/wards-from-1982) |
| Wards from 1992   | 1992–2001                     | `37a6ecfe6ed3412abbae967ec957582c` | 33    | `WARD`                | [Dataset record](https://catalog.data.gov/dataset/wards-from-1992) |
| Wards from 2002   | 2002–2011                     | `a4442c906559456eb6ef3ea0898fe994` | 32    | `WARD`                | [Dataset record](https://catalog.data.gov/dataset/wards-from-2002) |

Original item metadata endpoints, all returned HTTP 200 on the research date:

- [1982 item metadata](https://www.arcgis.com/sharing/rest/content/items/428a021728d94d96abb774ecdde9b8e4?f=pjson).
- [1992 item metadata](https://www.arcgis.com/sharing/rest/content/items/37a6ecfe6ed3412abbae967ec957582c?f=pjson).
- [2002 item metadata](https://www.arcgis.com/sharing/rest/content/items/a4442c906559456eb6ef3ea0898fe994?f=pjson).

The publisher is `DCGISopendata`; layer copyright credit names DC Office of Planning and DC OCTO. Suggested displayed credit is **DC Office of Planning / DC OCTO · CC BY 4.0 · historical election wards**. Retain the source/title/license URLs, original notices and changes in the project and exported manifest as well as the visible source credit. Source item modification timestamps are 2024-09-05: 16:48:26Z / 16:48:47Z / 16:49:09Z respectively. These are publication metadata timestamps, not boundary validity dates.

## Actual GeoJSON inspection

Three small requests were downloaded into memory and inspected; no dataset files were saved by this research task. Querying `outSR=4326` is essential because the published WebMercator service is EPSG:3857. No `geometryPrecision`, `maxAllowableOffset`, quantization or client simplification was requested. Unneeded demographic and representative/contact fields were omitted deliberately.

| Era  | Exact response bytes | Features | Geometry                   | Coordinate vertices including ring closure | SHA-256 of response bytes                                          |
| ---- | -------------------: | -------: | -------------------------- | -----------------------------------------: | ------------------------------------------------------------------ |
| 1982 |              516,353 |        8 | Eight single-ring Polygons |                                     12,634 | `ac7b9540bdb379764010feacfe174338f94fc49779d9ee47e3e1cc75527c0509` |
| 1992 |              822,214 |        8 | Eight single-ring Polygons |                                     20,132 | `9e68eeeb88ff52210cb08354ddb51b17558c2581b86c4ef59b815e87512fea91` |
| 2002 |              835,189 |        8 | Eight single-ring Polygons |                                     20,449 | `9e8c3325df644c6ca9a8ffa4cf17d1b2f0811573009aa8e18a487f521209c81a` |

Exact query URLs used:

- [1982 WGS84 GeoJSON](https://maps2.dcgis.dc.gov/dcgis/rest/services/DCGIS_DATA/Administrative_Other_Boundaries_WebMercator/MapServer/51/query?where=1%3D1&outFields=OBJECTID%2CNAME%2CWARDID%2CGIS_ID&outSR=4326&returnGeometry=true&orderByFields=OBJECTID+ASC&f=geojson).
- [1992 WGS84 GeoJSON](https://maps2.dcgis.dc.gov/dcgis/rest/services/DCGIS_DATA/Administrative_Other_Boundaries_WebMercator/MapServer/33/query?where=1%3D1&outFields=OBJECTID%2CNAME%2CWARD%2CGIS_ID&outSR=4326&returnGeometry=true&orderByFields=OBJECTID+ASC&f=geojson).
- [2002 WGS84 GeoJSON](https://maps2.dcgis.dc.gov/dcgis/rest/services/DCGIS_DATA/Administrative_Other_Boundaries_WebMercator/MapServer/32/query?where=1%3D1&outFields=OBJECTID%2CNAME%2CWARD%2CWARD2002&outSR=4326&returnGeometry=true&orderByFields=OBJECTID+ASC&f=geojson).

All returned a FeatureCollection with finite longitude/latitude coordinates and closed rings. Combined responses contain 24 features, 53,215 coordinate vertices and 2,173,756 bytes. Overall extent is approximately [-77.11980, 38.79164, -76.90915, 38.99597]. No transfer-limit warning was present. This is a useful bounded import size; it does **not** establish simple polygons, correct adjacency, absence of overlaps or morph suitability. Those require implementation tests.

The snapshots have no day-level validity fields. Preserve the publisher's year-level intervals; do not fabricate exact statutory effective dates. A year slider should expose the granularity and only use years within source coverage. Original `OBJECTID` values are per-layer identifiers, not a stable cross-era geographic identity; explicitly map the published ward number fields to logical ward identifiers.

**1992 source discrepancy:** the item and layer descriptions say the boundaries were used in 1992–2001, but returned `NAME` values include names such as `Ward 2 (1990)` and `GIS_ID` values include `Ward90Ply_5`. Preserve these original properties. Display the published validity period together with a source-note warning about the legacy labels. Do not silently relabel the original data or assert that the discrepancy has been resolved.

## Geometry and time contract recommendations

These are implementation recommendations, not claims that validation has already passed:

1. Store source snapshots separately from derived render geometry, preserving Polygon/MultiPolygon structure and any rings in imported data. Keep original byte checksums, selected properties, request URLs, retrieval date, license and temporal granularity.
2. Default to source-era cuts. A year between publication snapshots belongs to the explicit source-described validity interval; a missing interval produces a missing-data state. Do not interpolate an unknown historical border as a factual boundary.
3. Require explicit feature identity correspondence before morphing. Even these simple source Polygons differ in vertex counts: ward 4 has 1,223 / 1,431 / 1,501 vertices. Direct array-index interpolation is invalid. Shared boundary arcs, ring direction, ring start positions, holes, changed polygon counts and vanished/created features need a deterministic correspondence policy.
4. Reject unsafe morphs with an actionable explanation. Validate input and interpolated topology within bounded CPU/vertex limits, including self-intersection, degenerate rings, hole containment and disjoint MultiPolygon components. Individually valid polygons alone do not guarantee that adjacent regions stay gap-free or overlap-free during interpolation.
5. Treat any accepted intermediate morph as an **illustrative transition between documented snapshots**, with a visible uncertainty/source label. Evaluate it in the pure shared animation core at export time; no clock, network or AI-generated coordinates enter rendering.
6. Test exact snapshot boundary years, uncovered years, shuffled feature order, stable identities, retained legacy labels, incompatible topology, dateline geometry, migration, JSON persistence and preview/export parity. Source discovery is not the module acceptance gate.

## Broader historical alternative: Newberry Atlas

The [publisher's current download page](https://publications.newberry.org/ahcb/download/) explicitly permits Atlas data reuse for lawful commercial or non-commercial purposes without library licensing fees, and says old copyright licenses inside some files can be ignored. This is dataset-specific permission, stronger evidence than a generic library collection policy. The separate `/about/` page could not be retrieved here; **do not label the selected file CC0 solely from third-party descriptions** until its current primary CC0 notice is captured.

The page offers real US Historical States and Territories for 1783–2000, including a [0.01-degree generalized GIS archive](https://publications.newberry.org/ahcb/downloads/gis/US_AtlasHCB_StateTerr_Gen01.zip) listed as 2 MB, finer 0.001-degree data listed as 14 MB, and full geometry listed as 100 MB. The published generalization scale must be disclosed. A [small DC historical counties archive](https://publications.newberry.org/ahcb/downloads/gis/DC_AtlasHCB.zip) is also listed. These are US administrative/territorial histories, not worldwide national borders.

Anonymous publisher links are available, but direct Node requests to both selected ZIP URLs hit connection timeouts in this environment. Therefore archive bytes, checksums, contained schema, temporal endpoint semantics, provenance citations and topology were **not** verified. Do not bundle an uninspected mirror or claim successful ingestion. Once reachable, inspect the original ZIP's metadata/chronologies and preserve the publisher's current permission notice, including its statement about outdated embedded licenses. Convert from the documented source CRS deterministically, retain source dates/citations, and subset within declared import budgets.

## Excluded global source

[ETH's CShapes page](https://icr.ethz.ch/data/cshapes/) describes worldwide state/territory histories from 1886–2019 and a European extension from 1816, but explicitly licenses the dataset [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/). Its NonCommercial restriction prevents treating it as unrestricted commercial bundled map data. The R package's GPL license does not override this separate data license. Do not ship it under the app's commercial-compatible defaults without an independently verified suitable grant.

## Research outcome

The DC ward pack is the recommended first working 7B slice because the authority, dataset-specific commercial license, anonymous access, published year intervals and actual bounded WGS84 geometry were all checked. Newberry is a stronger later historical territorial library candidate, with current commercial permission verified but archive retrieval still unverified. No commercially unrestricted worldwide country-border dataset has been established by this research. Keep that limitation visible; do not fabricate borders to fill coverage.
