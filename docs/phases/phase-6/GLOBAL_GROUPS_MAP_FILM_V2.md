# NATO · EU · BRICS · G7 · APEC — Map Film V2

Ngày thực hiện: 25/10/2026. Bản chỉnh hình theo phản hồi “video, không phải thuyết trình slide”, thay thế cách trình bày sidebar/bullet/bảng của V1. Khung ngang 1920×1080, 30 fps, 290,6 giây, 8.718 frame. Không mở rộng sang ASEAN/OPEC chỉ vì mẫu có các nhóm này.

## Phạm vi và cách kể

Đã xem contact sheet toàn bộ mẫu và lấy mẫu dày các hoạt cảnh EU/BRICS. Không dùng lại footage, âm thanh hay watermark. Bản đồ vệ tinh toàn khung là sân khấu; camera đi tới địa lý đang kể, vật thể thực hiện hành động và giữ kết quả đủ để đọc. Chữ ngắn theo cue; karaoke đảm nhiệm câu đầy đủ. Bỏ sidebar cố định, bullet panel, card grid và bảng tổng kết tĩnh.

- Remotion: cùng evaluator theo frame cho preview/export, atlas lossless, camera/neo địa lý chung, hàng hóa/tiền/tổ chức chuyển động, ảnh tư liệu ngắn và karaoke.
- HyperFrames: tám nhóm actor GSAP trong suốt; tạo 1.080 PNG, dùng 960 frame gồm khiên sạch thay thế. Số Điều 5/42(7) là chữ chỉnh sửa được trong Remotion.
- Vox Director: kế hoạch 77 shot local qua Codex CLI; framing/treatment thực sự điều khiển lens, focus và kích thước vật thể. Kết hợp 81 beat gắn lời đọc; không coi số shot là bằng chứng chất lượng.

Script, giọng Anh Khôi tốc độ 1.0, audio master, caption/timing/SRT và 21 WAV được khóa bằng SHA-256. Không gọi lại TTS/ASR, không upload audio. Nguồn nội dung giữ nguyên snapshot V1; đây là chỉnh hình, không phải lần kiểm chứng sự kiện mới.

## Gate và lỗi đã sửa

- Sáu unit test: khóa nội dung, schema/thời lượng, evaluator toàn bộ frame, camera/liên tục/kinh tuyến, cơ chế minh họa, cue karaoke. TypeScript và ESLint được kiểm riêng.
- Preflight 802 frame, tám atlas có địa hình thật; kiểm pixel frame 0 và đầu mọi cảnh. Studio parity 20 mẫu; ngưỡng mean RGBA dưới 0,05.
- Đoạn thử chuyển động 20 giây/600 frame; xem khung dày 0,5 giây và playback Studio 1× một đoạn đại diện. Không tuyên bố đã nghe độc lập toàn bộ phim.
- Render chính đủ 8.718 frame, audit không có frame lỗi; 1.133,9 giây với bốn worker, PNG/CRF12/veryfast. Đây là thời gian render riêng, không phải thời gian sản xuất toàn bộ video.
- Đã hủy lần render đầu khi phát hiện lớp map duy nhất fade từ opacity 0 ở các cảnh dùng cùng atlas. Sửa giữ atlas cùng loại luôn opaque; crossfade chỉ khi có lớp trước dưới. Chạy lại preflight, parity, motion và kiểm màu sau sửa.
- Kiểm tám frame khó trước render dài: mean RGB tối đa 1,886; ngưỡng giữ nguyên dưới 3 và tỷ lệ channel lệch trên 30 dưới 0,02. Kiểm MP4 cuối còn phải đạt riêng.

Fingerprint source: `08c2a089d784cea533237b0420d0ecce8a81cf46476d4c7b2f876661fa78cda7`.

## Bản giao và bằng chứng

Thư mục: `.local/global-groups-v2`. Studio: `http://127.0.0.1:3028/Global-Groups-V2`.

MP4 cuối: `NATO-EU-BRICS-G7-APEC-V2.mp4`; source: `Global-Groups-V2-editable-source.zip`. Chỉ coi hoàn tất khi `delivery.json`, `verification.json`, `seek-proof.json` và `mux-check.json` đều đạt. Gate cuối đã đạt: 807 khung MP4 giải mã, mean RGB tối đa 2,226 (ngưỡng 3), tỷ lệ pixel lệch channel trên 30 tối đa 0,006930 (ngưỡng 0,02). Frame 1920 lưu bóng chữ đã được thêm vào hồi quy và đạt. Năm khung control decode từ đầu giống hệt pixel với seek theo giây nguyên. Mux giữ nguyên hash/PTS/DTS của 8.718 video packet. Audio correlation 0,999832, SNR 34,68 dB, không clipping; container/video/audio cùng endpoint 290,6 giây. ZIP 1.318 entry đã kiểm integrity và credential scan.

Native JSON chỉ giữ hợp đồng planning/map/timing; full composite cần source Remotion/HyperFrames. Karaoke giữ timing ASR local ước lượng từ V1, không phải alignment mới được xác minh bằng nghe. Ảnh tư liệu có năm/giấy phép riêng; không coi là đội hình lãnh đạo hiện tại.

Auto-review đã từ chối xóa hàng loạt profile Chromium trong TEMP vì có thể thuộc tác vụ khác. Không xóa các profile đó; cleanup giới hạn trong dữ liệu dựng có thể tái tạo và phiên bản cũ của chủ đề sau khi V2 đạt gate. Giữ voice trả phí, source, giấy phép và runtime dùng chung.

Hướng dẫn lâu dài: [VIDEO_VISUAL_STORYTELLING.md](../../VIDEO_VISUAL_STORYTELLING.md), [VIDEO_PRODUCTION_WORKFLOW.md](../../VIDEO_PRODUCTION_WORKFLOW.md) và AGENTS.md.

## Bản cuối và dọn dữ liệu

Đường JPEG từng đạt benchmark tám frame nhưng fail bảy mẫu trong kiểm MP4 toàn phim, đồng thời một frame lưu bóng tiêu đề. Không nới ngưỡng: chuyển capture PNG, xuất lại và kiểm đủ 807 mẫu. Benchmark JPEG không được dùng làm benchmark tốc độ PNG.

MP4 432.967.666 byte, SHA-256: `7670e09c9b01c595f44f79ffcd4a9d6320bd473bcef7f95414acbb8c32fad394`.

Source ZIP 261.694.885 byte, SHA-256: `5a727a4f3bab75a060a768d16fcef24ba64a888f387a9f7d9ae41afa9d8d0f7a`.

Cleanup V2 đã xóa 2.898 file dựng có thể tái tạo / 5.457.100.173 byte. Xóa thêm đúng MP4 và ZIP V1 sau kiểm hash: 332.544.597 byte. Tổng lần dọn này 5.789.644.770 byte; không cộng vào số dọn của V1 trước đó. Giữ source/voice trả phí, atlas/HF PNG cần chạy, license và junction runtime. Biên nhận: cleanup-receipt.json và superseded-cleanup.json trong thư mục V2.
