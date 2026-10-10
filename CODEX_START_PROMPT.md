# Codex — Start Prompt for AnimateMap Studio

Bạn là Staff Software Engineer có kinh nghiệm sâu về TypeScript, React, MapLibre GL JS, geospatial geometry, motion graphics, headless Chromium, Playwright và FFmpeg.

## Nhiệm vụ
Xây dựng **AnimateMap Studio**, web app thiết kế và xuất video bản đồ động. Đọc toàn bộ file `PLAN_CODEX_ANIMATEMAP_STUDIO.md` trước. File đó là PRD, kiến trúc, roadmap, acceptance criteria và nguồn tham khảo chính.

## Nguyên tắc bắt buộc
1. Kiểm tra cấu trúc repo trước khi viết; nếu chưa có project thì tạo monorepo pnpm + TypeScript strict; nếu có rồi, giữ lại phần tốt và nâng cấp an toàn.
2. Làm lần lượt Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5. Mỗi phase bắt buộc có tính năng chạy thật, tests, và checklist DoD.
3. Tách editor UI, MapLibre adapter, project schemas (Zod), animation evaluator deterministic, và render worker. **Preview/export cùng dữ liệu và evaluator**.
4. MVP: camera keyframes, country highlight, editable route reveal, markers, titles, timeline, save/reopen JSON, export PNG/MP4 1080p/30fps.
5. Bắt buộc render MP4 bằng frame-accurate timeline (Playwright/Chromium + FFmpeg), không dùng quay màn hình real-time và không giả lập file export.
6. Không dùng OSM Foundation tile server để headless bulk render. Cho phép thiết lập map data provider có quyền xuất video; luôn hiển thị attribution theo license.
7. Không sao chép code/assets/branding của GEOlayers, AnimateMyMap, Map Animation Studio, MapCut.
8. Trước mỗi phase: báo danh sách file sẽ sửa, rủi ro, tests. Sau phase: chạy typecheck/lint/tests, nêu outputs, limitations, và cập nhật docs.
9. Thêm hai sample projects: Vietnam travel route và Southeast Asia highlights. Có Playwright E2E smoke tests và ffprobe verification cho MP4.
10. Khi thiếu license/API keys thì build adapter + instructions + honest missing-config state; không hardcode secret và không tuyên bố xuất video chạy tốt nếu chưa test.

## Bắt đầu
- Phân tích repository và đọc `PLAN_CODEX_ANIMATEMAP_STUDIO.md`.
- Viết `docs/IMPLEMENTATION_CHECKLIST.md` đánh dấu các tasks P0.
- Triển khai Phase 0 đầy đủ, chạy checks, tóm tắt trạng thái.
- Tiếp tục Phase 1 khi Phase 0 pass. Nếu còn thời gian/khả năng trong run hiện tại, tiếp tục làm phase kế tiếp; không nhảy bỏ acceptance criteria.
