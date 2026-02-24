# Hướng dẫn Test Mobile cho QR Scanner và Gantt Chart

Tài liệu này hướng dẫn cách kiểm tra các tính năng QR Scanner và Gantt Chart trên thiết bị di động để đảm bảo hoạt động tốt trên các nền tảng khác nhau.

## Tổng quan Tính năng Mobile

Hệ thống SPC/CPK Calculator đã được tối ưu hóa cho thiết bị di động với các tính năng responsive design, touch-friendly controls, và camera access cho QR scanning.

---

## Phần 1: Test QR Scanner trên Mobile

### Truy cập Tính năng QR Scanner

1. Mở trình duyệt trên thiết bị di động
2. Truy cập URL của hệ thống
3. Đăng nhập với tài khoản có quyền truy cập
4. Vào menu **MMS** → **Equipment QR Lookup**
5. Hoặc truy cập trực tiếp: `/equipment-qr-lookup`

### Yêu cầu Kỹ thuật

| Yêu cầu | Mô tả |
|---------|-------|
| **Camera** | Thiết bị cần có camera sau (rear camera) |
| **HTTPS** | Trang web phải chạy trên HTTPS để truy cập camera |
| **Quyền Camera** | Cho phép trình duyệt truy cập camera khi được hỏi |
| **Ánh sáng** | Đảm bảo đủ ánh sáng để camera nhận diện QR code |

### Các Bước Test

**Test 1: Khởi động Camera**

1. Mở trang Equipment QR Lookup
2. Click nút "Quét mã QR" hoặc "Scan QR Code"
3. Trình duyệt sẽ yêu cầu quyền truy cập camera
4. Chọn "Cho phép" (Allow)
5. **Kết quả mong đợi**: Camera mở và hiển thị preview

**Test 2: Quét mã QR**

1. Đưa mã QR của thiết bị vào vùng quét
2. Giữ thiết bị ổn định, cách mã QR khoảng 15-30cm
3. **Kết quả mong đợi**: Mã QR được nhận diện và thông tin thiết bị hiển thị

**Test 3: Nhập thủ công**

1. Nếu không quét được, sử dụng tính năng nhập mã thủ công
2. Nhập mã thiết bị (ví dụ: MC02)
3. Click "Tìm kiếm"
4. **Kết quả mong đợi**: Thông tin thiết bị hiển thị đầy đủ

### Xử lý Lỗi Thường gặp

| Lỗi | Nguyên nhân | Giải pháp |
|-----|-------------|-----------|
| Camera không mở | Chưa cấp quyền | Vào Settings → Site Settings → Camera → Cho phép |
| Màn hình đen | Camera bị chiếm bởi app khác | Đóng các app khác đang dùng camera |
| Không nhận QR | Ánh sáng yếu hoặc QR mờ | Tăng ánh sáng, làm sạch QR code |
| "NotAllowedError" | HTTPS không được bật | Đảm bảo truy cập qua HTTPS |

### Thiết bị và Trình duyệt Được Hỗ trợ

**iOS (iPhone/iPad)**

| Trình duyệt | Phiên bản tối thiểu | Trạng thái |
|-------------|---------------------|------------|
| Safari | iOS 11+ | Hỗ trợ đầy đủ |
| Chrome | iOS 14+ | Hỗ trợ đầy đủ |
| Firefox | iOS 14+ | Hỗ trợ đầy đủ |

**Android**

| Trình duyệt | Phiên bản tối thiểu | Trạng thái |
|-------------|---------------------|------------|
| Chrome | Android 5.0+ | Hỗ trợ đầy đủ |
| Samsung Internet | 10.0+ | Hỗ trợ đầy đủ |
| Firefox | Android 5.0+ | Hỗ trợ đầy đủ |
| Edge | Android 5.0+ | Hỗ trợ đầy đủ |

---

## Phần 2: Test Gantt Chart trên Mobile

### Truy cập Gantt Chart

1. Mở trình duyệt trên thiết bị di động
2. Truy cập URL của hệ thống
3. Đăng nhập với tài khoản có quyền truy cập
4. Vào menu **MMS** → **Maintenance Schedule**
5. Hoặc truy cập trực tiếp: `/maintenance-schedule`

### Các Tính năng Mobile của Gantt Chart

Gantt Chart đã được tối ưu với các tính năng sau:

| Tính năng | Mô tả |
|-----------|-------|
| **Horizontal Scroll** | Vuốt ngang để xem timeline dài |
| **Touch Handlers** | Hỗ trợ touch để tương tác với các task |
| **Responsive Breakpoints** | Tự động điều chỉnh layout theo kích thước màn hình |
| **Pinch to Zoom** | Thu phóng timeline (nếu được bật) |

### Các Bước Test

**Test 1: Hiển thị Gantt Chart**

1. Mở trang Maintenance Schedule
2. Chọn dây chuyền sản xuất hoặc máy
3. **Kết quả mong đợi**: Gantt chart hiển thị đầy đủ với các task bảo trì

**Test 2: Cuộn Ngang (Horizontal Scroll)**

1. Đặt ngón tay lên vùng Gantt chart
2. Vuốt sang trái/phải để xem các ngày khác
3. **Kết quả mong đợi**: Timeline cuộn mượt mà, không bị giật

**Test 3: Cuộn Dọc (Vertical Scroll)**

1. Nếu có nhiều task, vuốt lên/xuống
2. **Kết quả mong đợi**: Danh sách task cuộn mượt mà

**Test 4: Xem Chi tiết Task**

1. Chạm vào một task trên Gantt chart
2. **Kết quả mong đợi**: Popup hoặc panel hiển thị chi tiết task

**Test 5: Responsive Layout**

1. Xoay thiết bị từ dọc sang ngang (portrait → landscape)
2. **Kết quả mong đợi**: Layout tự động điều chỉnh, Gantt chart mở rộng

### Xử lý Lỗi Thường gặp

| Lỗi | Nguyên nhân | Giải pháp |
|-----|-------------|-----------|
| Không cuộn được | Touch event bị chặn | Thử refresh trang |
| Layout bị vỡ | Cache cũ | Xóa cache trình duyệt |
| Chậm/lag | Quá nhiều task | Lọc theo khoảng thời gian ngắn hơn |
| Không hiển thị | JavaScript lỗi | Kiểm tra console, refresh trang |

### Kích thước Màn hình Được Hỗ trợ

| Kích thước | Thiết bị ví dụ | Trạng thái |
|------------|----------------|------------|
| 320px - 480px | iPhone SE, điện thoại nhỏ | Hỗ trợ (compact mode) |
| 481px - 768px | iPhone Plus, Android lớn | Hỗ trợ đầy đủ |
| 769px - 1024px | iPad, tablet | Hỗ trợ đầy đủ |
| > 1024px | iPad Pro, tablet lớn | Hỗ trợ đầy đủ |

---

## Phần 3: Checklist Test Tổng hợp

### QR Scanner Checklist

- [ ] Camera mở thành công trên iOS Safari
- [ ] Camera mở thành công trên iOS Chrome
- [ ] Camera mở thành công trên Android Chrome
- [ ] Camera mở thành công trên Android Samsung Internet
- [ ] Quét QR code thành công
- [ ] Nhập mã thủ công hoạt động
- [ ] Thông tin thiết bị hiển thị đúng sau khi quét
- [ ] Tab OEE hiển thị biểu đồ
- [ ] Tab Charts hiển thị lịch sử bảo trì
- [ ] MTBF/MTTR hiển thị giá trị (không phải N/A)

### Gantt Chart Checklist

- [ ] Gantt chart load thành công trên mobile
- [ ] Cuộn ngang hoạt động mượt mà
- [ ] Cuộn dọc hoạt động mượt mà
- [ ] Chạm vào task hiển thị chi tiết
- [ ] Layout responsive khi xoay màn hình
- [ ] Không bị lag khi có nhiều task
- [ ] Màu sắc task hiển thị đúng theo trạng thái
- [ ] Legend/chú thích hiển thị đầy đủ

---

## Phần 4: Mẹo Test Hiệu quả

### Sử dụng DevTools Mobile Emulation

Trước khi test trên thiết bị thực, có thể sử dụng Chrome DevTools để mô phỏng:

1. Mở Chrome trên máy tính
2. Nhấn F12 để mở DevTools
3. Click biểu tượng "Toggle device toolbar" (Ctrl+Shift+M)
4. Chọn thiết bị muốn mô phỏng (iPhone, Pixel, iPad...)
5. Test các tính năng cơ bản

**Lưu ý**: Camera không hoạt động trong emulation, cần test trên thiết bị thực.

### Test trên Thiết bị Thực

Để test QR Scanner và các tính năng camera:

1. Đảm bảo thiết bị và máy tính cùng mạng WiFi
2. Truy cập URL của hệ thống từ thiết bị di động
3. Hoặc sử dụng ngrok/localtunnel để expose localhost

### Báo cáo Lỗi

Khi phát hiện lỗi, ghi lại các thông tin sau:

1. **Thiết bị**: Model, phiên bản OS
2. **Trình duyệt**: Tên và phiên bản
3. **Tính năng**: QR Scanner / Gantt Chart
4. **Mô tả lỗi**: Chi tiết những gì xảy ra
5. **Bước tái hiện**: Các bước để tái hiện lỗi
6. **Screenshot/Video**: Nếu có thể

---

## Liên hệ Hỗ trợ

Nếu gặp vấn đề không thể giải quyết, vui lòng liên hệ:

- **Email**: support@company.com
- **Slack**: #spc-support channel

---

*Cập nhật: 23/12/2024*
*Tác giả: Manus AI*
