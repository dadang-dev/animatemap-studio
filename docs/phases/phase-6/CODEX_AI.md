# Phase 7C — Reviewed Codex project proposals

Status: implementation preparation. The user selected the installed Codex account rather than a separate API provider and explicitly declined other accounts/keys. Offline geography and adapter contract checks pass; its live-routing gate stays visibly open. Develop this independent JSON proposal workflow while that external check is unavailable, then validate its own actual Codex/browser/export gate before enabling it.

Provider research: [Codex non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode) documents structured output, stdin prompts and ephemeral runs. The installed CLI supports `exec`, `--output-schema`, `--json`, `--ignore-user-config`, `--ignore-rules`, read-only sandboxing and output-last-message. Read-only login status confirms ChatGPT authentication; no authentication file has been read or copied. Feature inspection confirms shell and multi-agent flags can be disabled. Do not choose a different model silently.

Files/interfaces:

- API provider adapter invokes the explicitly configured/discovered Codex executable with `spawn` and argument arrays, no shell. Use an owned empty run directory, read-only sandbox, ephemeral execution, disabled shell/agents/plugins/web search, ignored user rules/config and no approval prompts. Prompt/schema are bounded, provider output is capped, timeout/cancel terminate owned processes and cleanup preserves projects. Credentials stay with Codex; the app never reads/stores them. No model tools are needed to propose JSON.
- A restricted typed proposal contract supports ordinary camera/country-highlight/route/marker/text content. Normalize into the current project contract and validate with Zod before returning a proposal. Preserve current canvas/provider attribution. Unknown geography, unsupported historical polygons, invalid timing/coordinates and arbitrary executable/remote asset content reject. Empty/invalid/model failure returns an actionable error rather than a fallback proposal pretending to be AI output.
- Prompt panel states that prompt/project summary goes to the installed signed-in Codex account. Generation never edits the project. Show the validated proposal summary, scene/layer counts, source limits and JSON for review; Apply creates one undoable editor transaction. Cancel/discard preserves existing project. Locked content is protected by the same project replacement/history policy as explicit imports/templates.
- Health/status exposes availability without secrets. One model invocation at a time; bounded requests prevent accidental concurrent calls. No chat messages, email or other external actions are sent by the model adapter.

Acceptance:

- [ ] Schema/normalization reject invalid, oversized, executable and invented boundary proposals.
- [ ] Process arguments, timeout, output bounds, cancel/cleanup and unavailable/login failure are covered by unit/integration tests.
- [ ] An actual installed Codex invocation returns validated JSON; retain redacted metadata and proposal evidence, never auth tokens.
- [ ] Browser generation/review/discard/apply/undo/persistence work; no changes occur before explicit Apply.
- [ ] A real accepted proposal previews and exports through the existing deterministic renderer.
- [ ] Static/unit/integration/build/format and relevant browser checks pass. Test fixtures exercise failure boundaries; they never stand in for the live provider acceptance.
