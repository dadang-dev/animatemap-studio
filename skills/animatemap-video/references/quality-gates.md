# Gate chất lượng và tính tái lập

Đọc trước xuất/giao hoặc khi chuyển máy.

1. Nội dung: đủ phạm vi, đúng định nghĩa/năm/đơn vị, câu hỏi có đáp án/kết luận. Mỗi ý có đối tượng và diễn biến nhìn thấy được. Ảnh thật đúng nơi/ngữ cảnh/năm và có quyền dùng.
2. Timeline: đo voice thật, giữ speech tail; caption half-open theo frame integer/FPS, không bịa timing. Tên/cụm từ không bị chia vô nghĩa. Giữ hash input khi chỉ sửa hình.
3. Hình: font Việt ghim, chờ subset chứa glyph Việt trước đo Canvas; chờ ảnh decode. Kiểm nhãn/panel/leader với địa lý và actor, không chỉ hộp chữ. Đổi ảnh/SVG theo identity và kiểm before/at/after bằng pixel thật.
4. Bản đồ: giữ path/hole/MultiPolygon, chú thích dữ liệu tham chiếu/khái quát. Locator Việt Nam đủ đảo/nhãn Hoàng Sa/Trường Sa; không nhận77 feature là kiểm kê pháp lý đầy đủ.
5. Preview: cùng canvas/font/GL/profile với renderer; quan sát playback1×, không suy mượt từ DOM frame đổi. Studio capture độc lập và native PNG; nếu CUA trảJPEG, ghi phép so quantization/subsampling và bounds thật. Không gọi lossless identity khi ảnh nén.
6. Render: fingerprint source/assets/runtime/browser/profile, audit đầy đủ frame và mọi cue/caption/ảnh; không reuse cache khác snapshot. RGB lossless cache phải chứng minh trước khi giải phóng PNG của đúng job.
7. MP4: H.264/yuv420p,30fps,1080×1920, đúng N/PTS/duration, BT.709limited, faststart. Mux không tự bảo đảm picture packets/config; giữ proof khi stream-copy video.
8. Giải mã: so PNG theo đúng frame, gồm hook/scene/caption/image transitions/last. Profile có sẵn meanRGB<3/255 và dưới2% pixel sai bất kỳ kênh>30; không nới để làm pass. Baseline native/raw có thể có khác raster rất nhỏ trên GPU, phải ghi số đo và nguyên nhân.
9. Âm thanh: master đủ endpoint, decoded AAC đủ số sample, không clipping, correlation>.99 và SNR>25dB so master. Nghe pilot thật; không báo đã có người nghe độc lập toàn bộ khi chỉ kiểm máy. So hash script/voice/timing nếu sửa hình.
10. Giao: source/asset/lock/license/timing dựng được, ZIPCRC/SHA và secret scan. MP4 pass không tự là content approval. Chỉ dọn đúng phần đã được phép, kiểm junction/phụ thuộc/hash và mở lại preview.

Smoke sáu giây kiểm cơ chế, không xác nhận creative direction, giọng dịch vụ live, nội dung lịch sử/địa lý mới hay toàn bộ mọi bố cục tùy biến. Engine/API native và engine Remotion portable có các báo cáo riêng. File config chất lượng là mặc định có thể kiểm, không phải lời hứa mọi phần cứng hoặc AI sinh ra cùng một sản phẩm.
