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
