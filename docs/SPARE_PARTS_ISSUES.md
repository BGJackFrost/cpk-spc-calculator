# Danh sách Lỗi và Vấn đề Cần Ưu tiên - Trang Spare Parts

**Ngày rà soát:** 16/12/2025  
**Người thực hiện:** Manus AI

---

## Tổng quan

Tài liệu này liệt kê các lỗi và vấn đề được phát hiện trên module **Quản lý Phụ tùng (Spare Parts)** bao gồm các chức năng: xuất/nhập kho, tồn kho, kiểm kê định kỳ, và tạo đơn hàng.

---

## 1. Lỗi Ưu tiên CAO (Critical)

### 1.1. Lỗi Database - Bảng `spare_parts_inventory_checks`

| Mức độ | Ưu tiên CAO |
|--------|-------------|
| **Mô tả** | Lỗi khi tạo phiếu kiểm kê mới - Database query failed |
| **Nguyên nhân** | Thiếu cột hoặc cấu trúc bảng không khớp với schema |
| **Thông báo lỗi** | `Failed query: insert into spare_parts_inventory_checks...` |
| **Ảnh hưởng** | Không thể tạo phiếu kiểm kê mới |
| **Giải pháp** | Chạy `pnpm db:push` để đồng bộ schema với database |

### 1.2. Lỗi Database Connection - ECONNRESET

| Mức độ | Ưu tiên CAO |
|--------|-------------|
| **Mô tả** | Kết nối database bị ngắt đột ngột |
| **Nguyên nhân** | Connection pool timeout hoặc network issue |
| **Thông báo lỗi** | `Error: read ECONNRESET` |
| **Ảnh hưởng** | Các query bị fail ngẫu nhiên |
| **Giải pháp** | Cấu hình connection pool với retry logic và keepalive |

---

## 2. Lỗi Ưu tiên TRUNG BÌNH (Medium)

### 2.1. Chức năng Nhập/Xuất kho nhanh (+1/-1) không ghi lịch sử

| Mức độ | Ưu tiên TRUNG BÌNH |
|--------|---------------------|
| **Mô tả** | Nút +1/-1 trên danh sách phụ tùng không ghi vào lịch sử giao dịch |
| **Vị trí** | Tab "Kho phụ tùng" - cột Thao tác |
| **Hiện trạng** | Click +1/-1 không thấy toast thông báo, không ghi vào tab "Lịch sử giao dịch" |
| **Ảnh hưởng** | Mất truy vết lịch sử xuất/nhập kho |
| **Giải pháp** | Kiểm tra mutation `createTransaction` có được gọi đúng không |

### 2.2. Tab "Lịch sử giao dịch" trống

| Mức độ | Ưu tiên TRUNG BÌNH |
|--------|---------------------|
| **Mô tả** | Tab "Lịch sử giao dịch" hiển thị "Chưa có giao dịch nào" |
| **Vị trí** | Trang Spare Parts > Tab "Lịch sử giao dịch" |
| **Hiện trạng** | Không có dữ liệu mặc dù đã có thao tác nhập/xuất |
| **Ảnh hưởng** | Không theo dõi được lịch sử giao dịch |
| **Giải pháp** | Kiểm tra bảng `spare_parts_transactions` và query `listTransactions` |

### 2.3. Form Nhập kho thiếu dropdown chọn phụ tùng

| Mức độ | Ưu tiên TRUNG BÌNH |
|--------|---------------------|
| **Mô tả** | Form nhập kho trên trang "Xuất Nhập Tồn Kho" thiếu dropdown chọn phụ tùng |
| **Vị trí** | Trang /stock-movements > Dialog "Nhập kho phụ tùng" |
| **Hiện trạng** | Dropdown "Phụ tùng" trống, không có options |
| **Ảnh hưởng** | Không thể chọn phụ tùng để nhập kho |
| **Giải pháp** | Load danh sách phụ tùng vào dropdown |

---

## 3. Lỗi Ưu tiên THẤP (Low)

### 3.1. Thiếu validation cho form tạo đơn hàng

| Mức độ | Ưu tiên THẤP |
|--------|--------------|
| **Mô tả** | Form tạo đơn hàng không validate đầy đủ |
| **Vị trí** | Dialog "Tạo Đơn đặt hàng mới" |
| **Hiện trạng** | Có thể submit form mà không chọn nhà cung cấp |
| **Giải pháp** | Thêm validation required cho các trường bắt buộc |

### 3.2. Thiếu chức năng Sửa/Xóa phụ tùng

| Mức độ | Ưu tiên THẤP |
|--------|--------------|
| **Mô tả** | Không có nút Sửa/Xóa cho từng phụ tùng trong danh sách |
| **Vị trí** | Tab "Kho phụ tùng" - cột Thao tác |
| **Hiện trạng** | Chỉ có nút +1/-1, thiếu menu dropdown với Edit/Delete |
| **Giải pháp** | Thêm DropdownMenu với các action Edit/Delete |

### 3.3. Thiếu chức năng Sửa/Xóa nhà cung cấp

| Mức độ | Ưu tiên THẤP |
|--------|--------------|
| **Mô tả** | Không có nút Sửa/Xóa cho từng nhà cung cấp |
| **Vị trí** | Tab "Nhà cung cấp" |
| **Hiện trạng** | Chỉ hiển thị danh sách, không có action |
| **Giải pháp** | Thêm cột Thao tác với Edit/Delete |

### 3.4. Thiếu pagination cho danh sách

| Mức độ | Ưu tiên THẤP |
|--------|--------------|
| **Mô tả** | Các danh sách không có pagination |
| **Vị trí** | Tất cả các tab trong trang Spare Parts |
| **Hiện trạng** | Load tất cả dữ liệu cùng lúc |
| **Giải pháp** | Thêm pagination component với limit/offset |

---

## 4. Cải tiến UX được đề xuất

### 4.1. Thêm Export Excel/PDF

| Loại | Cải tiến |
|------|----------|
| **Mô tả** | Thêm nút xuất báo cáo Excel/PDF |
| **Vị trí** | Header của mỗi tab |
| **Lý do** | Hỗ trợ báo cáo và lưu trữ |

### 4.2. Thêm Dashboard thống kê

| Loại | Cải tiến |
|------|----------|
| **Mô tả** | Thêm biểu đồ thống kê xuất/nhập theo thời gian |
| **Vị trí** | Phần đầu trang Spare Parts |
| **Lý do** | Trực quan hóa dữ liệu |

### 4.3. Thêm cảnh báo tồn kho thấp

| Loại | Cải tiến |
|------|----------|
| **Mô tả** | Gửi notification khi tồn kho dưới mức tối thiểu |
| **Vị trí** | System notification |
| **Lý do** | Chủ động đặt hàng bổ sung |

### 4.4. Tích hợp barcode/QR code

| Loại | Cải tiến |
|------|----------|
| **Mô tả** | Quét barcode để nhập/xuất kho nhanh |
| **Vị trí** | Form nhập/xuất kho |
| **Lý do** | Tăng tốc độ thao tác |

---

## 5. Tóm tắt theo mức độ ưu tiên

| Mức độ | Số lượng | Danh sách |
|--------|----------|-----------|
| **CAO** | 2 | Database schema, Connection reset |
| **TRUNG BÌNH** | 3 | Nhập/xuất nhanh, Lịch sử trống, Form nhập kho |
| **THẤP** | 4 | Validation, Sửa/Xóa phụ tùng, Sửa/Xóa NCC, Pagination |
| **Cải tiến** | 4 | Export, Dashboard, Cảnh báo, Barcode |

---

## 6. Kế hoạch khắc phục đề xuất

### Sprint 1 (Ưu tiên CAO)
1. Chạy `pnpm db:push` để đồng bộ schema
2. Cấu hình connection pool với retry logic
3. Test lại chức năng tạo phiếu kiểm kê

### Sprint 2 (Ưu tiên TRUNG BÌNH)
1. Fix mutation nhập/xuất kho nhanh
2. Debug query listTransactions
3. Load danh sách phụ tùng vào form nhập kho

### Sprint 3 (Ưu tiên THẤP + Cải tiến)
1. Thêm validation form
2. Thêm CRUD đầy đủ cho phụ tùng và NCC
3. Thêm pagination
4. Thêm export Excel

---

**Ghi chú:** Danh sách này được cập nhật dựa trên kết quả rà soát ngày 16/12/2025. Cần kiểm tra lại sau mỗi sprint để cập nhật trạng thái.
