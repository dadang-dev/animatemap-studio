# Decisions

- English UI, Vietnamese Unicode text supported.
- Local Natural Earth geography; no OSM Foundation tile requests. Light, dark, muted styles use identical geometry.
- Schema v1 is the initial version; unknown versions are rejected rather than guessed.
- Node 24, pnpm 11. Source package exports avoid unnecessary build ordering for development.
- Phase 0 shell intentionally has disabled export until real rendering is validated.
