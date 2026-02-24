/**
 * Connection Pool Monitoring Service
 * Monitors and optimizes database connection pool performance
 */

import mysql from 'mysql2/promise';

// Pool statistics interface
export interface PoolStats {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingRequests: number;
  connectionErrors: number;
  avgResponseTime: number;
  lastHealthCheck: Date;
  uptime: number;
}

// Pool configuration interface
export interface PoolConfig {
  connectionLimit: number;
  waitForConnections: boolean;
  queueLimit: number;
  enableKeepAlive: boolean;
  keepAliveInitialDelay: number;
  connectTimeout: number;
  idleTimeout: number;
}

// Monitoring data storage
interface MonitoringData {
  connectionErrors: number;
  responseTimes: number[];
  startTime: Date;
  lastHealthCheck: Date;
}

// Default optimized pool configuration
export const OPTIMIZED_POOL_CONFIG: PoolConfig = {
  connectionLimit: 20, // Increased from 10 for better concurrency
  waitForConnections: true,
  queueLimit: 100, // Limit queue to prevent memory issues
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000, // 10 seconds
  connectTimeout: 30000, // 30 seconds
  idleTimeout: 60000, // 60 seconds - release idle connections
};

// High-load pool configuration
export const HIGH_LOAD_POOL_CONFIG: PoolConfig = {
  connectionLimit: 50,
  waitForConnections: true,
  queueLimit: 200,
  enableKeepAlive: true,
  keepAliveInitialDelay: 5000,
  connectTimeout: 20000,
  idleTimeout: 30000,
};

// Low-resource pool configuration
export const LOW_RESOURCE_POOL_CONFIG: PoolConfig = {
  connectionLimit: 5,
  waitForConnections: true,
  queueLimit: 50,
  enableKeepAlive: true,
  keepAliveInitialDelay: 30000,
  connectTimeout: 60000,
  idleTimeout: 120000,
};

class ConnectionPoolService {
  private monitoringData: MonitoringData = {
    connectionErrors: 0,
    responseTimes: [],
    startTime: new Date(),
    lastHealthCheck: new Date(),
  };

  private pool: mysql.Pool | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize the pool service with a mysql pool
   */
  setPool(pool: mysql.Pool): void {
    this.pool = pool;
    this.startHealthCheck();
  }

  /**
   * Start periodic health checks
   */
  private startHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Health check every 30 seconds
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, 30000);
  }

  /**
   * Perform a health check on the pool
   */
  async performHealthCheck(): Promise<boolean> {
    if (!this.pool) return false;

    const startTime = Date.now();
    try {
      const connection = await this.pool.getConnection();
      await connection.ping();
      connection.release();

      const responseTime = Date.now() - startTime;
      this.recordResponseTime(responseTime);
      this.monitoringData.lastHealthCheck = new Date();

      return true;
    } catch (error) {
      this.monitoringData.connectionErrors++;
      console.error('[ConnectionPool] Health check failed:', error);
      return false;
    }
  }

  /**
   * Record response time for monitoring
   */
  private recordResponseTime(time: number): void {
    this.monitoringData.responseTimes.push(time);
    // Keep only last 100 response times
    if (this.monitoringData.responseTimes.length > 100) {
      this.monitoringData.responseTimes.shift();
    }
  }

  /**
   * Get current pool statistics
   */
  async getStats(): Promise<PoolStats | null> {
    if (!this.pool) return null;

    try {
      // Get pool internal stats (mysql2 specific)
      const poolInternal = this.pool as any;
      const pool = poolInternal.pool;

      const totalConnections = pool?._allConnections?.length || 0;
      const idleConnections = pool?._freeConnections?.length || 0;
      const activeConnections = totalConnections - idleConnections;
      const waitingRequests = pool?._connectionQueue?.length || 0;

      const avgResponseTime = this.monitoringData.responseTimes.length > 0
        ? this.monitoringData.responseTimes.reduce((a, b) => a + b, 0) / this.monitoringData.responseTimes.length
        : 0;

      const uptime = Date.now() - this.monitoringData.startTime.getTime();

      return {
        totalConnections,
        activeConnections,
        idleConnections,
        waitingRequests,
        connectionErrors: this.monitoringData.connectionErrors,
        avgResponseTime: Math.round(avgResponseTime * 100) / 100,
        lastHealthCheck: this.monitoringData.lastHealthCheck,
        uptime,
      };
    } catch (error) {
      console.error('[ConnectionPool] Failed to get stats:', error);
      return null;
    }
  }

  /**
   * Get recommended pool configuration based on current load
   */
  async getRecommendedConfig(): Promise<{ config: PoolConfig; reason: string }> {
    const stats = await this.getStats();

    if (!stats) {
      return {
        config: OPTIMIZED_POOL_CONFIG,
        reason: 'Default configuration (no stats available)',
      };
    }

    // High load: many waiting requests or high active connections
    if (stats.waitingRequests > 10 || stats.activeConnections > stats.totalConnections * 0.8) {
      return {
        config: HIGH_LOAD_POOL_CONFIG,
        reason: `High load detected: ${stats.waitingRequests} waiting, ${stats.activeConnections}/${stats.totalConnections} active`,
      };
    }

    // Low usage: few active connections
    if (stats.activeConnections < stats.totalConnections * 0.2 && stats.waitingRequests === 0) {
      return {
        config: LOW_RESOURCE_POOL_CONFIG,
        reason: `Low usage: only ${stats.activeConnections}/${stats.totalConnections} connections active`,
      };
    }

    return {
      config: OPTIMIZED_POOL_CONFIG,
      reason: 'Normal load - using optimized configuration',
    };
  }

  /**
   * Reset monitoring data
   */
  resetStats(): void {
    this.monitoringData = {
      connectionErrors: 0,
      responseTimes: [],
      startTime: new Date(),
      lastHealthCheck: new Date(),
    };
  }

  /**
   * Stop health check interval
   */
  stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Get connection pool health status
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    message: string;
    details: Record<string, any>;
  }> {
    const stats = await this.getStats();
    const isHealthy = await this.performHealthCheck();

    if (!stats || !isHealthy) {
      return {
        status: 'unhealthy',
        message: 'Connection pool is not responding',
        details: { stats, isHealthy },
      };
    }

    // Check for degraded conditions
    const degradedConditions: string[] = [];

    if (stats.connectionErrors > 10) {
      degradedConditions.push(`High error count: ${stats.connectionErrors}`);
    }

    if (stats.avgResponseTime > 1000) {
      degradedConditions.push(`High latency: ${stats.avgResponseTime}ms`);
    }

    if (stats.waitingRequests > 20) {
      degradedConditions.push(`Many waiting requests: ${stats.waitingRequests}`);
    }

    if (stats.activeConnections >= stats.totalConnections) {
      degradedConditions.push('All connections in use');
    }

    if (degradedConditions.length > 0) {
      return {
        status: 'degraded',
        message: degradedConditions.join('; '),
        details: stats,
      };
    }

    return {
      status: 'healthy',
      message: 'Connection pool is operating normally',
      details: stats,
    };
  }
}

// Export singleton instance
export const connectionPoolService = new ConnectionPoolService();

// Export helper functions
export function getPoolStats(): Promise<PoolStats | null> {
  return connectionPoolService.getStats();
}

export function getPoolHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  message: string;
  details: Record<string, any>;
}> {
  return connectionPoolService.getHealthStatus();
}

export function getRecommendedPoolConfig(): Promise<{ config: PoolConfig; reason: string }> {
  return connectionPoolService.getRecommendedConfig();
}
