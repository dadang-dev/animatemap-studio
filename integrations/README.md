# Local visual director and HyperFrames

This optional workflow keeps the native AnimateMap renderer and adds an editorial HTML composition around a verified native video. The current integration is CLI/API based; there is no new editor button.

## Local forks and dependencies

| Source                                                    | Pinned commit                              | License    | Local checkout                           |
| --------------------------------------------------------- | ------------------------------------------ | ---------- | ---------------------------------------- |
| [Vox Director](https://github.com/Alisa0808/vox-director) | `6a85a7c341610442a6a5b1885e6e0217ab82a11f` | MIT        | `.local/integrations/repos/vox-director` |
| [HyperFrames](https://github.com/heygen-com/hyperframes)  | `5e7ba0be944b076d514fc082c25a0b7e35eeb42f` | Apache-2.0 | `.local/integrations/repos/hyperframes`  |

Both checkouts retain their original license and `upstream` remote, with local branch `codex/animatemap-local`. These are local forks, not GitHub forks. Sparse checkout excludes large showcase media and HyperFrames test fixtures with long Windows paths. Existing modified adapters are protected from overwrite.

The separate runtime uses published `hyperframes@0.8.168` and `gsap@3.14.2`, pinned by `runtime/package-lock.json`. It does not install or build the upstream Bun workspace. Main application dependencies remain on pnpm. GSAP uses its [Standard No Charge license](https://gsap.com/standard-license/), **not MIT**; preserve the distributed header and review that license before expanding this into a general visual animation builder. Current use authors code-owned video compositions.

## Setup and planning

Prerequisites: the main workspace's Node/pnpm dependencies, FFmpeg/ffprobe, Playwright Chromium including headless shell, Git/network access for setup, and a signed-in Codex CLI for planning.

```powershell
pnpm director:setup
pnpm director plan --project <project.animatemap.json> --output <plan.json> --prompt "Keep narration; focus on visible actors."
```

Setup can be repeated. On Windows it uses the matching Playwright headless-shell binary, since GUI Chromium can hang on HyperFrames' `--version` preflight. `HYPERFRAMES_BROWSER_PATH` may explicitly select another working binary. If npm is not adjacent to Node, set `ANIMATEMAP_NPM_CLI` to its `npm-cli.js` file.

The Vox local entrypoint is `node .local/integrations/repos/vox-director/animatemap-director.mjs plan|compose ...`. Its legacy Atlas workflow is retained, but not invoked by local mode.

`POST /api/director/plan` accepts the same validated project/prompt/generationId request as `/api/ai/propose`. It shares the existing bounded, read-only, tool-disabled Codex CLI runner and cancellation route. Authentication remains with Codex; no private auth file is read or repurposed as an API token. The signed-in CLI's configured model is used. Project captions and layer/asset metadata are sent as planning context; embedded media is excluded. Codex returns structured visual plans, **not Atlas image/video/TTS jobs**.

## Compose, inspect, render

Review the JSON plan before applying a creative cut. A plan must cover every existing scene, preserve order/duration, reference existing assets, and contain only supported presentation values. It cannot rewrite narration or supply executable HTML/URLs.

```powershell
pnpm director compose --project <project.animatemap.json> --plan <plan.json> --video <verified.mp4> --verification <delivery.json> --output <new-directory>
pnpm hyperframes check <new-directory> --json
pnpm hyperframes snapshot <new-directory> --at 0,1,2.4 --no-end --describe false
pnpm hyperframes render <new-directory> -o <new-directory>/video.mp4 --fps 30 --workers 1 --quality delivery --video-frame-format png --strict-all --no-best-effort
```

Optional `--from`/`--duration` creates a bounded excerpt. Compose checks source project/video SHA-256 against the native delivery manifest and refuses an existing output directory. It writes local HTML, media, plan, baseline hashes and a credits/provenance companion. Keep required source license texts with distribution. This does not replace the geospatial evaluator: the baseline was already rendered by the shared native pipeline. The HTML renderer adds paper-framed detail windows on non-hold shots; richer distinct treatment presets and automatic actor-centred crops are future work. Framing/asset choices remain reviewable plan metadata, not a claim of generated footage.

Keep source audio and baked karaoke intact. Every detail video is muted; only the baseline contributes audio. Media trim uses project time; one paused GSAP timeline controls template-owned animation. Assets are local at render time. Run one heavy render at a time.

## Verified example

See [phase evidence](../docs/phases/phase-6/LOCAL_DIRECTOR.md). `.local/integrations/hyperframes-demo/demo.mp4` is a separate six-second UAV example, not a replacement of the delivered 87-second video. Real Codex inference, browser checks, MP4 encoding, decoded-frame comparison and audio comparison passed. The HyperFrames usage endpoint returned unknown; no quota is inferred from that result. No Atlas call, TTS regeneration or ASR upload was made.
