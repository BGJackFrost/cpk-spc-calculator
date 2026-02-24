# PostgreSQL Migration - Work In Progress

## Tình trạng
Migration từ MySQL sang PostgreSQL đã được bắt đầu nhưng chưa hoàn thành do số lượng lỗi TypeScript lớn (246 lỗi).

## Các file đã lưu
- `schema-pg.ts` - Schema đã chuyển đổi sang pg-core
- `drizzle.config-pg.ts` - Drizzle config cho PostgreSQL
- `db-pg.ts` - Database connection đã cập nhật
- Các script chuyển đổi (*.mjs)

## Vấn đề chính cần giải quyết
1. **Insert patterns**: PostgreSQL sử dụng `.returning()` thay vì `result[0].insertId`
2. **Enum values**: Nhiều enum cần thêm giá trị mới
3. **Type mismatches**: Một số cột trong schema cần cập nhật type
4. **QueryResult<never>**: Cần sửa tất cả các pattern destructuring `[result]`

## Các bước đã thực hiện
1. ✅ Backup MySQL database (687KB, 129 bảng)
2. ✅ Cài đặt pg driver, gỡ mysql2 (sau đó cài lại cho external connections)
3. ✅ Chuyển đổi schema từ mysql-core sang pg-core
4. ✅ Cập nhật drizzle.config.ts
5. ⚠️ Sửa các insert patterns (chưa hoàn thành)
6. ❌ Migrate dữ liệu (chưa thực hiện)

## Khuyến nghị cho lần migration tiếp theo
1. Tạo branch riêng cho migration
2. Chuyển đổi từng module một (bắt đầu từ module ít phụ thuộc nhất)
3. Test kỹ từng module trước khi tiếp tục
4. Sử dụng script tự động để sửa các pattern phổ biến
5. Cân nhắc sử dụng abstraction layer để giảm thiểu thay đổi code

## Backup MySQL
File backup: `/home/ubuntu/cpk-spc-calculator/backups/mysql-backup-2025-12-18T17-20-23-529Z.json`
