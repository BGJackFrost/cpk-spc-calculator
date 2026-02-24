# Thiết kế Dashboard Dây chuyền RealTime

## 1. Tổng quan

Dashboard dây chuyền RealTime là trang giám sát thời gian thực cho các máy sản xuất có khả năng kết nối trực tiếp. Trang này cho phép theo dõi SPC/CPK theo thời gian thực khi máy đang chạy.

### 1.1 Mục tiêu

- Hiển thị dữ liệu đo lường từ máy theo thời gian thực
- Tính toán và cập nhật SPC/CPK liên tục
- Phát hiện và cảnh báo vi phạm SPC Rules ngay lập tức
- Hỗ trợ nhiều dây chuyền/máy đồng thời

### 1.2 Đối tượng sử dụng

- Quản đốc sản xuất
- Kỹ sư chất lượng
- Operator vận hành máy

---

## 2. Kiến trúc Kỹ thuật

### 2.1 Luồng dữ liệu

```
[Máy sản xuất] → [Data Collector] → [WebSocket/SSE] → [Dashboard]
       ↓                                    ↓
[Database nguồn]                    [SPC Calculator]
                                           ↓
                                    [Alert System]
```

### 2.2 Các phương thức kết nối máy

| Phương thức | Mô tả | Ưu điểm | Nhược điểm |
|-------------|-------|---------|------------|
| **Direct Database** | Đọc trực tiếp từ database của máy | Đơn giản, không cần middleware | Phụ thuộc schema máy |
| **OPC UA** | Giao thức công nghiệp chuẩn | Chuẩn hóa, bảo mật | Cần OPC Server |
| **REST API** | Máy expose API | Linh hoạt | Cần máy hỗ trợ |
| **File Polling** | Đọc file CSV/Excel định kỳ | Đơn giản | Độ trễ cao |
| **MQTT** | Message queue cho IoT | Realtime, nhẹ | Cần broker |

### 2.3 Kiến trúc Server

```typescript
// Data Collector Service
interface DataCollector {
  id: string;
  machineId: number;
  connectionType: 'database' | 'opcua' | 'api' | 'file' | 'mqtt';
  connectionConfig: ConnectionConfig;
  pollingInterval: number; // milliseconds
  isActive: boolean;
}

// Realtime Data Point
interface RealtimeDataPoint {
  timestamp: Date;
  machineId: number;
  measurementName: string;
  value: number;
  unit: string;
  // Calculated fields
  subgroupIndex: number;
  isOutOfSpec: boolean;
  isOutOfControl: boolean;
  violatedRules: number[];
}
```

---

## 3. Thiết kế Database

### 3.1 Bảng mới cần thêm

```sql
-- Cấu hình kết nối máy realtime
CREATE TABLE realtime_machine_connections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  machineId INT NOT NULL,
  connectionType ENUM('database', 'opcua', 'api', 'file', 'mqtt') NOT NULL,
  connectionConfig TEXT, -- JSON config
  pollingIntervalMs INT DEFAULT 1000,
  dataQuery TEXT, -- SQL query hoặc config để lấy dữ liệu
  lastDataAt TIMESTAMP,
  lastError TEXT,
  isActive TINYINT DEFAULT 1,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (machineId) REFERENCES machines(id)
);

-- Buffer dữ liệu realtime (circular buffer)
CREATE TABLE realtime_data_buffer (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  connectionId INT NOT NULL,
  machineId INT NOT NULL,
  measurementName VARCHAR(100) NOT NULL,
  value DECIMAL(20,6) NOT NULL,
  sampledAt TIMESTAMP NOT NULL,
  processedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  -- SPC calculations
  subgroupIndex INT,
  subgroupMean DECIMAL(20,6),
  subgroupRange DECIMAL(20,6),
  ucl DECIMAL(20,6),
  lcl DECIMAL(20,6),
  isOutOfSpec TINYINT DEFAULT 0,
  isOutOfControl TINYINT DEFAULT 0,
  violatedRules VARCHAR(50),
  INDEX idx_connection_time (connectionId, sampledAt),
  INDEX idx_machine_time (machineId, sampledAt)
);

-- Cảnh báo realtime
CREATE TABLE realtime_alerts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  connectionId INT NOT NULL,
  machineId INT NOT NULL,
  alertType ENUM('out_of_spec', 'out_of_control', 'rule_violation', 'connection_lost') NOT NULL,
  severity ENUM('warning', 'critical') NOT NULL,
  message TEXT,
  ruleNumber INT,
  value DECIMAL(20,6),
  threshold DECIMAL(20,6),
  acknowledgedAt TIMESTAMP,
  acknowledgedBy INT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 4. Thiết kế UI

### 4.1 Layout Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│  Header: Chọn dây chuyền | Trạng thái kết nối | Thời gian      │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Control Chart Realtime (X-bar / R chart)               │   │
│  │  - Dữ liệu cập nhật liên tục                            │   │
│  │  - Highlight điểm vi phạm                               │   │
│  │  - Zoom/Pan                                             │   │
│  └─────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │   CPK Card   │ │   CP Card    │ │   Ca Card    │            │
│  │   1.45 ↑     │ │   1.52       │ │   0.98       │            │
│  │   Excellent  │ │   Good       │ │   Good       │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────┐ ┌─────────────────────────────┐   │
│  │  SPC Rules Status       │ │  Recent Alerts              │   │
│  │  Rule 1: ✓              │ │  13:45 - Rule 2 violated    │   │
│  │  Rule 2: ⚠ (1 point)    │ │  13:42 - Out of control     │   │
│  │  Rule 3: ✓              │ │  13:38 - Rule 5 violated    │   │
│  │  ...                    │ │  ...                        │   │
│  └─────────────────────────┘ └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Components chính

1. **RealtimeControlChart**: Biểu đồ X-bar/R cập nhật realtime
2. **SpcMetricsCards**: Cards hiển thị CPK, CP, Ca với trend
3. **SpcRulesPanel**: Trạng thái 8 SPC Rules
4. **AlertsPanel**: Danh sách cảnh báo gần đây
5. **ConnectionStatus**: Trạng thái kết nối máy
6. **MachineSelector**: Chọn máy/dây chuyền để giám sát

---

## 5. Tính toán SPC Realtime

### 5.1 Sliding Window Algorithm

```typescript
class RealtimeSpcCalculator {
  private windowSize: number = 25; // Số subgroup
  private subgroupSize: number = 5; // Số mẫu/subgroup
  private dataBuffer: number[] = [];
  
  addSample(value: number): SpcResult {
    this.dataBuffer.push(value);
    
    // Giữ buffer trong giới hạn
    const maxBuffer = this.windowSize * this.subgroupSize;
    if (this.dataBuffer.length > maxBuffer) {
      this.dataBuffer = this.dataBuffer.slice(-maxBuffer);
    }
    
    // Tính toán khi đủ dữ liệu
    if (this.dataBuffer.length >= this.subgroupSize) {
      return this.calculate();
    }
    
    return null;
  }
  
  private calculate(): SpcResult {
    const subgroups = this.createSubgroups();
    const xBar = this.calculateXBar(subgroups);
    const range = this.calculateRange(subgroups);
    const { ucl, lcl, centerLine } = this.calculateControlLimits(subgroups);
    const { cp, cpk, pp, ppk, ca } = this.calculateCapability(subgroups);
    const violations = this.checkRules(subgroups, ucl, lcl, centerLine);
    
    return { xBar, range, ucl, lcl, centerLine, cp, cpk, pp, ppk, ca, violations };
  }
}
```

### 5.2 Rule Checking Realtime

```typescript
function checkSpcRulesRealtime(
  currentPoint: number,
  recentPoints: number[],
  ucl: number,
  lcl: number,
  centerLine: number
): RuleViolation[] {
  const violations: RuleViolation[] = [];
  const sigma = (ucl - centerLine) / 3;
  
  // Rule 1: Point outside 3σ
  if (currentPoint > ucl || currentPoint < lcl) {
    violations.push({ rule: 1, severity: 'critical' });
  }
  
  // Rule 2: 9 consecutive points on same side
  if (recentPoints.length >= 9) {
    const last9 = recentPoints.slice(-9);
    const allAbove = last9.every(p => p > centerLine);
    const allBelow = last9.every(p => p < centerLine);
    if (allAbove || allBelow) {
      violations.push({ rule: 2, severity: 'warning' });
    }
  }
  
  // ... Rules 3-8
  
  return violations;
}
```

---

## 6. WebSocket/SSE Protocol

### 6.1 Server → Client Messages

```typescript
// Dữ liệu mới
interface DataUpdateMessage {
  type: 'data_update';
  machineId: number;
  data: {
    timestamp: string;
    value: number;
    subgroupMean: number;
    subgroupRange: number;
    ucl: number;
    lcl: number;
    isOutOfSpec: boolean;
    isOutOfControl: boolean;
    violatedRules: number[];
  };
}

// Cập nhật metrics
interface MetricsUpdateMessage {
  type: 'metrics_update';
  machineId: number;
  metrics: {
    cp: number;
    cpk: number;
    pp: number;
    ppk: number;
    ca: number;
    sampleCount: number;
  };
}

// Cảnh báo
interface AlertMessage {
  type: 'alert';
  machineId: number;
  alert: {
    id: number;
    type: string;
    severity: string;
    message: string;
    timestamp: string;
  };
}

// Trạng thái kết nối
interface ConnectionStatusMessage {
  type: 'connection_status';
  machineId: number;
  status: 'connected' | 'disconnected' | 'error';
  lastDataAt: string;
  error?: string;
}
```

---

## 7. Cấu hình và Quản lý

### 7.1 Trang cấu hình kết nối máy

- Thêm/sửa/xóa kết nối máy
- Test connection
- Cấu hình polling interval
- Cấu hình data query/mapping
- Bật/tắt kết nối

### 7.2 Cấu hình SPC cho realtime

- Kích thước subgroup
- Số subgroup cho tính toán
- Giới hạn USL/LSL
- Rules cần kiểm tra
- Ngưỡng cảnh báo

---

## 8. Roadmap triển khai

### Phase 1: Foundation (1 tuần)
- [ ] Tạo bảng database mới
- [ ] Tạo API cấu hình kết nối máy
- [ ] Tạo trang cấu hình kết nối

### Phase 2: Data Collection (1 tuần)
- [ ] Implement Data Collector Service
- [ ] Hỗ trợ kết nối Database trực tiếp
- [ ] Hỗ trợ kết nối File polling

### Phase 3: Realtime Processing (1 tuần)
- [ ] Implement SPC Calculator realtime
- [ ] Tích hợp SSE cho push data
- [ ] Implement Rule checking

### Phase 4: Dashboard UI (1 tuần)
- [ ] Tạo trang RealtimeLineDashboard
- [ ] Component Control Chart realtime
- [ ] Component Metrics Cards
- [ ] Component Alerts Panel

### Phase 5: Advanced Features (1 tuần)
- [ ] Hỗ trợ OPC UA
- [ ] Hỗ trợ MQTT
- [ ] Email/Webhook alerts
- [ ] Historical playback

---

## 9. Kết luận

Dashboard dây chuyền RealTime sẽ mang lại giá trị lớn cho việc giám sát chất lượng sản xuất theo thời gian thực. Với kiến trúc linh hoạt hỗ trợ nhiều phương thức kết nối, hệ thống có thể tích hợp với đa dạng thiết bị sản xuất.

Ưu tiên triển khai Phase 1-4 trước để có MVP hoạt động, sau đó mở rộng với các tính năng nâng cao ở Phase 5.

---

*Tài liệu thiết kế - SPC/CPK Calculator*
*Ngày: 16/12/2024*
