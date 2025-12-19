/**
 * PostgreSQL Configuration Template
 * 
 * Hướng dẫn sử dụng:
 * 1. Copy file này thành postgresql-config.ts
 * 2. Điền thông tin kết nối PostgreSQL
 * 3. Chạy script kiểm tra kết nối: npx ts-node scripts/migration/postgresql-config.ts
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

// ============================================
// CẤU HÌNH KẾT NỐI POSTGRESQL
// ============================================

export const POSTGRESQL_CONFIG = {
  // Thông tin kết nối cơ bản
  host: 'localhost',           // Địa chỉ PostgreSQL server
  port: 5432,                  // Port mặc định PostgreSQL
  database: 'spc_cpk_db',      // Tên database
  user: 'spc_user',            // Username
  password: 'your_password',   // Password
  
  // Cấu hình connection pool
  pool: {
    max: 20,                   // Số connection tối đa
    idleTimeoutMillis: 30000,  // Timeout cho idle connections
    connectionTimeoutMillis: 2000, // Timeout kết nối
  },
  
  // SSL (cho production)
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false,
  } : false,
};

// ============================================
// TẠO CONNECTION POOL
// ============================================

export function createPostgresPool() {
  return new Pool({
    host: POSTGRESQL_CONFIG.host,
    port: POSTGRESQL_CONFIG.port,
    database: POSTGRESQL_CONFIG.database,
    user: POSTGRESQL_CONFIG.user,
    password: POSTGRESQL_CONFIG.password,
    max: POSTGRESQL_CONFIG.pool.max,
    idleTimeoutMillis: POSTGRESQL_CONFIG.pool.idleTimeoutMillis,
    connectionTimeoutMillis: POSTGRESQL_CONFIG.pool.connectionTimeoutMillis,
    ssl: POSTGRESQL_CONFIG.ssl,
  });
}

// ============================================
// TẠO DRIZZLE INSTANCE
// ============================================

export function createDrizzleInstance() {
  const pool = createPostgresPool();
  return drizzle(pool);
}

// ============================================
// KIỂM TRA KẾT NỐI
// ============================================

export async function testConnection() {
  const pool = createPostgresPool();
  
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    
    console.log('✅ Kết nối PostgreSQL thành công!');
    console.log('📅 Thời gian server:', result.rows[0].current_time);
    console.log('📦 Phiên bản PostgreSQL:', result.rows[0].pg_version);
    
    client.release();
    await pool.end();
    
    return true;
  } catch (error) {
    console.error('❌ Lỗi kết nối PostgreSQL:', error);
    return false;
  }
}

// ============================================
// ENVIRONMENT VARIABLES TEMPLATE
// ============================================

export const ENV_TEMPLATE = \`
# PostgreSQL Connection String
# Format: postgresql://user:password@host:port/database?sslmode=require
POSTGRESQL_DATABASE_URL=postgresql://\${POSTGRESQL_CONFIG.user}:\${POSTGRESQL_CONFIG.password}@\${POSTGRESQL_CONFIG.host}:\${POSTGRESQL_CONFIG.port}/\${POSTGRESQL_CONFIG.database}

# Hoặc sử dụng các biến riêng lẻ
POSTGRES_HOST=\${POSTGRESQL_CONFIG.host}
POSTGRES_PORT=\${POSTGRESQL_CONFIG.port}
POSTGRES_DB=\${POSTGRESQL_CONFIG.database}
POSTGRES_USER=\${POSTGRESQL_CONFIG.user}
POSTGRES_PASSWORD=\${POSTGRESQL_CONFIG.password}
\`;

// Chạy test nếu file được execute trực tiếp
if (require.main === module) {
  console.log('🔧 Kiểm tra cấu hình PostgreSQL...');
  console.log('');
  console.log('📋 Cấu hình hiện tại:');
  console.log(\`   Host: \${POSTGRESQL_CONFIG.host}\`);
  console.log(\`   Port: \${POSTGRESQL_CONFIG.port}\`);
  console.log(\`   Database: \${POSTGRESQL_CONFIG.database}\`);
  console.log(\`   User: \${POSTGRESQL_CONFIG.user}\`);
  console.log('');
  
  testConnection().then((success) => {
    if (success) {
      console.log('');
      console.log('📝 Environment variables template:');
      console.log(ENV_TEMPLATE);
    }
    process.exit(success ? 0 : 1);
  });
}
