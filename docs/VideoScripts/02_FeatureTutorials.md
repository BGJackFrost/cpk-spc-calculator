# Video Scripts: Hướng Dẫn Chi Tiết Từng Tính Năng

## Danh Sách Video

| # | Tiêu đề | Thời lượng | Module |
|---|--------|------------|--------|
| 2.1 | Tính Toán CPK | 8-10 phút | SPC/CPK |
| 2.2 | Biểu Đồ Kiểm Soát | 6-8 phút | SPC/CPK |
| 2.3 | Theo Dõi OEE | 8-10 phút | OEE |
| 2.4 | Quản Lý Work Order | 6-8 phút | MMS |
| 2.5 | Xuất Báo Cáo | 5-7 phút | Reports |

---

## Video 2.1: Tính Toán CPK

### Thông Tin Video

| Thông tin | Chi tiết |
|-----------|----------|
| **Tiêu đề** | Hướng Dẫn Tính Toán CPK |
| **Thời lượng** | 8-10 phút |
| **Đối tượng** | QC Engineer, Operator |
| **Mục tiêu** | Biết cách nhập dữ liệu và tính CPK |

### Script

#### Mở đầu (0:00 - 0:30)

**NARRATOR:**
> "Trong video này, chúng ta sẽ học cách tính toán chỉ số CPK - một trong những chỉ số quan trọng nhất để đánh giá năng lực quy trình sản xuất."

#### Phần 1: Giới thiệu CPK (0:30 - 2:00)

**[SCENE: Slide giải thích CPK]**

**NARRATOR:**
> "CPK - Process Capability Index - là chỉ số đo lường khả năng của quy trình trong việc sản xuất sản phẩm nằm trong giới hạn kỹ thuật."

> "CPK được tính theo công thức: CPK bằng giá trị nhỏ hơn giữa USL trừ Mean chia 3 sigma, và Mean trừ LSL chia 3 sigma."

**[SCENE: Bảng đánh giá CPK]**

**NARRATOR:**
> "CPK từ 1.33 trở lên được coi là tốt. CPK dưới 1.0 cho thấy quy trình không đạt yêu cầu."

#### Phần 2: Nhập dữ liệu (2:00 - 4:00)

**[SCENE: Màn hình nhập dữ liệu]**

**NARRATOR:**
> "Để tính CPK, trước tiên bạn cần nhập dữ liệu đo lường. Có 3 cách nhập:"

**[SCENE: Demo nhập thủ công]**

**NARRATOR:**
> "Cách 1: Nhập thủ công từng giá trị. Click vào ô nhập liệu và gõ giá trị đo được."

**[SCENE: Demo import Excel]**

**NARRATOR:**
> "Cách 2: Import từ file Excel. Click nút Import, chọn file Excel đã chuẩn bị theo template."

**[SCENE: Demo kết nối IoT]**

**NARRATOR:**
> "Cách 3: Dữ liệu tự động từ thiết bị IoT. Nếu máy đã được kết nối, dữ liệu sẽ tự động cập nhật."

#### Phần 3: Thiết lập thông số (4:00 - 5:30)

**[SCENE: Form thiết lập]**

**NARRATOR:**
> "Tiếp theo, thiết lập các thông số kỹ thuật:"

> "USL - Upper Specification Limit: Giới hạn kỹ thuật trên"
> "LSL - Lower Specification Limit: Giới hạn kỹ thuật dưới"
> "Target: Giá trị mục tiêu"

**[SCENE: Ví dụ cụ thể]**

**NARRATOR:**
> "Ví dụ: Với sản phẩm có kích thước yêu cầu 10mm ± 0.5mm, USL là 10.5, LSL là 9.5, Target là 10."

#### Phần 4: Xem kết quả (5:30 - 7:30)

**[SCENE: Kết quả tính toán]**

**NARRATOR:**
> "Sau khi nhập đủ dữ liệu, hệ thống tự động tính toán và hiển thị kết quả."

**[SCENE: Highlight các chỉ số]**

**NARRATOR:**
> "Bạn sẽ thấy các chỉ số: CPK, Cp, Ppk, Pp, Mean, và Standard Deviation."

**[SCENE: Biểu đồ phân phối]**

**NARRATOR:**
> "Biểu đồ histogram cho thấy phân phối dữ liệu so với giới hạn kỹ thuật."

**[SCENE: Biểu đồ xu hướng]**

**NARRATOR:**
> "Biểu đồ xu hướng cho thấy CPK thay đổi theo thời gian."

#### Kết thúc (7:30 - 8:00)

**NARRATOR:**
> "Vậy là bạn đã biết cách tính CPK trong hệ thống. Hãy thực hành với dữ liệu thực tế của bạn."

---

## Video 2.2: Biểu Đồ Kiểm Soát

### Script Tóm Tắt

#### Nội dung chính:
1. Giới thiệu các loại biểu đồ kiểm soát (X-bar R, X-bar S, I-MR, p, np, c, u)
2. Cách đọc biểu đồ (UCL, CL, LCL)
3. Nhận biết các pattern bất thường
4. Cách tạo và tùy chỉnh biểu đồ trong hệ thống

#### Các điểm demo:
- Chọn loại biểu đồ phù hợp
- Thiết lập subgroup size
- Zoom và pan trên biểu đồ
- Export biểu đồ

---

## Video 2.3: Theo Dõi OEE

### Script Tóm Tắt

#### Nội dung chính:
1. Công thức OEE (A × P × Q)
2. Cách nhập dữ liệu OEE
3. Dashboard OEE
4. Phân tích Six Big Losses
5. So sánh OEE giữa các máy

#### Các điểm demo:
- Xem OEE realtime
- Drill-down vào từng thành phần
- Tạo báo cáo OEE
- Thiết lập mục tiêu OEE

---

## Video 2.4: Quản Lý Work Order

### Script Tóm Tắt

#### Nội dung chính:
1. Các loại Work Order (CM, PM, PdM, EM)
2. Tạo Work Order mới
3. Quy trình xử lý Work Order
4. Theo dõi tiến độ
5. Báo cáo bảo trì

#### Các điểm demo:
- Tạo Work Order từ alarm
- Phân công kỹ thuật viên
- Cập nhật trạng thái
- Xem biểu đồ Gantt

---

## Video 2.5: Xuất Báo Cáo

### Script Tóm Tắt

#### Nội dung chính:
1. Các loại báo cáo có sẵn
2. Tạo báo cáo nhanh
3. Tùy chỉnh nội dung báo cáo
4. Lên lịch báo cáo tự động
5. Quản lý danh sách người nhận

#### Các điểm demo:
- Chọn loại và định dạng báo cáo
- Preview trước khi xuất
- Thiết lập scheduled report
- Xem lịch sử báo cáo

---

## Ghi Chú Sản Xuất Chung

### Cấu Trúc Mỗi Video
1. Intro (15-30 giây)
2. Mục tiêu video (15 giây)
3. Nội dung chính (phần lớn thời lượng)
4. Tóm tắt (30 giây)
5. Call to action + Outro (15 giây)

### Yêu Cầu Kỹ Thuật
- Độ phân giải: 1920x1080 (Full HD)
- Frame rate: 30fps
- Audio: Stereo, 48kHz
- Format: MP4 (H.264)

### Accessibility
- Phụ đề tiếng Việt
- Mô tả audio cho người khiếm thị
- Transcript đầy đủ

---

*Phiên bản: 1.0*
*Ngày tạo: Tháng 12/2024*
