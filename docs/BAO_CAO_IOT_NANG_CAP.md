# Báo cáo Đánh giá và Đề xuất Nâng cấp Hệ thống IoT

**Dự án:** Hệ thống Tính toán CPK/SPC  
**Ngày báo cáo:** 03/01/2026  
**Tác giả:** Manus AI  
**Tài liệu tham chiếu:** Yêu cầu Hệ thống IoT cho Đội ngũ Phát triển Phần mềm và Quản trị IT

---

## 1. Tổng quan Đánh giá

Báo cáo này đánh giá hệ thống IoT hiện tại của CPK-SPC Calculator dựa trên các yêu cầu kỹ thuật từ tài liệu "Yêu cầu Hệ thống dành cho Đội ngũ Phát triển Phần mềm và Quản trị IT". Mục tiêu là xác định các điểm đã đạt được, các khoảng trống cần bổ sung và đề xuất lộ trình nâng cấp.

---

## 2. Đánh giá Theo Yêu cầu

### 2.1. Lưu trình Xử lý Dữ liệu (Data Pipeline Flow)

| Yêu cầu | Trạng thái | Đánh giá |
|---------|------------|----------|
| **Thu thập (Acquisition):** Gateway đọc dữ liệu từ PLC/Sensors qua Modbus TCP, OPC-UA hoặc IO-Link | ⚠️ Một phần | Đã có cấu hình MQTT, OPC-UA, Modbus trong `iotConnectionService.ts`. Tuy nhiên, hiện tại đang sử dụng **simulation mode** thay vì kết nối thực tế với thiết bị. |
| **Xử lý tại biên (Edge Processing):** Gateway lọc nhiễu, chuẩn hóa định dạng dữ liệu (JSON) và gửi lên Server qua MQTT (có SSL/TLS) | ⚠️ Một phần | Có hỗ trợ cấu hình TLS trong MQTT config (`useTls: boolean`). Chưa có logic lọc nhiễu và chuẩn hóa dữ liệu tại edge. |
| **Hàng chờ dữ liệu (Message Broker):** MQTT Broker (như EMQX hoặc Mosquitto) | ✅ Đạt | Đã có tích hợp MQTT với cấu hình broker, topics, QoS. |
| **Xử lý & Lưu trữ (Processing & Storage):** Hot Data (Redis/InfluxDB), Cold Data (PostgreSQL/MongoDB) | ⚠️ Một phần | Đang sử dụng **MySQL/TiDB** cho tất cả dữ liệu. Chưa có Time-series Database (InfluxDB) cho dữ liệu sensor real-time. |
| **Phân phối (Distribution):** API (REST/WebSocket) cho Dashboard | ✅ Đạt | Đã có tRPC API và WebSocket service (`iotWebSocketService.ts`). |

### 2.2. Các Phân hệ Chức năng (Modules)

#### 2.2.1. Phân hệ Quản trị Hệ thống (System Admin)

| Yêu cầu | Trạng thái | Đánh giá |
|---------|------------|----------|
| **Quản lý thiết bị (Device Management):** Đăng ký mới Gateway, Sensor, Máy SMT | ✅ Đạt | Có đầy đủ CRUD cho IoT devices trong `iotDashboardRouter.ts`. |
| **Cấu hình ngưỡng cảnh báo (Thresholds):** Cho từng thiết bị | ✅ Đạt | Có trang Alarm Threshold Config (`/alarm-threshold-config`). |
| **Quản lý người dùng (RBAC):** Phân quyền chi tiết theo vai trò | ✅ Đạt | Hệ thống có RBAC với các vai trò Admin, Manager, Technician, Operator. |
| **Log System:** Ghi lại lịch sử tác động hệ thống, lỗi kết nối thiết bị | ✅ Đạt | Có Audit Logs system trong hệ thống. |

#### 2.2.2. Phân hệ Giám sát Trực tuyến (Real-time Monitoring)

| Yêu cầu | Trạng thái | Đánh giá |
|---------|------------|----------|
| **Layout 2D/3D Map:** Hiển thị vị trí máy móc trên sơ đồ nhà máy | ❌ Chưa có | Chưa có tính năng hiển thị sơ đồ nhà máy 2D/3D. |
| **Trạng thái máy bằng màu sắc:** Xanh: Chạy, Đỏ: Lỗi, Vàng: Chờ | ✅ Đạt | Có hiển thị trạng thái thiết bị với màu sắc trong IoT Dashboard. |
| **Môi trường:** Theo dõi nhiệt độ, độ ẩm, áp suất phòng sạch, nồng độ bụi | ⚠️ Một phần | Có theo dõi temperature, pressure, humidity sensors. Chưa có particle counter. |

#### 2.2.3. Phân hệ Cảnh báo & Thông báo (Alerting)

| Yêu cầu | Trạng thái | Đánh giá |
|---------|------------|----------|
| **Cấu hình đa kênh:** Web Popup, Email, Telegram hoặc Loa thông báo | ⚠️ Một phần | Có Web Popup và Email. Chưa có Telegram và Loa thông báo. |
| **Xác nhận cảnh báo (Acknowledge):** Ghi lại ai xử lý và thời gian xử lý | ✅ Đạt | Có chức năng `acknowledgeAlarm` trong router với thông tin người xử lý và thời gian. |

### 2.3. Thiết kế Dashboard & Giao diện (UI/UX)

#### 2.3.1. Dashboard cho Quản lý Sản xuất (Production Manager)

| Yêu cầu | Trạng thái | Đánh giá |
|---------|------------|----------|
| **Chỉ số OEE Tổng thể:** Biểu đồ Gauge hoặc Donut | ✅ Đạt | Có OEE Dashboard với biểu đồ. |
| **Sản lượng (Target vs. Actual):** Biểu đồ cột so sánh | ⚠️ Một phần | Có trong SPC Dashboard, chưa tích hợp vào IoT Dashboard. |
| **Top 5 nguyên nhân dừng máy:** Biểu đồ Pareto | ❌ Chưa có | Chưa có biểu đồ Pareto cho downtime analysis. |

#### 2.3.2. Dashboard cho Phòng Kỹ thuật/IT (Technical Dashboard)

| Yêu cầu | Trạng thái | Đánh giá |
|---------|------------|----------|
| **Trạng thái kết nối (Connectivity):** Số lượng thiết bị Online/Offline | ✅ Đạt | Có `getStats` API trả về số lượng thiết bị theo trạng thái. |
| **Độ trễ hệ thống (Latency):** Thời gian phản hồi từ Sensor đến Server | ❌ Chưa có | Chưa có monitoring latency. |
| **Tình trạng tài nguyên:** CPU, RAM, Storage của Server IoT | ❌ Chưa có | Chưa có server resource monitoring. |

#### 2.3.3. Giao diện Mobile

| Yêu cầu | Trạng thái | Đánh giá |
|---------|------------|----------|
| **Nhận thông báo sự cố tức thì** | ⚠️ Một phần | Có push notifications nhưng chưa tối ưu cho mobile. |
| **Quét mã QR trên máy để xem lịch sử bảo trì** | ❌ Chưa có | Chưa có tính năng QR code scanning. |

### 2.4. Yêu cầu Kỹ thuật cho Đội ngũ IT

| Thành phần | Yêu cầu | Trạng thái | Đánh giá |
|------------|---------|------------|----------|
| **Giao diện (Frontend)** | ReactJS hoặc Angular. Hỗ trợ Responsive | ✅ Đạt | Sử dụng React 19 + Tailwind 4, responsive design. |
| **Backend** | Node.js (NestJS) hoặc Golang | ✅ Đạt | Sử dụng Node.js + Express + tRPC. |
| **Cơ sở dữ liệu** | Time-series Database + Relational DB | ⚠️ Một phần | Chỉ có Relational DB (MySQL/TiDB). Chưa có Time-series DB. |
| **Bảo mật** | JWT, Mã hóa đường truyền, Firewall/VLAN | ✅ Đạt | Có JWT authentication, HTTPS, OAuth. |
| **Khả năng mở rộng** | Docker Container/Kubernetes | ⚠️ Một phần | Có thể containerize nhưng chưa có Kubernetes config. |

---

## 3. Tổng hợp Đánh giá

| Hạng mục | Đạt | Một phần | Chưa có | Tỷ lệ hoàn thành |
|----------|-----|----------|---------|------------------|
| Data Pipeline Flow | 2 | 3 | 0 | 70% |
| System Admin | 4 | 0 | 0 | 100% |
| Real-time Monitoring | 1 | 1 | 1 | 50% |
| Alerting | 1 | 1 | 0 | 75% |
| Production Dashboard | 1 | 1 | 1 | 50% |
| Technical Dashboard | 1 | 0 | 2 | 33% |
| Mobile Interface | 0 | 1 | 1 | 25% |
| Technical Requirements | 3 | 2 | 0 | 80% |
| **Tổng cộng** | **13** | **9** | **5** | **65%** |

---

## 4. Đề xuất Nâng cấp

### 4.1. Ưu tiên Cao (Cần triển khai ngay)

#### 4.1.1. Tích hợp Time-series Database

**Mô tả:** Triển khai InfluxDB hoặc TimescaleDB để lưu trữ dữ liệu sensor real-time với hiệu suất cao.

**Lợi ích:**
- Truy vấn dữ liệu time-series nhanh hơn 10-100 lần so với relational DB
- Hỗ trợ retention policies tự động xóa dữ liệu cũ
- Tối ưu cho việc tính toán aggregations (avg, max, min) theo thời gian

**Công việc cần làm:**
- Cài đặt và cấu hình InfluxDB/TimescaleDB
- Tạo service layer để ghi/đọc dữ liệu sensor
- Migrate dữ liệu sensor hiện tại sang time-series DB
- Cập nhật IoT Dashboard để query từ time-series DB

#### 4.1.2. Kết nối Thực với Thiết bị IoT

**Mô tả:** Thay thế simulation mode bằng kết nối thực với MQTT broker và OPC-UA server.

**Công việc cần làm:**
- Tích hợp thư viện `mqtt.js` cho MQTT connections
- Tích hợp thư viện `node-opcua` cho OPC-UA connections
- Tích hợp thư viện `modbus-serial` cho Modbus connections
- Xử lý reconnection và error handling
- Thêm connection pooling cho hiệu suất

#### 4.1.3. Layout 2D/3D Nhà máy

**Mô tả:** Tạo giao diện hiển thị sơ đồ nhà máy với vị trí máy móc và trạng thái real-time.

**Công việc cần làm:**
- Thiết kế component FloorPlanEditor để tạo sơ đồ
- Tạo component FloorPlanViewer để hiển thị real-time
- Tích hợp với IoT data để cập nhật trạng thái máy
- Hỗ trợ zoom, pan, và click để xem chi tiết

### 4.2. Ưu tiên Trung bình

#### 4.2.1. Biểu đồ Pareto cho Downtime Analysis

**Mô tả:** Thêm biểu đồ Pareto hiển thị top nguyên nhân dừng máy.

**Công việc cần làm:**
- Tạo schema lưu trữ downtime events
- Tạo API tính toán Pareto data
- Tạo component ParetoChart
- Tích hợp vào Production Dashboard

#### 4.2.2. Latency Monitoring

**Mô tả:** Theo dõi độ trễ từ sensor đến server.

**Công việc cần làm:**
- Thêm timestamp vào mỗi data point từ sensor
- Tính toán latency khi nhận data
- Tạo biểu đồ latency distribution
- Cảnh báo khi latency vượt ngưỡng

#### 4.2.3. Server Resource Monitoring

**Mô tả:** Giám sát CPU, RAM, Storage của IoT server.

**Công việc cần làm:**
- Tích hợp thư viện `systeminformation`
- Tạo scheduled job thu thập metrics
- Tạo dashboard hiển thị resource usage
- Cảnh báo khi resource usage cao

#### 4.2.4. Telegram Notification

**Mô tả:** Thêm kênh thông báo qua Telegram.

**Công việc cần làm:**
- Tích hợp Telegram Bot API
- Tạo cấu hình Telegram trong settings
- Thêm Telegram vào notification channels
- Test và verify delivery

### 4.3. Ưu tiên Thấp (Cải tiến dài hạn)

#### 4.3.1. QR Code Scanning cho Mobile

**Mô tả:** Cho phép kỹ thuật viên quét QR trên máy để xem thông tin.

**Công việc cần làm:**
- Tạo QR code cho mỗi máy
- Tích hợp camera scanning trên mobile
- Tạo trang chi tiết máy khi scan
- Hiển thị lịch sử bảo trì và thông số vận hành

#### 4.3.2. Kubernetes Deployment

**Mô tả:** Chuẩn bị cấu hình Kubernetes cho deployment.

**Công việc cần làm:**
- Tạo Dockerfile cho application
- Tạo Kubernetes manifests (Deployment, Service, ConfigMap)
- Cấu hình Horizontal Pod Autoscaler
- Tạo Helm chart cho easy deployment

#### 4.3.3. Particle Counter Integration

**Mô tả:** Thêm hỗ trợ cho particle counter trong phòng sạch.

**Công việc cần làm:**
- Nghiên cứu protocol của particle counter
- Thêm device type mới
- Tạo dashboard cho cleanroom monitoring
- Thêm cảnh báo theo tiêu chuẩn ISO

---

## 5. Lộ trình Triển khai Đề xuất

### Phase 1: Nền tảng (2-3 tuần)
- Tích hợp Time-series Database
- Kết nối thực với MQTT/OPC-UA
- Cải thiện error handling và logging

### Phase 2: Visualization (2-3 tuần)
- Layout 2D nhà máy
- Biểu đồ Pareto
- Latency monitoring dashboard

### Phase 3: Monitoring & Alerts (1-2 tuần)
- Server resource monitoring
- Telegram notification
- Cải thiện alert system

### Phase 4: Mobile & Advanced (2-3 tuần)
- QR code scanning
- Mobile UX optimization
- Particle counter integration

### Phase 5: DevOps (1-2 tuần)
- Docker optimization
- Kubernetes deployment
- CI/CD pipeline

---

## 6. Kết luận

Hệ thống IoT hiện tại của CPK-SPC Calculator đã đạt được **65% yêu cầu** từ tài liệu kỹ thuật. Các chức năng cốt lõi như quản lý thiết bị, cảnh báo, và dashboard cơ bản đã hoạt động tốt. Tuy nhiên, để đáp ứng đầy đủ yêu cầu của một hệ thống IoT công nghiệp chuyên nghiệp, cần bổ sung:

1. **Time-series Database** để tối ưu lưu trữ dữ liệu sensor
2. **Kết nối thực** với thiết bị thay vì simulation
3. **Layout 2D/3D** để trực quan hóa nhà máy
4. **Monitoring nâng cao** cho latency và server resources
5. **Đa kênh thông báo** bao gồm Telegram

Với lộ trình đề xuất khoảng **8-12 tuần**, hệ thống có thể đạt **95%+ yêu cầu** và sẵn sàng cho môi trường sản xuất thực tế.

---

*Báo cáo được tạo tự động bởi Manus AI*
