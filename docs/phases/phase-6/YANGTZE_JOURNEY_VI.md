# Dọc sông Trường Giang — V1 đã xuất MP4

Cập nhật 12/11/2026. Project: `.local/yangtze-journey-vi`. Composition `Yangtze-Journey-VI`. Đây là video mới theo mẫu319e, không phải sửa GDP hoặc tiếp nối loạt kinh đô.

## Phạm vi và phê duyệt

Người dùng yêu cầu cùng nội dung mẫu, tiếng Việt, nhiều hoạt ảnh/chuyển cảnh và duyệt lời thoại **trước** voice/storyboard. Đã rà hình toàn timeline, lấy mẫu1giây và ASR local toàn bộ audio; không nhận đã playback/nghe độc lập toàn mẫu. Video mẫu vốn đã nói tiếng Việt. Script mới giữ hành trình/chủ đề, thay cách kể và bỏ quảng cáo bể cá/CTA kênh gốc. Nội dung đã đối chiếu trước duyệt; nguồn trong `work/reference-319e/HO_SO_NOI_DUNG.md` và `sources/CONTENT_RESEARCH.md`.

Người dùng đã duyệt V1 ngày11/11/2026 và riêng việc gửi văn bản Trường Giang tớiAI33/api.ai33.pro để tạo giọngVbee HN-AnhKhôi1.0. Chỉ gửi text; không upload audio/video mẫu. Một task trả phí được lưu; lỗi503 khi poll đã resume đúng task, không gửi TTS lần hai. Audio cache xong, không còn task đang chờ.

Script SHA256: `0c5de4e65724ffc83dcf9f99e2fb1a3f0e17c63f3bce11892cb5a9e310e3b6c1`. Câu hỏi mở đầu là dòng sông đưa ta qua những gì; phần kết trả lời kết nối vùng đất/đô thị, nuôi dưỡng cuộc sống và cần bảo vệ hệ sinh thái, rồi CTA chọn Hổ Khiêu/Trùng Khánh/Thượng Hải. Không có teaser series khác. Câu hỏi đầu được đọc hết khoảng4,83giây; text/hành trình xuất hiện ngay từ đầu, không nhận đạt một hook âm thanh3giây khi chưa sửa script đã duyệt.

## Kết quả dựng

- 166.033333giây,4.981frame,1080×1920,30fps; audio gốc165,682708giây, giữ đủ đuôi.
- 14phần lời đọc,46diễn biến nội dung,31shotVoxDirector thật,99trangcaption;560nhóm timing ASR. Các số không cùng định nghĩa, không coi số lượng là bằng chứng chất lượng.
- Remotion dựng bản đồ/camera/đồ vật/karaoke. VoxDirector qua CLI quản lý trả31shot hợp schema,0toolcalls; treatment/framing được dùng trong camera của Film. Không có Atlas/provider media job giả.
- HyperFrames/GSAP tạo180PNG RGBA turbine tự dựng,6giây,900×490,30fps. `turbine-cue-v2` là asset thực; cue22.500MW được căn lại với số đọc. Runtime/layout check chạy lại trên HTML cuối.
- Băng tan nhập dòng; nước qua hẻm; thành phố theo sườn đồi; đập/turbine/điện; hồ mở rộng; người tái định cư; hồ theo mùa; thuyền lương thực; cần cẩu/container; ruộng lúa; Bạch Kỳ/sonar; cá heo không vây và cấm đánh bắt đều có diễn biến riêng. Sơ đồ có nhãn minh họa, không nhận là footage/quan trắc thực.
- Nhạc/SFX tự tổng hợp,66cue có mục đích,duck theo envelope voice. Không sao chép nhạc/voice/watermark mẫu. Voice/master/từng timing giữ nguyên khi regroup caption và sửa nhãn.

## Địa lý và nguồn

NaturalEarth10m từtagv5.1.2 giữ geometry nguồn,Tuotuo/Tongtian/KimSa và đoạnChangJiang tạiYibin. RelationOSM9392345 bổ sung dòng chính/cửa sông,1112801 choĐạiVậnHà,rawnodes/ways vàlicenseODbL được giữ. Sau bổ sung có70mảnhmainline,23nhánh,169waykênh,3polygonhồ. Hai khe nối khác dữ liệu được giữ; không tự vẽ cầu thẳng. Số6.300km từ nguồn nội dung, không tính từ path. TuyếnĐạiVậnHà hiện đại chỉ định vị; không tự thành đường vận hành lịch sử mọi triều đại.

NASAJanuary2004regionalatlas mới có156tile/checksum; nềnworld4096reusecache. Provenance8192gốc được ghi rõ là bước trước, không giả rằng chính file4096đã có đủ chuỗi resize kiểm lại. Bản đồ tham chiếu, không phải ảnhtrực tiếp/địa giới pháp lý. Locator vàmapmain giữ77featuređảoViệtNam cùngHoàngSa/TrườngSa; không nhận là kiểm kê mọi bãi/đá. Córaw/source/URL/checksum vàlicensenotices trong gói.

## Kiểm tra snapshot cuối

SourceHash: `39376cc9ae7692d2e22fdb45ad5605473cd5c5e4f9484fbe730ab0c420bd39f5`.

- TypeScript và projectSchema/validateDirectorPlan thật đạt14scene/31shot.
- 1055frame native đạt trên mọi trang caption/cue/biên cảnh. Đo fontNoto thật, scrollWidth caption, bounds chữSVG, chồngnhãn, karaoke và77đảo. Đã bắt/sửa lỗi whitespace-nowrap gây câu dài tràn dù boxcha hợp lệ; sửa ngắt trang theo nghĩa, các cụm tên được giữ cả khi xuống dòng. Không nới chuẩn để bỏ lỗi.
- Nhãn TamHiệp/hồ/tổngkết/điểmchọn được bố trí dựa vào đo font thật, vẫn nối tới pin địa lý; riêng tổngkết đợi0,65giây khi camera đến để không chồng trong chuyển vùng.
- 12captureIABStudio100%/DPR1 soRemotionPNG độc lập đạt profileJPEG có sẵn:meanRGB<3/255, fractionkênh>30<2%. Giá trị lớn nhấtmean1.3927,fraction0.8095%. CUA trảJPEG; giữ quantization/subsampling của screenshot cho reference, không nhận lossless identity. Thử bùy30px do suy đoánchrome là sai, đã bỏ; capturecuối dùng đúngDOMbounds/zerooffset, không registration/nới threshold.
- Playbackcuối quan sát từframe1650tớiframe1735ở1×,unmuted. Không nhận là benchmarkmượt hoặc nghe độc lập toàn audio.
- PCMmaster48kHzstereo166,033giây,peak0,829987,0clipped; toàn voice stem khớp nguồn tại gain đã ghi, mixstems khác tối đa1LSB do lượng tử. LastASRspeech165,5s; không cắt câu cuối.
- ZIP605entry,CRC vàSHA từngentry đạt; exactconfiguredkey scan đạt, không chứakey/task/accountresponse/node_modules/video mẫu.

## Bàn giao và trạng thái

- Preview: http://127.0.0.1:3044/Yangtze-Journey-VI · server xác nhậnbind127.0.0.1.
- SourceZIP: `C:/Users/PC/OneDrive/Desktop/VIBECODE/AnimateMap Studio/.local/yangtze-journey-vi/Yangtze-Journey-VI-Source.zip` · 106904595bytes.
- ZIP SHA256: `7815f14066c343b431a7bc1bb984ea28d39b9726590a7c85fe367f26a42e0bb7`.
- Voice SHA256: `ffa455a40b3e91519d7d193300a81c13000b46c1345565e78d8325d4485319d6`.
- Master SHA256: `335836cbaab30c0c60dacb34fa0c79b2510faa975b7d6727ac443b778c38ffe1`.

**Nội dung:** đúng script đã duyệt và đầy đủ các ý chính mẫu, không có quảng cáo cuối. **Media:** bản xem trước có tiếng/hoạt cảnh vàsource đã qua các gate nêu trên. **Chưa xuấtMP4**, không có kiểm codec/CFR/decodedMP4 được nhận là đã đạt. Theo skillRemotion, tạo video mặc định mởStudio, xuất khi có yêu cầu xuất rõ; user có thểreview/chỉnh vàdùngRender trongStudio. Không tự báoMP4hoànchỉnh chỉ từpreviewpass. Tất cảcachepaid/audio, phiênbảnengine vàQA được giữ; không dọn/xóa file.

Khi tiếp tục: kiểm `delivery-report.json`, dùng lại voice/master/timing/plan/assets đã xong, không gọi lạiTTS. Nếu người dùng yêu cầuexport, dùngsnapshot cuối này, kiểm dung lượng trước render dài, rồi audit đầy đủframe/CFR/hìnhgiảimã/tiếng/endpoint trước giaoMP4. NativeJSON là planmột phần; sourceRemotion/HF đầy đủ mới tái hiện composite.


## Trạng thái mới nhất — xuất MP4 theo yêu cầu tiếp tục

Đã xuất và xác minh MP4, bản preview ở trên là lịch sử giai đoạn trước. Giữ toàn bộ script/voice/master/timing, không gọi lạiTTS.

- MP4: `C:/Users/PC/OneDrive/Desktop/VIBECODE/AnimateMap Studio/.local/yangtze-journey-vi/Doc-Song-Truong-Giang-VI.mp4` · 124246256bytes.
- SHA256: `c0a9af0df5ec6fad7deb0e96b3da1d2ac5d06f9726c3cea42e5ba8a74217c1df`.
- SourceZIP: `C:/Users/PC/OneDrive/Desktop/VIBECODE/AnimateMap Studio/.local/yangtze-journey-vi/Yangtze-Journey-VI-Final-Source.zip`.
- ZIP SHA256: `b93c573a7906b4e19c5a87693b707bb1bd53084e674af4eb170f3d530980afd6`.
- 4.981frame audit đạt, 254frameMP4 giải mã đạt, audio correlation0.999825/SNR34.50dB/0clipping. Đã kiểmCFR/PTS,codec,faststart,endpoint; mux giữpackets/config.
- Tái dùng1.055PNGnative đúngsnapshot bằnghardlink, render các frame thiếu bằngRemotionrenderFrames; không xóaQA hoặc paidcache. Chưa nhận đã nghe độc lập toàn audio. Không còn phần bắt buộc của yêu cầu xuất.
