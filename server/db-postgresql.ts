/**
 * PostgreSQL Database Connection Module
 * 
 * Module này cung cấp kết nối đến PostgreSQL database
 * Sử dụng drizzle-orm với pg driver
 * 
 * Để sử dụng PostgreSQL thay vì MySQL:
 * 1. Set DATABASE_TYPE=postgresql trong environment
 * 2. Set POSTGRES_URL với connection string
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, PoolClient } from 'pg';

// PostgreSQL connection pool
let _pgPool: Pool | null = null;
let _pgDb: ReturnType<typeof drizzle> | null = null;
let _connectionRetries = 0;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// Pool configuration
const poolConfig = {
  max: 10,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 30000,
};

/**
 * Get PostgreSQL connection URL from environment
 */
function getPostgresUrl(): string | null {
  // Try different environment variable names
  const url = process.env.POSTGRES_URL 
    || process.env.POSTGRESQL_URL 
    || process.env.PG_URL
    || process.env.DATABASE_URL_PG;
  
  // Fallback to local PostgreSQL if configured
  if (!url && process.env.PG_LOCAL_ENABLED === 'true') {
    const host = process.env.PG_HOST || 'localhost';
    const port = process.env.PG_PORT || '5432';
    const user = process.env.PG_USER || 'spc_user';
    const password = process.env.PG_PASSWORD || 'spc_password';
    const database = process.env.PG_DATABASE || 'spc_calculator';
    return `postgresql://${user}:${password}@${host}:${port}/${database}`;
  }
  
  return url || null;
}

/**
 * Create PostgreSQL connection pool with retry logic
 */
async function createPgPoolWithRetry(): Promise<Pool | null> {
  const connectionString = getPostgresUrl();
  
  if (!connectionString) {
    console.warn('[PostgreSQL] No connection URL configured');
    console.warn('[PostgreSQL] Set POSTGRES_URL environment variable');
    return null;
  }

  while (_connectionRetries < MAX_RETRIES) {
    try {
      const pool = new Pool({
        connectionString,
        ...poolConfig,
        ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
      });

      // Test connection
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();

      console.log('[PostgreSQL] Connection pool established successfully');
      _connectionRetries = 0;
      return pool;
    } catch (error) {
      _connectionRetries++;
      console.warn(`[PostgreSQL] Connection attempt ${_connectionRetries}/${MAX_RETRIES} failed:`, error);

      if (_connectionRetries < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * _connectionRetries));
      }
    }
  }

  console.error('[PostgreSQL] All connection attempts failed');
  _connectionRetries = 0;
  return null;
}

/**
 * Get PostgreSQL database instance
 */
export async function getPgDb() {
  if (!_pgDb) {
    const connectionString = getPostgresUrl();
    if (connectionString) {
      try {
        _pgPool = await createPgPoolWithRetry();
        if (_pgPool) {
          _pgDb = drizzle(_pgPool);
        }
      } catch (error) {
        console.warn('[PostgreSQL] Failed to connect:', error);
        _pgDb = null;
      }
    }
  }
  return _pgDb;
}

/**
 * Get PostgreSQL pool for direct queries
 */
export async function getPgPool(): Promise<Pool | null> {
  if (!_pgPool) {
    _pgPool = await createPgPoolWithRetry();
  }
  return _pgPool;
}

/**
 * Execute raw SQL query on PostgreSQL
 */
export async function executePgQuery<T = any>(
  query: string,
  params: any[] = []
): Promise<T[]> {
  const pool = await getPgPool();
  if (!pool) {
    throw new Error('PostgreSQL connection not available');
  }

  const client = await pool.connect();
  try {
    const result = await client.query(query, params);
    return result.rows as T[];
  } finally {
    client.release();
  }
}

/**
 * Execute query with automatic retry on connection errors
 */
export async function executePgWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      // Check if it's a connection error that can be retried
      const isConnectionError =
        error.code === 'ECONNRESET' ||
        error.code === 'ECONNREFUSED' ||
        error.code === 'ETIMEDOUT' ||
        error.message?.includes('Connection terminated');

      if (isConnectionError && attempt < maxRetries) {
        console.warn(`[PostgreSQL] Connection error on attempt ${attempt}/${maxRetries}, retrying...`);

        // Reset pool to force reconnection
        if (_pgPool) {
          try {
            await _pgPool.end();
          } catch (e) {
            // Ignore pool end errors
          }
          _pgPool = null;
          _pgDb = null;
        }

        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt));
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}

/**
 * Close PostgreSQL connection pool
 */
export async function closePgPool(): Promise<void> {
  if (_pgPool) {
    await _pgPool.end();
    _pgPool = null;
    _pgDb = null;
    console.log('[PostgreSQL] Connection pool closed');
  }
}

/**
 * Check if PostgreSQL is configured and available
 */
export function isPgConfigured(): boolean {
  return !!getPostgresUrl();
}

/**
 * Get PostgreSQL connection status
 */
export async function getPgStatus(): Promise<{
  configured: boolean;
  connected: boolean;
  poolSize?: number;
  idleCount?: number;
  waitingCount?: number;
}> {
  const configured = isPgConfigured();
  
  if (!configured) {
    return { configured: false, connected: false };
  }

  try {
    const pool = await getPgPool();
    if (pool) {
      // Test connection
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();

      return {
        configured: true,
        connected: true,
        poolSize: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount,
      };
    }
  } catch (error) {
    console.warn('[PostgreSQL] Status check failed:', error);
  }

  return { configured: true, connected: false };
}
