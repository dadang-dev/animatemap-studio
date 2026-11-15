---
name: animatemap-video
description: Dựng, sửa, kiểm tra và xuất video bản đồ hoặc infographic bằng AnimateMap, Remotion, HyperFrames và Vox Director. Dùng skill này bất cứ khi nào người dùng nhắc làm video bản đồ, video kiến thức, camera theo địa điểm, karaoke, dựng theo video mẫu, xuất MP4 hoặc phục hồi xưởng sản xuất video trên máy mới, kể cả khi họ không nói tên tool.
---

# Làm video với xưởng AnimateMap

## Phạm vi

Dùng engine và component trong checkout AnimateMap Studio để tạo video mới hoặc sửa project có sẵn. Giữ cách kể hình riêng cho từng chủ đề. Không coi starter kiểm kỹ thuật là bố cục bắt buộc cho mọi video.

Không dùng skill này để xây lại ứng dụng từ Phase0, quản lý GitHub đơn thuần hoặc lấy voice/footage/nhạc từ mẫu khi chưa có quyền.

## Chuẩn bị

1. Xác định checkout bằng `--repo`; khi chạy từ repo, CLI tự tìm root. Bản skill độc lập vẫn cần checkout engine, không chứa binary/browser/model.
2. Đọc `AGENTS.md`, `Skill_rules.MD`, `docs/VIDEO_PRODUCTION_WORKFLOW.md` và hồ sơ đúng project. Yêu cầu hiện tại của người dùng ưu tiên; không suy yêu cầu riêng của một video thành mặc định chung.
3. Đọc `docs/NEW_MACHINE_SETUP.md` khi đổi máy hoặc thiếu công cụ. Dùng Node24+, pnpm11.25.0, Python3.11+, FFmpeg/ffprobe. Cài `requirements-video.txt` vào `.venv-video`; dùng đúng lockfile/constraints, không lấy dependency qua junction của sản phẩm cũ.
4. Chạy `pnpm video:doctor`. Khi mới phục hồi máy, chạy thêm `pnpm video:test` và `pnpm video:smoke`.

## CLI

Chạy từ root repo:

```powershell
pnpm video --help
pnpm video init --output .local/projects/new-video
pnpm video validate --project .local/projects/new-video
pnpm video render --project .local/projects/new-video --output .local/renders/new-video-v1
pnpm video verify --project .local/projects/new-video --output .local/renders/new-video-v1
pnpm video package --project .local/projects/new-video --render-dir .local/renders/new-video-v1 --output .local/delivery/new-video-source.zip
```

Khi skill nằm ngoài repo, dùng Python của venv và chỉ rõ checkout:

```powershell
./.venv-video/Scripts/python.exe /path/to/skill/scripts/video_tool.py --repo . doctor
```

Trên Linux/macOS dùng `.venv-video/bin/python`. Không có key vẫn chạy được kiểm kỹ thuật và dựng từ audio local.

## Input/output

Project độc lập có `src/`, `public/project.json`, asset local và manifest dependency. JSON ví dụ:

```json
{
  "version": 1,
  "id": "My-Video",
  "width": 1080,
  "height": 1920,
  "fps": 30,
  "duration": 6,
  "map": { "center": [110.5, 16], "widthDegrees": 22 },
  "scenes": [{ "id": "intro", "start": 0, "end": 6, "title": "Tiêu đề" }],
  "captions": []
}
```

Dùng init để có đủ font, map, geometry đảo, stylesheet, audio thử và TSX. Ví dụ JSON trên chỉ minh họa cấu trúc; không thay project đầy đủ bằng ví dụ rút gọn. Đọc [schema và timing](references/project-format.md) trước khi chỉnh JSON, audio hoặc caption.

Output render: `video.mp4`, `verification.json`, `render-audit.json`, native reference PNG, checkpoint và profile. Output package: ZIP editable có source/asset/lock/license và manifest CRC/SHA; không chứa credential. Hiệu ứng karaoke nằm trong MP4/word timing, không nằm trong SRT thường.

## Quy trình sản xuất

1. Chốt chủ đề, số mục, nguồn/năm/đơn vị, đối tượng xem và định dạng. Xem mẫu đủ timeline; phân biệt tham khảo cách kể với sao chép media. Đối chiếu lời mở đầu với đáp án/kết luận.
2. Viết lời đọc và storyboard theo đối tượng → diễn biến/quan hệ → kết quả → cue. Nếu người dùng yêu cầu duyệt lời trước, hoàn thành phần duyệt đó trước TTS và storyboard phụ thuộc. Tìm asset có quyền dùng và ghi provenance sớm.
3. Tái dùng voice/master/timing/task đã phù hợp. Khi tạo voice mới, kiểm catalogue và quyền gửi đúng script đến đúng provider; thiếu quyền thì hỏi phần dữ liệu/đích cụ thể. Không suy chọn giọng thành phép upload ASR hoặc tạo task trả phí mới.
4. Dùng API/UI voice hiện có; mặc định tham chiếu trong `config/voice-defaults.json`. Không tự gọi endpoint từ script ngoài engine để bỏ qua cache/quyền gửi. Không ghi key trong source, URL hoặc log.
5. Đo audio thật. Nếu cần local ASR, dùng `align` với script đã duyệt và cache model. Chỉ cho phép tải public model bằng cờ rõ ràng. Kiểm transcript/tên/năm và interval gộp; đừng chia đều câu hoặc bịa word timing.
6. Tạo/dùng lại plan Vox Director đã hợp schema. Dùng HyperFrames cho đồ họa có vai trò thật; đọc `integrations/README.md` trước plan/compose/check/render. Không gọi lại planner hay HyperFrames chỉ để ghi công cụ đã dùng. Không có quyền gửi thì tiếp tục phần local độc lập.
7. Dựng project mới bằng component `shared/video-components/` hoặc engine native hiện có. Dùng project time cho caption, scene-local time cho hành động. Gắn identity/remount đúng khi đổi ảnh/SVG và chờ font/ảnh thật ready. Mở Studio và xem đoạn khó ở tốc độ1×; `render` CLI không thay bước xem preview.
8. Với bản đồ Việt Nam, giữ geometry/77 feature tham chiếu và nhãn Hoàng Sa, Trường Sa; xem nguồn/giới hạn trong `shared/assets/NOTICES.md`. Kiểm pixel thực, không chỉ số phần tử DOM. Giữ locator đủ phạm vi khi cảnh cận; tránh ảnh, actor và leader line.
9. Khóa source/profile trước QA. Khi chỉ sửa hình, giữ hash voice/master/timing/script/SRT. Chọn output directory mới nếu fingerprint đổi; resume đúng checkpoint nếu chỉ gián đoạn. Chạy một heavy render mỗi output.
10. Kiểm mọi cảnh/caption/cue/biên ảnh, typography thật, geography và Studio/native parity. Đọc [gate chất lượng](references/quality-gates.md). Không bỏ check, đổi golden hoặc nới tolerance để làm pass.
11. Chỉ nhận hoàn tất khi MP4 thực và audio giải mã đạt; phân biệt pass kỹ thuật với nội dung được duyệt. Giao MP4, source ZIP, caption/timing và nguồn. Chỉ dọn sau pass theo phạm vi đã được phép, có danh sách/biên nhận và kiểm dependency/junction.

## Local audio

```powershell
pnpm video align --audio .local/input/voice.wav --script .local/input/approved.txt --cache-dir .local/models --output .local/input/words.json --allow-model-download
pnpm video mix --voice .local/input/voice-48k-mono.wav --timeline .local/input/timeline.json --output .local/audio/mix-v1
```

Bỏ cờ model-download khi đã có cache. Mixer chỉ nhận mono PCM16/48kHz, không cắt lời. Giữ provenance voice và timestamp theo biến đổi audio. Dùng seed319/duck/gain có sẵn, không tự lấy soundtrack của mẫu.

## Khi lỗi

- File/JSON/path/timing sai: sửa input, đọc `--help` và schema; không giảm guard.
- Browser/runtime thiếu: chạy setup theo lockfile; không mượn đường dẫn máy cũ.
- Output tồn tại: chọn thư mục mới hoặc resume cùng source; không ghi đè tùy tiện.
- Font/ảnh/geometry/karaoke khác: kiểm subset Việt, decode và scene identity; không kết luận từ DOM đúng.
- Audio dài hơn timeline: tăng cảnh hợp lý hoặc sửa lời trong phạm vi đã duyệt; không cắt speech tail.
- Dịch vụ/key/model thiếu: báo đúng bước, giữ cache, làm phần local đã được phép; không giả job/thành công.

Giữ bí mật ngoài Git. Đọc `docs/PORTABILITY_AUDIT.md` và `docs/portability/verification.json` khi đánh giá mức tái lập; không hứa kết quả AI hoặc raster mọi GPU giống100%.
