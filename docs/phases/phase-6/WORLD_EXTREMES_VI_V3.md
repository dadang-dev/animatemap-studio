# Những cực trị địa lý thế giới — V3 chi tiết

Hoàn tất 08/11/2026. Nguồn bổ sung được đối chiếu 07/11/2026. Đáp ứng bốn phản hồi của người dùng: mở bài lộ ví dụ Nga/Kuwait; thiếu chi tiết 12 múi giờ; thiếu số chiều dài bờ biển Canada; thiếu lý do Philippines đón không khí Giáng sinh từ tháng9.

## Bản giao hiện hành

- MP4: `C:\Users\PC\OneDrive\Desktop\VIBECODE\AnimateMap Studio\.local\world-extremes-vi-v3\Nhung-Cuc-Tri-Dia-Ly-The-Gioi-VI-V3.mp4`
- SHA-256: `6e3e91b95168d4a4b741ed3ee06714617a66bbe1052999d452c122df8bed2ef4`
- SourceZIP: `C:\Users\PC\OneDrive\Desktop\VIBECODE\AnimateMap Studio\.local\world-extremes-vi-v3\World-Extremes-VI-V3-Source.zip`
- SHA-256ZIP: `d5cb72f76ae8c044bc2bac3f319162e2fc155f85c2468573879122a08220f737`
- 124.6 giây ·1080×1920 ·30fps ·3738khung ·H.264/yuv420p ·AAC stereo48kHz ·faststart.
- Studio: http://127.0.0.1:3043/World-Extremes-VI-V3

## Nội dung và hình đã sửa

Mở bài chỉ có toàn cảnh thế giới, hành trình minh họa và câu dẫn chung; không còn tên Nga/Kuwait hoặc số nhiệt độ. Đã kiểm introNeutral trên snapshot native và mọi frame export.

Pháp có đủ12hàng UTC/địa điểm, chia3trang4hàng, bảng được giữ đủ đọc, hàng/pin nhấn theo cue lời mới. Giải thích nguyên nhân là lãnh thổ hải ngoại trải rộng; danh sách là giờ tiêu chuẩn, có ghi nơi đổi giờ mùa hè và loại yêu sách NamCực. IANA tzdb2026f cache nguyên file và checksum; ClippertonUTC−8 đối chiếu Timeanddate vì không có IANA zone riêng. Địa điểm trên bản đồ là đại diện, không phải danh sách mọi địa phương dùng chung giờ.

| UTC chuẩn | Địa điểm |
|---|---|
| UTC−10:00 | Tahiti · Société · Tuamotu · Australes |
| UTC−09:30 | Marquesas · Polynesia thuộc Pháp |
| UTC−09:00 | Gambier · Polynesia thuộc Pháp |
| UTC−08:00 | Clipperton · Đảo không có cư dân thường trú |
| UTC−04:00 | Guadeloupe · Martinique · Saint-Martin · Saint-Barthélemy |
| UTC−03:00 | Guyane · Saint-Pierre-et-Miquelon · Nam Mỹ và Bắc Đại Tây Dương |
| UTC+01:00 | Pháp ở châu Âu · Giờ tiêu chuẩn · mùa hè UTC+02:00 |
| UTC+03:00 | Mayotte · Ấn Độ Dương |
| UTC+04:00 | Réunion · Crozet · Ấn Độ Dương |
| UTC+05:00 | Kerguelen · Saint-Paul · Amsterdam · Nam Ấn Độ Dương |
| UTC+11:00 | New Caledonia · Tây Thái Bình Dương |
| UTC+12:00 | Wallis và Futuna · Thái Bình Dương |

Canada bổ sung khoảng243.042km theo Cơ quan Vũ trụCanada, gồm bờ đất liền và đảo theoDFO. Giá trị xuất hiện theo cue lời đọc, không lấy chiều dài path bản đồ để tính thống kê. Có qualifier độ dài đường bờ phụ thuộc phương pháp/độ chi tiết, không ghép243.042và202.080từ các nguồn thành một số mới.

Philippines có lịch September/October/November/December cùng đuôiBER, sơ đồ các yếu tố đức tin/gia đình/âm nhạc/thương mại góp phần duy trì mùa lễ hội sớm, và thẻ xác nhận ngàyGiángsinh25/12. Không nhận là chứng minh một nguyên nhân lịch sử duy nhất hoặc mùa phụng vụ bắt đầu tháng9. PCO/PNA/PIA là nguồn tham khảo; bài PNA consumer-spending được ghi đúng là bài ý kiến.

## Voice, công cụ và phạm vi

Giọng VbeeHN-AnhKhôi1.0. Sáu cảnh đầu và câu kết dùng lại PCM gốc chính xác theo voice-reuse-checks.json; một TTS task mới chỉ cho phầnPháp/Canada/Philippines, theo quyền gửi kịch bản AI33 đã cấp cho cùng video. Không upload audio/video mẫu; căn lời mới bằng faster-whisper small/int8 local. Tổng382nhóm timing,57trangcaption; nhóm ASR gộp giữ interval thật, correctionlog có mọi sửa tên/số. Timing là ước lượng ASR, không phải phoneme alignment.

Remotion dựng source đầy đủ; StoryDetails.tsx bổ sung bảng/sơ đồ. Kế hoạch17shot VoxDirector trước được thích ứng cục bộ thành28shot hợp schema, không nhận đã gọi provider plan mới. HyperFrames180PNG parol dùng lại byte-identical, đổi onset theo cue lời mới. Nhạc/SFX tổng hợp theo124,6giây mới; master không được nhận là giữ nguyênV2. NativeJSON chỉ chứa phần plan; không thay composite Remotion.

## Kiểm tra

- Source typecheck đạt. Nativeproject và28shot qua projectSchema/validateDirectorPlan thật. Native duration biểu diễn an toàn tại endpoint float; Remotion dùng3738frame nguyên không thay thời lượng thực.
- 805frame preflight đạt, gồm mọi trang caption, biên cảnh,3trangPháp và cuePH. Đã đo chữ thật, quan sát nội dung trên contact sheet kích thước điện thoại; đủ12hàng xuất hiện, không detail overflow.
- 24canvasStudio100% so renderer cùng snapshot `7dccb26b8da9426deb5079931ff776496a7dc1125aae6eb6e4d188f38ae5b0a4`. ProfileJPEG ghi rõ, giữ ngưỡng meanRGB<3 và fraction lệch>30<2%; không nhận lossless pixel identity.
- Quan sát playback1× có frame tiến/vòng lặp; không nhận là kiểm nghe độc lập toàn bộ hoặc benchmark độ mượt.
- 3738frame export audit đạt, không lỗi runtime/browser/bố cục/highlight. Helper ghi 712.2giây cho lượt chạy cuối có dùng cache, không phải tổng thời gian mọi lượt gián đoạn; không tự gọi là benchmark đạt20–40phút toàn quy trình.
- 96frameMP4 giải mã so native đạt ngưỡng cũ; CFR/PTS, endpoint, codec, frame count và faststart đạt. Mux giữ nguyên video packet hash/PTS/DTS và decoder config.
- Audio correlation 0.999815, SNR 34.26dB,0clipped; đủ sample/speech tail.
- ZIP 469entry,CRC vàSHA từngentry đạt; không có APIkey/private task/accountresponse/node_modules/bundle/frameQA. Gói có nguồn,license,voice,wordtiming,SRT,HFsource và đủpublic để renderstandalone.

Xuất có checkpoint:805PNG/audit native cùng snapshot được dùng lại, các frame thiếu được render bằng Remotion renderFrames với chỉ sốframe toàn project và lưu hash/audit theo từng nhóm. Sau đó mã hóaPNG liên tục bằngFFmpeg/libx264CRF16,limited-rangeBT709; verify giải mã so native giữ nguyên ngưỡng. Không nối các đoạnMP4 cũ, không đổi golden hay nới tolerance. SourceHash vàpipelineHash được ghi riêng trongpipeline-profile.json.

## Trạng thái và phần còn lại

Nội dung: đủ bốn chỉnh sửa yêu cầu. Media: V3qua kiểm MP4 cuối; chưa phát hành ra nền tảng ngoài. Không còn việc bắt buộc của yêu cầu này. Bản cũ/cache/QA giữ nguyên do auto-review trước đã chặn dọn file; không thử xóa vòng lại. Không thay đổi các video hoặc series khác.
