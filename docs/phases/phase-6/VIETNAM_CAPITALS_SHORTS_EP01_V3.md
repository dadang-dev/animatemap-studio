# Kinh đô Việt Nam tập 1 V3 — sửa diễn giải lời đọc

Cập nhật 30/10/2026. Theo yêu cầu tiếp tục sau rà soát V2, áp dụng [Skill_rules.MD](../../../Skill_rules.MD): không cho phép đoạn chỉ thay chữ trên ảnh tĩnh chưa diễn giải lời đọc. V3 là bản giao mới nhất của tập 1; V2 giữ để đối chiếu.

# Tập 1 V3 — diễn giải toàn bộ lời đọc

Khóa WAV, word text/timing, pagination và thời lượng 65,333333 giây của V2.

- 0–7,8s: câu hỏi và các đơn vị đếm, giữ minh họa triều đình có nhãn.
- 7,8–23,2s: pin tích lũy theo từng địa danh; ảnh thật dưới tên, kết quả 9 dấu tiêu biểu; không phải tuyến dời đô hay tổng số kinh đô đầy đủ.
- 23,2–28s: hai khối thời kỳ hội về một điểm minh họa, chuẩn bị ví dụ.
- 28–34,9s: Âu Lạc và Ngô Quyền nối về cùng pin Cổ Loa; số thời kỳ tăng 1 lên 2, địa điểm vẫn 1. HyperFrames hỗ trợ kết luận.
- 34,9–43,14s: hai thẻ tên Phú Xuân/Huế hội lại thành một đơn vị địa điểm theo lời đọc; ảnh hiện nay giữ vai trò tư liệu.
- 43,36–46,98s: Lam Kinh và Dương Kinh cùng còn trong sơ đồ vai trò tới khi lời giải thích xong; một ảnh chính mỗi lượt.
- 46,98–52,66s: sơ đồ kế hoạch Phú Xuân → Phượng Hoàng Trung Đô, nét đứt phát triển rồi bị chặn; không giả tuyến đường thật hoặc chuyển đô hoàn tất.
- 52,66–60,7s: lần lượt kích hoạt 1 pin / 2 thời kỳ / các loại vai trò và dự định; kết quả là đơn vị đếm khác nhau, không thêm tổng số vô căn cứ.
- 60,7–cuối: camera tới Phong Châu và ảnh Đền Hùng hiện nay, dẫn tập 2.

Ảnh tư liệu có provenance V2, court ImageGen dùng lại. Không tạo TTS/ASR hay ImageGen mới. Giữ Hoàng Sa/Trường Sa trên overview/locator. Các sơ đồ thời kỳ, tên gọi và vai trò là minh họa khái niệm, không phục dựng cương vực cổ.

# Tập 1 V3 — sửa theo Skill_rules.MD ngày 30/10/2026

Không cho phép các đoạn chỉ thay chữ và giữ ảnh tĩnh, chưa diễn giải lời đọc. Rà toàn bộ script theo bảng content-visual-map.md.

- Thay camera montage bay nhanh bằng nền địa lý ổn định; pin tích lũy và các dấu đếm lần lượt hiện thành 9. Không biến danh sách tiêu biểu thành tổng số kinh đô đầy đủ.
- 2 thời kỳ Cổ Loa nối về 1 pin; hai nhãn tên Phú Xuân–Huế hội lại thành một đơn vị đếm theo lời đọc.
- Lam Kinh giữ tên/vị trí trong lúc Dương Kinh là ảnh chính; sơ đồ nối cả hai tới vai trò kinh đô thứ 2.
- Phượng Hoàng Trung Đô là đích kế hoạch nét đứt bị chặn; không vẽ giả tuyến đường thực tế hay cuộc chuyển đô hoàn tất.
- Tổng kết lần lượt kích hoạt đơn vị địa điểm, thời kỳ và vai trò/dự định. Đây là kết quả các ví dụ, không thêm tổng số mới.
- Locator tránh ảnh/sơ đồ; nhãn biển đảo giữ trong locator khi bản đồ chính có lớp minh họa. Text tương phản nền, cue theo lời đọc. Ảnh công trình hiện nay và ImageGen court dùng lại đúng provenance V2.
- V3 khóa nguyên WAV/word timing/28 trang subtitle/thời lượng 65,333333 giây. Không TTS/ASR/ImageGen mới.
- Studio 127.0.0.1:3043/KinhDoTap1V3 đã tải composition; playback bằng UI hoạt động, kiểm các khung khó. WebMCP play không tự vượt điều kiện gesture audio của browser, dùng nút Play thực. Chưa đo pixel parity Studio độc lập.
- Render thử 351 frame / 11,7 giây về cách đếm; MP4 cuối cần kiểm riêng frame giải mã và audio. Báo cáo verification.json trong ZIP là bằng chứng gate cuối.

## Gate cuối

- MP4: 65.33333333333333 giây, 1080x1920, 30 fps, 1960 frame. 153 khung giải mã được đối chiếu renderer.
- Mean RGB lớn nhất: 2.204372/255; tỷ lệ pixel lệch kênh >30 lớn nhất: 1.640914%. Giữ ngưỡng <3/255 và <2%.
- Audio correlation 0.999968822; peak 0.414096, không clipping. WAV/word timing/pages/thời lượng khớp V2.
- SHA-256: `89350daa7cde5033d6ee723d96345c917b3598718afca03e4d8ebf6d448e0f2b`.
- Studio preview/playback được kiểm, chưa đo pixel parity Studio độc lập. Không suy từ media pass thành đạt mọi gate thẩm mỹ.

Vox Director tạo plan mới 21 shot; camera/sơ đồ triển khai thủ công. HyperFrames tái dùng 90 PNG alpha, hỗ trợ kết quả 2 thời kỳ/1 địa điểm. ImageGen court có nhãn được tái dùng; không tạo voice/ASR/ImageGen mới. Giữ ảnh, nguồn/giấy phép của V2 và phân biệt hiện vật/di tích hiện nay với cung điện cổ.

## File giao

- [MP4 V3](<C:/Users/PC/Documents/Codex/2026-10-29/ti-p-t-c-trao-i/outputs/Kinh-Do-Viet-Nam-Tap-1-V3.mp4>)
- [Source V3](<C:/Users/PC/Documents/Codex/2026-10-29/ti-p-t-c-trao-i/outputs/Tap-1-V3-source.zip>)
- [SRT](<C:/Users/PC/Documents/Codex/2026-10-29/ti-p-t-c-trao-i/outputs/Tap-1-V3.srt>)
- [Verification](<C:/Users/PC/Documents/Codex/2026-10-29/ti-p-t-c-trao-i/outputs/Tap-1-V3-verification.json>)
- [Nguồn và credit](<C:/Users/PC/Documents/Codex/2026-10-29/ti-p-t-c-trao-i/outputs/Tap-1-V3-README.txt>)

Source: `C:/Users/PC/Documents/Codex/2026-10-29/ti-p-t-c-trao-i/work/episode/v3`. Render: `node render.mjs motion`, `node render.mjs`, `python -X utf8 finalize.py`. PID/log lưu cùng thư mục. Không xóa media trong lần cập nhật này.

## Đính chính đánh giá nội dung ngày 30/10/2026

Người dùng nhận xét cả 3 tập thiếu kết luận trả lời hook. Media/diễn giải pass ở trên không chứng minh tập đã giải quyết câu hỏi mở đầu. Tập 1 đã có [V4](VIETNAM_CAPITALS_SHORTS_EP01_V4.md) thay thế nội dung; tập 2/3 còn chờ sửa riêng. Tập 3 bản thành–hào chưa trả lời câu hỏi về An Dương Vương và Ngô Quyền.
