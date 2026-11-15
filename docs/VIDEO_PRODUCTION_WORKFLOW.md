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

## Bổ sung từ tập 1 kinh đô V2 — 29/10/2026

1. Khóa hash lời đọc, audio và word timing trước khi sửa hình. Phân biệt thay pagination/SRT với thay timestamp hoặc nội dung lời.
2. Chuẩn bị ảnh thật và minh họa AI trước render: xem ảnh thật, kiểm đúng địa điểm/di vật, chú thích, quyền dùng và provenance; giữ prompt/đầu ra ImageGen. Không coi kết quả tìm kiếm đúng tên là ảnh đúng.
3. Rà shot plan theo cue thực: tên → pin → ảnh bên dưới → diễn biến/kết luận. Callout ngang pin, leader ngắn; kiểm camera giữa các vùng và ảnh theo scene identity.
4. Kiểm nháp ở kích thước điện thoại rồi mới khóa snapshot: thứ bậc chữ, ngắt phụ đề theo nghĩa, số kèm đơn vị, số năm viết bằng chữ số, locator và ảnh không che nhau.
5. Bằng chứng của snapshot cuối phải gồm trang phụ đề, cue chữ/ảnh, camera flight và MP4 giải mã. Mở Studio chưa chứng minh parity; ghi rõ nếu chưa đo Studio độc lập.
6. Resume job/TTS có cache, lưu PID/log của đúng job nếu cần chạy dài; không tạo lại vì chat gián đoạn. Chỉ một render nặng tại một thời điểm.

Lỗi gặp: FFmpeg 9 không còn nhận `-vsync` → dùng `-fps_mode passthrough`, giữ nguyên số frame kiểm và ngưỡng. Báo cáo fingerprint dùng đường dẫn phù hợp cho dependency ở thư mục cha; lỗi ghi báo cáo không đồng nghĩa lỗi MP4 và không cần render lại hình.

Hồ sơ: [Kinh đô tập 1 V2](phases/phase-6/VIETNAM_CAPITALS_SHORTS_EP01_V2.md).

## Bổ sung gate diễn giải toàn bộ lời đọc — 30/10/2026

1. Đọc [Skill_rules.MD](../Skill_rules.MD). Không cho phép có các đoạn chỉ thay chữ và giữ ảnh tĩnh, chưa diễn giải được lời đọc.
2. Trước dựng, lập bảng từng ý → đối tượng/vị trí → hành động/quan hệ → kết quả → cue. Địa danh cần định vị; kết nối cần tuyến và chuyển động; lợi thế/cơ chế cần quá trình; ý trừu tượng cần sơ đồ phù hợp.
3. Trước export dài, rà toàn timeline và render đoạn khó ở tốc độ thật. Không chấp nhận chỉ thêm text/icon, đổi subtitle hoặc zoom nhẹ; ảnh tư liệu được giữ để quan sát kết quả đã giải thích, không thay minh họa ý mới.
4. Khi nhận phản hồi vài khung, rà cả các đoạn tương tự và phần còn lại. Sửa chồng lớp, nhãn, chuyển động và cue trước khi khóa snapshot.
5. Khi chỉ sửa hình, xác nhận WAV/script/word timing/pages/thời lượng giữ nguyên theo phạm vi; không gọi lại TTS/ASR. Chạy lại kiểm hình/MP4 của snapshot mới, giữ ngưỡng kỹ thuật. Chỉ cập nhật tài liệu thì không render lại video.

Bằng chứng và ví dụ: [Kinh đô tập 2 V2](phases/phase-6/VIETNAM_CAPITALS_SHORTS_EP02_V2.md).

## Gate câu hỏi và câu trả lời — 30/10/2026

Trước TTS: đối chiếu tài liệu gốc và đề cương, viết rõ câu hỏi → đáp án ngắn → bằng chứng → câu kết luận. Không coi các kiến thức liên quan là đã trả lời câu hỏi. Kết mỗi tập phải chốt đáp án cùng phạm vi/đơn vị trước teaser; không dùng giới thiệu tập sau thay kết luận. Loạt kinh đô cần nêu đáp án sớm, giải thích bằng hình rồi chốt lại. Đọc riêng câu mở đầu và câu kết để kiểm điều hứa đã được giải quyết; media pass và nhiều animation không thay gate nội dung. Xem [tập 1 V4](phases/phase-6/VIETNAM_CAPITALS_SHORTS_EP01_V4.md).

### Vị trí và coverage crop từ tập 2 V3

Câu hỏi ở đâu cần kết bằng vùng/địa danh và mức độ chắc chắn, không chỉ ý nghĩa lịch sử. Trước export kiểm cả nhãn gần nhau ở góc xa và coverage viewport theo bounds raster; giữ nền trước khi đổi crop/góc rộng, trì hoãn pin mới tới khi nền tương ứng hình thành. Ví dụ: [Phong Châu V3](phases/phase-6/VIETNAM_CAPITALS_SHORTS_EP02_V3.md).


### Cổ Loa tập 3 V2 — câu hỏi về hai trường hợp, 30/10/2026

Đã sửa tập 3 thành câu hỏi An Dương Vương và Ngô Quyền cùng chọn Cổ Loa, có đáp án sớm và kết trực tiếp trước teaser. Hai trường hợp không phải tổng số tuyệt đối; nguồn còn Lý Phật Tử. Giữ ranh giới giữa ý nghĩa lịch sử và động cơ cá nhân chưa thể khẳng định đầy đủ. Khi teaser quay về năm 40 sau 939, phải nói rõ trở về quá khứ và mũi tên đi lùi. Năm ASR 1938/1939 bị nhận sai phải đối chiếu script/nguồn và sửa thành 938/939, giữ interval atom gộp thay vì tự bịa timing cho từ năm bị mất; giữ tên riêng Hai Bà Trưng. Hồ sơ: [Tập 3 V2](phases/phase-6/VIETNAM_CAPITALS_SHORTS_EP03_V2.md).

Trạng thái hiện tại: cả 3 tập đầu đã sửa gate câu hỏi–đáp án–kết luận: tập 1 V4, tập 2 V3, tập 3 V2. Những ghi chú còn chờ sửa tập 3 bên trên là lịch sử trước V2.


### Kinh đô tập 4–6 — lời hứa, cụm nghĩa và coverage,31/10/2026

Đã hoàn thành tập 4 Mê Linh/Trưng Vương,5 Vạn Xuân trước Thăng Long,6 lợi thế Hoa Lư. Đọc bản toàn văn đã trích trực tiếp từ Word ở lượt trước và lưu hash; file Downloads hiện không còn nên không báo là vừa đọc lại trực tiếp. Hồ sơ: [tập 4](phases/phase-6/VIETNAM_CAPITALS_SHORTS_EP04.md),[tập 5](phases/phase-6/VIETNAM_CAPITALS_SHORTS_EP05.md),[tập 6](phases/phase-6/VIETNAM_CAPITALS_SHORTS_EP06.md).

- Đáp án và kết luận phải cùng phạm vi: Mê Linh là nơi đóng đô theo truyền thống, chưa biết rõ kinh thành; vùng Hà Nội là trung tâm Vạn Xuân trước 1010, không đồng nghĩa cung điện đã tìm thấy/liên tục; Hoa Lư phòng thủ phù hợp củng cố chính quyền nhưng còn có triều đình/cung điện.
- Caption đạt 1–2 dòng vẫn chưa đủ nếu tách hiện/đại,tưởng/niệm,đầy/đủ hoặc để 1 từ lẻ. Chia theo nghĩa và bảo vệ cụm; khi chỉ regroup, khóa voice và từng interval, cập nhật hash pages và kiểm lại DOM.
- Crop địa phương cũ không tự phủ được góc gần đó: kiểm cả 4 mép viewport theo worldBounds. Tập 5 phải lấy crop Hà Nội riêng và đổi identity asset để UI không giữ ảnh Mê Linh.
- Bản đồ toàn cảnh không để panel che Hoàng Sa/Trường Sa ngay từ khung đầu; cho khung toàn cảnh rõ rồi chuyển crop, giữ locator có marker đúng phép chiếu.
- Ảnh hiện nay không thành bằng chứng cung điện cổ; sơ đồ cơ chế không thành GIS/địa giới/số đo khảo cổ. Kết luận trước teaser, không chỉ đổi chữ trên hình tĩnh.
- Tách bằng chứng Studio playback 1x với độ mượt: xuất nặng có thể làm tụt FPS; không nhận là benchmark hoặc parity Studio độc lập. Giữ các gate kỹ thuật cũ và xem MP4 giải mã cuối.


### Tập 7 Thăng Long — 01/11/2026

Xem [hồ sơ tập 7](phases/phase-6/VIETNAM_CAPITALS_SHORTS_EP07.md). Kiểm cả quỹ đạo vật thể với đường đã vẽ; thuyền phải bám đường cong, không đi dây cung cắt ngang. Giữ cụm năm khi ngắt dòng, đo lại trên snapshot cuối. JSON qua JS có thể đổi 0.0 thành 0; trước cập nhật hash phải so toàn bộ từ và giá trị interval với dữ liệu gốc, không coi mọi hash khác là đổi timing hoặc tự bỏ qua.


## Kiểm đề cương series sau audit kinh đô 01/11/2026

Trước bước tạo voice, so tập đang làm với bảng số tập/chủ đề người dùng đã chốt, không với số mục Word. Lưu câu hỏi → đáp án → mục nguồn → hình → kết luận → teaser. Khi giao, đánh giá riêng mức đạt nội dung và media; ghi mọi lệch thời lượng/phạm vi. Sau mỗi lượt cập nhật hồ sơ tập và trạng thái master để lần “tiếp tục” sau không dựa trên một nhãn hoàn thành sai. Xem [bảng chuẩn kinh đô](phases/phase-6/VIETNAM_CAPITALS_SERIES_MASTER.md).
