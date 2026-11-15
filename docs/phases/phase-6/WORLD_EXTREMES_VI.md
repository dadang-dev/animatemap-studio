# Những cực trị địa lý thế giới — bản tiếng Việt V1

Hoàn tất ngày 07/11/2026. Người dùng chọn làm video mới cùng 8 ví dụ trong mẫu, bằng tiếng Việt; đã đồng ý gửi chỉ kịch bản mới tới AI33 để tạo giọng Vbee Anh Khôi. Không gửi video/audio mẫu. Không xuất bản lên nền tảng ngoài.

## Bản giao

- MP4: `C:\Users\PC\OneDrive\Desktop\VIBECODE\AnimateMap Studio\.local\world-extremes-vi\Nhung-Cuc-Tri-Dia-Ly-The-Gioi-VI.mp4`
- SHA-256: `d249bd01b688c9836dee238b78ab050a00d838101731165d0cc40aba1c91443e`
- Source ZIP: `C:\Users\PC\OneDrive\Desktop\VIBECODE\AnimateMap Studio\.local\world-extremes-vi\World-Extremes-VI-Source.zip`
- SHA-256 ZIP: `89c6bf164d67fd851f1893b26d7e22268d45ecb38e4f3e2baaca338b3afbd5a6`
- 1080×1920, 30 fps, 2025 khung = 67,5 giây. H.264/yuv420p, AAC stereo 48 kHz/192 kbps, faststart.
- Studio: http://127.0.0.1:3041/World-Extremes-VI

## Nội dung và cách kể

Giữ thứ tự Ấn Độ, Nga, Kuwait, Chile, Indonesia, Pháp, Canada, Philippines. Nguồn UN/WMO/NASA/BIG/Guinness/NRCan/PNA và nguồn văn hóa đối chiếu trong `.local/world-extremes-vi/SOURCES.md` cùng fact-manifest. Phân biệt dự phóng dân số 2025, số đo tại trạm, sa mạc ngoài vùng cực, kiểm kê đảo 2024, múi giờ tiêu chuẩn/mùa hè và nét văn hóa tháng 9. Không lặp khẳng định sai Indonesia nhiều đảo nhất, không gọi kỷ lục nhiệt độ tại trạm là khí hậu trung bình của cả nước.

Vox Director local tạo 17 shot, dùng framing/action-focus thật trong Remotion. Remotion dựng bản đồ, camera, cờ, người minh họa, nhiệt kế, giọt mưa biến mất, đảo sáng dần, đường nối đồng hồ hải ngoại và đường bờ Canada. HyperFrames dựng 180 PNG RGBA đèn parol được dùng ở cảnh Philippines. Không sao chép footage, voice, soundtrack hoặc watermark của mẫu.

Bản đồ định vị Natural Earth 5.1.2, NASA Blue Marble tổng hợp 01/2004. Giữ geometry/đảo; 77 feature đảo Việt Nam và Hoàng Sa/Trường Sa trong bản đồ chính/locator. Locator ở header riêng tránh hoạt cảnh và đường nối. Nguồn, phép chuyển chiếu, checksum và giấy phép kèm source.

## Voice và caption

Một TTS task Vbee HN - Anh Khôi, tốc độ 1.0, dùng lại cache. Audio thật 66,939875 giây; master/video 67,5 giây. Căn lời local faster-whisper small; 206 nhóm timing, sửa chính tả/số theo script có correction log; cụm gộp giữ interval đo được, không chia đều. Timing ASR là ước lượng.

Rà phụ đề toàn timeline phát hiện bản/đồ, hòn/đảo, tiếp/giáp, trước/tiên và trang đuôi lẻ. Đã regroup 32 trang, chứng minh text/order/timestamp từng nhóm và hash voice/master không đổi. Không gọi lại TTS/ASR. SRT lưu trang, karaoke lưu trong JSON/component.

## Kiểm chứng media

- Preflight snapshot cuối: 439 frame, không overflow/overlap, tối đa 2 dòng, highlight khớp interval.
- 24 canvas Studio 100% qua CUA; JPEG transport profile giữ ngưỡng mean RGB <3, fraction >30 <2%. Không nhận lossless pixel identity. SourceHash cuối `770503c9d516623ffe23a77e732f0cd8306bd8998ca7caf34f0ced55c0c9345f`.
- Studio playback 1× đã quan sát frame tiến; ghi phạm vi trong studio-review.json, không coi là kiểm nghe độc lập hay benchmark độ mượt.
- Export audit 2025 frame, không lỗi browser/runtime.
- 72 frame MP4 giải mã so native, tất cả đạt ngưỡng đã đặt. Đã xem contact sheet giải mã mọi cảnh, hook và kết; mọi trang caption được rà riêng.
- Codec, kích thước, duration, frame count và CFR/PTS đạt. Mux giữ nguyên 2025 packet hash/PTS/DTS và decoder config.
- Audio: correlation 0.999807, SNR 34.07 dB, 0 clipped samples. −16,3 LUFS, true peak −2,0 dBFS sau AAC. Đủ đuôi tiếng và số sample master.
- ZIP 448 entry, CRC và SHA mỗi entry đạt; không có configured key/private task/account metadata/node_modules/bundle/frame QA.

## Lỗi và cách tránh lặp

requestFullscreen bị trình duyệt từ chối đã tạo overlay trong screenshot. Reload, bỏ fullscreen, dùng canvas 100% vừa viewport rồi chụp lại toàn bộ; không nới tolerance. Chụp ngay sau seek có thể thấy nền đang tải: đợi trạng thái ảnh ổn định và kiểm pixel thật. Sau sửa caption phải fingerprint/preflight/parity/export lại trên snapshot mới, không tận dụng báo cáo trước.

## Trạng thái

Nội dung: đạt phạm vi 8 ví dụ sau đối chiếu nguồn. Media: MP4 cuối qua gate. Source, word timing, SRT, credit/license và báo cáo đã giao. Không còn việc bắt buộc trong yêu cầu này; không có tập tiếp theo mặc định. Không chỉnh series kinh đô hoặc các video GDP đã chốt.

Dọn sau bàn giao: 1,404,360,374.0 byte cache/frame QA/draft có thể tạo lại đã xóa theo manifest trong project. Hash MP4/ZIP giữ nguyên, source/runtime/cache TTS và báo cáo còn đầy đủ.


V2 tăng hoạt ảnh thay thế bản media V1; xem [hồ sơ V2](WORLD_EXTREMES_VI_V2.md). Bằng chứng V1 giữ làm lịch sử và cache/source còn phụ thuộc; MP4/ZIP hiện hành ở V2.
