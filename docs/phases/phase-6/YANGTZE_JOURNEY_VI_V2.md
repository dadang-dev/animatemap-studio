# Dọc sông Trường Giang V2 — bổ sung ảnh thực tế

Yêu cầu người dùng ngày 12/11/2026: bổ sung hình thực tế từng nơi. V2 thay phần hình của V1; giữ nguyên câu hỏi, đáp án, kết luận, CTA, lời đọc và âm thanh. Không có teaser series khác.

# Trường Giang V2 — ảnh thực tế

Đã bổ sung 16 ảnh tư liệu của các địa điểm được nói đến, đúng cue lời đọc; giữ bản đồ, các diễn biến giải thích và karaoke. Không thay lời thoại, voice Anh Khôi 1.0, nhạc/SFX, audio master, thời lượng hoặc timestamp.

MP4: `Doc-Song-Truong-Giang-VI-V2.mp4`, 166,033 giây, 1080×1920/30 fps, H.264/yuv420p, BT.709 limited, AAC stereo 48 kHz, faststart.

SHA256 MP4: `96547249bbf0039ef23f7e8a3e4e6990e258612245a8c9c329bb7b486a50e7b3`.

Snapshot: `a9898fcf13b89b1355dcc3d3ca8a2b21f28739e1df3a77442f634b8fe9d5a672`.

## Mở source

Trong workspace, Studio: http://127.0.0.1:3045/Yangtze-Journey-VI-V2 . Với ZIP độc lập, vào `remotion`, chạy `npm ci` theo lockfile rồi:

```powershell
node --require ./loopback.cjs ./node_modules/@remotion/cli/remotion-cli.js studio src/index.tsx --port=3045 --no-open
```

Dựng MP4 độc lập:

```powershell
node --require ./loopback.cjs ./node_modules/@remotion/cli/remotion-cli.js render src/index.tsx Yangtze-Journey-VI-V2 ../Doc-Song-Truong-Giang-VI-V2.mp4 --codec=h264 --crf=16 --pixel-format=yuv420p --gl=angle --concurrency=2
```

Không cần gọi lại TTS. Không cam kết MP4 có hash giống trên máy khác; chỉnh source/chuyển runtime cần kiểm lại đầu ra. `export.mjs` là helper resume cho workspace hiện tại, cache/bundle trung gian không có trong ZIP. `lossless-cache-final.json` chỉ là bằng chứng, không phải cache độc lập.

## Thành phần

- `src/Photos.tsx`, `public/photo-timeline.json`: ảnh thật, identity theo cảnh, crop/scale và cue.
- `src/Film.tsx`, `Actions.tsx`: camera, bản đồ, karaoke và 46 diễn biến nội dung.
- Vox Director: dùng lại 31 shot đã hợp schema, vẫn điều khiển framing/treatment trong Film. Native JSON là kế hoạch một phần; source Remotion mới tái hiện đủ composite có ảnh.
- HyperFrames/GSAP: dùng lại turbine RGBA `turbine-cue-v2`, 180 frame/6 giây. Không gọi lại công cụ khi phần này không đổi.
- `locked-inputs-v2.json`: hash trước/sau của lời đọc/voice/master/timing/SRT/timeline/plan.
- `PHOTO_SOURCES.md`: tác giả, giấy phép, mô tả đúng ngữ cảnh, URL, năm ảnh và checksum. Ảnh thực tế không phải ảnh trực tiếp; ảnh trên nhánh sông/ảnh công trình hiện đại có chú thích rõ.
- `STORYBOARD.md`: các hành động và cue; `subtitles.srt`: phụ đề câu, không mang hiệu ứng highlight từng từ. Word timing/style nằm trong JSON của composition.

## Kiểm tra

1135 khung native trên mọi trang caption/biên cảnh/biên ảnh đạt, 17 capture Studio thực ở 100%/DPR1 so PNG độc lập đạt. Provider screenshot trả JPEG; so reference theo chính quantization/subsampling screenshot và ngưỡng có sẵn, không nhận pixel-identical.

4.981 frame audit đạt. 278 frame giải mã MP4 so native đạt ngưỡng cũ, bao gồm đầu/giữa/cuối từng ảnh và mốc đổi ảnh; không nới tolerance. Toàn bộ PTS, FPS, codec, endpoint và faststart đạt. Âm thanh giải mã đủ số sample, correlation 0.999825, SNR 34.50 dB, không clipping. Không nhận đã có người nghe độc lập toàn video.

Bản đồ chính và locator giữ 77 feature đảo Việt Nam, có nhãn Hoàng Sa/Trường Sa. Dữ liệu tham chiếu không là kiểm kê pháp lý mọi bãi/đá. Nền NASA tổng hợp tháng 01/2004, Natural Earth tham chiếu, © OpenStreetMap contributors/ODbL. Giấy phép đầy đủ và raw source giữ trong gói; không xóa attribution bắt buộc. Giữ nguyên các giấy phép ảnh CC BY/CC BY-SA/PD và thông báo Remotion, Noto, HyperFrames, Vox Director, GSAP.


## Bàn giao

- MP4: `C:/Users/PC/OneDrive/Desktop/VIBECODE/AnimateMap Studio/.local/yangtze-journey-vi-v2/Doc-Song-Truong-Giang-VI-V2.mp4`
- Source ZIP: `C:/Users/PC/OneDrive/Desktop/VIBECODE/AnimateMap Studio/.local/yangtze-journey-vi-v2/Yangtze-Journey-VI-V2-Source.zip`
- ZIP SHA256: `9a0be58cce36b4ce14f4b75a43bc389fcee948f81d860ab8e81812a6d01db764`
- Nội dung: script đã duyệt giữ nguyên; đủ 16 ảnh đúng ngữ cảnh. Media: MP4, 4.981 audit, 278 frame giải mã và audio đạt.
- Không còn việc bắt buộc trong yêu cầu bổ sung ảnh. V1 được giữ đến khi V2 đạt; việc dọn media/nháp cũ sẽ có biên nhận riêng. Cache trả phí và thư viện phụ thuộc được giữ; không phát hành ra nền tảng ngoài.


## Dọn sau kiểm — 13/11/2026

Đã xóa MP4/ZIP/nháp V1, cache QA V1 có thể tái tạo và draft video V2 sau mux; giữ MP4/ZIP V2, source hai bản, voice/timing/paid cache, nguồn/giấy phép và runtime junction còn được dùng. Biên nhận: `.local/yangtze-journey-vi-v2/cleanup-receipt.json`; cache worker V2 bị hủy có biên nhận riêng `abandoned-cache-cleanup.json`. Hash MP4/ZIP V2 kiểm trước/sau không đổi. Không suy dung lượng vật lý thu hồi từ tổng bytes của các PNG hardlink.

## Lỗi đã bắt và cách ngăn lặp

- Ảnh Tuotuo còn kéo sang câu Kim Sa → giới hạn ảnh ở25,36–28,14s, kiểm cue chữ/ảnh theo lời đọc; giữ voice/cue số. Snapshot cũ bị vô hiệu hóa, cache mới, chạy lại full preflight/parity.
- Audit chạy trước decode ảnh → chờ font và ảnh thật decode xong rồi đọc readiness; không tắt check hoặc nới chuẩn.
- Crop Hổ Khiêu che dòng nước bởi credit → để chú thích ngoài ảnh, chọn vị trí crop theo chủ thể, xem pixel thật.
- Hai screenshot Studio bị raster mờ khi công cụ capture chưa ổn định → chụp lại khi UI ổn định và kiểm cùng ngưỡng; không sửa golden hoặc tolerance.
