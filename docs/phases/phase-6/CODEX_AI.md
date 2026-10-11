# Phase 7C — Reviewed Codex project proposals

Status: actual Codex/browser/export acceptance passed. The user selected the installed Codex account rather than a separate API provider and explicitly declined other accounts/keys. Offline geography and adapter contract checks pass; its independent live-routing gate stays visibly open.

Provider research: [Codex non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode) documents structured output, stdin prompts and ephemeral runs. The installed CLI supports `exec`, `--output-schema`, `--json`, `--ignore-user-config`, `--ignore-rules`, read-only sandboxing and output-last-message. Read-only login status confirms ChatGPT authentication; no authentication file has been read or copied. Feature inspection confirms shell and multi-agent flags can be disabled. Do not choose a different model silently.

Files/interfaces:

- API provider adapter invokes the explicitly configured/discovered Codex executable with `spawn` and argument arrays, no shell. Use an owned empty run directory, read-only sandbox, ephemeral execution, disabled shell/agents/plugins/web search, ignored user rules/config and no approval prompts. Prompt/schema are bounded, provider output is capped, timeout/cancel terminate owned processes and cleanup preserves projects. Credentials stay with Codex; the app never reads/stores them. No model tools are needed to propose JSON.
- A restricted typed proposal contract supports ordinary camera/country-highlight/route/marker/text content. Normalize into the current project contract and validate with Zod before returning a proposal. Preserve current canvas/provider attribution. Unknown geography, unsupported historical polygons, invalid timing/coordinates and arbitrary executable/remote asset content reject. Empty/invalid/model failure returns an actionable error rather than a fallback proposal pretending to be AI output.
- Prompt panel states that prompt/project summary goes to the installed signed-in Codex account. Generation never edits the project. Show the validated proposal summary, scene/layer counts, source limits and JSON for review; Apply creates one undoable editor transaction. Cancel/discard preserves existing project. Locked content is protected by the same project replacement/history policy as explicit imports/templates.
- Health/status exposes availability without secrets. One model invocation at a time; bounded requests prevent accidental concurrent calls. No chat messages, email or other external actions are sent by the model adapter.

Acceptance:

- [x] Schema/normalization reject invalid, oversized, executable and invented boundary proposals.
- [x] Process arguments, timeout, output bounds, cancel/cleanup and unavailable/login failure are covered by unit/integration tests.
- [x] An actual installed Codex invocation returns validated JSON; retain redacted metadata and proposal evidence, never auth tokens.
- [x] Browser generation/review/discard/apply/undo/persistence work; no changes occur before explicit Apply.
- [x] A real accepted proposal previews and exports through the existing deterministic renderer.
- [x] Final static/unit/integration/build/format and broader browser regression after review. Test fixtures exercise failure boundaries; they never stand in for the live provider acceptance.

Validation so far: `pnpm check` passed 120 unit/integration tests in 40 files. New browser tests passed with `ANIMATEMAP_LIVE_CODEX=1 pnpm test:e2e tests/e2e/codex.spec.ts tests/e2e/foundation.spec.ts`: four scenarios, 1.3 minutes. The initial browser test-loader failed because Node ESM requires explicit JSON import attributes; standard `with { type: 'json' }` imports corrected the API normalizer, then the complete suite passed.

The actual signed-in CLI generated a one-scene/five-layer/two-second Vietnam project in 11.833 seconds, using its installed default model, with zero tool calls. No response was intercepted in that acceptance test. Its real H.264/yuv420p MP4 is 1920×1080/30 FPS and has 60 decoded frames. Mean absolute RGB channel errors against full-size preview at frames 0/30/59 are 1.3243/1.4105/1.4521, below 3/255. Repeated seeks reproduce exact pixels; PNG frame 30 is pixel-identical. Vietnamese title and Natural Earth/place attribution are visible. Adjacent `codex-parity.json` and `codex-ffprobe.json` retain metadata; ignored `.local/reviewed/ai/` retains reviewed JSON, PNG and playable MP4. Account files/tokens and raw CLI diagnostics are not retained in tracked artifacts.

Protocol UI tests use an authored fixture clearly labeled as such. Process tests launch owned Node child processes to verify termination/output boundaries; they do not count as live AI proof. Ordinary CI skips the signed-in test unless explicitly opted in, avoiding unattended account usage. Missing installation/login/network, unsupported requests and invalid output never substitute synthetic content for a model response.

Final validation: `pnpm check` passed all 120 tests/typecheck/lint/build, `pnpm format:check` passed after formatting the new browser test, and `pnpm audit --prod` found no known vulnerabilities. Ten additional browser regressions passed in 1.9 minutes across editor, camera seeking, map selection/anchors, offline geography/protocol route export, templates, portrait orbit MP4 and golden Vietnamese frames. No renderer/evaluator semantics changed. Known build chunk-size warnings remain; hosted CI awaits a remote repository. Next independent module: After Effects interchange artifacts with actual host validation explicitly pending.
