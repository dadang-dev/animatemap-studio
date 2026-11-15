# Khôi phục xưởng sản xuất video trên máy mới

Repo lưu engine, component, asset chung, dependency lock, quy trình và kiểm tra. Mỗi project mới được tạo ở `.local/` và không tự push lên GitHub. Không cần mang video thành phẩm hoặc `node_modules` từ máy cũ.

`CODEX_START_PROMPT.md` và kế hoạch Phase0–5 là đề bài phát triển gốc, được giữ nguyên. Khi phục hồi để làm video, đọc tài liệu này và AGENTS; không yêu cầu agent xây lại ứng dụng.

## 1. Chuẩn bị

Môi trường tham chiếu: Windows x64, Node24.19.0, pnpm11.25.0, Python3.12, FFmpeg/ffprobe9.0. Chi tiết ở `config/reference-environment.json`. Bản cài đúng phiên bản thư viện nằm trong lockfile; không chạy upgrade hoặc thay lockfile để chữa lỗi cài.

Cài Git, Node24+, pnpm11.25.0, Python3.11+ và FFmpeg/ffprobe có `libx264`, `libx264rgb`, AAC; đặt executable vào PATH. Python alias Windows Store không thay cho một Python thực. Tự đăng nhập Codex nếu cần tạo kế hoạch mới. AI33 là dịch vụ riêng; không cần key để chạy smoke hoặc dựng từ audio đã có.

```powershell
git clone https://github.com/dadang-dev/animatemap-studio.git
cd animatemap-studio
node --version
pnpm --version
python --version
ffmpeg -version
ffprobe -version
./scripts/setup-machine.ps1 -Python python -Smoke
```

Script cài dependency root bằng frozen lock, Chromium Playwright, runtime Remotion bằng npm ci, browser Remotion, upstream/adapters Vox Director/HyperFrames và venv Python có constraints. Không copy key/login, không gọi AI trả phí và không tải ASR model ngầm. Chạy lại không được ghi đè adapter đang sửa. Nếu PowerShell chặn script, dùng các lệnh thủ công dưới đây thay vì sửa chính sách bảo mật toàn máy.

```powershell
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
npm ci --prefix integrations/remotion --ignore-scripts --no-audit --no-fund
node scripts/video-runtime.mjs install-browser
pnpm director:setup
python -m venv .venv-video
./.venv-video/Scripts/python.exe -m pip install -r requirements-video.txt
pnpm video:doctor
pnpm video:test
pnpm video:smoke
pnpm video:integration-smoke
```

Linux/macOS: Python nằm ở `.venv-video/bin/python`, dùng các lệnh tương đương và cài system libraries cho Chromium bằng Playwright. Node wrapper tự chọn đường Python theo OS. Kiểm thử phát hành tham chiếu là Windows; không tự nhận đã kiểm GPU/OS khác. `setup-machine.ps1` dành cho Windows.

## 2. Cổng chấp nhận máy mới

`pnpm video:doctor` phải đạt các công cụ, browser, hash asset và adapter cài đặt. `pnpm video:test` kiểm CLI, JSON/path lỗi, chống ghi đè và PCM mixer. `pnpm video:smoke` dựng fixture sáu giây1080×1920/30fps, audit mọi frame, đổi ảnh, font,77 đảo/locator, karaoke, CFR/codec/faststart, so khung MP4 và decoded audio; so thêm ba golden PNG của fixture. Tất cả output ở `.local/portability/`, không Git.

Không nới tolerance hoặc cập nhật golden để làm máy mới qua. So phiên bản/GPU/font/encoder và sửa nguyên nhân. Sau smoke, dựng pilot10–20giây phù hợp đề tài thật, kiểm playback/ảnh/voice/camera trên điện thoại. Smoke không đánh giá chất lượng kể chuyện hoặc xác nhận dịch vụ AI live.

## 3. Tạo project mới

```powershell
pnpm video --help
pnpm video init --output .local/projects/my-video
pnpm video validate --project .local/projects/my-video
pnpm video render --project .local/projects/my-video --output .local/renders/my-video-v1
pnpm video verify --project .local/projects/my-video --output .local/renders/my-video-v1
pnpm video package --project .local/projects/my-video --render-dir .local/renders/my-video-v1 --output .local/delivery/my-video-source.zip
```

Starter là mẫu kỹ thuật trung tính. Thay câu chuyện, camera, đồ vật/hành động, dữ liệu và asset cho chủ đề mới; không dùng cùng bố cục cho mọi video. Chỉnh `public/project.json` và TSX; schema đầu vào ở `../skills/animatemap-video/references/project-format.md`. Component là bản copy từ `shared/`, không phụ thuộc project khác hoặc junction tới video cũ.

`render` ghi checkpoint từng chunk120frame; chunk RGB CRF0 được so SHA256 từng frame trước khi chỉ xóa PNG tạm của đúng job. Encode cuối là một lượt liên tục, không nối video cũ. Tiếp tục bằng cùng lệnh nếu input/profile vẫn trùng; đổi input thì dùng output directory mới. Chỉ một heavy render cho một output; lock từ tiến trình còn sống sẽ bị từ chối. Không xóa cache job đang chạy.

`verify` không thay thế Studio parity/review của dự án thật. Quality profile có ngưỡng đã dùng trong sản xuất, không cam kết hash MP4 hoặc pixel giống trên mọi phần cứng. Engine Remotion portable là lớp bổ sung, không thay native AnimateMap renderer/JSON.

## 4. Voice, local ASR và mix

Voice mặc định và tốc độ ở `config/voice-defaults.json`. Kiểm catalogue thực tế và quyền gửi script cho project mới trước khi tạo voice bằng API/UI hiện có. Ghi task/cache và resume; không tạo lại vì chat/máy bị gián đoạn. Không copy file đăng nhập Codex hoặc API key vào Git.

`.env.example` chỉ là tài liệu tên biến. `pnpm dev` không tự nạp `.env`. Ví dụ đặt `$env:AI33_API_KEY` trong shell riêng của bạn trước khi chạy, hoặc dùng local secret file theo VoiceService hiện có. Không dán key vào commit/log/chat.

ASR là local, không upload. Model/public weights không push; revision và checksum gốc ở `config/asr-model.json`. Lần đầu cho phép tải model rõ ràng:

```powershell
pnpm video align --audio .local/input/voice.wav --script .local/input/approved.txt --cache-dir .local/models --output .local/input/words.json --allow-model-download
```

Lần sau bỏ `--allow-model-download`. Kiểm script/tên/năm; ASR timing có sai số, không tự tách interval gộp hoặc gọi timing là đo chuẩn tuyệt đối. Các package Python bắc cầu được ghim bằng `config/python-video-constraints.txt`; không mang thư mục Python vendor từ máy cũ.

Mixer nhận WAV mono PCM16/48kHz và timeline `{duration,beats:[{start,end,action}]}`; dùng lại thuật toán tổng hợp nguyên gốc, seed319, envelope duck và gain chống clipping. Giữ provenance riêng cho voice/nhạc/SFX ngoài mixer nếu dùng asset dịch vụ:

```powershell
pnpm video mix --voice .local/input/voice-48k-mono.wav --timeline .local/input/audio-timeline.json --output .local/audio/mix-v1
```

Không cắt speech để khớp duration. Không ghi đè thư mục output. Đặt master vào public của project và dùng timestamp thật của audio tương ứng.

## 5. Skill và sao lưu

Skill nguồn nằm ở `skills/animatemap-video/SKILL.md`, CLI chính là `scripts/video_tool.py`. Có thể đọc/invoke skill trong repo; không cần cài toàn hệ thống. Nếu copy skill sang thư mục cá nhân hoặc dùng file `.skill`, truyền `--repo` đến checkout này. Skill điều phối engine trong repo, không chứa binary/browser/model hoặc bí mật.

Push source/lock/config/skill/template/asset có phép dùng/fixture, không push `.local`, `work`, venv, build, browser binaries hay credential. Source của project sản phẩm có thể đóng ZIP riêng bằng lệnh package. GitHub của xưởng không phải dịch vụ backup tự động các sản phẩm riêng.

## 6. Lỗi thường gặp

| Lỗi                        | Cách xử lý                                                                                               |
| -------------------------- | -------------------------------------------------------------------------------------------------------- |
| Node/Python không có       | Cài executable thật, mở shell mới hoặc truyền đường dẫn Python vào setup.                                |
| Runtime/browser thiếu      | Chạy các bước npm ci và install-browser; đừng lấy junction của video cũ.                                 |
| Adapter đã sửa             | Setup sẽ dừng để bảo toàn sửa đổi; so với source `integrations/`, không force overwrite.                 |
| JSON/path/word timing sai  | Sửa file theo thông báo, chạy validate trước render.                                                     |
| Snapshot khác trong output | Chọn output mới; không dùng frame cache cũ cho source mới.                                               |
| Hết dung lượng             | Giữ checkpoint, dọn đúng phần đã được phép rồi chạy lại cùng lệnh.                                       |
| Model chưa có và offline   | Tải public model revision đã ghim trong bước có mạng với cờ cho phép, hoặc truyền thư mục model đã kiểm. |
| Golden/decoded/audio fail  | Điều tra source/font/crop/image identity/GPU/cue/encoder; không bỏ check hoặc nới ngưỡng.                |
