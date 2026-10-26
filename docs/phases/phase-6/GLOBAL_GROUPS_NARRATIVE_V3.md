# Global Groups V3 — sửa hoạt cảnh lặp

Ngày: 25/10/2026. Người dùng chỉ ra chiếc khiên NATO với hai biểu tượng người bị phát lại, yêu cầu rà toàn phim và dùng Remotion/HyperFrames/Vox Director làm trực quan hơn. Đây là sửa hình trên V2, giữ nguyên script, giọng Anh Khôi1.0, master, timing/SRT và 290,6 giây ngang1920×1080/30fps.

## Nguyên nhân và thay đổi

V2 có81 beat nhưng nhiều beat chỉ chọn lại cùng một trong tám actor stock; nhiều cue/shot không đồng nghĩa nhiều diễn biến. V3 bỏ renderer đó khỏi MapStage, không còn khiên/người/vòng tròn stock được bật bằng actorIndex. MapStage giữ atlas/camera/neo địa lý; Narrative.tsx chịu trách nhiệm diễn biến cụ thể, Film.tsx giữ captions/audio và ảnh tư liệu có giấy phép.

- NATO: báo động → tham vấn → hỗ trợ liên tục qua hai cue; sau đó phân biệt quyết định của từng nước với các lựa chọn y tế/hậu cần/quân sự. Không restart cùng ba phương án khi đổi câu.
- EU: thể chế → luật; bốn làn hàng hóa/dịch vụ/con người/vốn qua biên giới minh họa; Bulgaria, vùng euro21/27 và tiền riêng được tách theo cue.
- BRICS: cờ/tư cách theo nguồn đã khóa, tiếng nói qua microphone, thanh toán nội tệ, NDB cấp vốn tới cầu minh họa. Việt Nam là đối tác, không nhập vào nhóm thành viên.
- G7: bảy ghế có cờ theo tên, EU riêng; tuyên bố đi tới quy trình thực hiện quốc gia, không một tờ giấy đóng dấu lặp.
- APEC: hai bờ/cảng,21cờ, tên chính thức; tàu vào cảng dỡ hàng; đồng thuận/tự nguyện và rào cản vẫn còn. Việt Nam1998 và Phú Quốc2027 giữ locator.
- Chồng lấp/so sánh/tổng kết dùng quan hệ và trạng thái kết quả mới, không phát lại nguyên các actor chính.

Primitive SVG có thể dùng chung; không coi đổi chữ trên cùng primitive là diễn biến mới. Đồ họa giải thích cơ chế, không khẳng định một sự kiện, vận tải hay khoản đầu tư cụ thể.

## Vai trò công cụ thực tế

Remotion4.0.536: evaluator thuần theo frame, camera/atlas/neo, chuỗi native, cờ qua CanvasImage readiness, captions/master và xuất PNG→H.264. Preview/export dùng cùng source.

HyperFrames0.8.168/GSAP3.14.2: năm chuỗi riêng,600PNG-alpha, mỗi chuỗi dùng một lần rồi giữ kết quả. Chuỗi NATO liên tục qua hai cue thay vì restart. Đã sửa lỗi GSAP x/y ghi đè translate SVG khiến ba tài liệu tụ vào cùng chỗ; render lại và lint/runtime/layout đạt, không đánh dấu allow-overlap để bỏ lỗi.

Vox Director local: thực sự gọi CodexCLI, trả71shot, toolCalls0; validate rồi áp framing/treatment vào camera. Không tạo voice/media bằng một API giả. Bảng diễn biến đầy đủ: `.local/global-groups-v3/VISUAL_REVIEW.md`.

## Gate trước render

Snapshot: `a57b225795f51a1f179a2dbc490f8c974a12dd236fc4869f33de46a3caf8c033`.

TypeScript/ESLint và7unit test đạt. Preflight785frame gồm cue/scene/shot/caption, kiểm cả chữ SVG. Feature kiểm atlas/pixel đầu cảnh, khóa nội dung, camera. Studio parity20mẫu đạt ngưỡng meanRGBA0,05. Benchmark300frame PNG so2/4worker:45,18/41,77giây; chọn4. Tám mẫu mã hóa khó đạt meanRGB tối đa1,770, giữ nguyên ngưỡng3 và fractionAbove30 dưới0,02.

Đoạn NATO thật20giây/600frame được dựng lại; rà ảnh theo nhịp1giây, trước đó0,5giây phát hiện lỗi phát lại nhánh. Studio playback1× đã quan sát trạng thái đầu/cuối, không tuyên bố đã nghe/xem liên tục toàn bộ phim. Cờ SVG dùng readiness chung thay vì chỉ dựa vào href trong DOM.

Các lần sửa ảnh hưởng output đều chạy lại gate trên fingerprint mới. `qa-stages.json` ghi riêng từng bước; không gọi tổng thời gian có gián đoạn là benchmark render.

## Bản giao

Đã giao ngày 27/10/2026: MP4 FullHD1920×1080,30fps,8718frame,290,6giây; H.264/yuv420p/faststart và AAC48kHz stereo. Render-audit, verification, seek-proof, mux-check, delivery đều pass. Video: .local/global-groups-v3/NATO-EU-BRICS-G7-APEC-V3.mp4; source: Global-Groups-V3-editable-source.zip; Studio http://127.0.0.1:3029/Global-Groups-V3.

Giữ V2 tới khi V3 đạt. Timing ASR local từ V1 vẫn là ước lượng; không có TTS/ASR/upload mới, không xác minh lại dữ kiện trong lần sửa chỉ hình. Nguồn/giấy phép và hạn chế bản đồ hiện đại được giữ trong source.

### Lỗi compositor tìm được khi kiểm MP4 cuối — 26/10/2026

Lần xuất đầu đủ frame và audit DOM nhưng 5/790 ảnh giải mã sai so với still: frame1810,2447,2491,2519,3152 giữ đồ họa SVG của beat trước. Không nới ngưỡng meanRGB3/fractionAbove30 0,02. Remount Narrative theo visualKey của cảnh/beat để Chromium bỏ lớp vẽ cũ; video regression ngắn trên cả5frame đạt, meanRGB lớn nhất1,751. Chạy lại gate trên source mới trước khi xuất dài. Giữ báo cáo thất bại trong verification-failed-stale-svg.json; audit DOM đạt không thay kiểm pixel MP4.

### Kết quả kiểm lại: remount chưa đủ

Lần xuất dùng ANGLE mặc định của máy sau remount vẫn có39/790khung vượt ngưỡng; ảnh giải mã cho thấy cả tiêu đề và SVG cũ còn lưu trên nền mới. Vì vậy regression ngắn5khung trước đó không đủ xác nhận đã xử lý triệt để. Giữ báo cáo verification-failed-angle-remount.json. Thử lại7đoạn/1052frame bằng SwANGLE (ANGLE với SwiftShader phần mềm), so36khung chọn trước gồm các điểm lỗi: tất cả đạt, meanRGB lớn nhất2,209 và fractionAbove30 lớn nhất0,008256. Chuyển capture, still, Studio parity sang cùng profile; đưa gl/browser/capture/color profile vào fingerprint để không tái dùng gate khác môi trường. Chưa coi thử ngắn là thay thế gate MP4 toàn phim.

### Render có thể tiếp tục cho bản này

render-chunks.mjs xuất frameRange tuyệt đối theo đoạn300frame; mỗi đoạn có browser riêng, source/profile fingerprint, audit và SHA256. Khi tiếp tục, chỉ reuse đoạn đủ điều kiện, không đổi project time hoặc audio/timing. Probe hai đoạn30frame kế tiếp (6840–6869,6870–6899) đạt4ảnh tại đầu/cuối/ranh giới,60packet giữ hash, PTS liên tục và decoder configuration giống nhau. Concat H.264 dùng auto_convert0 để không tự chèn SPS/PPS vào payload; kiểm PTS theo thứ tự trình chiếu, không nhầm thứ tự packet có B-frame. Đây là helper cho video này, chưa gọi là pipeline cache dùng chung của ứng dụng.

### Browser khớp phiên bản — 27/10/2026

SwANGLE với browser Playwright cũ vẫn có8/872mẫu vượt ngưỡng; không coi lần thử36mẫu là đã sửa triệt để. Giữ verification-failed-swangle-surface.json. Đã đọc mã renderer: screenshot-task.js có workaround DISABLE_FROM_SURFACE nhưng thử với binary cũ không capture được nên không áp dụng. get-chrome-download-url.js của Remotion4.0.536 xác định TESTED_VERSION157.0.8080.0; pipeline trước đó chỉ định browser Playwright1208 cũ. Tải browser đúng phiên bản bằng ensureBrowser() từ nguồn chính thức, không sửa global Chrome hoặc thư viện dùng chung. browser-profile.mjs tập trung launch/cấu hình và hash binary; metadata/hash tham gia snapshot. Chromium157 vượt42mẫu regression đã chọn trước và toàn bộ gate preflight/parity/motion/encoding. Gate MP4 toàn phim vẫn là điều kiện giao cuối.

### Kiểm tăng dần và sửa đúng đoạn

Chromium157 full render vẫn có ba mẫu sai trong hai đoạn G7:4967,5088,5190. check-chunks.mjs kiểm tăng dần theo hash video và native references, xác định28/30đoạn còn lại đạt. repair-chunks.mjs chỉ dựng lại4800–5099 và5100–5399: bảy subrange theo biên beat thật, browser mới và concurrency1; source/model/audio/timing không đổi. Mỗi subrange có audit/hash, decoder configuration và packet/PTS proof trước khi thay clip cha. Các đoạn đạt được reuse nguyên byte; không nới tolerance hoặc thay golden để bỏ lỗi. repair-report.json giữ hash cũ/mới và lý do; MP4 cuối vẫn phải qua872mẫu gồm mọi biên ghép.

Người dùng ngày27/10/2026 chọn “Hoàn tất và giao V3 trước”; bản V4 bổ sung biển đảo theo Skill_rules.MD được để sau. Automatic approval review đã chặn bước tạo V4 ngoài phạm vi trước khi ghi dữ liệu; không có thư mục/source V4 được tạo. Bản giao này giữ phạm vi sửa hoạt cảnh V3.

### Chứng minh lỗi ảnh tham chiếu

Hai mẫu5088 và5190 vẫn lệch sau dựng cô lập vì ảnh native cũ chứa đồ họa “Kinh tế/An ninh” dù evaluator trả kind=photo và Narrative phải null. fresh-photo-references.mjs kiểm60mẫu photo bằng hai trang capture độc lập/mẫu, đúng cùng browser/profile.58mẫu cũ giống hệt; chỉ5088/5190 khác. Hai capture mới của mỗi mẫu pixel-identical, audit DOM không có narrative-text; model/DOM xác nhận không được có đồ họa đó. Giữ PNG cũ và hash trong reference-repair/, reference-repair-proof.json rồi sửa đúng hai reference. Studio độc lập trên cả hai khung cũng meanRGBA=0, ghi trong reference-studio-parity.json. Đây là sửa harness có bằng chứng, không đổi source/model hoặc tolerance để bỏ lỗi. Kiểm tăng dần sau sửa:30/30đoạn,789mẫu đạt; gate MP4 cuối gồm872mẫu được chạy lại.

## Kiểm bản cuối và dọn dữ liệu

Đối chiếu 872 frame giải mã, meanRGB lớn nhất 2.974537, tỷ lệ pixel lệch>30 lớn nhất 0.015524; giữ ngưỡng3/0,02. Năm mẫu seek đối chiếu từ đầu pixel-identical;8718packet video/PTS/DTS giữ nguyên khi ghép master. Audio correlation 0.999832, SNR 34.676dB, clipping 0.

MP4 440659717byte, SHA256 ce276aefa6cdd35befa2729a310fbcf8df5d6347462cbc3cb042ac691677f4ae. ZIP 219209293byte/867entry, SHA256 292b74e63190bbfe4566053cafa9ff9d7a35e1da0ee3568ed21a377cfa0c41b0; integrity và credential scan đạt.

Dọn 7853121878byte trung gian V3 và 694662551byte MP4/ZIP V2; manifest/biên nhận riêng, giữ source, paidvoice, asset và runtime dùng chung. Không dọn Downloads/system profiles.
