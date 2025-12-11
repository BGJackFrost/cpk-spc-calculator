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

## Phase 3 - Authentication, CRUD và hiển thị NG

### Authentication & Quản lý người dùng
- [x] Trang đăng nhập với Manus OAuth (đã có sẵn)
- [x] Trang quản lý người dùng (danh sách, phân quyền)
- [x] Phân quyền admin/user cho các chức năng

### Database mở rộng
- [x] Bảng Product (sản phẩm)
- [x] Bảng ProductSpecification (USL, LSL cho từng mã sản phẩm)
- [x] Bảng ProductionLineProduct (cấu hình dây chuyền - sản phẩm)
- [x] Bảng ProcessConfig (cấu hình quy trình)

### Các trang CRUD
- [x] Trang quản lý sản phẩm (CRUD)
- [x] Trang quản lý dây chuyền sản xuất (CRUD)
- [x] Trang quản lý công trạm (CRUD)
- [x] Trang quản lý máy móc (CRUD)
- [x] Trang quản lý tiêu chuẩn USL/LSL (CRUD)
- [x] Trang quản lý cấu hình quy trình (CRUD)

### Hiển thị điểm NG trên biểu đồ
- [x] Điểm nằm ngoài USL/LSL hiển thị màu đỏ
- [x] Điểm vi phạm 8 SPC Rules hiển thị màu đỏ
- [x] Tooltip hiển thị lý do NG (vi phạm rule nào)
- [x] Legend cho các loại điểm (OK, NG-USL/LSL, NG-SPC Rule)

## Phase 4 - CRUD bổ sung, Kế hoạch lấy mẫu, Dashboard nâng cao, Email thông báo

### Trang CRUD bổ sung
- [x] Trang quản lý dây chuyền sản xuất (Production Line CRUD)
- [x] Trang quản lý phương pháp lấy mẫu (Sampling Method CRUD)
- [x] Trang quản lý Production Line Process (quy trình dây chuyền)

### Kế hoạch lấy mẫu SPC
- [x] Database schema cho SPC Sampling Plan
- [x] Trang tạo/quản lý kế hoạch lấy mẫu SPC
- [x] Gán kế hoạch vào Line sản xuất
- [x] Chạy lấy mẫu tự động theo kế hoạch
- [x] Hiển thị kết quả theo user đã cấu hình

### Dashboard nâng cao
- [x] Cấu hình số lượng dây chuyền hiển thị theo user
- [x] Hiển thị dây chuyền đã cấu hình cho từng user
- [x] Lưu cấu hình dashboard vào database

### Thông báo Email
- [x] Cấu hình email cho từng user
- [x] Gửi email khi vi phạm SPC Rules
- [x] Gửi email khi vi phạm CA Rules
- [x] Gửi email khi vi phạm CPK Rules (CPK < ngưỡng)

## Phase 5 - Tích hợp Mapping vào SPC Plan và Cải tiến Chuyên gia

### Tích hợp Mapping vào Kế hoạch SPC
- [x] Thêm trường mappingId vào bảng SpcSamplingPlan
- [x] Cập nhật trang Kế hoạch SPC để chọn mapping
- [x] Tạo service lấy dữ liệu từ external database theo mapping
- [x] Tự động cập nhật dữ liệu SPC/CPK realtime trên dashboard
- [x] Lưu kết quả tính toán SPC vào database

### Rà soát và Cải tiến Logic Code
- [x] Rà soát thuật toán tính toán SPC/CPK
- [x] Rà soát cấu trúc database và quan hệ dữ liệu
- [x] Rà soát logic phát hiện vi phạm 8 SPC Rules
- [x] Rà soát hiệu suất truy vấn database
- [x] Đánh giá khả năng mở rộng hệ thống

### Cải tiến Chuyên gia SPC
- [x] Thêm tính toán Pp, Ppk (Process Performance)
- [x] Thêm tính toán Ca (Capability Accuracy)
- [x] Cải tiến thuật toán phát hiện trend và shift
- [x] Thêm báo cáo SPC tổng hợp theo ca/ngày/tuần
- [x] Tối ưu hóa hiệu suất cho dữ liệu lớn
