# Vancouver building reference sample

Source: City of Vancouver [Building footprints 2009](https://opendata.vancouver.ca/explore/dataset/building-footprints-2009/). Reuse is under the [Open Government Licence – Vancouver](https://opendata.vancouver.ca/pages/licence/), including commercial use subject to its conditions. Required attribution: Contains information licensed under the Open Government Licence – Vancouver. The license does not imply endorsement and excludes rights it does not grant, including personal information and third-party rights.

The original 91,283-byte anonymous records response is retained in `vancouver-source.json`; exact query, retrieval time and SHA-256 are in `provenance.json`. This query selects the highest 100 positive `hgt_agl` elements, ordered by height then polygon ID, from 124,172 matching elements. It is an incomplete, height-biased reference sample, not a complete city or downtown inventory. `id` identifies each polygon element; `bldgid` groups related elements. `hgt_agl` is metres above grade; geodetic roof/base elevations are not substituted for that height.

`scripts/prepare-buildings.mjs` verifies the pinned response, selects the source IDs/group IDs/AGL height, and preserves original geometry vertices and holes. It emits a local GeoJSON asset. The importer additionally checks the derived SHA-256 before review. Neither derivation nor import silently simplifies geometry or fills missing heights.

The dataset describes approximate generalized **2009 LiDAR** footprints and is not being updated. Changes since 2009 and survey/generalization uncertainty matter; it is reference visualization data. Extruded prisms portray recorded building-element height above a modeled ground plane, not roofs/interiors/current conditions. Neighboring elements can share a building group and are retained as distinct records. Height-scale animation is a stylized transform, not another measured height.

Automated synthetic footprint fixtures are authored by AnimateMap contributors and dedicated under CC0-1.0. They are explicitly labeled test geometry and are separate from this actual source snapshot.
