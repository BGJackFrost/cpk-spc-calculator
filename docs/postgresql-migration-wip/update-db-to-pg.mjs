import fs from 'fs';
import path from 'path';

const dbPath = path.join(process.cwd(), 'server/db.ts');
let content = fs.readFileSync(dbPath, 'utf-8');

// Backup original
const backupPath = path.join(process.cwd(), 'backups/db-mysql-backup.ts');
fs.writeFileSync(backupPath, content);
console.log('db.ts backup saved to:', backupPath);

// 1. Replace imports
content = content.replace(
  /import\s*\{\s*drizzle\s*\}\s*from\s*["']drizzle-orm\/mysql2["'];?/g,
  'import { drizzle } from "drizzle-orm/node-postgres";'
);

content = content.replace(
  /import\s+mysql\s+from\s*["']mysql2\/promise["'];?/g,
  'import { Pool } from "pg";'
);

// 2. Replace mysql.Pool with Pool
content = content.replace(/mysql\.Pool/g, 'Pool');

// 3. Replace mysql.createPool with new Pool
content = content.replace(/mysql\.createPool\(/g, 'new Pool(');

// 4. Replace pool configuration
content = content.replace(
  /const poolConfig = \{[\s\S]*?\};/,
  `const poolConfig = {
  max: 10,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 30000,
  ssl: { rejectUnauthorized: false },
};`
);

// 5. Replace connection test (ping -> query)
content = content.replace(
  /await connection\.ping\(\);/g,
  'await connection.query("SELECT 1");'
);

// 6. Replace pool.getConnection with pool.connect
content = content.replace(
  /await pool\.getConnection\(\)/g,
  'await pool.connect()'
);
content = content.replace(
  /await _pool\.getConnection\(\)/g,
  'await _pool.connect()'
);

// 7. Replace connection.release() with client.release()
// Already correct for pg

// 8. Replace uri with connectionString
content = content.replace(
  /uri:\s*process\.env\.DATABASE_URL/g,
  'connectionString: process.env.DATABASE_URL'
);

// 9. Replace pool.end() - already correct

// 10. Replace onDuplicateKeyUpdate with onConflictDoUpdate
content = content.replace(
  /\.onDuplicateKeyUpdate\(\{[\s\S]*?set:\s*(\w+)[\s\S]*?\}\)/g,
  '.onConflictDoUpdate({ target: users.openId, set: $1 })'
);

// 11. Replace insertId with returning
content = content.replace(
  /result\[0\]\.insertId/g,
  'result[0].id'
);

// 12. Add returning() to insert statements that need ID
// This is complex, will handle manually

fs.writeFileSync(dbPath, content);
console.log('db.ts updated for PostgreSQL');
