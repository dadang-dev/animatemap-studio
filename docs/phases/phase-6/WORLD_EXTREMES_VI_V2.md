# Những cực trị địa lý thế giới — V2 tăng hoạt ảnh

Hoàn tất 07/11/2026 theo phản hồi “Thêm nhiều hoạt ảnh, animation nữa”. Đây là bản hiện hành thay V1. Phạm vi chỉ sửa hình: script, giọng/tốc độ, master, word timing, caption pages, SRT và 67,5 giây được khóa hash nguyên V1; không gọi TTS/ASR hay upload media mới.

## Bản giao

- MP4: `C:\Users\PC\OneDrive\Desktop\VIBECODE\AnimateMap Studio\.local\world-extremes-vi-v2\Nhung-Cuc-Tri-Dia-Ly-The-Gioi-VI-V2.mp4`
- SHA-256: `13b6e608a1264978ed4837e0334034bd11998de09e9668854866c0c2e296dfdf`
- Source: `C:\Users\PC\OneDrive\Desktop\VIBECODE\AnimateMap Studio\.local\world-extremes-vi-v2\World-Extremes-VI-V2-Source.zip`
- SHA-256 ZIP: `d484c898b83ae57527e9e149f3cedb3632eb8e4a19bd6d02c3c6cd16349eda8b`
- 1080×1920 ·30fps ·2025khung ·67,5giây ·H.264/yuv420p ·AAC stereo48kHz ·faststart.
- Studio: http://127.0.0.1:3042/World-Extremes-VI-V2

## Thay đổi hình

Mở có hành trình sáng; Ấn Độ có người bật lên trên bản đồ và đám đông lớn tích lũy; Nga có tuyết dày, tinh thể băng xoay và băng mọc; Kuwait có mặt trời và khí nóng liên tục; Atacama có mây hết mưa, cồn cát và vết nứt lan dần trong ô minh họa; Indonesia có camera tây–đông và thuyền đi đúng đường cong; Pháp có kim đồng hồ chạy và 12 nan múi giờ mở ra; Canada có sóng ở ba đại dương, thuyền và nét bờ biển; Philippines có lịch rơi tờ tháng8, đèn dây bật dần, sao chuyển động và parol đung đưa; kết có8điểm xuất hiện liên tiếp. Pin phát sóng nhẹ, đường bao sáng êm, chữ vào cảnh có chủ đích.

Remotion HeroAnimations.tsx đóng góp mới. Dùng lại17shot Vox Director/action-focus đã có; không nhận là provider lập plan mới. HyperFrames180PNG parol tiếp tục xuất hiện thật, thêm chuyển động vị trí trong Remotion. Sơ đồ, sóng, thuyền, thời tiết và đồng hồ là minh họa, không phải quan trắc/giờ/tuyến vận tải thực. Dữ liệu, geometry và77feature đảo Việt Nam/Hoàng Sa/Trường Sa không đổi.

## Kiểm tra

- Typecheck source đạt.
- Preflight439frame: không lỗi bố cục, tối đa2dòng, highlight đúng khoảng timing; mọi cảnh có chữ ký DOM hoạt ảnh thay đổi.
- Studio24frame100% đối chiếu renderer với profileJPEG và ngưỡng cũ; không nhận lossless pixel identity. Hash snapshot `8c35fb7114cdaba1d5813a0ea16066f411bc435e86e188d7c6ce5c3a319f839e`.
- Quan sát playback1× tiến frame; không nhận đã nghe độc lập toàn bộ hay benchmark độ mượt.
- Rà file giải mã phát hiện thuyền chạm nhãn Thái Bình Dương. Dời thuyền trong vùng biển trống, đo8mốc thực với cả3nhãn đều không va chạm; chạy lại preflight/parity/render/decoded trên snapshot mới.
- Export audit2025frame đạt. 72frame MP4 giải mã đạt ngưỡng meanRGB<3vàfraction>30<2%; xem lại contact sheet mọi cảnh và khu vực Canada đã sửa.
- CFR/PTS, codec, endpoint,faststart đạt. Mux giữ2025video packet/PTS/DTS/config.3166AACpacket hash/PTS/DTS khớp nguyên V1.
- Audio correlation 0.999807, SNR 34.07dB,0clipped.32trang karaoke và206nhóm timing không đổi.
- Source ZIP 456entry; CRC/hash từng entry và credential scan đạt. Không kèm key/private task/account metadata/runtime/frameQA.

## Resume và trạng thái

Ứng dụng gián đoạn đã dừng tiến trình render chốt trước. Đã kiểm PID/trạng thái, không tạo trùng render đang chạy hoặc gọi lại voice. Helper finish-worker.mjs cục bộ chờ audit đúng hash rồi mux/verify/package; đây là helper riêng video, không phải pipeline chung đã triển khai.

Nội dung: giữ nguyên phạm vi8vídụ và các qualifier đã đối chiếu ởV1. Media: V2cuối qua gate. Không còn việc bắt buộc trong yêu cầu này; chưa phát hành ra nền tảng ngoài. Source và paid cache củaV1 được giữ khi còn là phụ thuộc, media V1được thay theo chính sách chỉ giữ bản mới nhất.


Dọn file: automatic approval review đã từ chối lệnh xóa cache/draft và MP4/ZIP V1 vì cho rằng chưa có ủy quyền xóa rõ ràng. Không thực hiện xóa hoặc tìm đường vòng. Giữ cả media V1 và dữ liệu QA; V2 là bản giao hiện hành. Hash MP4/ZIP V2 kiểm lại sau bàn giao vẫn khớp.
