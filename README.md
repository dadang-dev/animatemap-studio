# AnimateMap Studio

Local-first animated map editor. Implementation follows `PLAN_CODEX_ANIMATEMAP_STUDIO.md`; phase evidence lives in `docs/phases`.

Prerequisites: Node 24+, pnpm 11; FFmpeg/ffprobe on PATH for video export.

```sh
pnpm install
pnpm exec playwright install chromium
pnpm dev
```

Open http://127.0.0.1:5173. API binds http://127.0.0.1:3001. Run `pnpm check`, `pnpm format:check`, and `pnpm test:e2e` to validate. Export is intentionally unavailable in the foundation phase.
