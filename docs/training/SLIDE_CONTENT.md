# NỘI DUNG SLIDES TRAINING HỆ THỐNG SPC/CPK CALCULATOR
## Thời lượng: 2 giờ | Số lượng: 10 người

---

## SLIDE 1: TRANG BÌA
**Tiêu đề:** Hệ thống Tính toán SPC/CPK Calculator
**Phụ đề:** Chương trình Training Pilot
**Thông tin:** Foutec Digital | Thời lượng: 2 giờ

---

## SLIDE 2: MỤC TIÊU KHÓA HỌC
**Tiêu đề:** Sau khóa học, bạn sẽ có thể:

**Nội dung:**
- Hiểu được khái niệm SPC/CPK và tầm quan trọng trong kiểm soát chất lượng
- Sử dụng thành thạo các chức năng chính của hệ thống
- Phân tích dữ liệu SPC và đưa ra quyết định dựa trên CPK
- Cấu hình và quản lý kế hoạch lấy mẫu SPC
- Xuất báo cáo và thiết lập cảnh báo tự động

---

## SLIDE 3: AGENDA - CHƯƠNG TRÌNH TRAINING
**Tiêu đề:** Chương trình Training 2 giờ

**Nội dung:**
| Thời gian | Nội dung | Phương pháp |
|-----------|----------|-------------|
| 00:00-00:15 | Giới thiệu SPC/CPK cơ bản | Lý thuyết |
| 00:15-00:30 | Tổng quan hệ thống | Demo |
| 00:30-00:50 | Phân tích SPC/CPK | Thực hành |
| 00:50-01:00 | Nghỉ giải lao | - |
| 01:00-01:20 | Quản lý Kế hoạch SPC | Thực hành |
| 01:20-01:40 | Dashboard & Báo cáo | Thực hành |
| 01:40-01:55 | Cảnh báo & Thông báo | Demo |
| 01:55-02:00 | Hỏi đáp & Tổng kết | Q&A |

---

## PHẦN 1: GIỚI THIỆU SPC/CPK CƠ BẢN (15 phút)

### SLIDE 4: SPC LÀ GÌ?
**Tiêu đề:** Statistical Process Control - Kiểm soát Quy trình Thống kê

**Nội dung:**
- **Định nghĩa:** SPC là phương pháp sử dụng công cụ thống kê để giám sát và kiểm soát quy trình sản xuất
- **Mục đích:** Phát hiện sớm biến động bất thường trước khi tạo ra sản phẩm lỗi
- **Lợi ích:**
  - Giảm tỷ lệ phế phẩm 30-50%
  - Tiết kiệm chi phí kiểm tra
  - Cải thiện chất lượng liên tục
  - Đáp ứng tiêu chuẩn ISO/IATF

**Hình ảnh:** Biểu đồ Control Chart minh họa

---

### SLIDE 5: CPK LÀ GÌ?
**Tiêu đề:** Process Capability Index - Chỉ số Năng lực Quy trình

**Nội dung:**
- **Công thức:** CPK = min[(USL - Mean)/(3σ), (Mean - LSL)/(3σ)]
- **Ý nghĩa các mức CPK:**
  | CPK | Đánh giá | Tỷ lệ lỗi |
  |-----|----------|-----------|
  | < 1.0 | Không đạt | > 2,700 ppm |
  | 1.0 - 1.33 | Chấp nhận | 64 - 2,700 ppm |
  | 1.33 - 1.67 | Tốt | 0.6 - 64 ppm |
  | > 1.67 | Xuất sắc | < 0.6 ppm |

**Lưu ý:** CPK ≥ 1.33 là yêu cầu tối thiểu trong ngành ô tô (IATF 16949)

---

### SLIDE 6: 8 QUY TẮC SPC (WESTERN ELECTRIC RULES)
**Tiêu đề:** 8 Quy tắc Phát hiện Biến động Bất thường

**Nội dung:**
1. **Rule 1:** 1 điểm vượt ngoài ±3σ
2. **Rule 2:** 9 điểm liên tiếp cùng phía Mean
3. **Rule 3:** 6 điểm liên tiếp tăng/giảm
4. **Rule 4:** 14 điểm liên tiếp dao động lên xuống
5. **Rule 5:** 2/3 điểm liên tiếp vượt ±2σ (cùng phía)
6. **Rule 6:** 4/5 điểm liên tiếp vượt ±1σ (cùng phía)
7. **Rule 7:** 15 điểm liên tiếp trong ±1σ
8. **Rule 8:** 8 điểm liên tiếp vượt ±1σ (cả 2 phía)

**Hình ảnh:** Minh họa từng rule trên Control Chart

---

## PHẦN 2: TỔNG QUAN HỆ THỐNG (15 phút)

### SLIDE 7: KIẾN TRÚC HỆ THỐNG
**Tiêu đề:** Tổng quan Kiến trúc Hệ thống SPC/CPK Calculator

**Nội dung:**
```
┌─────────────────────────────────────────────────────────────┐
│                    NGƯỜI DÙNG                                │
│  (Operator, QC, Supervisor, Manager, Admin)                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                 WEB APPLICATION                              │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │Dashboard│ │Phân tích│ │Kế hoạch │ │Báo cáo  │           │
│  │Realtime │ │SPC/CPK  │ │SPC Plan │ │Export   │           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   DATABASE                                   │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐                       │
│  │Machine  │ │SPC Data │ │Config   │                       │
│  │Database │ │History  │ │Settings │                       │
│  └─────────┘ └─────────┘ └─────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

---

### SLIDE 8: CÁC MODULE CHÍNH
**Tiêu đề:** 6 Module Chính của Hệ thống

**Nội dung:**
1. **SPC/CPK Analysis** - Phân tích dữ liệu kiểm tra và tính toán CPK
2. **Dashboard Realtime** - Giám sát dây chuyền theo thời gian thực
3. **SPC Plan Management** - Quản lý kế hoạch lấy mẫu SPC
4. **OEE/MMS** - Quản lý hiệu suất thiết bị và bảo trì
5. **Reports & Export** - Xuất báo cáo PDF/Excel
6. **Alert & Notification** - Cảnh báo tự động qua Email/SMS

---

### SLIDE 9: DEMO - ĐĂNG NHẬP VÀ GIAO DIỆN
**Tiêu đề:** Demo: Đăng nhập và Làm quen Giao diện

**Nội dung demo:**
1. Truy cập hệ thống qua URL
2. Đăng nhập với tài khoản được cấp
3. Giới thiệu menu sidebar:
   - Dashboard (Bảng điều khiển)
   - SPC (Phân tích SPC/CPK)
   - MMS (Quản lý bảo trì)
   - Production (Sản xuất)
   - System (Cài đặt hệ thống)
4. Giới thiệu Quick Access và phím tắt

**Video script:** Quay màn hình demo 3-5 phút

---

## PHẦN 3: PHÂN TÍCH SPC/CPK (20 phút)

### SLIDE 10: THỰC HÀNH - PHÂN TÍCH SPC/CPK
**Tiêu đề:** Thực hành: Phân tích SPC/CPK từ dữ liệu thực

**Các bước thực hiện:**
1. Vào menu **SPC → Phân tích SPC/CPK**
2. Chọn **Sản phẩm** từ dropdown (VD: PCB-001)
3. Chọn **Công trạm** (VD: Solder Paste Printing)
4. Chọn **Khoảng thời gian** (7 ngày gần nhất)
5. Nhấn **Phân tích**
6. Xem kết quả:
   - Biểu đồ X-bar Chart
   - Biểu đồ R Chart
   - Histogram phân bố
   - Bảng thống kê CPK/Cp/Pp/Ppk

---

### SLIDE 11: ĐỌC HIỂU KẾT QUẢ PHÂN TÍCH
**Tiêu đề:** Cách Đọc Hiểu Kết quả Phân tích SPC

**Nội dung:**
| Chỉ số | Ý nghĩa | Giá trị tốt |
|--------|---------|-------------|
| **Mean** | Giá trị trung bình | Gần Target |
| **Std Dev** | Độ lệch chuẩn | Càng nhỏ càng tốt |
| **Cp** | Năng lực tiềm năng | ≥ 1.33 |
| **Cpk** | Năng lực thực tế | ≥ 1.33 |
| **Pp** | Hiệu suất tiềm năng | ≥ 1.33 |
| **Ppk** | Hiệu suất thực tế | ≥ 1.33 |
| **Ca** | Độ chính xác | ≤ 12.5% |

**Lưu ý:** Điểm màu đỏ = Vi phạm SPC Rules hoặc ngoài USL/LSL

---

### SLIDE 12: BÀI TẬP THỰC HÀNH 1
**Tiêu đề:** Bài tập: Phân tích CPK cho sản phẩm IC-001

**Yêu cầu:**
1. Chọn sản phẩm **IC-001**
2. Chọn công trạm **Pick and Place**
3. Phân tích dữ liệu **14 ngày** gần nhất
4. Trả lời các câu hỏi:
   - CPK hiện tại là bao nhiêu?
   - Có điểm nào vi phạm SPC Rules không?
   - Quy trình có đạt yêu cầu không? (CPK ≥ 1.33)

**Thời gian:** 5 phút

---

### SLIDE 13: XUẤT BÁO CÁO SPC
**Tiêu đề:** Xuất Báo cáo SPC/CPK

**Các bước thực hiện:**
1. Sau khi phân tích, nhấn nút **Xuất PDF** hoặc **Xuất Excel**
2. Báo cáo PDF bao gồm:
   - Thông tin sản phẩm, công trạm, thời gian
   - Bảng thống kê CPK/Cp/Pp/Ppk
   - Biểu đồ Control Chart
   - Danh sách vi phạm SPC Rules
   - Khuyến nghị cải tiến (AI)
3. Báo cáo Excel bao gồm:
   - Sheet Summary: Tổng hợp
   - Sheet Data: Dữ liệu chi tiết
   - Sheet Violations: Danh sách vi phạm

---

## PHẦN 4: QUẢN LÝ KẾ HOẠCH SPC (20 phút)

### SLIDE 14: KẾ HOẠCH LẤY MẪU SPC
**Tiêu đề:** Tạo và Quản lý Kế hoạch Lấy mẫu SPC

**Khái niệm:**
- **SPC Plan** = Kế hoạch tự động thu thập và phân tích dữ liệu SPC
- **Lợi ích:**
  - Tự động hóa quy trình kiểm tra
  - Giám sát liên tục 24/7
  - Phát hiện sớm biến động
  - Giảm công sức thủ công

---

### SLIDE 15: THỰC HÀNH - TẠO KẾ HOẠCH SPC
**Tiêu đề:** Thực hành: Tạo Kế hoạch SPC mới

**Các bước thực hiện:**
1. Vào menu **SPC → Kế hoạch SPC**
2. Nhấn **Tạo mới**
3. Điền thông tin:
   - **Tên kế hoạch:** VD: "SPC Line 01 - PCB-001"
   - **Dây chuyền:** Chọn LINE 01
   - **Sản phẩm:** Chọn PCB-001
   - **Công trạm:** Chọn Solder Paste Printing
   - **Máy:** Chọn máy cụ thể
   - **Fixture:** Chọn fixture (nếu có)
   - **Phương pháp lấy mẫu:** Chọn tần suất
   - **Thời gian bắt đầu/kết thúc**
4. Cấu hình **SPC Rules** cần áp dụng
5. Nhấn **Lưu**

---

### SLIDE 16: CẤU HÌNH SPC RULES
**Tiêu đề:** Cấu hình SPC Rules cho Kế hoạch

**Nội dung:**
- Mặc định: Tất cả 8 SPC Rules được bật
- Có thể tùy chỉnh bật/tắt từng rule
- Cấu hình ngưỡng CPK cảnh báo:
  - **CPK Warning:** < 1.33 (cảnh báo vàng)
  - **CPK Critical:** < 1.0 (cảnh báo đỏ)
- Cấu hình email nhận thông báo

**Lưu ý:** Nên giữ nguyên 8 rules mặc định cho lần đầu

---

### SLIDE 17: BÀI TẬP THỰC HÀNH 2
**Tiêu đề:** Bài tập: Tạo Kế hoạch SPC cho dây chuyền

**Yêu cầu:**
1. Tạo kế hoạch SPC mới với thông tin:
   - Tên: "[Tên bạn] - SPC Plan Test"
   - Dây chuyền: LINE 01
   - Sản phẩm: CAP-001
   - Công trạm: Reflow Oven
   - Lấy mẫu: Mỗi 30 phút
2. Bật tất cả 8 SPC Rules
3. Đặt ngưỡng CPK Warning = 1.33
4. Lưu và kích hoạt kế hoạch

**Thời gian:** 5 phút

---

## PHẦN 5: DASHBOARD & BÁO CÁO (20 phút)

### SLIDE 18: DASHBOARD REALTIME
**Tiêu đề:** Giám sát Dây chuyền Realtime

**Nội dung:**
- **Dashboard chính:** Hiển thị tổng quan tất cả dây chuyền
- **Thông tin hiển thị:**
  - Trạng thái dây chuyền (Running/Stopped)
  - CPK hiện tại với màu sắc (Xanh/Vàng/Đỏ)
  - Biểu đồ mini (Sparkline) xu hướng CPK
  - Số lượng vi phạm SPC Rules
- **Tùy chỉnh:** Chọn dây chuyền cần theo dõi

---

### SLIDE 19: THỰC HÀNH - TÙY CHỈNH DASHBOARD
**Tiêu đề:** Thực hành: Tùy chỉnh Dashboard cá nhân

**Các bước thực hiện:**
1. Vào **Dashboard → Bảng điều khiển**
2. Nhấn nút **Tùy chỉnh** (góc phải)
3. Chọn các widget muốn hiển thị:
   - ☑ Tổng quan SPC
   - ☑ Cảnh báo CPK
   - ☑ Biểu đồ xu hướng
   - ☐ OEE Dashboard
   - ☐ Bảo trì
4. Kéo thả sắp xếp vị trí widget
5. Nhấn **Lưu cấu hình**

---

### SLIDE 20: BÁO CÁO TỔNG HỢP
**Tiêu đề:** Báo cáo Tổng hợp SPC theo Ca/Ngày/Tuần

**Nội dung:**
1. Vào menu **SPC → Báo cáo SPC**
2. Chọn bộ lọc:
   - Khoảng thời gian: 7/14/30/90 ngày
   - Ca làm việc: Sáng/Chiều/Đêm/Tất cả
   - Dây chuyền: Chọn hoặc tất cả
3. Xem các biểu đồ:
   - **Trend CPK:** Xu hướng CPK theo ngày
   - **So sánh Ca:** CPK trung bình theo ca
   - **Phân bố:** Tỷ lệ đạt/không đạt
4. Xuất báo cáo PDF/Excel

---

### SLIDE 21: BÀI TẬP THỰC HÀNH 3
**Tiêu đề:** Bài tập: Tạo Báo cáo Tổng hợp

**Yêu cầu:**
1. Vào trang **Báo cáo SPC**
2. Chọn khoảng thời gian **30 ngày**
3. Chọn ca **Sáng (6:00-14:00)**
4. Trả lời câu hỏi:
   - CPK trung bình ca sáng là bao nhiêu?
   - Ngày nào có CPK thấp nhất?
   - Có bao nhiêu % mẫu đạt CPK ≥ 1.33?
5. Xuất báo cáo PDF

**Thời gian:** 5 phút

---

## PHẦN 6: CẢNH BÁO & THÔNG BÁO (15 phút)

### SLIDE 22: HỆ THỐNG CẢNH BÁO
**Tiêu đề:** Hệ thống Cảnh báo Tự động

**Các loại cảnh báo:**
| Loại | Điều kiện | Hành động |
|------|-----------|-----------|
| **CPK Warning** | CPK < 1.33 | Email + Toast |
| **CPK Critical** | CPK < 1.0 | Email + SMS + Escalation |
| **SPC Violation** | Vi phạm 8 Rules | Email + Dashboard |
| **OEE Low** | OEE < 85% | Email + Notification |

**Kênh thông báo:**
- Email (SMTP)
- SMS (Twilio)
- Push Notification
- Webhook (Slack/Teams)

---

### SLIDE 23: CẤU HÌNH CẢNH BÁO
**Tiêu đề:** Cấu hình Nhận Cảnh báo

**Các bước thực hiện:**
1. Vào **System → Cài đặt Thông báo**
2. Cấu hình email nhận thông báo
3. Chọn loại cảnh báo muốn nhận:
   - ☑ CPK Warning
   - ☑ CPK Critical
   - ☑ SPC Violation
   - ☐ OEE Alert
4. Cấu hình escalation (nếu cần)
5. Test gửi thông báo

---

### SLIDE 24: DEMO - CẢNH BÁO REALTIME
**Tiêu đề:** Demo: Cảnh báo Realtime khi CPK giảm

**Nội dung demo:**
1. Mô phỏng dữ liệu CPK giảm xuống < 1.33
2. Hệ thống tự động phát hiện
3. Hiển thị toast notification trên Dashboard
4. Gửi email cảnh báo
5. Ghi nhận vào lịch sử cảnh báo

**Video script:** Quay màn hình demo 2-3 phút

---

## PHẦN 7: TỔNG KẾT & HỎI ĐÁP (5 phút)

### SLIDE 25: TỔNG KẾT
**Tiêu đề:** Tổng kết Khóa Training

**Những gì đã học:**
1. ✅ Khái niệm SPC/CPK và 8 SPC Rules
2. ✅ Phân tích dữ liệu SPC/CPK
3. ✅ Tạo và quản lý Kế hoạch SPC
4. ✅ Tùy chỉnh Dashboard cá nhân
5. ✅ Xuất báo cáo PDF/Excel
6. ✅ Cấu hình cảnh báo tự động

**Tài liệu tham khảo:**
- Hướng dẫn sử dụng (User Guide)
- FAQ - Câu hỏi thường gặp
- Video tutorials

---

### SLIDE 26: HỎI ĐÁP
**Tiêu đề:** Hỏi & Đáp

**Nội dung:**
- Thời gian: 5 phút
- Mọi câu hỏi đều được chào đón
- Liên hệ hỗ trợ sau training:
  - Email: support@foutec.com
  - Hotline: 1900-xxxx

---

### SLIDE 27: CẢM ƠN
**Tiêu đề:** Cảm ơn đã tham gia Training!

**Nội dung:**
- Chúc các bạn áp dụng thành công hệ thống SPC/CPK
- Đừng ngại liên hệ khi cần hỗ trợ
- Hẹn gặp lại trong các khóa training nâng cao!

**Logo:** Foutec Digital

---

## PHỤ LỤC: PHÍM TẮT HỮU ÍCH

| Phím tắt | Chức năng |
|----------|-----------|
| Ctrl + D | Mở Dashboard |
| Ctrl + A | Mở Phân tích SPC |
| Ctrl + E | Xuất báo cáo |
| Ctrl + K | Tìm kiếm nhanh |
| Ctrl + / | Hiển thị phím tắt |
| Ctrl + 1-9 | Quick Access |

---

## THÔNG TIN LIÊN HỆ

**Foutec Digital**
- Website: https://foutec.com
- Email: support@foutec.com
- Hotline: 1900-xxxx
- Địa chỉ: [Địa chỉ công ty]
