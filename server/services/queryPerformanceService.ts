/**
 * Query Performance Monitoring Service
 * Monitors and logs slow queries for optimization
 */

import { getDb } from '../db';
import { sql } from 'drizzle-orm';

// Query log entry interface
export interface QueryLogEntry {
  id: string;
  query: string;
  params?: any[];
  executionTime: number;
  timestamp: Date;
  source?: string;
  rowsAffected?: number;
  isSlowQuery: boolean;
}

// Query statistics interface
export interface QueryStats {
  totalQueries: number;
  slowQueries: number;
  avgExecutionTime: number;
  maxExecutionTime: number;
  minExecutionTime: number;
  queriesBySource: Record<string, number>;
  slowQueryThreshold: number;
}

// EXPLAIN result interface
export interface ExplainResult {
  id: number;
  selectType: string;
  table: string;
  partitions: string | null;
  type: string;
  possibleKeys: string | null;
  key: string | null;
  keyLen: string | null;
  ref: string | null;
  rows: number;
  filtered: number;
  extra: string | null;
}

// Query analysis result
export interface QueryAnalysis {
  query: string;
  explainResult: ExplainResult[];
  recommendations: string[];
  estimatedCost: number;
  indexSuggestions: string[];
}

class QueryPerformanceService {
  private queryLogs: QueryLogEntry[] = [];
  private slowQueryThreshold: number = 100; // ms
  private maxLogSize: number = 1000;

  /**
   * Set slow query threshold
   */
  setSlowQueryThreshold(ms: number): void {
    this.slowQueryThreshold = ms;
  }

  /**
   * Log a query execution
   */
  logQuery(entry: Omit<QueryLogEntry, 'id' | 'isSlowQuery'>): QueryLogEntry {
    const logEntry: QueryLogEntry = {
      ...entry,
      id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      isSlowQuery: entry.executionTime > this.slowQueryThreshold,
    };

    this.queryLogs.push(logEntry);

    // Keep only last maxLogSize entries
    if (this.queryLogs.length > this.maxLogSize) {
      this.queryLogs.shift();
    }

    // Log slow queries to console
    if (logEntry.isSlowQuery) {
      console.warn(`[SlowQuery] ${entry.executionTime}ms: ${entry.query.substring(0, 200)}...`);
    }

    return logEntry;
  }

  /**
   * Get query statistics
   */
  getStats(): QueryStats {
    const executionTimes = this.queryLogs.map(q => q.executionTime);
    const slowQueries = this.queryLogs.filter(q => q.isSlowQuery);

    const queriesBySource: Record<string, number> = {};
    this.queryLogs.forEach(q => {
      const source = q.source || 'unknown';
      queriesBySource[source] = (queriesBySource[source] || 0) + 1;
    });

    return {
      totalQueries: this.queryLogs.length,
      slowQueries: slowQueries.length,
      avgExecutionTime: executionTimes.length > 0
        ? Math.round(executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length * 100) / 100
        : 0,
      maxExecutionTime: executionTimes.length > 0 ? Math.max(...executionTimes) : 0,
      minExecutionTime: executionTimes.length > 0 ? Math.min(...executionTimes) : 0,
      queriesBySource,
      slowQueryThreshold: this.slowQueryThreshold,
    };
  }

  /**
   * Get slow queries
   */
  getSlowQueries(limit: number = 50): QueryLogEntry[] {
    return this.queryLogs
      .filter(q => q.isSlowQuery)
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, limit);
  }

  /**
   * Get recent queries
   */
  getRecentQueries(limit: number = 50): QueryLogEntry[] {
    return this.queryLogs
      .slice(-limit)
      .reverse();
  }

  /**
   * Analyze a query using EXPLAIN
   */
  async analyzeQuery(query: string): Promise<QueryAnalysis | null> {
    const db = await getDb();
    if (!db) return null;

    try {
      // Run EXPLAIN on the query
      const explainQuery = `EXPLAIN ${query}`;
      const result = await db.execute(sql.raw(explainQuery));
      
      const explainResult: ExplainResult[] = (result as any[]).map((row: any) => ({
        id: row.id,
        selectType: row.select_type,
        table: row.table,
        partitions: row.partitions,
        type: row.type,
        possibleKeys: row.possible_keys,
        key: row.key,
        keyLen: row.key_len,
        ref: row.ref,
        rows: row.rows,
        filtered: row.filtered,
        extra: row.Extra,
      }));

      // Generate recommendations
      const recommendations: string[] = [];
      const indexSuggestions: string[] = [];
      let estimatedCost = 0;

      explainResult.forEach(row => {
        estimatedCost += row.rows;

        // Check for full table scan
        if (row.type === 'ALL') {
          recommendations.push(`Full table scan on ${row.table} - consider adding an index`);
          if (row.possibleKeys) {
            indexSuggestions.push(`Consider index on ${row.table} using columns: ${row.possibleKeys}`);
          }
        }

        // Check for filesort
        if (row.extra?.includes('Using filesort')) {
          recommendations.push(`Filesort detected on ${row.table} - consider adding index for ORDER BY columns`);
        }

        // Check for temporary table
        if (row.extra?.includes('Using temporary')) {
          recommendations.push(`Temporary table used for ${row.table} - consider optimizing GROUP BY or DISTINCT`);
        }

        // Check for no index used
        if (!row.key && row.possibleKeys) {
          recommendations.push(`No index used on ${row.table} despite available keys: ${row.possibleKeys}`);
        }

        // Check for low filtered percentage
        if (row.filtered < 50) {
          recommendations.push(`Low filter efficiency (${row.filtered}%) on ${row.table} - consider more selective WHERE conditions`);
        }
      });

      return {
        query,
        explainResult,
        recommendations,
        estimatedCost,
        indexSuggestions,
      };
    } catch (error) {
      console.error('[QueryPerformance] Failed to analyze query:', error);
      return null;
    }
  }

  /**
   * Get index usage statistics from MySQL
   */
  async getIndexUsageStats(): Promise<any[]> {
    const db = await getDb();
    if (!db) return [];

    try {
      const result = await db.execute(sql`
        SELECT 
          TABLE_NAME as tableName,
          INDEX_NAME as indexName,
          SEQ_IN_INDEX as seqInIndex,
          COLUMN_NAME as columnName,
          CARDINALITY as cardinality,
          INDEX_TYPE as indexType
        FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
        ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX
      `);
      
      return result as any[];
    } catch (error) {
      console.error('[QueryPerformance] Failed to get index stats:', error);
      return [];
    }
  }

  /**
   * Get table statistics
   */
  async getTableStats(): Promise<any[]> {
    const db = await getDb();
    if (!db) return [];

    try {
      const result = await db.execute(sql`
        SELECT 
          TABLE_NAME as tableName,
          TABLE_ROWS as tableRows,
          DATA_LENGTH as dataLength,
          INDEX_LENGTH as indexLength,
          AVG_ROW_LENGTH as avgRowLength,
          AUTO_INCREMENT as autoIncrement
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
        ORDER BY TABLE_ROWS DESC
      `);
      
      return result as any[];
    } catch (error) {
      console.error('[QueryPerformance] Failed to get table stats:', error);
      return [];
    }
  }

  /**
   * Get slow query log from MySQL (if enabled)
   */
  async getMySQLSlowQueryLog(limit: number = 50): Promise<any[]> {
    const db = await getDb();
    if (!db) return [];

    try {
      // Check if slow_query_log is enabled
      const statusResult = await db.execute(sql`SHOW VARIABLES LIKE 'slow_query_log'`);
      const status = (statusResult as any[])[0];
      
      if (status?.Value !== 'ON') {
        return [{
          message: 'MySQL slow_query_log is not enabled',
          recommendation: 'Enable with: SET GLOBAL slow_query_log = ON; SET GLOBAL long_query_time = 1;'
        }];
      }

      // Get slow query log file location
      const logFileResult = await db.execute(sql`SHOW VARIABLES LIKE 'slow_query_log_file'`);
      const logFile = (logFileResult as any[])[0]?.Value;

      return [{
        slowQueryLogEnabled: true,
        logFile,
        message: 'Slow query log is enabled. Check the log file for details.'
      }];
    } catch (error) {
      console.error('[QueryPerformance] Failed to get MySQL slow query log:', error);
      return [];
    }
  }

  /**
   * Clear query logs
   */
  clearLogs(): void {
    this.queryLogs = [];
  }

  /**
   * Export query logs to JSON
   */
  exportLogs(): string {
    return JSON.stringify({
      exportedAt: new Date().toISOString(),
      stats: this.getStats(),
      slowQueries: this.getSlowQueries(),
      recentQueries: this.getRecentQueries(),
    }, null, 2);
  }
}

// Export singleton instance
export const queryPerformanceService = new QueryPerformanceService();

// Export helper functions
export function logQuery(entry: Omit<QueryLogEntry, 'id' | 'isSlowQuery'>): QueryLogEntry {
  return queryPerformanceService.logQuery(entry);
}

export function getQueryStats(): QueryStats {
  return queryPerformanceService.getStats();
}

export function getSlowQueries(limit?: number): QueryLogEntry[] {
  return queryPerformanceService.getSlowQueries(limit);
}

export function analyzeQuery(query: string): Promise<QueryAnalysis | null> {
  return queryPerformanceService.analyzeQuery(query);
}

export function getIndexUsageStats(): Promise<any[]> {
  return queryPerformanceService.getIndexUsageStats();
}

export function getTableStats(): Promise<any[]> {
  return queryPerformanceService.getTableStats();
}
