# Nguồn và giới hạn asset dùng chung

- `basemap/world.jpg`: ảnh NASA Blue Marble tổng hợp tháng01/2004, không phải vệ tinh trực tiếp. Credit NASA Earth Observatory. [NASA media guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/). Hash/raster4096 trong `geo/world-raster-reuse.json`; bản provenance gốc mô tả bước8192 trước đó, không giả đã tái dựng chuỗi resize trung gian.
- `geo/reference.json`: đường bao Natural Earth v5.1.2, giữ geometry tham chiếu; [public domain](https://www.naturalearthdata.com/about/terms-of-use/). Xem `COUNTRIES-PROVENANCE.json`. Có vùng tranh chấp theo góc nhìn dữ liệu nguồn; không dùng tô cờ để tự xác nhận chủ quyền/kiểm soát.
- `geo/vietnam-islands.geojson`:77 feature chọn từ các lớp Natural Earth1:10m, nguồn/checksum ở `island-source-checksums.json`;18 Hoàng Sa,22 Trường Sa,37 feature khác. Giữ thuộc tính/tọa độ nguồn, trình bày nhãn theo `Skill_rules.MD`. Đây là geometry khái quát, không phải kiểm kê pháp lý mọi bãi/đá/rạn hoặc bản đồ hàng hải. Ký hiệu tối thiểu được phóng đại để nhìn thấy.
- `fonts/`: Noto Sans700 Latin/Vietnamese; SIL Open Font License, giữ `licenses/LICENSE-NOTO-SANS.txt`.
- `smoke/`: SVG và PCM tone tự tác giả tạo cho kiểm thử kỹ thuật, không ảnh địa điểm/voice thật. Cho phép dùng lại theo CC0.
- `licenses/`: giữ nguyên thông báo Remotion, HyperFrames, Vox Director, GSAP. GSAP là Standard No Charge License, không phải MIT. Các thông báo này không làm thay đổi giấy phép của dependency.

`manifest.json` liệt kê hash của asset đóng gói. Những file provenance lịch sử có nhắc tên dự án trước chỉ chỉ ra nguồn gốc; công cụ mới không cần thư mục sản phẩm cũ. Credit bắt buộc phải theo cả video xuất và gói source. Đừng gọi các ảnh tổng hợp/đường bao tham chiếu là dữ liệu live hoặc địa giới pháp lý.
