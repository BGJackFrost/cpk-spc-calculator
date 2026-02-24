import mysql from 'mysql2/promise';

function parseDatabaseUrl(url) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port) || 4000,
    user: parsed.username,
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.slice(1),
  };
}

async function main() {
  const config = parseDatabaseUrl(process.env.DATABASE_URL);
  const conn = await mysql.createConnection({ ...config, ssl: { rejectUnauthorized: true } });
  
  const tables = ['users', 'local_users', 'login_history', 'production_lines', 'machines', 'oee_records', 'licenses'];
  
  for (const table of tables) {
    console.log(`\n=== ${table} ===`);
    const [cols] = await conn.query(`DESCRIBE ${table}`);
    for (const col of cols) {
      console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : ''} ${col.Default ? `DEFAULT ${col.Default}` : ''}`);
    }
  }
  
  await conn.end();
}

main().catch(console.error);
