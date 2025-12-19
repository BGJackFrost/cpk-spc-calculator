/**
 * MySQL to PostgreSQL Data Synchronization Script
 * 
 * Script này đồng bộ dữ liệu từ MySQL (TiDB) sang PostgreSQL
 * Sử dụng cho việc migration và testing
 * 
 * Usage:
 *   npx ts-node scripts/migration/sync-mysql-to-postgresql.ts [--tables=table1,table2] [--dry-run]
 */

import mysql from 'mysql2/promise';
import { Client } from 'pg';

// Configuration
const MYSQL_CONFIG = {
  host: process.env.MYSQL_HOST || 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
  port: parseInt(process.env.MYSQL_PORT || '4000'),
  user: process.env.MYSQL_USER || '',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'cpk_spc',
  ssl: {
    rejectUnauthorized: true,
  },
};

const POSTGRES_CONFIG = {
  host: process.env.PG_HOST || 'localhost',
  port: parseInt(process.env.PG_PORT || '5432'),
  user: process.env.PG_USER || 'spc_user',
  password: process.env.PG_PASSWORD || 'spc_password',
  database: process.env.PG_DATABASE || 'spc_calculator',
};

// Table mapping: MySQL table name -> PostgreSQL table name
const TABLE_MAPPING: Record<string, string> = {
  'users': 'users',
  'local_users': 'local_users',
  'login_history': 'login_history',
  'companies': 'companies',
  'departments': 'departments',
  'teams': 'teams',
  'positions': 'positions',
  'employee_profiles': 'employee_profiles',
  'spc_mappings': 'spc_mappings',
  'spc_analysis_history': 'spc_analysis_history',
  'spc_control_charts': 'spc_control_charts',
  'spc_rules': 'spc_rules',
  'spc_rule_violations': 'spc_rule_violations',
  'production_lines': 'production_lines',
  'machines': 'machines',
  'machine_online_status': 'machine_online_status',
  'machine_api_keys': 'machine_api_keys',
  'oee_records': 'oee_records',
  'oee_targets': 'oee_targets',
  'oee_alert_configs': 'oee_alert_configs',
  'oee_alert_history': 'oee_alert_history',
  'spc_defect_records': 'spc_defect_records',
  'defect_categories': 'defect_categories',
  'defect_types': 'defect_types',
  'ntf_alert_config': 'ntf_alert_config',
  'measurements': 'measurements',
  'inspection_data': 'inspection_data',
  'licenses': 'licenses',
  'license_activations': 'license_activations',
  'license_customers': 'license_customers',
  'webhooks': 'webhooks',
  'webhook_logs': 'webhook_logs',
};

// Column type conversions
interface ColumnConversion {
  mysqlType: string;
  pgType: string;
  convert: (value: any) => any;
}

const TYPE_CONVERSIONS: Record<string, (value: any) => any> = {
  // TINYINT(1) -> BOOLEAN
  'tinyint_to_boolean': (value: any) => value === 1 || value === true,
  // TINYINT -> INTEGER
  'tinyint_to_integer': (value: any) => value !== null ? Number(value) : null,
  // DATETIME -> TIMESTAMP
  'datetime_to_timestamp': (value: any) => value ? new Date(value) : null,
  // JSON string -> JSONB
  'json_to_jsonb': (value: any) => {
    if (value === null) return null;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  },
  // DECIMAL -> DECIMAL (no change)
  'decimal_to_decimal': (value: any) => value !== null ? parseFloat(value) : null,
  // TEXT/VARCHAR -> TEXT/VARCHAR (no change)
  'text_to_text': (value: any) => value,
};

// Columns that need special conversion per table
const COLUMN_CONVERSIONS: Record<string, Record<string, string>> = {
  'users': {
    'isActive': 'tinyint_to_integer',
    'createdAt': 'datetime_to_timestamp',
    'updatedAt': 'datetime_to_timestamp',
    'lastSignedIn': 'datetime_to_timestamp',
  },
  'local_users': {
    'isActive': 'tinyint_to_integer',
    'mustChangePassword': 'tinyint_to_integer',
    'createdAt': 'datetime_to_timestamp',
    'updatedAt': 'datetime_to_timestamp',
    'lastSignedIn': 'datetime_to_timestamp',
  },
  'machines': {
    'isActive': 'tinyint_to_integer',
    'createdAt': 'datetime_to_timestamp',
    'updatedAt': 'datetime_to_timestamp',
    'installationDate': 'datetime_to_timestamp',
    'lastMaintenanceDate': 'datetime_to_timestamp',
    'nextMaintenanceDate': 'datetime_to_timestamp',
  },
  'oee_records': {
    'createdAt': 'datetime_to_timestamp',
    'updatedAt': 'datetime_to_timestamp',
  },
  'spc_mappings': {
    'isActive': 'tinyint_to_integer',
    'createdAt': 'datetime_to_timestamp',
    'updatedAt': 'datetime_to_timestamp',
  },
  'spc_analysis_history': {
    'createdAt': 'datetime_to_timestamp',
    'startDate': 'datetime_to_timestamp',
    'endDate': 'datetime_to_timestamp',
  },
  'spc_defect_records': {
    'createdAt': 'datetime_to_timestamp',
    'updatedAt': 'datetime_to_timestamp',
    'verifiedAt': 'datetime_to_timestamp',
    'imageUrls': 'json_to_jsonb',
  },
  'webhooks': {
    'isActive': 'tinyint_to_integer',
    'headers': 'json_to_jsonb',
    'events': 'json_to_jsonb',
    'createdAt': 'datetime_to_timestamp',
    'updatedAt': 'datetime_to_timestamp',
    'lastTriggeredAt': 'datetime_to_timestamp',
  },
  'licenses': {
    'features': 'json_to_jsonb',
    'createdAt': 'datetime_to_timestamp',
    'updatedAt': 'datetime_to_timestamp',
    'issuedAt': 'datetime_to_timestamp',
    'expiresAt': 'datetime_to_timestamp',
    'activatedAt': 'datetime_to_timestamp',
  },
};

// Snake case to camelCase converter
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

// CamelCase to snake_case converter
function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

// Convert MySQL row to PostgreSQL format
function convertRow(tableName: string, row: Record<string, any>): Record<string, any> {
  const conversions = COLUMN_CONVERSIONS[tableName] || {};
  const result: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(row)) {
    const pgKey = camelToSnake(key);
    const conversionType = conversions[key];
    
    if (conversionType && TYPE_CONVERSIONS[conversionType]) {
      result[pgKey] = TYPE_CONVERSIONS[conversionType](value);
    } else if (value instanceof Date) {
      result[pgKey] = value;
    } else if (typeof value === 'object' && value !== null) {
      result[pgKey] = JSON.stringify(value);
    } else {
      result[pgKey] = value;
    }
  }
  
  return result;
}

// Build INSERT statement for PostgreSQL
function buildInsertStatement(tableName: string, columns: string[]): string {
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
  return `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
}

// Main sync function
async function syncTable(
  mysqlConn: mysql.Connection,
  pgClient: Client,
  mysqlTable: string,
  pgTable: string,
  dryRun: boolean = false
): Promise<{ success: boolean; rowCount: number; error?: string }> {
  console.log(`\n📦 Syncing table: ${mysqlTable} -> ${pgTable}`);
  
  try {
    // Get data from MySQL
    const [rows] = await mysqlConn.query(`SELECT * FROM ${mysqlTable}`);
    const data = rows as Record<string, any>[];
    
    if (data.length === 0) {
      console.log(`   ⚠️  No data in ${mysqlTable}`);
      return { success: true, rowCount: 0 };
    }
    
    console.log(`   📊 Found ${data.length} rows`);
    
    if (dryRun) {
      console.log(`   🔍 [DRY RUN] Would insert ${data.length} rows`);
      return { success: true, rowCount: data.length };
    }
    
    // Convert and insert each row
    let insertedCount = 0;
    for (const row of data) {
      const convertedRow = convertRow(mysqlTable, row);
      const columns = Object.keys(convertedRow);
      const values = Object.values(convertedRow);
      
      try {
        const insertSql = buildInsertStatement(pgTable, columns);
        await pgClient.query(insertSql, values);
        insertedCount++;
      } catch (err: any) {
        // Log error but continue
        if (!err.message.includes('duplicate key')) {
          console.log(`   ⚠️  Error inserting row: ${err.message}`);
        }
      }
    }
    
    console.log(`   ✅ Inserted ${insertedCount}/${data.length} rows`);
    return { success: true, rowCount: insertedCount };
    
  } catch (err: any) {
    console.log(`   ❌ Error: ${err.message}`);
    return { success: false, rowCount: 0, error: err.message };
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
  console.log(`Tables: ${specificTables ? specificTables.join(', ') : 'ALL'}`);
  
  // Connect to MySQL
  console.log('\n📡 Connecting to MySQL...');
  let mysqlConn: mysql.Connection;
  try {
    mysqlConn = await mysql.createConnection(MYSQL_CONFIG);
    console.log('   ✅ MySQL connected');
  } catch (err: any) {
    console.log(`   ❌ MySQL connection failed: ${err.message}`);
    console.log('   💡 Make sure to set MYSQL_USER and MYSQL_PASSWORD environment variables');
    process.exit(1);
  }
  
  // Connect to PostgreSQL
  console.log('\n📡 Connecting to PostgreSQL...');
  const pgClient = new Client(POSTGRES_CONFIG);
  try {
    await pgClient.connect();
    console.log('   ✅ PostgreSQL connected');
  } catch (err: any) {
    console.log(`   ❌ PostgreSQL connection failed: ${err.message}`);
    await mysqlConn.end();
    process.exit(1);
  }
  
  // Sync tables
  const tablesToSync = specificTables 
    ? Object.entries(TABLE_MAPPING).filter(([k]) => specificTables.includes(k))
    : Object.entries(TABLE_MAPPING);
  
  console.log(`\n📋 Syncing ${tablesToSync.length} tables...`);
  
  const results: { table: string; success: boolean; rowCount: number; error?: string }[] = [];
  
  for (const [mysqlTable, pgTable] of tablesToSync) {
    const result = await syncTable(mysqlConn, pgClient, mysqlTable, pgTable, dryRun);
    results.push({ table: mysqlTable, ...result });
  }
  
  // Summary
  console.log('\n📊 Sync Summary');
  console.log('===============');
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const totalRows = successful.reduce((sum, r) => sum + r.rowCount, 0);
  
  console.log(`✅ Successful: ${successful.length} tables`);
  console.log(`❌ Failed: ${failed.length} tables`);
  console.log(`📦 Total rows synced: ${totalRows}`);
  
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

// Run
main().catch(console.error);
