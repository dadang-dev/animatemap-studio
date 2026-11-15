# APEC V2 — đọc được thông tin và bổ sung Phú Quốc

Yêu cầu ngày 23/10/2026: sửa chữ chìm trên băng trong video APEC, dùng thực Remotion, HyperFrames và Vox Director, bổ sung APEC 2027 tại Phú Quốc.

## Phạm vi và thiết kế

- Tạo bản riêng `.local/apec-v2`, composition `APEC-V2`, preview loopback port3025. Giữ bản giao V1 tới khi V2 qua gate.
- Đặt Thái Bình Dương giữa hai bờ châu Á/châu Mỹ; giới hạn vùng tổng quan để băng Nam Cực không nằm sau thông tin. Thẻ số61%,21thành viên và2027 dùng nền tối đặc, màu tương phản; nhãn phụ trên vùng tuyết cũng có nền riêng.
- Bổ sung đúng phạm vi **Tuần lễ Cấp cao APEC2027 tại Phú Quốc**, sự kiện tương lai đang chuẩn bị. Lời đọc ghi Việt Nam chủ nhà lần3 sau2006/2017. Không dùng ảnh2017 để giả hội nghị2027.
- Pin104.01,10.28 được kiểm trong polygon đảo thuộc VNM Natural Earth5.1.2, có xét lỗ. Inset phóng to nguyên polygon9, không đơn giản hóa/toàn vẹn39điểm nguồn; inset không cùng tỷ lệ với bản đồ chính. Điểm khái quát103.96,10.22 trước đó không nằm trên phần đất nên không được dùng.
- Chỉ tạo mới voice cảnhfuture bằng Anh Khôi1.0. Cả26fileWAV/word JSON của13cảnh khác giữ nguyênSHA256; căn lời mới bằng faster-whisper1.2.1 small/int8 local, không upload audio. Tổng3217frame,107,233333giây,1080×1920/30fps,14cảnh và61trang karaoke.

## Đóng góp thực của ba engine

Vox Director local, commit6a85a7c341610442a6a5b1885e6e0217ab82a11f, gọi managed Codex CLI tạo26shot trong72,644giây. Plan được validate trên timeline thực và ánh xạ phần thay đổi thời lượngfuture; framing/treatment điều khiển model camera và chuyển động ảnh. Không đọc token đăng nhập hay giả API media.

HyperFrames0.8.168 kiểm lint/runtime/layout và15/15kiểm tương phản, dựng270PNG alpha/30fps cho ba thẻ đồ họa. Chuỗi1-based được chọn theo frame trong Remotion, giữ frame cuối thay vì lặp tùy ý. HTML, GSAP3.14.2, font, PNG và giấy phép có trong gói nguồn. GSAP không phảiMIT; HyperFramesApache2 và VoxMIT.

Remotion4.0.536 dựng composition đầy đủ: bản đồ, cờ/callout, hai ảnh tư liệu có license, biểu đồ, đồ họa HyperFrames và karaoke. Studio/render dùng chung model. JSON native chỉ là nguồn nội dung/bản đồ, không thể một mình tái hiện toàn bộ compositing.

## Lỗi phát hiện khi kiểm

Kiểm hộp chữ V1 đạt nhưng chữ trắng trên băng vẫn khó đọc. Gate mới xem contact sheet kích thước điện thoại và khung gốc, gồm vùng tuyết, nhãn phụ, ảnh và Phú Quốc. Không dùng layout pass để suy ra chất lượng thị giác.

Một cảnh tổng quan có sai khác rasterSVG Studio/render khoảng0,0633RGBA/255, vượt ngưỡng0,05. Phép thử đổi compositing layer không giải quyết. Cách sửa cuối là tạo platePNG lossless từ chínhSVG nguồn tại camera tổng quan cố định, bỏ foreground/shade khi tạo, dùng1:1 trong cả hai đường hiển thị; các cảnh cận vẫn dùng SVG gốc. Đường hàng hóa và pin dùng cùng phép chiếu. Có script, camera và SHA256 nguồn/plate; không nới ngưỡng parity. Thông tin chi tiết tại `.local/apec-v2/pacific-plate.json`.

## Bằng chứng bàn giao

12test nội dung/reuse/geometry/engine, strictTypeScript và ESLint; schema và3217frame native deterministic. Preflight130khung gồm caption/cảnh/biên; kiểm riêng21thẻ thành viên và14mẫuStudio độc lập. Mọi bằng chứng gắn snapshot source/asset/font/lockfile. Báo cáo đầy đủ sau render và giải mã tại `.local/apec-v2/production-report.json`, `verification.json`, `mux-check.json`, `delivery.json`; chỉ trạng thái pass của các báo cáo này xác nhận bản giao.

Đầu ra cuối: `.local/apec-v2/APEC-Phu-Quoc-2027-V2.mp4` và `.local/apec-v2/APEC-V2-editable-source.zip`. Nguồn thực tế/giấy phép: `SOURCES.md` và `LICENSE-*` trong gói. Dọn bản cũ/fileQA sau gate theo mục10AGENTS, giữ paidcache, media/source còn được dùng và junction runtime.


## Kết quả cuối

Tất cả gate đạt. Render3217frame trong295,776giây; preflight130khung trong146,469giây;14mẫuStudio đạt, sai khác lớn nhất0,028967RGBA/255. So151khung giải mã: meanRGB lớn nhất1,999277/255, không nới ngưỡng3/255. H.264/yuv420p, AAC48kHz stereo,107,233333giây,faststart; mọiPTS/frame count và endpoint đạt. Audio correlation0,999793, SNR33,77dB, clipping0. Mux giữ nguyên3217packet video/PTS/DTS sau bước chuẩn hóa màuBT601limited.

MP4:147.545.193byte, SHA256 `a4c1fadef008cd124ff5f388f862b1f8010b5d9108565f2ac769062524e59f2d`. ZIP:57.519.008byte,408entry, SHA256 `23bd808ac67ac2c291055ab1f4ec65de366f07156bd9bc8a412b29b722ec3387`; credentialscan và kiểm toàn bộentry integrity đạt. Dọn1.067.479.665byte gồmV1MP4/ZIP và fileQA/intermediateV2; giữV1runtime vìV2node_modulesjunction còn dùng, giữsource/paidcache. HashMP4/ZIP vàdependency kiểm lại sau dọn đạt. Bản cuối có trong danh sách `docs/VIDEO_LIBRARY.md`.
