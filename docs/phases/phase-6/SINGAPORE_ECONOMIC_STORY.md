# Singapore — địa lý và thành công kinh tế

Hoàn tất ngày 27/10/2026. Người dùng cung cấp nội dung đã duyệt và yêu cầu không thêm/bớt/xác minh; script nguyên văn lưu trong `.local/singapore-economic-story/approved-script.txt`, coverage/lock trong content-checks.json và snapshot-lock.json. CRLF của file và LF chuẩn hóa trong story có hai hash riêng; chỉ chuẩn hóa xuống dòng khi so sánh, không sửa nội dung.

Composition `Singapore-Economic-Story`, Studio cổng3036; 14 cảnh, 118,4 giây, 3552frame,1080×1920/30fps,73trang karaoke. Remotion4.0.536 composite và xuất. HyperFrames0.8.168/GSAP3.14.2 tạo540PNG trong suốt cho cảng/container/cần cẩu, nhập–lọc–xuất dầu và hợp đồng/ngân hàng. Vox Director thực qua Codex CLI tạo24shot, đã áp dụng vào camera. Cảnh truyền hình1965 là vector gốc, ghi rõ minh họa; geometry hiện đại chỉ định vị, tuyến tàu là sơ đồ.

Giọng HN–Anh Khôi/Vbee1.0: một task toàn bài và một task sửa đoạn ba số thứ tự; tái sử dụng13đoạn còn lại. ASR faster-whisper local, không upload audio. Hiệu chỉnh chính tả/tên và nhóm timing lưu riêng; coverage chữ không được coi là bằng chứng âm học độc lập. Hook lời đọc dài5,02giây được giữ nguyên theo ưu tiên kịch bản đã duyệt. Standalone mix-audio.py tái tạo đúng từng byte PCM master từ14WAV và nhạc/chime lập trình gốc.

## Bản đồ và lỗi đã xử lý

Giữ path quốc gia gốc;77feature đảo Việt Nam khớp chính xác với hai tập Natural Earth5.1.2 gốc ở độ chính xác xuất4chữ số Mercator.18Hoàng Sa,22Trường Sa và37feature khác. Hai quần đảo có geometry/nhãn ở bản đồ chính châu Á và locator. Không coi nguồn1:10m là kiểm kê mọi đá/bãi/rạn hoặc bản đồ pháp lý. Nguồn/checksum và đối chiếu nguồn chính thức Việt Nam trong SOURCES.md, sources, island-coverage.json.

Kiểm chuyển động bắt tuyến tàu đi qua locator lúc camera đang mở rộng. Sửa hai cảnh toàn cầu sang toàn cảnh ngay đầu cảnh;497frame kiểm segment/trajectory với locator đều đạt. Không chỉ kiểm hộp chữ. Các cảnh khác giữ camera tiếp cận Singapore và chuyển động theo shot. Một số ảnh chụp ngay sau seek có vùng compositor chưa cập nhật; chờ trạng thái đã ổn định và chụp lại, không nới tolerance.24frame Studio cuối khớp renderer theo profile ảnh nén meanRGB<3/255 và dưới2%pixel lệch kênh>30; không gọi là lossless identity.

Blue Marble toàn cầu8192px từng lỗi decode; dùng4096px giữ extent. Bundle Remotion có symlink ảnh hoạt cảnh khiến server trả404; helper materialize bản bundle thành file thực, giữ nguyên asset nguồn. Không cài hoặc nâng runtime để chữa các lỗi này.

## Gate và bản giao mới nhất

TypeScript/schema/content coverage đạt; native evaluator lặp3552frame deterministic.236frame preflight và24frame parity; audit full3552frame không lỗi. MP4 giải mã toàn bộ236khung kiểm đạt. H.264 yuv420p, AAC48k stereo, endpoint container/video/audio118,4giây, CFR vàfaststart đạt.3552packet video cùnghash/PTS/DTS/decoderconfiguration sau mux từ PCM. Audio correlation0.999842,SNR34.93dB,clipping0; master−16,1LUFS,truepeak−1,4dBFS. Render stage cuối448,248giây, không phải benchmark tổng pipeline.

MP4: `.local/singapore-economic-story/Singapore-Dia-Ly-Va-Thanh-Cong-Kinh-Te.mp4` (36482577byte). Source: `Singapore-editable-source.zip` (34950414byte,663entry); mọi entry kiểm CRC/SHA, loại APIkey/task response/runtime/cache. delivery.json và package-check.json lưu hash cuối. Source có Remotion, HyperFrames HTML/PNG, Vox plan, WAV/timing/SRT, project tham chiếu, giấy phép và báo cáo. Không xóa video hoặc cache của chủ đề khác.
