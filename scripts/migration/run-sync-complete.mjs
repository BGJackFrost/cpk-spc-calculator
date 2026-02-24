/**
 * Complete MySQL to PostgreSQL Data Sync
 * 
 * Sync tất cả các bảng từ MySQL production sang PostgreSQL local
 * 
 * Usage:
 *   node scripts/migration/run-sync-complete.mjs [--dry-run] [--tables=table1,table2]
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

// All tables to sync (in order of dependencies)
const ALL_TABLES = [
  // Core user tables
  'users',
  'local_users', 
  'login_history',
  
  // Organization tables
  'companies',
  'departments',
  'teams',
  'positions',
  'employee_profiles',
  
  // Production tables
  'production_lines',
  'machines',
  'machine_types',
  'workstations',
  
  // OEE tables
  'oee_records',
  'oee_targets',
  'oee_alert_configs',
  'shifts',
  
  // SPC tables
  'spc_mappings',
  'spc_analysis_history',
  'spc_control_charts',
  'spc_rules',
  'spc_rule_violations',
  'measurements',
  'inspection_data',
  
  // Defect tables
  'defect_categories',
  'defect_types',
  'spc_defect_records',
  
  // NTF tables
  'ntf_alert_config',
  'ntf_alert_history',
  
  // License tables
  'licenses',
  'license_activations',
  
  // Webhook tables
  'webhooks',
  'webhook_logs',
  
  // Notification tables
  'notification_channels',
  'realtime_alerts',
  'email_notification_settings',
  
  // Machine integration tables
  'machine_connections',
  'machine_api_keys',
  'machine_data_logs',
  'machine_online_status',
  
  // System tables
  'system_config',
  'company_info',
  'backups',
  'approval_workflows',
  'approval_requests',
  'approval_steps',
  'approval_histories',
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

// Build INSERT statement with ON CONFLICT DO NOTHING
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
      console.log(`   ⏭️  Table not found in MySQL: ${tableName}`);
      return { table: tableName, success: true, rows: 0, skipped: true, reason: 'not_in_mysql' };
    }
    
    // Check if table exists in PostgreSQL
    const pgTableCheck = await pgClient.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
      [tableName]
    );
    
    if (pgTableCheck.rows.length === 0) {
      console.log(`   ⏭️  Table not found in PostgreSQL: ${tableName}`);
      return { table: tableName, success: true, rows: 0, skipped: true, reason: 'not_in_pg' };
    }
    
    // Get data from MySQL
    const [rows] = await mysqlConn.query(`SELECT * FROM \`${tableName}\``);
    
    if (rows.length === 0) {
      console.log(`   ⏭️  No data in MySQL table`);
      return { table: tableName, success: true, rows: 0, skipped: true, reason: 'empty' };
    }
    
    console.log(`   📊 Found ${rows.length} rows in MySQL`);
    
    if (dryRun) {
      console.log(`   🔍 [DRY RUN] Would insert ${rows.length} rows`);
      return { table: tableName, success: true, rows: rows.length, dryRun: true };
    }
    
    // Insert into PostgreSQL
    let inserted = 0;
    let errors = 0;
    let duplicates = 0;
    
    for (const row of rows) {
      try {
        const converted = convertRow(row);
        const columns = Object.keys(converted);
        const values = Object.values(converted);
        
        const sql = buildInsert(tableName, columns);
        const result = await pgClient.query(sql, values);
        
        if (result.rowCount > 0) {
          inserted++;
        } else {
          duplicates++;
        }
      } catch (err) {
        if (err.message.includes('duplicate key')) {
          duplicates++;
        } else {
          errors++;
          if (errors <= 3) {
            console.log(`   ⚠️  Error: ${err.message.substring(0, 100)}`);
          }
        }
      }
    }
    
    console.log(`   ✅ Inserted: ${inserted}, Duplicates: ${duplicates}, Errors: ${errors}`);
    return { table: tableName, success: true, rows: inserted, duplicates, errors };
    
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
  
  console.log('🚀 Complete MySQL to PostgreSQL Data Sync');
  console.log('==========================================');
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
  const tablesToSync = specificTables || ALL_TABLES;
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
  const totalDuplicates = successful.reduce((sum, r) => sum + (r.duplicates || 0), 0);
  const totalErrors = successful.reduce((sum, r) => sum + (r.errors || 0), 0);
  
  console.log(`✅ Successful: ${successful.length} tables`);
  console.log(`⏭️  Skipped: ${skipped.length} tables`);
  console.log(`❌ Failed: ${failed.length} tables`);
  console.log(`📦 Total rows inserted: ${totalRows}`);
  console.log(`🔄 Total duplicates: ${totalDuplicates}`);
  console.log(`⚠️  Total errors: ${totalErrors}`);
  
  if (skipped.length > 0) {
    console.log('\nSkipped tables:');
    for (const s of skipped) {
      console.log(`  - ${s.table}: ${s.reason}`);
    }
  }
  
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
