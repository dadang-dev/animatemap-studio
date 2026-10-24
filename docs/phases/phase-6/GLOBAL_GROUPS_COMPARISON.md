# NATO, EU, BRICS, G7, APEC — video dài ngang 16:9

Hoàn tất: 25/10/2026. Nguồn nội dung đóng băng theo lần đối chiếu 24/10/2026.

## Phạm vi đã giao

Người dùng yêu cầu video dài phân biệt năm nhóm và chọn khung **ngang 16:9**. Bản hoàn chỉnh **290,6 giây / 8.718 frame, 1920×1080, 30fps**, giọng Anh Khôi tốc độ1.0, karaoke, nhạc và SFX. Hook “Năm cái tên, năm kiểu quyền lực!” kết thúc khoảng2,08giây. Không thêm ASEAN/OPEC từ script tham khảo vào phạm vi.

- [MP4 hoàn chỉnh](<C:/Users/PC/OneDrive/Desktop/VIBECODE/AnimateMap Studio/.local/global-groups/NATO-EU-BRICS-G7-APEC.mp4>)
- [Source chỉnh sửa](<C:/Users/PC/OneDrive/Desktop/VIBECODE/AnimateMap Studio/.local/global-groups/Global-Groups-editable-source.zip>)
- [Preview Studio](http://127.0.0.1:3027/Global-Groups)
- [Nguồn và giới hạn](<C:/Users/PC/OneDrive/Desktop/VIBECODE/AnimateMap Studio/.local/global-groups/SOURCES.md>) · [Báo cáo công cụ](<C:/Users/PC/OneDrive/Desktop/VIBECODE/AnimateMap Studio/.local/global-groups/ENGINE_REPORT.md>)

MP4: **215145921byte**, SHA256 `d92f75e8390693ec137e7cc0ea4e3093f78732981c07f8f7ebd01d2392cab1c5`. Source ZIP: **117398676byte**, SHA256 `917e388aeedd5347bb5e021231b7ad303419be077d402450a7a22486ed69ed36`, 711entry đã kiểm integrity và credential.

## Nội dung và thiết kế

Phân biệt NATO32 và Điều5; EU27, euro21 từ01/01/2026 và Điều42(7); BRICS11 theo Chủ tịchẤnĐộ2026 gồmSaudiArabia; ViệtNam là đối tác từ06/2025; G7 bảy nước và EU tham gia; APEC21nềnkinhtế, cơ chế đồng thuận tự nguyện, ViệtNam1998 và Tuần lễ Cấp cao2027 tạiPhúQuốc. Ví dụ Đức, Mỹ, TrungQuốc cho thấy các tư cách có thể chồng lấp. Hai bảng tổng kết tách thị trường/tiền tệ với cam kết an ninh. Không xếp hạng quyền lực/GDP.

Bản đồ trái, cột ngữ cảnh phải, sơ đồ cơ chế, ảnh tư liệu và bảng so sánh thay cho việc kéo dãn template dọc. NaturalEarth5.1.2 giữ geometry, đảo/lỗ; unwrap và worldcopies khi chiếu. Crimea/Sevastopol phủ trung tính theo geometryAdmin1 gốc. NASA BlueMarble01/2004 không phải vệ tinh trực tiếp. Năm ảnh tư liệu2010/2017/2022/2024 có tín dụng và license; không dùng như đội hình lãnh đạo2026. Năm bộ màu nhận diện không thể hiện phạm vi Điều5 hay mức độ quyền lực.

## Ba công cụ thực sự đã làm gì

| Công cụ            | Đầu ra và tác động thực tế                                                                                                                                                                                 |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Remotion4.0.536    | Composition dùng chung cho preview/export,8platePNG bản đồ từ geometry/raster nguồn, neo động cùng phép chiếu, ảnh, bảng so sánh, karaoke và audio. Audit đủ8.718frame.                                    |
| HyperFrames0.8.168 | Sáu sơ đồ GSAP ×3giây; xuất540PNGalpha đưa thật vào composition. Lint/runtime/layout đạt; automaticcontrast không kiểm được phần tử nào nên review ảnh riêng, không báo là contrast tự động đã chứng minh. |
| VoxDirector local  | CodexCLI tạo55shot đã validate; scene-local framing/treatment điều khiển lens bản đồ, mở ảnh/push/hold. Không tạo voice/ảnh và không mạo nhận API media.                                                   |

Native JSON là planning/map/timing/caption, **không tái hiện toàn bộ composite**. ZIP có source Remotion/HyperFrames, shot plan, ảnh/font/license, audio/timing/SRT và lockfile. Không chứa key, node_modules, rawresponsebase64, .git hoặc frameQA.

## Kiểm tra đã đạt

| Kiểm tra                | Kết quả                                                                                                                                                                      |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vitest hiện tại         | 7test đạt: schema/plan, xác định mọiframe, biên cảnh, membership/euro/overlap, cue thật, audio/timing, các phân biệt nội dung                                                |
| TypeScript / ESLint     | Đạt trên source composition                                                                                                                                                  |
| Native schema/evaluator | Zod hợp lệ,20scene/290,6giây,8.718frame xác định; không tăng schema limits                                                                                                   |
| Preflight / feature     | 496mốc: tất cả142trang caption, biên cảnh/shot±1frame, count/name/currency/PhúQuốc và HFanimation; không overlap/overflow;8plate có địa hình thật;5pin nằm trong polygon gốc |
| Studio–renderer         | 20mẫu cảnh, meanRGBA tối đa0; ngưỡng<0,05/255                                                                                                                                |
| MP4 giải mã             | 496frame; meanRGB tối đa1.9000, tỷ lệpixel sai kênh>30 tối đa1.0126%; ngưỡng<3 và<2%                                                                                         |
| Video/audio endpoint    | H264/yuv420p, AAC48kstereo, faststart; container/video/audio đúng290,6giây; PTSframe=i/30                                                                                    |
| Audio                   | correlation0.999832, SNR34.68dB, clipping0; loudness trongartifact                                                                                                           |
| Mux                     | Packet hash, PTS/DTS và duration của video chuẩn hóa không đổi khi mux master                                                                                                |
| SourceZIP / dọn         | Integrity/credential scan đạt; xóa1657file tái tạo được, 1809621609byte; hash MP4/ZIP và runtime còn đúng                                                                    |

Lệnh: `pnpm exec vitest run --config .local/global-groups/vitest.config.ts`; `node node_modules/typescript/bin/tsc`; `node node_modules/eslint/bin/eslint.js src`; `node render.mjs check`; `node --import tsx .local/global-groups/feature-check.ts`; `node .local/global-groups/parity.mjs`; `node render.mjs bench`; `node render.mjs render`; `node .local/global-groups/finish.mjs`. Các lệnh trongremotion chạy từ thư mục đó; lệnh có.local chạy từworkspaceroot. Không tuyên bố đã chạy lại toàn bộ CI nền tảng vì không sửa nền tảng.

Render chính: **502.3giây**, benchmark chọn4worker. Wallclock từ setup tới bàn giao gồm thời gian gián đoạn qua đêm, không đại diện thời gian làm việc liên tục; chi tiết trongrun-log. Không gọi đây là benchmark pipeline đã đạt mục tiêu thời gian.

## Lỗi gặp và giới hạn

- Worldplate trống: SVGimage chưa decode ở cảnh ítpath. Sửa readiness cho raster nguồn, dựng lạiplate và chạy lại snapshotgate; thêm kiểm pixel địa hình để ngăn tái diễn.
- ASR local small/int8:31sửa tên/đồng âm theo inputTTS; giữ rawASR/interval. Ba cặp E/.U. được gộp thànhEU bằng đúng unioninterval để hiển thị, không chia đều timestamp. Không upload audio; timing vẫn là ước lượng, không tuyên bố đã nghe độc lập.
- LongstereoPCM vượt100MiB: buffer kiểm thử128MiB theo hợp đồng≤300giây; không nới embeddedassetguard.
- Render bị ngắt: giữ paidcache/audio/timing/source, xác nhận không có job còn chạy rồi xuất snapshot đã đạt. Không tính bản dở là hoàn thành.
- MP4JPEGcapturefullrange được chuyển mẫu BT601limited thực sự, không chỉ đổi metadata; decodedframe tolerance giữ nguyên.
- Dọn chỉ thư mục hiện tại: giữ source, toàn bộ HFframe/plate đang được preview dùng, paidvoicecache và junctionruntime dùng chung; không đụng video chủ đề khác.
