# Yêu cầu Hệ thống IoT cho Đội ngũ Phát triển Phần mềm và Quản trị IT

## 1. Lưu trình Xử lý Dữ liệu (Data Pipeline Flow)

Hệ thống IoT cho nhà máy điện tử không chỉ là hiển thị số liệu, mà là một quy trình xử lý dữ liệu từ tầng vật lý lên tầng ứng dụng.

### 1.1. Thu thập (Acquisition)
Gateway đọc dữ liệu từ PLC/Sensors qua Modbus TCP, OPC-UA hoặc IO-Link.

### 1.2. Xử lý tại biên (Edge Processing)
Gateway lọc nhiễu, chuẩn hóa định dạng dữ liệu (JSON) và gửi lên Server qua MQTT (có SSL/TLS).

### 1.3. Hàng chờ dữ liệu (Message Broker)
MQTT Broker (như EMQX hoặc Mosquitto) tiếp nhận và phân phối dữ liệu.

### 1.4. Xử lý & Lưu trữ (Processing & Storage)
- **Hot Data:** Lưu vào Redis/InfluxDB để hiển thị Real-time.
- **Cold Data:** Lưu vào PostgreSQL/MongoDB để truy xuất lịch sử và phân tích AI.

### 1.5. Phân phối (Distribution)
Cung cấp API (REST/WebSocket) cho Dashboard và các hệ thống khác (MES/ERP).

---

## 2. Các Phân hệ Chức năng (Modules)

### 2.1. Phân hệ Quản trị Hệ thống (System Admin)
- **Quản lý thiết bị (Device Management):** Đăng ký mới Gateway, Sensor, Máy SMT. Cấu hình ngưỡng cảnh báo (Thresholds) cho từng thiết bị.
- **Quản lý người dùng (RBAC):** Phân quyền chi tiết theo vai trò (Admin, Manager, Technician, Operator).
- **Log System:** Ghi lại lịch sử tác động hệ thống, lỗi kết nối thiết bị.

### 2.2. Phân hệ Giám sát Trực tuyến (Real-time Monitoring)
- **Layout 2D/3D Map:** Hiển thị vị trí máy móc trên sơ đồ nhà máy. Trạng thái máy được thể hiện bằng màu sắc (Xanh: Chạy, Đỏ: Lỗi, Vàng: Chờ).
- **Môi trường:** Theo dõi nhiệt độ, độ ẩm, áp suất phòng sạch, nồng độ bụi (Particle).

### 2.3. Phân hệ Cảnh báo & Thông báo (Alerting)
- **Cấu hình đa kênh:** Gửi cảnh báo qua Web Popup, Email, Telegram hoặc Loa thông báo tại xưởng.
- **Xác nhận cảnh báo (Acknowledge):** Hệ thống ghi lại ai là người đã xử lý lỗi và xử lý trong bao lâu.

---

## 3. Thiết kế Dashboard & Giao diện (UI/UX)

Yêu cầu giao diện phải tuân thủ nguyên tắc: **Ít thao tác nhất - Thông tin quan trọng nhất hiển thị rõ nhất.**

### 3.1. Dashboard cho Quản lý Sản xuất (Production Manager)
- **Chỉ số OEE Tổng thể:** Hiển thị dưới dạng biểu đồ Gauge hoặc Donut.
- **Sản lượng (Target vs. Actual):** Biểu đồ cột so sánh sản lượng thực tế với kế hoạch theo ca.
- **Top 5 nguyên nhân dừng máy:** Biểu đồ Pareto giúp xác định vấn đề trọng tâm.

### 3.2. Dashboard cho Phòng Kỹ thuật/IT (Technical Dashboard)
- **Trạng thái kết nối (Connectivity):** Biểu đồ thể hiện số lượng thiết bị Online/Offline.
- **Độ trễ hệ thống (Latency):** Theo dõi thời gian phản hồi từ Sensor đến Server.
- **Tình trạng tài nguyên:** CPU, RAM, Storage của Server IoT.

### 3.3. Giao diện Mobile (Cho kỹ thuật viên hiện trường)
- Nhận thông báo sự cố tức thì.
- Quét mã QR trên máy để xem lịch sử bảo trì và thông số vận hành hiện tại.

---

## 4. Yêu cầu Kỹ thuật cho Đội ngũ IT

| Thành phần | Yêu cầu chi tiết |
|------------|------------------|
| **Giao diện (Frontend)** | ReactJS hoặc Angular. Hỗ trợ Responsive (tương thích mọi kích thước màn hình). |
| **Backend** | Node.js (NestJS) hoặc Golang (ưu tiên vì xử lý tác vụ đồng thời tốt). |
| **Cơ sở dữ liệu** | **Time-series Database** (InfluxDB/TimescaleDB) cho dữ liệu sensor; **Relational DB** (PostgreSQL) cho quản lý nghiệp vụ. |
| **Bảo mật** | Chứng thực JWT; Mã hóa dữ liệu đường truyền; Cấu hình Firewall/VLAN tách biệt mạng sản xuất và mạng văn phòng. |
| **Khả năng mở rộng** | Triển khai dạng Docker Container/Kubernetes để dễ dàng nâng cấp mà không dừng hệ thống. |
