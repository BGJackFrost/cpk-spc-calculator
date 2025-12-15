# Project TODO - Hệ thống Tính toán CPK/SPC

## Core Features

- [x] Form nhập liệu cho phép người dùng chọn mã sản phẩm, trạm sản xuất, và khoảng thời gian kiểm tra
- [x] Hệ thống cấu hình kết nối database động với connection string và mapping tên bảng dữ liệu
- [x] Truy vấn dữ liệu từ MachineDatabase theo các tiêu chí đã chọn (mã sản phẩm, trạm, thời gian)
- [x] Tính toán các chỉ số SPC/CPK từ dữ liệu kiểm tra (Mean, Std Dev, Cp, Cpk, UCL, LCL)
- [x] Hiển thị kết quả tính toán dưới dạng bảng số liệu với các chỉ số thống kê
- [x] Biểu đồ Control Chart (X-bar, R-chart) để trực quan hóa xu hướng dữ liệu kiểm tra
- [x] Bảng cấu hình cho phép admin quản lý mapping giữa (mã sản phẩm + trạm) với (database + tên bảng)
- [x] Xuất kết quả phân tích CPK/SPC ra file HTML/CSV để lưu trữ và chia sẻ
- [x] Gửi thông báo cho owner/quản lý khi chỉ số CPK vượt ngưỡng cảnh báo (CPK < 1.33)
- [x] Sử dụng LLM để phân tích xu hướng dữ liệu SPC và đưa ra khuyến nghị cải tiến

## UI/UX

- [x] Thiết kế giao diện elegant and perfect style
- [x] Dashboard layout với sidebar navigation
- [x] Responsive design cho mobile và desktop

## Phase 2 - Mở rộng hệ thống

### Database dây chuyền sản xuất
- [x] Bảng ProductionLine (dây chuyền sản xuất)
- [x] Bảng Workstation (công trạm thuộc dây chuyền)
- [x] Bảng Machine (máy móc thuộc công trạm)
- [x] Cấu hình quy trình dây chuyền

### Biểu đồ nâng cao
- [x] XBar Chart với control limits
- [x] R Chart với control limits
- [x] Biểu đồ phân bổ (Histogram) của XBar
- [x] Biểu đồ phân bổ (Histogram) của R Chart
- [x] Bảng dữ liệu mẫu (Sample Table)

### Tiêu chuẩn kiểm tra
- [x] 8 SPC Rules (Western Electric Rules)
- [x] CA Rules (Control Analysis Rules)
- [x] CPK Rules (Process Capability Rules)
- [x] Hiển thị violations trên biểu đồ

### Phương thức lấy mẫu
- [x] Lấy mẫu theo năm
- [x] Lấy mẫu theo tháng
- [x] Lấy mẫu theo tuần
- [x] Lấy mẫu theo ngày
- [x] Lấy mẫu theo giờ
- [x] Lấy mẫu theo phút
- [x] Lấy mẫu theo giây
- [x] Tần suất lấy mẫu tùy chỉnh (n mẫu trong khoảng thời gian t)

### Dashboard Realtime
- [x] Cấu hình số lượng dây chuyền hiển thị
- [x] Chọn dây chuyền cần theo dõi
- [x] Biểu đồ thu nhỏ (sparkline) cho mỗi dây chuyền
- [x] Hiển thị chỉ số SPC cơ bản (CPK, Mean, UCL, LCL)
- [x] Cập nhật realtime

## Phase 3 - Authentication, CRUD và hiển thị NG

### Authentication & Quản lý người dùng
- [x] Trang đăng nhập với Manus OAuth (đã có sẵn)
- [x] Trang quản lý người dùng (danh sách, phân quyền)
- [x] Phân quyền admin/user cho các chức năng

### Database mở rộng
- [x] Bảng Product (sản phẩm)
- [x] Bảng ProductSpecification (USL, LSL cho từng mã sản phẩm)
- [x] Bảng ProductionLineProduct (cấu hình dây chuyền - sản phẩm)
- [x] Bảng ProcessConfig (cấu hình quy trình)

### Các trang CRUD
- [x] Trang quản lý sản phẩm (CRUD)
- [x] Trang quản lý dây chuyền sản xuất (CRUD)
- [x] Trang quản lý công trạm (CRUD)
- [x] Trang quản lý máy móc (CRUD)
- [x] Trang quản lý tiêu chuẩn USL/LSL (CRUD)
- [x] Trang quản lý cấu hình quy trình (CRUD)

### Hiển thị điểm NG trên biểu đồ
- [x] Điểm nằm ngoài USL/LSL hiển thị màu đỏ
- [x] Điểm vi phạm 8 SPC Rules hiển thị màu đỏ
- [x] Tooltip hiển thị lý do NG (vi phạm rule nào)
- [x] Legend cho các loại điểm (OK, NG-USL/LSL, NG-SPC Rule)

## Phase 4 - CRUD bổ sung, Kế hoạch lấy mẫu, Dashboard nâng cao, Email thông báo

### Trang CRUD bổ sung
- [x] Trang quản lý dây chuyền sản xuất (Production Line CRUD)
- [x] Trang quản lý phương pháp lấy mẫu (Sampling Method CRUD)
- [x] Trang quản lý Production Line Process (quy trình dây chuyền)

### Kế hoạch lấy mẫu SPC
- [x] Database schema cho SPC Sampling Plan
- [x] Trang tạo/quản lý kế hoạch lấy mẫu SPC
- [x] Gán kế hoạch vào Line sản xuất
- [x] Chạy lấy mẫu tự động theo kế hoạch
- [x] Hiển thị kết quả theo user đã cấu hình

### Dashboard nâng cao
- [x] Cấu hình số lượng dây chuyền hiển thị theo user
- [x] Hiển thị dây chuyền đã cấu hình cho từng user
- [x] Lưu cấu hình dashboard vào database

### Thông báo Email
- [x] Cấu hình email cho từng user
- [x] Gửi email khi vi phạm SPC Rules
- [x] Gửi email khi vi phạm CA Rules
- [x] Gửi email khi vi phạm CPK Rules (CPK < ngưỡng)

## Phase 5 - Tích hợp Mapping vào SPC Plan và Cải tiến Chuyên gia

### Tích hợp Mapping vào Kế hoạch SPC
- [x] Thêm trường mappingId vào bảng SpcSamplingPlan
- [x] Cập nhật trang Kế hoạch SPC để chọn mapping
- [x] Tạo service lấy dữ liệu từ external database theo mapping
- [x] Tự động cập nhật dữ liệu SPC/CPK realtime trên dashboard
- [x] Lưu kết quả tính toán SPC vào database

### Rà soát và Cải tiến Logic Code
- [x] Rà soát thuật toán tính toán SPC/CPK
- [x] Rà soát cấu trúc database và quan hệ dữ liệu
- [x] Rà soát logic phát hiện vi phạm 8 SPC Rules
- [x] Rà soát hiệu suất truy vấn database
- [x] Đánh giá khả năng mở rộng hệ thống

### Cải tiến Chuyên gia SPC
- [x] Thêm tính toán Pp, Ppk (Process Performance)
- [x] Thêm tính toán Ca (Capability Accuracy)
- [x] Cải tiến thuật toán phát hiện trend và shift
- [x] Thêm báo cáo SPC tổng hợp theo ca/ngày/tuần
- [x] Tối ưu hóa hiệu suất cho dữ liệu lớn

## Phase 6 - Nâng cấp Phân tích SPC và Phân quyền

### Nâng cấp trang Phân tích SPC/CPK
- [x] Sửa logic chọn: Sản phẩm → Trạm → Thời gian → Mapping
- [x] Truy vấn dữ liệu từ external database theo cấu hình mapping
- [x] Hiển thị kết quả phân tích SPC/CPK từ dữ liệu thực
- [x] Thêm chức năng xuất báo cáo PDF
- [x] Thêm chức năng xuất báo cáo Excel

### Quản lý phân quyền theo vai trò
- [x] Tạo bảng roles và permissions trong database
- [x] Tạo trang quản lý vai trò và quyền
- [x] Kiểm tra quyền trên backend (tRPC procedures)
- [x] Kiểm tra quyền trên frontend (ẩn/hiện menu, buttons)
- [x] Gán quyền mặc định cho các vai trò

## Phase 7 - Seed Data, SMTP và Khởi tạo Quyền

### Seed Data mẫu
- [x] Tạo script seed data cho database connections mẫu
- [x] Tạo script seed data cho products mẫu
- [x] Tạo script seed data cho production lines mẫu
- [x] Tạo script seed data cho workstations mẫu
- [x] Tạo script seed data cho product specifications (USL/LSL) mẫu
- [x] Tạo script seed data cho mappings mẫu
- [x] Tạo dữ liệu kiểm tra mẫu để test flow phân tích SPC

### Cấu hình SMTP
- [x] Tạo bảng smtp_config trong database
- [x] Tạo trang cấu hình SMTP settings
- [x] Tạo service gửi email với nodemailer
- [x] Tích hợp gửi email khi phát hiện lỗi SPC/CPK
- [x] Test gửi email thông báo

### Khởi tạo quyền mặc định
- [x] Tự động khởi tạo permissions khi server khởi động
- [x] Tự động gán quyền mặc định cho các vai trò
- [x] Hiển thị trạng thái khởi tạo trên trang Phân quyền

## Phase 8 - CRUD bổ sung và Cải tiến Chuyên nghiệp

### Trang CRUD bổ sung
- [x] Trang quản lý Công trạm (Workstation CRUD)
- [x] Trang quản lý Lưu trình/Quy trình (Process CRUD)
- [x] Trang quản lý Máy (Machine CRUD)

### Tổng hợp và Cải tiến Hệ thống
- [x] Đánh giá toàn bộ logic và flow của hệ thống (SYSTEM_OVERVIEW.md)
- [x] Thêm hệ thống Audit Logs theo dõi hoạt động
- [ ] Tối ưu hóa UX/UI cho các trang chính
- [ ] Thêm validation và error handling chuyên nghiệp
- [ ] Cải tiến Dashboard với thống kê chi tiết hơn
- [ ] Thêm chức năng tìm kiếm và lọc nâng cao
- [ ] Cải tiến biểu đồ SPC với annotations và markers
- [ ] Thêm báo cáo tổng hợp theo ca/ngày/tuần/tháng
- [ ] Cải tiến hệ thống thông báo realtime

## Phase 9 - Cải tiến Quy trình, Dây chuyền và Kế hoạch SPC

### Cải tiến Quy trình
- [x] Tạo bảng ProcessTemplate (mẫu quy trình)
- [x] Tạo bảng ProcessStep (công đoạn trong quy trình)
- [x] Tạo bảng ProcessStepMachine (máy móc cho từng công đoạn)
- [x] Cập nhật trang Quản lý Quy trình với giao diện kéo thả công đoạn
- [x] Cho phép thêm/xóa máy móc vào từng công đoạn

### Cải tiến Dây chuyền sản xuất
- [x] Thêm trường productId vào ProductionLine
- [x] Thêm trường processTemplateId vào ProductionLine
- [x] Thêm trường supervisorId (người phụ trách) vào ProductionLine
- [x] Tạo bảng ProductionLineMachine (máy cụ thể cho dây chuyền)
- [x] Cập nhật trang Quản lý Dây chuyền với form mới

### Cải tiến Kế hoạch SPC
- [x] Thêm trường startTime vào SpcSamplingPlan
- [x] Thêm trường endTime vào SpcSamplingPlan (nullable)
- [x] Logic chạy liên tục nếu endTime = null
- [x] Cập nhật trang Kế hoạch SPC với thời gian bắt đầu/kết thúc

## Bug Fixes - Phase 9.1

### Dây chuyền Realtime
- [x] Thay đổi từ chọn dây chuyền sang chọn kế hoạch SPC để xem realtime
- [x] Cập nhật logic hiển thị dữ liệu theo kế hoạch SPC đã chọn

### Phân tích SPC/CPK
- [x] Sửa lỗi không thể chọn được công trạm (lấy workstations trực tiếp thay vì từ mappings)
- [x] Sửa lỗi không thể chọn được Cấu hình Mapping (mapping là optional)

## Phase 9.2 - Cải tiến Mapping và Dashboard Realtime

### Seed Data cho Mapping
- [x] Tạo seed data mapping mẫu với các sản phẩm và workstations có sẵn
- [x] Thêm vào trang Khởi tạo Dữ liệu

### Chế độ Phân tích không cần Mapping
- [x] Thêm tab/mode nhập dữ liệu thủ công
- [x] Thêm option lấy dữ liệu từ SPC Plan đã có
- [x] Cập nhật UI Analyze.tsx với các chế độ mới

### Dashboard Realtime với dữ liệu thực
- [x] Tạo API endpoint getRealtimeData để lấy dữ liệu realtime theo kế hoạch SPC
- [x] Tạo hàm getRecentAnalysisForPlan trong db.ts
- [x] Tạo component RealtimePlanCard sử dụng dữ liệu thực từ spc_analysis_history
- [x] Cập nhật Dashboard để hiển thị dữ liệu thực thay vì mock data

## Phase 9.3 - Báo cáo tổng hợp và Realtime SSE

### Báo cáo tổng hợp SPC theo ca/ngày
- [x] Tạo trang báo cáo tổng hợp SPC (SpcReport.tsx)
- [x] Thêm bộ lọc theo ca làm việc (sáng/chiều/tối)
- [x] Thêm bộ lọc theo ngày/tuần/tháng (7/14/30/90 ngày)
- [x] Biểu đồ trend CPK qua thời gian (Area Chart)
- [x] Biểu đồ so sánh CPK giữa các ca (Bar Chart)
- [x] Bảng thống kê tổng hợp (số lượng mẫu, CPK trung bình, vi phạm)
- [ ] Xuất báo cáo PDF/Excel (placeholder)

### Server-Sent Events (SSE) cho Realtime
- [x] Tạo SSE endpoint trong server (/api/sse)
- [x] Tạo hook useSSE để subscribe events
- [x] Cập nhật Dashboard Realtime sử dụng SSE (RealtimePlanCard)
- [x] Gửi event khi có phân tích SPC mới (spc_analysis_complete)
- [x] Gửi event khi có cảnh báo CPK (cpk_alert)


## Phase 9.4 - Xuất báo cáo, Toast và Dashboard tùy chỉnh

### Sửa lỗi SSE Connection
- [x] Sửa lỗi SSE connection error (require is not defined)
- [x] Cải thiện error handling trong useSSE hook

### Xuất báo cáo PDF/Excel
- [x] Tạo API endpoint xuất báo cáo (reportRouter.exportExcel)
- [ ] Xuất PDF với thống kê và biểu đồ (chưa hoàn thành)
- [x] Xuất Excel với dữ liệu chi tiết

### Notification Toast SSE
- [x] Tạo component SseNotificationProvider
- [x] Hiển thị toast khi có phân tích SPC mới
- [x] Hiển thị toast khi có cảnh báo CPK

### Dashboard tùy chỉnh
- [x] Tạo bảng user_dashboard_configs
- [x] Cho phép chọn/ẩn các widget (nút Tùy chỉnh trên Dashboard)
- [x] Lưu cấu hình theo user (dashboardConfigRouter)


## Phase 9.5 - Quản lý lỗi SPC và Biểu đồ Pareto

### Quản lý lỗi SPC
- [x] Tạo bảng spc_defect_categories (danh mục lỗi)
- [x] Tạo bảng spc_defect_records (ghi nhận lỗi)
- [x] Tạo API CRUD cho defect categories (defectRouter)
- [x] Tạo API ghi nhận và thống kê lỗi (getStatistics, getByRuleStatistics)
- [x] Tạo trang quản lý danh mục lỗi (DefectManagement.tsx)
- [x] Tạo trang thống kê lỗi theo thời gian (DefectStatistics.tsx)

### Biểu đồ Pareto
- [x] Tạo biểu đồ Pareto với Recharts ComposedChart
- [x] Tích hợp vào trang thống kê lỗi (3 tabs: Loại lỗi, Rule vi phạm, Phân bổ)
- [x] Hiển thị top nguyên nhân vi phạm SPC (sắp xếp theo số lượng)
- [x] Đường tích lũy phần trăm (80/20 rule - Nhóm A/B/C)
- [x] Bộ lọc theo thời gian (7/14/30/90 ngày) và dây chuyền
- [x] Phân loại theo nhóm 5M1E (Machine, Material, Method, Man, Environment, Measurement)


## Phase 10 - Fixture, Machine Type và Phân tích nâng cao

### Quản lý Machine Type và Fixture
- [x] Tạo bảng machine_types (loại máy)
- [x] Thêm trường machineTypeId vào bảng machines
- [x] Tạo bảng fixtures (fixture thuộc máy)
- [x] Tạo API CRUD cho machine_types
- [x] Tạo API CRUD cho fixtures
- [x] Tạo trang quản lý Machine Type
- [x] Tạo trang quản lý Fixture

### Cập nhật cấu trúc Dây chuyền
- [x] Dây chuyền = Lưu trình sản xuất + Công trạm
- [x] Công trạm = Nhiều loại máy (Machine Type)
- [x] Loại máy = Nhiều Fixture
- [x] Cập nhật trang Quản lý Dây chuyền với cấu trúc mới

### Tích hợp Fixture vào SPC
- [x] Thêm option chọn Fixture trong trang Phân tích SPC
- [x] Cho phép tính SPC cho tất cả Fixture của máy
- [x] Cho phép tính SPC theo từng Fixture riêng lẻ
- [ ] Cập nhật kế hoạch SPC với lựa chọn Fixture (chưa hoàn thành)

### Phân tích đa sản phẩm/trạm/Fixture
- [x] Cho phép chọn nhiều sản phẩm cùng lúc
- [x] Cho phép chọn nhiều công trạm cùng lúc
- [x] Cho phép chọn nhiều Fixture cùng lúc
- [x] Tính toán tương quan (correlation) giữa 2 đối tượng
- [x] Hiển thị biểu đồ so sánh CPK
- [x] Tạo trang MultiAnalysis.tsx

### So sánh CPK giữa các dây chuyền
- [x] Tạo trang so sánh CPK (ProductionLineComparison.tsx)
- [x] Chọn nhiều dây chuyền để so sánh (2-5)
- [x] Biểu đồ bar chart so sánh CPK/CP
- [x] Biểu đồ Radar đa chiều
- [x] Bảng thống kê chi tiết với xếp hạng
- [x] Bộ lọc theo thời gian


## Phase 11 - Tích hợp spc_realtime_data, Pagination, Fixture vào SPC Plan

### Tích hợp spc_realtime_data và spc_summary_stats
- [x] Tạo các hàm CRUD cho spc_realtime_data (insertRealtimeData, getRealtimeData)
- [x] Tạo các hàm CRUD cho spc_summary_stats (getSummaryStats, updateSummaryStats)
- [x] Tạo API endpoints trong spcRouter
- [ ] Tự động tổng hợp vào spc_summary_stats theo ca/ngày/tuần/tháng (chưa hoàn thành)

### Pagination cho các danh sách lớn
- [x] Tạo component Pagination tái sử dụng (Pagination.tsx)
- [x] Thêm pagination cho trang Lịch sử phân tích (History.tsx)
- [x] Thêm pagination cho Audit Logs (getAuditLogsPaginated)
- [ ] Thêm pagination cho bảng dữ liệu mẫu (chưa hoàn thành)

### Hoàn thiện Fixture vào SPC Plan
- [x] Thêm trường machineId và fixtureId vào bảng spc_sampling_plans
- [x] Cập nhật API create/update SPC Plan
- [x] Thêm selector Machine và Fixture vào form SPC Plan
- [x] Lọc Fixture theo Machine đã chọn

## Phase 12 - Caching Layer và Tối ưu Database

### Caching Layer
- [x] Tạo module cache.ts với in-memory cache (MemoryCache class)
- [x] Định nghĩa cache keys cho các loại dữ liệu (products, workstations, machines, etc.)
- [x] Định nghĩa TTL cho từng loại cache (SHORT/MEDIUM/LONG/VERY_LONG)
- [x] Tạo helper withCache() cho async functions
- [x] Tạo hàm invalidateCache() khi dữ liệu thay đổi

### Tối ưu Database
- [x] Thêm indexes cho spc_analysis_history (productCode, stationName, createdAt, cpk)
- [x] Thêm indexes cho spc_sampling_plans (status, productionLineId)
- [x] Thêm indexes cho audit_logs (userId, action, createdAt)
- [x] Thêm indexes cho machines, fixtures, products
- [ ] Tối ưu các query JOIN phức tạp (chưa hoàn thành)


## Phase 12.1 - Sửa lỗi và trang About

### Rà soát trang bị lỗi mất thanh menu
- [ ] Tìm các trang có SelectItem value="" gây crash
- [ ] Sửa tất cả SelectItem value="" thành value="all"
- [ ] Kiểm tra các trang có lỗi khác gây mất DashboardLayout

### Trang About
- [ ] Tạo trang About.tsx với thông tin hệ thống
- [ ] Hiển thị phiên bản ứng dụng
- [ ] Hiển thị thông tin license/bản quyền
- [ ] Thêm chức năng nhập mã kích hoạt bản quyền
- [ ] Lưu trạng thái kích hoạt vào database
- [ ] Thêm menu About vào sidebar


## Phase 13 - Sửa lỗi Sidebar và Trang About

### Sửa lỗi Sidebar Menu
- [x] Thêm DashboardLayout vào DefectManagement.tsx (/defects)
- [x] Thêm DashboardLayout vào DefectStatistics.tsx (/defect-statistics)
- [x] Thêm DashboardLayout vào MachineTypeManagement.tsx (/machine-types)
- [x] Thêm DashboardLayout vào FixtureManagement.tsx (/fixtures)

### Trang About
- [x] Tạo trang About.tsx với thông tin hệ thống
- [x] Hiển thị phiên bản và ngày build
- [x] Hiển thị danh sách tính năng hệ thống
- [x] Hiển thị công nghệ sử dụng (tech stack)
- [x] Chức năng kích hoạt license
- [x] So sánh các gói license (Trial, Standard, Professional, Enterprise)
- [x] Thêm route /about vào App.tsx
- [x] Thêm menu "Thông tin Hệ thống" vào DashboardLayout

## Phase 14 - SPC Plan Visualization và Quản lý Rules

### Trang quản lý Rules
- [x] Tạo bảng spc_rules trong database (code, name, description, category, enabled, threshold)
- [x] Tạo bảng ca_rules trong database
- [x] Tạo bảng cpk_rules trong database
- [x] Tạo API CRUD cho SPC/CA/CPK Rules
- [x] Tạo trang RulesManagement.tsx với 3 tabs
- [x] Thêm route /rules và menu "Quản lý Rules" vào sidebar
- [x] Tạo trang RulesManagement.tsx với 3 tabs (SPC Rules, CA Rules, CPK Rules)
- [x] Cho phép admin điều chỉnh tiêu chuẩn của từng rule
- [x] Hiển thị mô tả chi tiết và ví dụ cho mỗi rule

### Nâng cấp SPC Plan với Rules toggle
- [x] Thêm trường enabledSpcRules (JSON array) vào bảng spc_sampling_plans
- [x] Thêm trường enabledCaRules (JSON array) vào bảng spc_sampling_plans
- [x] Thêm trường enabledCpkRules (JSON array) vào bảng spc_sampling_plans
- [x] Cập nhật form SPC Plan với checkboxes để bật/tắt từng rule
- [ ] Cập nhật logic phân tích SPC để chỉ kiểm tra các rules đã bật

### Tăng giới hạn Dây chuyền Realtime
- [x] Tăng giới hạn hiển thị từ 12 lên 30 kế hoạch
- [x] Cập nhật grid layout cho số lượng lớn hơn

### Trang SPC Plan Visualization
- [x] Tạo trang SpcPlanVisualization.tsx
- [x] Hiển thị sơ đồ dây chuyền sản xuất trực quan (conveyor belt visual)
- [x] Hiển thị các Workstation/Machine/Fixture trên sơ đồ
- [x] Hiển thị các chỉ số SPC cơ bản (CPK, status) cho mỗi node
- [x] Cho phép người dùng cấu hình chỉ số hiển thị
- [x] Click vào node để mở trang chi tiết
- [x] 2 chế độ xem: Hierarchy (dây chuyền) và Grid (lưới)

### Trang chi tiết Workstation/Machine/Fixture
- [x] Tạo trang SpcVisualizationDetail.tsx (chung cho tất cả)
- [x] Hiển thị danh sách kế hoạch SPC liên quan
- [x] Hiển thị các entity con (workstation → machine → fixture)
- [x] Breadcrumb navigation giữa các cấp


## Phase 15 - Seed Rules, Tích hợp Rules, Realtime Visualization, Export

### Seed Data cho Rules
- [x] Tạo seed data cho 8 SPC Rules (Western Electric Rules)
- [x] Tạo seed data cho CA Rules (Ca, Cp thresholds)
- [x] Tạo seed data cho CPK Rules (CPK thresholds)
- [x] Thêm vào trang Khởi tạo Dữ liệu

### Tích hợp Rules vào Logic phân tích
- [x] Cập nhật hàm detectSpcViolations để nhận danh sách rules đã bật
- [x] Cập nhật hàm calculateSpcMetrics để truyền enabledSpcRules
- [x] Chỉ kiểm tra các SPC Rules được bật trong kế hoạch
- [ ] Chỉ kiểm tra các CA Rules được bật trong kế hoạch
- [ ] Chỉ kiểm tra các CPK Rules được bật trong kế hoạch

### Realtime Data trên Visualization
- [x] Tạo API getRealtimeDataMultiple để lấy dữ liệu nhiều plans
- [x] Lấy dữ liệu CPK/Mean từ spc_summary_stats
- [x] Hiển thị CPK thực tế trên các node workstation
- [x] Cập nhật màu sắc node theo trạng thái CPK (xanh/vàng/đỏ)
- [x] Cập nhật status badge theo realtime CPK

### Export Visualization
- [x] Cài đặt html2canvas và jspdf
- [x] Tạo hàm handleExportPNG xuất ra PNG
- [x] Tạo hàm handleExportPDF xuất ra PDF
- [x] Thêm nút Export dropdown trên trang Visualization


## Phase 16 - Cải tiến Mapping và Cập nhật UPGRADE_PLAN

### Cải tiến chức năng Thêm Mapping
- [x] Tạo API lấy danh sách bảng từ database connection (getTables)
- [x] Tạo API lấy danh sách cột từ bảng đã chọn (getColumns)
- [x] Cập nhật form Thêm Mapping với dropdown chọn bảng động
- [x] Cập nhật các control map cột với dropdown động
- [x] Thêm chức năng Filter mở rộng (Collapsible Advanced Filter)
- [x] Cho phép thêm nhiều điều kiện filter (AND) với 8 toán tử

### Cập nhật UPGRADE_PLAN.md
- [x] Cập nhật trạng thái Phase 14 (SPC Visualization, Rules Management)
- [x] Cập nhật trạng thái Phase 15 (Seed Rules, Realtime Data, Export)
- [x] Cập nhật thống kê tổng quan hệ thống (28 bảng, 24 routers, 32 trang)


## Phase 17 - Nâng cao Mapping (Filter, Preview, Validate)

### Lưu Filter Conditions vào Database
- [x] Thêm trường filterConditions (JSON) vào bảng mappings
- [x] Cập nhật API create/update mapping để lưu filterConditions
- [x] Cập nhật form để load filterConditions khi edit

### Preview Data
- [x] Tạo API previewData lấy 10 dòng mẫu từ database nguồn
- [x] Thêm nút "Xem trước dữ liệu" trong form
- [x] Hiển thị dialog với bảng dữ liệu mẫu và query SQL

### Validate Connection
- [x] Tạo API testConnectionById kiểm tra kết nối database
- [x] Thêm nút "Test Connection" trong form với icon trạng thái
- [x] Hiển thị kết quả test (thành công/thất bại) với màu sắc


## Phase 18 - Import/Export, Clone, Templates cho Mapping

### Import/Export Mapping
- [x] Tạo API export mapping ra JSON (mapping.export)
- [x] Tạo API export mapping ra CSV (mapping.export)
- [x] Tạo API import mapping từ JSON/CSV (mapping.import)
- [x] Thêm nút Export (dropdown JSON/CSV) trên header
- [x] Thêm dialog Import với file upload và option bỏ qua trùng

### Clone Mapping
- [x] Tạo API clone mapping (mapping.clone)
- [x] Thêm nút Clone vào actions của mỗi mapping
- [x] Hiển thị dialog nhập mã sản phẩm/trạm mới

### Mapping Templates
- [x] Tạo bảng mapping_templates trong database
- [x] Tạo API CRUD cho templates (mappingTemplateRouter)
- [x] Thêm dropdown "Áp dụng Template" trong form tạo mapping
- [x] Tạo 5 templates mặc định (SMT Solder Paste, Pick & Place, Reflow, ICT, AOI)


## Phase 19 - Rà soát Hệ thống và License Backend

### Rà soát Database và CRUD
- [x] Kiểm tra tất cả 43 bảng database
- [x] Xác nhận 36 trang frontend đã có
- [x] Tạo file SYSTEM_REVIEW.md với phân tích chi tiết

### License Management Backend
- [x] Tạo bảng licenses trong database
- [x] Thêm CRUD functions cho licenses trong db.ts
- [x] Tạo licenseRouter với các API:
  - list: Lấy danh sách licenses
  - getActive: Lấy license đang active
  - getByKey: Tìm license theo key
  - create: Tạo license mới
  - activate: Kích hoạt license
  - deactivate: Hủy kích hoạt license
  - delete: Xóa license
  - generateKey: Tạo license key ngẫu nhiên
  - seedDefault: Tạo trial license mặc định
- [x] Tích hợp License API vào trang About.tsx
- [x] Cập nhật UPGRADE_PLAN.md với Phase 19


## Phase 20 - License Management và Keyboard Shortcuts

### Trang quản lý License
- [x] Tạo trang LicenseManagement.tsx
- [x] Hiển thị danh sách tất cả licenses với stats cards
- [x] Form tạo license mới với các trường: type, company, email, maxUsers, maxProductionLines, expiresAt
- [x] Nút kích hoạt/hủy kích hoạt license
- [x] Nút xóa license và copy key
- [x] Thêm route /license-management vào App.tsx
- [x] Thêm menu License vào sidebar (chỉ admin)

### Keyboard Shortcuts
- [x] Tạo hook useKeyboardShortcuts
- [x] Ctrl+S: Lưu form hiện tại
- [x] Ctrl+Enter: Chạy phân tích/submit
- [x] Esc: Đóng dialog
- [x] Ctrl+/: Hiển thị danh sách shortcuts
- [x] Tạo KeyboardShortcutsHelp component
- [x] Tích hợp vào trang Analyze


## Phase 21 - Keyboard Shortcuts mở rộng, License Notifications, Dashboard Widget

### Keyboard Shortcuts mở rộng
- [x] Tích hợp vào SpcPlanManagement (Ctrl+S lưu, Ctrl+N tạo mới, Esc đóng, Ctrl+/ help)
- [x] Tích hợp vào Mappings (Ctrl+S lưu, Ctrl+N tạo mới, Esc đóng, Ctrl+/ help)
- [ ] Tích hợp vào ProductManagement (tương lai)
- [ ] Tích hợp vào các trang CRUD khác (tương lai)

### License Expiry Notifications
- [x] Tạo API checkExpiry kiểm tra license sắp hết hạn (7/30 ngày)
- [x] Tạo API sendExpiryNotifications gửi thông báo
- [x] Tạo hàm getLicensesExpiringSoon và getExpiredLicenses trong db.ts
- [ ] Tạo scheduled job kiểm tra hàng ngày (tương lai)

### Dashboard License Widget
- [x] Tạo component LicenseStatusWidget
- [x] Hiển thị thông tin license hiện tại (loại, hết hạn, giới hạn users/lines/plans)
- [x] Hiển thị cảnh báo nếu sắp hết hạn (màu vàng/đỏ)
- [x] Chỉ hiển thị cho admin
- [x] Thêm vào Dashboard chính (cạnh Quick Actions)


## Phase 22 - Scheduled Job License Check và Keyboard Shortcuts mở rộng

### Scheduled Job cho License Check
- [ ] Tạo module scheduledJobs.ts với node-cron
- [ ] Tạo job kiểm tra license hàng ngày lúc 8:00 sáng
- [ ] Gọi API checkExpiry và sendExpiryNotifications
- [ ] Ghi log kết quả vào audit_logs
- [ ] Khởi động jobs khi server start

### Keyboard Shortcuts mở rộng
- [ ] Tích hợp vào ProductManagement (Ctrl+S, Ctrl+N, Esc, Ctrl+/)
- [ ] Tích hợp vào RulesManagement (Ctrl+S, Ctrl+N, Esc, Ctrl+/)
- [ ] Tích hợp vào LicenseManagement (Ctrl+S, Ctrl+N, Esc, Ctrl+/)


## Phase 20 - Keyboard Shortcuts (Hoàn thành)

### Keyboard Shortcuts
- [x] Hook useKeyboardShortcuts tái sử dụng
- [x] Component KeyboardShortcutsHelp dialog
- [x] Ctrl+S: Lưu form
- [x] Ctrl+N: Tạo mới
- [x] Ctrl+Enter: Chạy phân tích
- [x] Esc: Đóng dialog
- [x] Ctrl+/: Hiển thị danh sách shortcuts
- [x] Tích hợp vào Analyze.tsx
- [x] Tích hợp vào SpcPlanManagement.tsx
- [x] Tích hợp vào Mappings.tsx
- [x] Tích hợp vào ProductManagement.tsx
- [x] Tích hợp vào RulesManagement.tsx
- [x] Tích hợp vào LicenseManagement.tsx

## Phase 21 - License Notifications & Scheduled Jobs (Hoàn thành)

### License Expiry Notifications
- [x] API checkExpiry: Kiểm tra license sắp hết hạn (7/30 ngày)
- [x] API sendExpiryNotifications: Gửi thông báo cho admin
- [x] Dashboard License Widget: Hiển thị trạng thái license cho admin
- [x] Trang quản lý License (/license-management)

### Scheduled Jobs
- [x] Cài đặt node-cron package
- [x] File scheduledJobs.ts với checkLicenseExpiry function
- [x] Cron job chạy hàng ngày lúc 8:00 AM (Asia/Ho_Chi_Minh timezone)
- [x] Gửi thông báo cho license hết hạn trong 7/30 ngày
- [x] Khởi tạo jobs trong server startup (initScheduledJobs)
- [x] Function triggerLicenseExpiryCheck cho manual trigger


## Bug Fixes - Phase 21.1

### Lỗi License key không hợp lệ trên trang /spc-report
- [x] Kiểm tra và sửa lỗi API mutation gây ra lỗi License key (đã fix)


## Phase 22 - Guided Tour, Rate Limiting và Export PDF/Excel

### Guided Tour
- [x] Cài đặt thư viện react-joyride cho guided tour
- [x] Tạo hook useGuidedTour để quản lý trạng thái tour
- [x] Tạo component GuidedTour với các bước hướng dẫn
- [x] Tích hợp tour vào Dashboard với các bước giới thiệu
- [x] Lưu trạng thái đã xem tour vào localStorage

### Rate Limiting
- [x] Cài đặt thư viện express-rate-limit
- [x] Cấu hình rate limiter cho API endpoints
- [x] Thêm middleware rate limiting vào server
- [x] Xử lý response khi vượt quá giới hạn

### Export PDF/Excel nâng cao
- [x] Nâng cấp export PDF với định dạng đẹp hơn
- [x] Thêm export Excel/PDF cho trang Analyze (phân tích đơn)
- [x] Thêm export Excel/PDF cho trang BatchAnalysis (sử dụng cùng endpoints) (phân tích đa đối tượng)
- [x] Thêm export Excel/PDF cho trang SpcReport (sử dụng cùng endpoints)nLineComparison (so sánh dây chuyền)


## Phase 23 - Multi-language Support (Đa ngôn ngữ)

### Thiết lập hệ thống i18n
- [x] Tạo file translations cho Tiếng Việt (vi.json)
- [x] Tạo file translations cho Tiếng Anh (en.json)
- [x] Tạo LanguageContext và useLanguage hook

### Tích hợp vào giao diện
- [x] Tích hợp đa ngôn ngữ vào DashboardLayout
- [x] Tích hợp đa ngôn ngữ vào Dashboard
- [x] Tích hợp đa ngôn ngữ vào Analyze (cơ bản)
- [x] Tích hợp đa ngôn ngữ vào các trang quản lý (cơ bản qua DashboardLayout)

### Language Switcher
- [x] Tạo component LanguageSwitcher
- [x] Thêm vào header/sidebar (trong user dropdown menu)
- [x] Lưu preference vào localStorage


## Phase 24 - Mở rộng Translations và Webhook Support

### Mở rộng Translations
- [x] Thêm translations cho trang Analyze
- [x] Thêm translations cho trang SpcReport
- [x] Thêm translations cho các form quản lý (Product, Mapping, Rules)
- [x] Thêm translations cho Webhook

### Webhook Support
- [x] Tạo bảng webhooks trong database
- [x] Tạo trang quản lý Webhooks
- [x] Tạo service gửi webhook notifications
- [x] Tích hợp webhook vào quy trình phân tích SPC khi có cảnh báo CPK
- [x] Hỗ trợ Slack và Microsoft Teams


## Bug Fixes - Phase 24.1

### Lỗi hệ thống treo khi thay đổi ngôn ngữ
- [ ] Kiểm tra và sửa lỗi LanguageContext/LanguageSwitcher
- [ ] Test lại chức năng thay đổi ngôn ngữ

### Rà soát hệ thống
- [ ] Rà soát toàn bộ chức năng hiện tại
- [ ] Cập nhật UPGRADE_PLAN.md với tiến độ mới nhất
- [ ] Đưa ra kế hoạch hoàn thiện hệ thống


## Phase 24.2 - Tích hợp đa ngôn ngữ vào các trang

### Dashboard
- [x] Cập nhật Dashboard.tsx để sử dụng translations
- [x] Cập nhật LicenseStatusWidget để sử dụng translations

### Analyze
- [x] Cập nhật Analyze.tsx để sử dụng translations

### Các trang khác
- [x] Cập nhật SpcReport.tsx để sử dụng translations
- [x] Cập nhật History.tsx để sử dụng translations
- [x] Cập nhật các trang quản lý để sử dụng translations (cơ bản)


## Phase 24.3 - Xuất PDF/Excel cho Phân tích SPC/CPK

### Yêu cầu
- [x] Kiểm tra chức năng xuất PDF/Excel hiện tại trong Analyze.tsx
- [x] Đảm bảo nút xuất PDF/Excel hiển thị cho cả chế độ nhập thủ công
- [x] Đảm bảo nút xuất PDF/Excel hiển thị cho chế độ từ kế hoạch SPC
- [x] Kiểm tra và sửa lỗi nếu có (71 tests pass)


## Phase 25 - Hoàn thiện SPC Plan, Template báo cáo, Sửa lỗi Export

### Sửa lỗi xuất PDF/Excel trong Nhập Thủ Công
- [x] Kiểm tra và sửa lỗi export trong chế độ nhập thủ công
- [x] Đảm bảo dữ liệu được truyền đúng khi export (sử dụng ngày hiện tại nếu không có startDate/endDate)

### Hoàn thiện tab Từ Kế hoạch SPC
- [x] Tạo mutation phân tích từ SPC Plan (analyzeFromPlan)
- [x] Lấy dữ liệu lấy mẫu từ SPC Plan samples (spc_realtime_data)
- [x] Kích hoạt nút phân tích

### Template báo cáo tùy chỉnh
- [x] Tạo bảng report_templates trong database
- [x] Tạo trang quản lý template báo cáo (ReportTemplateManagement.tsx)
- [x] Cho phép tùy chỉnh logo, header, footer
- [ ] Tích hợp template vào export PDF (cần cập nhật exportService.ts)


## Phase 26 - Template PDF, Upload Logo và Preview

### Tích hợp template vào export PDF
- [x] Cập nhật exportService.ts để lấy template mặc định
- [x] Áp dụng logo, header, footer từ template vào PDF
- [x] Áp dụng màu sắc và font từ template

### Upload logo
- [x] Thêm chức năng upload logo trực tiếp trong ReportTemplateManagement
- [x] Lưu logo lên S3 storage (/api/upload-logo endpoint)
- [x] Hiển thị logo công ty trên trang chính (Dashboard)

### Preview PDF
- [x] Thêm nút xem trước PDF trong trang Analyze (cả 3 tabs)
- [x] Tạo dialog preview PDF với iframe
- [x] Cho phép tải PDF từ preview
- [ ] Hiển thị PDF trong modal trước khi tải xuống


## Phase 27 - Lịch sử Export

### Database
- [x] Tạo bảng export_history trong database

### API
- [x] Tạo router exportHistory với các endpoints: list, getById, delete, stats
- [x] Cập nhật export mutations để lưu lịch sử vào database (pdfEnhanced, excelEnhanced)

### Frontend
- [x] Tạo trang ExportHistory.tsx với danh sách báo cáo đã xuất
- [x] Thêm chức năng xem và tải lại báo cáo
- [x] Thêm thống kê số lượng PDF/Excel đã xuất
- [x] Thêm chức năng xóa bản ghi
- [x] Thêm route và menu sidebar


## Phase 28 - S3 Storage, Bộ lọc và Email báo cáo

### Lưu file lên S3
- [x] Cập nhật pdfEnhanced để lưu file HTML lên S3
- [x] Cập nhật excelEnhanced để lưu file Excel lên S3
- [x] Cập nhật export_history với fileUrl từ S3
- [x] Cho phép tải lại file từ lịch sử

### Bộ lọc nâng cao
- [x] Thêm bộ lọc theo ngày (từ ngày - đến ngày)
- [x] Thêm bộ lọc theo loại file (PDF/Excel)
- [x] Thêm bộ lọc theo mã sản phẩm
- [x] Cập nhật UI ExportHistory với bộ lọc client-side

### Email báo cáo
- [x] Thêm nút gửi email trong trang Analyze (cả 3 tabs)
- [x] Tạo mutation sendReportEmail trong exportRouter
- [x] Tạo dialog nhập địa chỉ email với template HTML chuyên nghiệp


## Phase 29 - SMTP thực, Authentication Local, Offline Mode và Webhook Retry

### Cấu hình SMTP thực
- [x] Cài đặt nodemailer package
- [x] Cập nhật emailService.ts để sử dụng nodemailer thực
- [ ] Thêm trang cấu hình SMTP trong Settings
- [ ] Test gửi email thực

### Authentication Local (Offline)
- [x] Tạo bảng local_users với username/password
- [x] Tạo trang đăng nhập local (/local-login) với login/register tabs
- [x] Tạo API authentication local (login, register, logout, me, list, update, deactivate)
- [x] Tạo localAuthService.ts với bcrypt và JWT
- [x] Thêm biến môi trường AUTH_MODE (manus | local)
- [x] Tạo default admin user (admin/admin123)

### Rà soát Offline Mode
- [x] Kiểm tra các dependencies cần internet (LLM, S3, OAuth)
- [x] Chuyển LLM analysis về optional với fallback offline analysis
- [x] Chuyển S3 storage về local file storage (optional) với fallback tự động
- [x] Tạo file cấu hình offlineConfig.ts với các biến môi trường
- [x] Tài liệu hướng dẫn triển khai offline (trong offlineConfig.ts)

### Webhook Retry Mechanism
- [x] Thêm cột retryCount, lastRetryAt, nextRetryAt, retryStatus vào webhook_logs
- [x] Tạo hàm processWebhookRetries với exponential backoff
- [x] Thêm scheduled job chạy mỗi phút để xử lý retry
- [x] Thêm API endpoints: retryStats, processRetries, retryOne
- [x] Thêm cron job retry webhooks mỗi phút
- [x] Exponential backoff (1min, 5min, 15min, 1hour, 2hour)
- [x] Giới hạn tối đa 5 lần retry


## Phase 30 - Quản lý người dùng Local

### Trang LocalUserManagement
- [x] Tạo trang LocalUserManagement.tsx
- [x] Hiển thị danh sách người dùng local với bảng
- [x] Dialog thêm người dùng mới
- [x] Dialog sửa thông tin người dùng (tên, email, mật khẩu, vai trò)
- [x] Nút vô hiệu hóa tài khoản
- [x] Thêm route /local-users và navigation trong sidebar
- [x] Cards thống kê (tổng người dùng, admin, user)
- [x] Nút khởi tạo Admin mặc định


## Phase 31 - Offline Package, Webhook Retry Dashboard, Password Change, Login History

### Export Offline Package
- [x] Tạo script build-offline.sh để đóng gói ứng dụng
- [x] Tạo file README-OFFLINE.md hướng dẫn triển khai offline
- [x] Tạo file docker-compose.yml và Dockerfile cho triển khai
- [x] Tạo file .env.example với các biến môi trường

### Dashboard Webhook Retry
- [x] Thêm widget hiển thị số webhook pending retry
- [x] Hiển thị số webhook exhausted và tổng retry
- [x] Nút retry thủ công tất cả pending webhooks
- [x] Link đến trang Quản lý Webhook để retry từng cái

### Đổi mật khẩu bắt buộc
- [x] Thêm cột mustChangePassword vào local_users
- [x] Kiểm tra flag khi đăng nhập và trả về trong response
- [x] Tạo trang ChangePassword.tsx cho đổi mật khẩu bắt buộc
- [x] Redirect về /change-password nếu mustChangePassword = true
- [x] Thêm API changePassword và adminResetPassword

### Lịch sử đăng nhập
- [x] Tạo bảng login_history với các cột: userId, username, authType, eventType, ipAddress, userAgent
- [x] Ghi log khi đăng nhập thành công
- [x] Ghi log khi đăng nhập thất bại
- [x] Ghi log khi đăng xuất
- [x] Thêm API loginHistory và loginStats cho admin


## Phase 32 - Menu Optimization, Permissions, License System, Hybrid Activation

### Cập nhật UPGRADE_PLAN.md
- [x] Rà soát tiến độ dự án hiện tại (31 phases hoàn thành)
- [x] Cập nhật các tính năng đã hoàn thành (125 tests, 37 bảng, 30 trang)
- [x] Đưa ra kế hoạch nâng cấp tiếp theo (Phase 32-36)

### Tối ưu Menu Sidebar
- [x] Phân loại menu theo 7 nhóm chức năng (Tổng quan, Phân tích, Chất lượng, Sản xuất, Dữ liệu chính, Người dùng, Hệ thống)
- [x] Thêm collapsible groups cho menu với lưu trạng thái vào localStorage
- [x] Tối ưu hiển thị theo role người dùng (adminOnly items)
- [x] Thêm icons phù hợp cho từng nhóm (Gauge, TrendingUp, ClipboardList, Building2, Boxes, Users, ShieldCheck)

### Cập nhật Phân quyền đầy đủ
- [x] Rà soát tất cả các chức năng trong hệ thống (7 nhóm, 30+ trang)
- [x] Thêm 56 permissions mới cho tất cả chức năng
- [x] Phân nhóm permissions theo module (Dashboard, Analysis, Quality, Production, Master Data, Users, System)
- [x] Cập nhật role permissions mặc định (admin, operator, viewer, user)

### Tách License Management
- [x] Tạo licenseServer.ts - module độc lập cho License Server
- [x] API endpoints: createLicense, activateOnline, activateOffline, validateLicense, revokeLicense
- [x] Cập nhật schema licenses với các cột mới (licenseStatus, hardwareFingerprint, offlineLicenseFile, activationMode)
- [x] LicenseServer class với singleton pattern

### Hybrid Activation (Online/Offline)
- [x] Thiết kế cơ chế activation hybrid với 3 mode: online, offline, hybrid
- [x] Online activation qua License Server (activateOnline API)
- [x] Offline activation bằng file license (.lic) với signature verification
- [x] Kiểm tra và validate license với hardware fingerprint binding
- [x] Generate offline license file cho khách hàng không có internet
- [x] Thêm 6 API endpoints mới: activateOnline, generateOfflineFile, activateOffline, validate, statistics, revoke


## Phase 33 - UI Hybrid Activation, License Admin Dashboard, Login History

### Trang UI Hybrid Activation
- [x] Tạo trang LicenseActivation.tsx
- [x] Tab Online Activation (nhập license key)
- [x] Tab Offline Activation (upload file .lic)
- [x] Hiển thị hardware fingerprint với copy button
- [x] Hiển thị trạng thái license hiện tại với chi tiết (công ty, loại, ngày hết hạn, giới hạn)

### Dashboard License Admin
- [x] Tạo trang LicenseAdmin.tsx
- [x] Cards thống kê (total, by status, expiring soon)
- [x] Phân bố theo loại license (trial, standard, professional, enterprise)
- [x] Bảng danh sách licenses với copy key, view details
- [x] Actions: generate offline file, revoke, view details
- [x] Dialog tạo license mới với form đầy đủ

### Trang Lịch sử đăng nhập
- [x] Tạo trang LoginHistoryPage.tsx
- [x] Bảng hiển thị login history với icons và badges
- [x] Bộ lọc theo username, ngày, loại sự kiện, loại xác thực
- [x] Cards thống kê (tổng, login success, logout, failed)
- [x] Thêm routes và menu items trong DashboardLayout


## Phase 34 - Tổng hợp tài liệu và cải tiến License

### Tài liệu phiên bản hệ thống
- [x] Tạo file VERSION_HISTORY.md tổng hợp tất cả 33 phases
- [x] Liệt kê đầy đủ tính năng theo 7 module (35+ trang)
- [x] Thống kê số lượng (153 tests, 100+ API, 40+ bảng DB)
- [x] Đề xuất 20 ý tưởng hoàn thiện hệ thống theo 4 cấp độ

### Cải tiến License Menu
- [x] Rà soát trùng lặp menu License (3 trang → 2 trang)
- [x] Xóa trang /license-management trùng lặp
- [x] Đổi tên menu chuyên nghiệp hơn:
  - "Kích hoạt License" → "Cổng License" (License Portal)
  - "Quản lý License" → "Quản trị License" (License Administration)
- [x] Cập nhật icons phù hợp (Key cho Portal, Shield cho Admin)


## Phase 35 - Export Login History, License Renewal Email, Dark Mode

### Export Login History
- [x] Tạo API exportLoginHistory xuất ra Excel/CSV
- [x] Thêm nút Export trong trang LoginHistoryPage với dropdown
- [x] Hỗ trợ export theo bộ lọc hiện tại (username, eventType, authType, date range)
### License Renewal Email
- [x] Tạo scheduled job kiểm tra license sắp hết hạn (9:00 AM hàng ngày)
- [x] Gửi email cảnh báo khi còn 30 ngày (warning - màu vàng)
- [x] Gửi email khẩn cấp khi còn 7 ngày (urgent - màu đỏ)
- [x] Template email HTML chuyên nghiệp với thông tin license
- [x] Thêm export function triggerLicenseRenewalEmails cho testing

### Dark Mode
- [x] Cập nhật ThemeProvider hỗ trợ dark mode (switchable=true)
- [x] Thêm toggle Dark/Light trong dropdown menu của DashboardLayout
- [x] CSS variables cho dark theme đã có sẵn trong index.css
- [x] Lưu preference vào localStorage tự động


## Bug Fixes

### Registration failed on /local-users
- [x] Kiểm tra localAuth.register mutation
- [x] Sửa lỗi Registration failed - bảng local_users chưa tồn tại trong database
- [x] Tạo bảng local_users và login_history bằng SQL trực tiếp


## Phase 36 - System Setup, Database Management, Permissions Update

### Trang khởi tạo hệ thống (System Setup Wizard)
- [x] Tạo trang /setup cho lần đầu cài đặt (SystemSetup.tsx)
- [x] Step 1: Cấu hình database local (host, port, user, password, database)
- [x] Step 2: Thông tin công ty (tên, mã, địa chỉ, liên hệ)
- [x] Step 3: Tạo tài khoản Admin (username, password, email)
- [x] Lưu cấu hình vào bảng system_config và company_info
- [x] Redirect về Dashboard sau khi hoàn thành
- [x] Tạo API systemRouter với getSetupStatus, saveSetupConfig, saveCompanyInfo, completeSetup

### Quản lý Database Local
- [x] Tạo trang DatabaseSettings.tsx với 3 tabs (Kết nối, Trạng thái, Sao lưu)
- [x] Form cấu hình connection (host, port, user, password, database)
- [x] Test connection button
- [x] Lưu cấu hình vào system_config
- [x] Thêm route /database-settings và menu trong sidebar

### Cập nhật MODULES và DEFAULT_PERMISSIONS
- [x] Rà soát tất cả modules trong hệ thống (7 nhóm, 40+ modules)
- [x] Cập nhật MODULES array đầy đủ với 40 modules
- [x] Cập nhật DEFAULT_PERMISSIONS với 80+ permissions cho tất cả chức năng


## Phase 38 - Permission Middleware, Backup History, Upload Logo

### Áp dụng Permission Middleware
- [x] Thêm requirePermission() vào product router
- [x] Thêm requirePermission() vào specification router
- [x] Thêm requirePermission() vào user management router
- [x] Thêm requirePermission() vào license router
- [x] Thêm requirePermission() vào system router

### Database Backup History
- [x] Tạo bảng database_backups để lưu lịch sử
- [x] Tạo trang BackupHistory.tsx
- [x] API liệt kê danh sách backups
- [x] API tạo backup thủ công
- [x] Thêm route và menu

### Upload Logo công ty
- [x] Tạo API upload logo lên S3
- [x] Cập nhật CompanyInfo.tsx với file upload
- [x] Hiển thị preview logo sau khi upload


## Phase 39 - Scheduled Backup, Restore Backup, Export/Import Settings

### Scheduled Backup
- [x] Tạo backup scheduler service với node-cron
- [x] Cấu hình daily backup (mặc định 2:00 AM)
- [x] Cấu hình weekly backup (mặc định Chủ nhật 3:00 AM)
- [x] API để bật/tắt scheduled backup
- [x] API để thay đổi lịch backup
- [x] Lưu cấu hình schedule vào database

### Restore Backup
- [x] API khôi phục database từ backup file
- [x] Validate backup file trước khi restore
- [x] Tạo backup hiện tại trước khi restore (safety)
- [x] UI xác nhận restore với warning
- [x] Log restore history

### Export/Import Settings
- [x] API export tất cả system configs
- [x] API export company info
- [x] API export alert settings
- [x] API import settings từ JSON file
- [x] UI download/upload settings file
- [x] Validate settings trước khi import


## Bug Fixes

- [x] Fix lỗi "Cannot read properties of undefined (reading 'slice')" trong BackupHistory.tsx

## Phase 40 - Export Preview Improvements

- [x] Loading state cho Export Preview - skeleton loading
- [x] Error handling - hiển thị thông báo lỗi nếu API thất bại
- [x] Retry mechanism - nút thử lại khi không tải được dữ liệu


## Phase 41 - Quản lý kết nối Database & Data Encryption

### Quản lý kết nối Database
- [x] Đổi tên menu "Cài đặt Hệ thống" thành "Quản lý kết nối"
- [x] API lấy danh sách các bảng trong database
- [x] API xem dữ liệu trong bảng với Select Top
- [x] API sắp xếp dữ liệu theo cột
- [x] Trang UI xem thông tin kết nối
- [x] UI xem danh sách bảng và số bản ghi
- [x] UI xem dữ liệu bảng với pagination và sort

### Data Encryption
- [x] Tạo encryption service với AES-256-GCM
- [x] Mã hóa thông tin kết nối database
- [x] Mã hóa API keys và secrets
- [x] Mã hóa thông tin nhạy cảm trong settings


## Phase 42 - Quản lý Kết nối Database Bên ngoài

### Schema và Service
- [x] Cập nhật schema database_connections hỗ trợ đa loại DB
- [x] Tạo externalDatabaseService với drivers cho các loại DB
- [x] Hỗ trợ MySQL, SQL Server, Oracle, PostgreSQL
- [x] Hỗ trợ Access (.mdb/.accdb) và Excel (.xlsx/.xls)
- [x] Mã hóa thông tin kết nối nhạy cảm

### API Endpoints
- [x] API test kết nối database bên ngoài
- [x] API lấy danh sách tables từ kết nối
- [x] API lấy schema của table
- [x] API lấy dữ liệu từ table với pagination và sort
- [x] API CRUD cho quản lý kết nối

### UI Quản lý Kết nối
- [x] Form tạo/sửa kết nối với các loại DB khác nhau
- [x] Danh sách kết nối đã lưu
- [x] Chọn kết nối → Load tables
- [x] Chọn table → Xem dữ liệu
- [x] Select Top và Sort dữ liệu


## Bug Fixes - Phase 42

- [x] Fix lỗi "databaseTypes.map is not a function" trong ConnectionManager.tsx

- [x] Thêm menu "Quản lý Database" cho /database-setting vào sidebar

- [x] Gộp trang /settings và /connection-manager thành một trang với tabs
- [x] Sửa lỗi 404 khi truy cập /database-setting

## Phase 43 - Cải tiến Settings & Navigation

- [x] Nhúng trực tiếp nội dung ConnectionManager vào tab "Khám phá dữ liệu"
- [x] Đổi tên menu thành "Cài đặt & Kết nối"
- [x] Thêm breadcrumb navigation giữa các trang liên quan

## Bug Fixes - Phase 43

- [x] Fix lỗi "connections.map is not a function" trong DatabaseExplorer

## Phase 44 - Cải tiến Database Explorer

- [x] Gộp 2 tab "Database Connections" và "Khám phá dữ liệu" thành 1 tab
- [ ] Thêm kết nối database mẫu để test
- [x] Error state UI với thông báo lỗi rõ ràng
- [x] Refresh button để làm mới danh sách kết nối

## Phase 45 - Kết nối Database Mẫu

- [x] Tạo kết nối database mẫu (internal database) để người dùng thử nghiệm

## Phase 46 - Dữ liệu Mẫu và UI Cải tiến

- [x] Tạo bảng dữ liệu mẫu trong database (sample_measurements, sample_products)
- [x] Cải thiện UI chọn kết nối với nút Load để hiển thị danh sách bảng và dữ liệu

## Bug Fixes - Phase 46

- [x] Fix lỗi không xem được bảng mẫu trong Database Explorer

- [x] Fix lỗi validation databaseType - thêm "internal" vào z.enum

## Phase 47 - Test và Lọc Bảng

- [x] Test kết nối mẫu qua browser
- [x] Lọc bảng hệ thống - ẩn các bảng như migrations, sessions (sử dụng whitelist chỉ hiển thị sample_products và sample_measurements)
- [x] Sửa lỗi API calls trong DatabaseExplorer (GET method với json wrapper)
- [x] Sửa lỗi TypeScript trong externalDatabaseService.ts

## Phase 48 - Cập nhật Dữ liệu Mẫu và Hướng dẫn Triển khai

### Cập nhật dữ liệu mẫu
- [x] Lấy danh sách sản phẩm từ bảng products
- [x] Lấy danh sách công trạm từ bảng workstations
- [x] Cập nhật sample_measurements với tên sản phẩm và công trạm thực (90 bản ghi)

### Hướng dẫn triển khai Windows Server 2019
- [x] Tạo tài liệu hướng dẫn cài đặt Node.js
- [x] Hướng dẫn cài đặt MySQL/TiDB
- [x] Hướng dẫn cấu hình biến môi trường
- [x] Hướng dẫn build và chạy ứng dụng
- [x] Hướng dẫn cấu hình IIS reverse proxy (optional)
- [x] Hướng dẫn cấu hình Windows Service (PM2/NSSM)

### Sửa lỗi menu sidebar
- [x] Rà soát các trang bị mất menu trái
- [x] Sửa lỗi ConnectionManager.tsx (databaseTypes.map, connections.map)

## Phase 49 - Sửa lỗi Mapping và Thêm Loại Máy

### Sửa lỗi chọn Mapping
- [x] Kiểm tra lỗi không chọn được Mapping trong trang Analyze - nguyên nhân: không có mapping khớp với product code và station name
- [x] Sửa lỗi dropdown Mapping - tạo 18 mappings mẫu cho 6 sản phẩm x 3 trạm

### Thêm loại máy
- [x] Thêm trường machineTypeId vào bảng machines (đã có sẵn trong schema)
- [x] Cập nhật UI quản lý máy với dropdown loại máy (MachineManagement.tsx)
- [x] Cập nhật API machine.create và machine.update để hỗ trợ machineTypeId
- [x] Hiển thị loại máy trong danh sách máy của dây chuyền (ProductionLineManagement.tsx)
- [x] Thêm loại máy vào cấu hình dây chuyền sản xuất (hiển thị badge loại máy trong danh sách máy)

## Phase 50 - Thêm Loại Máy và Test SPC

### Thêm loại máy mới
- [x] Tạo loại máy: Máy Gắn Chip (CHIP_MOUNTER)
- [x] Tạo loại máy: Máy Kiểm Tra AOI (AOI)
- [x] Tạo loại máy: Máy Reflow (REFLOW)
- [x] Tạo loại máy: Máy Hàn Sóng (WAVE_SOLDER)
- [x] Tạo loại máy: Máy Kiểm Tra SPI (SPI)

### Test phân tích SPC
- [x] Chọn mapping và chạy phân tích SPC - thành công với PCB-001 + Solder Paste Printing
- [x] Kiểm tra kết quả CPK/SPC - CPK=-0.047, Cp=5.128, X̄=25.0045, σ=0.0304, 5 mẫu

### Gán máy vào dây chuyền
- [x] Tạo máy mới với loại máy - Máy Gắn Chip SMT (MC02) với loại CHIP_MOUNTER
- [x] Gán máy vào dây chuyền sản xuất - LINE 01 có 2 máy (MC01, MC02)
- [x] Kiểm tra badge loại máy hiển thị - Badge "Máy Hàn" và "Máy Gắn Chip" hiển thị đúng

## Phase 50 - Thêm Loại Máy và Test SPC

### Thêm loại máy mới
- [x] Tạo loại máy: Máy Gắn Chip (CHIP_MOUNTER)
- [x] Tạo loại máy: Máy Kiểm Tra AOI (AOI)
- [x] Tạo loại máy: Máy Reflow (REFLOW)
- [x] Tạo loại máy: Máy Hàn Sóng (WAVE_SOLDER)
- [x] Tạo loại máy: Máy Kiểm Tra SPI (SPI)

### Test phân tích SPC
- [x] Chọn mapping và chạy phân tích SPC - thành công với PCB-001 + Solder Paste Printing
- [x] Kiểm tra kết quả CPK/SPC - CPK=-0.047, Cp=5.128, X̄=25.0045, σ=0.0304, 5 mẫu

### Gán máy vào dây chuyền
- [x] Tạo máy mới với loại máy - Máy Gắn Chip SMT (MC02) với loại CHIP_MOUNTER
- [x] Gán máy vào dây chuyền sản xuất - LINE 01 có 2 máy (MC01, MC02)
- [x] Kiểm tra badge loại máy hiển thị - Badge "Máy Hàn" và "Máy Gắn Chip" hiển thị đúng

## Phase 51 - Đăng nhập Local từ trang Home

### Nâng cấp đăng nhập local
- [x] Phân tích hệ thống đăng nhập hiện tại - đã có LocalLogin.tsx và API localAuth.login
- [x] Cập nhật trang Home với form đăng nhập local (username/password) - thêm form login/register trực tiếp trên trang chủ
- [x] Tạo API đăng nhập local với xác thực password - đã có sẵn localAuth.login và localAuth.register
- [x] Tích hợp session/JWT cho đăng nhập local - đã có sẵn trong localAuthService.ts
- [x] Test chức năng đăng nhập không cần internet - form đăng nhập hiển thị trên trang chủ, API hoạt động đúng

## Phase 52 - Sửa lỗi Đăng nhập Local

### Sửa lỗi Invalid username or password
- [x] Kiểm tra tài khoản admin trong database - không có user admin
- [x] Tạo/cập nhật tài khoản admin mặc định với password đúng - đã tạo admin/admin123
- [x] Test đăng nhập thành công - đăng nhập với admin/admin123 thành công, redirect về dashboard

## Phase 53 - Cải tiến User và Dashboard

### Quản lý User
- [x] Đổi mật khẩu admin sang mật khẩu mạnh hơn - Admin@2024!
- [x] Tạo tài khoản operator với role "user" - operator / Operator@2024
- [x] Tạo tài khoản viewer với role "user" - viewer / Viewer@2024

### Thêm nút Đăng xuất
- [x] Thêm nút Đăng xuất vào sidebar - nút riêng biệt bên dưới user dropdown

### Bố trí lại Dashboard
- [x] Tách License card ra khỏi nhóm Quick Actions - thành nhóm "System Status" riêng
- [x] Tách Webhook card ra khỏi nhóm - nằm cạnh License trong 2 cột
- [x] Tạo layout cân xứng cho Dashboard - Quick Actions full width, System Status 2 cột

## Phase 54 - Phân quyền, Profile và Audit Logs

### Phân quyền chi tiết
- [x] Sử dụng cơ chế adminOnly đã có sẵn trong DashboardLayout
- [x] Giới hạn operator chỉ xem được phân tích, không thay đổi cấu hình
- [x] Ẩn menu Production, Master Data, Settings với user role "user"

### Trang Profile
- [x] Tạo trang /profile cho user - với 2 tab: Thông tin cá nhân và Bảo mật
- [x] Cho phép user tự đổi mật khẩu - sử dụng API localAuth.changePassword
- [x] Cho phép user cập nhật thông tin cá nhân (tên, email) - API localAuth.updateProfile

### Nâng cấp Audit Logs
- [x] Thêm cột authType vào bảng audit_logs - phân biệt local và online
- [x] Cập nhật UI hiển thị cột Loại (Local/Online) trong bảng nhật ký
- [x] Đã có sẵn hàm logLoginEvent ghi lịch sử đăng nhập với authType

## Phase 55 - Ảnh đại diện (Avatar)

### Thêm Avatar
- [x] Thêm cột avatar vào bảng users và local_users
- [x] Tạo API upload avatar lên S3 - sử dụng storagePut có sẵn
- [x] Tạo API cập nhật avatar cho user - localAuth.updateAvatar
- [x] Cập nhật trang Profile với chức năng upload avatar - nút camera trên avatar
- [x] Hiển thị avatar trên sidebar/navigation - sử dụng AvatarImage trong SidebarFooter

## Phase 56 - Cải tiến Avatar

### Test và Cải tiến Avatar
- [x] Test upload avatar qua browser - trang Profile hiển thị đúng với nút camera
- [x] Thêm bộ avatar mặc định để user chọn - 12 avatar từ DiceBear API
- [x] Thêm chức năng crop ảnh thành hình vuông trước khi upload - sử dụng react-image-crop

## Phase 57 - Quan hệ Dữ liệu và Ảnh Thực thể

### Cập nhật quan hệ dữ liệu
- [x] Thêm cột processId và productId vào bảng production_lines - đã có sẵn
- [x] Tạo ràng buộc: 1 dây chuyền = 1 quy trình + 1 sản phẩm - logic trong schema
- [ ] Cập nhật UI ProductionLine để chọn quy trình và sản phẩm

### Tiêu chuẩn đo theo Sản phẩm-Công trạm-Máy
- [x] Tạo bảng product_station_machine_standards
- [x] Lưu tiêu chuẩn đo (USL, LSL, Target) - cột usl, lsl, target
- [x] Lưu phương pháp lấy mẫu (sample size, frequency) - cột sampleSize, sampleFrequency, samplingMethod
- [x] Lưu cài đặt SPC Rule (Western Electric rules) - cột appliedSpcRules (JSON array)

### Thêm ảnh cho các thực thể
- [x] Thêm cột imageUrl vào bảng production_lines
- [x] Thêm cột imageUrl vào bảng machines
- [x] Thêm cột imageUrl vào bảng jigs (bảng mới)
- [x] Thêm cột imageUrl vào bảng workstations
- [x] Thêm cột imageUrl vào bảng process_templates

### Cập nhật UI với upload ảnh
- [x] Thêm chức năng upload ảnh cho Dây chuyền (ProductionLineManagement.tsx)
- [ ] Thêm chức năng upload ảnh cho Máy
- [ ] Thêm chức năng upload ảnh cho Jig
- [ ] Thêm chức năng upload ảnh cho Công trạm
- [ ] Thêm chức năng upload ảnh cho Quy trình

### Trực quan hóa SPC Plan
- [ ] Hiển thị ảnh thay cho icon mặc định
- [ ] Cải thiện giao diện SPC Plan Overview

## Phase 58 - Upload Ảnh, Tiêu chuẩn đo và Trực quan hóa SPC Plan

### Upload ảnh cho các thực thể
- [x] Thêm upload ảnh cho Máy (MachineManagement.tsx)
- [x] Thêm upload ảnh cho Công trạm (WorkstationManagement.tsx)
- [x] Thêm upload ảnh cho Quy trình (ProcessTemplateManagement.tsx)
- [x] Cập nhật API machine.create/update với imageUrl
- [x] Cập nhật API workstation.create/update với imageUrl
- [x] Cập nhật API processTemplate.create/update với imageUrl

### Trang quản lý Tiêu chuẩn đo
- [x] Tạo trang MeasurementStandards.tsx
- [x] Hiển thị danh sách tiêu chuẩn theo Sản phẩm-Công trạm-Máy
- [x] Form thêm/sửa tiêu chuẩn (USL, LSL, Target)
- [x] Cấu hình phương pháp lấy mẫu (sampleSize, sampleFrequency)
- [x] Cấu hình SPC Rules áp dụng (checkboxes)
- [x] Thêm route và menu vào sidebar

### Trực quan hóa SPC Plan
- [x] Hiển thị ảnh Dây chuyền trong SPC Plan
- [x] Hiển thị ảnh Máy trong SPC Plan
- [x] Hiển thị ảnh Công trạm trong SPC Plan
- [x] Cải thiện giao diện card SPC Plan với ảnh


## Phase 59: Upload ảnh Dây chuyền, Tích hợp Tiêu chuẩn đo, Dashboard thống kê

### Upload ảnh cho Dây chuyền sản xuất
- [x] Thêm upload ảnh vào ProductionLineManagement.tsx (đã có sẵn)
- [x] Cập nhật API productionLine.create/update với imageUrl (đã có sẵn)
- [x] Hiển thị ảnh trong danh sách và form (đã có sẵn)

### Tích hợp Tiêu chuẩn đo với SPC Plan
- [x] Thêm dropdown chọn Tiêu chuẩn đo trong SpcPlanManagement
- [x] Tự động điền Sản phẩm, Công trạm, Máy từ Tiêu chuẩn đo
- [x] Tự động áp dụng SPC Rules từ Tiêu chuẩn đo
- [x] Cập nhật form SPC Plan với measurementStandardId

### Dashboard thống kê Tiêu chuẩn đo
- [x] Tạo trang MeasurementStandardsDashboard.tsx
- [x] Hiển thị tổng quan số lượng tiêu chuẩn theo trạng thái
- [x] Biểu đồ phân bố tiêu chuẩn theo Sản phẩm/Công trạm
- [x] Danh sách tiêu chuẩn cần xem xét (filter incomplete)
- [x] Thêm route và menu vào sidebar


## Phase 60: Tối ưu cấu trúc dữ liệu và quy trình tạo SPC Plan

### Phân tích và thiết kế
- [x] Phân tích các bảng hiện tại: product_station_machine_standards, product_specifications, sampling_configs, spc_rules, cpk_rules, ca_rules
- [x] Thiết kế: Sử dụng bảng product_station_machine_standards làm bảng chính, thêm các trường appliedCpkRules, appliedCaRules

### Cập nhật bảng Tiêu chuẩn đo lường
- [x] Đảm bảo bảng product_station_machine_standards chứa đầy đủ: USL/LSL/Target, sampleSize, sampleFrequency, samplingMethod, appliedSpcRules, appliedCpkRules, appliedCaRules
- [x] Thêm các trường appliedCpkRules, appliedCaRules vào schema và database

### Tối ưu form tạo SPC Plan
- [x] Đơn giản hóa form SPC Plan - tạo trang QuickSpcPlan.tsx
- [x] Tự động điền tất cả thông tin từ Tiêu chuẩn đo: Sản phẩm, Công trạm, Máy, Rules
- [x] Thêm trang "Tạo nhanh SPC Plan" với 3 bước đơn giản
- [x] Hiển thị preview thông tin trước khi tạo

### Cập nhật giao diện quản lý Tiêu chuẩn đo
- [x] Cải thiện form Tiêu chuẩn đo - thêm measurementName, unit, CPK/CA Rules
- [x] Thêm tab CPK/CA để cấu hình ngưỡng và rules
- [x] Cập nhật API create/update với các trường mới
- [ ] Hiển thị đầy đủ thông tin trong danh sách


## Phase 61: Cải thiện lấy mẫu, Template, Import Excel, Tạo SPC Plan hàng loạt

### Cải thiện mục lấy mẫu
- [x] Thêm nhiều đơn vị thời gian cho tần suất lấy mẫu (năm, tháng, tuần, ngày, giờ, phút, giây)
- [x] Thêm chú thích chi tiết cho từng phương pháp lấy mẫu (description + useCase)
- [x] Thêm 2 phương pháp mới: AQL và Skip-lot
- [x] Cập nhật UI form Tiêu chuẩn đo với đơn vị thời gian và hiển thị chú thích

### Template Tiêu chuẩn đo
- [x] Tạo chức năng sao chép tiêu chuẩn đo (nút Copy trong bảng)
- [x] Cho phép chọn sản phẩm/công trạm/máy đích để sao chép
- [x] Giữ nguyên các thông số và rules khi sao chép

### Import Tiêu chuẩn đo từ Excel
- [x] Tạo template CSV mẫu để download (với hướng dẫn chi tiết)
- [x] Tạo chức năng upload và parse file CSV
- [x] Validate dữ liệu trước khi import (kiểm tra sản phẩm, công trạm, máy)
- [x] Hiển thị preview và xác nhận trước khi lưu

### Tạo SPC Plan hàng loạt
- [x] Cho phép chọn nhiều Tiêu chuẩn đo cùng lúc (toggle batch mode)
- [x] Tạo wizard tạo SPC Plan hàng loạt (3 bước)
- [x] Hiển thị progress khi tạo nhiều kế hoạch
- [x] Báo cáo kết quả tạo hàng loạt (success/failed)

## Phase 62: Export, Validation Rules, Dashboard CPK, Đồng nhất trang

### Export Tiêu chuẩn đo ra Excel
- [x] Thêm nút Export Excel vào trang MeasurementStandards
- [x] Tạo file CSV/Excel với tất cả dữ liệu tiêu chuẩn
- [x] Bao gồm tên sản phẩm, công trạm, máy thay vì chỉ ID

### Validation Rules tùy chỉnh
- [x] Tạo bảng custom_validation_rules trong schema
- [x] Tạo trang quản lý Validation Rules (ValidationRulesManagement.tsx)
- [x] Cho phép định nghĩa quy tắc kiểm tra riêng cho từng sản phẩm
- [x] Hỗ trợ 6 loại quy tắc: range_check, trend_check, pattern_check, comparison_check, formula_check, custom_script

### Dashboard so sánh hiệu suất CPK
- [x] Tạo trang CpkComparisonDashboard.tsx
- [x] Biểu đồ so sánh CPK giữa các dây chuyền
- [x] Biểu đồ so sánh CPK giữa các công trạm
- [x] Biểu đồ xu hướng CPK theo thời gian
- [x] Bảng xếp hạng CPK với đánh giá

### Đồng nhất các trang Tiêu chuẩn
- [x] Phân tích các trang: MeasurementStandards, ProductSpecifications, SamplingConfig
- [x] Gộp các chức năng vào MeasurementStandards (USL/LSL, Sampling, SPC Rules)
- [x] Tạo navigation breadcrumb giữa các trang liên quan
- [x] Cập nhật sidebar menu - gỡ bỏ các trang trùng lặp


## Phase 63: SPC Plan Logic, CPK Alert, Validation Integration, Trend Chart

### Thay đổi logic tạo SPC Plan theo Tiêu chuẩn đo lường
- [x] Cập nhật SpcPlanManagement.tsx để tạo SPC Plan từ Tiêu chuẩn đo
- [x] Tự động điền đầy đủ thông tin: tên, sản phẩm, công trạm, máy, dây chuyền, mapping, rules
- [x] Liên kết SPC Plan với measurementStandardId

### Cảnh báo tự động khi CPK thấp
- [x] Tích hợp notifyCpkWarning vào spc.analyze và spc.analyzeWithMapping
- [x] Gửi email notification khi CPK dưới ngưỡng
- [x] Gửi notification đến owner và trigger webhooks

### Tích hợp Validation Rules vào phân tích SPC
- [x] Thêm logic kiểm tra Validation Rules trong spc.analyze
- [x] Hỗ trợ range_check, trend_check, formula_check
- [x] Trả về validationResults trong kết quả phân tích

### Biểu đồ trend CPK cho Tiêu chuẩn đo
- [x] Thêm nút xem xu hướng CPK trong bảng tiêu chuẩn
- [x] Hiển thị dialog với biểu đồ SVG trend CPK
- [x] Hiển thị summary cards (CPK hiện tại, trung bình, xu hướng)
- [x] Hiển thị bảng lịch sử phân tích chi tiết
- [ ] Cho phép xem chi tiết trend khi click vào tiêu chuẩn


## Phase 64: Tối ưu SPC Plan, Notification Realtime, So sánh CPK theo ca

### Tối ưu Tạo kế hoạch SPC
- [x] Giảm thông tin trùng lặp - tự động điền từ Tiêu chuẩn đo (đã có sẵn)
- [x] Cập nhật form để tự động điền từ Tiêu chuẩn đo đã chọn (đã có sẵn)
- [x] Hỗ trợ gửi email thông báo cho nhiều người (danh sách email cách nhau bằng dấu phẩy)

### Kiểm tra Trực quan SPC Plan
- [x] Kiểm tra hiển thị CPK trong SPC Plan Overview - đã có (CPK: N/A khi chưa có dữ liệu)
- [x] Kiểm tra hiển thị ảnh trạm trong SPC Plan Overview - code đã có, cần upload ảnh
- [x] Kiểm tra hiển thị ảnh máy trong SPC Plan Overview - code đã có, cần upload ảnh

### Notification Realtime
- [x] Tạo NotificationBell component với store global
- [x] Hiển thị notification bell trên header của DashboardLayout
- [x] Tích hợp với SseNotificationProvider để nhận thông báo realtime
- [x] Hiển thị badge số thông báo chưa đọc
- [ ] Hiển thị cảnh báo CPK realtime khi có vi phạm

### So sánh CPK theo ca làm việc
- [x] Tạo trang ShiftCpkComparison.tsx
- [x] Định nghĩa 3 ca làm việc mặc định (sáng, chiều, đêm)
- [x] Phân tích CPK theo ca từ lịch sử phân tích
- [x] Hiển thị summary cards cho từng ca
- [x] Bảng chi tiết CPK theo ngày và ca
- [x] Phân tích & khuyến nghị (ca tốt nhất, ca cần cải thiện)
- [x] Thêm route và menu vào sidebar
- [ ] Thêm shiftId vào SPC analysis
- [ ] Tạo trang so sánh CPK theo ca
- [ ] Biểu đồ so sánh CPK giữa các ca


## Phase 65: Dashboard Validation Rules, Menu Chất lượng

### Tích hợp Validation Rules vào dashboard
- [x] Thêm card hiển thị số lượng rules đang hoạt động
- [x] Card có link đến trang /validation-rules
- [x] Thêm vào dropdown tùy chỉnh widget

### Sửa tên menu nhóm Chất lượng
- [x] Rà soát các menu trong nhóm Quality
- [x] Đổi tên cho phù hợp với chức năng thực tế:
  - errorManagement → defectTracking (Theo dõi Lỗi)
  - paretoChart → defectAnalysis (Phân tích Lỗi Pareto)
  - rulesManagement → spcRulesConfig (Cấu hình SPC Rules)
  - validationRules → customValidation (Kiểm tra Tùy chỉnh)
  - cpkComparison → cpkBenchmark (So sánh CPK)
  - shiftCpkComparison → shiftAnalysis (Phân tích theo Ca)


## Phase 66: Sparkline, Wizard, Menu Fix

### Biểu đồ mini sparkline cho Validation Rules
- [x] Tạo API lấy số vi phạm gần đây theo ngày (getValidationViolationsByDay, getRecentViolations)
- [x] Tạo component Sparkline SVG đơn giản (Sparkline.tsx)
- [x] Tạo component ValidationRulesCard với sparkline
- [x] Tích hợp vào Dashboard trong phần System Status

### Wizard hướng dẫn cấu hình Validation Rules
- [x] Tạo component ValidationRulesWizard (4 bước)
- [x] Bước 1: Chọn sản phẩm và công trạm
- [x] Bước 2: Chọn loại rule (range, trend, pattern, comparison, formula, custom)
- [x] Bước 3: Cấu hình thông số rule và đặt tên
- [x] Bước 4: Xác nhận và lưu
- [x] Thêm nút "Hướng dẫn tạo" vào trang ValidationRulesManagement

### Rà soát và sửa các page đang ẩn menu trái
- [x] Tìm các page không có DashboardLayout
- [x] Sửa WebhookManagement.tsx - thêm DashboardLayout
- [x] Sửa ChangePassword.tsx - thêm DashboardLayout
- [x] Sửa ComponentShowcase.tsx - thêm DashboardLayout
- [x] Các page khác (Home, LocalLogin, NotFound, SystemSetup) không cần sidebar (là trang public)


## Phase 67: Hướng dẫn sử dụng hệ thống

### Tài liệu Hướng dẫn sử dụng
- [x] Phân tích cấu trúc hệ thống và thu thập thông tin các chức năng
- [x] Viết nội dung Hướng dẫn sử dụng chi tiết (Markdown)
- [x] Xuất file PDF để training người dùng (docs/USER_GUIDE.pdf)


## Phase 68: Rà soát Hệ thống và Nâng cấp License Server

### Rà soát và Đánh giá Hệ thống
- [x] Rà soát toàn diện logic hệ thống (40+ trang, 30+ bảng, 4200+ dòng router)
- [x] Đánh giá mức độ hoàn thiện từng module (85% - Production Ready)
- [x] Xây dựng kế hoạch nâng cấp chuyên nghiệp (SYSTEM_ASSESSMENT_AND_UPGRADE_PLAN.md)

### Nâng cấp License Hybrid
- [x] Kiểm tra logic License Hybrid hiện tại (online/offline activation)
- [x] Thiết kế License Server cho nhà cung cấp
- [x] Tạo trang quản trị License Server Portal (LicenseServerPortal.tsx)
- [x] Triển khai xác thực license online với retry (validateWithRetry API)
- [x] Tích hợp heartbeat định kỳ 24h
- [x] Thêm bảng license_heartbeats và license_customers
- [x] Thêm các API: bulkCreate, exportToCsv, updateLicense, extendExpiration, transferLicense
- [x] Cập nhật LicenseActivation với trạng thái validation và nút xác thực online


## Phase 69: Nhóm License Server và Quản lý Khách hàng

### Gộp trang License và tạo nhóm mới
- [x] Gộp LicenseManagement với các chức năng Server Portal (tabs: Danh sách, Tạo mới, Thống kê)
- [x] Tạo nhóm menu mới "License Server" (Admin only) trong DashboardLayout
- [x] Di chuyển các trang license vào nhóm mới (Quản lý License, Khách hàng, Doanh thu)
- [x] Xóa route và import LicenseServerPortal không cần thiết

### Trang Customer Management
- [x] Tạo API CRUD cho license_customers (licenseCustomer router)
- [x] Tạo trang LicenseCustomers.tsx với đầy đủ chức năng CRUD
- [x] Liên kết khách hàng với license (hiển thị số license theo công ty)
- [x] Thêm vào nhóm License Server

### Báo cáo doanh thu License
- [x] Tạo trang LicenseRevenue.tsx với thống kê doanh thu
- [x] Biểu đồ doanh thu theo tháng/quý/năm (AreaChart, PieChart, BarChart)
- [x] Thống kê theo loại license và top 10 khách hàng
- [x] Xuất CSV báo cáo doanh thu
- [x] Thêm vào nhóm License Server

### Webhook thông báo License
- [x] Thêm event types: license_expiring, license_expired, license_revoked
- [x] Tích hợp webhook vào scheduled job checkLicenseExpiry
- [x] Gửi webhook khi license sắp hết hạn (7 ngày)
- [x] Gửi webhook khi license đã hết hạn
- [x] Format payload cho Slack và Teams (formatSlackPayload, formatTeamsPayload)


## Phase 70: License Server Database Riêng và API

### Thiết kế License Database riêng
- [x] Tạo schema cho License Server Database (licenses, customers, heartbeats, activations, audit_logs)
- [x] Tạo module licenseServerDb.ts để quản lý kết nối database riêng
- [x] Lưu cấu hình kết nối License DB vào system_settings

### Trang cài đặt License Server
- [x] Tạo trang LicenseServerSettings.tsx với 3 tabs (Connection, Status, API)
- [x] Form cấu hình connection string cho License Database
- [x] Nút test connection và khởi tạo schema
- [x] Thêm vào nhóm License Server trong menu

### API License Server cho Client
- [x] API validate license (licenseServer.validateLicense)
- [x] API activate license (licenseServer.activateLicense)
- [x] API heartbeat (licenseServer.heartbeat)
- [x] API check license status (licenseServer.getLicenseStatus)
- [x] API deactivate license (licenseServer.deactivateLicense)
- [x] API create license (licenseServer.createLicense)
- [x] API list licenses (licenseServer.listLicenses)

### Cập nhật tab License trong Thông Tin Hệ Thống
- [x] Thêm card hiển thị trạng thái kết nối License Server
- [x] Tự động tạo Device ID cho thiết bị
- [x] Xác thực license online với License Server khi kích hoạt
- [x] Gửi heartbeat định kỳ mỗi giờ khi đã kết nối
- [x] Hiển thị trạng thái kết nối (connected/disconnected/checking)


## Phase 71: License Server Dashboard, Revoke và Public API

### Dashboard License Server
- [x] Tạo trang LicenseServerDashboard.tsx với thống kê đầy đủ
- [x] Hiển thị số license đang online (có heartbeat trong 2 giờ)
- [x] Hiển thị license sắp hết hạn (7, 30 ngày) với badge cảnh báo
- [x] Biểu đồ xu hướng activation (AreaChart)
- [x] Biểu đồ phân bố theo loại license (PieChart)
- [x] Danh sách license online realtime với thời gian heartbeat
- [x] Thêm menu Dashboard Server vào nhóm License Server

### Revoke License từ xa
- [x] Thêm API revokeLicense vào licenseServer router
- [x] Thêm API bulkRevokeLicenses cho revoke hàng loạt
- [x] Thêm API checkRevoked cho Client kiểm tra
- [x] Thêm hàm revokeLicense, checkLicenseRevoked, restoreLicense vào licenseServerDb
- [x] Gửi webhook thông báo khi license bị revoke (triggerWebhooks)
- [x] Log revoke vào audit_logs

### API Public cho Client
- [x] GET /api/license-public/check/:key - Kiểm tra trạng thái license
- [x] GET /api/license-public/validate/:key/:deviceId - Validate license với device
- [x] POST /api/license-public/activate - Kích hoạt license
- [x] POST /api/license-public/heartbeat - Gửi heartbeat
- [x] GET /api/license-public/revoked/:key - Kiểm tra license bị revoke
- [x] Không yêu cầu authentication
- [x] Trả về thông tin sanitized (không lộ internal IDs)


## Phase 72: Nâng cấp Hệ thống theo SYSTEM_ASSESSMENT_AND_UPGRADE_PLAN.md

### Phase 2: Tối ưu Hiệu suất
- [x] Thêm indexes cho các bảng lớn (spc_analysis_history, spc_realtime_data, defects, audit_logs, login_history)
- [x] Mở rộng caching layer cho dữ liệu tĩnh (server/_core/cache.ts)
- [x] Pagination đồng nhất cho tất cả danh sách
- [x] Lazy loading cho biểu đồ nặng
- [x] Query optimization cho các query phức tạp

### Phase 3: Nâng cao Bảo mật
- [x] Rate limiting đã có - kiểm tra và cải thiện (server/_core/rateLimiter.ts)
- [x] Mã hóa connection strings trong database (AES encryption)
- [x] Mở rộng audit log với 8 action types mới (import, backup, restore, config_change, permission_change, license_activate, license_revoke, api_access)
- [x] Session management cải tiến

### Phase 4: Cải tiến UX/UI
- [x] Real-time form validation
- [x] Đồng nhất loading states (LoadingState.tsx component)
- [x] Cải thiện mobile responsive
- [ ] Keyboard shortcuts cho các thao tác phổ biến (chưa hoàn thành)

### Phase 5: Tính năng Nâng cao
- [x] Multi-language support i18n (client/src/lib/i18n.ts - Vi/En)
- [x] API documentation trong SYSTEM_ASSESSMENT_AND_UPGRADE_PLAN.md
- [x] Batch analysis improvements (MultiAnalysis.tsx)

### Dashboard dây chuyền RealTime
- [x] Thiết kế kiến trúc kết nối máy trực tiếp (REALTIME_LINE_DASHBOARD_DESIGN.md)
- [x] Tạo trang RealtimeLineDashboard.tsx với demo mode
- [x] Tạo schema database (realtime_machine_connections, realtime_data_buffer, realtime_alerts)
- [x] Tính SPC/CPK theo thời gian thực (sliding window algorithm)
- [x] Biểu đồ Control Chart realtime (X-bar chart với UCL/LCL)
- [x] Cảnh báo tức thì khi vi phạm SPC Rules (AlertsPanel)
- [x] Thêm menu Dashboard RealTime vào sidebar
