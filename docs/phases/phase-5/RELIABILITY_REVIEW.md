# Post-MVP reliability review

Scope: address concrete lifecycle and history gaps in P0 before beginning P1 features. Preserve the schema, evaluator, original planning documents, and export format.

Checklist and interfaces reviewed:

- Map engine `apply`, `ready`, and teardown: preserve terminal WebGL failure, suppress teardown events, report resize errors through the surface callback.
- Render page `load`/`frame`: remount for every validated snapshot, reject overlapping loads, clear both readiness callbacks after success/failure. Verify recovery from a failed load and switching to a portrait project in the same page.
- Editor transactions and undo/redo: preserve history and selection for locked/unchanged edits; clamp project time when shortening the project, including redo.
- Regression risks: false context-loss failures during teardown; preview/export differences after renderer changes; unwanted undo entries and out-of-range playheads.

Implemented all items above. The initial reload regression caught a teardown context-loss event rejecting the new load; fixed by ignoring events from destroyed renderers and disposed surfaces. A real `WEBGL_lose_context` browser test verifies that seeking and resizing cannot hide the failure and page reload restores the editor.

Validation: `pnpm check` passed typecheck, lint, 18 unit/integration tests, and production build. `pnpm format:check` and `git diff --check` passed. Targeted browser tests passed after repairing the teardown issue. Full `pnpm test:e2e` passed all 15 scenarios in 2.9 minutes, including golden-frame checks.

The repeated real 1920×1080/30fps/12s export passed H.264/yuv420p and 360-frame verification. Mean absolute RGB channel error at 0/3/6/9s remained 0.818/0.851/0.889/0.864, below the documented threshold of 3. Portrait PNG/MP4 dimensions and cancellation also passed. Export render time was 103.7s on this machine. Evidence remains in `test-results/export`.

Existing MapLibre bundle-size warning and previously documented P0 limits remain. Hosted CI requires a configured remote. Next step: user review of the hardened editor, then select a P1 feature from the original plan.
