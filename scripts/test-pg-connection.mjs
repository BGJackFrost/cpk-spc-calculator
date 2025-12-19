import pg from 'pg';
const { Client } = pg;

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'spc_user',
  password: 'spc_password',
  database: 'spc_calculator',
});

async function test() {
  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL');
    
    // Count tables
    const res = await client.query(`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    console.log(`📊 Total tables: ${res.rows[0].count}`);
    
    // List some tables
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name LIMIT 10
    `);
    console.log('📋 Sample tables:', tables.rows.map(r => r.table_name).join(', '));
    
    await client.end();
    console.log('✅ Test completed successfully');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

test();
