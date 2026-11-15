# Audit bộ sản xuất video dùng lại — 15/11/2026

Phạm vi: sao lưu công cụ tạo video mới; không đưa video thành phẩm, voice riêng, ảnh địa điểm hoặc cache sản phẩm lên GitHub. Không khởi tạo lại ứng dụng hay đổi evaluator/renderer native đang hoạt động.

| Nhóm                                                                 | Hiện trạng và quyết định                                                                                                                                                                                                      |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/`, `packages/`                                                 | Engine/editor/API/render worker hiện có, đã theo dõi Git; giữ nguyên. Entry native: `apps/render-worker/src/cli.ts`.                                                                                                          |
| `integrations/`, `scripts/director.ts`, `scripts/setup-director.mjs` | Adapter Vox Director/HyperFrames đã có bản nguồn, upstream commits và runtime lock; giữ lại, dùng setup để tái tạo `.local/integrations`. Không cần push checkout hay `node_modules`.                                         |
| Remotion trong `.local/*/remotion`                                   | Runtime từng video phụ thuộc junction và thư mục khác; tách runtime ghim phiên bản ra `integrations/remotion/`. Không thay runtime của sản phẩm đã giao.                                                                      |
| Component bản đồ, caption, ảnh, actor                                | Tách phần dùng lại thành `shared/video-components/`; nhận props thay dữ liệu/tên riêng của video. Giữ thuật toán. Starter được sao chép độc lập, không nối vào source video khác.                                             |
| Helper audio/alignment/verification                                  | Bản thử nghiệm có đường dẫn `.local/...` và Python vendor hardcode; bổ sung một CLI argparse với input/output rõ ràng, dùng lại phép tổng hợp/mix và profile render đã có.                                                    |
| Asset chung                                                          | Giữ font, basemap, geometry tham chiếu/77 feature đảo, nguồn và giấy phép. Không đóng gói ảnh sản phẩm hoặc âm thanh dịch vụ trả phí. Asset cờ/dữ liệu native đã có ở `apps/web/public/`.                                     |
| Môi trường                                                           | Thiếu hướng dẫn phục hồi đầy đủ, doctor và smoke test; bổ sung. API key, login và model weights không thuộc bản sao source.                                                                                                   |
| File thừa/trùng                                                      | `node_modules`, browser binaries, venv, `.local`, `work`, render/build/log là dữ liệu cài/tạo lại. Chỉ loại khỏi Git, không xóa ở đợt này. Hai script purge và năm JSON chưa commit từ trước không được gộp vào thay đổi này. |

Danh mục file source trước đợt này và hash các nguồn component được ghi ở `portability/source-inventory.json`. Không suy file không dùng chỉ từ tên; không xóa file nguồn nào.

## Baseline và giới hạn

Trước khi tách component đã chụp sáu frame bằng engine hiện có vào `.local/portability/baseline`. Bản gốc được chạy lặp độc lập và tự có sai khác một nhãn: đo Canvas diễn ra trước khi subset font tiếng Việt hoàn tất. Bổ sung `FontReady` trong bộ dùng chung, không sửa video hay ứng dụng cũ. Lưu riêng baseline thô, lần lặp, baseline có hàng rào font và candidate; không thay golden để giấu sai khác.

Ảnh sau tách được so bằng profile sản xuất có sẵn (meanRGB<3/255, tỷ lệ pixel có kênh sai>30 dưới2%). Phép tổng hợp và mix âm thanh được đối chiếu WAV master +3 stem với bản gốc trước tách, yêu cầu giống từng byte. Không nhận mọi PNG/GPU khác máy là pixel-identical. Số đo và kết quả cuối ở `portability/verification.json`.

## Không đổi hoặc mở rộng

- Không đổi schema/evaluator native, API voice, AI planner, master/timing của video đã làm.
- Không tự gọi TTS/planner, upload audio, sao chép credential hoặc cài skill toàn hệ thống.
- Starter sáu giây chỉ kiểm khả năng kỹ thuật. Storyboard/camera/ảnh/diễn biến cho nội dung mới vẫn phải được tác giả dựng và duyệt theo quy tắc.
- Chỉ gọi setup/doctor/smoke là đã kiểm khi có log thực. Checkout sạch trên cùng máy không đồng nghĩa thử mọi OS/GPU hoặc kiểm dịch vụ AI live.
