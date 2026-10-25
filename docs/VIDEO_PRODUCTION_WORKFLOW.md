# Quy trình sản xuất video: giảm thời gian lặp, giữ chất lượng

Cập nhật 22/10/2026, sau video G7. Đọc cùng [AGENTS.md](../AGENTS.md) trước khi làm video. Yêu cầu hiện tại của người dùng và các gate bắt buộc vẫn được ưu tiên.

## Mục tiêu và trạng thái

Giảm việc dựng thủ công, phát hiện lỗi muộn và chạy lại các bước không thay đổi. Mục tiêu thử nghiệm: 20–40 phút cho video khoảng một phút với nội dung/asset quen thuộc; đây chưa phải benchmark hoặc cam kết thời gian. Nội dung cần nghiên cứu, số hóa ranh giới hoặc tạo asset mới có ngân sách riêng.

Các thao tác dưới đây có thể áp dụng ngay. Bộ điều phối một lệnh, cache theo phụ thuộc và benchmark tự động **chưa được triển khai thành pipeline dùng chung**. Không báo đã tối ưu tốc độ chỉ vì tài liệu này tồn tại.

## Luồng thực hiện

1. **Lập hồ sơ nội dung ngắn.** Chốt phạm vi, nguồn/năm, coverage, tỷ lệ, voice, thời lượng dự kiến và tiêu chí giao. Tạo bảng lời đọc → hình/biểu đồ → cue. Chọn cách kể hình riêng cho chủ đề; giữ bản đồ là nền chính khi người dùng yêu cầu. Chỉ xin duyệt nếu phạm vi hiện tại yêu cầu duyệt trước.
2. **Kiểm đầu vào sớm.** Dùng runtime/font/cờ/geometry có nguồn đã ổn định. Kiểm decode, kích thước, chữ tiếng Việt và vài góc camera khó trước khi dựng toàn bộ. Không sao chép caption/audio/timing cũ sang video mới. Khi tái sử dụng project, đổi metadata đúng video và kiểm schema ngay.

   Kiểm cả dung lượng trống trước job dài, tính cả frameQA, bản encode tạm, file giải mã và gói source. Nếu ổ đầy, chỉ dọn đúng dữ liệu đã được phép và có thể tái tạo; không suy ra quyền xóa profile browser của tác vụ khác. Với helper Remotion4.0.536 của bản map-film V2, `renderFrames` nhận danh sách frame giúp dùng lại trang Chromium khi kiểm nhiều mốc; đây là thay đổi ở helper riêng, chưa phải bộ điều phối dùng chung hoặc bằng chứng tốc độ đã đạt mục tiêu.

3. **Tạo hoặc dùng lại voice có cache.** Khóa script trước TTS; lưu task và khóa cache theo tài khoản/provider/voice/script/tốc độ. Đo audio thật, dùng word timing thật rồi chia cảnh. Chuẩn bị asset độc lập trong lúc chờ bằng công cụ hiện có; không tự suy ra quyền chạy sub-agent hay upload ASR. “Tiếp tục” phải resume, không gọi lại TTS đã xong.
4. **Dựng và kiểm nhanh.** Theo [cách kể bằng diễn biến, không bằng slide](VIDEO_VISUAL_STORYTELLING.md): chuyển câu nói thành đối tượng/hành động/kết quả, để camera và bản đồ dẫn chuyện; không mặc định sidebar, card grid hoặc bảng giữ lâu. Dựng đoạn khó10–20giây và xem ở tốc độ thật trước khi nhân rộng. Dùng thêm12–20khung đại diện để bắt lỗi bố cục, cue và chữ dài; contact sheet không thay review chuyển động. Đây là gate nháp, không thay gate giao cuối.
5. **Khóa snapshot rồi kiểm đầy đủ.** Tạo fingerprint source/data/asset/font/runtime/cấu hình. Chạy đủ kiểm tra coverage, nội dung/timing, toàn bộ trang phụ đề, ranh giới cảnh, bố cục/geometry và preview–renderer parity theo hợp đồng của video. Có thay đổi ảnh hưởng đầu ra thì vô hiệu hóa bằng chứng liên quan. Không dùng báo cáo của snapshot cũ để xuất bản mới.
6. **Xuất và xác minh một bản cuối.** Chỉ một render nặng hoạt động tại một thời điểm. Kiểm audit toàn bộ frame, frame count/PTS, hình giải mã, audio thực, karaoke, endpoint và attribution. Sửa lỗi rồi kiểm lại phần phụ thuộc; không giảm chuẩn hoặc nới tolerance chỉ để nhanh hơn.
7. **Giao và dọn tự động khi có công cụ.** MP4, source tái dựng được, SRT/word timing và nguồn/giấy phép; quét credential và kiểm ZIP. Chỉ dọn bản cũ/file tái tạo được sau khi bản mới vượt gate, theo phạm vi người dùng đã cho phép. Giữ paid cache và đầu vào dùng chung.

## Khi sửa, chạy lại đúng phần phụ thuộc

| Thay đổi                    | Công việc cần làm lại                                                                                                                                 |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chỉ camera, màu hoặc bố cục | Khóa hash script/voice/master/timing; kiểm hình, parity và xuất mới                                                                                   |
| Script hoặc voice           | TTS/alignment phần thay đổi; tính lại các cảnh/caption/cue/audio bị ảnh hưởng và toàn bộ gate đầu ra liên quan                                        |
| Nhạc hoặc SFX               | Mix, kiểm nghe/loudness/clipping/endpoint và parity audio; chỉ giữ video bằng stream copy nếu hình/timing thực sự không đổi, có bằng chứng packet/PTS |
| Nguồn/số liệu/geometry      | Kiểm nguồn/coverage/phép tính rồi chạy lại hình, nội dung và timing bị ảnh hưởng                                                                      |
| Chỉ tài liệu kèm theo       | Kiểm link, provenance, giấy phép và gói source; không gọi lại TTS hoặc render MP4 nếu đầu ra hình/tiếng không đổi                                     |

Cache chỉ hợp lệ khi fingerprint đủ phụ thuộc vẫn trùng. Render theo đoạn phải xét camera vào/ra, chuyển cảnh, project time, audio và cue liên cảnh; chưa có cơ chế này thì không tự ghép các đoạn cũ.

## Backlog kỹ thuật theo thứ tự ưu tiên

- [ ] Bộ chạy chung với các bước prepare → voice → preview → check → render → verify → package; manifest trạng thái, đường dẫn tuyệt đối từ project root, lỗi có bước cụ thể và resume idempotent. Tên bước là thiết kế dự kiến, chưa phải lệnh CLI đang có.
- [ ] Ghi log start/end, elapsed, cache hit/miss và số lần retry cho từng bước. Phân biệt thời gian máy chạy, thao tác dựng và chờ người dùng; mtime file không đủ đo đầy đủ hai giờ làm việc.
- [ ] Chuẩn hóa/cache basemap, font và cờ dùng chung; asset mới phải qua smoke test trước. G7 đã chứng minh PNG lossless khắc phục sai khác lấy mẫu JPEG trong trường hợp đó; không kết luận mọi ảnh đều phải chuyển PNG.
- [ ] Kiểm nhanh có chọn mẫu và cache theo phụ thuộc; giữ gate đầy đủ trên snapshot cuối. Dùng lại browser/bundle khi còn hợp lệ, tránh dựng lại hạ tầng cho từng lần chụp.
- [ ] Benchmark cùng đoạn đại diện khoảng 10 giây ở vài mức concurrency; đo wall time, RAM, lỗi và chất lượng. Chọn theo máy thực, không mặc định tăng luồng là nhanh. Chỉ thử encoder/capture/GPU khác khi phiên bản cài hỗ trợ; đối chiếu parity và chất lượng trước khi áp dụng.
- [ ] Đóng gói, quét key, kiểm hash và dọn dữ liệu bằng một bước có manifest, kiểm đường dẫn và bảo vệ dependency/cache.

Không cài thêm repo, nâng runtime hoặc mua phần cứng trước khi xác định nút thắt. Remotion dựng hình; HyperFrames/Vox Director chỉ tham gia khi có vai trò hữu ích hoặc yêu cầu cụ thể, không tự thêm ba lượt xử lý cho mọi cảnh. Báo đúng engine đã thực sự dùng.

## Bằng chứng và nguồn

[Hồ sơ G7](phases/phase-6/G7_VIDEO.md) lưu snapshot, parity, render và media verification. Mốc file G7 cho thấy voice có lúc 19:20, build/timing lúc 19:27, preflight cuối lúc 21:36 và render hoàn tất lúc 21:47; chưa có log đủ để quy toàn bộ khoảng cách này cho một tác vụ cụ thể.

Tài liệu chính thức: [Remotion performance](https://www.remotion.dev/docs/performance), [benchmark](https://www.remotion.dev/docs/cli/benchmark). Kiểm phiên bản runtime cài thực tế trước khi dùng tùy chọn mới.
