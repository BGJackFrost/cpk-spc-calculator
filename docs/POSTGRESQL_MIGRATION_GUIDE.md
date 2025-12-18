# Hướng dẫn Migration MySQL sang PostgreSQL

## Tổng quan

Tài liệu này hướng dẫn chi tiết cách migration hệ thống SPC/CPK Calculator từ MySQL sang PostgreSQL theo từng module.

## Yêu cầu

### Phần mềm cần thiết
- PostgreSQL 15+ 
- Node.js 18+
- pnpm
- pgAdmin hoặc DBeaver (tùy chọn)

### Chuẩn bị môi trường

```bash
# Cài đặt PostgreSQL driver
pnpm add pg @types/pg

# Cài đặt Drizzle PostgreSQL adapter
pnpm add drizzle-orm/pg-core
```

## Quy trình Migration

### Bước 1: Backup MySQL Database

```bash
# Backup toàn bộ database
mysqldump -u root -p spc_cpk_db > backup_$(date +%Y%m%d).sql

# Backup từng bảng (khuyến nghị cho migration theo module)
mysqldump -u root -p spc_cpk_db users local_users login_history > module1_backup.sql
```

### Bước 2: Tạo PostgreSQL Database

```sql
-- Kết nối PostgreSQL với user có quyền admin
CREATE DATABASE spc_cpk_db;
CREATE USER spc_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE spc_cpk_db TO spc_user;
```

### Bước 3: Chạy Migration Script

```bash
# Chạy script tạo bảng Module 1
psql -U spc_user -d spc_cpk_db -f scripts/migration/module1-postgresql.sql
```

### Bước 4: Migrate Data

```javascript
// scripts/migrate-data-module1.js
const mysql = require('mysql2/promise');
const { Pool } = require('pg');

async function migrateModule1() {
  // Kết nối MySQL
  const mysqlConn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'spc_cpk_db'
  });

  // Kết nối PostgreSQL
  const pgPool = new Pool({
    host: 'localhost',
    user: 'spc_user',
    password: 'password',
    database: 'spc_cpk_db'
  });

  try {
    // Migrate users
    const [users] = await mysqlConn.query('SELECT * FROM users');
    for (const user of users) {
      await pgPool.query(
        `INSERT INTO users (id, open_id, name, avatar, role, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        [user.id, user.openId, user.name, user.avatar, user.role, user.createdAt, user.updatedAt]
      );
    }
    console.log(`Migrated ${users.length} users`);

    // Migrate local_users
    const [localUsers] = await mysqlConn.query('SELECT * FROM local_users');
    for (const user of localUsers) {
      await pgPool.query(
        `INSERT INTO local_users (id, username, password_hash, email, full_name, role, is_active, last_login, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO NOTHING`,
        [user.id, user.username, user.passwordHash, user.email, user.fullName, user.role, user.isActive === 1, user.lastLogin, user.createdAt, user.updatedAt]
      );
    }
    console.log(`Migrated ${localUsers.length} local_users`);

    // Migrate login_history
    const [loginHistory] = await mysqlConn.query('SELECT * FROM login_history');
    for (const log of loginHistory) {
      await pgPool.query(
        `INSERT INTO login_history (id, user_id, local_user_id, login_type, ip_address, user_agent, login_at, logout_at, session_duration)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO NOTHING`,
        [log.id, log.userId, log.localUserId, log.loginType, log.ipAddress, log.userAgent, log.loginAt, log.logoutAt, log.sessionDuration]
      );
    }
    console.log(`Migrated ${loginHistory.length} login_history records`);

    // Reset sequences
    await pgPool.query(`SELECT setval('users_id_seq', (SELECT MAX(id) FROM users))`);
    await pgPool.query(`SELECT setval('local_users_id_seq', (SELECT MAX(id) FROM local_users))`);
    await pgPool.query(`SELECT setval('login_history_id_seq', (SELECT MAX(id) FROM login_history))`);

    console.log('Module 1 migration completed successfully!');
  } finally {
    await mysqlConn.end();
    await pgPool.end();
  }
}

migrateModule1().catch(console.error);
```

### Bước 5: Verify Migration

```sql
-- Kiểm tra số lượng records
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'local_users', COUNT(*) FROM local_users
UNION ALL
SELECT 'login_history', COUNT(*) FROM login_history;

-- Kiểm tra data integrity
SELECT * FROM users LIMIT 5;
SELECT * FROM local_users LIMIT 5;
SELECT * FROM login_history LIMIT 5;
```

### Bước 6: Update Application Code

```typescript
// server/db-postgresql.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../drizzle/schema-postgresql-module1';

const pool = new Pool({
  connectionString: process.env.POSTGRESQL_URL,
});

export const pgDb = drizzle(pool, { schema });
```

## Sự khác biệt MySQL vs PostgreSQL

### 1. Auto Increment
- **MySQL:** `INT AUTO_INCREMENT`
- **PostgreSQL:** `SERIAL` hoặc `GENERATED ALWAYS AS IDENTITY`

### 2. Boolean
- **MySQL:** `TINYINT(1)` với giá trị 0/1
- **PostgreSQL:** `BOOLEAN` với giá trị true/false

### 3. Timestamp
- **MySQL:** `TIMESTAMP` (UTC)
- **PostgreSQL:** `TIMESTAMP WITH TIME ZONE` (timezone-aware)

### 4. JSON
- **MySQL:** `JSON`
- **PostgreSQL:** `JSONB` (binary, indexed)

### 5. Enum
- **MySQL:** `ENUM('value1', 'value2')` inline
- **PostgreSQL:** Cần tạo TYPE riêng trước

```sql
-- PostgreSQL
CREATE TYPE user_role AS ENUM ('user', 'manager', 'admin');
CREATE TABLE users (
  role user_role NOT NULL DEFAULT 'user'
);
```

### 6. ON UPDATE CURRENT_TIMESTAMP
- **MySQL:** `ON UPDATE CURRENT_TIMESTAMP` tự động
- **PostgreSQL:** Cần trigger

```sql
-- PostgreSQL trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

## Rollback Plan

Nếu migration thất bại:

```bash
# Restore MySQL backup
mysql -u root -p spc_cpk_db < backup_20241219.sql

# Hoặc rollback PostgreSQL
psql -U spc_user -d spc_cpk_db -c "DROP TABLE IF EXISTS login_history, local_users, users CASCADE;"
```

## Checklist Migration

- [ ] Backup MySQL database
- [ ] Tạo PostgreSQL database và user
- [ ] Chạy migration script tạo bảng
- [ ] Migrate data từ MySQL sang PostgreSQL
- [ ] Verify data integrity
- [ ] Update application code
- [ ] Test application với PostgreSQL
- [ ] Monitor performance
- [ ] Decommission MySQL (sau khi ổn định)

## Liên hệ hỗ trợ

Nếu gặp vấn đề trong quá trình migration, vui lòng liên hệ team DevOps.
