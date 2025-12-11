# Project TODO - Hệ thống Tính toán CPK/SPC

## Core Features

- [x] Form nhập liệu cho phép người dùng chọn mã sản phẩm, trạm sản xuất, và khoảng thời gian kiểm tra
- [x] Hệ thống cấu hình kết nối database động với connection string và mapping tên bảng dữ liệu
- [x] Truy vấn dữ liệu từ MachineDatabase theo các tiêu chí đã chọn (mã sản phẩm, trạm, thời gian)
- [x] Tính toán các chỉ số SPC/CPK từ dữ liệu kiểm tra (Mean, Std Dev, Cp, Cpk, UCL, LCL)
- [x] Hiển thị kết quả tính toán dưới dạng bảng số liệu với các chỉ số thống kê
- [x] Biểu đồ Control Chart (X-bar, R-chart) để trực quan hóa xu hướng dữ liệu kiểm tra
- [x] Bảng cấu hình cho phép admin quản lý mapping giữa (mã sản phẩm + trạm) với (database + tên bảng)
- [x] Xuất kết quả phân tích CPK/SPC ra file HTML/CSV để lưu trữ và chia sẻ
- [x] Gửi thông báo cho owner/quản lý khi chỉ số CPK vượt ngưỡng cảnh báo (CPK < 1.33)
- [x] Sử dụng LLM để phân tích xu hướng dữ liệu SPC và đưa ra khuyến nghị cải tiến

## UI/UX

- [x] Thiết kế giao diện elegant and perfect style
- [x] Dashboard layout với sidebar navigation
- [x] Responsive design cho mobile và desktop

## Phase 2 - Mở rộng hệ thống

### Database dây chuyền sản xuất
- [x] Bảng ProductionLine (dây chuyền sản xuất)
- [x] Bảng Workstation (công trạm thuộc dây chuyền)
- [x] Bảng Machine (máy móc thuộc công trạm)
- [x] Cấu hình quy trình dây chuyền

### Biểu đồ nâng cao
- [x] XBar Chart với control limits
- [x] R Chart với control limits
- [x] Biểu đồ phân bổ (Histogram) của XBar
- [x] Biểu đồ phân bổ (Histogram) của R Chart
- [x] Bảng dữ liệu mẫu (Sample Table)

### Tiêu chuẩn kiểm tra
- [x] 8 SPC Rules (Western Electric Rules)
- [x] CA Rules (Control Analysis Rules)
- [x] CPK Rules (Process Capability Rules)
- [x] Hiển thị violations trên biểu đồ

### Phương thức lấy mẫu
- [x] Lấy mẫu theo năm
- [x] Lấy mẫu theo tháng
- [x] Lấy mẫu theo tuần
- [x] Lấy mẫu theo ngày
- [x] Lấy mẫu theo giờ
- [x] Lấy mẫu theo phút
- [x] Lấy mẫu theo giây
- [x] Tần suất lấy mẫu tùy chỉnh (n mẫu trong khoảng thời gian t)

### Dashboard Realtime
- [x] Cấu hình số lượng dây chuyền hiển thị
- [x] Chọn dây chuyền cần theo dõi
- [x] Biểu đồ thu nhỏ (sparkline) cho mỗi dây chuyền
- [x] Hiển thị chỉ số SPC cơ bản (CPK, Mean, UCL, LCL)
- [x] Cập nhật realtime
