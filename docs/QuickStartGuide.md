# Hướng Dẫn Bắt Đầu Nhanh - Hệ Thống SPC/CPK Calculator

## Giới Thiệu

Hệ thống SPC/CPK Calculator là giải pháp toàn diện cho việc quản lý chất lượng sản xuất, bao gồm:

- **SPC (Statistical Process Control)**: Kiểm soát quy trình thống kê
- **CPK (Process Capability Index)**: Chỉ số năng lực quy trình
- **OEE (Overall Equipment Effectiveness)**: Hiệu suất thiết bị tổng thể
- **MMS (Maintenance Management System)**: Hệ thống quản lý bảo trì

---

## 1. Đăng Nhập Hệ Thống

### Bước 1: Truy cập hệ thống
Mở trình duyệt và truy cập địa chỉ hệ thống được cung cấp.

### Bước 2: Đăng nhập
- Nhấn nút **"Đăng nhập"** trên trang chủ
- Sử dụng tài khoản Manus để đăng nhập
- Sau khi đăng nhập thành công, bạn sẽ được chuyển đến Dashboard

---

## 2. Các Chức Năng Chính

### 2.1 Dashboard Tổng Quan

Sau khi đăng nhập, bạn sẽ thấy Dashboard với các thông tin:

| Thành phần | Mô tả |
|------------|-------|
| OEE Overview | Hiệu suất thiết bị tổng thể |
| CPK Summary | Tổng hợp chỉ số CPK |
| Active Alarms | Cảnh báo đang hoạt động |
| Recent Activities | Hoạt động gần đây |

### 2.2 Menu Điều Hướng

Menu bên trái bao gồm các module:

1. **SPC/CPK**
   - Phân tích SPC
   - Tính toán CPK
   - Biểu đồ xu hướng
   - So sánh theo ca

2. **OEE**
   - Dashboard OEE
   - Phân tích OEE
   - So sánh OEE

3. **Bảo trì (MMS)**
   - Work Orders
   - Lịch bảo trì
   - Phụ tùng

4. **Báo cáo**
   - Xuất báo cáo
   - Lịch báo cáo tự động

---

## 3. Tính Toán CPK

### Bước 1: Chọn sản phẩm
Vào menu **SPC/CPK > Tính toán CPK**, chọn sản phẩm cần phân tích.

### Bước 2: Nhập dữ liệu
- **Cách 1**: Nhập thủ công từng giá trị
- **Cách 2**: Import từ file Excel/CSV
- **Cách 3**: Kết nối dữ liệu realtime từ máy

### Bước 3: Thiết lập thông số
- **USL (Upper Specification Limit)**: Giới hạn trên
- **LSL (Lower Specification Limit)**: Giới hạn dưới
- **Target**: Giá trị mục tiêu

### Bước 4: Xem kết quả
Hệ thống sẽ tự động tính toán và hiển thị:
- CPK, Cp, Pp, Ppk
- Biểu đồ phân phối
- Biểu đồ kiểm soát

---

## 4. Theo Dõi OEE

### Xem OEE Dashboard
1. Vào menu **OEE > Dashboard**
2. Chọn dây chuyền/máy cần xem
3. Chọn khoảng thời gian

### Các chỉ số OEE

| Chỉ số | Công thức | Ý nghĩa |
|--------|-----------|---------|
| **Availability** | (Thời gian chạy / Thời gian kế hoạch) × 100% | Tỷ lệ sẵn sàng |
| **Performance** | (Sản lượng thực / Sản lượng lý thuyết) × 100% | Hiệu suất vận hành |
| **Quality** | (Sản phẩm đạt / Tổng sản phẩm) × 100% | Tỷ lệ chất lượng |
| **OEE** | Availability × Performance × Quality | Hiệu suất tổng thể |

---

## 5. Quản Lý Cảnh Báo

### Cấu hình ngưỡng cảnh báo
1. Vào **Cài đặt > Cấu hình cảnh báo**
2. Thiết lập ngưỡng cho từng chỉ số:
   - CPK Warning: < 1.33
   - CPK Critical: < 1.00
   - OEE Warning: < 85%
   - OEE Critical: < 65%

### Nhận thông báo
- **In-app**: Thông báo trên hệ thống
- **Email**: Gửi email khi có cảnh báo
- **Push Notification**: Thông báo đẩy (nếu đã cấu hình)

---

## 6. Xuất Báo Cáo

### Tạo báo cáo nhanh
1. Vào **Báo cáo > Xuất báo cáo**
2. Chọn loại báo cáo (OEE, SPC, Bảo trì, Tổng hợp)
3. Chọn định dạng (Excel, PDF, HTML)
4. Chọn khoảng thời gian
5. Nhấn **"Tạo và Tải Báo cáo"**

### Lên lịch báo cáo tự động
1. Vào **Báo cáo > Lịch báo cáo**
2. Nhấn **"Thêm Lịch Mới"**
3. Cấu hình:
   - Tên báo cáo
   - Loại báo cáo
   - Tần suất (Hàng ngày/tuần/tháng)
   - Email người nhận

---

## 7. Phím Tắt Hữu Ích

| Phím tắt | Chức năng |
|----------|-----------|
| `Ctrl + D` | Mở Dashboard |
| `Ctrl + S` | Lưu dữ liệu |
| `Ctrl + E` | Xuất báo cáo |
| `F5` | Làm mới dữ liệu |

---

## 8. Hỗ Trợ

### Liên hệ hỗ trợ
- **Email**: support@company.com
- **Hotline**: 1900-xxxx

### Tài liệu tham khảo
- [Hướng dẫn chi tiết từng tính năng](./FeatureDocumentation.md)
- [FAQ - Câu hỏi thường gặp](./FAQ.md)
- [Hướng dẫn xử lý lỗi](./ErrorHandlingGuide.md)

---

*Cập nhật lần cuối: Tháng 12/2024*
*Phiên bản: 2.0*
