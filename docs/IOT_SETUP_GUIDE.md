# Hướng dẫn Cài đặt và Cấu hình Module IoT

**Phiên bản:** 1.0  
**Ngày cập nhật:** 05/01/2026

---

## Mục lục

1. [Yêu cầu Hệ thống](#1-yêu-cầu-hệ-thống)
2. [Cài đặt Dependencies](#2-cài-đặt-dependencies)
3. [Cấu hình Database](#3-cấu-hình-database)
4. [Cấu hình Protocol Connections](#4-cấu-hình-protocol-connections)
5. [Khởi tạo Dữ liệu Mẫu](#5-khởi-tạo-dữ-liệu-mẫu)
6. [Kiểm tra Hoạt động](#6-kiểm-tra-hoạt-động)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Yêu cầu Hệ thống

### 1.1 Phần mềm

| Thành phần | Phiên bản tối thiểu | Ghi chú |
|------------|---------------------|---------|
| Node.js | 18.x | Khuyến nghị 20.x LTS |
| pnpm | 8.x | Package manager |
| MySQL/TiDB | 8.0+ | Database |
| MQTT Broker | Mosquitto 2.x | Cho MQTT protocol |

### 1.2 Phần cứng (Production)

| Thành phần | Yêu cầu tối thiểu | Khuyến nghị |
|------------|-------------------|-------------|
| CPU | 4 cores | 8 cores |
| RAM | 8 GB | 16 GB |
| Storage | 100 GB SSD | 500 GB SSD |
| Network | 100 Mbps | 1 Gbps |

---

## 2. Cài đặt Dependencies

### 2.1 Cài đặt Node.js packages

```bash
cd /path/to/cpk-spc-calculator
pnpm install
```

### 2.2 Cài đặt MQTT Broker (nếu sử dụng MQTT)

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install mosquitto mosquitto-clients

# Khởi động service
sudo systemctl start mosquitto
sudo systemctl enable mosquitto
```

---

## 3. Cấu hình Database

### 3.1 Các bảng IoT trong Schema

Module IoT sử dụng các bảng sau trong database:

- iot_devices - Thông tin thiết bị
- iot_device_data - Dữ liệu đo lường
- iot_device_status_history - Lịch sử trạng thái
- iot_alarms - Cảnh báo
- iot_alert_thresholds - Ngưỡng cảnh báo
- iot_connections - Kết nối protocol
- iot_connection_logs - Log kết nối
- iot_protocol_configs - Cấu hình protocol

### 3.2 Push Schema vào Database

```bash
pnpm db:push
```

---

## 4. Cấu hình Protocol Connections

### 4.1 MQTT Configuration

#### Topic Naming Convention

```
factory/{line_id}/sensors/{sensor_type}/{device_id}
factory/{line_id}/alarms/{device_id}
factory/{line_id}/status/{device_id}

Ví dụ:
factory/line1/sensors/temperature/sensor001
factory/line1/alarms/plc001
```

#### Message Format

```json
{
  "deviceId": "sensor001",
  "metric": "temperature",
  "value": 25.5,
  "unit": "C",
  "timestamp": "2026-01-05T10:30:00Z",
  "quality": "good"
}
```

### 4.2 OPC-UA Configuration

#### Node ID Mapping

```typescript
const nodeMapping = {
  'ns=2;s=Temperature': { metric: 'temperature', unit: '°C' },
  'ns=2;s=Pressure': { metric: 'pressure', unit: 'bar' },
  'ns=2;s=Vibration': { metric: 'vibration', unit: 'mm/s' },
  'ns=2;s=Speed': { metric: 'speed', unit: 'rpm' }
};
```

### 4.3 Modbus TCP Configuration

#### Register Mapping

```typescript
const registerMapping = [
  { address: 40001, type: 'float32', metric: 'temperature', unit: '°C' },
  { address: 40003, type: 'float32', metric: 'pressure', unit: 'bar' },
  { address: 40005, type: 'uint16', metric: 'status', unit: '' },
  { address: 40006, type: 'float32', metric: 'power', unit: 'kW' }
];
```

### 4.4 HTTP REST Configuration

#### API Response Format

```json
{
  "devices": [
    {
      "id": "sensor001",
      "readings": [
        { "metric": "temperature", "value": 25.5, "unit": "C" },
        { "metric": "humidity", "value": 65.2, "unit": "%" }
      ],
      "timestamp": "2026-01-05T10:30:00Z"
    }
  ]
}
```

---

## 5. Khởi tạo Dữ liệu Mẫu

### 5.1 Seed Devices

```typescript
// Gọi từ frontend hoặc API client
await trpc.iotCrud.seedDevices.mutate();
```

### 5.2 Seed Thresholds

```typescript
await trpc.iotCrud.seedThresholds.mutate();
```

### 5.3 Seed Sample Alarms

```typescript
await trpc.iotCrud.seedAlarms.mutate();
```

### 5.4 Dữ liệu mẫu được tạo

| Loại | Số lượng | Mô tả |
|------|----------|-------|
| Devices | 10 | Các loại sensor, PLC, gateway |
| Thresholds | 20 | Ngưỡng cho temperature, pressure, vibration |
| Alarms | 15 | Cảnh báo mẫu các mức độ |

---

## 6. Kiểm tra Hoạt động

### 6.1 Kiểm tra Server

```bash
# Khởi động server
pnpm dev

# Kiểm tra server đang chạy
curl http://localhost:3000/api/health
```

### 6.2 Kiểm tra API IoT

```bash
# Lấy danh sách devices
curl http://localhost:3000/api/trpc/iotCrud.getDevices

# Lấy danh sách alarms
curl http://localhost:3000/api/trpc/iotCrud.getAlarms
```

### 6.3 Kiểm tra MQTT Connection

```bash
# Subscribe để xem messages
mosquitto_sub -h localhost -t 'factory/#' -v

# Publish test message
mosquitto_pub -h localhost -t 'factory/line1/sensors/temperature/sensor001' \
  -m '{"value": 25.5, "unit": "C"}'
```

---

## 7. Troubleshooting

### 7.1 Lỗi thường gặp

#### Database Connection Error

**Giải pháp:**
1. Kiểm tra DATABASE_URL trong cấu hình
2. Kiểm tra MySQL/TiDB đang chạy
3. Kiểm tra firewall cho port 3306/4000

#### MQTT Connection Failed

**Giải pháp:**
1. Kiểm tra Mosquitto đang chạy
2. Kiểm tra port 1883 đang mở
3. Kiểm tra authentication settings

#### No Data Showing in Dashboard

**Giải pháp:**
1. Kiểm tra có devices trong database
2. Kiểm tra có data trong iot_device_data
3. Kiểm tra browser console cho errors

---

## Tài liệu Liên quan

- [IOT_DOCUMENTATION.md](./IOT_DOCUMENTATION.md) - Tài liệu tổng quan
- [IOT_DATAFLOW_DIAGRAM.md](./IOT_DATAFLOW_DIAGRAM.md) - Sơ đồ dataflow
