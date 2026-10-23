# Những cây cầu nổi tiếng ở Việt Nam

Yêu cầu ngày24/10/2026: video mới, có hình thực tế; đọcAGENTS và dùng thậtRemotion, HyperFrames, VoxDirector; báo cáo ngắn phần việc từng công cụ.

## Nội dung và hình ảnh

Tuyển chọn7cầu theo hành trình Bắc–Nam: LongBiên, NhậtTân, TrườngTiền, Rồng, Vàng, MỹThuận, CầnThơ. Không đặt thứ hạng nổi tiếng định lượng hoặc khẳng định đây là toàn bộ cầu nổi tiếng. Phân biệt cầuVàng đi bộ, cầuMỹThuận đầu tiên vớiMỹThuận2, sôngTiền với sôngHậu. Không chọn một năm khánh thànhTrườngTiền khi tài liệu có mốc bất nhất. Nguồn chính: cơ quan văn hóaHàNội, du lịchViệtNam/ĐàNẵng/Huế, đơn vị tư vấnTEDI, VGP vàDFAT; URL/provenance nằm tronggói nguồn.

Ảnh thực7cầu từWikimediaCommons, cómetadata/tác giả/license/hash. ẢnhLongBiên dùng lạiasset đã cóCC BY2.0; ảnhcầuVàng đổi sang góc rộng thấy cảhai bàn tay của xiquinhosilva. ClipcầuRồng phunlửa: Christophe95/CC BY-SA4.0, quay2018, bỏsoundtrack gốc; đoạn8–15giây của bảntranscode được trích210PNG/30fps để preview/render ổn định. Hook bắt đầu ởoffset1giây của excerpt; xem đúngframe hoạt cảnh, không suy từ ảnh đầu/midpoint.

Thiết kế nhật ký ảnh với màu giấyấm, mapvệ tinh định vị và locatorViệtNam, ảnh lớn, sơđồkiếntrúc, karaoke vùng an toàn. NguồnNASAcomposite01/2004/NaturalEarth5.1.2 không phải hiện trạng vệ tinh/địa giớipháplý2026. Pin theoWGS84 ở quy môđịnh hướng, không khảo sát timcầu. Renderingatlas/vector theoWebMercator, không báo làMapLibre live.

VoiceAnhKhôi1.0 được tạo một tasktext-only cócache. LocalASRsmall/int8 mất25,56giây,259nhóm timing;10sửa chính tả/đồngâm cóaudit, giữ nguyêninterval/audio, không nhận là đã nghe độc lập. Hook kết thúc1,48giây; video78,5giây/2355frame,10cảnh,53trang karaoke. Nhạc/chime gốc vàmaster dùng chungpreview/render.

## Phần việc thực của ba công cụ

| Công cụ | Phần việc |
| --- | --- |
| VoxDirector | ManagedCodexCLI tạo20shot trong49,658giây. Plan được validate trênnativeproject; framing điều khiểnlenswide/detail/action, treatment điều khiểnpaper-reveal/push/hold; chuyểnlens mượt và tôn trọng timing lời đọc. Không giảmediaAPI hoặc đọcauthtoken. |
| HyperFrames0.8.168 | GSAPpaused dựng7sơđồkiếntrúc seek được, render420alphaPNG/30fps trong19,3giây. Lint/runtime/layout đạt,10/10kiểm tương phản đạt. Chuỗi được chọn đúngframe trongRemotion và giữframecuối. Sơđồ là minh họa, không bản vẽ kỹthuật. |
| Remotion4.0.536 | Dựngcomposition cuối: map/pin/locator, ảnh/clipthật, thẻ thông tin theo cue, sơđồHF, chuyển độngtheoplanVox, karaoke vàaudio. Dùng chungmodel giữaStudio/render. |

## Kiểm và bàn giao

StrictTypeScript/ESLint và7unit tests đạt; Zodschema và2355frame native deterministic đạt. Preflight101khung bao gồm mọi caption/cảnh;75khung feature gồm biên20shot±1frame, mọi cầu và các mốcphunlửa. Framehook8 có13.148pixel sáng màu lửa trong vùngảnh, xác nhận hành động thực hiện trên hình.10mẫuStudio/native đều meanRGBA0/255, không nới ngưỡng.

Finalgate gồm all-frame runtimeaudit, ffprobe/PTS/endpoint/faststart, framegiải mã/audio vàpacketproof, ZIPcredentialscan/integrity. Số đo cuối được lưu tại `.local/vietnam-bridges/production-report.json`, `verification.json`, `delivery.json`; chỉpass của các báo cáo này xác nhận bản giao. Cleanup chỉ dọnQA/intermediate saupass, giữsource, paidcache vàruntimejunction.

Project/preview: `.local/vietnam-bridges`, composition`Vietnam-Bridges`, loopback3026. Media: `Nhung-Cay-Cau-Noi-Tieng-Viet-Nam.mp4`; source`Vietnam-Bridges-editable-source.zip`; báo cáo ngắn`ENGINE_REPORT.md`. JSONnative chỉ là nguồn nội dung/bản đồ, không thay thếsourceRemotion/HF đầy đủ. Không gánMIT/CC0 cho tất cảdependency hoặcảnhngoài; giấy phép riêng được giữ tronggói.


## Kết quả cuối

MP4 đạt tất cả gate: H.264/yuv420p,1080×1920/30fps,78,5giây,2355frame, AAC48kHzstereo/faststart; mọiPTS/endpoints đạt.144frame giải mã đạt, meanRGB lớn nhất2.159290/255; audio correlation0.999845, SNR35.02dB, clipping0. Mux giữ nguyên2355packet/PTS/DTS sau chuẩn hóa màu. Render161,237giây.

MP476320514byte, SHA256`63c2198550559c8b4d000c4c14fa084666f916e9b2edc84530755dd2be095ef9`. ZIP150518746byte,750entry, SHA256`5a01f90078ad47f0c177cf57a3bd4da735375fa495a610b3c830ee7275d652b8`; credentialscan và kiểm hash mọientry đạt. Đã dọn817289847byte QA/intermediate; giữsource/assets/paidcache vàruntime được dùng chung. Hash cuối/dependency kiểm lại sau dọn đạt. Preview3026 đã mở bằng browser thật sau dọn; báo cáo3engine ởENGINE_REPORT.md đi tronggói.
