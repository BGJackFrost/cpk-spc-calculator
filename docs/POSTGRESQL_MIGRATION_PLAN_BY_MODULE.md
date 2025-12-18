# Kế hoạch Migration PostgreSQL theo Module

**Phiên bản:** 1.0  
**Ngày tạo:** 19/12/2024  
**Tác giả:** Manus AI  

## Tổng quan Hệ thống

Hệ thống SPC/CPK Calculator hiện có **133 bảng** trong MySQL database, được tổ chức thành các module chức năng khác nhau. Việc migration sang PostgreSQL cần được thực hiện theo từng module để giảm thiểu rủi ro và đảm bảo tính ổn định của hệ thống.

## Phân tích Module Dependencies

### Module 1: Core Authentication (Độ phức tạp: Thấp, Ưu tiên: Cao)

Các bảng thuộc module này là nền tảng cho toàn bộ hệ thống, không phụ thuộc vào bảng khác.

| Bảng | Mô tả | Dependencies |
|------|-------|--------------|
| `users` | Người dùng Manus OAuth | Không |
| `local_users` | Người dùng local | Không |
| `login_history` | Lịch sử đăng nhập | `users`, `local_users` |

**Thứ tự migration:** `users` → `local_users` → `login_history`

### Module 2: Organization Structure (Độ phức tạp: Trung bình, Ưu tiên: Cao)

Cấu trúc tổ chức công ty, phòng ban, nhóm.

| Bảng | Mô tả | Dependencies |
|------|-------|--------------|
| `companies` | Công ty | Không |
| `positions` | Chức vụ | Không |
| `departments` | Phòng ban | `companies` |
| `teams` | Nhóm/Tổ | `departments` |
| `employee_profiles` | Thông tin nhân viên | `users`, `companies`, `departments`, `teams`, `positions` |

**Thứ tự migration:** `companies` → `positions` → `departments` → `teams` → `employee_profiles`

### Module 3: Approval Workflow (Độ phức tạp: Trung bình, Ưu tiên: Trung bình)

Quy trình phê duyệt.

| Bảng | Mô tả | Dependencies |
|------|-------|--------------|
| `approval_workflows` | Quy trình phê duyệt | Không |
| `approval_steps` | Các bước phê duyệt | `approval_workflows` |
| `approval_requests` | Yêu cầu phê duyệt | `approval_workflows`, `approval_steps` |
| `approval_histories` | Lịch sử phê duyệt | `approval_requests`, `approval_steps` |

**Thứ tự migration:** `approval_workflows` → `approval_steps` → `approval_requests` → `approval_histories`

### Module 4: Permission System (Độ phức tạp: Trung bình, Ưu tiên: Cao)

Hệ thống phân quyền.

| Bảng | Mô tả | Dependencies |
|------|-------|--------------|
| `system_modules` | Module hệ thống | Không |
| `module_permissions` | Quyền của module | `system_modules` |
| `role_module_permissions` | Quyền theo vai trò | `module_permissions` |
| `role_templates` | Mẫu vai trò | Không |

**Thứ tự migration:** `system_modules` → `module_permissions` → `role_module_permissions` → `role_templates`

### Module 5: Master Data - Products (Độ phức tạp: Thấp, Ưu tiên: Cao)

Dữ liệu chủ sản phẩm.

| Bảng | Mô tả | Dependencies |
|------|-------|--------------|
| `products` | Sản phẩm | Không |
| `product_specifications` | Thông số USL/LSL | `products` |

**Thứ tự migration:** `products` → `product_specifications`

### Module 6: Master Data - Production (Độ phức tạp: Cao, Ưu tiên: Cao)

Dữ liệu chủ sản xuất.

| Bảng | Mô tả | Dependencies |
|------|-------|--------------|
| `machine_types` | Loại máy | Không |
| `workstations` | Công trạm | Không |
| `machines` | Máy móc | `workstations`, `machine_types` |
| `fixtures` | Fixture | `machines` |
| `jigs` | Jig | `machines` |
| `production_lines` | Dây chuyền | `products` |
| `production_line_machines` | Máy trong dây chuyền | `production_lines`, `machines` |
| `process_templates` | Mẫu quy trình | Không |
| `process_steps` | Công đoạn quy trình | `process_templates` |
| `process_step_machines` | Máy trong công đoạn | `process_steps`, `machines` |

**Thứ tự migration:** `machine_types` → `workstations` → `machines` → `fixtures` → `jigs` → `production_lines` → `production_line_machines` → `process_templates` → `process_steps` → `process_step_machines`

### Module 7: Database Connections (Độ phức tạp: Thấp, Ưu tiên: Cao)

Kết nối database bên ngoài.

| Bảng | Mô tả | Dependencies |
|------|-------|--------------|
| `database_connections` | Kết nối DB | Không |
| `mappings` | Mapping dữ liệu | `database_connections`, `products`, `workstations` |
| `mapping_templates` | Mẫu mapping | Không |

**Thứ tự migration:** `database_connections` → `mapping_templates` → `mappings`

### Module 8: SPC/CPK Core (Độ phức tạp: Cao, Ưu tiên: Cao)

Lõi SPC/CPK.

| Bảng | Mô tả | Dependencies |
|------|-------|--------------|
| `spc_rules` | SPC Rules | Không |
| `ca_rules` | CA Rules | Không |
| `cpk_rules` | CPK Rules | Không |
| `sampling_methods` | Phương pháp lấy mẫu | Không |
| `spc_sampling_plans` | Kế hoạch SPC | `production_lines`, `mappings`, `machines`, `fixtures` |
| `spc_plan_templates` | Mẫu kế hoạch SPC | Không |
| `spc_analysis_history` | Lịch sử phân tích | `spc_sampling_plans` |
| `spc_realtime_data` | Dữ liệu realtime | `spc_sampling_plans` |
| `spc_summary_stats` | Thống kê tổng hợp | `spc_sampling_plans` |

**Thứ tự migration:** `spc_rules` → `ca_rules` → `cpk_rules` → `sampling_methods` → `spc_plan_templates` → `spc_sampling_plans` → `spc_analysis_history` → `spc_realtime_data` → `spc_summary_stats`

### Module 9: Defect Management (Độ phức tạp: Trung bình, Ưu tiên: Trung bình)

Quản lý lỗi.

| Bảng | Mô tả | Dependencies |
|------|-------|--------------|
| `spc_defect_categories` | Danh mục lỗi | Không |
| `spc_defect_records` | Ghi nhận lỗi | `spc_defect_categories`, `production_lines` |

**Thứ tự migration:** `spc_defect_categories` → `spc_defect_records`

### Module 10: Measurement Standards (Độ phức tạp: Trung bình, Ưu tiên: Trung bình)

Tiêu chuẩn đo lường.

| Bảng | Mô tả | Dependencies |
|------|-------|--------------|
| `product_station_machine_standards` | Tiêu chuẩn đo | `products`, `workstations`, `machines` |
| `custom_validation_rules` | Quy tắc validation | `products`, `workstations` |
| `validation_rule_logs` | Log validation | `custom_validation_rules` |

**Thứ tự migration:** `product_station_machine_standards` → `custom_validation_rules` → `validation_rule_logs`

### Module 11: OEE (Độ phức tạp: Cao, Ưu tiên: Cao)

Overall Equipment Effectiveness.

| Bảng | Mô tả | Dependencies |
|------|-------|--------------|
| `oee_loss_categories` | Danh mục tổn thất | Không |
| `oee_targets` | Mục tiêu OEE | `machines`, `production_lines` |
| `oee_records` | Bản ghi OEE | `machines`, `production_lines` |
| `oee_loss_records` | Bản ghi tổn thất | `oee_records`, `oee_loss_categories` |
| `oee_alert_thresholds` | Ngưỡng cảnh báo | `machines`, `production_lines` |
| `oee_alert_configs` | Cấu hình cảnh báo | `machines` |
| `oee_alert_history` | Lịch sử cảnh báo | `machines` |
| `oee_report_schedules` | Lịch báo cáo | Không |
| `oee_report_history` | Lịch sử báo cáo | `oee_report_schedules` |
| `downtime_reasons` | Lý do downtime | Không |

**Thứ tự migration:** `oee_loss_categories` → `downtime_reasons` → `oee_targets` → `oee_records` → `oee_loss_records` → `oee_alert_thresholds` → `oee_alert_configs` → `oee_alert_history` → `oee_report_schedules` → `oee_report_history`

### Module 12: Maintenance (Độ phức tạp: Cao, Ưu tiên: Trung bình)

Bảo trì.

| Bảng | Mô tả | Dependencies |
|------|-------|--------------|
| `maintenance_types` | Loại bảo trì | Không |
| `technicians` | Kỹ thuật viên | Không |
| `maintenance_schedules` | Lịch bảo trì | `machines`, `maintenance_types`, `technicians` |
| `work_orders` | Lệnh công việc | `machines`, `maintenance_types`, `technicians` |
| `work_order_parts` | Phụ tùng trong WO | `work_orders`, `spare_parts` |
| `maintenance_history` | Lịch sử bảo trì | `work_orders` |

**Thứ tự migration:** `maintenance_types` → `technicians` → `maintenance_schedules` → `work_orders` → `work_order_parts` → `maintenance_history`

### Module 13: Spare Parts (Độ phức tạp: Cao, Ưu tiên: Trung bình)

Phụ tùng.

| Bảng | Mô tả | Dependencies |
|------|-------|--------------|
| `suppliers` | Nhà cung cấp | Không |
| `spare_parts` | Phụ tùng | `suppliers` |
| `spare_parts_inventory` | Tồn kho | `spare_parts` |
| `spare_parts_transactions` | Giao dịch | `spare_parts` |
| `purchase_orders` | Đơn đặt hàng | `suppliers` |
| `purchase_order_items` | Chi tiết đơn hàng | `purchase_orders`, `spare_parts` |
| `po_receiving_history` | Lịch sử nhận hàng | `purchase_orders`, `purchase_order_items` |
| `spare_parts_inventory_checks` | Kiểm kê | Không |
| `spare_parts_inventory_check_items` | Chi tiết kiểm kê | `spare_parts_inventory_checks`, `spare_parts` |
| `spare_parts_stock_movements` | Xuất nhập kho | `spare_parts` |

**Thứ tự migration:** `suppliers` → `spare_parts` → `spare_parts_inventory` → `spare_parts_transactions` → `purchase_orders` → `purchase_order_items` → `po_receiving_history` → `spare_parts_inventory_checks` → `spare_parts_inventory_check_items` → `spare_parts_stock_movements`

### Module 14: Predictive Maintenance (Độ phức tạp: Trung bình, Ưu tiên: Thấp)

Bảo trì dự đoán.

| Bảng | Mô tả | Dependencies |
|------|-------|--------------|
| `sensor_types` | Loại cảm biến | Không |
| `machine_sensors` | Cảm biến máy | `machines`, `sensor_types` |
| `sensor_data` | Dữ liệu cảm biến | `machine_sensors` |
| `prediction_models` | Mô hình dự đoán | Không |
| `predictions` | Dự đoán | `machines`, `prediction_models` |

**Thứ tự migration:** `sensor_types` → `machine_sensors` → `sensor_data` → `prediction_models` → `predictions`

### Module 15: Machine Integration (Độ phức tạp: Cao, Ưu tiên: Trung bình)

Tích hợp máy.

| Bảng | Mô tả | Dependencies |
|------|-------|--------------|
| `machine_api_keys` | API keys | `machines` |
| `machine_data_logs` | Log dữ liệu | `machines` |
| `machine_integration_configs` | Cấu hình tích hợp | `machines` |
| `machine_inspection_data` | Dữ liệu kiểm tra | `machines` |
| `machine_measurement_data` | Dữ liệu đo lường | `machines` |
| `machine_oee_data` | Dữ liệu OEE | `machines` |
| `machine_webhook_configs` | Cấu hình webhook | `machines` |
| `machine_webhook_logs` | Log webhook | `machine_webhook_configs` |
| `machine_field_mappings` | Mapping trường | `machines` |
| `machine_realtime_events` | Sự kiện realtime | `machines` |

**Thứ tự migration:** `machine_api_keys` → `machine_integration_configs` → `machine_data_logs` → `machine_inspection_data` → `machine_measurement_data` → `machine_oee_data` → `machine_webhook_configs` → `machine_webhook_logs` → `machine_field_mappings` → `machine_realtime_events`

### Module 16: Realtime & Monitoring (Độ phức tạp: Trung bình, Ưu tiên: Trung bình)

Giám sát realtime.

| Bảng | Mô tả | Dependencies |
|------|-------|--------------|
| `realtime_machine_connections` | Kết nối realtime | `machines` |
| `realtime_data_buffer` | Buffer dữ liệu | `machines` |
| `realtime_alerts` | Cảnh báo realtime | `machines` |
| `alarm_thresholds` | Ngưỡng cảnh báo | `machines`, `fixtures` |
| `machine_online_status` | Trạng thái online | `machines` |
| `machine_areas` | Khu vực máy | Không |
| `machine_area_assignments` | Gán máy vào khu vực | `machine_areas`, `machines` |
| `machine_status_history` | Lịch sử trạng thái | `machines` |

**Thứ tự migration:** `machine_areas` → `realtime_machine_connections` → `realtime_data_buffer` → `realtime_alerts` → `alarm_thresholds` → `machine_online_status` → `machine_area_assignments` → `machine_status_history`

### Module 17: NTF (No Trouble Found) (Độ phức tạp: Trung bình, Ưu tiên: Thấp)

Quản lý NTF.

| Bảng | Mô tả | Dependencies |
|------|-------|--------------|
| `ntf_alert_config` | Cấu hình cảnh báo NTF | Không |
| `ntf_alert_history` | Lịch sử cảnh báo NTF | Không |
| `ntf_report_schedule` | Lịch báo cáo NTF | Không |

**Thứ tự migration:** `ntf_alert_config` → `ntf_alert_history` → `ntf_report_schedule`

### Module 18: License Management (Độ phức tạp: Trung bình, Ưu tiên: Trung bình)

Quản lý license.

| Bảng | Mô tả | Dependencies |
|------|-------|--------------|
| `licenses` | License | Không |
| `license_customers` | Khách hàng license | Không |
| `license_activations` | Kích hoạt license | `licenses` |
| `license_heartbeats` | Heartbeat license | `licenses` |

**Thứ tự migration:** `licenses` → `license_customers` → `license_activations` → `license_heartbeats`

### Module 19: System Configuration (Độ phức tạp: Thấp, Ưu tiên: Cao)

Cấu hình hệ thống.

| Bảng | Mô tả | Dependencies |
|------|-------|--------------|
| `system_config` | Cấu hình hệ thống | Không |
| `company_info` | Thông tin công ty | Không |
| `smtp_config` | Cấu hình SMTP | Không |
| `webhooks` | Webhooks | Không |
| `webhook_logs` | Log webhooks | `webhooks` |
| `report_templates` | Mẫu báo cáo | Không |
| `export_history` | Lịch sử xuất | Không |

**Thứ tự migration:** `system_config` → `company_info` → `smtp_config` → `webhooks` → `webhook_logs` → `report_templates` → `export_history`

### Module 20: Dashboard & Reports (Độ phức tạp: Trung bình, Ưu tiên: Thấp)

Dashboard và báo cáo.

| Bảng | Mô tả | Dependencies |
|------|-------|--------------|
| `user_dashboard_configs` | Cấu hình dashboard | `users` |
| `mms_dashboard_widgets` | Widget MMS | `users` |
| `scheduled_reports` | Báo cáo định kỳ | Không |
| `scheduled_report_logs` | Log báo cáo | `scheduled_reports` |
| `shift_reports` | Báo cáo ca | Không |
| `user_prediction_configs` | Cấu hình dự đoán | `users` |

**Thứ tự migration:** `user_dashboard_configs` → `mms_dashboard_widgets` → `scheduled_reports` → `scheduled_report_logs` → `shift_reports` → `user_prediction_configs`

### Module 21: Audit & Logging (Độ phức tạp: Thấp, Ưu tiên: Thấp)

Audit và logging.

| Bảng | Mô tả | Dependencies |
|------|-------|--------------|
| `audit_logs` | Audit logs | `users` |
| `database_backups` | Backup database | Không |
| `rate_limit_config` | Cấu hình rate limit | Không |
| `rate_limit_config_history` | Lịch sử rate limit | Không |
| `rate_limit_role_config` | Rate limit theo role | Không |

**Thứ tự migration:** `audit_logs` → `database_backups` → `rate_limit_config` → `rate_limit_config_history` → `rate_limit_role_config`

## Kế hoạch Migration Chi tiết

### Giai đoạn 1: Foundation (Tuần 1-2)

**Mục tiêu:** Migration các module nền tảng không có dependencies phức tạp.

| Tuần | Module | Số bảng | Ước tính công việc |
|------|--------|---------|-------------------|
| 1 | Module 1: Core Authentication | 3 | 4 giờ |
| 1 | Module 19: System Configuration | 7 | 6 giờ |
| 1 | Module 5: Master Data - Products | 2 | 2 giờ |
| 2 | Module 4: Permission System | 4 | 4 giờ |
| 2 | Module 7: Database Connections | 3 | 3 giờ |

**Tổng:** 19 bảng, ~19 giờ

### Giai đoạn 2: Organization & Production (Tuần 3-4)

**Mục tiêu:** Migration cấu trúc tổ chức và dữ liệu sản xuất.

| Tuần | Module | Số bảng | Ước tính công việc |
|------|--------|---------|-------------------|
| 3 | Module 2: Organization Structure | 5 | 6 giờ |
| 3 | Module 3: Approval Workflow | 4 | 5 giờ |
| 4 | Module 6: Master Data - Production | 10 | 12 giờ |

**Tổng:** 19 bảng, ~23 giờ

### Giai đoạn 3: SPC/CPK Core (Tuần 5-6)

**Mục tiêu:** Migration lõi SPC/CPK.

| Tuần | Module | Số bảng | Ước tính công việc |
|------|--------|---------|-------------------|
| 5 | Module 8: SPC/CPK Core | 9 | 12 giờ |
| 5 | Module 9: Defect Management | 2 | 3 giờ |
| 6 | Module 10: Measurement Standards | 3 | 4 giờ |
| 6 | Module 11: OEE | 10 | 12 giờ |

**Tổng:** 24 bảng, ~31 giờ

### Giai đoạn 4: MMS Modules (Tuần 7-8)

**Mục tiêu:** Migration các module MMS.

| Tuần | Module | Số bảng | Ước tính công việc |
|------|--------|---------|-------------------|
| 7 | Module 12: Maintenance | 6 | 8 giờ |
| 7 | Module 13: Spare Parts | 10 | 12 giờ |
| 8 | Module 14: Predictive Maintenance | 5 | 6 giờ |
| 8 | Module 18: License Management | 4 | 4 giờ |

**Tổng:** 25 bảng, ~30 giờ

### Giai đoạn 5: Integration & Monitoring (Tuần 9-10)

**Mục tiêu:** Migration tích hợp và giám sát.

| Tuần | Module | Số bảng | Ước tính công việc |
|------|--------|---------|-------------------|
| 9 | Module 15: Machine Integration | 10 | 12 giờ |
| 9 | Module 16: Realtime & Monitoring | 8 | 10 giờ |
| 10 | Module 17: NTF | 3 | 3 giờ |
| 10 | Module 20: Dashboard & Reports | 6 | 6 giờ |
| 10 | Module 21: Audit & Logging | 5 | 4 giờ |

**Tổng:** 32 bảng, ~35 giờ

## Quy trình Migration cho mỗi Module

### Bước 1: Chuẩn bị (1 giờ/module)

1. Backup dữ liệu MySQL hiện tại
2. Tạo branch Git mới cho module
3. Xác định các thay đổi cần thiết trong schema

### Bước 2: Chuyển đổi Schema (2-4 giờ/module)

1. Chuyển đổi từ `mysql-core` sang `pg-core`
2. Thay đổi các kiểu dữ liệu:
   - `int().autoincrement()` → `serial()`
   - `mysqlEnum()` → `pgEnum()`
   - `timestamp().defaultNow().onUpdateNow()` → `timestamp().defaultNow()`
3. Cập nhật các constraints và indexes

### Bước 3: Cập nhật API (2-4 giờ/module)

1. Thay đổi pattern insert:
   - MySQL: `await db.insert(table).values(data)` → lấy `insertId`
   - PostgreSQL: `await db.insert(table).values(data).returning()` → lấy từ `returning()`
2. Cập nhật các query có sử dụng MySQL-specific functions
3. Kiểm tra và sửa các lỗi TypeScript

### Bước 4: Migration Dữ liệu (1-2 giờ/module)

1. Export dữ liệu từ MySQL
2. Transform dữ liệu nếu cần
3. Import vào PostgreSQL
4. Verify dữ liệu

### Bước 5: Testing (1-2 giờ/module)

1. Chạy unit tests
2. Test API endpoints
3. Test UI flows
4. Fix bugs nếu có

### Bước 6: Merge & Deploy (30 phút/module)

1. Code review
2. Merge vào main branch
3. Deploy lên staging
4. Verify trên staging

## Các thay đổi kỹ thuật chính

### 1. Schema Changes

```typescript
// MySQL
import { int, mysqlEnum, mysqlTable, timestamp } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  role: mysqlEnum("role", ["user", "admin"]).default("user"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// PostgreSQL
import { serial, pgEnum, pgTable, timestamp } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["user", "admin"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  role: roleEnum("role").default("user"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
```

### 2. Insert Pattern Changes

```typescript
// MySQL
const result = await db.insert(users).values({ name: "John" });
const userId = result.insertId;

// PostgreSQL
const [result] = await db.insert(users).values({ name: "John" }).returning();
const userId = result.id;
```

### 3. Enum Handling

```typescript
// MySQL - inline enum
role: mysqlEnum("role", ["user", "admin"])

// PostgreSQL - separate enum definition
export const roleEnum = pgEnum("role", ["user", "admin"]);
// Then use in table
role: roleEnum("role")
```

## Rủi ro và Giảm thiểu

| Rủi ro | Mức độ | Giảm thiểu |
|--------|--------|-----------|
| Mất dữ liệu khi migration | Cao | Backup đầy đủ, test kỹ trên staging |
| Downtime dài | Trung bình | Migration theo module, rollback plan |
| Lỗi TypeScript nhiều | Cao | Sửa lỗi trước khi migration |
| Performance issues | Trung bình | Benchmark trước và sau |
| Breaking changes | Cao | Semantic versioning, changelog |

## Timeline Tổng thể

| Giai đoạn | Thời gian | Số bảng | Công việc |
|-----------|-----------|---------|-----------|
| 1. Foundation | Tuần 1-2 | 19 | ~19 giờ |
| 2. Organization & Production | Tuần 3-4 | 19 | ~23 giờ |
| 3. SPC/CPK Core | Tuần 5-6 | 24 | ~31 giờ |
| 4. MMS Modules | Tuần 7-8 | 25 | ~30 giờ |
| 5. Integration & Monitoring | Tuần 9-10 | 32 | ~35 giờ |
| **Tổng** | **10 tuần** | **119 bảng** | **~138 giờ** |

**Lưu ý:** Còn 14 bảng phụ trợ (sample data, temporary tables) có thể migration cuối cùng hoặc bỏ qua.

## Kết luận

Việc migration từ MySQL sang PostgreSQL nên được thực hiện theo từng module, bắt đầu từ các module nền tảng (Authentication, System Config, Products) và tiến dần đến các module phức tạp hơn (SPC/CPK, MMS). Mỗi module cần được test kỹ trước khi tiến hành module tiếp theo.

Trước khi bắt đầu migration, cần sửa các lỗi TypeScript hiện tại (254 lỗi) để đảm bảo codebase ổn định.
