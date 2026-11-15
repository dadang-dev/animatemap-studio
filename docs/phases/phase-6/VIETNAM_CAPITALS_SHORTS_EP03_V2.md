# Tập 3 V2 — Hai trường hợp chọn Cổ Loa


**Trạng thái sau audit 01/11/2026:** Giữ đề tài; sửa thuyền, tăng vai trò timeline 2 thời kỳ và biên tập về khung 75–90 giây. Đề bài chuẩn tập 3: **Vì sao Cổ Loa được chọn làm kinh đô hai lần?**. Xem [master](VIETNAM_CAPITALS_SERIES_MASTER.md) và [audit](VIETNAM_CAPITALS_SERIES_AUDIT_2026_11_01.md). Các số đo media bên dưới là của bản đã xuất, không tự là phê duyệt nội dung theo đề cương. Audit này chưa sửa MP4.


Cập nhật 30/10/2026. Bản mới nhất, thay tập 3 V1 chỉ tập trung thành–hào. Đã đọc trực tiếp mục 2 và 5 Word, mục 3 cho teaser, trích đoạn/hash được lưu. Không sửa Word gốc.

# Tập 3 V2: câu hỏi → lời giải → kết luận

Đọc mục 2 và 5 của Word gốc; mục 3 dùng cho teaser. Hai trường hợp được hỏi là An Dương Vương và Ngô Quyền, không có nghĩa Cổ Loa chỉ có đúng 2 lần làm kinh đô. Bản gốc còn nhắc Lý Phật Tử.

| Thời gian | Nội dung | Diễn giải trực quan |
|---|---|---|
| 0–8,68s | Vì sao cùng chọn Cổ Loa? Đáp án sớm có điều kiện | Hai triều minh họa tách biệt, quy về Cổ Loa; các quan hệ sông/giao thông, tường bảo vệ và nối tiếp xuất hiện theo ý đọc |
| 8,68–18,08s | Âu Lạc, vị trí tiếp cận mạng sông và giao thông | Camera tới Cổ Loa, ảnh di tích thật dưới tên ngang pin, triều An Dương Vương; mạng đường thủy khái quát có thuyền kết nối trung tâm |
| 18,08–27,28s | Lũy đất, hào, địa hình bảo vệ; tổ chức nhân lực | Đất thành nâng lên, người theo mặt đất, hào đào/nước vào, trở ngại trước trung tâm; công nhân mang vật liệu và các khối xây tăng |
| 27,28–36,50s | Bạch Đằng 938 → xưng vương, chọn Cổ Loa 939 | Đội thuyền biểu trưng và kết quả thắng trận; HyperFrames đổi năm 938→939; minh họa Ngô Quyền, biểu tượng xưng vương rồi pin và ảnh thật Cổ Loa |
| 36,50–46,88s | Kết nối Âu Lạc xưa với nền tự chủ; chưa biết đầy đủ động cơ | Hai thời kỳ hội tụ về Cổ Loa, đường kết nối xuất hiện; sau đó tách sự kiện đã biết khỏi dấu hỏi về suy nghĩ, ngắt đường suy diễn |
| 46,88–58,50s | Kết luận trả lời trực tiếp câu hỏi và giới hạn | Sông/thuyền → giao thông → bảo vệ → nối tiếp hội tụ về Cổ Loa; giới hạn động cơ hiện trước teaser |
| 58,50–63,53s | Tập sau trở về năm 40, Mê Linh, Hai Bà Trưng | Mũi tên từ 939 sang trái về 40; chuyển bản đồ và ảnh Mê Linh khi camera tới nơi |

Sơ đồ đường thủy là cơ chế khái quát, không phải GIS tuyến sông cổ. Thuyền chiến không tái hiện chiến thuật đã xác minh. Ảnh công trình hiện nay không chứng minh diện mạo cung điện cổ; hai triều ImageGen có nhãn minh họa. Không biến ý nghĩa lịch sử của lựa chọn thành toàn bộ động cơ đã được chứng minh. Năm dùng chữ số 938, 939, 40; giữ đúng tên Hai Bà Trưng.


## Dựng và trình bày

Script, voice Anh Khôi và timing mới. Vox Director 15 shot; Remotion dựng các quan hệ, hành động và cue; HyperFrames 270 PNG alpha mới cho 938→939; ImageGen tạo hai triều cung đình riêng, có nhãn minh họa. Không dùng trang phục cung đình thời muộn làm phục dựng chắc chắn thời Âu Lạc. Tên địa danh ngang pin/leader ngắn, ảnh di tích thật bên dưới. Giữ Hoàng Sa/Trường Sa trên overview/locator. Ảnh vệ tinh phủ toàn viewport trước khi bỏ nền toàn cảnh; khi teaser đổi crop dùng plate mới đã khớp camera. Người quan sát đi theo mặt thành đang nâng, ẩn nhãn hào trước lớp công nhân để tránh chồng.

## Kiểm chứng

- 63.533333s, 1080x1920, 30 fps, 1906 frame; mọi PTS i/30 trong 0,00001s.
- 200 khung giải mã: max mean RGB 2.400542/255; max tỷ lệ pixel delta>30 1.501302%. Giữ gate <3 và <2%.
- Audio correlation 0.999966230, decoded peak 0.377094; không clipping.
- SHA256 `1db47eaaa3ff93738654c3140b2225eeb7af4cf451af32fd701650e70c2a3010`.
- 26 trang caption đo DOM 1–2 dòng ở lượt dựng; thay đổi cuối về nền/ảnh không đổi caption. ASR local small/int8: interval ước lượng giữ nguyên, 5 sửa từ và 2 atom năm gộp; có raw/correction. Không claim nghe độc lập mọi âm tiết hoặc timing phoneme chính xác.
- Đoạn chuyển động 591 frame/19,7s đã xuất và xem khung; final preflight và decoded MP4 đã rà. Lượt giao hiện tại không điều khiển lại được Studio; không claim playback/parity Studio độc lập.

## Bản giao

- [Kinh-Do-Viet-Nam-Tap-3-V2.mp4](<C:/Users/PC/Documents/Codex/2026-10-29/ti-p-t-c-trao-i/outputs/Kinh-Do-Viet-Nam-Tap-3-V2.mp4>)
- [Tap-3-V2-source.zip](<C:/Users/PC/Documents/Codex/2026-10-29/ti-p-t-c-trao-i/outputs/Tap-3-V2-source.zip>)
- [Tap-3-V2.srt](<C:/Users/PC/Documents/Codex/2026-10-29/ti-p-t-c-trao-i/outputs/Tap-3-V2.srt>)
- [Tap-3-V2-verification.json](<C:/Users/PC/Documents/Codex/2026-10-29/ti-p-t-c-trao-i/outputs/Tap-3-V2-verification.json>)
- [Tap-3-V2-README.txt](<C:/Users/PC/Documents/Codex/2026-10-29/ti-p-t-c-trao-i/outputs/Tap-3-V2-README.txt>)
