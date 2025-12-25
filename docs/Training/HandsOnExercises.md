# Bài Tập Thực Hành - Hệ Thống SPC/CPK Calculator

## Thông Tin Chung

Tài liệu này chứa các bài tập thực hành để học viên áp dụng kiến thức đã học vào hệ thống thực tế. Mỗi bài tập được thiết kế để hoàn thành trong 15-20 phút và bao gồm hướng dẫn từng bước cùng với kết quả mong đợi.

---

## Bài Tập 1: Tính Toán CPK

### Mục Tiêu
Học viên có thể nhập dữ liệu và tính toán chỉ số CPK cho một sản phẩm cụ thể.

### Kịch Bản
Bạn là QC Engineer tại dây chuyền sản xuất linh kiện điện tử. Cần kiểm tra năng lực quy trình cho sản phẩm "Connector A" với thông số kích thước chiều dài.

### Dữ Liệu Đầu Vào

| Thông số | Giá trị |
|----------|---------|
| Tên sản phẩm | Connector A |
| Thông số đo | Chiều dài (mm) |
| USL | 10.5 mm |
| LSL | 9.5 mm |
| Target | 10.0 mm |

**Dữ liệu đo lường (30 mẫu):**

| Mẫu | Giá trị | Mẫu | Giá trị | Mẫu | Giá trị |
|-----|---------|-----|---------|-----|---------|
| 1 | 10.02 | 11 | 9.98 | 21 | 10.05 |
| 2 | 9.95 | 12 | 10.08 | 22 | 9.92 |
| 3 | 10.10 | 13 | 9.90 | 23 | 10.00 |
| 4 | 9.88 | 14 | 10.12 | 24 | 10.15 |
| 5 | 10.05 | 15 | 10.00 | 25 | 9.85 |
| 6 | 9.92 | 16 | 9.95 | 26 | 10.08 |
| 7 | 10.08 | 17 | 10.05 | 27 | 9.98 |
| 8 | 10.00 | 18 | 9.88 | 28 | 10.02 |
| 9 | 9.85 | 19 | 10.10 | 29 | 9.90 |
| 10 | 10.15 | 20 | 9.92 | 30 | 10.05 |

### Các Bước Thực Hiện

**Bước 1:** Đăng nhập vào hệ thống và truy cập menu SPC/CPK, sau đó chọn Tính toán CPK.

**Bước 2:** Tạo phiên phân tích mới bằng cách click nút "Tạo mới", nhập tên sản phẩm là "Connector A" và chọn thông số đo là "Chiều dài".

**Bước 3:** Thiết lập giới hạn kỹ thuật với USL = 10.5, LSL = 9.5, và Target = 10.0.

**Bước 4:** Nhập dữ liệu đo lường theo một trong hai cách: nhập thủ công từng giá trị hoặc import từ file Excel đã chuẩn bị.

**Bước 5:** Click nút "Tính toán" và chờ hệ thống xử lý.

**Bước 6:** Ghi nhận kết quả CPK, Cp, Mean, và Std Dev vào bảng kết quả.

### Kết Quả Mong Đợi

| Chỉ số | Giá trị dự kiến | Đánh giá |
|--------|-----------------|----------|
| Mean | ~10.00 | Gần target |
| Std Dev | ~0.08 | Biến thiên thấp |
| Cp | ~2.0 | Tốt |
| CPK | ~1.9 | Tốt |

### Câu Hỏi Kiểm Tra

1. CPK của quy trình này có đạt yêu cầu không? (Ngưỡng: ≥ 1.33)
2. Quy trình đang lệch về phía USL hay LSL?
3. Cần hành động gì để cải thiện CPK?

---

## Bài Tập 2: Theo Dõi OEE

### Mục Tiêu
Học viên có thể xem và phân tích OEE của một máy trong khoảng thời gian cụ thể.

### Kịch Bản
Bạn là Supervisor của dây chuyền lắp ráp. Cần đánh giá hiệu suất máy "Assembly-001" trong tuần vừa qua và xác định nguyên nhân OEE thấp.

### Các Bước Thực Hiện

**Bước 1:** Truy cập menu OEE và chọn Dashboard OEE.

**Bước 2:** Chọn máy "Assembly-001" từ danh sách dropdown.

**Bước 3:** Thiết lập khoảng thời gian là 7 ngày gần nhất.

**Bước 4:** Quan sát biểu đồ OEE và ghi nhận giá trị trung bình.

**Bước 5:** Click vào biểu đồ breakdown để xem chi tiết A, P, Q.

**Bước 6:** Xác định thành phần nào có giá trị thấp nhất.

**Bước 7:** Xem danh sách Six Big Losses để tìm nguyên nhân chính.

### Bảng Ghi Nhận Kết Quả

| Chỉ số | Giá trị | Mục tiêu | Đạt/Không đạt |
|--------|---------|----------|---------------|
| OEE | ___% | 85% | |
| Availability | ___% | 90% | |
| Performance | ___% | 95% | |
| Quality | ___% | 99% | |

### Câu Hỏi Phân Tích

1. Thành phần nào (A, P, Q) cần cải thiện nhất?
2. Top 3 nguyên nhân gây giảm OEE là gì?
3. Đề xuất hành động cải thiện?

---

## Bài Tập 3: Tạo Work Order

### Mục Tiêu
Học viên có thể tạo và theo dõi Work Order bảo trì.

### Kịch Bản
Máy "CNC-003" đang có tiếng ồn bất thường. Bạn cần tạo Work Order để yêu cầu kiểm tra và sửa chữa.

### Thông Tin Work Order

| Trường | Giá trị |
|--------|---------|
| Máy | CNC-003 |
| Loại | Corrective Maintenance |
| Ưu tiên | High |
| Mô tả | Máy có tiếng ồn bất thường khi chạy ở tốc độ cao. Nghi ngờ vấn đề ổ bi trục chính. |
| Kỹ thuật viên | (Chọn từ danh sách) |
| Dự kiến hoàn thành | 2 ngày |

### Các Bước Thực Hiện

**Bước 1:** Truy cập menu Bảo trì và chọn Work Orders.

**Bước 2:** Click nút "Tạo Work Order mới".

**Bước 3:** Điền đầy đủ thông tin theo bảng trên.

**Bước 4:** Đính kèm file (nếu có) như hình ảnh hoặc video.

**Bước 5:** Click "Lưu" để tạo Work Order.

**Bước 6:** Ghi nhận mã Work Order được tạo.

**Bước 7:** Theo dõi trạng thái Work Order trong danh sách.

### Kết Quả Mong Đợi

Work Order được tạo thành công với trạng thái "Pending" và mã WO dạng "WO-2024-XXXX".

---

## Bài Tập 4: Xuất Báo Cáo

### Mục Tiêu
Học viên có thể tạo và xuất báo cáo OEE theo định dạng mong muốn.

### Kịch Bản
Cuối tháng, bạn cần tạo báo cáo OEE tổng hợp cho tất cả máy trong dây chuyền để gửi cho Manager.

### Yêu Cầu Báo Cáo

| Thông số | Giá trị |
|----------|---------|
| Loại báo cáo | OEE Report |
| Khoảng thời gian | Tháng trước |
| Phạm vi | Tất cả máy |
| Định dạng | PDF |
| Bao gồm | Biểu đồ, Chi tiết |

### Các Bước Thực Hiện

**Bước 1:** Truy cập menu Báo cáo và chọn Xuất báo cáo.

**Bước 2:** Chọn loại báo cáo là "OEE Report".

**Bước 3:** Thiết lập khoảng thời gian là tháng trước.

**Bước 4:** Chọn phạm vi là "Tất cả máy".

**Bước 5:** Chọn định dạng xuất là PDF.

**Bước 6:** Bật các tùy chọn "Bao gồm biểu đồ" và "Bao gồm chi tiết".

**Bước 7:** Click "Tạo và Tải Báo cáo".

**Bước 8:** Mở file PDF và kiểm tra nội dung.

### Checklist Kiểm Tra Báo Cáo

| Mục | Có/Không |
|-----|----------|
| Có trang bìa với thông tin đầy đủ | |
| Có bảng tóm tắt OEE | |
| Có biểu đồ xu hướng | |
| Có chi tiết từng máy | |
| Định dạng chuyên nghiệp | |

---

## Bài Tập 5: Thiết Lập Cảnh Báo

### Mục Tiêu
Học viên có thể cấu hình ngưỡng cảnh báo cho CPK và OEE.

### Kịch Bản
Bạn cần thiết lập cảnh báo tự động khi CPK giảm dưới 1.33 hoặc OEE giảm dưới 80%.

### Các Bước Thực Hiện

**Bước 1:** Truy cập menu Cài đặt và chọn Cấu hình cảnh báo.

**Bước 2:** Tìm và click vào cảnh báo "CPK Warning".

**Bước 3:** Thiết lập ngưỡng Warning = 1.33 và Critical = 1.00.

**Bước 4:** Chọn kênh thông báo (In-app, Email).

**Bước 5:** Lưu cấu hình.

**Bước 6:** Lặp lại cho cảnh báo "OEE Warning" với ngưỡng Warning = 80% và Critical = 65%.

### Kiểm Tra Kết Quả

Sau khi thiết lập, hệ thống sẽ tự động gửi cảnh báo khi các chỉ số vi phạm ngưỡng đã cấu hình.

---

## Đáp Án Tham Khảo

### Bài Tập 1
CPK dự kiến khoảng 1.9, đạt yêu cầu (≥ 1.33). Quy trình đang centered tốt quanh target.

### Bài Tập 2
Kết quả phụ thuộc vào dữ liệu thực tế. Học viên cần xác định đúng thành phần có giá trị thấp nhất.

### Bài Tập 3
Work Order được tạo thành công nếu có đầy đủ thông tin bắt buộc và trạng thái là "Pending".

### Bài Tập 4
Báo cáo PDF phải có đầy đủ các mục trong checklist.

### Bài Tập 5
Cảnh báo được cấu hình đúng nếu có thể test bằng cách tạo dữ liệu vi phạm ngưỡng.

---

*Phiên bản: 1.0*
*Ngày tạo: Tháng 12/2024*
