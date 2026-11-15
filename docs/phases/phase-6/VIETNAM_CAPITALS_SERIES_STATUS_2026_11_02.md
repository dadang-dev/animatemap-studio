# Trạng thái và checkpoint sửa series — 02/11/2026

Nguồn điều khiển phạm vi là [đề cương 12 chủ đề](C:/Users/PC/Documents/Codex/2026-10-29/ti-p-t-c-trao-i/outputs/De-cuong-chuan-series-12-tap.md), không phải số mục của Word. [Audit 01/11](C:/Users/PC/Documents/Codex/2026-10-29/ti-p-t-c-trao-i/outputs/Audit-series-kinh-do-2026-11-01.md) mô tả bản cũ trước sửa. Chọn đúng file qua [bảng bàn giao](C:/Users/PC/Documents/Codex/2026-10-29/ti-p-t-c-trao-i/outputs/Ban-giao-series-12-tap.md).

Hiện **12/12 tập** sẵn sàng theo phạm vi hồ sơ. “Đạt” là gate nội bộ đã ghi, không có nghĩa người dùng đã duyệt cuối.

| Tập/bản | Chủ đề | Trạng thái | Bằng chứng |
|---|---|---|---|
| 1 · V5 | Việt Nam từng có bao nhiêu kinh đô? | Đã xuất và kiểm bản sửa | 84.800 giây · [hồ sơ](C:/Users/PC/Documents/Codex/2026-10-29/ti-p-t-c-trao-i/outputs/Tap-1-V5-ho-so.md). |
| 2 · V3 | Kinh đô thời vua Hùng nằm ở đâu? | Giữ theo audit 01/11; hồ sơ media trước | 63.167 giây; không render lại lượt này. |
| 3 · V3 | Vì sao Cổ Loa được chọn làm kinh đô hai lần? | Đã xuất và kiểm bản sửa | 84.033 giây · [hồ sơ](C:/Users/PC/Documents/Codex/2026-10-29/ti-p-t-c-trao-i/outputs/Tap-3-V3-ho-so.md). |
| 4 · V1 (bản giữ) | Hai Bà Trưng đóng đô ở đâu? | Giữ theo audit 01/11; hồ sơ media trước | 72.833 giây; không render lại lượt này. |
| 5 · V2 | Trước Thăng Long, Hà Nội đã từng là kinh đô? | Đã xuất và kiểm bản sửa | 75.000 giây · [hồ sơ](C:/Users/PC/Documents/Codex/2026-10-29/ti-p-t-c-trao-i/outputs/Tap-5-V2-ho-so.md). |
| 6 · V1 (bản giữ) | Vì sao vua Đinh chọn kinh đô giữa núi đá? | Giữ theo audit 01/11; hồ sơ media trước | 75.600 giây; không render lại lượt này. |
| 7 · V2 | Vì sao Lý Công Uẩn rời Hoa Lư đến Thăng Long? | Đã xuất và kiểm bản sửa | 83.333 giây · [hồ sơ](C:/Users/PC/Documents/Codex/2026-10-29/ti-p-t-c-trao-i/outputs/Tap-7-V2-ho-so.md). |
| 8 · V2 | Vì sao Hồ Quý Ly chuyển kinh đô về Thanh Hóa? | Đã xuất và kiểm bản sửa | 84.033 giây · [hồ sơ](C:/Users/PC/Documents/Codex/2026-10-29/ti-p-t-c-trao-i/outputs/Tap-8-V2-ho-so.md). |
| 9 · V2 | Một triều đại có thể có hai kinh đô không? | Đã xuất và kiểm bản sửa | 85.300 giây · [hồ sơ](C:/Users/PC/Documents/Codex/2026-10-29/ti-p-t-c-trao-i/outputs/Tap-9-V2-ho-so.md). |
| 10 · V2 | Tây Sơn có một hay nhiều kinh đô? | Đã xuất và kiểm bản sửa | 90.000 giây · [hồ sơ](C:/Users/PC/Documents/Codex/2026-10-29/ti-p-t-c-trao-i/outputs/Tap-10-V2-ho-so.md). |
| 11 · V1 | Kinh đô Quang Trung dự định xây ở Nghệ An | Đã xuất và kiểm bản sửa | 79.500 giây · [hồ sơ](C:/Users/PC/Documents/Codex/2026-10-29/ti-p-t-c-trao-i/outputs/Tap-11-V1-ho-so.md). |
| 12 · V1 | Huế trở thành kinh đô cuối cùng như thế nào? | Đã xuất và kiểm bản sửa | 109.467 giây · [hồ sơ](C:/Users/PC/Documents/Codex/2026-10-29/ti-p-t-c-trao-i/outputs/Tap-12-V1-ho-so.md). |

## Quyền và công cụ

Người dùng đã cho phép chỉ chữ kế hoạch hình ảnh tập 8–12 qua Codex CLI tới dịch vụ AI OpenAI; receipt work/vox-authorization-812.json. VoxDirector trả lần lượt 17/18/16/18/19 shot, đã tích hợp và lưu director-integration-review.json. Trở ngại auto-review trước đó đã được giải quyết. Không gửi Word, ảnh hoặc audio; không hỏi lại cùng phạm vi. Plan hướng dẫn source đã dựng, không tự xác nhận lịch sử; cue lời đọc thật ưu tiên hơn chia shot gợi ý.

Voice AI33/Vbee đã cache đủ trong quyền đã cấp; ASR tại máy. HyperFrames có PNG. ImageGen mới phục vụ hai nhóm cung đình Tây Sơn và minh họa triều Nguyễn, ghi rõ không xác thực chân dung. Không tạo lại voice để chữa căn phụ đề.

## Phạm vi kiểm và việc tiếp theo

- Mỗi bản sửa hoàn tất có script/voice/video/source ZIP hash ở hồ sơ tập và work/series-delivery-manifest.json. “Đã xuất media” khác “đạt đề cương”; không dùng các bản 8–10 cũ lệch chủ đề thay bản mới.
- Đã rà caption, storyboard chọn lọc; các clip baseline 8–12 chạy ở 1x tới 12,011 giây và xem4 khung giải mã/clip. Sau tích hợp director, kiểm clip lại và khóa source trước xuất. Một render nặng mỗi lúc.
- MP4 cuối kiểm toàn timestamp, codec/màu, gói AAC, audio correlation và các mẫu pixel native/decoded; sau đó xem20khung giải mã chọn lọc. Không nhận đó là kiểm độc lập mọi frame/mọi âm tiết, parity Studio độc lập hoặc benchmark độ mượt.
- Callout ngang pin và ảnh thật bên dưới; số phụ đề dùng chữ số; giữ cụm tên riêng khi xuống dòng. Không chỉ đổi chữ trên ảnh tĩnh: có đối tượng → hành động/quan hệ → kết quả theo lời đọc. Bản đồ hiện đại không thành địa giới cổ; sơ đồ không thành tuyến cổ/mặt bằng khảo cổ; ảnh hiện nay/minh họa không thành toàn cảnh cung điện hay chân dung xác thực.
- Sau các bản mới còn lại: rà đủ12 tập với bảng chuẩn, kết luận trả lời câu mở đầu và teaser đúng số/chủ đề. Không đổi đề cương để hợp thức hóa bản sai.

Word: C:/Users/PC/OneDrive/TIKTOK/Kich_ban_lich_su_cac_kinh_do_Viet_Nam_APA7.docx. Đọc trực tiếp01/11; kiểm lại hash ngày 02/11 trùng `01042d233ebbb00bf136f5453667fcaea389dbfa1cddfbcfe7f38e756a6af6a0`. Toàn văn/receipt ở work/series-audit-2026-11-01/. Trạng thái máy đọc: work/series-progress.json.

[Audit chốt ngày 02/11 và phạm vi kiểm](C:/Users/PC/Documents/Codex/2026-10-29/ti-p-t-c-trao-i/outputs/Audit-chot-series-2026-11-02.md).
