# Du lịch núi Việt Nam — 26/10/2026

Bản hoàn chỉnh nằm tại `.local/vietnam-mountain-escapes/Bay-Ngon-Nui-Du-Lich-Viet-Nam.mp4`, source ZIP cùng thư mục. Video dọc 1080×1920, 30 fps, 2945 frame (98,167 giây), bảy điểm: Fansipan, Tà Xùa, Yên Tử, Bạch Mã, Lang Biang, Bà Đen và núi Sam. Đây là tuyển chọn biên tập, không phải ranking.

## Nội dung và công cụ

Nguồn du lịch chính thức được lưu trong SOURCES.md và sources/facts.json; ảnh Wikimedia có tác giả/giấy phép/checksum riêng. Phân biệt Tà Xùa săn mây Sơn La với đỉnh trekking; điểm Radar Lang Biang với các đỉnh khác. Bản đồ NASA tháng 08/2004 và locator là tham chiếu, không phải tuyến du lịch đo đạc. Hình tư liệu kết hợp camera địa lý, ảnh mở rộng và hoạt cảnh có nhãn minh họa.

Vox Director thực tạo 24 shot hợp lệ, điều khiển cue/camera/photo aperture. HyperFrames 0.8.168 và GSAP tạo 540 frame alpha cho cáp treo, mây trên sống núi và người đi bậc thang. Remotion 4.0.536 dựng composition hoàn chỉnh và xuất PNG/H.264 CRF16. Project AnimateMap JSON chỉ giữ kế hoạch/camera/caption, không thay thế source Remotion.

Giọng HN – Anh Khôi (Vbee), tốc độ 1.0; một task text-only được cache. ASR faster-whisper chạy local, không upload audio. Các sửa chính tả/tên giữ interval gốc, không tạo timing giả; 63 trang karaoke và SRT riêng. Lần tiếp tục không gọi lại TTS, ASR hay render.

## Bằng chứng kiểm tra

TypeScript, content-checks, HyperFrames lint/runtime/layout, 142 frame preflight và 11 frame Studio parity đạt. Full render audit đủ 2945 frame, thời gian render 498,864781 giây; đây là thời gian stage, không phải tổng benchmark sản xuất. `verification.json` lưu so sánh 142 frame MP4 giải mã, CFR/endpoint/codec/âm thanh. `mux-check.json` so hash, PTS/DTS và decoder configuration của toàn bộ packet video. `package-check.json` kiểm CRC/SHA từng entry và không có API key trong source ZIP.

Lệnh cuối: `node .local/vietnam-mountain-escapes/verify.mjs`; `node .local/vietnam-mountain-escapes/mux-check.mjs`; Python `finalize.py`, sau khi xem contact sheet chạy `package.py`. Các báo cáo là snapshot của bản giao, cần tái tạo khi sửa source. Contact sheet không thay thế xem/nghe realtime toàn bộ; preview được quan sát phát từ frame150 đến1858.

## Bài học

WebMCP seek có thể làm thoát fullscreen: crop dùng bounds cũ sẽ lấy cả timeline, khiến parity báo sai. Mở fullscreen lại sau seek, đo bounds canvas thật rồi mới capture; giữ nguyên tolerance. CUA trả JPEG nên phép so Studio dùng profile ảnh nén, không tuyên bố pixel-identical lossless.

Giữ MP4/source cuối, voice/timing/cache trả phí/nguồn/giấy phép và runtime junction. Dọn bản nháp và ảnh QA tái tạo được theo manifest có kiểm đường dẫn; biên nhận và hash sau dọn nằm trong thư mục bản giao.


Bản mới nhất: [V2 bổ sung đảo và quần đảo](VIETNAM_MOUNTAIN_TOURISM_V2.md), source/MP4 tại `.local/vietnam-mountain-escapes-v2`. V1 còn được giữ nguyên; bước dọn MP4/ZIP và dữ liệu QA bị automatic approval review từ chối. V2 là bản giao mới nhất.
