# Báo cáo Rà soát và Cải tiến Hệ thống SPC/CPK
## Đánh giá từ góc độ Chuyên gia SPC cho Nhà máy Sản xuất Linh kiện Điện tử

---

## 1. Tổng quan Hệ thống Hiện tại

### 1.1 Điểm mạnh
- **Kiến trúc tốt**: Sử dụng tRPC + React + Drizzle ORM, đảm bảo type-safety end-to-end
- **Database schema đầy đủ**: Có các bảng cho dây chuyền, công trạm, máy móc, sản phẩm, tiêu chuẩn
- **8 SPC Rules đã triển khai**: Western Electric Rules được implement đầy đủ
- **Hỗ trợ nhiều phương thức lấy mẫu**: Từ giây đến năm với tần suất tùy chỉnh
- **Dashboard realtime**: Cho phép theo dõi nhiều dây chuyền cùng lúc

### 1.2 Các vấn đề cần cải tiến

#### A. Thuật toán tính toán SPC/CPK

**Vấn đề 1: Hằng số Control Chart cố định**
```typescript
// Hiện tại - chỉ dùng hằng số cho subgroup size = 5
const A2 = 0.577;
const D3 = 0;
const D4 = 2.114;
const d2 = 2.326;
```

**Cải tiến**: Đã thêm bảng hằng số đầy đủ cho subgroup size 2-10 trong `spcRealtimeService.ts`

**Vấn đề 2: Thiếu Pp, Ppk, Ca**
- Cp, Cpk chỉ đo năng lực quy trình ngắn hạn (within-subgroup variation)
- Cần thêm Pp, Ppk để đo năng lực dài hạn (overall variation)
- Ca (Capability Accuracy) để đo độ lệch tâm

**Cải tiến**: Đã thêm tính toán Pp, Ppk, Ca trong `spcRealtimeService.ts`

#### B. Cấu trúc Database

**Vấn đề 3: Thiếu bảng lưu dữ liệu realtime**
- Không có nơi lưu từng điểm dữ liệu SPC theo thời gian thực
- Khó khăn khi cần phân tích xu hướng dài hạn

**Cải tiến**: Đã thêm bảng `spc_realtime_data` và `spc_summary_stats`

**Vấn đề 4: Thiếu liên kết mapping với kế hoạch SPC**
- Kế hoạch SPC không có trường mappingId
- Không thể tự động lấy dữ liệu từ external database

**Cải tiến**: Đã thêm trường `mappingId` vào bảng `spc_sampling_plans`

#### C. Logic phát hiện vi phạm

**Vấn đề 5: Không phân biệt severity**
- Tất cả vi phạm được xử lý như nhau
- Rule 1 (beyond 3σ) nghiêm trọng hơn Rule 7 (stratification)

**Cải tiến**: Đã thêm trường `severity` với giá trị "warning" hoặc "critical"

**Vấn đề 6: Thiếu phát hiện trend và shift**
- Rule 3 chỉ phát hiện 6 điểm tăng/giảm liên tục
- Cần thêm thuật toán phát hiện trend dài hạn

---

## 2. Các Cải tiến Đã Triển khai

### 2.1 Service SPC Realtime (`spcRealtimeService.ts`)

```typescript
// Bảng hằng số đầy đủ cho subgroup size 2-10
const A2_FACTORS: Record<number, number> = {
  2: 1.880, 3: 1.023, 4: 0.729, 5: 0.577,
  6: 0.483, 7: 0.419, 8: 0.373, 9: 0.337, 10: 0.308
};

// Tính toán đầy đủ các chỉ số
interface SpcCalculationResult {
  mean: number;
  stdDev: number;
  cp: number | null;
  cpk: number | null;
  pp: number | null;    // Process Performance
  ppk: number | null;   // Process Performance Index
  ca: number | null;    // Capability Accuracy
  violations: SpcViolation[];
  overallStatus: "excellent" | "good" | "acceptable" | "needs_improvement" | "critical";
}
```

### 2.2 Database Schema Mới

```sql
-- Bảng lưu dữ liệu SPC realtime
CREATE TABLE spc_realtime_data (
  id INT AUTO_INCREMENT PRIMARY KEY,
  planId INT NOT NULL,
  productionLineId INT NOT NULL,
  mappingId INT,
  sampleIndex INT NOT NULL,
  sampleValue INT NOT NULL,  -- * 10000
  subgroupIndex INT NOT NULL,
  subgroupMean INT,          -- * 10000
  subgroupRange INT,         -- * 10000
  ucl INT, lcl INT, usl INT, lsl INT, centerLine INT,
  isOutOfSpec INT DEFAULT 0,
  isOutOfControl INT DEFAULT 0,
  violatedRules VARCHAR(100),
  sampledAt TIMESTAMP NOT NULL,
  createdAt TIMESTAMP DEFAULT NOW()
);

-- Bảng thống kê tổng hợp theo ca/ngày/tuần/tháng
CREATE TABLE spc_summary_stats (
  id INT AUTO_INCREMENT PRIMARY KEY,
  planId INT NOT NULL,
  productionLineId INT NOT NULL,
  periodType ENUM('shift', 'day', 'week', 'month') NOT NULL,
  periodStart TIMESTAMP NOT NULL,
  periodEnd TIMESTAMP NOT NULL,
  sampleCount INT DEFAULT 0,
  mean INT, stdDev INT, min INT, max INT,
  cp INT, cpk INT, pp INT, ppk INT, ca INT,
  xBarUcl INT, xBarLcl INT, rUcl INT, rLcl INT,
  outOfSpecCount INT DEFAULT 0,
  outOfControlCount INT DEFAULT 0,
  rule1Violations INT DEFAULT 0,
  -- ... rule2-8
  overallStatus ENUM('excellent', 'good', 'acceptable', 'needs_improvement', 'critical'),
  createdAt TIMESTAMP DEFAULT NOW()
);
```

### 2.3 Tích hợp Mapping vào Kế hoạch SPC

- Thêm trường `mappingId` vào bảng `spc_sampling_plans`
- Cập nhật form tạo/sửa kế hoạch SPC để chọn mapping
- Cho phép kế hoạch SPC tự động lấy dữ liệu từ external database

---

## 3. Khuyến nghị Cải tiến Tiếp theo

### 3.1 Ngắn hạn (1-2 tuần)

1. **Thêm báo cáo SPC tự động**
   - Báo cáo theo ca (8 giờ)
   - Báo cáo hàng ngày
   - Báo cáo hàng tuần với so sánh trend

2. **Cải thiện hiệu suất**
   - Thêm index cho các cột thường query
   - Implement caching cho dữ liệu dashboard
   - Pagination cho lịch sử phân tích

3. **Tích hợp email thực**
   - Kết nối với SMTP server
   - Template email chuyên nghiệp
   - Attachment báo cáo PDF

### 3.2 Trung hạn (1-2 tháng)

1. **Machine Learning cho dự đoán**
   - Dự đoán CPK trong tương lai
   - Phát hiện anomaly tự động
   - Đề xuất điều chỉnh quy trình

2. **Tích hợp với hệ thống MES/ERP**
   - API để các hệ thống khác truy vấn
   - Webhook khi có vi phạm
   - Đồng bộ master data

3. **Dashboard nâng cao**
   - Pareto chart cho các loại lỗi
   - Heatmap theo thời gian
   - So sánh giữa các dây chuyền

### 3.3 Dài hạn (3-6 tháng)

1. **Hệ thống SPC đa nhà máy**
   - Quản lý nhiều site
   - So sánh hiệu suất giữa các nhà máy
   - Chia sẻ best practices

2. **Tích hợp IoT**
   - Kết nối trực tiếp với thiết bị đo
   - Real-time data streaming
   - Edge computing cho xử lý tại chỗ

---

## 4. Tiêu chuẩn Ngành Linh kiện Điện tử

### 4.1 Yêu cầu CPK theo ngành

| Loại sản phẩm | CPK tối thiểu | CPK khuyến nghị |
|---------------|---------------|-----------------|
| Linh kiện thường | 1.00 | 1.33 |
| Linh kiện quan trọng | 1.33 | 1.67 |
| Linh kiện an toàn | 1.67 | 2.00 |
| Automotive (IATF 16949) | 1.33 | 1.67 |

### 4.2 Tần suất lấy mẫu khuyến nghị

| Loại quy trình | Tần suất | Subgroup size |
|----------------|----------|---------------|
| Quy trình mới | 1 giờ | 5 |
| Quy trình ổn định | 2-4 giờ | 5 |
| Quy trình đã kiểm soát | 1 ca | 5-10 |

### 4.3 Hành động khi CPK thấp

| CPK | Trạng thái | Hành động |
|-----|------------|-----------|
| ≥ 1.67 | Excellent | Duy trì, có thể giảm tần suất kiểm tra |
| 1.33 - 1.67 | Good | Duy trì, theo dõi trend |
| 1.00 - 1.33 | Acceptable | Cải tiến quy trình, tăng tần suất kiểm tra |
| 0.67 - 1.00 | Needs Improvement | Cải tiến ngay, 100% inspection |
| < 0.67 | Critical | Dừng sản xuất, điều tra nguyên nhân |

---

## 5. Kết luận

Hệ thống SPC/CPK hiện tại đã có nền tảng tốt với đầy đủ các tính năng cơ bản. Các cải tiến đã triển khai trong phase này bao gồm:

1. ✅ Tích hợp mapping vào kế hoạch SPC
2. ✅ Thêm bảng lưu dữ liệu realtime và thống kê tổng hợp
3. ✅ Cải tiến thuật toán với Pp, Ppk, Ca
4. ✅ Hằng số control chart động theo subgroup size
5. ✅ Phân loại severity cho vi phạm

Hệ thống đã sẵn sàng cho việc triển khai thực tế tại nhà máy sản xuất linh kiện điện tử.

---

*Báo cáo được tạo bởi hệ thống SPC/CPK Calculator*
*Ngày: ${new Date().toLocaleDateString('vi-VN')}*
