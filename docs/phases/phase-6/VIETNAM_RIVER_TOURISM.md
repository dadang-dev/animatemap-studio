# Du lịch các dòng sông Việt Nam — bản giao 26/10/2026

Bản mới nhất: `.local/vietnam-river-escapes/Bay-Dong-Song-Du-Lich-Viet-Nam.mp4`; source: `Bay-Dong-Song-editable-source.zip`. 9:16, 1080×1920, 30 fps, 2603 frame (86,767 giây). Bảy gợi ý Bắc–Nam, không xếp hạng: Nho Quế, Ngô Đồng, Son, Hương, Hàn, Hoài, Hậu.

Vox Director qua Codex CLI lập 17 shot thật (59,521 giây). HyperFrames 0.8.168 xuất 270 alpha frame cho thuyền/hẻm vực, cửa hang và đèn lồng (16,5 giây). Remotion 4.0.536 ghép camera địa lý, ảnh thật, hoạt cảnh và karaoke; full render 420,139 giây, concurrency 2. Đây là số đo từng công đoạn, không phải benchmark toàn quy trình.

Voice HN – Anh Khôi, Vbee, tốc độ 1.0; dùng một paid text-only task có cache. ASR local faster-whisper small/int8, sửa chính tả 19 nhóm theo script và giữ interval; không upload audio. Timestamp gần đúng, không tự nhận timing provider hoặc xác minh speech độc lập bằng phép so corrected text. 53 trang karaoke, giữ trọn địa danh nhiều âm tiết.

Địa lý là Natural Earth/NASA GIBS tháng 08/2004/OSM tham chiếu, không phải ảnh trực tiếp hoặc tuyến du thuyền khảo sát. Chỉ nhấn đoạn OSM có tên xác nhận; locator cho các đoạn còn lại. Nội dung phân biệt Cái Răng trên sông Cần Thơ với sông Hậu. Ảnh Commons CC BY-SA có tác giả, URL và thay đổi trong LICENSE-PHOTOS.md. Nhạc nền tổng hợp không phải bản thu ca Huế.

Gate: 96 frame preflight bao phủ 53 trang phụ đề và biên cảnh; 11 ảnh Studio 100% đối chiếu renderer bằng profile JPEG có nén. API screenshot trả JPEG, không đạt phép chứng minh lossless/pixel-identical; giới hạn được ghi trong studio-parity.json. Full audit đủ 2603 frame không overflow/overlap/error. MP4 H.264/yuv420p/faststart, AAC stereo 48 kHz; đúng endpoint/số frame. 11 frame giải mã đạt profile mean RGB <3 và <2% pixel chênh >30. Âm thanh correlation 0,999854; SNR 35,299 dB; không clipping; -15,6 LUFS, true peak -1,5 dBFS. Packet video giữ nguyên hash/PTS/DTS sau mux. Contact sheet cuối được xem trực quan; không tuyên bố đã nghe/xem toàn video thời gian thực.

Lệnh chính: `node render.mjs check`, `node render.mjs render` trong thư mục remotion; `node .local/vietnam-river-escapes/verify.mjs` và `mux-check.mjs` từ repo. SourceZIP có 411 entry, đã kiểm CRC và SHA256 từng entry, exact local API key absent. API key/cache provider không đưa vào ZIP. Source để render lại nằm trong remotion/src và public; JSON AnimateMap là nền kế hoạch, không chứa toàn bộ composite cuối.

Bằng chứng/hashes: verification.json, package-check.json, mux-check.json, render-audit.json, cleanup-receipt.json trong thư mục bản giao. Giữ paid cache, voice/timing, sources/giấy phép, runtime junction dùng chung; chỉ dọn intermediates của bản này sau khi kiểm đầu ra.


Bản mới nhất sau yêu cầu bổ sung biển đảo: [V2 theo Skill_rules.MD](VIETNAM_ISLAND_RULE_UPDATES.md). Bản cũ vẫn được giữ; danh mục mới nhất ở docs/VIDEO_LIBRARY.md.
