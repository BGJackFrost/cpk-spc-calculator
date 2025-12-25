# FAQ - Câu Hỏi Thường Gặp

## Mục Lục

1. [Đăng Nhập & Tài Khoản](#1-đăng-nhập--tài-khoản)
2. [SPC/CPK](#2-spccpk)
3. [OEE](#3-oee)
4. [Bảo Trì](#4-bảo-trì)
5. [Báo Cáo](#5-báo-cáo)
6. [Cảnh Báo](#6-cảnh-báo)
7. [Kỹ Thuật](#7-kỹ-thuật)

---

## 1. Đăng Nhập & Tài Khoản

### Q: Tôi không thể đăng nhập vào hệ thống?

**A:** Kiểm tra các bước sau:
1. Đảm bảo bạn đang sử dụng tài khoản Manus đã được cấp quyền
2. Xóa cache và cookies của trình duyệt
3. Thử đăng nhập trên trình duyệt khác
4. Liên hệ quản trị viên nếu vẫn không được

### Q: Làm sao để đổi mật khẩu?

**A:** Mật khẩu được quản lý bởi hệ thống Manus OAuth. Truy cập cài đặt tài khoản Manus để thay đổi mật khẩu.

### Q: Tôi có thể sử dụng nhiều thiết bị cùng lúc không?

**A:** Có, bạn có thể đăng nhập trên nhiều thiết bị. Tuy nhiên, một số thao tác có thể bị giới hạn để tránh xung đột dữ liệu.

---

## 2. SPC/CPK

### Q: CPK và Ppk khác nhau như thế nào?

**A:** 

| Chỉ số | Độ lệch chuẩn | Ứng dụng |
|--------|---------------|----------|
| **Cpk** | σ (ước lượng từ R-bar) | Năng lực quy trình ngắn hạn |
| **Ppk** | s (độ lệch chuẩn mẫu) | Hiệu suất quy trình dài hạn |

Cpk giả định quy trình ổn định và sử dụng biến thiên trong nhóm con. Ppk sử dụng biến thiên tổng thể của tất cả dữ liệu.

### Q: CPK bao nhiêu là đủ tốt?

**A:** 

| CPK | Đánh giá | Tỷ lệ lỗi (ppm) |
|-----|----------|-----------------|
| ≥ 2.00 | Xuất sắc (6σ) | 3.4 |
| ≥ 1.67 | Rất tốt | 233 |
| ≥ 1.33 | Tốt | 6,210 |
| ≥ 1.00 | Chấp nhận | 66,807 |
| < 1.00 | Không đạt | > 66,807 |

### Q: Tại sao CPK của tôi âm?

**A:** CPK âm xảy ra khi giá trị trung bình nằm ngoài giới hạn kỹ thuật (USL hoặc LSL). Điều này cho thấy quy trình đang sản xuất sản phẩm không đạt yêu cầu. Cần điều chỉnh quy trình ngay lập tức.

### Q: Cần bao nhiêu mẫu để tính CPK chính xác?

**A:** 
- **Tối thiểu**: 30 mẫu
- **Khuyến nghị**: 100-200 mẫu
- **Lý tưởng**: 25-30 nhóm con, mỗi nhóm 4-5 mẫu

### Q: Làm sao để cải thiện CPK?

**A:** 
1. **Giảm biến thiên**: Chuẩn hóa quy trình, kiểm soát nguyên liệu
2. **Dịch chuyển trung bình**: Điều chỉnh thiết lập máy
3. **Mở rộng dung sai**: Đàm phán với khách hàng (nếu có thể)

---

## 3. OEE

### Q: OEE 100% có thể đạt được không?

**A:** Về lý thuyết có, nhưng thực tế rất khó. OEE 100% nghĩa là:
- Không có downtime
- Chạy ở tốc độ tối đa
- Không có sản phẩm lỗi

OEE > 85% được coi là "World Class".

### Q: Tại sao OEE của tôi thấp hơn mong đợi?

**A:** Kiểm tra từng thành phần:

| Thành phần | Nguyên nhân thường gặp |
|------------|------------------------|
| Availability thấp | Hỏng máy, setup lâu, thiếu nguyên liệu |
| Performance thấp | Chạy chậm, dừng ngắn, tắc nghẽn |
| Quality thấp | Sản phẩm lỗi, phế phẩm, làm lại |

### Q: OEE có tính thời gian nghỉ trưa không?

**A:** Không. OEE chỉ tính trên **Planned Production Time** (thời gian sản xuất kế hoạch). Thời gian nghỉ trưa, nghỉ giữa ca không được tính vào.

### Q: Làm sao để so sánh OEE giữa các máy khác nhau?

**A:** Sử dụng trang **OEE > So sánh OEE**. Lưu ý:
- So sánh máy cùng loại/công suất
- Cùng khoảng thời gian
- Cùng loại sản phẩm (nếu có thể)

---

## 4. Bảo Trì

### Q: Khi nào nên tạo Work Order?

**A:** 
- **Corrective (CM)**: Khi máy hỏng hoặc có vấn đề
- **Preventive (PM)**: Theo lịch bảo trì định kỳ
- **Predictive (PdM)**: Khi phát hiện dấu hiệu bất thường

### Q: MTBF và MTTR là gì?

**A:**

| Chỉ số | Ý nghĩa | Công thức |
|--------|---------|-----------|
| **MTBF** | Mean Time Between Failures | Tổng thời gian chạy / Số lần hỏng |
| **MTTR** | Mean Time To Repair | Tổng thời gian sửa / Số lần sửa |

### Q: Làm sao để giảm MTTR?

**A:**
1. Chuẩn bị phụ tùng sẵn sàng
2. Đào tạo kỹ thuật viên
3. Tài liệu hóa quy trình sửa chữa
4. Sử dụng công cụ chẩn đoán

### Q: Hệ thống có tự động tạo Work Order không?

**A:** Có, khi:
- Có alarm từ máy (nếu đã cấu hình)
- Đến lịch bảo trì định kỳ
- CPK/OEE vi phạm ngưỡng (nếu đã cấu hình)

---

## 5. Báo Cáo

### Q: Tôi có thể tùy chỉnh báo cáo không?

**A:** Có, trong trang **Báo cáo > Xuất báo cáo**:
- Chọn loại báo cáo
- Chọn khoảng thời gian
- Bật/tắt biểu đồ
- Bật/tắt chi tiết

### Q: Báo cáo tự động gửi lúc mấy giờ?

**A:** Mặc định:
- Hàng ngày: 6:00 sáng
- Hàng tuần: Thứ Hai, 6:00 sáng
- Hàng tháng: Ngày 1, 6:00 sáng

Có thể tùy chỉnh trong cài đặt lịch báo cáo.

### Q: Tại sao tôi không nhận được email báo cáo?

**A:** Kiểm tra:
1. Email đã được thêm vào danh sách người nhận
2. Lịch báo cáo đang bật (enabled)
3. Kiểm tra thư mục Spam
4. Liên hệ quản trị viên để kiểm tra cấu hình email

---

## 6. Cảnh Báo

### Q: Làm sao để tắt thông báo?

**A:** Vào **Cài đặt > Thông báo** để:
- Tắt từng loại cảnh báo
- Tắt kênh thông báo (email, push)
- Cấu hình thời gian không làm phiền

### Q: Cảnh báo escalation hoạt động như thế nào?

**A:** Nếu cảnh báo không được xử lý trong thời gian quy định, hệ thống sẽ tự động thông báo cho cấp cao hơn:
1. Level 1 → Level 2: sau 15 phút
2. Level 2 → Level 3: sau 30 phút
3. Level 3 → Level 4: sau 60 phút

### Q: Tôi có thể tạo ngưỡng cảnh báo riêng cho từng máy không?

**A:** Có, trong **Cài đặt > Cấu hình cảnh báo**, chọn máy cụ thể và thiết lập ngưỡng riêng.

---

## 7. Kỹ Thuật

### Q: Hệ thống hỗ trợ trình duyệt nào?

**A:** 
- Chrome (khuyến nghị) - phiên bản 90+
- Firefox - phiên bản 88+
- Safari - phiên bản 14+
- Edge - phiên bản 90+

### Q: Dữ liệu được lưu trữ bao lâu?

**A:**
| Loại dữ liệu | Thời gian lưu |
|--------------|---------------|
| Dữ liệu realtime | 30 ngày |
| Dữ liệu SPC | 2 năm |
| Báo cáo | 1 năm |
| Log hệ thống | 90 ngày |

### Q: Hệ thống có API không?

**A:** Có, hệ thống cung cấp tRPC API. Liên hệ quản trị viên để được cấp quyền truy cập API.

### Q: Làm sao để import dữ liệu từ Excel?

**A:**
1. Tải template Excel từ hệ thống
2. Điền dữ liệu theo đúng format
3. Vào trang import và upload file
4. Kiểm tra preview và xác nhận

### Q: Tôi gặp lỗi "Session expired"?

**A:** Phiên đăng nhập đã hết hạn. Nhấn **"Đăng nhập lại"** hoặc làm mới trang để đăng nhập lại.

---

## Liên Hệ Hỗ Trợ

Nếu bạn không tìm thấy câu trả lời cho câu hỏi của mình:

- **Email**: support@company.com
- **Hotline**: 1900-xxxx
- **Giờ làm việc**: 8:00 - 17:00 (Thứ Hai - Thứ Sáu)

---

*Cập nhật lần cuối: Tháng 12/2024*
