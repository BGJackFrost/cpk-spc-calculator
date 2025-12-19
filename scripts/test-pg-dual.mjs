import pg from 'pg';
const { Pool } = pg;

// Build connection string from env or defaults
const host = process.env.PG_HOST || 'localhost';
const port = process.env.PG_PORT || '5432';
const user = process.env.PG_USER || 'spc_user';
const password = process.env.PG_PASSWORD || 'spc_password';
const database = process.env.PG_DATABASE || 'spc_calculator';

const connectionString = `postgresql://${user}:${password}@${host}:${port}/${database}`;

console.log('Testing PostgreSQL connection...');
console.log('Connection:', connectionString.replace(password, '***'));

const pool = new Pool({ connectionString });

try {
  const client = await pool.connect();
  
  // Test query
  const result = await client.query('SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = $1', ['public']);
  console.log('✅ Connected! Table count:', result.rows[0].count);
  
  // Get some sample data
  const oee = await client.query('SELECT COUNT(*) as count FROM oee_records');
  console.log('   OEE records:', oee.rows[0].count);
  
  const machines = await client.query('SELECT COUNT(*) as count FROM machines');
  console.log('   Machines:', machines.rows[0].count);
  
  client.release();
  await pool.end();
  
  console.log('✅ Dual-database mode ready!');
} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}
