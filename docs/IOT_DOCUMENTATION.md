# Tài liệu Hướng dẫn Module IoT

**Phiên bản:** 1.0  
**Ngày cập nhật:** 05/01/2026

---

## Mục lục

1. [Tổng quan Module IoT](#1-tổng-quan-module-iot)
2. [Kiến trúc Hệ thống](#2-kiến-trúc-hệ-thống)
3. [Các Thành phần Chính](#3-các-thành-phần-chính)
4. [Luồng Dữ liệu (Dataflow)](#4-luồng-dữ-liệu-dataflow)
5. [Tích hợp với Các Module Khác](#5-tích-hợp-với-các-module-khác)
6. [API Reference](#6-api-reference)
7. [Hướng dẫn Sử dụng](#7-hướng-dẫn-sử-dụng)

---

## 1. Tổng quan Module IoT

### 1.1 Mục đích

Module IoT trong hệ thống CPK/SPC Calculator được thiết kế để:

- **Thu thập dữ liệu** từ các thiết bị cảm biến trong nhà máy sản xuất
- **Giám sát realtime** trạng thái thiết bị và các chỉ số đo lường
- **Cảnh báo tự động** khi phát hiện bất thường hoặc vượt ngưỡng
- **Tích hợp SPC** để phân tích chất lượng sản xuất từ dữ liệu IoT

### 1.2 Các tính năng chính

| Tính năng | Mô tả |
|-----------|-------|
| Device Management | Quản lý thiết bị IoT (thêm, sửa, xóa, theo dõi trạng thái) |
| Sensor Data Collection | Thu thập dữ liệu từ cảm biến qua MQTT/OPC-UA/Modbus/HTTP |
| Real-time Dashboard | Hiển thị dữ liệu realtime với biểu đồ live |
| Alert Management | Quản lý cảnh báo với ngưỡng tùy chỉnh |
| Protocol Support | Hỗ trợ MQTT, OPC-UA, Modbus TCP, HTTP REST |
| SPC Integration | Tích hợp dữ liệu IoT vào phân tích SPC/CPK |

---

## 2. Kiến trúc Hệ thống

### 2.1 Các Layer trong Kiến trúc

| Layer | Mô tả | Files chính |
|-------|-------|-------------|
| **Connection Layer** | Xử lý kết nối với thiết bị qua các protocol | iotConnectionService.ts |
| **Service Layer** | Business logic xử lý dữ liệu IoT | iotDbService.ts, iotSensorService.ts |
| **Database Layer** | Lưu trữ dữ liệu thiết bị, cảm biến, cảnh báo | drizzle/schema.ts |
| **API Layer** | Expose endpoints cho frontend | iotCrudRouter.ts, iotDashboardRouter.ts |
| **Frontend Layer** | Giao diện người dùng | IotDashboard.tsx, IotRealtimeDashboard.tsx |

---

## 3. Các Thành phần Chính

### 3.1 Database Schema

#### Bảng iot_devices
Lưu thông tin thiết bị IoT.

| Column | Type | Mô tả |
|--------|------|-------|
| id | INT | Primary key |
| deviceCode | VARCHAR | Mã thiết bị duy nhất |
| deviceName | VARCHAR | Tên thiết bị |
| deviceType | VARCHAR | Loại: sensor, plc, gateway, camera |
| manufacturer | VARCHAR | Nhà sản xuất |
| model | VARCHAR | Model thiết bị |
| status | VARCHAR | online, offline, maintenance, error |
| healthScore | INT | Điểm sức khỏe (0-100) |
| productionLineId | INT | FK đến production_lines |
| machineId | INT | FK đến machines |

#### Bảng iot_device_data
Lưu dữ liệu đo lường từ thiết bị.

| Column | Type | Mô tả |
|--------|------|-------|
| id | INT | Primary key |
| deviceId | INT | FK đến iot_devices |
| metric | VARCHAR | Tên metric (temperature, pressure, etc.) |
| value | DECIMAL | Giá trị đo được |
| unit | VARCHAR | Đơn vị (°C, bar, mm/s) |
| timestamp | DATETIME | Thời điểm đo |

#### Bảng iot_alarms
Lưu các cảnh báo từ hệ thống.

| Column | Type | Mô tả |
|--------|------|-------|
| id | INT | Primary key |
| deviceId | INT | FK đến iot_devices |
| alarmType | VARCHAR | warning, error, critical |
| alarmCode | VARCHAR | Mã cảnh báo |
| message | VARCHAR | Nội dung cảnh báo |
| acknowledged | BOOLEAN | Đã xác nhận chưa |
| resolved | BOOLEAN | Đã xử lý chưa |

#### Bảng iot_alert_thresholds
Cấu hình ngưỡng cảnh báo.

| Column | Type | Mô tả |
|--------|------|-------|
| id | INT | Primary key |
| deviceId | INT | FK đến iot_devices |
| metric | VARCHAR | Metric áp dụng |
| warningLowerLimit | DECIMAL | Ngưỡng warning dưới |
| warningUpperLimit | DECIMAL | Ngưỡng warning trên |
| lowerLimit | DECIMAL | Ngưỡng error dưới |
| upperLimit | DECIMAL | Ngưỡng error trên |

---

## 4. Luồng Dữ liệu (Dataflow)

### 4.1 Luồng Thu thập Dữ liệu

1. **Sensor Device** gửi dữ liệu qua protocol (MQTT/OPC-UA/Modbus)
2. **Connection Service** nhận và parse dữ liệu theo protocol
3. **Service Layer** validate và transform dữ liệu
4. **Database** lưu trữ vào iot_device_data

### 4.2 Luồng Xử lý Cảnh báo

1. Khi có **dữ liệu mới**, hệ thống kiểm tra với **ngưỡng cảnh báo**
2. Nếu vượt ngưỡng, **tạo alarm** mới với severity tương ứng
3. **Lưu alarm** vào database
4. **Escalate** nếu alarm chưa được xử lý sau thời gian quy định
5. **Gửi thông báo** qua email/SMS/Telegram

---

## 5. Tích hợp với Các Module Khác

### 5.1 Tích hợp với SPC Module

1. Dữ liệu IoT được **aggregate theo khoảng thời gian** (phút/giờ/ca)
2. Dữ liệu aggregate được **chuyển sang SPC Module**
3. SPC Module **tính toán CPK, Cp, UCL, LCL**
4. **Kiểm tra 8 SPC Rules** và CA Rules
5. **Tạo báo cáo** và cảnh báo nếu vi phạm

### 5.2 Tích hợp với AI Module

1. **Historical data** từ IoT được trích xuất features
2. AI Module **train predictive models**
3. **Anomaly detection** phát hiện bất thường
4. **Đưa ra khuyến nghị** hành động

### 5.3 Tích hợp với Notification Module

1. Khi có **IoT Alarm**, gọi Notification Service
2. Notification Service **gửi thông báo** qua các kênh đã cấu hình
3. Hỗ trợ **escalation** nếu alarm chưa được xử lý

### 5.4 Tích hợp với Production Line Module

1. **IoT Device** được gắn với **Machine** hoặc **Workstation**
2. Dữ liệu IoT được **liên kết với Production Line**
3. Dashboard hiển thị **dữ liệu theo dây chuyền**

---

## 6. API Reference

### 6.1 Device APIs

- GET /api/trpc/iotCrud.getDevices - Lấy danh sách thiết bị
- POST /api/trpc/iotCrud.createDevice - Tạo thiết bị mới
- PUT /api/trpc/iotCrud.updateDevice - Cập nhật thiết bị
- DELETE /api/trpc/iotCrud.deleteDevice - Xóa thiết bị

### 6.2 Alarm APIs

- GET /api/trpc/iotCrud.getAlarms - Lấy danh sách cảnh báo
- POST /api/trpc/iotCrud.acknowledgeAlarm - Xác nhận cảnh báo
- POST /api/trpc/iotCrud.resolveAlarm - Đánh dấu đã xử lý

### 6.3 Threshold APIs

- GET /api/trpc/iotCrud.getThresholds - Lấy danh sách ngưỡng
- POST /api/trpc/iotCrud.createThreshold - Tạo ngưỡng mới
- PUT /api/trpc/iotCrud.updateThreshold - Cập nhật ngưỡng

---

## 7. Hướng dẫn Sử dụng

### 7.1 Thêm Thiết bị Mới

1. Truy cập **IoT > Quản lý Thiết bị**
2. Nhấn **"Thêm thiết bị"**
3. Điền thông tin thiết bị
4. Nhấn **"Lưu"**

### 7.2 Cấu hình Ngưỡng Cảnh báo

1. Truy cập **IoT > Ngưỡng Cảnh báo**
2. Chọn thiết bị cần cấu hình
3. Nhấn **"Thêm ngưỡng"**
4. Điền thông tin ngưỡng
5. Nhấn **"Lưu"**

### 7.3 Xem Dashboard Realtime

1. Truy cập **IoT > Dashboard Realtime**
2. Chọn thiết bị/dây chuyền cần theo dõi
3. Biểu đồ sẽ tự động cập nhật khi có dữ liệu mới

### 7.4 Xử lý Cảnh báo

1. Truy cập **IoT > Quản lý Cảnh báo**
2. Xem danh sách cảnh báo chưa xử lý
3. Click vào cảnh báo để xem chi tiết
4. Nhấn **"Xác nhận"** để acknowledge
5. Sau khi xử lý xong, nhấn **"Đã xử lý"**
