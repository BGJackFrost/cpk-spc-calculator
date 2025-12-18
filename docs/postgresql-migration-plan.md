# Kế hoạch Chuyển đổi Database từ MySQL sang PostgreSQL

**Hệ thống:** CPK/SPC Calculator  
**Phiên bản:** 1.0  
**Ngày lập:** 18/12/2024  
**Tác giả:** Manus AI

---

## 1. Tổng quan

### 1.1 Mục tiêu

Tài liệu này trình bày kế hoạch chi tiết để chuyển đổi hệ thống CPK/SPC Calculator từ MySQL sang PostgreSQL, nhằm đáp ứng yêu cầu triển khai trong môi trường nhà máy lớn với khối lượng dữ liệu cao và yêu cầu hiệu suất nghiêm ngặt.

### 1.2 Lý do chuyển đổi

PostgreSQL được lựa chọn thay thế MySQL vì các ưu điểm sau:

| Tiêu chí | MySQL | PostgreSQL |
|----------|-------|------------|
| **Xử lý JSON** | Hỗ trợ cơ bản | Native JSONB với indexing mạnh mẽ |
| **Concurrent Writes** | Table-level locking | Row-level locking (MVCC) |
| **Full-text Search** | Cần plugin | Tích hợp sẵn |
| **Partitioning** | Hạn chế | Declarative partitioning linh hoạt |
| **Extensions** | Ít | Phong phú (PostGIS, TimescaleDB...) |
| **ACID Compliance** | Tốt | Xuất sắc |
| **Analytics** | Cơ bản | Window functions, CTEs mạnh mẽ |

### 1.3 Phạm vi

Kế hoạch bao gồm việc chuyển đổi toàn bộ 50+ bảng dữ liệu hiện có, bao gồm:
- Dữ liệu SPC/CPK (measurements, spc_plans, spc_results...)
- Dữ liệu OEE (oee_records, oee_loss_records, oee_targets...)
- Dữ liệu Bảo trì (work_orders, spare_parts, maintenance_history...)
- Dữ liệu Master (machines, production_lines, products...)
- Dữ liệu Người dùng và Cấu hình

---

## 2. Phân tích Hiện trạng

### 2.1 Cấu trúc Database hiện tại

Hệ thống hiện đang sử dụng MySQL với các đặc điểm:

| Thông số | Giá trị |
|----------|---------|
| Số lượng bảng | ~55 bảng |
| Kích thước dữ liệu ước tính | 500MB - 2GB |
| Số lượng records lớn nhất | measurements (~1M+ records) |
| Loại dữ liệu đặc biệt | JSON, ENUM, DECIMAL |

### 2.2 Các thay đổi cần thiết

#### 2.2.1 Kiểu dữ liệu

| MySQL | PostgreSQL | Ghi chú |
|-------|------------|---------|
| `INT AUTO_INCREMENT` | `SERIAL` hoặc `IDENTITY` | Tự động tăng |
| `TINYINT(1)` | `BOOLEAN` | True/False |
| `DOUBLE` | `DOUBLE PRECISION` | Số thực |
| `DATETIME` | `TIMESTAMP` | Thời gian |
| `ENUM(...)` | `TEXT` + CHECK hoặc custom type | Cần tạo enum type |
| `TEXT` | `TEXT` | Không đổi |
| `JSON` | `JSONB` | Nên dùng JSONB |
| `DECIMAL(p,s)` | `NUMERIC(p,s)` | Tương đương |

#### 2.2.2 Cú pháp SQL

| MySQL | PostgreSQL |
|-------|------------|
| `LIMIT offset, count` | `LIMIT count OFFSET offset` |
| `NOW()` | `NOW()` hoặc `CURRENT_TIMESTAMP` |
| `IFNULL()` | `COALESCE()` |
| `GROUP_CONCAT()` | `STRING_AGG()` |
| `AUTO_INCREMENT` | `SERIAL` / `GENERATED ALWAYS AS IDENTITY` |
| `ON UPDATE CURRENT_TIMESTAMP` | Cần trigger |

### 2.3 Drizzle ORM Migration

Hệ thống sử dụng Drizzle ORM, cần thay đổi:

```typescript
// Trước (MySQL)
import { mysqlTable, int, varchar, timestamp } from "drizzle-orm/mysql-core";

// Sau (PostgreSQL)
import { pgTable, serial, varchar, timestamp } from "drizzle-orm/pg-core";
```

---

## 3. Kế hoạch Thực hiện

### 3.1 Timeline

| Giai đoạn | Thời gian | Công việc |
|-----------|-----------|-----------|
| **Phase 1** | Tuần 1-2 | Chuẩn bị và thiết lập môi trường |
| **Phase 2** | Tuần 3-4 | Chuyển đổi schema và code |
| **Phase 3** | Tuần 5-6 | Migration dữ liệu và testing |
| **Phase 4** | Tuần 7 | UAT và Go-live |
| **Phase 5** | Tuần 8+ | Monitoring và tối ưu |

### 3.2 Chi tiết các Phase

#### Phase 1: Chuẩn bị (Tuần 1-2)

**Tuần 1:**
- Thiết lập PostgreSQL server (version 15+)
- Cài đặt extensions cần thiết (pg_trgm, uuid-ossp)
- Backup toàn bộ dữ liệu MySQL
- Tạo môi trường staging

**Tuần 2:**
- Phân tích chi tiết từng bảng
- Xác định các custom ENUM types cần tạo
- Lập danh sách các stored procedures/triggers cần chuyển đổi
- Chuẩn bị scripts migration

#### Phase 2: Chuyển đổi Schema (Tuần 3-4)

**Tuần 3:**
- Chuyển đổi Drizzle schema từ MySQL sang PostgreSQL
- Tạo các ENUM types trong PostgreSQL
- Tạo các triggers thay thế ON UPDATE CURRENT_TIMESTAMP
- Chạy db:push trên môi trường staging

**Tuần 4:**
- Cập nhật tất cả raw SQL queries trong code
- Cập nhật connection string và driver
- Chạy unit tests
- Fix các lỗi phát sinh

#### Phase 3: Migration Dữ liệu (Tuần 5-6)

**Tuần 5:**
- Sử dụng pgloader để migrate dữ liệu
- Verify data integrity
- Kiểm tra foreign keys và constraints

**Tuần 6:**
- Performance testing
- Load testing với dữ liệu thực
- Fix các issues về performance

#### Phase 4: UAT và Go-live (Tuần 7)

- User Acceptance Testing
- Final data sync
- Cutover plan execution
- Go-live

#### Phase 5: Post-migration (Tuần 8+)

- Monitoring performance
- Index optimization
- Query tuning
- Documentation update

---

## 4. Các bước Kỹ thuật Chi tiết

### 4.1 Cập nhật Dependencies

```bash
# Gỡ bỏ MySQL driver
pnpm remove mysql2

# Cài đặt PostgreSQL driver
pnpm add pg @types/pg
```

### 4.2 Cập nhật Drizzle Config

```typescript
// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",  // Thay đổi từ "mysql"
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### 4.3 Chuyển đổi Schema Example

```typescript
// Trước (MySQL)
export const machines = mysqlTable("machines", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["running", "stopped", "maintenance"]),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

// Sau (PostgreSQL)
export const machineStatusEnum = pgEnum("machine_status", ["running", "stopped", "maintenance"]);

export const machines = pgTable("machines", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  status: machineStatusEnum("status"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

### 4.4 Tạo Trigger cho Updated At

```sql
-- Function để tự động cập nhật updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Áp dụng cho từng bảng
CREATE TRIGGER update_machines_updated_at
    BEFORE UPDATE ON machines
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### 4.5 Migration Script với pgloader

```lisp
-- pgloader.load
LOAD DATABASE
     FROM mysql://user:pass@localhost/cpk_spc
     INTO postgresql://user:pass@localhost/cpk_spc

WITH include drop, create tables, create indexes, reset sequences,
     workers = 8, concurrency = 1

SET maintenance_work_mem to '512MB',
    work_mem to '256MB'

CAST type int to integer,
     type tinyint to smallint,
     type datetime to timestamp,
     type double to double precision

BEFORE LOAD DO
$$ CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; $$;
```

---

## 5. Rủi ro và Giảm thiểu

| Rủi ro | Mức độ | Giảm thiểu |
|--------|--------|------------|
| Mất dữ liệu | Cao | Backup đầy đủ, verify sau migration |
| Downtime kéo dài | Trung bình | Chuẩn bị kỹ, có rollback plan |
| Performance issues | Trung bình | Testing kỹ, index optimization |
| Application bugs | Trung bình | Unit tests, integration tests |
| Incompatible queries | Thấp | Review tất cả raw SQL |

---

## 6. Checklist Migration

### 6.1 Pre-migration

- [ ] Backup MySQL database
- [ ] Thiết lập PostgreSQL server
- [ ] Cài đặt extensions
- [ ] Tạo database và user
- [ ] Test connectivity

### 6.2 Schema Migration

- [ ] Chuyển đổi tất cả bảng trong schema.ts
- [ ] Tạo ENUM types
- [ ] Tạo triggers cho updated_at
- [ ] Chạy db:push thành công
- [ ] Verify schema structure

### 6.3 Code Migration

- [ ] Cập nhật database driver
- [ ] Cập nhật connection config
- [ ] Fix tất cả raw SQL queries
- [ ] Cập nhật LIMIT/OFFSET syntax
- [ ] Thay thế MySQL functions

### 6.4 Data Migration

- [ ] Chạy pgloader
- [ ] Verify row counts
- [ ] Check foreign key integrity
- [ ] Verify data types
- [ ] Test sample queries

### 6.5 Testing

- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Performance benchmarks
- [ ] Load testing
- [ ] UAT sign-off

### 6.6 Go-live

- [ ] Final backup
- [ ] Final data sync
- [ ] DNS/connection string update
- [ ] Smoke testing
- [ ] Monitoring setup

---

## 7. Tài nguyên Cần thiết

### 7.1 Nhân sự

| Vai trò | Số lượng | Thời gian |
|---------|----------|-----------|
| Database Admin | 1 | Full-time 8 tuần |
| Backend Developer | 2 | Full-time 6 tuần |
| QA Engineer | 1 | Part-time 4 tuần |
| DevOps | 1 | Part-time 2 tuần |

### 7.2 Hạ tầng

| Thành phần | Cấu hình đề xuất |
|------------|------------------|
| PostgreSQL Server | 8 CPU, 32GB RAM, SSD 500GB |
| Staging Environment | 4 CPU, 16GB RAM, SSD 200GB |
| Backup Storage | 1TB |

---

## 8. Kết luận

Việc chuyển đổi từ MySQL sang PostgreSQL là một quyết định chiến lược quan trọng cho hệ thống CPK/SPC Calculator khi triển khai trong môi trường nhà máy lớn. PostgreSQL cung cấp khả năng xử lý concurrent writes tốt hơn, hỗ trợ JSONB mạnh mẽ cho dữ liệu cấu hình linh hoạt, và các tính năng analytics nâng cao phù hợp với yêu cầu phân tích SPC/OEE phức tạp.

Với kế hoạch 8 tuần được trình bày, việc migration có thể được thực hiện một cách có kiểm soát, giảm thiểu rủi ro và đảm bảo tính liên tục của hoạt động sản xuất.

---

## Phụ lục

### A. Danh sách các ENUM types cần tạo

```sql
CREATE TYPE machine_status AS ENUM ('running', 'stopped', 'maintenance', 'error');
CREATE TYPE work_order_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
CREATE TYPE maintenance_type AS ENUM ('preventive', 'corrective', 'predictive');
CREATE TYPE license_type AS ENUM ('trial', 'standard', 'professional', 'enterprise');
CREATE TYPE spc_plan_status AS ENUM ('draft', 'active', 'paused', 'completed');
CREATE TYPE oee_loss_type AS ENUM ('availability', 'performance', 'quality');
-- ... và các enum khác
```

### B. Các raw SQL queries cần review

Tìm kiếm trong codebase với pattern:
```bash
grep -r "execute\|sql\`" --include="*.ts" server/
```

### C. Liên hệ hỗ trợ

Nếu có câu hỏi về kế hoạch migration này, vui lòng liên hệ:
- Email: support@example.com
- Documentation: /docs/postgresql-migration-plan.md
