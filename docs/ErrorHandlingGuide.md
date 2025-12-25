# Hướng Dẫn Xử Lý Lỗi - Hệ Thống SPC/CPK Calculator

## Mục Lục

1. [Lỗi Đăng Nhập](#1-lỗi-đăng-nhập)
2. [Lỗi Dữ Liệu](#2-lỗi-dữ-liệu)
3. [Lỗi Tính Toán](#3-lỗi-tính-toán)
4. [Lỗi Kết Nối](#4-lỗi-kết-nối)
5. [Lỗi Báo Cáo](#5-lỗi-báo-cáo)
6. [Lỗi Hệ Thống](#6-lỗi-hệ-thống)

---

## 1. Lỗi Đăng Nhập

### ERR-AUTH-001: "Invalid credentials"

**Nguyên nhân:** Thông tin đăng nhập không chính xác.

**Giải pháp:**
1. Kiểm tra lại email/username
2. Kiểm tra lại mật khẩu (chú ý Caps Lock)
3. Thử đặt lại mật khẩu

### ERR-AUTH-002: "Session expired"

**Nguyên nhân:** Phiên đăng nhập đã hết hạn.

**Giải pháp:**
1. Nhấn nút "Đăng nhập lại"
2. Hoặc làm mới trang (F5)

### ERR-AUTH-003: "Account locked"

**Nguyên nhân:** Tài khoản bị khóa do nhập sai mật khẩu nhiều lần.

**Giải pháp:**
1. Chờ 30 phút để tự động mở khóa
2. Hoặc liên hệ quản trị viên

### ERR-AUTH-004: "Unauthorized access"

**Nguyên nhân:** Không có quyền truy cập tính năng này.

**Giải pháp:**
1. Liên hệ quản trị viên để được cấp quyền
2. Kiểm tra vai trò (role) của tài khoản

---

## 2. Lỗi Dữ Liệu

### ERR-DATA-001: "Invalid data format"

**Nguyên nhân:** Dữ liệu nhập vào không đúng định dạng.

**Giải pháp:**
1. Kiểm tra định dạng số (dùng dấu chấm cho số thập phân)
2. Kiểm tra định dạng ngày (DD/MM/YYYY)
3. Xem lại template import

### ERR-DATA-002: "Data not found"

**Nguyên nhân:** Không tìm thấy dữ liệu yêu cầu.

**Giải pháp:**
1. Kiểm tra lại bộ lọc (filter)
2. Mở rộng khoảng thời gian tìm kiếm
3. Kiểm tra quyền truy cập dữ liệu

### ERR-DATA-003: "Duplicate entry"

**Nguyên nhân:** Dữ liệu đã tồn tại trong hệ thống.

**Giải pháp:**
1. Kiểm tra dữ liệu đã có chưa
2. Sử dụng chức năng cập nhật thay vì thêm mới
3. Xóa bản ghi trùng nếu cần

### ERR-DATA-004: "Import failed"

**Nguyên nhân:** Lỗi khi import dữ liệu từ file.

**Giải pháp:**
1. Kiểm tra file có đúng template không
2. Kiểm tra encoding file (UTF-8)
3. Kiểm tra dữ liệu có ô trống không
4. Giảm số lượng dòng và thử lại

**Chi tiết lỗi import thường gặp:**

| Lỗi | Nguyên nhân | Giải pháp |
|-----|-------------|-----------|
| Row X: Invalid number | Giá trị không phải số | Kiểm tra ô có chữ hoặc ký tự đặc biệt |
| Row X: Missing required field | Thiếu trường bắt buộc | Điền đầy đủ các cột bắt buộc |
| Row X: Date format error | Sai định dạng ngày | Dùng DD/MM/YYYY |

---

## 3. Lỗi Tính Toán

### ERR-CALC-001: "Insufficient data"

**Nguyên nhân:** Không đủ dữ liệu để tính toán.

**Giải pháp:**
1. Cần ít nhất 30 mẫu để tính CPK
2. Thêm dữ liệu và thử lại

### ERR-CALC-002: "Division by zero"

**Nguyên nhân:** Độ lệch chuẩn bằng 0 (tất cả giá trị giống nhau).

**Giải pháp:**
1. Kiểm tra dữ liệu có đa dạng không
2. Có thể dữ liệu bị nhập sai

### ERR-CALC-003: "Invalid specification limits"

**Nguyên nhân:** Giới hạn kỹ thuật không hợp lệ.

**Giải pháp:**
1. Kiểm tra USL > LSL
2. Kiểm tra Target nằm giữa USL và LSL
3. Kiểm tra giá trị không âm (nếu yêu cầu)

### ERR-CALC-004: "Calculation timeout"

**Nguyên nhân:** Tính toán mất quá nhiều thời gian.

**Giải pháp:**
1. Giảm khoảng thời gian phân tích
2. Giảm số lượng máy/sản phẩm
3. Thử lại sau vài phút

---

## 4. Lỗi Kết Nối

### ERR-CONN-001: "Network error"

**Nguyên nhân:** Mất kết nối mạng.

**Giải pháp:**
1. Kiểm tra kết nối internet
2. Thử làm mới trang
3. Kiểm tra firewall/proxy

### ERR-CONN-002: "Server unavailable"

**Nguyên nhân:** Server đang bảo trì hoặc quá tải.

**Giải pháp:**
1. Chờ vài phút và thử lại
2. Kiểm tra thông báo bảo trì
3. Liên hệ hỗ trợ kỹ thuật

### ERR-CONN-003: "WebSocket disconnected"

**Nguyên nhân:** Mất kết nối realtime.

**Giải pháp:**
1. Hệ thống sẽ tự động kết nối lại
2. Nếu không, làm mới trang
3. Kiểm tra kết nối mạng

### ERR-CONN-004: "API timeout"

**Nguyên nhân:** Yêu cầu mất quá nhiều thời gian.

**Giải pháp:**
1. Giảm phạm vi dữ liệu yêu cầu
2. Thử lại sau vài phút
3. Kiểm tra kết nối mạng

---

## 5. Lỗi Báo Cáo

### ERR-RPT-001: "Report generation failed"

**Nguyên nhân:** Lỗi khi tạo báo cáo.

**Giải pháp:**
1. Kiểm tra có dữ liệu trong khoảng thời gian không
2. Giảm khoảng thời gian báo cáo
3. Thử định dạng khác (Excel thay vì PDF)

### ERR-RPT-002: "Email delivery failed"

**Nguyên nhân:** Không gửi được email báo cáo.

**Giải pháp:**
1. Kiểm tra địa chỉ email hợp lệ
2. Kiểm tra hộp thư không đầy
3. Liên hệ quản trị viên kiểm tra SMTP

### ERR-RPT-003: "Export file too large"

**Nguyên nhân:** File xuất ra quá lớn.

**Giải pháp:**
1. Giảm khoảng thời gian
2. Bỏ bớt cột dữ liệu
3. Chia thành nhiều file nhỏ

### ERR-RPT-004: "Template not found"

**Nguyên nhân:** Không tìm thấy template báo cáo.

**Giải pháp:**
1. Liên hệ quản trị viên
2. Sử dụng template mặc định

---

## 6. Lỗi Hệ Thống

### ERR-SYS-001: "Internal server error"

**Nguyên nhân:** Lỗi không xác định từ server.

**Giải pháp:**
1. Làm mới trang
2. Đăng xuất và đăng nhập lại
3. Liên hệ hỗ trợ kỹ thuật với mã lỗi

### ERR-SYS-002: "Database connection error"

**Nguyên nhân:** Không kết nối được database.

**Giải pháp:**
1. Chờ vài phút và thử lại
2. Liên hệ hỗ trợ kỹ thuật

### ERR-SYS-003: "Service unavailable"

**Nguyên nhân:** Dịch vụ đang bảo trì.

**Giải pháp:**
1. Kiểm tra thông báo bảo trì
2. Chờ đến khi hoàn tất bảo trì

### ERR-SYS-004: "Rate limit exceeded"

**Nguyên nhân:** Gửi quá nhiều yêu cầu trong thời gian ngắn.

**Giải pháp:**
1. Chờ 1 phút và thử lại
2. Giảm tần suất yêu cầu

---

## Quy Trình Báo Cáo Lỗi

Khi gặp lỗi không thể tự xử lý, vui lòng cung cấp thông tin sau:

1. **Mã lỗi** (nếu có)
2. **Thời gian xảy ra lỗi**
3. **Các bước thực hiện trước khi gặp lỗi**
4. **Screenshot màn hình lỗi**
5. **Trình duyệt và phiên bản**

### Kênh hỗ trợ

| Mức độ | Kênh | Thời gian phản hồi |
|--------|------|-------------------|
| Critical | Hotline: 1900-xxxx | 15 phút |
| High | Email: support@company.com | 2 giờ |
| Normal | Ticket system | 24 giờ |

---

## Mã Lỗi Tham Khảo

| Prefix | Module |
|--------|--------|
| ERR-AUTH | Xác thực |
| ERR-DATA | Dữ liệu |
| ERR-CALC | Tính toán |
| ERR-CONN | Kết nối |
| ERR-RPT | Báo cáo |
| ERR-SYS | Hệ thống |

---

*Cập nhật lần cuối: Tháng 12/2024*
