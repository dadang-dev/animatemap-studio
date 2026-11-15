# Kinh đô Việt Nam tập 1 V2

Ghi nhận ngày 29/10/2026 theo yêu cầu người dùng. Tên tập: Việt Nam từng có bao nhiêu kinh đô. V2 là bản giao mới nhất; không khôi phục chủ đề “Hành trình dời đô” đã xóa.

## Các quyết định đã chốt

- Video dọc 9:16, 1080×1920, 30 fps, 65.333333 giây, 1960 frame. Giữ voice HN - Anh Khôi, nội dung lời và từng word timestamp của V1; không tạo lại TTS/ASR.
- Callout ngang hàng pin, leader ngắn; tên và ảnh cùng bám camera. Thay nhãn cố định một góc với đường chéo dài. Tên kinh đô lớn hơn, tiêu đề ngắn, ít lặp và bớt viền chữ.
- Phụ đề 48 → 28 trang, giữ thứ tự/text/timestamp từng từ. Bảo vệ tên riêng và cụm “2 thời kỳ”, “1 địa điểm”, “kinh đô”, “tiêu chí”, “Tập tiếp theo”; dùng chữ số như “1959”, “10 lần”.
- Tên Âu Lạc/Ngô Quyền, cụm số, Phú Xuân/Huế và giới thiệu tập sau theo cue thật; không hiện sớm khi lời đang kể ý khác.
- 12 ảnh thực tế có metadata tác giả/giấy phép. Ảnh dưới tên kinh đô; không dùng kết quả cùng tên nhưng sai công trình, ảnh hiện vật không phù hợp hoặc góc quá hẹp khi có ảnh tốt hơn.
- Phong Châu: Đền Thượng/Đền Hùng hiện nay. Vạn Xuân: chùa Trấn Quốc hiện nay, di tích liên hệ Lý Nam Đế, không phải cung điện cổ. Dương Kinh: tượng Mạc Thái Tông ở Kiến Thụy, di vật liên quan nhà Mạc, không phải ảnh cung điện Dương Kinh. Phượng Hoàng Trung Đô: đền thờ Quang Trung tại Vinh/núi Dũng Quyết, không gọi là cung điện đã hoàn thành.
- Locator đủ biển đảo/Hoàng Sa/Trường Sa, nhãn nằm trong khung. Cảnh cận ẩn nhãn trùng bị cắt trên map chính; không bỏ geometry.

## Vai trò các công cụ

- Vox Director local/Codex CLI: kế hoạch 21 shot, định hướng framing, reveal và trình tự ảnh. Không tạo voice/ảnh thay provider.
- ImageGen built-in: 2 asset alpha — court.png (hoàng đế, quan lại, lính nghi vệ) và soldiers.png (nhóm binh lính). Nhãn “Minh họa”; không khẳng định chân dung, triều đại hay phục dựng khảo cổ xác thực. Prompt nguyên văn trong imagegen-prompts.json của ZIP.
- Remotion 4.0.536: bản đồ, ảnh, callout, chữ, karaoke và ghép audio.
- HyperFrames 0.8.168 / GSAP 3.14.2: 90 PNG alpha, 30 fps, cho “2 thời kỳ → 1 địa điểm”, bắt đầu theo cue lời đọc.

## Kiểm chứng và giới hạn

- 128 frame MP4 giải mã đạt ngưỡng mean RGB < 3/255, tỷ lệ pixel lệch kênh > 30 dưới 2%. Mean lớn nhất: 2.150707/255; tỷ lệ lớn nhất: 1.166860%.
- Audio correlation với nguồn: 0.999968822; decoded peak 0.414096, không clipping. Đối chiếu hash/word data xác nhận voice, duration, word text/order/timing giữ nguyên.
- Chưa đo Studio↔renderer độc lập thành công; không gọi việc mở preview là Studio parity pass. Báo cáo “Studio UI access timed out” phản ánh giới hạn công cụ, không thay bằng chứng PNG↔MP4.
- Bản đồ hiện đại dùng định vị, không mô tả cương vực lịch sử; geometry đảo khái quát không phải kiểm kê pháp lý mọi bãi/đá/rạn.
- 9 địa điểm là danh sách tiêu biểu của loạt, không phải tổng số kinh đô tuyệt đối.

## Bản giao và source

- [Video V2](<C:/Users/PC/Documents/Codex/2026-10-29/ti-p-t-c-trao-i/outputs/Kinh-Do-Viet-Nam-Tap-1-V2.mp4>)
- [Source V2](<C:/Users/PC/Documents/Codex/2026-10-29/ti-p-t-c-trao-i/outputs/Tap-1-V2-source.zip>) — Remotion/HyperFrames, 12 ảnh, 2 minh họa, plan, prompt, nguồn/giấy phép; không gồm font Arial bản quyền, credential hay node_modules.
- [SRT V2](<C:/Users/PC/Documents/Codex/2026-10-29/ti-p-t-c-trao-i/outputs/Tap-1-V2.srt>)
- [Word timing](<C:/Users/PC/Documents/Codex/2026-10-29/ti-p-t-c-trao-i/outputs/Tap-1-V2-word-timing.json>)
- [Nguồn và credit](<C:/Users/PC/Documents/Codex/2026-10-29/ti-p-t-c-trao-i/outputs/Tap-1-V2-README.txt>)
- [Báo cáo kiểm tra](<C:/Users/PC/Documents/Codex/2026-10-29/ti-p-t-c-trao-i/outputs/Tap-1-V2-verification.json>)

MP4 SHA256: `3884065b564cd675af404b52202a4673c48f1f8e998eab3d16f07fb0fb5fdb56`. Source SHA256: `2315273d8a29438850d090e43b4214fa709873cd2ecfbe97a65ad72999af7ee7`.

Source đang làm: `C:/Users/PC/Documents/Codex/2026-10-29/ti-p-t-c-trao-i/work/episode/v2`. Hồ sơ voice/plan V1: `.local/kinh-do-short-01` trong AnimateMap Studio. Không coi đường dẫn runtime của chủ đề cũ là source video cũ còn tồn tại.

## Nguồn đối chiếu bổ sung

- [Trấn Quốc và truyền thống Lý Nam Đế — Hoàng thành Thăng Long](https://hoangthanhthanglong.vn/en/tran-quoc-pagoda/)
- [Sở Văn hóa và Thể thao Hà Nội](https://sovhtt.hanoi.gov.vn/hoi-dap/ha-no%CC%A3i-ngay-nay/)
- Từng ảnh có URL Commons, tác giả, license và thay đổi crop/resize trong photo-sources.json/README của gói source. Không suy quyền dùng chỉ từ việc ảnh công khai.
