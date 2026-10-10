# Architecture

React editor → versioned project → pure animation evaluator → MapLibre adapter and DOM overlays. The render worker uses the same renderer in Chromium at fixed timestamps, then FFmpeg. Fastify serves local persistence and jobs on loopback. No external tile service is enabled by default.

Workspace packages expose TypeScript sources consumed by Vite/tsx. Root TypeScript checks all packages together. Schema boundaries reject invalid data before persistence or render. UI state (selection, playback, history) is separate from project JSON.
