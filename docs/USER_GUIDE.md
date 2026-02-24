# Hướng dẫn Sử dụng Hệ thống SPC/CPK Calculator

**Phiên bản:** 2.0  
**Ngày cập nhật:** 15/12/2024  
**Tác giả:** Manus AI

---

## Mục lục

1. [Giới thiệu Hệ thống](#1-giới-thiệu-hệ-thống)
2. [Đăng nhập và Giao diện Chính](#2-đăng-nhập-và-giao-diện-chính)
3. [Dashboard - Tổng quan Hệ thống](#3-dashboard---tổng-quan-hệ-thống)
4. [Phân tích SPC/CPK](#4-phân-tích-spccpk)
5. [Quản lý Chất lượng](#5-quản-lý-chất-lượng)
6. [Quản lý Sản xuất](#6-quản-lý-sản-xuất)
7. [Dữ liệu Chủ (Master Data)](#7-dữ-liệu-chủ-master-data)
8. [Quản lý Người dùng và Phân quyền](#8-quản-lý-người-dùng-và-phân-quyền)
9. [Cài đặt Hệ thống](#9-cài-đặt-hệ-thống)
10. [Phụ lục - Thuật ngữ SPC](#10-phụ-lục---thuật-ngữ-spc)

---

## 1. Giới thiệu Hệ thống

### 1.1 Mục đích

Hệ thống **SPC/CPK Calculator** là công cụ phân tích kiểm soát chất lượng thống kê (Statistical Process Control) dành cho ngành sản xuất linh kiện điện tử. Hệ thống giúp doanh nghiệp theo dõi, phân tích và cải tiến quy trình sản xuất thông qua các chỉ số thống kê như CPK, CP, PP, PPK, và các quy tắc kiểm soát Western Electric.

### 1.2 Đối tượng Sử dụng

Hệ thống được thiết kế cho các nhóm người dùng sau:

| Vai trò | Chức năng chính |
|---------|-----------------|
| **Quản lý Chất lượng (QC Manager)** | Theo dõi chỉ số CPK, phân tích xu hướng, lập báo cáo |
| **Kỹ sư Quy trình (Process Engineer)** | Phân tích SPC, phát hiện vi phạm, cải tiến quy trình |
| **Quản đốc Sản xuất (Production Supervisor)** | Giám sát realtime, nhận cảnh báo, điều chỉnh sản xuất |
| **Quản trị Hệ thống (Admin)** | Cấu hình hệ thống, quản lý người dùng, phân quyền |

### 1.3 Tính năng Chính

Hệ thống cung cấp các nhóm tính năng sau:

**Phân tích SPC/CPK:** Tính toán đầy đủ các chỉ số thống kê bao gồm Mean, Standard Deviation, CP, CPK, PP, PPK, Ca (Capability Accuracy). Hệ thống hỗ trợ nhiều phương pháp lấy mẫu từ theo giây đến theo năm, với khả năng tùy chỉnh tần suất lấy mẫu linh hoạt.

**Biểu đồ Kiểm soát:** Hiển thị trực quan dữ liệu qua các biểu đồ X-bar Chart, R Chart, và Histogram. Các điểm vi phạm được đánh dấu màu đỏ với tooltip giải thích chi tiết lý do vi phạm.

**8 SPC Rules (Western Electric Rules):** Tự động phát hiện các vi phạm theo 8 quy tắc kiểm soát thống kê tiêu chuẩn, bao gồm phát hiện điểm ngoài giới hạn, xu hướng liên tục, và các mẫu bất thường.

**Dashboard Realtime:** Theo dõi nhiều dây chuyền sản xuất đồng thời với cập nhật dữ liệu realtime qua Server-Sent Events (SSE). Hiển thị biểu đồ sparkline thu nhỏ cho từng dây chuyền.

**Thông báo Tự động:** Gửi email và webhook khi phát hiện vi phạm SPC Rules hoặc CPK dưới ngưỡng cho phép. Hỗ trợ tích hợp với Slack, Microsoft Teams, và các hệ thống bên ngoài.

**Xuất Báo cáo:** Xuất kết quả phân tích ra file PDF và Excel với định dạng chuyên nghiệp, bao gồm biểu đồ và bảng thống kê chi tiết.

---

## 2. Đăng nhập và Giao diện Chính

### 2.1 Đăng nhập Hệ thống

Hệ thống hỗ trợ hai phương thức đăng nhập:

**Đăng nhập qua Manus OAuth:** Đây là phương thức đăng nhập chính, sử dụng tài khoản Manus để xác thực. Người dùng nhấn nút "Đăng nhập với Manus" trên trang chủ và sẽ được chuyển hướng đến trang đăng nhập Manus. Sau khi xác thực thành công, hệ thống tự động tạo tài khoản và chuyển đến Dashboard.

**Đăng nhập Local:** Dành cho môi trường không có kết nối internet hoặc cần tài khoản riêng biệt. Truy cập đường dẫn `/local-login` để sử dụng tài khoản local với username và password.

### 2.2 Giao diện Chính

Sau khi đăng nhập, người dùng được đưa đến giao diện Dashboard với cấu trúc như sau:

**Thanh bên trái (Sidebar):** Chứa menu điều hướng được tổ chức theo nhóm chức năng. Các nhóm bao gồm Tổng quan, Phân tích, Chất lượng, Sản xuất, Dữ liệu chủ, Người dùng, và Hệ thống. Người dùng có thể thu gọn hoặc mở rộng sidebar bằng nút toggle ở góc trên.

**Vùng nội dung chính:** Hiển thị nội dung của trang đang được chọn. Vùng này chiếm phần lớn màn hình và có thanh cuộn riêng khi nội dung dài.

**Thanh header:** Chứa thông tin người dùng đang đăng nhập, nút thông báo, và các tùy chọn nhanh như chuyển đổi ngôn ngữ (Tiếng Việt/English) và chế độ sáng/tối.

### 2.3 Hướng dẫn Sử dụng Lần đầu

Khi đăng nhập lần đầu, hệ thống sẽ hiển thị Guided Tour hướng dẫn các chức năng chính. Tour này bao gồm 7 bước giới thiệu các vùng quan trọng trên Dashboard. Người dùng có thể bỏ qua tour hoặc xem lại bất kỳ lúc nào bằng cách nhấn nút "Hướng dẫn" trên Dashboard.

---

## 3. Dashboard - Tổng quan Hệ thống

### 3.1 Các Widget Thống kê

Dashboard hiển thị các widget thống kê quan trọng ở phần đầu trang:

| Widget | Mô tả |
|--------|-------|
| **Mapping Config** | Số lượng cấu hình mapping sản phẩm-công trạm đang hoạt động |
| **Recent Analysis** | Số lần phân tích SPC/CPK trong 30 ngày qua |
| **CPK Alerts** | Số cảnh báo CPK cần xem xét (CPK < 1.33) |
| **System Status** | Trạng thái tổng quan hệ thống (Good/Warning) |

Người dùng có thể tùy chỉnh hiển thị các widget bằng cách nhấn nút "Customize" ở góc phải và chọn/bỏ chọn các widget mong muốn.

### 3.2 Quick Actions

Phần Quick Actions cung cấp các lối tắt đến các chức năng thường dùng:

**Analyze SPC/CPK:** Chuyển đến trang phân tích SPC/CPK để thực hiện phân tích mới.

**Analysis History:** Xem lịch sử các phân tích đã thực hiện trước đó.

**Manage Mappings:** Quản lý cấu hình mapping giữa sản phẩm, công trạm và bảng dữ liệu.

**System Settings:** Truy cập cài đặt hệ thống và kết nối database.

### 3.3 System Status

Phần System Status hiển thị trạng thái các thành phần quan trọng:

**License Status:** Hiển thị thông tin license đang sử dụng, ngày hết hạn, và các tính năng được kích hoạt.

**Webhook Retry:** Hiển thị số webhook đang chờ gửi lại do lỗi trước đó, với nút retry thủ công.

**Validation Rules:** Hiển thị số quy tắc kiểm tra tùy chỉnh đang hoạt động và biểu đồ sparkline xu hướng vi phạm 7 ngày qua.

### 3.4 Recent Analyses

Bảng Recent Analyses hiển thị 10 phân tích gần nhất với các thông tin:

| Cột | Mô tả |
|-----|-------|
| **Sản phẩm** | Mã và tên sản phẩm được phân tích |
| **Công trạm** | Tên công trạm sản xuất |
| **CPK** | Giá trị CPK với màu sắc theo ngưỡng (xanh ≥1.33, vàng ≥1.0, đỏ <1.0) |
| **Samples** | Số lượng mẫu trong phân tích |
| **Thời gian** | Thời điểm thực hiện phân tích |

Nhấn vào bất kỳ dòng nào để xem chi tiết phân tích đó.

---

## 4. Phân tích SPC/CPK

### 4.1 Trang Phân tích SPC/CPK

Truy cập menu **Phân tích > SPC/CPK Analysis** để thực hiện phân tích mới. Trang này cho phép người dùng chọn dữ liệu và xem kết quả phân tích chi tiết.

#### 4.1.1 Chọn Dữ liệu Phân tích

Quy trình chọn dữ liệu theo thứ tự:

**Bước 1 - Chọn Sản phẩm:** Chọn sản phẩm cần phân tích từ danh sách dropdown. Danh sách hiển thị mã sản phẩm và tên sản phẩm.

**Bước 2 - Chọn Công trạm:** Sau khi chọn sản phẩm, danh sách công trạm sẽ được lọc theo sản phẩm đã chọn. Chọn công trạm cần phân tích.

**Bước 3 - Chọn Khoảng thời gian:** Chọn khoảng thời gian lấy dữ liệu. Có thể chọn nhanh (7 ngày, 14 ngày, 30 ngày, 90 ngày) hoặc chọn ngày bắt đầu và kết thúc cụ thể.

**Bước 4 - Chọn Mapping (tùy chọn):** Nếu có nhiều cấu hình mapping cho cùng sản phẩm-công trạm, chọn mapping cần sử dụng. Nếu chỉ có một mapping, hệ thống tự động chọn.

**Bước 5 - Nhấn "Phân tích":** Hệ thống sẽ truy vấn dữ liệu từ database ngoài theo cấu hình mapping và thực hiện tính toán SPC/CPK.

#### 4.1.2 Các Chế độ Phân tích

Hệ thống hỗ trợ ba chế độ phân tích:

**Từ Mapping:** Lấy dữ liệu từ database ngoài theo cấu hình mapping đã thiết lập. Đây là chế độ mặc định và phổ biến nhất.

**Từ SPC Plan:** Lấy dữ liệu từ kế hoạch SPC đã có. Chế độ này sử dụng dữ liệu đã được thu thập tự động theo kế hoạch.

**Nhập thủ công:** Cho phép người dùng nhập trực tiếp dữ liệu đo lường. Phù hợp khi cần phân tích nhanh một tập dữ liệu nhỏ.

### 4.2 Kết quả Phân tích

#### 4.2.1 Bảng Thống kê

Sau khi phân tích, hệ thống hiển thị bảng thống kê với các chỉ số:

| Chỉ số | Mô tả | Công thức |
|--------|-------|-----------|
| **Mean (X̄)** | Giá trị trung bình | Σx / n |
| **Std Dev (σ)** | Độ lệch chuẩn | √[Σ(x-X̄)² / (n-1)] |
| **CP** | Chỉ số năng lực quy trình | (USL - LSL) / 6σ |
| **CPK** | Chỉ số năng lực quy trình thực tế | Min[(USL - X̄) / 3σ, (X̄ - LSL) / 3σ] |
| **PP** | Chỉ số hiệu suất quy trình | (USL - LSL) / 6s |
| **PPK** | Chỉ số hiệu suất quy trình thực tế | Min[(USL - X̄) / 3s, (X̄ - LSL) / 3s] |
| **Ca** | Độ chính xác năng lực | (X̄ - Target) / [(USL - LSL) / 2] |
| **UCL** | Giới hạn kiểm soát trên | X̄ + A₂R̄ |
| **LCL** | Giới hạn kiểm soát dưới | X̄ - A₂R̄ |

#### 4.2.2 Đánh giá CPK

Hệ thống đánh giá CPK theo các ngưỡng tiêu chuẩn:

| Giá trị CPK | Đánh giá | Màu sắc |
|-------------|----------|---------|
| CPK ≥ 1.67 | Xuất sắc (Excellent) | Xanh đậm |
| 1.33 ≤ CPK < 1.67 | Tốt (Good) | Xanh lá |
| 1.00 ≤ CPK < 1.33 | Chấp nhận được (Acceptable) | Vàng |
| 0.67 ≤ CPK < 1.00 | Kém (Poor) | Cam |
| CPK < 0.67 | Rất kém (Very Poor) | Đỏ |

#### 4.2.3 Biểu đồ Control Chart

Hệ thống hiển thị các biểu đồ kiểm soát:

**X-bar Chart:** Biểu đồ giá trị trung bình theo thời gian. Đường trung tâm (CL) là giá trị trung bình tổng thể. Các đường UCL và LCL thể hiện giới hạn kiểm soát ±3σ. Các điểm vi phạm được đánh dấu màu đỏ.

**R Chart:** Biểu đồ phạm vi (Range) theo thời gian. Thể hiện độ biến động giữa các mẫu trong cùng nhóm.

**Histogram:** Biểu đồ phân bố tần suất của dữ liệu. Đường cong phân phối chuẩn được vẽ chồng lên để so sánh. Các đường USL và LSL được đánh dấu.

#### 4.2.4 Phát hiện Vi phạm SPC Rules

Hệ thống tự động phát hiện vi phạm theo 8 SPC Rules (Western Electric Rules):

| Rule | Mô tả | Điều kiện |
|------|-------|-----------|
| **Rule 1** | Điểm ngoài giới hạn | 1 điểm > UCL hoặc < LCL |
| **Rule 2** | Xu hướng liên tục | 7 điểm liên tiếp tăng hoặc giảm |
| **Rule 3** | Chuỗi một phía | 9 điểm liên tiếp cùng phía với CL |
| **Rule 4** | Dao động lớn | 2/3 điểm liên tiếp > 2σ cùng phía |
| **Rule 5** | Dao động nhỏ | 4/5 điểm liên tiếp > 1σ cùng phía |
| **Rule 6** | Stratification | 15 điểm liên tiếp trong ±1σ |
| **Rule 7** | Mixture | 8 điểm liên tiếp ngoài ±1σ |
| **Rule 8** | Overcontrol | 14 điểm liên tiếp dao động xen kẽ |

Các điểm vi phạm được đánh dấu màu đỏ trên biểu đồ. Di chuột vào điểm để xem tooltip chi tiết lý do vi phạm.

### 4.3 Phân tích Đa đối tượng

Truy cập menu **Phân tích > Multi-Object Analysis** để so sánh nhiều sản phẩm, công trạm, hoặc fixture cùng lúc.

#### 4.3.1 Chọn Đối tượng So sánh

Người dùng có thể chọn tối đa 5 đối tượng để so sánh. Các loại so sánh bao gồm:

**So sánh Sản phẩm:** Chọn nhiều sản phẩm trên cùng một công trạm để so sánh CPK.

**So sánh Công trạm:** Chọn nhiều công trạm cho cùng một sản phẩm để so sánh hiệu suất.

**So sánh Fixture:** Chọn nhiều fixture của cùng một máy để phát hiện fixture có vấn đề.

#### 4.3.2 Kết quả So sánh

Kết quả hiển thị dưới dạng:

**Biểu đồ Bar Chart:** So sánh trực quan CPK giữa các đối tượng.

**Biểu đồ Radar:** Hiển thị đa chiều các chỉ số (CPK, CP, Mean, StdDev).

**Bảng Xếp hạng:** Sắp xếp các đối tượng theo CPK từ cao đến thấp.

**Ma trận Tương quan:** Hiển thị hệ số tương quan giữa các cặp đối tượng.

### 4.4 So sánh Dây chuyền

Truy cập menu **Phân tích > Line Comparison** để so sánh hiệu suất giữa các dây chuyền sản xuất.

Trang này cho phép chọn 2-5 dây chuyền và hiển thị:

**Biểu đồ So sánh CPK:** Bar chart so sánh CPK trung bình của mỗi dây chuyền.

**Biểu đồ Radar:** So sánh đa chiều các chỉ số chất lượng.

**Bảng Chi tiết:** Hiển thị số mẫu, CPK trung bình, tỷ lệ đạt, công trạm tốt nhất/kém nhất.

### 4.5 Lịch sử Phân tích

Truy cập menu **Phân tích > History** để xem lịch sử tất cả các phân tích đã thực hiện.

Bảng lịch sử hiển thị với phân trang, mỗi trang 20 bản ghi. Người dùng có thể lọc theo sản phẩm, công trạm, khoảng thời gian, và trạng thái CPK.

Nhấn vào bất kỳ bản ghi nào để xem lại chi tiết phân tích đó.

### 4.6 Báo cáo SPC

Truy cập menu **Phân tích > SPC Report** để xem báo cáo tổng hợp SPC.

#### 4.6.1 Bộ lọc Báo cáo

**Lọc theo Ca:** Chọn ca làm việc (Sáng 6:00-14:00, Chiều 14:00-22:00, Tối 22:00-6:00, hoặc Tất cả).

**Lọc theo Thời gian:** Chọn khoảng thời gian (7/14/30/90 ngày).

**Lọc theo Dây chuyền:** Chọn dây chuyền cần xem báo cáo.

#### 4.6.2 Nội dung Báo cáo

**Biểu đồ Trend CPK:** Biểu đồ Area Chart thể hiện xu hướng CPK theo thời gian.

**So sánh theo Ca:** Bar Chart so sánh CPK trung bình giữa các ca làm việc.

**Bảng Thống kê:** Tổng số mẫu, CPK trung bình, số vi phạm, tỷ lệ đạt.

---

## 5. Quản lý Chất lượng

### 5.1 Theo dõi Lỗi (Defect Tracking)

Truy cập menu **Chất lượng > Theo dõi Lỗi** để quản lý các lỗi phát hiện trong quá trình sản xuất.

#### 5.1.1 Danh mục Lỗi

Hệ thống phân loại lỗi theo nhóm 5M1E:

| Nhóm | Mô tả | Ví dụ |
|------|-------|-------|
| **Machine** | Lỗi do máy móc | Máy hỏng, calibration sai |
| **Material** | Lỗi do nguyên vật liệu | Vật liệu kém chất lượng |
| **Method** | Lỗi do phương pháp | Quy trình không đúng |
| **Man** | Lỗi do con người | Thao tác sai, thiếu đào tạo |
| **Environment** | Lỗi do môi trường | Nhiệt độ, độ ẩm không phù hợp |
| **Measurement** | Lỗi do đo lường | Thiết bị đo không chính xác |

#### 5.1.2 Ghi nhận Lỗi

Để ghi nhận lỗi mới, nhấn nút "Thêm lỗi" và điền các thông tin:

**Loại lỗi:** Chọn từ danh mục lỗi đã định nghĩa.

**Mức độ nghiêm trọng:** Chọn Low, Medium, High, hoặc Critical.

**Sản phẩm/Công trạm:** Chọn sản phẩm và công trạm liên quan.

**Mô tả chi tiết:** Nhập mô tả chi tiết về lỗi.

**Hành động khắc phục:** Nhập các hành động đã thực hiện hoặc cần thực hiện.

### 5.2 Phân tích Lỗi Pareto

Truy cập menu **Chất lượng > Phân tích Lỗi** để xem biểu đồ Pareto.

#### 5.2.1 Biểu đồ Pareto

Biểu đồ Pareto hiển thị các nguyên nhân lỗi được sắp xếp theo tần suất từ cao đến thấp. Đường tích lũy phần trăm giúp xác định 20% nguyên nhân gây ra 80% lỗi (quy tắc 80/20).

#### 5.2.2 Phân loại ABC

Hệ thống tự động phân loại nguyên nhân lỗi theo nhóm:

**Nhóm A (0-80%):** Các nguyên nhân chính cần ưu tiên giải quyết.

**Nhóm B (80-95%):** Các nguyên nhân phụ cần theo dõi.

**Nhóm C (95-100%):** Các nguyên nhân ít quan trọng.

### 5.3 Cấu hình SPC Rules

Truy cập menu **Chất lượng > Cấu hình SPC Rules** để quản lý các quy tắc kiểm soát.

#### 5.3.1 Bật/Tắt Rules

Mỗi SPC Rule có thể được bật hoặc tắt riêng biệt. Khi tắt một rule, hệ thống sẽ không kiểm tra vi phạm rule đó trong quá trình phân tích.

#### 5.3.2 Tùy chỉnh Ngưỡng

Một số rules cho phép tùy chỉnh ngưỡng. Ví dụ, Rule 2 (xu hướng liên tục) mặc định là 7 điểm, có thể điều chỉnh thành 6 hoặc 8 điểm tùy theo yêu cầu.

### 5.4 Kiểm tra Tùy chỉnh (Validation Rules)

Truy cập menu **Chất lượng > Kiểm tra Tùy chỉnh** để tạo các quy tắc kiểm tra riêng.

#### 5.4.1 Các loại Quy tắc

| Loại | Mô tả | Ví dụ |
|------|-------|-------|
| **Range Check** | Kiểm tra giá trị trong khoảng | Giá trị phải từ 0 đến 100 |
| **Trend Check** | Phát hiện xu hướng | 7 điểm liên tiếp tăng |
| **Pattern Check** | Phát hiện mẫu bất thường | 14 điểm dao động xen kẽ |
| **Comparison Check** | So sánh với giá trị tham chiếu | Giá trị > Mean + 2σ |
| **Formula Check** | Kiểm tra theo công thức | Z-score < 3 |
| **Custom Script** | Script JavaScript tùy chỉnh | Logic phức tạp |

#### 5.4.2 Wizard Tạo Quy tắc

Nhấn nút "Hướng dẫn tạo" để mở wizard 4 bước:

**Bước 1:** Chọn phạm vi áp dụng (sản phẩm, công trạm).

**Bước 2:** Chọn loại quy tắc từ 6 loại có sẵn.

**Bước 3:** Cấu hình thông số và đặt tên quy tắc.

**Bước 4:** Chọn hành động khi vi phạm và xác nhận.

#### 5.4.3 Hành động khi Vi phạm

| Hành động | Mô tả |
|-----------|-------|
| **Warning** | Hiển thị cảnh báo trên giao diện |
| **Alert** | Gửi thông báo qua email/webhook |
| **Reject** | Từ chối dữ liệu, không lưu vào hệ thống |
| **Log Only** | Chỉ ghi log, không hiển thị cảnh báo |

### 5.5 So sánh CPK

Truy cập menu **Chất lượng > So sánh CPK** để xem dashboard so sánh CPK theo nhiều chiều.

Dashboard hiển thị:

**Trend CPK theo thời gian:** Biểu đồ đường thể hiện xu hướng CPK.

**Phân bố CPK:** Histogram phân bố giá trị CPK.

**Top/Bottom 5:** Danh sách 5 sản phẩm/công trạm có CPK cao nhất và thấp nhất.

### 5.6 Phân tích theo Ca

Truy cập menu **Chất lượng > Phân tích theo Ca** để so sánh hiệu suất giữa các ca làm việc.

Biểu đồ hiển thị CPK trung bình của mỗi ca (Sáng, Chiều, Tối) theo từng ngày. Giúp phát hiện ca nào có hiệu suất kém hơn để có biện pháp cải tiến.

---

## 6. Quản lý Sản xuất

### 6.1 Quản lý Dây chuyền

Truy cập menu **Sản xuất > Quản lý Dây chuyền** để quản lý các dây chuyền sản xuất.

#### 6.1.1 Thêm Dây chuyền

Nhấn nút "Thêm dây chuyền" và điền các thông tin:

**Mã dây chuyền:** Mã định danh duy nhất (ví dụ: LINE-001).

**Tên dây chuyền:** Tên mô tả (ví dụ: Dây chuyền SMT 1).

**Sản phẩm:** Chọn sản phẩm mà dây chuyền sản xuất.

**Quy trình:** Chọn mẫu quy trình áp dụng.

**Người phụ trách:** Chọn người quản lý dây chuyền.

**Mô tả:** Thông tin bổ sung về dây chuyền.

#### 6.1.2 Gán Máy vào Dây chuyền

Sau khi tạo dây chuyền, có thể gán các máy cụ thể vào dây chuyền bằng cách nhấn nút "Quản lý máy" và chọn máy từ danh sách.

### 6.2 Quản lý Công trạm

Truy cập menu **Sản xuất > Quản lý Công trạm** để quản lý các công trạm trong dây chuyền.

Mỗi công trạm thuộc về một dây chuyền và có các thông tin:

**Mã công trạm:** Mã định danh duy nhất.

**Tên công trạm:** Tên mô tả.

**Dây chuyền:** Dây chuyền mà công trạm thuộc về.

**Thứ tự:** Vị trí của công trạm trong dây chuyền.

**Cycle Time:** Thời gian chu kỳ (giây).

### 6.3 Quản lý Máy

Truy cập menu **Sản xuất > Quản lý Máy** để quản lý máy móc.

Mỗi máy có các thông tin:

**Mã máy:** Mã định danh duy nhất.

**Tên máy:** Tên mô tả.

**Loại máy:** Chọn từ danh sách loại máy đã định nghĩa.

**Công trạm:** Công trạm mà máy thuộc về.

**Trạng thái:** Active, Maintenance, hoặc Inactive.

### 6.4 Quản lý Loại Máy

Truy cập menu **Sản xuất > Loại Máy** để quản lý các loại máy.

Loại máy giúp phân loại máy theo chức năng:

| Loại | Mô tả |
|------|-------|
| **Assembly** | Máy lắp ráp |
| **Inspection** | Máy kiểm tra |
| **Soldering** | Máy hàn |
| **Printing** | Máy in |
| **Testing** | Máy test |
| **Packaging** | Máy đóng gói |

### 6.5 Quản lý Fixture

Truy cập menu **Sản xuất > Quản lý Fixture** để quản lý fixture của máy.

Fixture là đồ gá gắn vào máy để sản xuất. Mỗi máy có thể có nhiều fixture. Thông tin fixture bao gồm:

**Mã fixture:** Mã định danh duy nhất.

**Tên fixture:** Tên mô tả.

**Máy:** Máy mà fixture thuộc về.

**Trạng thái:** Active, Maintenance, hoặc Inactive.

### 6.6 Quản lý Quy trình

Truy cập menu **Sản xuất > Quản lý Quy trình** để quản lý mẫu quy trình sản xuất.

Mỗi quy trình bao gồm nhiều công đoạn (Process Step). Mỗi công đoạn có thể yêu cầu một hoặc nhiều loại máy.

---

## 7. Dữ liệu Chủ (Master Data)

### 7.1 Quản lý Sản phẩm

Truy cập menu **Dữ liệu chủ > Quản lý Sản phẩm** để quản lý danh mục sản phẩm.

Thông tin sản phẩm bao gồm:

**Mã sản phẩm:** Mã định danh duy nhất.

**Tên sản phẩm:** Tên mô tả.

**Danh mục:** Phân loại sản phẩm.

**Đơn vị:** Đơn vị đo lường.

**Mô tả:** Thông tin bổ sung.

### 7.2 Tiêu chuẩn Đo lường

Truy cập menu **Dữ liệu chủ > Tiêu chuẩn Đo lường** để quản lý tiêu chuẩn USL/LSL.

Mỗi tiêu chuẩn định nghĩa giới hạn cho một thông số đo lường:

**Sản phẩm:** Sản phẩm áp dụng.

**Công trạm:** Công trạm áp dụng (tùy chọn).

**Tên thông số:** Tên thông số đo lường (ví dụ: Chiều dài, Điện trở).

**USL:** Giới hạn trên (Upper Specification Limit).

**LSL:** Giới hạn dưới (Lower Specification Limit).

**Target:** Giá trị mục tiêu (tùy chọn).

**Đơn vị:** Đơn vị đo lường.

### 7.3 Dashboard Tiêu chuẩn

Truy cập menu **Dữ liệu chủ > Dashboard Tiêu chuẩn** để xem tổng quan các tiêu chuẩn đã thiết lập.

Dashboard hiển thị:

**Thống kê:** Tổng số tiêu chuẩn, số sản phẩm có tiêu chuẩn, số công trạm có tiêu chuẩn.

**Danh sách:** Bảng tất cả tiêu chuẩn với bộ lọc và tìm kiếm.

### 7.4 Quản lý Mapping

Truy cập menu **Dữ liệu chủ > Quản lý Mapping** để cấu hình mapping dữ liệu.

Mapping định nghĩa cách lấy dữ liệu từ database ngoài:

**Sản phẩm:** Sản phẩm cần lấy dữ liệu.

**Công trạm:** Công trạm cần lấy dữ liệu.

**Kết nối Database:** Chọn kết nối database đã cấu hình.

**Tên bảng:** Tên bảng chứa dữ liệu.

**Cột giá trị:** Tên cột chứa giá trị đo lường.

**Cột thời gian:** Tên cột chứa timestamp.

**Điều kiện lọc:** Điều kiện WHERE bổ sung (tùy chọn).

### 7.5 Kế hoạch SPC

Truy cập menu **Dữ liệu chủ > Kế hoạch SPC** để quản lý kế hoạch lấy mẫu tự động.

#### 7.5.1 Tạo Kế hoạch

Nhấn nút "Thêm kế hoạch" và điền các thông tin:

**Tên kế hoạch:** Tên mô tả.

**Dây chuyền:** Dây chuyền áp dụng.

**Mapping:** Cấu hình mapping dữ liệu.

**Phương pháp lấy mẫu:** Chọn phương pháp (theo giờ, ngày, tuần...).

**Kích thước mẫu:** Số lượng mẫu mỗi lần lấy.

**Thời gian bắt đầu:** Thời điểm bắt đầu kế hoạch.

**Thời gian kết thúc:** Thời điểm kết thúc (để trống nếu chạy liên tục).

#### 7.5.2 Trạng thái Kế hoạch

| Trạng thái | Mô tả |
|------------|-------|
| **Draft** | Kế hoạch đang soạn thảo, chưa chạy |
| **Active** | Kế hoạch đang chạy |
| **Paused** | Kế hoạch tạm dừng |
| **Completed** | Kế hoạch đã hoàn thành |

### 7.6 Tạo nhanh Kế hoạch SPC

Truy cập menu **Dữ liệu chủ > Tạo nhanh SPC Plan** để tạo kế hoạch SPC nhanh chóng với wizard hướng dẫn.

Wizard giúp người dùng tạo kế hoạch SPC trong 3 bước đơn giản mà không cần hiểu chi tiết các cấu hình phức tạp.

---

## 8. Quản lý Người dùng và Phân quyền

### 8.1 Quản lý Người dùng

Truy cập menu **Người dùng > Quản lý Người dùng** để xem danh sách người dùng.

Bảng người dùng hiển thị:

**Tên:** Tên hiển thị của người dùng.

**Email:** Địa chỉ email.

**Vai trò:** Admin hoặc User.

**Trạng thái:** Active hoặc Inactive.

**Ngày tạo:** Thời điểm tạo tài khoản.

### 8.2 Người dùng Local

Truy cập menu **Người dùng > Người dùng Local** để quản lý tài khoản local.

Tài khoản local được tạo riêng biệt với Manus OAuth, phù hợp cho môi trường không có internet.

#### 8.2.1 Tạo Tài khoản Local

Nhấn nút "Thêm người dùng" và điền:

**Username:** Tên đăng nhập (không trùng lặp).

**Mật khẩu:** Mật khẩu ít nhất 6 ký tự.

**Tên hiển thị:** Tên hiển thị trên giao diện.

**Email:** Địa chỉ email (tùy chọn).

**Vai trò:** Admin hoặc User.

### 8.3 Phân quyền

Truy cập menu **Người dùng > Phân quyền** để quản lý quyền theo vai trò.

#### 8.3.1 Các Vai trò

| Vai trò | Mô tả |
|---------|-------|
| **Admin** | Toàn quyền truy cập tất cả chức năng |
| **User** | Quyền hạn chế, chỉ xem và phân tích |

#### 8.3.2 Danh sách Quyền

Hệ thống có hơn 50 quyền được phân theo module:

**Phân tích:** Xem, tạo, xuất báo cáo phân tích.

**Sản phẩm:** Xem, tạo, sửa, xóa sản phẩm.

**Dây chuyền:** Xem, tạo, sửa, xóa dây chuyền.

**Người dùng:** Xem, tạo, sửa, xóa người dùng.

**Hệ thống:** Cấu hình database, SMTP, webhook.

### 8.4 Lịch sử Đăng nhập

Truy cập menu **Người dùng > Lịch sử Đăng nhập** để xem lịch sử đăng nhập của tất cả người dùng.

Bảng lịch sử hiển thị:

**Người dùng:** Tên người dùng.

**Thời gian:** Thời điểm đăng nhập.

**IP Address:** Địa chỉ IP.

**Trạng thái:** Thành công hoặc Thất bại.

**Lý do:** Lý do thất bại (nếu có).

---

## 9. Cài đặt Hệ thống

### 9.1 Cài đặt Chung

Truy cập menu **Hệ thống > Cài đặt** để cấu hình các thông số chung.

#### 9.1.1 Kết nối Database

Quản lý các kết nối đến database ngoài:

**Tên kết nối:** Tên mô tả.

**Loại database:** MySQL, PostgreSQL, SQL Server, Access, hoặc Excel.

**Host:** Địa chỉ máy chủ.

**Port:** Cổng kết nối.

**Database:** Tên database.

**Username/Password:** Thông tin đăng nhập.

Nhấn nút "Test Connection" để kiểm tra kết nối trước khi lưu.

### 9.2 Cài đặt Database

Truy cập menu **Hệ thống > Cài đặt Database** để cấu hình database hệ thống.

Trang này hiển thị thông tin kết nối database chính của hệ thống và cho phép thực hiện các thao tác bảo trì.

### 9.3 Lịch sử Backup

Truy cập menu **Hệ thống > Lịch sử Backup** để xem lịch sử sao lưu database.

Hệ thống hỗ trợ backup tự động theo lịch (hàng ngày, hàng tuần) và backup thủ công.

### 9.4 Thông tin Công ty

Truy cập menu **Hệ thống > Thông tin Công ty** để cập nhật thông tin công ty.

Thông tin này được sử dụng trong các báo cáo xuất ra:

**Tên công ty:** Tên đầy đủ của công ty.

**Địa chỉ:** Địa chỉ công ty.

**Điện thoại:** Số điện thoại liên hệ.

**Email:** Email liên hệ.

**Website:** Địa chỉ website.

**Logo:** Upload logo công ty.

### 9.5 Thông báo Email

Truy cập menu **Hệ thống > Thông báo Email** để cấu hình thông báo email cho người dùng hiện tại.

Người dùng có thể bật/tắt nhận thông báo cho các sự kiện:

**Cảnh báo CPK:** Nhận email khi CPK dưới ngưỡng.

**Vi phạm SPC Rules:** Nhận email khi phát hiện vi phạm.

**Hoàn thành Phân tích:** Nhận email khi phân tích batch hoàn thành.

### 9.6 Cấu hình SMTP

Truy cập menu **Hệ thống > Cấu hình SMTP** để cấu hình máy chủ gửi email.

**Host:** Địa chỉ SMTP server (ví dụ: smtp.gmail.com).

**Port:** Cổng SMTP (thường là 587 hoặc 465).

**Username:** Tên đăng nhập email.

**Password:** Mật khẩu hoặc App Password.

**Secure:** Bật/tắt TLS/SSL.

**From Email:** Địa chỉ email gửi đi.

**From Name:** Tên hiển thị khi gửi email.

Nhấn nút "Gửi Email Test" để kiểm tra cấu hình.

### 9.7 Quản lý Webhook

Truy cập menu **Hệ thống > Quản lý Webhook** để cấu hình webhook gửi thông báo đến hệ thống bên ngoài.

#### 9.7.1 Các loại Webhook

| Loại | Mô tả |
|------|-------|
| **Slack** | Gửi thông báo đến kênh Slack |
| **Microsoft Teams** | Gửi thông báo đến kênh Teams |
| **Custom** | Gửi HTTP POST đến URL tùy chỉnh |

#### 9.7.2 Các sự kiện Webhook

**cpk_alert:** Khi CPK dưới ngưỡng cảnh báo.

**rule_violation:** Khi phát hiện vi phạm SPC Rules.

**analysis_complete:** Khi hoàn thành phân tích.

### 9.8 Cổng License

Truy cập menu **Hệ thống > Cổng License** để kích hoạt và quản lý license.

#### 9.8.1 Kích hoạt License

Nhập mã license vào ô "License Key" và nhấn "Kích hoạt". Hệ thống sẽ xác thực và kích hoạt các tính năng tương ứng.

#### 9.8.2 Các gói License

| Gói | Tính năng |
|-----|-----------|
| **Trial** | Dùng thử 30 ngày, giới hạn 100 phân tích |
| **Standard** | Phân tích không giới hạn, 5 người dùng |
| **Professional** | Thêm báo cáo nâng cao, webhook, 20 người dùng |
| **Enterprise** | Không giới hạn, hỗ trợ ưu tiên |

### 9.9 Quản trị License

Truy cập menu **Hệ thống > Quản trị License** (chỉ Admin) để quản lý tất cả license trong hệ thống.

### 9.10 Audit Log

Truy cập menu **Hệ thống > Audit Log** để xem lịch sử hoạt động trong hệ thống.

Audit Log ghi lại tất cả các thao tác quan trọng:

**Tạo/Sửa/Xóa:** Các thao tác CRUD trên dữ liệu.

**Đăng nhập/Đăng xuất:** Hoạt động xác thực.

**Xuất báo cáo:** Các lần xuất PDF/Excel.

**Phân tích:** Các lần thực hiện phân tích SPC.

### 9.11 Khởi tạo Dữ liệu

Truy cập menu **Hệ thống > Khởi tạo Dữ liệu** để tạo dữ liệu mẫu cho hệ thống mới.

Trang này cho phép tạo:

**Dữ liệu mẫu cơ bản:** Sản phẩm, dây chuyền, công trạm mẫu.

**Dữ liệu mapping mẫu:** Cấu hình mapping để test.

**Dữ liệu SPC mẫu:** Dữ liệu đo lường để test phân tích.

### 9.12 Template Báo cáo

Truy cập menu **Hệ thống > Template Báo cáo** để quản lý mẫu báo cáo.

Mỗi template định nghĩa:

**Tên template:** Tên mô tả.

**Màu chủ đạo:** Màu sắc chính của báo cáo.

**Font chữ:** Font sử dụng trong báo cáo.

**Hiển thị logo:** Bật/tắt logo công ty.

**Hiển thị biểu đồ:** Bật/tắt biểu đồ trong báo cáo.

**Hiển thị dữ liệu thô:** Bật/tắt bảng dữ liệu chi tiết.

### 9.13 Lịch sử Xuất

Truy cập menu **Hệ thống > Lịch sử Xuất** để xem lịch sử các file đã xuất.

Bảng hiển thị:

**Tên file:** Tên file đã xuất.

**Loại:** PDF hoặc Excel.

**Người xuất:** Người thực hiện xuất.

**Thời gian:** Thời điểm xuất.

**Tải lại:** Link tải lại file (nếu còn lưu).

### 9.14 Thông tin Hệ thống

Truy cập menu **Hệ thống > Thông tin Hệ thống** để xem thông tin về phiên bản và tính năng.

Trang hiển thị:

**Phiên bản:** Số phiên bản hiện tại.

**Ngày build:** Ngày build phiên bản.

**Danh sách tính năng:** Các tính năng đã triển khai.

**Công nghệ:** Stack công nghệ sử dụng.

---

## 10. Phụ lục - Thuật ngữ SPC

### 10.1 Các Chỉ số Thống kê

| Thuật ngữ | Tiếng Việt | Mô tả |
|-----------|------------|-------|
| **Mean (X̄)** | Giá trị trung bình | Tổng các giá trị chia cho số lượng mẫu |
| **Standard Deviation (σ)** | Độ lệch chuẩn | Đo lường độ phân tán của dữ liệu |
| **Range (R)** | Phạm vi | Hiệu số giữa giá trị lớn nhất và nhỏ nhất |
| **USL** | Giới hạn trên | Upper Specification Limit - Giới hạn kỹ thuật trên |
| **LSL** | Giới hạn dưới | Lower Specification Limit - Giới hạn kỹ thuật dưới |
| **UCL** | Giới hạn kiểm soát trên | Upper Control Limit - Giới hạn kiểm soát trên (thường ±3σ) |
| **LCL** | Giới hạn kiểm soát dưới | Lower Control Limit - Giới hạn kiểm soát dưới |
| **CL** | Đường trung tâm | Center Line - Giá trị trung bình tổng thể |

### 10.2 Các Chỉ số Năng lực

| Thuật ngữ | Mô tả | Công thức |
|-----------|-------|-----------|
| **CP** | Chỉ số năng lực quy trình tiềm năng | (USL - LSL) / 6σ |
| **CPK** | Chỉ số năng lực quy trình thực tế | Min[(USL - X̄) / 3σ, (X̄ - LSL) / 3σ] |
| **PP** | Chỉ số hiệu suất quy trình tiềm năng | (USL - LSL) / 6s |
| **PPK** | Chỉ số hiệu suất quy trình thực tế | Min[(USL - X̄) / 3s, (X̄ - LSL) / 3s] |
| **Ca** | Độ chính xác năng lực | (X̄ - Target) / [(USL - LSL) / 2] |

### 10.3 8 SPC Rules (Western Electric Rules)

| Rule | Tên | Điều kiện phát hiện |
|------|-----|---------------------|
| **1** | Beyond Limits | 1 điểm nằm ngoài ±3σ |
| **2** | Trend | 7 điểm liên tiếp tăng hoặc giảm |
| **3** | Run | 9 điểm liên tiếp cùng phía với CL |
| **4** | 2 of 3 | 2 trong 3 điểm liên tiếp nằm ngoài ±2σ cùng phía |
| **5** | 4 of 5 | 4 trong 5 điểm liên tiếp nằm ngoài ±1σ cùng phía |
| **6** | Stratification | 15 điểm liên tiếp nằm trong ±1σ |
| **7** | Mixture | 8 điểm liên tiếp nằm ngoài ±1σ (cả hai phía) |
| **8** | Overcontrol | 14 điểm liên tiếp dao động xen kẽ lên xuống |

### 10.4 Phân loại 5M1E

| Nhóm | Tiếng Anh | Tiếng Việt | Ví dụ |
|------|-----------|------------|-------|
| **M** | Machine | Máy móc | Máy hỏng, calibration sai |
| **M** | Material | Nguyên vật liệu | Vật liệu kém chất lượng |
| **M** | Method | Phương pháp | Quy trình không đúng |
| **M** | Man | Con người | Thao tác sai, thiếu đào tạo |
| **M** | Measurement | Đo lường | Thiết bị đo không chính xác |
| **E** | Environment | Môi trường | Nhiệt độ, độ ẩm không phù hợp |

---

## Liên hệ Hỗ trợ

Nếu cần hỗ trợ kỹ thuật hoặc có câu hỏi về hệ thống, vui lòng liên hệ:

**Email:** support@spc-calculator.com

**Hotline:** 1900-xxxx

**Website:** https://spc-calculator.com

---

*Tài liệu này được tạo bởi Manus AI*  
*Phiên bản: 2.0 - Ngày cập nhật: 15/12/2024*
