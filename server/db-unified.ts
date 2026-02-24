/**
 * Unified Database Module - Dual Database Support
 * 
 * Module này cung cấp interface thống nhất để truy cập cả MySQL và PostgreSQL
 * Tự động chọn database dựa trên environment variable DATABASE_TYPE
 * 
 * Environment Variables:
 * - DATABASE_TYPE: 'mysql' | 'postgresql' (default: 'mysql')
 * - DATABASE_URL: MySQL connection string
 * - POSTGRES_URL: PostgreSQL connection string
 * 
 * Usage:
 *   import { getUnifiedDb, executeQuery, getDatabaseType } from './db-unified';
 *   
 *   const db = await getUnifiedDb();
 *   const results = await executeQuery('SELECT * FROM users');
 */

import { getDb, getDbWithPool, executeWithRetry } from './db';
import { getPgDb, getPgPool, executePgQuery, executePgWithRetry, isPgConfigured, getPgStatus } from './db-postgresql';

// Database type enum
export type DatabaseType = 'mysql' | 'postgresql';

/**
 * Get configured database type from environment
 */
export function getDatabaseType(): DatabaseType {
  const dbType = process.env.DATABASE_TYPE?.toLowerCase();
  
  if (dbType === 'postgresql' || dbType === 'postgres' || dbType === 'pg') {
    return 'postgresql';
  }
  
  return 'mysql';
}

/**
 * Check if dual-database mode is enabled
 * Returns true if both MySQL and PostgreSQL are configured
 */
export function isDualDatabaseEnabled(): boolean {
  const hasMysql = !!process.env.DATABASE_URL;
  const hasPostgres = isPgConfigured();
  return hasMysql && hasPostgres;
}

/**
 * Get unified database instance
 * Returns the appropriate database based on DATABASE_TYPE
 */
export async function getUnifiedDb() {
  const dbType = getDatabaseType();
  
  if (dbType === 'postgresql') {
    return await getPgDb();
  }
  
  return await getDb();
}

/**
 * Get unified database with connection pool
 */
export async function getUnifiedDbWithPool() {
  const dbType = getDatabaseType();
  
  if (dbType === 'postgresql') {
    return await getPgDb();
  }
  
  return await getDbWithPool();
}

/**
 * Execute raw SQL query on the configured database
 * Note: SQL syntax may differ between MySQL and PostgreSQL
 */
export async function executeQuery<T = any>(
  query: string,
  params: any[] = []
): Promise<T[]> {
  const dbType = getDatabaseType();
  
  if (dbType === 'postgresql') {
    return await executePgQuery<T>(query, params);
  }
  
  // MySQL execution
  const db = await getDbWithPool();
  if (!db) {
    throw new Error('MySQL connection not available');
  }
  
  // For MySQL, we need to use the pool directly
  const pool = (db as any)._pool;
  if (pool) {
    const [rows] = await pool.query(query, params);
    return rows as T[];
  }
  
  throw new Error('MySQL pool not available');
}

/**
 * Execute operation with retry on the configured database
 */
export async function executeWithRetryUnified<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  const dbType = getDatabaseType();
  
  if (dbType === 'postgresql') {
    return await executePgWithRetry(operation, maxRetries);
  }
  
  return await executeWithRetry(operation, maxRetries);
}

/**
 * Get database connection status
 */
export async function getDatabaseStatus(): Promise<{
  type: DatabaseType;
  configured: boolean;
  connected: boolean;
  details?: any;
}> {
  const dbType = getDatabaseType();
  
  if (dbType === 'postgresql') {
    const status = await getPgStatus();
    return {
      type: 'postgresql',
      configured: status.configured,
      connected: status.connected,
      details: {
        poolSize: status.poolSize,
        idleCount: status.idleCount,
        waitingCount: status.waitingCount,
      },
    };
  }
  
  // MySQL status
  const configured = !!process.env.DATABASE_URL;
  let connected = false;
  
  if (configured) {
    try {
      const db = await getDb();
      connected = !!db;
    } catch (error) {
      connected = false;
    }
  }
  
  return {
    type: 'mysql',
    configured,
    connected,
  };
}

/**
 * Get all database statuses (for dual-database mode)
 */
export async function getAllDatabaseStatuses(): Promise<{
  mysql: { configured: boolean; connected: boolean };
  postgresql: { configured: boolean; connected: boolean };
  active: DatabaseType;
}> {
  // MySQL status
  let mysqlConfigured = !!process.env.DATABASE_URL;
  let mysqlConnected = false;
  
  if (mysqlConfigured) {
    try {
      const db = await getDb();
      mysqlConnected = !!db;
    } catch (error) {
      mysqlConnected = false;
    }
  }
  
  // PostgreSQL status
  const pgStatus = await getPgStatus();
  
  return {
    mysql: {
      configured: mysqlConfigured,
      connected: mysqlConnected,
    },
    postgresql: {
      configured: pgStatus.configured,
      connected: pgStatus.connected,
    },
    active: getDatabaseType(),
  };
}

/**
 * SQL dialect helpers
 * Use these to write cross-database compatible queries
 */
export const SqlDialect = {
  /**
   * Get current timestamp expression
   */
  now(): string {
    const dbType = getDatabaseType();
    return dbType === 'postgresql' ? 'CURRENT_TIMESTAMP' : 'NOW()';
  },
  
  /**
   * Get boolean true value
   */
  boolTrue(): string | number {
    const dbType = getDatabaseType();
    return dbType === 'postgresql' ? 'TRUE' : '1';
  },
  
  /**
   * Get boolean false value
   */
  boolFalse(): string | number {
    const dbType = getDatabaseType();
    return dbType === 'postgresql' ? 'FALSE' : '0';
  },
  
  /**
   * Get auto-increment syntax
   */
  autoIncrement(): string {
    const dbType = getDatabaseType();
    return dbType === 'postgresql' ? 'SERIAL' : 'AUTO_INCREMENT';
  },
  
  /**
   * Get JSON type
   */
  jsonType(): string {
    const dbType = getDatabaseType();
    return dbType === 'postgresql' ? 'JSONB' : 'JSON';
  },
  
  /**
   * Get limit/offset syntax
   */
  limitOffset(limit: number, offset: number = 0): string {
    return `LIMIT ${limit} OFFSET ${offset}`;
  },
  
  /**
   * Get date format function
   */
  dateFormat(column: string, format: string): string {
    const dbType = getDatabaseType();
    if (dbType === 'postgresql') {
      // Convert MySQL format to PostgreSQL
      const pgFormat = format
        .replace('%Y', 'YYYY')
        .replace('%m', 'MM')
        .replace('%d', 'DD')
        .replace('%H', 'HH24')
        .replace('%i', 'MI')
        .replace('%s', 'SS');
      return `TO_CHAR(${column}, '${pgFormat}')`;
    }
    return `DATE_FORMAT(${column}, '${format}')`;
  },
  
  /**
   * Get CONCAT function
   */
  concat(...args: string[]): string {
    const dbType = getDatabaseType();
    if (dbType === 'postgresql') {
      return args.join(' || ');
    }
    return `CONCAT(${args.join(', ')})`;
  },
  
  /**
   * Get IFNULL/COALESCE function
   */
  ifNull(column: string, defaultValue: string): string {
    const dbType = getDatabaseType();
    return dbType === 'postgresql' 
      ? `COALESCE(${column}, ${defaultValue})`
      : `IFNULL(${column}, ${defaultValue})`;
  },
};

/**
 * Database migration helper
 * Check if a table exists in the current database
 */
export async function tableExists(tableName: string): Promise<boolean> {
  const dbType = getDatabaseType();
  
  try {
    if (dbType === 'postgresql') {
      const result = await executePgQuery<{ exists: boolean }>(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )`,
        [tableName]
      );
      return result[0]?.exists ?? false;
    }
    
    // MySQL
    const result = await executeQuery<{ count: number }>(
      `SELECT COUNT(*) as count FROM information_schema.tables 
       WHERE table_schema = DATABASE() AND table_name = ?`,
      [tableName]
    );
    return (result[0]?.count ?? 0) > 0;
  } catch (error) {
    console.warn(`[Database] Error checking table ${tableName}:`, error);
    return false;
  }
}

/**
 * Get list of all tables in the current database
 */
export async function listTables(): Promise<string[]> {
  const dbType = getDatabaseType();
  
  try {
    if (dbType === 'postgresql') {
      const result = await executePgQuery<{ table_name: string }>(
        `SELECT table_name FROM information_schema.tables 
         WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
         ORDER BY table_name`
      );
      return result.map(r => r.table_name);
    }
    
    // MySQL
    const result = await executeQuery<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = DATABASE()
       ORDER BY table_name`
    );
    return result.map(r => r.table_name);
  } catch (error) {
    console.warn('[Database] Error listing tables:', error);
    return [];
  }
}

