# Neutral video smoke fixture

Three PNG references from the authored 6-second starter (no production video, real voice, paid output or third-party photo). Frame0 checks overview/islands, frame61 image A, frame121 image B. Node24.19.0, Remotion4.0.536, ANGLE, Noto pinned assets, 1080×1920/30fps. Synthetic audio has known test timing, not speech alignment.

Run `pnpm video:smoke` after setup. Golden comparisons use the existing production image profile meanRGB<3/255 and fewer than2% pixels with channel error>30. The full decoded MP4/audio/audit checks are additional gates. Never regenerate these references to hide a failing scene; record a reviewed visual change separately. Runtime/GPU/OS differences must be investigated rather than claimed identical.
