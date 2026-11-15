# Áp dụng Skill_rules.MD cho GDP và bảy dòng sông

Hoàn thiện tiếp ngày27/10/2026 theo yêu cầu sửa bản đồ, giữ nội dung đã duyệt. Hai thư mục riêng: `.local/vietnam-thailand-gdp-v2` và `.local/vietnam-river-escapes-v2`. Không gọi lại TTS/ASR/Vox/HyperFrames; script, PCM master, word timing, SRT, caption và dữ liệu GDP được khóa SHA256 trong locked-inputs.json và revision-checks.json.

## Hình sửa

- Sông: tổng quan mở đủ về phía đông, Hoàng Sa/Trường Sa có nhãn đầy đủ; locator trong cảnh cận có cả hai quần đảo. Nhãn Hương được dời để không đè Hoàng Sa. Cảnh kết mở toàn quốc ngay từ đầu, tránh để quần đảo ngoài viewport trong lúc camera đến nơi.
- GDP: bổ sung geometry/nhãn bằng cùng affine Mercator của các anchor bản đồ có sẵn, giữ camera và thang đo GDP. Cảnh Bắc Âu có locator Việt Nam đủ biển đảo. Locator được chuyển xuống vùng trống bên trái, tránh che máy bay và leader line/country shape. Không thay số liệu hoặc script.
- Giữ path/ring/lỗ/tọa độ Việt Nam gốc và77 feature bổ sung đã dùng ở bản núi V2:18 Hoàng Sa,22 Trường Sa,37 feature khác. Đây là nguồn1:10m khái quát, không phải kiểm kê mọi đá/bãi/rạn. Ký hiệu tối thiểu1,6px tăng khả năng nhìn thấy, không biểu thị diện tích thực. Nguồn/giấy phép/checksum trong các tập sources và ISLAND-REVISION.md của từng bản.

## Kiểm tra và bài học

Sông:99 frame preflight và12 frame Studio parity. GDP:215 frame preflight và18 frame Studio parity. Profile ảnh nén từ CUA giữ nguyên meanRGB<3/255 và dưới2% pixel có sai khác kênh>30; không gọi đây là lossless pixel-identical. Kiểm full MP4 dùng toàn bộ tập preflight, không chỉ tập parity.

Đối chiếu đã bắt lỗi preview giữ ảnh Nho Quế trong cảnh Ngô Đồng. Thêm identity/remount cho ảnh theo scene, kiểm lại cả12 frame Studio và preflight; không sửa script/voice. Dời nhãn địa danh lên khỏi credit ảnh. Kết quả bố cục DOM không thay thế kiểm pixel thực.

GDP preflight ban đầu bị lỗi tải plate qua socket do nhiều lần tạo/hủy đường renderStill. Chuyển sang renderFrames với danh sách frame tường minh, dùng lại một trang capture, concurrency1; giữ nguyên toàn bộ mẫu, audit và tolerance. Kiểm ba lần seek lặp vẫn đạt. Runtime đang dùng hỗ trợ frames[] và onFrameBuffer; không thay giới hạn schema.

Mỗi lần chỉ một full render hoạt động. Các lần bị gián đoạn hoặc bị automatic approval review báo hết hạn mức không được coi là bản xuất hoàn chỉnh. Trạng thái cuối phải căn cứ render-audit.json, verification.json, mux-check.json, audio-copy-check.json và package-check.json mới của từng thư mục. Bản cũ và QA được giữ lại sau lần auto-review từ chối xóa ở tác vụ trước; không chạy lại lệnh dọn hoặc xóa chủ đề khác.


Bản sông V2 đã vượt gate:2603 frame,86,766667 giây;99 frame MP4 giải mã đạt; audio correlation0.999854,SNR35.30dB,clipping0.4069 packet AAC giống hệt V1;2603 packet video/cấu hình decoder giữ nguyên sau mux. Source ZIP429 entry đã kiểm CRC/SHA từng entry và không có API key. Hash MP4/ZIP đã kiểm lại.


GDP V2 đã vượt gate ngày27/10/2026:3860frame,128,666667 giây;215frame MP4 giải mã đạt; audio correlation0.999821,SNR34.40dB,clipping0.6033packet AAC giống hệt V1;3860packet video/cấu hình decoder giữ nguyên sau mux. Source ZIP262entry đã kiểm CRC/SHA và key scan. Hai delivery-v2.json lưu hash/kích thước/thời lượng và render stage thực; không gọi đây là benchmark tổng pipeline.
