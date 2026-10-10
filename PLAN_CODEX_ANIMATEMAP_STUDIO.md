# ANIMATEMAP STUDIO — PLAN TRIỂN KHAI CHO CODEX

**Phiên bản kế hoạch:** 1.0 · **Ngày:** 2026-10-10  
**Hình thức sản phẩm:** web app chuyên dụng, self-host/local-first khi bắt đầu, có thể phát triển SaaS sau này.  
**Mục tiêu:** dựng và xuất video bản đồ động chuyên nghiệp bằng editor trực quan, không phụ thuộc Adobe After Effects.

---

## 1. Product vision & phạm vi

### 1.1 Định vị
Kết hợp: (a) năng lực chọn đối tượng địa lý, dựng bản đồ và điều khiển camera của GEOlayers 3; (b) hiệu ứng camera, highlight và export của AnimateMyMap; (c) quản lý scenes, timeline, template và dữ liệu của Map Animation Studio; (d) thiết kế UX nhanh, các hiệu ứng bắt mắt của MapCut.

Định hướng riêng: **editor có tính chính xác địa lý, dễ dùng cho cả người làm video và người không biết GIS**, đồng thời có **timeline quyết định mọi chuyển động** để preview và video xuất ra khớp nhau.

### 1.2 Nhóm người dùng
- Người làm video lịch sử, địa lý, giáo dục; nội dung YouTube, Shorts, TikTok.
- Người làm travel animation, hành trình xe/tàu/máy bay, documentary và infographic.
- Người làm bất động sản/marketing muốn trình bày khu vực, các điểm lân cận và tuyến đường.

### 1.3 Ba user journeys phải hoàn thiện
**A. Travel route:** Tạo project 16:9 → chọn Việt Nam → pin Hà Nội, Đà Nẵng, TP.HCM → tạo route → animate path → camera follow → title → preview → export MP4.

**B. Country highlight:** Mở bản đồ Đông Nam Á → chọn Việt Nam và Thái Lan → tạo lần lượt highlight, dim background và zoom → đặt title → export.

**C. Short-form:** Dùng template 9:16 → camera zoom từ toàn cầu đến một vị trí → marker pop + label → export 1080×1920.

### 1.4 Ranh giới MVP
MVP có **bản đồ 2D + camera pitch/bearing dạng 2.5D**, route reveal, country highlight, markers, text, timeline với keyframes và xuất MP4/PNG. Không bắt đầu bằng 3D terrain/extrusion, AI, bản đồ biên giới lịch sử, chiến tranh, morph lãnh thổ, motion graphics phức tạp, hay mô hình 3D. Các tính năng đó được đặt vào các phiên bản sau.

**Không sao chép** UI, assets, dữ liệu, bản đồ, thương hiệu hoặc mã độc quyền từ các sản phẩm tham khảo.

---

## 2. Bảng đối chiếu tham khảo → năng lực cần phát triển

| Nguồn tham khảo | Ý tưởng cần học | Đưa vào |
|---|---|---|
| GEOlayers 3 / After Effects | Geospatial features, bản đồ style/layer, camera keyframes, map-anchored assets | MVP: country polygons, style, camera; P1: GIS import/data driven |
| AnimateMyMap | Highlight/dim, fly-to/orbit, title, route animations, clip presets | MVP: highlight, fly-to, title, route; P1: orbit/sweep presets |
| Map Animation Studio | Scene editor + timeline + Inspector, templates, CSV/Excel, audio | MVP: scene editor; P1: templates/CSV; P2: sound/AI |
| MapCut | Timeline trực quan, glow/neon, cờ/texture, MP4/PNG, camera cinematic | MVP: export, highlight style; P1: glow/flags; P2: AE interchange |

**Ghi chú:** Đây là phân tích dựa trên mô tả công khai của nhà cung cấp, không phải kết quả kiểm thử đầy đủ các editor sau đăng nhập.

---

## 3. Chức năng sản phẩm theo mức ưu tiên

### P0 — MVP bắt buộc
1. **Project manager:** New/Open/Save/Save As/Duplicate/Delete; hỗ trợ JSON import/export; autosave cục bộ; schema versioning.
2. **Canvas:** 16:9 / 9:16 / 1:1; HD 1920×1080 và 1080×1920; thời lượng, FPS 24/30; preview ở tỉ lệ chính xác.
3. **Map:** MapLibre-based viewer; pan/zoom/rotate/pitch; ít nhất 3 style hợp pháp (light/dark/satellite chỉ khi có nhà cung cấp và giấy phép phù hợp; mặc định có hai light/dark vector styles); chọn vùng/quốc gia từ GeoJSON; click chọn, focus và fly-to; tọa độ WGS84.
4. **Camera animation:** keyframe position `[lon,lat]`, zoom, bearing, pitch; easing linear/ease-in-out; play/pause/scrub; tạo keyframe trực tiếp từ camera hiện tại.
5. **Layers:** CountryHighlight, Route, Marker, Text; đổi tên, reorder, hide/show, lock, select; property inspector; opacity & animation in/out.
6. **Route editor:** từ 2+ tọa độ; thêm điểm bằng click; chỉnh stroke, width, dash, arrow head; animated trim/reveal; không tự nhận là tuyến đường giao thông thực nếu chỉ nối thẳng.
7. **Country highlight:** fill, stroke, opacity, optional dim outside; chọn theo mã ISO từ dataset; hỗ trợ nhiều polygon/đảo.
8. **Timeline:** tracks theo layer; playhead, zoom timeline, snap, move/copy/delete keyframes, easing preset, scene trim; undo/redo.
9. **Text & markers:** text Unicode tiếng Việt, typography cơ bản, icon marker; anchor `map` (lon/lat) hoặc `screen` (x/y). Text luôn đủ sắc nét trên video.
10. **Export:** PNG của frame đang chọn; video MP4 (H.264 + yuv420p), 1080p/30fps trong bước đầu; progress, cancel, lỗi rõ ràng; attribution/watermark theo bản quyền provider; output đúng aspect ratio.
11. **Quality:** loading/error/empty states; phím tắt; test tự động; demo project mở được và render được.

### P1 — Bản chuyên nghiệp
- Timeline đa scene, transitions crossfade/cut, library templates, preset camera orbit/sweep/bounce, animation styles.
- Tạo shape line/arrow, bezier editor, label collision handling, logo/image overlay, flags & textures với giấy phép hợp lệ.
- Admin level 1 boundaries (nếu có license phù hợp), choropleth theo CSV/Excel (country-year-value), data keyframe.
- Search geocoding qua provider có quota/điều khoản phù hợp; route theo đường bộ từ routing API hợp pháp.
- 4K/60fps, export GIF/WebM, audio tracks, voiceover, captions.

### P2 — Nâng cao
- 3D terrain/buildings/models với pipeline riêng, camera follow object, multi-pass graphics.
- Historical borders theo dataset theo mốc thời gian, timeline year slider, border morph có kiểm tra topology.
- AI prompt → sinh **đề xuất JSON project**; người dùng review trước khi áp dụng; tuyệt đối không tự bịa polygon biên giới lịch sử.
- Tích hợp/exports phục vụ After Effects (JSON camera/anchors hoặc JSX/ExtendScript nếu khảo sát thấy khả thi); collaborative cloud, SaaS billing.

---

## 4. UX/UI spec (desktop-first)

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│ AnimateMap  Project ▼  Undo Redo  16:9  30 FPS     Preview     Export [MP4 ▼] │
├──────────────────┬─────────────────────────────────────┬────────────────────────┤
│ LEFT PANEL       │ EDITOR / MAP CANVAS                 │ RIGHT INSPECTOR        │
│  [Search place]  │                                     │ Selected: Route 01     │
│  Scenes          │     [MapLibre map + overlays]       │ Position / Appearance  │
│  Layers          │                                     │ Animation / Easing     │
│   ◉ Highlight    │                                     │ Map anchor / Screen    │
│   ◉ Route        │                                     │                        │
│   ◉ Title        │                                     │                        │
│   ◉ Markers      │                                     │                        │
├──────────────────┴─────────────────────────────────────┴────────────────────────┤
│ PLAY ◀▶  00:03.500 / 00:15.000     Zoom Timeline  Snap                          │
│ CAMERA     ◆─────────◆───────────◆                                            │
│ HIGHLIGHT      ▓▓▓▓▓▓▓▓▓▓▓                                                      │
│ ROUTE              ◆━━━━━━◆                                                    │
│ TEXT                    █████████                                              │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Nguyên tắc:** một Inspector chung; cùng một thay đổi gây thay đổi ngay preview; select trên canvas đồng bộ với layer list; mọi thứ có tooltip và default hợp lý; thanh Export có thông số output rõ ràng; panel tùy chỉnh độ rộng, timeline resize được.

**Phím tắt đề xuất:** Space Play/Pause; Ctrl/Cmd+Z Undo; Ctrl/Cmd+Shift+Z Redo; Delete delete selected; K tạo camera keyframe; `+/-` zoom timeline; Ctrl/Cmd+S save. Tránh chiếm phím tắt của input text.

---

## 5. Kiến trúc kỹ thuật được chọn

### 5.1 Stack
- **Monorepo:** pnpm workspaces, TypeScript strict.
- **Frontend:** React + Vite, Tailwind CSS, shadcn/ui, Zustand (state), dnd-kit (reorder), React Hook Form + Zod (forms).
- **Map engine:** MapLibre GL JS, Turf.js cho hình học/tuyến/geodesic, GeoJSON. Dùng MapLibre source/layer cho polygons/paths và map project/unproject cho overlay.
- **Animation core:** TypeScript thuần (pure, deterministic), `evaluateProjectAt(timeSeconds)` không phụ thuộc React/DOM.
- **Server:** Node.js + Fastify (projects/render jobs); lưu project local JSON trong giai đoạn đầu; abstraction để chuyển SQLite/PostgreSQL về sau.
- **Video render worker:** Chromium được kiểm soát qua Playwright + FFmpeg; render từng timestamp cố định; không ghi màn hình real-time.
- **Testing:** Vitest unit, Playwright e2e, golden screenshots cho keyframes; kiểm tra file mp4 bằng ffprobe.

**Lý do tách core:** Preview, scrubbing và render worker dùng cùng evaluator/timeline/geometry. Không dựa vào thời gian hệ thống hay CSS transitions để xuất video.

### 5.2 Cấu trúc repository

```text
animatemap-studio/
  apps/
    web/                 # React editor, project dashboard, preview
    api/                 # JSON save/load, export jobs, provider config
    render-worker/       # Playwright frame capture + FFmpeg
  packages/
    project-schema/      # Zod, types, migrations, fixtures
    animation-core/      # interpolate camera/layer/keyframes
    map-engine/          # MapLibre adapters, sources, highlight, routes
    ui/                  # shared editor controls
  data/
    countries/           # pinned and attributed source boundaries
  examples/
    travel-vietnam.json
    southeast-asia-highlight.json
  docs/
    PRD.md
    ARCHITECTURE.md
    MAP_DATA_LICENSES.md
    RENDER_PIPELINE.md
    AGENTS.md
  .github/workflows/ci.yml
  README.md
```

### 5.3 Luồng dữ liệu

```text
User gesture ─→ editor store ─→ versioned project JSON
                        │
                        ├→ animation core.evaluate(t)
                        │            │
                        │            └→ render state (camera, layer styles, geometry progress)
                        │                            │
                        │                            └→ Map engine + overlays (preview)
                        │
                        └→ Render job ─→ Chromium + same evaluate(t)
                                              ├→ frame snapshots + tile readiness
                                              └→ FFmpeg (MP4) / PNG
```

### 5.4 Project JSON sơ lược

```json
{
  "schemaVersion": 1,
  "id": "demo-travel-vn",
  "name": "Vietnam Travel Demo",
  "canvas": { "width": 1920, "height": 1080, "fps": 30 },
  "durationSeconds": 12,
  "map": { "providerId": "configured-vector-provider", "styleId": "dark", "attribution": ["© OpenStreetMap contributors"] },
  "scenes": [{
    "id": "scene-1", "startSeconds": 0, "durationSeconds": 12,
    "camera": { "keyframes": [
      { "time": 0, "value": { "lng": 106.7, "lat": 16.0, "zoom": 4.2, "bearing": 0, "pitch": 0 }, "easing": "easeInOut" },
      { "time": 5, "value": { "lng": 105.85, "lat": 21.03, "zoom": 8, "bearing": 10, "pitch": 30 }, "easing": "easeInOut" }
    ] },
    "layers": [
      { "id": "r1", "type": "route", "name": "Travel Route", "visible": true,
        "coordinates": [[105.85,21.03],[108.2,16.06],[106.7,10.82]],
        "style": { "color": "#FFCE54", "width": 5 },
        "tracks": { "reveal": [{ "time": 3, "value": 0 }, { "time": 10, "value": 1 }] }
      }
    ]
  }]
}
```

**Schema thực tế:** xây bằng Zod discriminated unions cho layer types; thêm `timeRange`, `opacity`, `anchor`, `transform`, `easing`, metadata nguồn dữ liệu và migration. JSON trên chỉ minh họa ý tưởng, chưa phải hợp đồng API đầy đủ.

### 5.5 Animation core — quy tắc bắt buộc
- Camera và mỗi layer được biểu diễn bằng keyframe properties, không lưu animation như video/recorded movement.
- `evaluate(project, time)` là hàm thuần, có kết quả lặp lại cho cùng input.
- Timeline: time tính theo giây (floating) để lưu, frame index cho export; kiểm soát chuyển đổi fps để tránh drift.
- Các keyframes tính theo local scene time; `sceneStart` xác định global time.
- Interpolate longitude bằng đường ngắn qua kinh tuyến 180° khi phù hợp, normalize bearing, clamp zoom/pitch, chống nhảy camera.
- Route trim tính theo tổng chiều dài geodesic, không đơn giản cắt tuyến theo tỉ lệ số đỉnh.
- Bảo vệ multiline/multipolygon/đảo; kiểm tra tọa độ lon/lat; không xử lý âm thầm dữ liệu lỗi.
- Easing registry thống nhất (linear, easeIn, easeOut, easeInOut), không hardcode riêng từng widget.
- Render worker phải chờ `map idle`/ảnh/font sẵn sàng trên **mỗi frame cần tải tài nguyên mới**, có timeout/retry/error, tránh frame bị tile trắng.

### 5.6 Render pipeline
1. User nhấn Export, frontend validate project và tạo render job.
2. Worker khởi tạo viewport với đúng resolution/FPS/style/provider và nạp project snapshot.
3. Với frame `i` trong `0 .. N-1`, đặt `t = i/fps`; gọi `evaluate(t)`; apply camera qua instant jump (không dùng eased async flyTo); update map layers & overlays; chờ render/tiles/fonts/ảnh sẵn sàng.
4. Capture frame vào pipe/frame storage rồi encode bằng FFmpeg; H.264, yuv420p, `+faststart`, chỉ số khung hình cố định; giữ đúng kích thước, không tự kéo giãn.
5. Với audio (P1) mix track theo start/end bằng FFmpeg.
6. Xuất file MP4/PNG cùng report lỗi; xóa temp files hợp lý, hỗ trợ cancel và retry.

**Chú ý hiệu năng:** Playwright screenshot cho mỗi frame có thể tốn tài nguyên; đây là pipeline đầu tiên có thể kiểm thử, không phải cam kết đủ nhanh cho 4K. Bench với 300 frames 1080p; nếu không đạt yêu cầu thì chuyển sang stream raw frames/WebCodecs/GPU render worker. Không dùng MediaRecorder real-time làm pipeline xuất chính.

---

## 6. Lộ trình triển khai dành cho Codex

### Phase 0 — Repository + contracts (P0)
**Tasks:** kiểm tra repo; tạo mono workspace, lint/format/test/CI; `README`, `docs/ARCHITECTURE.md`, `docs/AGENTS.md`; Zod schemas & fixtures; sample API responses; build setup.  
**DoD:** `pnpm install`, `pnpm typecheck`, `pnpm test`, `pnpm dev` chạy được; không commit secrets.

### Phase 1 — Map editor foundation (P0)
**Tasks:** frame UI 3 panel + timeline; MapLibre viewer; style manager; country GeoJSON load/select/highlight; camera panel; map anchors; responsive desktop/min-width/error states.  
**DoD:** click Việt Nam hiện thuộc tính, highlight country màu tùy chọn; pan/zoom/style change; overlay theo tọa độ không trôi khi zoom.

### Phase 2 — Animation engine (P0)
**Tasks:** typed keyframes & evaluator; camera interpolation; route geodesic + trim; time-range & opacity tracks; play/pause/scrub; clock based on project seconds; unit tests.  
**DoD:** scrub nhiều lần về 3.0s luôn tạo cùng trạng thái camera/route; 0%, 50%, 100% route reveal đúng; đường qua 180° không nhảy xuyên bản đồ.

### Phase 3 — Full editing UX (P0)
**Tasks:** layers tree, route click-creation/edit points, marker/text tools, Inspector, keyframe add/move/delete, timeline zoom/snap, undo/redo, scene save/load, import/export JSON, autosave.  
**DoD:** tạo demo từ giao diện không sửa code; refresh vẫn khôi phục project; undo/redo hoạt động với thay đổi layer và keyframe.

### Phase 4 — Export end-to-end (P0)
**Tasks:** render job API/CLI, worker Playwright, resource-ready detection, frame render & FFmpeg, PNG/MP4 export, progress/cancel/report, licensing attribution.  
**DoD:** video 1920×1080, 30 FPS, 12s (360 frames), có chuyển động camera + highlight + route + text, MP4 phát được; sample frames tại 0/3/6/9 giây gần khớp preview; không tile trắng/bị mất label.

### Phase 5 — Polish & release candidate (P0)
**Tasks:** performance profiling, retry/timeout, no-data placeholders, UX polish, keyboard accessibility, e2e & visual regression, docs, security tests, demo projects.  
**DoD:** tất cả test pass, no critical bug, dễ khởi chạy máy mới bằng README; render lỗi không làm mất project.

### Phase 6 — Pro features (P1/P2)
**Tasks:** multi-scene transitions, templates, data import, camera presets, background music, labels, effects, 4K/60, historical borders, AI, 3D, AE integration theo thứ tự giá trị người dùng.  
**DoD:** mỗi module có spec/acceptance riêng và không làm thay đổi cấu trúc project cũ ngoài migration được kiểm thử.

### Các mốc bàn giao
| Mốc | Deliverable | Gate để chuyển bước |
|---|---|---|
| M1 | App skeleton + map preview | Build/launch ổn định |
| M2 | Animation preview | Deterministic seek + tests |
| M3 | Editor usable | Hoàn tất demo trực quan |
| M4 | MP4 Export | Chất lượng video + preview parity |
| M5 | Release candidate | E2E/QA/README/license audit |

**Quy tắc cho Codex:** chia PR/commit theo phase nhỏ; không triển khai P1/P2 trước khi M4 qua cổng nghiệm thu.

---

## 7. Acceptance scenarios & kiểm thử

| ID | Kịch bản | Kỳ vọng |
|---|---|---|
| AC-01 | Tạo 16:9 project, đổi dark/light | Không mất camera/layer/keyframes |
| AC-02 | Highlight Việt Nam, nhiều đảo | Đúng theo polygon nguồn, không mất phần MultiPolygon |
| AC-03 | Zoom & pitch camera tại 0s/5s | Camera nội suy và scrub lặp lại đúng |
| AC-04 | Route 3 stops và reveal 0→100% | Line tăng mượt theo chiều dài đường |
| AC-05 | Chọn layer, đổi màu, Undo/Redo | Preview + timeline + state đồng bộ |
| AC-06 | Lưu/reload JSON | Project, timing, properties giữ nguyên |
| AC-07 | Export 1920×1080 30fps 12s | MP4 H.264 phát được, 360 frames, không frame đen/trắng do loading |
| AC-08 | Video 9:16 | Đúng viewport, layer không bị kéo giãn |
| AC-09 | Tọa độ qua kinh tuyến 180° | Không xuất hiện tuyến dài vòng trái đất sai |
| AC-10 | Provider tile không sẵn / render timeout | Báo lỗi chi tiết và render job có thể hủy/retry |
| AC-11 | Vị trí label/pin theo map anchor | Pan/zoom/pitch không khiến pin lệch vị trí địa lý |
| AC-12 | SVG/text Unicode tiếng Việt | Không lỗi font, không mất dấu sau xuất |

**Kiểm tra chất lượng tự động:** unit test evaluator, input validation/schema migration, e2e editor, snapshots các khung hình xác định, ffprobe duration/fps/resolution/codec, smoke test sample project.

---

## 8. Data provenance, bản quyền và rủi ro

1. **Không sử dụng `tile.openstreetmap.org` để xuất hàng loạt các frame video bằng headless bot.** Chính sách máy chủ OSM cấm bulk download và headless auto pan/zoom để tải tile. Dùng data/style tự host hoặc provider có quyền dùng render video theo hợp đồng.
2. **MapTiler Cloud:** license phụ thuộc gói và mục đích. Điều khoản quy định attribution và giới hạn xuất video/caching/proxy; phải thẩm định license trước khi dùng export thương mại. Không mặc định lấy free API key cho SaaS video.
3. **GeoJSON countries:** chọn nguồn (ví dụ Natural Earth cho thử nghiệm hoặc dataset commercial-compatible được cấp phép), pin version, lưu attribution/licensing; không coi ranh giới tranh chấp là “sự thật tuyệt đối”. Historical borders phải có dataset time-aware và nhãn uncertainty.
4. **Geocoding/routing:** tách provider adapter; phải tuân thủ quota/rate limits; không lạm dụng public Nominatim/OSRM instance; không để lộ server secrets.
5. **Export reliability:** font availability, CORS, tile readiness, mất WebGL context, camera diff preview/export, quá tải RAM; cần retry, telemetry và e2e tests.
6. **Security:** giới hạn upload GeoJSON/images/fonts, validate coordinates/json, chống script trong rich-text/HTML, quản lý job concurrency, chống SSRF từ URL dữ liệu và timeout worker.
7. **Accuracy:** đường nối tọa độ không mặc định là tuyến xe/đường bay thực; dữ liệu lịch sử phải trích dẫn nguồn, ngày hiệu lực, mức độ không chắc chắn khi cần.

**Tài liệu pháp lý/nguồn đọc:**
- https://operations.osmfoundation.org/policies/tiles/
- https://www.maptiler.com/terms/cloud/
- https://www.maptiler.com/terms/
- https://maplibre.org/maplibre-gl-js/docs/
- https://docs.overturemaps.org/guides/divisions/

---

## 9. Definition of Done — MVP hoàn thành khi nào?

MVP được coi là hoàn thành **chỉ khi** người dùng có thể:
1. Mở ứng dụng, tạo project, chọn map style, chọn/quét country/địa danh.
2. Tạo ít nhất 4 loại layer: country highlight, route, marker, text.
3. Tạo camera keyframes, preview và scrub timeline liên tục, không lỗi/trôi anchor.
4. Save/reopen project có dữ liệu đầy đủ.
5. Xuất MP4 1080p/30fps từ dự án demo bằng render pipeline tự động, không ghi real-time; PNG snapshot.
6. Chạy thành công tests/CI, có README cách chạy và license phù hợp cho nguồn bản đồ.

**KPI kỹ thuật mục tiêu ban đầu (chỉ tiêu để đo, không phải cam kết):** thao tác UI thông thường phản hồi <100ms trên máy phát triển; preview hướng tới 30fps với project nhỏ; render 12s 1080p không có tile trắng; 100% sample acceptance tests P0 pass. Thiết lập hardware và benchmark trước khi cam kết SLA.

---

## 10. Hướng dẫn Codex thực thi

1. Trước khi sửa code: đọc kỹ toàn bộ PLAN, kiểm tra file hiện có, phát hiện xung đột và lập task checklist.
2. Mỗi phase bắt đầu bằng một `IMPLEMENTATION_NOTES.md` ngắn mô tả file sẽ tạo/sửa, API và test.
3. Luôn ưu tiên **vertical slice chạy thật**, không dừng ở UI mockup hoặc stubs giả export.
4. Chia nhỏ module; TypeScript strict, Zod at boundaries, có unit tests cho logic hình học/keyframe và Playwright E2E cho UI.
5. Preview/export dùng **cùng một project schema và cùng animation core**.
6. Mỗi phase kết thúc bằng: commands đã chạy, test pass/fail, screenshots hoặc outputs, thay đổi chính, rủi ro còn lại, next task.
7. Chỉ chuyển phase khi DoD đạt; mọi thay đổi scope phải ghi vào `docs/DECISIONS.md`.
8. Nếu repo trống, tự scaffold. Nếu đã có code, giữ nguyên phần chạy tốt; không overwrite tùy tiện.

## 11. Prompt khởi động cho Codex

> You are a senior TypeScript/WebGL/video rendering engineer and technical product architect. Your task is to implement **AnimateMap Studio** following `PLAN_CODEX_ANIMATEMAP_STUDIO.md`. Build a production-oriented map-animation editor in a monorepo using React, MapLibre GL JS, TypeScript, a deterministic timeline engine, Playwright and FFmpeg. Follow Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5. Do not implement later phases early. Inspect the repository before making changes; write a concise plan of exact files and tests for the current phase. Implement real working functionality rather than mocked outputs. Maintain strict typing, testable pure functions, visual/UI quality, licensed map providers, schema migrations and accessible error states. The preview and export must evaluate the **same timestamp-based animation model**. After each phase run checks and show evidence of completion. Begin with Phase 0 immediately, then Phase 1 once its acceptance criteria pass. If network or credentials are unavailable, build an explicit adapter with an honest, visible failure state instead of pretending the provider works.

---

## 12. References & phạm vi khảo sát
- GEOlayers 3: https://aescripts.com/geolayers/ and https://github.com/GEOlayers/Help
- AnimateMyMap: https://animatemymap.com/
- Map Animation Studio: https://mapanimationstudio.com/
- MapCut: https://mapcut.com.br/

Đã đối chiếu tính năng công khai trên website tính đến 2026-10-10. Chưa kiểm thử các chức năng sau đăng nhập/thu phí và không mặc định rằng các claim marketing là đảm bảo kỹ thuật.
