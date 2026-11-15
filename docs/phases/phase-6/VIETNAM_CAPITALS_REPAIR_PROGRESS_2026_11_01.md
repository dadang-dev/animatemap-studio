# Tiến độ sửa sau audit — 01/11/2026

Đề cương vẫn là 12 tập theo bảng người dùng. Không có thay đổi số tập/chủ đề.

- Tập1 V5: lời đọc mới83,905s; composition84,8s. Mở/kết phân biệt9 ví dụ, tiêu chí đếm và12 chủ đề. VoxDirector mới19shot; dùng lại HyperFrames90frame và minh họa cung đình có nhãn.43trang caption tối đa2dòng; bố cục qua preflight197frame. Đang render, chưa kiểm MP4 cuối, chưa thay bản được duyệt.
- Tập3 V3: voice83,122s; composition84,033s. Đã sửa code thuyền dùng chung control-point với nét sông; bổ sung timeline ÂuLạc→939 có khoảng đứt và ví dụ LýPhậtTử.47trang phụ đề đã phân nhóm nhưng chưa kiểm DOM/hình; chưa export.
- Tập5 V2: voice74,893s, cần composition75s và kiểm hết tiếng trước điểm kết. ASR lần đầu thiếuRAM; chạy lại lần lượt, không tạo voice trùng.
- Tập7 V2: voice82,442s; teaser hỏi vì sao HồQuýLy chuyển đô về ThanhHóa. Cần align và thay hình teaser.
- Tập8/9/10 V2: script đúng đề cương và voice đã có, ASR local đã có. Chưa dựng lại hình. Tập10 voice89,731s nên composition≤90s, không thêmđuôi0,9s mặc định.
- Tập11/12 vẫn chưa sản xuất. Chưa gọi toàn series hoàn thành.

Word gốc được đọc trực tiếp trong audit tại OneDrive/TIKTOK, hash giữ nguyên. Quyền gửi văn bảnTTS đã có cho1/3/5/7/8–12; không gửiWord/audio. Không xin lại cùng phạm vi.

Giới hạn tài nguyên: đã dọn5337PNG kiểm tra tái tạo được của các bản cũ (~7,71GiB); giữ MP4, voice, source, contact sheets và báo cáo. Danh sách trongwork/regenerable-qa-cleanup-2026-11-01.json. NativePNG cũ cần tái tạo nếu muốn kiểm lại parity. Một render nặng/lần; ASR tiếp theo chạy tuần tự sau lỗi thiếuRAM. Không lặp TTS để chữa lỗi ASR.


### Hoàn tất tập 1 V5 — 02/11/2026

Tập 1 V5 hiện hành: 84,8 giây, video SHA256 ab3391e30e1bc2a937c233a315876a1815b11d770d8411e8913f5de84306471e. Xem docs/phases/phase-6/VIETNAM_CAPITALS_SHORTS_EP01_V5.md. Đã sửa phạm vi số 9, kết luận theo tiêu chí, 12 chủ đề không đồng nghĩa12 kinh đô; đã kiểm43trang caption và197mẫu pixel.3/5/7 vẫn đang kiểm bản sửa;8–10 chưa có MP4 mới đúng đề cương;11/12 chưa sản xuất.

