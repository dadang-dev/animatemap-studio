# Decisions

- English UI, Vietnamese Unicode text supported.
- Local Natural Earth geography; no OSM Foundation tile requests. Light, dark, muted styles use identical geometry.
- Schema v1 is the initial version; unknown versions are rejected rather than guessed.
- Node 24, pnpm 11. Source package exports avoid unnecessary build ordering for development.
- Phase 0 shell intentionally has disabled export until real rendering is validated.
- Shared accessible native controls and CSS currently replace Tailwind/shadcn and React Hook Form; all edits validate through Zod. Reorder uses keyboard-accessible up/down buttons rather than dnd-kit. These choices reduce UI dependencies while preserving behavior; draggable enhancements can be added without changing project contracts.
- Map vector geometry renders beneath DOM text/markers. Layer ordering is honored within each rendering plane; arbitrary interleaving needs a separate compositing implementation.
- Render workers use the production build on port 5174; editor development uses port 5173. A failed acceptance render exposed hot reload interrupting an active export. Production rendering removes that dependency.
