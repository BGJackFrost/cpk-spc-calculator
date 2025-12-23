# Danh sách Task Ưu tiên - Hệ thống SPC/CPK Calculator

**Ngày cập nhật:** 23/12/2024
**Tổng số task chưa hoàn thành:** ~620 tasks
**Tổng số task đã hoàn thành:** ~2670 tasks (81%)

---

## 1. NGHIỆP VỤ VÀ CHỨC NĂNG (Ưu tiên CAO)

### 1.1 Sửa lỗi và Tối ưu (Cần làm ngay)

| # | Task | Dòng | Trạng thái |
|---|------|------|------------|
| 1 | Tối ưu hóa UX/UI cho các trang chính | 184 | [ ] |
| 2 | Thêm validation và error handling chuyên nghiệp | 185 | [ ] |
| 3 | Thêm chức năng tìm kiếm và lọc nâng cao | 187 | [ ] |
| 4 | Cải tiến biểu đồ SPC với annotations và markers | 188 | [ ] |
| 5 | Cải tiến hệ thống thông báo realtime | 190 | [ ] |
| 6 | Cập nhật kế hoạch SPC với lựa chọn Fixture | 322 | [ ] |
| 7 | Tối ưu các query JOIN phức tạp | 375 | [ ] |
| 8 | Rà soát và fix lỗi các pages hiện có | 2118 | [ ] |
| 9 | Kiểm tra và sửa lỗi trang Supervisor Dashboard | 2367 | [ ] |

### 1.2 Tính năng SPC/CPK - ĐÃ HOÀN THÀNH

| # | Task | Dòng | Trạng thái |
|---|------|------|------------|
| 1 | Cải tiến Dashboard với thống kê chi tiết hơn | 186 | [x] Phase 35 |
| 2 | Tự động tổng hợp vào spc_summary_stats theo ca/ngày/tuần/tháng | 347 | [x] Phase 35 |
| 3 | Tạo trang so sánh CPK theo ca | 1514 | [x] Phase 35 |
| 4 | Hiển thị cảnh báo CPK realtime khi có vi phạm | 5459 | [x] Phase 35 |
| 5 | Tạo SPC Aggregation Service | - | [x] Phase 35 |
| 6 | Tạo CpkRealtimeAlertWidget | - | [x] Phase 35 |
| 7 | Tạo SPC Summary Report Service | - | [x] Phase 35 |

### 1.3 Tính năng SPC/CPK - Còn lại

| # | Task | Dòng | Trạng thái |
|---|------|------|------------|
| 1 | Nâng cấp Dashboard SPC Realtime với chế độ xem SPC Plan hoặc Machine/Fixture | 2120 | [ ] |
| 2 | Nâng cấp trang chi tiết OEE/SPC cho từng máy (MachineDetail.tsx) | 2161 | [ ] |
| 3 | Cải thiện giao diện SPC Plan Overview | 5458 | [ ] |

### 1.4 Tính năng MMS cần hoàn thiện

| # | Task | Dòng | Trạng thái |
|---|------|------|------------|
| 1 | Tìm kiếm/lọc trên KPI Dashboard theo dây chuyền/thiết bị | 2056 | [ ] |
| 2 | Kéo thả trên Gantt chart để điều chỉnh lịch trình | 2055 | [ ] |
| 3 | Biểu đồ lịch sử bảo trì và OEE trong QR lookup | 2057 | [ ] |
| 4 | Dashboard widgets tùy chỉnh (drag & drop) | 2058 | [ ] |
| 5 | Mobile responsive cho QR scanner và Gantt | 2060 | [ ] |

### 1.5 Tích hợp và Kết nối

| # | Task | Dòng | Trạng thái |
|---|------|------|------------|
| 1 | Tích hợp IoT Gateway kết nối PLC/SCADA | 2040 | [ ] |
| 2 | Tích hợp email SMTP cho cảnh báo | 2059 | [x] Đã có trang cấu hình |
| 3 | Thêm kết nối database mẫu để test | 1151 | [ ] |

### 1.6 Upload ảnh và Media

| # | Task | Dòng | Trạng thái |
|---|------|------|------------|
| 1 | Tích hợp lightbox vào MachineManagement | 5502 | [x] Đã hoàn thành Phase 3.13 |
| 2 | Tích hợp lightbox vào WorkstationManagement | 5503 | [x] Đã hoàn thành Phase 3.13 |

---

## 2. BÁO CÁO VÀ THỐNG KÊ (Ưu tiên TRUNG BÌNH)

### 2.1 Xuất báo cáo - ĐÃ HOÀN THÀNH

| # | Task | Dòng | Trạng thái |
|---|------|------|------------|
| 1 | Thêm báo cáo tổng hợp theo ca/ngày/tuần/tháng | 189 | [x] Phase 35 |
| 2 | Tạo SPC Summary Report Service (HTML/CSV) | - | [x] Phase 35 |
| 3 | Tạo trang SpcSummaryReport.tsx | - | [x] Phase 35 |

### 2.2 Xuất báo cáo - Còn lại

| # | Task | Dòng | Trạng thái |
|---|------|------|------------|
| 1 | Xuất báo cáo PDF/Excel cho SPC Report | 250 | [ ] |
| 2 | Xuất báo cáo OEE/Maintenance PDF/Excel | 2041 | [ ] |
| 3 | Tích hợp template vào export PDF | 766 | [ ] |
| 4 | Sửa lỗi xuất PDF/PNG SPC Plan | 3162 | [ ] |
| 5 | Sửa lỗi xuất báo cáo OEE/KPI/Phân tích | 3163 | [ ] |

### 2.3 Dashboard và Thống kê

| # | Task | Dòng | Trạng thái |
|---|------|------|------------|
| 1 | Tạo báo cáo OEE theo ca/ngày/tuần/tháng | 1928 | [ ] |
| 2 | Schema DB cho user dashboard config | 2073 | [ ] |
| 3 | API endpoints lưu/load cấu hình widgets | 2074 | [ ] |

### 2.4 Scheduled Reports

| # | Task | Dòng | Trạng thái |
|---|------|------|------------|
| 1 | Service tạo báo cáo PDF OEE/Maintenance | 2076 | [ ] |
| 2 | Scheduled job gửi báo cáo hàng tuần | 2077 | [ ] |
| 3 | UI cấu hình báo cáo tự động | 2078 | [ ] |

---

## 3. TÀI LIỆU VÀ ĐÀO TẠO (Ưu tiên THẤP)

### 3.1 Tài liệu hệ thống

| # | Task | Dòng | Trạng thái |
|---|------|------|------------|
| 1 | Cập nhật PRIORITY_TASKS.md với tiến độ mới nhất | 723 | [x] Phase 35 |
| 2 | Đưa ra kế hoạch hoàn thiện hệ thống | 724 | [ ] |
| 3 | Đề xuất phương hướng nâng cấp | 4074 | [ ] |

### 3.2 Hướng dẫn sử dụng

| # | Task | Dòng | Trạng thái |
|---|------|------|------------|
| 1 | Hoàn thành trang About.tsx với thông tin hệ thống | 5434 | [x] Đã hoàn thành |

---

## 4. TỔNG KẾT PHASE 35 (23/12/2024)

### Các tính năng đã hoàn thành:

**SPC Aggregation Service:**
- Tự động tổng hợp dữ liệu SPC theo ca (6h-14h, 14h-22h, 22h-6h)
- Tự động tổng hợp theo ngày/tuần/tháng
- API: aggregatePlan, aggregateAllActivePlans, aggregatePlanAllPeriods
- API: backfillSummary, compareShiftCpk, getShiftSummaryForDay

**CPK Realtime Alert Widget:**
- Widget hiển thị cảnh báo CPK realtime trên Dashboard
- So sánh CPK theo 3 ca làm việc
- Tab So sánh Ca và Tab Cảnh báo

**SPC Summary Report Service:**
- Xuất báo cáo HTML với template chuyên nghiệp
- Xuất báo cáo CSV
- Trang UI SpcSummaryReport.tsx với bộ lọc và preview

### Tests:
- Tất cả 1007 tests pass
- Không có lỗi TypeScript

---

## 5. KẾ HOẠCH TIẾP THEO

### Tuần 1: Sửa lỗi và Tối ưu
- [ ] Sửa lỗi trang Supervisor Dashboard
- [ ] Tối ưu UX/UI cho các trang chính
- [ ] Thêm validation và error handling

### Tuần 2: Tính năng SPC/CPK
- [ ] Cập nhật kế hoạch SPC với lựa chọn Fixture
- [ ] Nâng cấp Dashboard SPC Realtime
- [ ] Cải tiến biểu đồ SPC

### Tuần 3: Tính năng MMS
- [ ] Tìm kiếm/lọc trên KPI Dashboard
- [ ] Kéo thả Gantt chart
- [ ] Mobile responsive

### Tuần 4: Báo cáo và Thống kê
- [ ] Xuất báo cáo PDF/Excel
- [ ] Scheduled reports
- [ ] Dashboard config

---

## 6. GHI CHÚ

- Các task đã đánh dấu [x] trong file này đã được hoàn thành
- Cập nhật file này sau mỗi lần hoàn thành task
- Đồng bộ với todo.md để đảm bảo tính nhất quán
