/**
 * MySQL to PostgreSQL Data Sync Runner
 * 
 * Sử dụng DATABASE_URL có sẵn trong environment để sync dữ liệu
 * 
 * Usage:
 *   node scripts/migration/run-sync.mjs [--dry-run] [--tables=table1,table2]
 */

import mysql from 'mysql2/promise';
import pg from 'pg';

const { Client } = pg;

// Parse DATABASE_URL
function parseDatabaseUrl(url) {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port) || 4000,
      user: parsed.username,
      password: decodeURIComponent(parsed.password),
      database: parsed.pathname.slice(1),
    };
  } catch (e) {
    console.error('Failed to parse DATABASE_URL:', e.message);
    return null;
  }
}

// PostgreSQL config
const PG_CONFIG = {
  host: process.env.PG_HOST || 'localhost',
  port: parseInt(process.env.PG_PORT || '5432'),
  user: process.env.PG_USER || 'spc_user',
  password: process.env.PG_PASSWORD || 'spc_password',
  database: process.env.PG_DATABASE || 'spc_calculator',
};

// Tables to sync (in order of dependencies)
const TABLES_TO_SYNC = [
  'users',
  'local_users', 
  'login_history',
  'production_lines',
  'machines',
  'spc_mappings',
  'spc_analysis_history',
  'oee_records',
  'oee_targets',
  'licenses',
  'webhooks',
];

// Column name mapping (camelCase to snake_case)
function camelToSnake(str) {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

// Convert MySQL row to PostgreSQL format
function convertRow(row) {
  const result = {};
  for (const [key, value] of Object.entries(row)) {
    const pgKey = camelToSnake(key);
    
    // Handle special types
    if (value instanceof Date) {
      result[pgKey] = value;
    } else if (typeof value === 'object' && value !== null) {
      result[pgKey] = JSON.stringify(value);
    } else if (value === null) {
      result[pgKey] = null;
    } else {
      result[pgKey] = value;
    }
  }
  return result;
}

// Build INSERT statement
function buildInsert(tableName, columns) {
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
  return `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
}

// Sync a single table
async function syncTable(mysqlConn, pgClient, tableName, dryRun) {
  console.log(`\n📦 Syncing: ${tableName}`);
  
  try {
    // Check if table exists in MySQL
    const [mysqlTables] = await mysqlConn.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?`,
      [tableName]
    );
    
    if (mysqlTables.length === 0) {
      console.log(`   ⚠️  Table not found in MySQL: ${tableName}`);
      return { table: tableName, success: true, rows: 0, skipped: true };
    }
    
    // Get data from MySQL
    const [rows] = await mysqlConn.query(`SELECT * FROM \`${tableName}\``);
    
    if (rows.length === 0) {
      console.log(`   ⚠️  No data in MySQL table`);
      return { table: tableName, success: true, rows: 0 };
    }
    
    console.log(`   📊 Found ${rows.length} rows in MySQL`);
    
    if (dryRun) {
      console.log(`   🔍 [DRY RUN] Would insert ${rows.length} rows`);
      return { table: tableName, success: true, rows: rows.length, dryRun: true };
    }
    
    // Insert into PostgreSQL
    let inserted = 0;
    let errors = 0;
    
    for (const row of rows) {
      try {
        const converted = convertRow(row);
        const columns = Object.keys(converted);
        const values = Object.values(converted);
        
        const sql = buildInsert(tableName, columns);
        await pgClient.query(sql, values);
        inserted++;
      } catch (err) {
        if (!err.message.includes('duplicate key')) {
          errors++;
          if (errors <= 3) {
            console.log(`   ⚠️  Error: ${err.message}`);
          }
        }
      }
    }
    
    console.log(`   ✅ Inserted: ${inserted}/${rows.length} (errors: ${errors})`);
    return { table: tableName, success: true, rows: inserted, errors };
    
  } catch (err) {
    console.log(`   ❌ Failed: ${err.message}`);
    return { table: tableName, success: false, error: err.message };
  }
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const tablesArg = args.find(a => a.startsWith('--tables='));
  const specificTables = tablesArg ? tablesArg.split('=')[1].split(',') : null;
  
  console.log('🚀 MySQL to PostgreSQL Data Sync');
  console.log('================================');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  
  // Parse MySQL config from DATABASE_URL
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not set');
    process.exit(1);
  }
  
  const mysqlConfig = parseDatabaseUrl(databaseUrl);
  if (!mysqlConfig) {
    console.error('❌ Failed to parse DATABASE_URL');
    process.exit(1);
  }
  
  console.log(`MySQL: ${mysqlConfig.host}:${mysqlConfig.port}/${mysqlConfig.database}`);
  console.log(`PostgreSQL: ${PG_CONFIG.host}:${PG_CONFIG.port}/${PG_CONFIG.database}`);
  
  // Connect to MySQL
  console.log('\n📡 Connecting to MySQL...');
  let mysqlConn;
  try {
    mysqlConn = await mysql.createConnection({
      ...mysqlConfig,
      ssl: { rejectUnauthorized: true },
    });
    console.log('   ✅ MySQL connected');
  } catch (err) {
    console.error(`   ❌ MySQL connection failed: ${err.message}`);
    process.exit(1);
  }
  
  // Connect to PostgreSQL
  console.log('\n📡 Connecting to PostgreSQL...');
  const pgClient = new Client(PG_CONFIG);
  try {
    await pgClient.connect();
    console.log('   ✅ PostgreSQL connected');
  } catch (err) {
    console.error(`   ❌ PostgreSQL connection failed: ${err.message}`);
    await mysqlConn.end();
    process.exit(1);
  }
  
  // Determine tables to sync
  const tablesToSync = specificTables || TABLES_TO_SYNC;
  console.log(`\n📋 Syncing ${tablesToSync.length} tables...`);
  
  // Sync each table
  const results = [];
  for (const table of tablesToSync) {
    const result = await syncTable(mysqlConn, pgClient, table, dryRun);
    results.push(result);
  }
  
  // Summary
  console.log('\n📊 Sync Summary');
  console.log('===============');
  
  const successful = results.filter(r => r.success && !r.skipped);
  const skipped = results.filter(r => r.skipped);
  const failed = results.filter(r => !r.success);
  const totalRows = successful.reduce((sum, r) => sum + (r.rows || 0), 0);
  
  console.log(`✅ Successful: ${successful.length} tables`);
  console.log(`⏭️  Skipped: ${skipped.length} tables`);
  console.log(`❌ Failed: ${failed.length} tables`);
  console.log(`📦 Total rows: ${totalRows}`);
  
  if (failed.length > 0) {
    console.log('\nFailed tables:');
    for (const f of failed) {
      console.log(`  - ${f.table}: ${f.error}`);
    }
  }
  
  // Cleanup
  await mysqlConn.end();
  await pgClient.end();
  
  console.log('\n✨ Sync completed!');
}

main().catch(console.error);
