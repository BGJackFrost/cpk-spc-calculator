/**
 * Database Failover Module
 * 
 * Tự động chuyển sang PostgreSQL khi MySQL không khả dụng
 * và tự động khôi phục khi MySQL hoạt động trở lại
 */

import { notifyOwner } from './_core/notification';

// Failover state
interface FailoverState {
  activeDatabase: 'mysql' | 'postgresql';
  mysqlHealthy: boolean;
  postgresqlHealthy: boolean;
  lastMysqlCheck: Date | null;
  lastPostgresqlCheck: Date | null;
  failoverCount: number;
  recoveryCount: number;
  lastFailoverAt: Date | null;
  lastRecoveryAt: Date | null;
}

let _failoverState: FailoverState = {
  activeDatabase: 'mysql',
  mysqlHealthy: true,
  postgresqlHealthy: false,
  lastMysqlCheck: null,
  lastPostgresqlCheck: null,
  failoverCount: 0,
  recoveryCount: 0,
  lastFailoverAt: null,
  lastRecoveryAt: null,
};

// Health check intervals
const HEALTH_CHECK_INTERVAL_MS = 30000; // 30 seconds
const FAILOVER_THRESHOLD = 3; // Number of consecutive failures before failover
const RECOVERY_THRESHOLD = 3; // Number of consecutive successes before recovery

let _mysqlFailureCount = 0;
let _mysqlSuccessCount = 0;
let _healthCheckTimer: NodeJS.Timeout | null = null;

/**
 * Check MySQL health
 */
async function checkMysqlHealth(): Promise<boolean> {
  try {
    const { getDb } = await import('./db');
    const db = await getDb();
    
    if (!db) {
      return false;
    }
    
    // Simple query to test connection
    const { sql } = await import('drizzle-orm');
    await db.execute(sql`SELECT 1`);
    
    return true;
  } catch (error) {
    console.warn('[Failover] MySQL health check failed:', error);
    return false;
  }
}

/**
 * Check PostgreSQL health
 */
async function checkPostgresqlHealth(): Promise<boolean> {
  try {
    const { getPgStatus } = await import('./db-postgresql');
    const status = await getPgStatus();
    return status.connected;
  } catch (error) {
    console.warn('[Failover] PostgreSQL health check failed:', error);
    return false;
  }
}

/**
 * Perform failover to PostgreSQL
 */
async function performFailover(): Promise<boolean> {
  console.log('[Failover] Initiating failover to PostgreSQL...');
  
  try {
    // Check if PostgreSQL is available
    const pgHealthy = await checkPostgresqlHealth();
    
    if (!pgHealthy) {
      console.error('[Failover] Cannot failover: PostgreSQL is not available');
      return false;
    }
    
    // Update state
    _failoverState.activeDatabase = 'postgresql';
    _failoverState.failoverCount++;
    _failoverState.lastFailoverAt = new Date();
    
    console.log('[Failover] Successfully failed over to PostgreSQL');
    
    // Notify owner
    await notifyOwner({
      title: '⚠️ Database Failover: MySQL → PostgreSQL',
      content: `MySQL không khả dụng. Hệ thống đã tự động chuyển sang PostgreSQL.\n\nThời gian: ${new Date().toLocaleString('vi-VN')}\nSố lần failover: ${_failoverState.failoverCount}`,
    });
    
    return true;
  } catch (error) {
    console.error('[Failover] Failover failed:', error);
    return false;
  }
}

/**
 * Perform recovery back to MySQL
 */
async function performRecovery(): Promise<boolean> {
  console.log('[Failover] Initiating recovery to MySQL...');
  
  try {
    // Verify MySQL is healthy
    const mysqlHealthy = await checkMysqlHealth();
    
    if (!mysqlHealthy) {
      console.warn('[Failover] Cannot recover: MySQL is still unhealthy');
      return false;
    }
    
    // Update state
    _failoverState.activeDatabase = 'mysql';
    _failoverState.recoveryCount++;
    _failoverState.lastRecoveryAt = new Date();
    
    console.log('[Failover] Successfully recovered to MySQL');
    
    // Notify owner
    await notifyOwner({
      title: '✅ Database Recovery: PostgreSQL → MySQL',
      content: `MySQL đã khôi phục. Hệ thống đã tự động chuyển về MySQL.\n\nThời gian: ${new Date().toLocaleString('vi-VN')}\nSố lần recovery: ${_failoverState.recoveryCount}`,
    });
    
    return true;
  } catch (error) {
    console.error('[Failover] Recovery failed:', error);
    return false;
  }
}

/**
 * Health check loop
 */
async function healthCheckLoop(): Promise<void> {
  // Check MySQL health
  const mysqlHealthy = await checkMysqlHealth();
  _failoverState.mysqlHealthy = mysqlHealthy;
  _failoverState.lastMysqlCheck = new Date();
  
  // Check PostgreSQL health
  const pgHealthy = await checkPostgresqlHealth();
  _failoverState.postgresqlHealthy = pgHealthy;
  _failoverState.lastPostgresqlCheck = new Date();
  
  // Failover logic
  if (_failoverState.activeDatabase === 'mysql') {
    if (!mysqlHealthy) {
      _mysqlFailureCount++;
      _mysqlSuccessCount = 0;
      
      console.log(`[Failover] MySQL failure ${_mysqlFailureCount}/${FAILOVER_THRESHOLD}`);
      
      if (_mysqlFailureCount >= FAILOVER_THRESHOLD && pgHealthy) {
        await performFailover();
        _mysqlFailureCount = 0;
      }
    } else {
      _mysqlFailureCount = 0;
      _mysqlSuccessCount++;
    }
  } else {
    // Currently on PostgreSQL, check if MySQL recovered
    if (mysqlHealthy) {
      _mysqlSuccessCount++;
      _mysqlFailureCount = 0;
      
      console.log(`[Failover] MySQL recovery check ${_mysqlSuccessCount}/${RECOVERY_THRESHOLD}`);
      
      if (_mysqlSuccessCount >= RECOVERY_THRESHOLD) {
        await performRecovery();
        _mysqlSuccessCount = 0;
      }
    } else {
      _mysqlSuccessCount = 0;
      _mysqlFailureCount++;
    }
  }
}

/**
 * Start failover monitoring
 */
export function startFailoverMonitoring(): void {
  if (_healthCheckTimer) {
    console.log('[Failover] Monitoring already started');
    return;
  }
  
  // Check if failover is enabled
  const failoverEnabled = process.env.DATABASE_FAILOVER_ENABLED === 'true';
  if (!failoverEnabled) {
    console.log('[Failover] Failover monitoring disabled (set DATABASE_FAILOVER_ENABLED=true to enable)');
    return;
  }
  
  console.log('[Failover] Starting failover monitoring...');
  console.log(`[Failover] Health check interval: ${HEALTH_CHECK_INTERVAL_MS}ms`);
  console.log(`[Failover] Failover threshold: ${FAILOVER_THRESHOLD} failures`);
  console.log(`[Failover] Recovery threshold: ${RECOVERY_THRESHOLD} successes`);
  
  // Initial health check
  healthCheckLoop();
  
  // Start periodic health checks
  _healthCheckTimer = setInterval(healthCheckLoop, HEALTH_CHECK_INTERVAL_MS);
}

/**
 * Stop failover monitoring
 */
export function stopFailoverMonitoring(): void {
  if (_healthCheckTimer) {
    clearInterval(_healthCheckTimer);
    _healthCheckTimer = null;
    console.log('[Failover] Monitoring stopped');
  }
}

/**
 * Get current failover state
 */
export function getFailoverState(): FailoverState {
  return { ..._failoverState };
}

/**
 * Get active database type
 */
export function getActiveDatabase(): 'mysql' | 'postgresql' {
  return _failoverState.activeDatabase;
}

/**
 * Check if failover is active
 */
export function isFailoverActive(): boolean {
  return _failoverState.activeDatabase === 'postgresql';
}

/**
 * Manually trigger failover (for testing)
 */
export async function manualFailover(): Promise<boolean> {
  return await performFailover();
}

/**
 * Manually trigger recovery (for testing)
 */
export async function manualRecovery(): Promise<boolean> {
  return await performRecovery();
}

/**
 * Reset failover state (for testing)
 */
export function resetFailoverState(): void {
  _failoverState = {
    activeDatabase: 'mysql',
    mysqlHealthy: true,
    postgresqlHealthy: false,
    lastMysqlCheck: null,
    lastPostgresqlCheck: null,
    failoverCount: 0,
    recoveryCount: 0,
    lastFailoverAt: null,
    lastRecoveryAt: null,
  };
  _mysqlFailureCount = 0;
  _mysqlSuccessCount = 0;
}
