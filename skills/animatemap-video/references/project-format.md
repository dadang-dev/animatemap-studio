# Project, audio và timing

Đọc khi tạo/chỉnh project Remotion portable. Native `.animatemap.json` vẫn dùng schema/evaluator riêng; không đổi schema đó theo file này.

Project có `src/index.tsx`, `src/Film.tsx`, `src/shared/`, stylesheet, `public/project.json`, asset local, `package.json`, lockfile và `tsconfig.json`. Init tạo toàn bộ skeleton. Dùng TypeScript JSX để thiết kế diễn biến mới; JSON không tự sinh mọi hoạt cảnh cho mọi chủ đề.

Các trường JSON chính:

| Trường                 | Quy tắc                                                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `version`, `id`        | version1; ID chữ/số/gạch ngang, cũng là composition ID                                                                          |
| `width`,`height`,`fps` | Profile hiện tại1080×1920/30; profile khác phải có test/golden riêng, không đổi ngầm                                            |
| `duration`             | >0, tối đa300giây, N=ceil(duration×fps); audio phải đủ endpoint N/fps                                                           |
| `scenes`               | 1..20, có id/title/start/end, liên tục từ0 đến duration                                                                         |
| `map`                  | center=[longitude,latitude], widthDegrees; dùng chung Mercator65536 world units với geometry/anchor                             |
| `captions`             | Các trang có start/end và words[]; mỗi word có text/startSeconds/endSeconds nằm trong trang, dùng `[start,end)`                 |
| `audio`                | Tên master local dưới public; AAC48kHzstereo sẽ encode từ master; đủ sample không im lặng giả để che sai timing                 |
| `image`                | Tên asset local của scene, không URL hoặc đường dẫn ra ngoài public; có provenance/license riêng khi thay ảnh thử bằng ảnh thật |
| `protectedNames`       | Cụm tên/từ cần giữ liền khi wrap; không đổi timestamp để nối cụm                                                                |
| `credits`              | Credit cần thiết để hiểu nội dung/đáp ứng giấy phép; kỹ thuật dài để trong companion docs                                       |

Fixture có word intervals cho âm thử, không ASR lời nói; bắt buộc thay bằng timestamp thật khi làm voice. Không gọi SRT là karaoke word-level.

Timeline audio của mixer:

```json
{
  "duration": 2,
  "beats": [
    { "start": 0, "end": 0.8, "action": "snow" },
    { "start": 0.8, "end": 1.5, "action": "source-water" },
    { "start": 1.5, "end": 2, "action": "cargo" }
  ]
}
```

WAV đầu vào:48kHz/mono/PCM16, dài không quá timeline. Mixer sinh stereo master.wav,3stem và audio-provenance.json, giữ thuật toán cũ. Các action âm thanh chỉ là loại cue; dùng lại cue nếu giúp diễn giải, không ép mọi video vào cùng nhịp. Không sửa tempo/tốc độ mà quên đổi word timing.

ASR `align` nhận audio, approved text, cache dir và output JSON. Pin model small/revision trong config; không upload audio. Output vẫn cần đối chiếu transcript, năm, tên và dấu ngắt. Giữ interval provider/model gộp; không tự tạo chi tiết timing không đo được.

`package` chỉ chấp nhận source/video còn trùng fingerprint/hash của báo cáo pass. ZIP chứa src/public/dependency manifest/timing cần thiết và giấy phép; runtime binary, model, frame cache và key không được gói. Một project tùy biến tự thêm helper phải kiểm và đóng gói helper đó riêng nếu nó nằm ngoài src/public.
