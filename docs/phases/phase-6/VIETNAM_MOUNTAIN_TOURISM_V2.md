# Bảy ngọn núi Việt Nam V2 — đảo và quần đảo

Yêu cầu 26/10/2026: mọi video có bản đồ Việt Nam phải có các đảo và quần đảo, đặc biệt Hoàng Sa, Trường Sa; ghi vào `Skill_rules.MD` và sửa video bảy ngọn núi. Quy tắc đã được tạo ở root và liên kết từ AGENTS.md.

## Phạm vi sửa

Source riêng: `.local/vietnam-mountain-escapes-v2`; composition `Vietnam-Mountain-Escapes-V2`. Giữ nguyên script, voice Anh Khôi, PCM master, timestamp/karaoke/SRT, 2945 frame ở30fps (98,167 giây). Hash tám đầu vào khóa ở locked-inputs.json được kiểm lại trong locked-input-checks.json. Không gọi TTS/ASR/Vox Director/HyperFrames mới; giữ plan và 540 frame hoạt cảnh từ V1, Remotion dựng hình mới.

## Bản đồ

Giữ nguyên path Việt Nam gốc với25 component. Bổ sung77 feature geometry từ Natural Earth5.1.2 minor islands và disputed areas có scale rank:18 Hoàng Sa,22 Trường Sa và37 feature thuộc các nhóm ven bờ/ngoài khơi khác. Bản đồ chính tổng quan có tên đầy đủ và “(Việt Nam)”; locator trong cả bảy cảnh cận có hai tên quần đảo và geometry. Khung tổng quan mở rộng về phía đông; cảnh kết giữ toàn cảnh từ đầu để không cắt quần đảo khi camera đi đến nơi.

Tọa độ/ring/lỗ không sửa; island-checks.json đối chiếu geometry gốc và xác nhận path Việt Nam cũ giữ nguyên. Ký hiệu tối thiểu1,6px tại tâm feature giúp nhìn thấy đảo nhỏ, không dùng chúng suy diện tích thực. Không vẽ cửa sổ lựa chọn dữ liệu thành ranh giới biển. Nguồn1:10m có khái quát, không phải kiểm kê mọi đá/bãi/rạn; con số feature không phải tổng số đảo Việt Nam. Nguồn và phạm vi đầy đủ trong ISLAND-REVISION.md, sources và island-coverage.json. Bổ sung sáu tile NASA cùng tháng08/2004, giữ provenance/checksum.

## Gate

TypeScript đạt;142 frame preflight đủ các trang phụ đề và mốc hoạt cảnh;11 frame Studio thật ở100% so với renderer PNG đạt profile ảnh nén đã đặt, không nới tolerance. Lỗi phát hiện ở đầu cảnh kết: nhãn quần đảo ngoài viewport do camera còn ở núi Sam; sửa framing trước khi kiểm lại toàn snapshot. Dữ liệu/snapshot V1 không dùng thay bằng chứng hình V2.

Trạng thái xuất cuối và số đo được lưu trong render-audit.json, verification.json, mux-check.json, audio-copy-check.json, package-check.json và cleanup-receipt.json của bản giao. Giữ runtime/source V1 còn dùng qua junction; chỉ dọn MP4/ZIP V1 sau khi V2 vượt gate. Không dọn video chủ đề khác.


Bản giao đã vượt gate:2945 frame,142 frame MP4 giải mã, âm thanh correlation 0.999843, SNR 34.97dB, không clipping. Render437,643 giây. 4603 packet AAC giống hệt V1;2945 packet video/cấu hình decoder giữ nguyên sau mux. File cuối: `.local/vietnam-mountain-escapes-v2/Bay-Ngon-Nui-Du-Lich-Viet-Nam-V2.mp4`.


Dọn dữ liệu không chạy: automatic approval review từ chối xóa không thể hoàn tác MP4/ZIP V1 khi chưa có xác nhận trực tiếp cho việc xóa. Chọn phương án an toàn là giữ V1 và dữ liệu QA; cleanup-status.json ghi trạng thái, không có biên nhận xóa thành công. MP4/ZIP V2 đã kiểm lại hash và là bản mới nhất trong VIDEO_LIBRARY.md.
