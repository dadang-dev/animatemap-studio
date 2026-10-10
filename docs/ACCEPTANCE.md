# P0 local acceptance evidence

All twelve supplied acceptance scenarios are covered by passing local checks. Phase reports record commands, failures repaired, output evidence and implementation decisions.

| Scenario                                    | Evidence                                                                                             |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| AC-01 Project/style changes retain state    | map browser test, store transaction tests                                                            |
| AC-02 Country MultiPolygon/islands retained | bundled checksum/geometry tests, real country selection                                              |
| AC-03 Camera keyframes/repeated seek        | core tests and animation browser test                                                                |
| AC-04 Three-stop route/reveal               | geodesic length tests, UI route creation, exported travel film                                       |
| AC-05 Layer property edits and undo/redo    | store and UI-created project tests                                                                   |
| AC-06 JSON round trip/save/reload           | schema fixtures, atomic API test, autosave refresh                                                   |
| AC-07 1080p/30fps/12s/360 frames            | actual MP4, ffprobe and decoded-frame comparison                                                     |
| AC-08 Portrait output without stretching    | actual 1080×1920 PNG and MP4, preview aspect sizing                                                  |
| AC-09 Antimeridian                          | core short-arc tests and actual route/arrow render                                                   |
| AC-10 Resource failures/timeouts/cancel     | missing-resource browser test, bounded readiness, job retry/cancel tests, actual export cancellation |
| AC-11 Map anchors                           | projected anchor checks and normal/full-size framing comparison                                      |
| AC-12 Vietnamese Unicode/SVG                | Noto Sans golden frames, actual decoded labels and deterministic SVG marker icons                    |

Final commands: `pnpm check`, `pnpm format:check`, `pnpm test:e2e`, `pnpm audit --prod`, `pnpm benchmark`. 16 unit/integration tests and 13 browser scenarios passed. CI configuration is present but has not run on a hosted service because this repository has no remote.

Video comparisons use mean absolute RGB channel error <3/255 at 0/3/6/9s; final results were <0.9. Golden frames allow 2% pixel difference across platform GPU rasterizers. This is not a claim of bit-identical H.264 pixels; evaluation and timestamps are deterministic, while encoding introduces expected lossy differences.

Remaining constraints: local-only deployment, no street tiles/geocoding/routing, vector geometry below text/marker overlays, accessible button-based reorder, and job status reset after API restart. See DECISIONS for native-control alternatives to the originally suggested UI libraries. Completed exports remain on disk; temporary frames are cleaned. P1/P2 features are deferred.
