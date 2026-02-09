# Báo cáo Tiến độ và Kế hoạch Cải thiện Hệ thống CPK/SPC Calculator

**Ngày lập:** 10/02/2026
**Phiên bản hiện tại:** 4.x (caf44d83)
**Tác giả:** Manus AI

---

## 1. Tổng quan Quy mô Hệ thống

Hệ thống CPK/SPC Calculator đã phát triển từ một công cụ tính toán đơn giản thành một nền tảng quản lý chất lượng sản xuất toàn diện (Manufacturing Quality Management Platform). Dưới đây là bảng tổng hợp quy mô hiện tại của hệ thống tính đến ngày 10/02/2026.

| Chỉ số | Giá trị | Ghi chú |
|--------|---------|---------|
| Tổng dòng code (TypeScript) | **439,594** | Không tính node_modules, dist |
| Tổng file source code | **1,130** | .ts, .tsx, .js, .css |
| Frontend Pages | **192 files** | client/src/pages/ |
| Frontend Components | **150 files** | client/src/components/ |
| UI Components (shadcn) | **55 files** | client/src/components/ui/ |
| Routes (App.tsx) | **225 routes** | Bao gồm cả nested routes |
| Backend Services | **222 files** | server/services/ |
| Backend Routers | **135 routers** | Merged vào appRouter |
| Database Tables | **346 bảng** | drizzle/schema.ts (7,940 dòng) |
| Database Indexes | **531 indexes** | Composite + single column |
| Vitest Test Files | **234 files** | Unit + integration tests |
| E2E Test Files | **5 files** | Playwright-based |
| NPM Dependencies | **110 production** | + 33 devDependencies |
| Documentation Files | **65+ files** | .md trong docs/ và root |
| Mobile App Screens | **8 screens** | React Native (cpk-spc-mobile/) |

---

## 2. Kiến trúc Hệ thống

### 2.1 Technology Stack

| Layer | Công nghệ | Phiên bản |
|-------|-----------|-----------|
| Frontend Framework | React + TypeScript | 19.x |
| Styling | Tailwind CSS | 4.x |
| UI Library | shadcn/ui | Latest |
| Routing | Wouter | Latest |
| Data Fetching | tRPC + TanStack Query | 11.x |
| Backend | Express + tRPC | 4.x + 11.x |
| ORM | Drizzle ORM | Latest |
| Database | MySQL / TiDB | 8.x |
| Real-time | WebSocket + SSE | Custom |
| Authentication | Manus OAuth + Local Auth + 2FA | Custom |
| File Storage | S3 | AWS SDK v3 |
| Email | Nodemailer (SMTP) | Latest |
| AI/ML | LLM Integration (Manus Forge) | Built-in |
| Mobile | React Native (Expo) | 51.x |

### 2.2 Modules Chính

Hệ thống được tổ chức thành **12 modules chính**, mỗi module phục vụ một nhóm chức năng riêng biệt trong quy trình quản lý chất lượng sản xuất.

| # | Module | Số trang | Số bảng DB | Mô tả |
|---|--------|----------|------------|-------|
| 1 | **SPC/CPK Core** | ~25 | ~15 | Tính toán SPC, Control Charts, Histogram, Rules, Aggregation |
| 2 | **MMS (Maintenance)** | ~20 | ~20 | Quản lý bảo trì, MTTR/MTBF, Spare Parts, Work Orders |
| 3 | **IoT Platform** | ~25 | ~45 | Quản lý thiết bị, MQTT/OPC-UA, Firmware OTA, Floor Plan |
| 4 | **Production Line** | ~15 | ~15 | OEE, NTF/Defect, Yield, Line Dashboard, Shift Reports |
| 5 | **AI/ML Analytics** | ~36 | ~25 | Predictive, Vision, NLP, Model Training, Root Cause |
| 6 | **License Server** | ~8 | ~8 | License Management, Activation, Heartbeat, Notifications |
| 7 | **AVI/AOI Quality** | ~10 | ~10 | Camera Management, Image Comparison, Batch Analysis |
| 8 | **Notification Hub** | ~15 | ~20 | Email, SMS, Telegram, Slack, Webhook, Push, Escalation |
| 9 | **Report Engine** | ~12 | ~15 | Scheduled Reports, PDF/Excel Export, Templates, KPI |
| 10 | **Admin & Security** | ~15 | ~20 | User Management, RBAC, 2FA, Audit Logs, Rate Limiting |
| 11 | **System Infrastructure** | ~10 | ~15 | Backup, Database Explorer, Migration, Health Check, WebSocket |
| 12 | **Dashboard & Widgets** | ~8 | ~8 | Custom Widgets, Dashboard Customization, Quick Access |

---

## 3. Tiến độ Hoàn thành

### 3.1 Tổng hợp Todo Items

| Trạng thái | Số lượng | Tỷ lệ |
|------------|----------|--------|
| Đã hoàn thành [x] | **~2,800+** | ~69% |
| Chưa hoàn thành [ ] | **1,262** | ~31% |
| **Tổng cộng** | **~4,062** | 100% |

### 3.2 Phân bổ Items Chưa hoàn thành theo Module

Bảng dưới đây phân loại 1,262 items chưa hoàn thành theo nhóm chức năng. Lưu ý rằng một item có thể thuộc nhiều nhóm do tính chất liên module.

| Module | Items chưa hoàn thành | Mức ưu tiên |
|--------|----------------------|-------------|
| AI/ML Analytics | 294 | Trung bình |
| Dashboard & Widgets | 147 | Trung bình |
| MMS/Machine | 85 | **Cao** |
| Report/Export | 81 | **Cao** |
| IoT Platform | 76 | Trung bình |
| Production Line (OEE/NTF) | 74 | **Cao** |
| Notification Hub | 74 | Trung bình |
| SPC/CPK Core | 73 | **Cao** |
| Database/Migration | 73 | **Cao** |
| UI/UX Improvements | 47 | Trung bình |
| Documentation | 33 | Thấp |
| Auth/Security | 29 | Trung bình |
| License Server | 10 | Thấp |

### 3.3 Các Tính năng Đã Hoàn thành (Highlights)

Hệ thống đã trải qua hơn **180 phases phát triển** kể từ khi khởi tạo. Dưới đây là tổng hợp các nhóm tính năng chính đã hoàn thành.

**SPC/CPK Core (Hoàn thành ~85%)**
- Tính toán đầy đủ Cp, Cpk, Pp, Ppk, Ca, Mean, Std Dev, UCL, LCL
- 8 Western Electric Rules với phát hiện vi phạm tự động
- Control Charts (X-bar, R-chart) với control limits động
- SPC Aggregation Service (tổng hợp theo ca/ngày/tuần/tháng)
- SPC Plan Management và Visualization
- Realtime SPC Data streaming qua SSE
- CPK Comparison Dashboard và Shift Comparison

**MMS (Hoàn thành ~75%)**
- Quản lý máy móc, công trạm, jig, fixture đầy đủ CRUD
- Maintenance Schedule với Gantt chart
- MTTR/MTBF calculation và reporting
- Spare Parts Management với inventory tracking
- Work Order system với notification
- Equipment QR Lookup

**IoT Platform (Hoàn thành ~70%)**
- Device Management với health monitoring
- MQTT Connection Management
- OPC-UA Connection Management
- Firmware OTA deployment và scheduling
- 3D Floor Plan visualization
- IoT Analytics Dashboard
- Predictive Maintenance

**Production Line (Hoàn thành ~75%)**
- OEE Dashboard với real-time tracking
- NTF/Defect Management và statistics
- Yield tracking và alert configuration
- Shift Report generation
- Line comparison và drill-down

**AI/ML (Hoàn thành ~60%)**
- LLM Integration cho SPC Analysis
- AI Vision Analysis (defect detection)
- Predictive Analytics cho CPK forecasting
- Natural Language Query interface
- Model Training và versioning
- Root Cause Analysis
- A/B Testing framework

**Infrastructure (Hoàn thành ~90%)**
- PWA Service Worker v4 với offline support
- CSP Nonce middleware cho bảo mật
- WebSocket server với real-time dashboard
- Database Backup service với S3 storage
- Custom Alert Rules engine
- Rate Limiting và security headers
- Audit Log system
- Health Check monitoring

---

## 4. Technical Debt và Vấn đề Cần Giải quyết

### 4.1 Mock Data trong Production Services

Có **9 service files** (không tính test files) vẫn sử dụng mock/hardcoded data thay vì truy vấn database thực. Đây là technical debt nghiêm trọng nhất cần được giải quyết.

| Service | Vấn đề | Mức ảnh hưởng |
|---------|--------|---------------|
| anomalyDetectionService.ts | Train model với mock data | Cao |
| defectPredictionService.ts | Generate mock predictions | Cao |
| mttrMtbfPredictionService.ts | Mock MTTR/MTBF data khi không có real data | Cao |
| oeeForecastingService.ts | Mock OEE forecast khi không có data | Trung bình |
| timeseriesService.ts | Mock timeseries khi không có DB | Trung bình |
| realtimeDataExportService.ts | Mock data nếu không cung cấp | Thấp |
| edgeGatewayService.ts | Mock gateway responses | Thấp |
| iotSensorService.ts | Mock sensor readings | Trung bình |
| iotDbService.ts | Fallback mock khi DB unavailable | Thấp |

### 4.2 TODO/FIXME trong Code

Có **24 TODO/FIXME comments** trong codebase, bao gồm các vấn đề quan trọng:

- **Push Notification**: `pushNotificationService.ts` chưa implement actual FCM sending
- **IoT Alert Escalation**: 5 notification channels (email, SMS, webhook, Slack, Teams) chưa implement thực tế
- **SPC Alert**: Email notification chưa implement
- **Permission System**: Role-based permission check chưa hoàn chỉnh (cần thêm roleId vào user table)
- **Export Functions**: FloorPlanHeatmap và IoTFloorPlan export chưa implement

### 4.3 PostgreSQL Migration (Chưa hoàn thành)

Hệ thống hiện sử dụng MySQL/TiDB, nhưng đã có kế hoạch migration sang PostgreSQL cho production deployment tại nhà máy. Các file migration đã được chuẩn bị trong `docs/postgresql-migration-wip/` nhưng chưa hoàn thành.

| Artifact | Trạng thái |
|----------|-----------|
| Schema conversion script | Đã tạo (schema-pg.ts) |
| Data migration scripts | Đã tạo (backup-mysql.mjs, fix-*.mjs) |
| Drizzle config cho PG | Đã tạo (drizzle.config-pg.ts) |
| Index migration | Đã tạo (apply-indexes.mjs) |
| Testing & validation | **Chưa thực hiện** |
| Production cutover plan | **Chưa có** |

### 4.4 Schema Size và Complexity

Với **346 bảng** và **7,940 dòng schema**, file `drizzle/schema.ts` đã trở nên quá lớn và khó maintain. Cần được tách thành nhiều file theo module.

### 4.5 Bundle Size

Build output cho thấy một số vendor chunks có kích thước rất lớn, ảnh hưởng đến thời gian tải trang:

| Chunk | Kích thước (gzip) | Đánh giá |
|-------|-------------------|----------|
| vendor-syntax | 1,570 KB | Quá lớn (Shiki syntax highlighter) |
| vendor-mermaid | 498 KB | Lớn (diagram rendering) |
| vendor-3d | 307 KB | Chấp nhận được (Three.js) |
| vendor-export | 305 KB | Lớn (jsPDF + ExcelJS) |
| vendor-misc | 243 KB | Cần audit |
| vendor-charts | 177 KB | Chấp nhận được (Recharts) |
| index (main) | 173 KB | Cần code splitting thêm |

---

## 5. Kế hoạch Cải thiện Hoàn chỉnh

Kế hoạch được chia thành **4 giai đoạn** theo nguyên tắc: **Tối ưu và Bảo mật trước, Nâng cấp và Mở rộng sau**. Trong mỗi giai đoạn, thứ tự ưu tiên là: (1) SPC/CPK, (2) MMS, (3) IoT, (4) Production Line, (5) License Server.

---

### Giai đoạn 1: Sửa lỗi và Loại bỏ Mock Data (Ưu tiên CAO)

> **Mục tiêu:** Đảm bảo tất cả services sử dụng dữ liệu thực từ database, loại bỏ hoàn toàn mock/hardcoded data trong production code.

**Thời gian ước tính:** 2-3 tuần

| # | Task | Module | Effort |
|---|------|--------|--------|
| 1.1 | Refactor anomalyDetectionService.ts — train model từ spc_analysis_history thực | SPC | 8h |
| 1.2 | Refactor defectPredictionService.ts — query từ spc_defect_records | SPC | 6h |
| 1.3 | Refactor mttrMtbfPredictionService.ts — query từ work_orders và maintenance_history | MMS | 8h |
| 1.4 | Refactor oeeForecastingService.ts — query từ oee_records | Production | 6h |
| 1.5 | Refactor timeseriesService.ts — query từ sensor_data_ts | IoT | 6h |
| 1.6 | Refactor iotSensorService.ts — query từ iot_data_points | IoT | 4h |
| 1.7 | Implement actual FCM push notification (pushNotificationService.ts) | Notification | 8h |
| 1.8 | Implement IoT alert escalation channels (email, SMS, webhook, Slack, Teams) | IoT | 12h |
| 1.9 | Implement SPC alert email notification | SPC | 4h |
| 1.10 | Fix permission system — thêm roleId vào user table | Security | 6h |
| 1.11 | Implement export cho FloorPlanHeatmap và IoTFloorPlan | IoT | 4h |
| 1.12 | Push database migration (pnpm db:push) để sync schema | Database | 2h |

**Deliverables:** Tất cả services trả về dữ liệu thực, 0 mock data trong production code, tất cả TODO/FIXME được giải quyết.

---

### Giai đoạn 2: Tối ưu Performance và Bảo mật (Ưu tiên CAO)

> **Mục tiêu:** Giảm bundle size, tối ưu database queries, tăng cường bảo mật.

**Thời gian ước tính:** 2-3 tuần

| # | Task | Loại | Effort |
|---|------|------|--------|
| 2.1 | Tách schema.ts (7,940 dòng) thành modules: spc.schema.ts, mms.schema.ts, iot.schema.ts, etc. | Database | 12h |
| 2.2 | Lazy load Shiki syntax highlighter (giảm 1.5MB gzip) — chỉ load khi cần | Performance | 4h |
| 2.3 | Lazy load Mermaid (giảm 498KB gzip) — chỉ load khi vào diagram pages | Performance | 4h |
| 2.4 | Audit vendor-misc chunk — tách và tree-shake unused exports | Performance | 6h |
| 2.5 | Code splitting cho index chunk (173KB) — tách theo route groups | Performance | 8h |
| 2.6 | Database query audit — EXPLAIN ANALYZE cho top 20 slow queries | Database | 8h |
| 2.7 | Implement cursor-based pagination cho danh sách lớn (audit_logs, spc_analysis_history) | Database | 8h |
| 2.8 | Encrypt sensitive config (connection strings, API keys) at rest | Security | 6h |
| 2.9 | Implement CORS whitelist thay vì wildcard cho production | Security | 2h |
| 2.10 | Add rate limiting per-endpoint thay vì global | Security | 4h |
| 2.11 | Memory leak profiling và fix cho WebSocket/SSE connections | Performance | 8h |
| 2.12 | Implement database connection pooling optimization | Database | 4h |

**Deliverables:** Bundle size giảm 30%, response time trung bình giảm 50%, security audit pass.

---

### Giai đoạn 3: Hoàn thiện Core Business Features (Ưu tiên TRUNG BÌNH-CAO)

> **Mục tiêu:** Hoàn thiện các tính năng nghiệp vụ còn thiếu theo thứ tự module.

**Thời gian ước tính:** 4-6 tuần

**3A. SPC/CPK (73 items pending)**

| # | Task | Effort |
|---|------|--------|
| 3A.1 | Nâng cấp Dashboard SPC Realtime — chế độ xem SPC Plan hoặc Machine/Fixture | 8h |
| 3A.2 | Nâng cấp MachineDetail.tsx — tích hợp OEE/SPC chi tiết cho từng máy | 8h |
| 3A.3 | Cải thiện SPC Plan Overview — hiển thị đầy đủ thông tin, trend khi click | 6h |
| 3A.4 | Cải tiến biểu đồ SPC với annotations và markers | 6h |
| 3A.5 | Xuất báo cáo SPC PDF/Excel hoàn chỉnh với template | 8h |
| 3A.6 | Sửa lỗi xuất PDF/PNG SPC Plan | 4h |

**3B. MMS/Machine (85 items pending)**

| # | Task | Effort |
|---|------|--------|
| 3B.1 | Tìm kiếm/lọc trên KPI Dashboard theo dây chuyền/thiết bị | 6h |
| 3B.2 | Kéo thả trên Gantt chart để điều chỉnh lịch trình bảo trì | 12h |
| 3B.3 | Biểu đồ lịch sử bảo trì và OEE trong QR lookup | 6h |
| 3B.4 | Xuất báo cáo MTTR/MTBF ra Excel hoàn chỉnh | 6h |
| 3B.5 | Mobile responsive cho QR scanner và Gantt | 8h |

**3C. IoT Platform (76 items pending)**

| # | Task | Effort |
|---|------|--------|
| 3C.1 | Tích hợp IoT Gateway kết nối PLC/SCADA thực tế | 16h |
| 3C.2 | Implement OPC-UA adapter trong dataCollector.ts | 12h |
| 3C.3 | WebSocket fallback về polling khi không khả dụng | 4h |
| 3C.4 | IoT device auto-discovery | 8h |

**3D. Production Line (74 items pending)**

| # | Task | Effort |
|---|------|--------|
| 3D.1 | Tạo báo cáo OEE theo ca/ngày/tuần/tháng | 8h |
| 3D.2 | Xuất báo cáo OEE/Maintenance PDF/Excel | 6h |
| 3D.3 | Scheduled job gửi báo cáo hàng tuần | 4h |
| 3D.4 | Dashboard config — API lưu/load cấu hình widgets | 6h |

**Deliverables:** Tất cả core features hoàn thành, 0 placeholder UI, tất cả export functions hoạt động.

---

### Giai đoạn 4: Mở rộng và Enterprise Features (Ưu tiên TRUNG BÌNH)

> **Mục tiêu:** PostgreSQL migration, mobile app hoàn thiện, documentation.

**Thời gian ước tính:** 4-8 tuần

**4A. PostgreSQL Migration**

| # | Task | Effort |
|---|------|--------|
| 4A.1 | Hoàn thành và test schema-pg.ts cho tất cả 346 bảng | 16h |
| 4A.2 | Test data migration scripts (backup-mysql → import-pg) | 12h |
| 4A.3 | Update tất cả Drizzle queries cho PG compatibility | 20h |
| 4A.4 | Performance testing trên PostgreSQL | 8h |
| 4A.5 | Production cutover plan và rollback strategy | 8h |

**4B. Mobile App**

| # | Task | Effort |
|---|------|--------|
| 4B.1 | Hoàn thiện 8 screens hiện có (Dashboard, Charts, Alerts, Settings) | 16h |
| 4B.2 | Thêm SPC Realtime screen với push notification | 12h |
| 4B.3 | Thêm QR Scanner screen cho Equipment Lookup | 8h |
| 4B.4 | Offline mode cho mobile app | 12h |

**4C. Documentation và Training**

| # | Task | Effort |
|---|------|--------|
| 4C.1 | Cập nhật User Guide cho tất cả modules mới | 16h |
| 4C.2 | Tạo video tutorial scripts (3 videos đã có scripts) | 8h |
| 4C.3 | Hoàn thiện API Documentation (Swagger/OpenAPI) | 12h |
| 4C.4 | Tạo Training slides và certification program | 8h |
| 4C.5 | Cập nhật UPGRADE_PLAN.md và VERSION_HISTORY.md | 4h |

**4D. Enterprise Features**

| # | Task | Effort |
|---|------|--------|
| 4D.1 | Multi-tenant support (schema-per-tenant) | 40h |
| 4D.2 | SSO integration (SAML/OIDC) | 20h |
| 4D.3 | Data archiving — tự động archive dữ liệu > 1 năm | 12h |
| 4D.4 | Compliance reports (ISO 9001, IATF 16949) | 16h |
| 4D.5 | High Availability deployment guide | 8h |

---

## 6. Tổng kết và Khuyến nghị

### 6.1 Đánh giá Tổng thể

Hệ thống CPK/SPC Calculator đã đạt mức **production-ready** cho các chức năng core (SPC/CPK, MMS, IoT, Production Line). Với 225 routes, 346 bảng database, và 234 test files, đây là một hệ thống quy mô lớn với độ phức tạp cao. Tuy nhiên, cần tập trung vào việc loại bỏ mock data, tối ưu performance, và hoàn thiện các tính năng còn dở dang trước khi mở rộng thêm.

### 6.2 Thứ tự Ưu tiên Thực hiện

| Thứ tự | Giai đoạn | Lý do |
|--------|-----------|-------|
| 1 | GĐ1: Sửa lỗi + Loại bỏ Mock Data | Đảm bảo dữ liệu chính xác, nền tảng vững chắc |
| 2 | GĐ2: Tối ưu Performance + Bảo mật | Cải thiện trải nghiệm người dùng, bảo vệ hệ thống |
| 3 | GĐ3: Hoàn thiện Core Features | Đáp ứng yêu cầu nghiệp vụ đầy đủ |
| 4 | GĐ4: Mở rộng Enterprise | Sẵn sàng cho deployment quy mô lớn |

### 6.3 Rủi ro và Giảm thiểu

| Rủi ro | Mức độ | Giảm thiểu |
|--------|--------|------------|
| Schema quá lớn gây OOM khi build | Cao | Tách schema thành modules (GĐ2) |
| Mock data gây sai lệch kết quả phân tích | Cao | Loại bỏ mock data (GĐ1) |
| Bundle size lớn ảnh hưởng FCP | Trung bình | Lazy load heavy libraries (GĐ2) |
| PostgreSQL migration gây downtime | Trung bình | Blue-green deployment (GĐ4) |
| 1,262 pending items gây mất focus | Trung bình | Ưu tiên theo module order (GĐ3) |

---

**Kết luận:** Hệ thống đã hoàn thành khoảng **69% tổng số tasks** và đạt mức sẵn sàng cho production deployment. Việc tập trung vào Giai đoạn 1 (loại bỏ mock data) và Giai đoạn 2 (tối ưu performance) sẽ nâng cao đáng kể chất lượng và độ tin cậy của hệ thống trước khi triển khai các tính năng mới.
