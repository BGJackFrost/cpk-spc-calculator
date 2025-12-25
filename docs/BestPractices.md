# Best Practices - Hướng Dẫn Sử Dụng Hiệu Quả

## Mục Lục

1. [SPC/CPK Best Practices](#1-spccpk-best-practices)
2. [OEE Best Practices](#2-oee-best-practices)
3. [Bảo Trì Best Practices](#3-bảo-trì-best-practices)
4. [Báo Cáo Best Practices](#4-báo-cáo-best-practices)
5. [Cảnh Báo Best Practices](#5-cảnh-báo-best-practices)
6. [Bảo Mật Best Practices](#6-bảo-mật-best-practices)

---

## 1. SPC/CPK Best Practices

### 1.1 Thu Thập Dữ Liệu

**Nên làm:**
- Thu thập dữ liệu đều đặn theo lịch trình cố định
- Sử dụng thiết bị đo đã được hiệu chuẩn
- Ghi nhận điều kiện môi trường khi đo
- Thu thập ít nhất 100 mẫu cho phân tích CPK đáng tin cậy

**Không nên:**
- Thu thập dữ liệu chỉ khi có vấn đề
- Bỏ qua các giá trị "bất thường" mà không điều tra
- Thay đổi phương pháp đo giữa chừng

### 1.2 Phân Tích CPK

**Quy trình khuyến nghị:**

1. **Kiểm tra tính ổn định** trước khi tính CPK
   - Sử dụng biểu đồ kiểm soát
   - Loại bỏ nguyên nhân đặc biệt

2. **Kiểm tra phân phối chuẩn**
   - Histogram
   - Normal probability plot

3. **Tính toán và diễn giải**
   - CPK ≥ 1.33: Quy trình đạt yêu cầu
   - CPK < 1.33: Cần cải tiến

### 1.3 Cải Tiến CPK

| Tình huống | Hành động |
|------------|-----------|
| CPK thấp, Cp cao | Dịch chuyển trung bình về target |
| CPK thấp, Cp thấp | Giảm biến thiên quy trình |
| CPK dao động | Ổn định quy trình trước |

### 1.4 Tần Suất Phân Tích

| Loại sản phẩm | Tần suất khuyến nghị |
|---------------|---------------------|
| Sản phẩm mới | Hàng giờ |
| Sản phẩm ổn định | Hàng ca |
| Sản phẩm mature | Hàng ngày/tuần |

---

## 2. OEE Best Practices

### 2.1 Thiết Lập OEE

**Định nghĩa rõ ràng:**
- **Planned Production Time**: Thời gian kế hoạch sản xuất
- **Ideal Cycle Time**: Thời gian chu kỳ lý tưởng
- **Good Count**: Sản phẩm đạt chất lượng

**Lưu ý quan trọng:**
- Không tính thời gian nghỉ đã lên kế hoạch vào downtime
- Ideal Cycle Time phải dựa trên thông số kỹ thuật máy
- Phân loại rõ ràng sản phẩm đạt/không đạt

### 2.2 Theo Dõi OEE

**Tần suất theo dõi:**

| Cấp độ | Tần suất | Mục đích |
|--------|----------|----------|
| Realtime | Liên tục | Phát hiện vấn đề ngay |
| Shift | Cuối ca | Đánh giá hiệu suất ca |
| Daily | Cuối ngày | Xu hướng ngắn hạn |
| Weekly | Cuối tuần | Xu hướng trung hạn |
| Monthly | Cuối tháng | Đánh giá tổng thể |

### 2.3 Cải Tiến OEE

**Ưu tiên cải tiến theo Six Big Losses:**

1. **Availability losses** (ưu tiên cao nhất)
   - Equipment failure
   - Setup & adjustment

2. **Performance losses**
   - Idling & minor stops
   - Reduced speed

3. **Quality losses**
   - Process defects
   - Reduced yield

### 2.4 Mục Tiêu OEE

| Mức độ | OEE | Mô tả |
|--------|-----|-------|
| World Class | ≥ 85% | Mục tiêu dài hạn |
| Excellent | 75-85% | Rất tốt |
| Good | 65-75% | Cần cải tiến |
| Poor | < 65% | Cần hành động ngay |

---

## 3. Bảo Trì Best Practices

### 3.1 Phân Loại Work Order

**Ưu tiên xử lý:**

| Ưu tiên | Loại | Thời gian phản hồi |
|---------|------|-------------------|
| P1 | Emergency | Ngay lập tức |
| P2 | Corrective | < 4 giờ |
| P3 | Preventive | Theo lịch |
| P4 | Improvement | Khi có thời gian |

### 3.2 Bảo Trì Phòng Ngừa (PM)

**Lịch trình PM khuyến nghị:**

| Tần suất | Hoạt động |
|----------|-----------|
| Hàng ngày | Kiểm tra visual, vệ sinh |
| Hàng tuần | Kiểm tra dầu mỡ, siết bu lông |
| Hàng tháng | Kiểm tra chi tiết, thay filter |
| Hàng quý | Bảo trì tổng thể |
| Hàng năm | Overhaul |

### 3.3 Quản Lý Phụ Tùng

**Thiết lập mức tồn kho:**

```
Reorder Point = (Lead Time × Daily Usage) + Safety Stock
Min Stock = Safety Stock
Max Stock = Reorder Point + EOQ
```

**Phân loại ABC:**
- **A**: 20% items, 80% giá trị → Kiểm soát chặt
- **B**: 30% items, 15% giá trị → Kiểm soát vừa
- **C**: 50% items, 5% giá trị → Kiểm soát tối thiểu

### 3.4 Chỉ Số Bảo Trì

**Mục tiêu khuyến nghị:**

| Chỉ số | Mục tiêu |
|--------|----------|
| PM Compliance | ≥ 90% |
| MTBF | Tăng 10%/năm |
| MTTR | Giảm 10%/năm |
| Backlog | < 2 tuần |

---

## 4. Báo Cáo Best Practices

### 4.1 Cấu Trúc Báo Cáo

**Báo cáo hiệu quả cần có:**

1. **Executive Summary**: Tóm tắt 1 trang
2. **KPI Dashboard**: Các chỉ số chính
3. **Trend Analysis**: Xu hướng theo thời gian
4. **Root Cause Analysis**: Phân tích nguyên nhân
5. **Action Items**: Hành động cần thực hiện

### 4.2 Tần Suất Báo Cáo

| Đối tượng | Tần suất | Nội dung |
|-----------|----------|----------|
| Operator | Realtime | Dashboard |
| Supervisor | Hàng ca | Shift report |
| Manager | Hàng ngày | Daily summary |
| Director | Hàng tuần | Weekly analysis |
| Executive | Hàng tháng | Monthly review |

### 4.3 Visualization

**Chọn biểu đồ phù hợp:**

| Mục đích | Loại biểu đồ |
|----------|--------------|
| So sánh | Bar chart |
| Xu hướng | Line chart |
| Phân phối | Histogram |
| Tỷ lệ | Pie chart |
| Tương quan | Scatter plot |
| Nhiều chiều | Radar chart |

### 4.4 Lên Lịch Báo Cáo

**Thiết lập scheduled reports:**
- Chọn người nhận phù hợp
- Không gửi quá nhiều báo cáo
- Đảm bảo nội dung có giá trị
- Review định kỳ danh sách người nhận

---

## 5. Cảnh Báo Best Practices

### 5.1 Thiết Lập Ngưỡng

**Nguyên tắc:**
- Ngưỡng Warning: Cho phép hành động phòng ngừa
- Ngưỡng Critical: Yêu cầu hành động ngay

**Ví dụ:**

| Chỉ số | Warning | Critical |
|--------|---------|----------|
| CPK | < 1.33 | < 1.00 |
| OEE | < 85% | < 65% |
| Temperature | > 50°C | > 60°C |

### 5.2 Quản Lý Cảnh Báo

**Tránh "Alert Fatigue":**
- Không đặt ngưỡng quá nhạy
- Gộp các cảnh báo liên quan
- Review và điều chỉnh ngưỡng định kỳ
- Phân loại ưu tiên rõ ràng

### 5.3 Quy Trình Xử Lý

1. **Acknowledge**: Xác nhận đã nhận cảnh báo
2. **Investigate**: Điều tra nguyên nhân
3. **Action**: Thực hiện hành động
4. **Verify**: Xác nhận đã giải quyết
5. **Document**: Ghi nhận vào hệ thống

### 5.4 Escalation

**Thiết lập escalation hợp lý:**
- Level 1 → Level 2: 15-30 phút
- Level 2 → Level 3: 30-60 phút
- Level 3 → Level 4: 1-2 giờ

---

## 6. Bảo Mật Best Practices

### 6.1 Tài Khoản

- Sử dụng mật khẩu mạnh (≥ 8 ký tự, có chữ hoa, số, ký tự đặc biệt)
- Không chia sẻ tài khoản
- Đăng xuất khi rời máy tính
- Báo cáo ngay khi nghi ngờ tài khoản bị xâm nhập

### 6.2 Dữ Liệu

- Không export dữ liệu nhạy cảm ra ngoài
- Không lưu dữ liệu trên thiết bị cá nhân
- Xóa file tạm sau khi sử dụng
- Mã hóa dữ liệu khi truyền qua email

### 6.3 Thiết Bị

- Cập nhật phần mềm thường xuyên
- Sử dụng antivirus
- Không cài đặt phần mềm không rõ nguồn gốc
- Khóa màn hình khi rời đi

---

## Checklist Hàng Ngày

### Operator
- [ ] Kiểm tra dashboard đầu ca
- [ ] Xác nhận các cảnh báo
- [ ] Cập nhật dữ liệu sản xuất
- [ ] Báo cáo vấn đề bất thường

### Supervisor
- [ ] Review OEE ca trước
- [ ] Kiểm tra Work Order pending
- [ ] Phân công công việc
- [ ] Họp giao ca

### Manager
- [ ] Review daily report
- [ ] Theo dõi KPI trend
- [ ] Phê duyệt Work Order
- [ ] Họp với team

---

*Cập nhật lần cuối: Tháng 12/2024*
