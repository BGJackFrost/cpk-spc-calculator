# Phase 47 Findings

## Vấn đề phát hiện:

1. **API getTables hoạt động** - Danh sách bảng đã được load thành công
2. **Bộ lọc bảng hệ thống chưa hoạt động** - Vẫn hiển thị các bảng như:
   - `__drizzle_migrations` 
   - `alert_settings`
   - `ca_rules`
   - `cpk_rules`
   - `dashboard_configs`
   - Và nhiều bảng hệ thống khác...

3. **Nguyên nhân**: Hàm `getInternalTables()` trong externalDatabaseService.ts đã được cập nhật với SYSTEM_TABLES blacklist, nhưng danh sách blacklist chưa đầy đủ.

## Giải pháp:

Cần mở rộng danh sách SYSTEM_TABLES để bao gồm tất cả các bảng hệ thống/cấu hình, chỉ giữ lại các bảng dữ liệu mẫu:
- sample_products
- sample_measurements

Hoặc sử dụng whitelist thay vì blacklist để chỉ hiển thị các bảng mẫu.
