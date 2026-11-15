# Quy tắc bắt buộc cho video

## Diễn giải lời đọc bằng hình — yêu cầu bắt buộc ngày 30/10/2026

- **Không cho phép có các đoạn chỉ thay chữ và giữ ảnh tĩnh, chưa diễn giải được lời đọc.** Đây là điều kiện bắt buộc cho mọi video mới và bản sửa, không chỉ loạt kinh đô.
- Mỗi ý chính phải có diễn giải bằng hình phù hợp: đối tượng/vị trí → hành động hoặc quan hệ nhìn thấy được → kết quả → cue theo lời đọc. Đổi subtitle, tiêu đề, nhãn, highlight chữ, pan/zoom nhẹ hoặc thêm icon trang trí trên cùng một ảnh không được tính là đã diễn giải nội dung.
- Rà toàn bộ lời đọc, không chỉ các khung người dùng phản hồi. Lập bảng lời đọc → hình/đối tượng → diễn biến/quan hệ → cue; đoạn nào chưa có hình giải thích phải sửa trước khi giao. Nội dung địa lý cần thấy vị trí, sông/tuyến/kết nối; nội dung cơ chế cần thấy quá trình; ý trừu tượng cần sơ đồ thời gian, quan hệ, so sánh hoặc mức độ chưa chắc chắn phù hợp.
- Ví dụ tập 2: Việt Trì và Bạch Hạc có pin riêng; sông Hồng và sông Lô có nét sông theo tọa độ và thuyền di chuyển; nước tới ruộng và cây mọc giải thích lợi thế nông nghiệp. Ảnh Đền Hùng giữ nguyên trong khi đổi chữ không thay được các diễn giải này.
- Ảnh tĩnh được dùng làm tư liệu hoặc giữ một kết quả vừa giải thích để người xem quan sát; không được kéo dài qua các ý mới mà chưa minh họa. Không chữa lỗi bằng hiệu ứng ngẫu nhiên, loop hoặc ép chuyển hình theo số giây cố định.
- Hình giải thích phải đúng dữ kiện: đường sông có nguồn, không bịa hành trình cổ; dữ liệu hiện đại không thành cương vực cổ; ảnh di tích hiện nay và minh họa AI không thành bằng chứng diện mạo cung điện cổ.
- Trước export dài, xem đoạn khó ở tốc độ thật; rà đầu/giữa/cuối hành động và trước/đúng/sau cue trên toàn timeline. Nếu người xem chỉ thấy thêm chữ mà chưa hiểu thêm vị trí, quan hệ, cơ chế hay diễn biến, đoạn đó **chưa đạt**, kể cả khi parity, frame count và audio đều đạt.

## Bản đồ Việt Nam — yêu cầu ngày 26/10/2026

- Tất cả video có bản đồ Việt Nam phải thể hiện đầy đủ phần đất liền, các đảo và quần đảo của Việt Nam; đặc biệt **quần đảo Hoàng Sa và quần đảo Trường Sa** phải có mặt và có nhãn rõ ràng.
- Áp dụng cho bản đồ chính, cảnh tổng quan, bản đồ phụ/locator, thumbnail và bản xuất cuối. Khi cảnh chính cận một địa phương, giữ bản đồ phụ đủ phạm vi biển đảo; không bắt buộc nhét toàn quốc vào khung cận.
- Không chỉ dùng polygon quốc gia mặc định rồi mặc nhiên coi là đầy đủ. Kiểm riêng các đảo ven bờ, các nhóm đảo ngoài khơi, Hoàng Sa và Trường Sa; đối chiếu nguồn địa lý và nguồn chính thức của Việt Nam. Dữ liệu Natural Earth mặc định có thể bỏ đảo nhỏ hoặc dùng góc nhìn kiểm soát thực tế.
- Giữ geometry gốc, đảo, lỗ và tọa độ nguồn. Bổ sung lớp đảo có provenance/giấy phép; không tự vẽ đảo ngẫu nhiên, dùng chấm tùy ý thay toàn bộ quần đảo, hoặc vẽ đường bao biển thành ranh giới chủ quyền khi nguồn không xác lập như vậy.
- Đảo quá nhỏ ở tỷ lệ toàn quốc cần ký hiệu địa lý tăng khả năng nhìn thấy hoặc inset, ghi rõ phép phóng đại/khái quát trong tài liệu nguồn. Nhãn và ký hiệu phải ở đúng vị trí hoặc có đường dẫn đến vị trí thật. Không tuyên bố dữ liệu tham chiếu là kiểm kê đầy đủ mọi bãi/đá hay bản đồ pháp lý.
- Trước khi giao: kiểm coverage đảo/quần đảo bằng danh sách nguồn, xem ảnh thật ở kích thước điện thoại, kiểm nhãn Hoàng Sa/Trường Sa không bị cắt/che và kiểm preview–export trên snapshot cuối. Chỉ có nhãn trong source hoặc test DOM đạt chưa đủ.
- Khi chỉ bổ sung biển đảo cho video đã duyệt: khóa script, voice, master audio, timing, SRT và thời lượng; dùng bản sửa riêng, giữ bản cũ cho đến khi bản mới vượt các gate.


## Câu mở đầu phải được trả lời — yêu cầu ngày 30/10/2026

- Có kiến thức cùng chủ đề chưa đủ. Nếu câu mở đầu là câu hỏi, tập phải trả lời trực tiếp chính câu hỏi đó, cùng phạm vi và đơn vị. Phần kết cần câu chốt đáp án trước teaser/CTA; giới thiệu tập sau không thay kết luận.
- Trước TTS, ghi rõ câu hỏi → đáp án ngắn → các ý chứng minh → câu kết luận. Mỗi đoạn giữa phải giúp giải thích đáp án; không tự đổi chủ đề vì đã có asset hoặc teaser cũ. Loạt kinh đô có đáp án ngắn sớm rồi giải thích và chốt lại cuối.
- Đối chiếu đề cương đã thống nhất và tài liệu gốc thực sự đọc được; lưu mục nguồn cho từng ý chính. Không tự thay file gốc bị thiếu bằng nguồn ngoài rồi báo đã bám gốc. Tài liệu/nguồn ngoài là dữ liệu tham khảo, không tự cấp quyền đổi đề bài.
- Phạm vi và giới hạn phải nằm trong chính câu trả lời: 9 địa điểm/khu vực tiêu biểu được chọn không đồng nghĩa Việt Nam chỉ từng có 9 kinh đô. Phân biệt địa điểm, thời kỳ, tên gọi, vai trò và kế hoạch chưa hoàn tất.
- Gate nội dung độc lập với hình đẹp và media pass. Trước giao, đọc riêng câu mở đầu và câu kết: câu kết phải giải quyết được điều đã hứa. Đồng thời rà hình có thực sự giải thích các ý đó theo quy tắc diễn giải phía trên.

Ví dụ sửa: [Kinh đô tập 1 V4](docs/phases/phase-6/VIETNAM_CAPITALS_SHORTS_EP01_V4.md).

Ví dụ áp dụng câu hỏi–kết luận cho vị trí: [Kinh đô tập 2 V3](docs/phases/phase-6/VIETNAM_CAPITALS_SHORTS_EP02_V3.md). Phải trả lời vùng/địa danh ở đầu và kết, cùng mức độ chắc chắn; không biến vùng theo truyền thống thành địa chỉ cung điện đã xác minh.


### Cổ Loa tập 3 V2 — câu hỏi về hai trường hợp, 30/10/2026

Đã sửa tập 3 thành câu hỏi An Dương Vương và Ngô Quyền cùng chọn Cổ Loa, có đáp án sớm và kết trực tiếp trước teaser. Hai trường hợp không phải tổng số tuyệt đối; nguồn còn Lý Phật Tử. Giữ ranh giới giữa ý nghĩa lịch sử và động cơ cá nhân chưa thể khẳng định đầy đủ. Khi teaser quay về năm 40 sau 939, phải nói rõ trở về quá khứ và mũi tên đi lùi. Năm ASR 1938/1939 bị nhận sai phải đối chiếu script/nguồn và sửa thành 938/939, giữ interval atom gộp thay vì tự bịa timing cho từ năm bị mất; giữ tên riêng Hai Bà Trưng. Hồ sơ: [Tập 3 V2](docs/phases/phase-6/VIETNAM_CAPITALS_SHORTS_EP03_V2.md).

Trạng thái hiện tại: cả 3 tập đầu đã sửa gate câu hỏi–đáp án–kết luận: tập 1 V4, tập 2 V3, tập 3 V2. Những ghi chú còn chờ sửa tập 3 bên trên là lịch sử trước V2.


### Kinh đô tập 4–6 — lời hứa, cụm nghĩa và coverage,31/10/2026

Đã hoàn thành tập 4 Mê Linh/Trưng Vương,5 Vạn Xuân trước Thăng Long,6 lợi thế Hoa Lư. Đọc bản toàn văn đã trích trực tiếp từ Word ở lượt trước và lưu hash; file Downloads hiện không còn nên không báo là vừa đọc lại trực tiếp. Hồ sơ: [tập 4](docs/phases/phase-6/VIETNAM_CAPITALS_SHORTS_EP04.md),[tập 5](docs/phases/phase-6/VIETNAM_CAPITALS_SHORTS_EP05.md),[tập 6](docs/phases/phase-6/VIETNAM_CAPITALS_SHORTS_EP06.md).

- Đáp án và kết luận phải cùng phạm vi: Mê Linh là nơi đóng đô theo truyền thống, chưa biết rõ kinh thành; vùng Hà Nội là trung tâm Vạn Xuân trước 1010, không đồng nghĩa cung điện đã tìm thấy/liên tục; Hoa Lư phòng thủ phù hợp củng cố chính quyền nhưng còn có triều đình/cung điện.
- Caption đạt 1–2 dòng vẫn chưa đủ nếu tách hiện/đại,tưởng/niệm,đầy/đủ hoặc để 1 từ lẻ. Chia theo nghĩa và bảo vệ cụm; khi chỉ regroup, khóa voice và từng interval, cập nhật hash pages và kiểm lại DOM.
- Crop địa phương cũ không tự phủ được góc gần đó: kiểm cả 4 mép viewport theo worldBounds. Tập 5 phải lấy crop Hà Nội riêng và đổi identity asset để UI không giữ ảnh Mê Linh.
- Bản đồ toàn cảnh không để panel che Hoàng Sa/Trường Sa ngay từ khung đầu; cho khung toàn cảnh rõ rồi chuyển crop, giữ locator có marker đúng phép chiếu.
- Ảnh hiện nay không thành bằng chứng cung điện cổ; sơ đồ cơ chế không thành GIS/địa giới/số đo khảo cổ. Kết luận trước teaser, không chỉ đổi chữ trên hình tĩnh.
- Tách bằng chứng Studio playback 1x với độ mượt: xuất nặng có thể làm tụt FPS; không nhận là benchmark hoặc parity Studio độc lập. Giữ các gate kỹ thuật cũ và xem MP4 giải mã cuối.


### Ví dụ tập 7 — 01/11/2026

[Tập 7 — Thăng Long](docs/phases/phase-6/VIETNAM_CAPITALS_SHORTS_EP07.md). Không chỉ đổi chữ trên ảnh: đất mở rộng phải có khu dân cư phát triển; kết nối phải có dòng hàng/thuyền thực sự đi theo đường đã vẽ; nuôi sống dân cư phải thấy lương thực tới người. Truyền thuyết được nhãn riêng, ảnh di tích hiện nay không suy thành toàn cảnh năm cổ. Chữ số gọn nhưng bảo vệ cả “năm 1010” để không rơi năm đứng lẻ.


### Kinh đô tập 8–10 — timing và nhận diện tư liệu, 01/11/2026

- Giữ quy tắc không chỉ đổi chữ trên ảnh tĩnh: khối đá ghép thành tường/vòm, luồng văn thư khác nghi lễ và tổ tiên, quan hệ Thăng Long–Dương Kinh phải có đối tượng, diễn biến và kết quả nhìn thấy được. Pan/zoom hoặc subtitle không thay diễn giải.
- Không đồng nhất xây thành, lập triều đại và giữ vai trò kinh đô. Tây Đô có các mốc 1397, 1398 và 1400 mang ý nghĩa khác nhau. Phân biệt chức năng nghi lễ/lăng tẩm ở Lam Kinh với hoạt động chính trị hoàng tộc tại Dương Kinh.
- Ảnh tượng Mạc Thái Tông ở Đại Trà là di vật liên quan; không gán cho Mạc Đăng Dung hoặc cung điện Cổ Trai. Giữ khung ảnh dọc, không cắt đầu tượng. Tọa độ khu tưởng niệm hiện đại không thành tọa độ cung điện cổ.
- Nếu Word trong Downloads bị thiếu, nói rõ việc dùng toàn văn cache từng trích trực tiếp và hash gốc. Không nhận là vừa đọc lại Word. Plan trên storyboard 80 giây phải được căn lại theo audio thật, có hồ sơ điều chỉnh và giữ bản gốc.
- Cân dòng phụ đề phải bảo vệ cụm nghĩa như “sử dụng”, “quan hệ”, “điều hành”, “quê hương” và “2 trung tâm”; đạt 2 dòng chưa tự chứng minh dễ đọc. Play ở 1x báo playing nhưng frame đứng chưa là bằng chứng xem chuyển động. Xác nhận timeline thực sự tiến, thử nút Play trực tiếp nếu cần và ghi đúng phạm vi đã xem.


## Khóa đề cương series và lưu sau mỗi lần làm — 01/11/2026

- Bảng số tập/chủ đề do người dùng chốt là nguồn điều khiển phạm vi. Các mục trong tài liệu gốc là nguồn nội dung, không tự thành số tập. Với loạt kinh đô, đọc [bảng chuẩn 12 tập](docs/phases/phase-6/VIETNAM_CAPITALS_SERIES_MASTER.md) và [audit](docs/phases/phase-6/VIETNAM_CAPITALS_SERIES_AUDIT_2026_11_01.md).
- Câu mở đầu có thể diễn đạt tương đương nhưng phải giữ cùng lời hứa. Trước TTS ghi số tập, câu hỏi, đáp án, mục nguồn, diễn giải, kết luận và teaser. Không thay đề tài vì asset đã sẵn.
- Tách trạng thái nội dung và media: MP4/codec/phụ đề đạt không chứng minh đúng đề cương. Bản 8–10 cũ là ví dụ lệch: thành đá không thay lý do dời đô; Lam Kinh riêng không thay so sánh hai cặp; Dương Kinh không thay Tây Sơn.
- Sau mỗi lượt cập nhật hồ sơ tập và trạng thái series, ghi phiên bản/hash, thời lượng so với khung, phạm vi đã xem, việc còn lại và teaser/tập tiếp theo. Nếu chỉ audit thì không báo đã sửa video. Không đổi đề cương để hợp thức hóa sản phẩm đã dựng.
- Tập 1: 9 điểm/khu vực tiêu biểu của Word không giới hạn toàn series và không phải tổng số tuyệt đối. Tập 3: hai trường hợp không đồng nghĩa chỉ đúng hai lần; thuyền trong sơ đồ cũng phải bám đúng đường cong đã vẽ. Tập 9: không đồng nhất chức năng Lam Kinh/Dương Kinh. Tập 10: thể hiện các nhánh quyền lực Tây Sơn, không coi là hai văn phòng ngang nhau của một triều đình duy nhất.
- Nếu nguồn gốc không còn ở đường dẫn cũ, tìm lại tên file trước khi kết luận bị mất; lưu đường dẫn mới, hash và kết quả so với bản cũ. Mốc lịch sử khác nhau giữa nguồn cần ghi đúng nguồn/sự kiện, không tự chọn hoặc tuyên bố một bên sai khi chưa đủ căn cứ.


## Kiểm soát bản sửa và tài nguyên — 01/11/2026

- Xem docs/phases/phase-6/VIETNAM_CAPITALS_REPAIR_PROGRESS_2026_11_01.md trước khi tiếp tục. Voice mới chưa đồng nghĩa video mới đã hoàn thành. Không ghi đè bản duyệt trước khi bản sửa qua kiểm nội dung và media.
- Dùng audio thật để chốt đuôi: voice sát75/90giây không được cộng đuôi0,9giây mặc định làm vượt khung; không cắt tiếng hoặc tăng tốc để chữa.
- Sau lỗi thiếuRAM, chạyASR lần lượt và chỉ1render nặng. Không tạo lại voice đãcache để chữa lỗi align. Chỉ dọn PNGQA có thể tái tạo sau khi lưu contact/báo cáo; giữ media/source/voice.


- Rà caption bằng ảnh trước render dài: tối đa2dòng chưa đủ. Bảo vệ cả cụm như 'nhắc đến', cân dòng để không rơi1từ. Kiểm chữ trong sơ đồ với nhãn biển đảo, không chỉ giới hạn viewport; phương trình kết luận không được chồng nhãn Trường Sa. Sau sửa chỉ một đoạn, vẫn kiểm MP4 cuối với native/decoded, toàn PTS và gói AAC; không lấy bản render trước sửa làm bằng chứng.


## Rà bố cục và địa lý sau bản sửa — 02/11/2026
- Bảo vệ cụm tên riêng trong tiêu đề, sơ đồ và chú thích ảnh, không chỉ subtitle; kiểm chữ thực tế sau xuống dòng.
- Khi cắt một nhóm nhân vật từ ảnh chung bằng SVG, dùng clipPath rõ ràng; viewBox với preserveAspectRatio có thể vẫn lộ nhóm còn lại.
- Locator tập có nhiều địa điểm phải dùng các tọa độ thực, không dùng điểm giữa thay kinh đô. Khi đổi từ tổng quan sang cận, pin/callout phải dùng đúng phép chiếu của cảnh; ẩn lớp cận đến khi chuyển cảnh hoàn tất.
- Bảng kết series cần tránh che các pin chính lẫn nhãn biển đảo. Draft không thay được kiểm motion và MP4 giải mã cuối.


## Khi kiểm so khung sau chuyển mẫu màu không đạt — 02/11/2026
- Giữ nguyên ngưỡng kiểm, so native với raw và với bản hậu kỳ để định vị sai khác; không dùng đổi metadata thay chuyển mẫu thật, không nới ngưỡng chỉ để đạt.
- Tập10V2 đã đo thêm chroma trung gian4:4:4 trước xuất4:2:0 và giảm mất mát tái mã hóaCRF12; kiểm lại toànfile/PTS/AAC/audio/hash và các mẫu pixel với ngưỡng cũ. Đây là sửa pipeline có đo, không đổi script/voice/timing/nội dung. Xem encoding-correction.md trong source tập10.



## Kiểm chốt series và phụ đề số — 02/11/2026

- Đối chiếu câu mở đầu, đáp án, câu kết và teaser từ script thật của từng tập với bảng chuẩn; tên file hoặc việc render xong không chứng minh đúng đề cương. Tập cuối có thể chốt đáp án trước khi tổng kết cả series; cần ghi rõ vị trí chốt.
- Năm và số đếm trong phụ đề dùng chữ số, nhưng giữ tên riêng như “Hai Bà Trưng”, không thay thành “2 Bà Trưng”. Kiểm cả SRT lẫn bố cục thực tế; không dùng phép thay mọi chữ số viết bằng chữ một cách máy móc.
- Manifest bàn giao chỉ chọn đúng phiên bản đã kiểm, có hash script/voice/video/source ZIP và ý nghĩa từng hash. Bản giữ theo audit trước phải được phân biệt với bản vừa render và kiểm mới; kết quả kiểm nội bộ không là xác nhận người dùng duyệt cuối.
