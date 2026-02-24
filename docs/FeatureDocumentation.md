# Tài Liệu Chi Tiết Tính Năng - Hệ Thống SPC/CPK Calculator

## Mục Lục

1. [Module SPC/CPK](#1-module-spccpk)
2. [Module OEE](#2-module-oee)
3. [Module Bảo Trì (MMS)](#3-module-bảo-trì-mms)
4. [Module Cảnh Báo](#4-module-cảnh-báo)
5. [Module Báo Cáo](#5-module-báo-cáo)
6. [Module IoT & Realtime](#6-module-iot--realtime)

---

## 1. Module SPC/CPK

### 1.1 Tính Toán CPK

#### Mô tả
Tính toán chỉ số năng lực quy trình CPK từ dữ liệu đo lường.

#### Công thức tính toán

| Chỉ số | Công thức | Ý nghĩa |
|--------|-----------|---------|
| **Cp** | (USL - LSL) / (6σ) | Năng lực tiềm năng |
| **Cpk** | min[(USL - μ) / 3σ, (μ - LSL) / 3σ] | Năng lực thực tế |
| **Pp** | (USL - LSL) / (6s) | Hiệu suất tiềm năng |
| **Ppk** | min[(USL - μ) / 3s, (μ - LSL) / 3s] | Hiệu suất thực tế |

Trong đó:
- **USL**: Giới hạn kỹ thuật trên
- **LSL**: Giới hạn kỹ thuật dưới
- **μ**: Giá trị trung bình
- **σ**: Độ lệch chuẩn (ước lượng từ R-bar hoặc S-bar)
- **s**: Độ lệch chuẩn mẫu

#### Đánh giá CPK

| Giá trị CPK | Đánh giá | Hành động |
|-------------|----------|-----------|
| ≥ 1.67 | Xuất sắc | Duy trì |
| 1.33 - 1.67 | Tốt | Theo dõi |
| 1.00 - 1.33 | Chấp nhận được | Cải tiến |
| < 1.00 | Không đạt | Hành động ngay |

#### Cách sử dụng
1. Truy cập **SPC/CPK > Tính toán CPK**
2. Chọn sản phẩm và thông số đo
3. Nhập hoặc import dữ liệu
4. Thiết lập USL, LSL, Target
5. Xem kết quả và biểu đồ

### 1.2 Biểu Đồ Kiểm Soát (Control Charts)

#### Các loại biểu đồ hỗ trợ

| Loại | Ký hiệu | Ứng dụng |
|------|---------|----------|
| X-bar & R | X̄-R | Dữ liệu liên tục, mẫu nhỏ (n < 10) |
| X-bar & S | X̄-S | Dữ liệu liên tục, mẫu lớn (n ≥ 10) |
| Individual & MR | I-MR | Dữ liệu đơn lẻ |
| p-chart | p | Tỷ lệ lỗi |
| np-chart | np | Số lượng lỗi |
| c-chart | c | Số khuyết tật |
| u-chart | u | Tỷ lệ khuyết tật |

#### Giới hạn kiểm soát

```
UCL = μ + 3σ (Giới hạn kiểm soát trên)
CL = μ (Đường trung tâm)
LCL = μ - 3σ (Giới hạn kiểm soát dưới)
```

### 1.3 Dự Báo Xu Hướng CPK

#### Thuật toán hỗ trợ

| Thuật toán | Mô tả | Phù hợp khi |
|------------|-------|-------------|
| Linear Regression | Hồi quy tuyến tính | Xu hướng tuyến tính rõ ràng |
| Moving Average | Trung bình trượt | Dữ liệu có nhiễu |
| Exponential Smoothing | Làm mịn mũ | Dữ liệu có tính mùa vụ |
| Weighted MA | Trung bình có trọng số | Ưu tiên dữ liệu gần |

#### Cảnh báo sớm
Hệ thống tự động cảnh báo khi dự báo CPK giảm dưới ngưỡng trong N ngày tới.

### 1.4 So Sánh CPK Theo Ca

#### Chức năng
- So sánh CPK giữa các ca làm việc (Ca 1, Ca 2, Ca 3)
- Phân tích sự khác biệt
- Đề xuất cải tiến

#### Biểu đồ
- Bar chart so sánh
- Box plot phân phối
- Trend line theo thời gian

---

## 2. Module OEE

### 2.1 Tính Toán OEE

#### Công thức

```
OEE = Availability × Performance × Quality
```

| Thành phần | Công thức | Mục tiêu |
|------------|-----------|----------|
| **Availability** | (Run Time / Planned Production Time) × 100% | ≥ 90% |
| **Performance** | (Ideal Cycle Time × Total Count / Run Time) × 100% | ≥ 95% |
| **Quality** | (Good Count / Total Count) × 100% | ≥ 99% |
| **OEE** | A × P × Q | ≥ 85% |

#### Phân loại OEE

| OEE | Đánh giá | Hành động |
|-----|----------|-----------|
| ≥ 85% | World Class | Duy trì |
| 75-85% | Tốt | Cải tiến liên tục |
| 65-75% | Trung bình | Cần cải tiến |
| < 65% | Thấp | Hành động ngay |

### 2.2 Six Big Losses

| Loss | Ảnh hưởng | Giải pháp |
|------|-----------|-----------|
| Equipment Failure | Availability | TPM, Bảo trì phòng ngừa |
| Setup & Adjustment | Availability | SMED |
| Idling & Minor Stops | Performance | Kaizen |
| Reduced Speed | Performance | Chuẩn hóa |
| Process Defects | Quality | Poka-yoke |
| Reduced Yield | Quality | Kiểm soát quy trình |

### 2.3 OEE Dashboard

#### Các widget
- OEE Gauge (hiển thị OEE hiện tại)
- A/P/Q Breakdown (phân tích thành phần)
- OEE Trend (xu hướng theo thời gian)
- Loss Analysis (phân tích tổn thất)
- Machine Comparison (so sánh giữa các máy)

### 2.4 Báo Cáo OEE

#### Loại báo cáo
- Báo cáo theo ca
- Báo cáo hàng ngày
- Báo cáo hàng tuần
- Báo cáo hàng tháng

---

## 3. Module Bảo Trì (MMS)

### 3.1 Work Order Management

#### Loại Work Order

| Loại | Mã | Mô tả |
|------|-----|-------|
| Corrective | CM | Bảo trì sửa chữa |
| Preventive | PM | Bảo trì phòng ngừa |
| Predictive | PdM | Bảo trì dự đoán |
| Emergency | EM | Bảo trì khẩn cấp |

#### Trạng thái Work Order
1. **Draft**: Nháp
2. **Pending**: Chờ phê duyệt
3. **Approved**: Đã phê duyệt
4. **In Progress**: Đang thực hiện
5. **Completed**: Hoàn thành
6. **Closed**: Đã đóng

### 3.2 Quản Lý Phụ Tùng

#### Chức năng
- Danh sách phụ tùng
- Theo dõi tồn kho
- Cảnh báo tồn kho thấp
- Lịch sử sử dụng

#### Cảnh báo tồn kho

| Mức | Điều kiện | Hành động |
|-----|-----------|-----------|
| Normal | Qty > Reorder Point | Không cần |
| Warning | Min Stock < Qty ≤ Reorder Point | Đặt hàng |
| Critical | Qty ≤ Min Stock | Đặt hàng khẩn |

### 3.3 Biểu Đồ Gantt Bảo Trì

#### Chức năng
- Hiển thị lịch trình bảo trì
- Phân công kỹ thuật viên
- Theo dõi tiến độ
- Drag & drop để điều chỉnh

### 3.4 Chỉ Số Bảo Trì

| Chỉ số | Công thức | Mục tiêu |
|--------|-----------|----------|
| **MTBF** | Tổng thời gian chạy / Số lần hỏng | Càng cao càng tốt |
| **MTTR** | Tổng thời gian sửa / Số lần sửa | Càng thấp càng tốt |
| **PM Compliance** | PM hoàn thành / PM kế hoạch × 100% | ≥ 90% |

---

## 4. Module Cảnh Báo

### 4.1 Loại Cảnh Báo

| Loại | Mức độ | Màu | Hành động |
|------|--------|-----|-----------|
| Info | Thông tin | Xanh dương | Ghi nhận |
| Warning | Cảnh báo | Vàng | Theo dõi |
| Critical | Nghiêm trọng | Đỏ | Xử lý ngay |

### 4.2 Kênh Thông Báo

| Kênh | Mô tả | Cấu hình |
|------|-------|----------|
| In-app | Thông báo trong hệ thống | Mặc định |
| Email | Gửi email | Cần cấu hình SMTP |
| SMS | Tin nhắn SMS | Cần tích hợp SMS Gateway |
| Push | Thông báo đẩy | Cần đăng ký Service Worker |

### 4.3 Escalation

#### Quy trình
1. Level 1: Operator (0-15 phút)
2. Level 2: Supervisor (15-30 phút)
3. Level 3: Manager (30-60 phút)
4. Level 4: Director (> 60 phút)

### 4.4 Cấu Hình Ngưỡng

#### Ngưỡng mặc định

| Chỉ số | Warning | Critical |
|--------|---------|----------|
| CPK | < 1.33 | < 1.00 |
| OEE | < 85% | < 65% |
| Temperature | > 50°C | > 60°C |
| Vibration | > 1.0 mm/s | > 1.5 mm/s |

---

## 5. Module Báo Cáo

### 5.1 Loại Báo Cáo

| Loại | Nội dung | Định dạng |
|------|----------|-----------|
| OEE Report | Phân tích OEE | Excel, PDF |
| SPC Report | Phân tích SPC/CPK | Excel, PDF |
| Maintenance Report | Báo cáo bảo trì | Excel, PDF |
| Combined Report | Tổng hợp | Excel, PDF |

### 5.2 Scheduled Reports

#### Tần suất
- Hàng ngày (Daily)
- Hàng tuần (Weekly)
- Hàng tháng (Monthly)

#### Cấu hình
- Tên báo cáo
- Loại báo cáo
- Định dạng xuất
- Danh sách người nhận
- Thời gian gửi

### 5.3 Export Options

| Định dạng | Ưu điểm | Phù hợp |
|-----------|---------|---------|
| Excel | Có thể chỉnh sửa | Phân tích thêm |
| PDF | Định dạng cố định | Lưu trữ, in ấn |
| HTML | Xem trên web | Chia sẻ nhanh |

---

## 6. Module IoT & Realtime

### 6.1 Machine Detail Live

#### Dữ liệu realtime
- OEE hiện tại
- Availability, Performance, Quality
- Nhiệt độ, Rung động, Áp suất
- Sản lượng, Số lỗi

#### Cập nhật
- Tần suất: 2-5 giây
- Lưu trữ: 30 điểm gần nhất

### 6.2 Machine Overview

#### Chức năng
- Tổng quan tất cả máy
- Lọc theo trạng thái
- Sắp xếp theo OEE
- Click để xem chi tiết

#### Trạng thái máy
- **Running**: Đang chạy (xanh)
- **Idle**: Chờ (vàng)
- **Stopped**: Dừng (đỏ)
- **Maintenance**: Bảo trì (xanh dương)

### 6.3 Export Realtime Data

#### Định dạng
- CSV
- Excel
- JSON

#### Dữ liệu
- Timestamp
- Machine ID/Name
- OEE, A, P, Q
- Sensor data
- Production stats

---

*Cập nhật lần cuối: Tháng 12/2024*
*Phiên bản: 2.0*
