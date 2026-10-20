# Vietnam exports V3 — retain the map background

User accepted V2 data graphics but explicitly requested keeping the map as the
background. Preserve V1/V2; author V3 in `.local/vietnam-exports-v3`, composition
`Vietnam-Exports-V3`, loopback Studio3014.

Only change background presentation: restore the original satellite plate at
full opacity, use a localized gradient behind headings, a translucent chart
panel and the original Vietnam outline. Keep geographic context visible around
and through the charts. The source card also retains map imagery with a darker
readability layer. This geography is a contextual background; chart annotations
are deliberately foreground graphics, not labels of individual geographic areas.

All V2 product values, ratios, chart scales, colors, numeric cues, narration,
voice/speed/master, captions/SRT/word timing, duration and actual Vox/HyperFrames
outputs are retained. `audio-timing-lock.json` records32 file hashes against V2,
including edit-data, analytics and shot plan, not only audio. Do not call TTS,
ASR or regenerate director/HF assets for this background-only change.

Sources/licensing and the 2025 snapshot remain as documented in
[V1](VIETNAM_EXPORTS_VIDEO.md) and [V2](VIETNAM_EXPORTS_V2.md). Original Natural
Earth polygon rings/holes/islands, NASA January2004 imagery, flags and fonts
are reused. Native JSON is camera/basemap/caption source; full charts are in
the bundled Remotion/HyperFrames source.

ESLint/TypeScript and the13 artifact tests passed, including32 locked hashes,
ratio arithmetic and actual numeric boundaries. API exact JSON round trip and
refresh restoration use a separate V3 project ID. Studio3014 listens only at
127.0.0.1. Check every scene, all68 karaoke pages and share reveals on the new
background; inspect readability in actual Chromium rather than assuming opacity
changes cannot affect visual quality.

Final preflight, parity, encoded-media and archive results are recorded below
after their gates pass. Frame count remains2,978 at1080×1920/30fps,
99.2666666667seconds. No app/schema changes or dependency changes.

## Final evidence

Preflight246samples passed, three repeat seeks had zero raster differences. Studio18samples passed; maximum meanRGBA0.00022135416666666666/255, max per-channel1; do not call all samples pixel-identical. Runtime2978audits covered all2,978frames without timing/layout/browser failures.

Decoded246samples passed unchanged thresholds: max meanRGB1.605901813271605/255; max fractionAbove300.00433738425925926. Audio correlation0.9998407694599919, SNR34.909951080312936dB, RMS ratio0.9977390264401117, clipped0; expected/decoded9529600float samples. -15.5LUFS/-1.6dBFStruepeak. Native and decoded reviews cover12scenes/all68pages; all32locked hashes remain unchanged.

MP4 H.264/yuv420p/faststart,1080×1920/30fps,2,978frames,99.2666666667s; AACstereo48kHz. Every video PTS and container/video/audio endpoint matches project time. Final mux preserves video packets/DTS/PTS/config.

Viet-Nam-Ban-Gi-Cho-The-Gioi-V3.mp4: 12889816bytes; SHA-256 3786a7d94f9654354e71add3eecffaf1c5afac03aae224ee75a8f5e086c0b8e4.

Viet-Nam-Ban-Gi-Cho-The-Gioi-V3-editable-source.zip: 28015097bytes, 500entries; SHA-256 8922f5489b08c88009077db78f5f09eceb91692f47b670f848e33b099b3d7ba5. SourceZIP includes complete editable composite, media/fonts, original voice/timing, analytics, reused real Vox/HF source/assets, provenance/licenses and revision notes. Entry/content scans find zero credentials; no node_modules/.git/.env/raw base64 responses/QA frame folders. V1/V2 preserved. Full machine reports stay in the artifact directory.
