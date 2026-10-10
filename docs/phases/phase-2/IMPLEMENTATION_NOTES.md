# Phase 2

Status: passed. Typecheck/lint/build and 10 unit/integration tests passed; 3 browser tests passed after correcting map updates during pending GeoJSON resource work. Seek now updates camera without waiting for style readiness; capture separately waits for resource readiness. Unit evidence covers repeated seeks, immutable input, length-based trim, 180° crossings, and scene-local timing.

Implement pure timestamp evaluator in animation-core, geodesic route progress and antimeridian unwrap, unified easing, scene selection, range/opacity evaluation. Wire preview to the same render state, real playback/scrub. Tests: repeat seeks, endpoints, unequal-length route segments, dateline, scene-local time, input immutability, browser seek. No DOM or wall-clock dependency in evaluation.
