/**
 * Slow Query Audit Service
 * 
 * Provides comprehensive slow query analysis using EXPLAIN ANALYZE
 * and generates optimization recommendations.
 */

import { getDb } from '../db';
import { sql } from 'drizzle-orm';

// Slow query entry with analysis
export interface SlowQueryEntry {
  id: string;
  query: string;
  executionTime: number;
  timestamp: Date;
  source?: string;
  explainResult?: ExplainAnalyzeResult[];
  recommendations: string[];
  indexSuggestions: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// EXPLAIN ANALYZE result
export interface ExplainAnalyzeResult {
  id: number;
  selectType: string;
  table: string;
  partitions: string | null;
  type: string; // ALL, index, range, ref, eq_ref, const, system
  possibleKeys: string | null;
  key: string | null;
  keyLen: string | null;
  ref: string | null;
  rows: number;
  filtered: number;
  extra: string | null;
}

// Query audit statistics
export interface QueryAuditStats {
  totalAudited: number;
  criticalQueries: number;
  highQueries: number;
  mediumQueries: number;
  lowQueries: number;
  avgExecutionTime: number;
  maxExecutionTime: number;
  commonIssues: { issue: string; count: number }[];
  suggestedIndexes: { table: string; columns: string; priority: number }[];
}

// Audit configuration
interface AuditConfig {
  slowQueryThreshold: number; // ms
  criticalThreshold: number; // ms
  highThreshold: number; // ms
  mediumThreshold: number; // ms
  maxAuditHistory: number;
}

class SlowQueryAuditService {
  private auditHistory: SlowQueryEntry[] = [];
  private config: AuditConfig = {
    slowQueryThreshold: 100,
    criticalThreshold: 5000,
    highThreshold: 2000,
    mediumThreshold: 500,
    maxAuditHistory: 500,
  };

  /**
   * Update audit configuration
   */
  updateConfig(config: Partial<AuditConfig>): AuditConfig {
    this.config = { ...this.config, ...config };
    return this.config;
  }

  /**
   * Get current configuration
   */
  getConfig(): AuditConfig {
    return { ...this.config };
  }

  /**
   * Determine severity based on execution time
   */
  private getSeverity(executionTime: number): SlowQueryEntry['severity'] {
    if (executionTime >= this.config.criticalThreshold) return 'critical';
    if (executionTime >= this.config.highThreshold) return 'high';
    if (executionTime >= this.config.mediumThreshold) return 'medium';
    return 'low';
  }

  /**
   * Audit a slow query with EXPLAIN ANALYZE
   */
  async auditQuery(
    query: string,
    executionTime: number,
    source?: string
  ): Promise<SlowQueryEntry> {
    const entry: SlowQueryEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      query,
      executionTime,
      timestamp: new Date(),
      source,
      recommendations: [],
      indexSuggestions: [],
      severity: this.getSeverity(executionTime),
    };

    // Try to run EXPLAIN on the query
    try {
      const explainResult = await this.runExplain(query);
      if (explainResult) {
        entry.explainResult = explainResult;
        const analysis = this.analyzeExplainResult(explainResult, query);
        entry.recommendations = analysis.recommendations;
        entry.indexSuggestions = analysis.indexSuggestions;
      }
    } catch (error) {
      entry.recommendations.push('Could not analyze query - may contain parameters or syntax issues');
    }

    // Add to history
    this.auditHistory.push(entry);
    if (this.auditHistory.length > this.config.maxAuditHistory) {
      this.auditHistory.shift();
    }

    return entry;
  }

  /**
   * Run EXPLAIN on a query
   */
  private async runExplain(query: string): Promise<ExplainAnalyzeResult[] | null> {
    const db = await getDb();
    if (!db) return null;

    // Only run EXPLAIN on SELECT queries
    const trimmedQuery = query.trim().toUpperCase();
    if (!trimmedQuery.startsWith('SELECT')) {
      return null;
    }

    try {
      const explainQuery = `EXPLAIN ${query}`;
      const result = await db.execute(sql.raw(explainQuery));
      
      return (result as any[]).map((row: any) => ({
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
    } catch {
      return null;
    }
  }

  /**
   * Analyze EXPLAIN result and generate recommendations
   */
  private analyzeExplainResult(
    explainResult: ExplainAnalyzeResult[],
    query: string
  ): { recommendations: string[]; indexSuggestions: string[] } {
    const recommendations: string[] = [];
    const indexSuggestions: string[] = [];

    explainResult.forEach((row) => {
      // Full table scan detection
      if (row.type === 'ALL') {
        recommendations.push(
          `[CRITICAL] Full table scan on '${row.table}' - scanning ${row.rows} rows`
        );
        if (row.possibleKeys) {
          indexSuggestions.push(
            `CREATE INDEX idx_${row.table}_optimize ON ${row.table}(${row.possibleKeys.split(',')[0].trim()})`
          );
        } else {
          // Try to extract columns from WHERE clause
          const whereMatch = query.match(/WHERE\s+(\w+)\s*[=<>]/i);
          if (whereMatch) {
            indexSuggestions.push(
              `CREATE INDEX idx_${row.table}_${whereMatch[1]} ON ${row.table}(${whereMatch[1]})`
            );
          }
        }
      }

      // Index scan but could be better
      if (row.type === 'index') {
        recommendations.push(
          `[WARNING] Index scan on '${row.table}' - consider more selective index`
        );
      }

      // Filesort detection
      if (row.extra?.includes('Using filesort')) {
        recommendations.push(
          `[WARNING] Filesort on '${row.table}' - consider adding index for ORDER BY columns`
        );
        // Try to extract ORDER BY columns
        const orderMatch = query.match(/ORDER\s+BY\s+(\w+)/i);
        if (orderMatch) {
          indexSuggestions.push(
            `CREATE INDEX idx_${row.table}_${orderMatch[1]}_sort ON ${row.table}(${orderMatch[1]})`
          );
        }
      }

      // Temporary table detection
      if (row.extra?.includes('Using temporary')) {
        recommendations.push(
          `[WARNING] Temporary table used for '${row.table}' - optimize GROUP BY or DISTINCT`
        );
      }

      // No index used despite available keys
      if (!row.key && row.possibleKeys) {
        recommendations.push(
          `[INFO] No index used on '${row.table}' despite available: ${row.possibleKeys}`
        );
      }

      // Low filter efficiency
      if (row.filtered < 30 && row.rows > 100) {
        recommendations.push(
          `[INFO] Low filter efficiency (${row.filtered}%) on '${row.table}' - ${row.rows} rows scanned`
        );
      }

      // High row count
      if (row.rows > 10000) {
        recommendations.push(
          `[WARNING] High row count (${row.rows}) on '${row.table}' - consider pagination or filtering`
        );
      }
    });

    return { recommendations, indexSuggestions };
  }

  /**
   * Get audit history
   */
  getAuditHistory(options?: {
    limit?: number;
    severity?: SlowQueryEntry['severity'];
    source?: string;
  }): SlowQueryEntry[] {
    let results = [...this.auditHistory];

    if (options?.severity) {
      results = results.filter((e) => e.severity === options.severity);
    }

    if (options?.source) {
      results = results.filter((e) => e.source === options.source);
    }

    results.sort((a, b) => b.executionTime - a.executionTime);

    if (options?.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * Get audit statistics
   */
  getStats(): QueryAuditStats {
    const stats: QueryAuditStats = {
      totalAudited: this.auditHistory.length,
      criticalQueries: 0,
      highQueries: 0,
      mediumQueries: 0,
      lowQueries: 0,
      avgExecutionTime: 0,
      maxExecutionTime: 0,
      commonIssues: [],
      suggestedIndexes: [],
    };

    if (this.auditHistory.length === 0) {
      return stats;
    }

    // Count by severity
    const issueCount: Record<string, number> = {};
    const indexSuggestions: Record<string, { table: string; columns: string; count: number }> = {};
    let totalTime = 0;

    this.auditHistory.forEach((entry) => {
      switch (entry.severity) {
        case 'critical':
          stats.criticalQueries++;
          break;
        case 'high':
          stats.highQueries++;
          break;
        case 'medium':
          stats.mediumQueries++;
          break;
        case 'low':
          stats.lowQueries++;
          break;
      }

      totalTime += entry.executionTime;
      if (entry.executionTime > stats.maxExecutionTime) {
        stats.maxExecutionTime = entry.executionTime;
      }

      // Count issues
      entry.recommendations.forEach((rec) => {
        const issueType = rec.match(/\[(\w+)\]/)?.[1] || 'INFO';
        issueCount[issueType] = (issueCount[issueType] || 0) + 1;
      });

      // Aggregate index suggestions
      entry.indexSuggestions.forEach((suggestion) => {
        const key = suggestion;
        if (!indexSuggestions[key]) {
          const tableMatch = suggestion.match(/ON\s+(\w+)\((\w+)/);
          indexSuggestions[key] = {
            table: tableMatch?.[1] || 'unknown',
            columns: tableMatch?.[2] || 'unknown',
            count: 0,
          };
        }
        indexSuggestions[key].count++;
      });
    });

    stats.avgExecutionTime = Math.round(totalTime / this.auditHistory.length);

    // Sort issues by count
    stats.commonIssues = Object.entries(issueCount)
      .map(([issue, count]) => ({ issue, count }))
      .sort((a, b) => b.count - a.count);

    // Sort index suggestions by frequency
    stats.suggestedIndexes = Object.values(indexSuggestions)
      .map((s) => ({ table: s.table, columns: s.columns, priority: s.count }))
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 10);

    return stats;
  }

  /**
   * Clear audit history
   */
  clearHistory(): void {
    this.auditHistory = [];
  }

  /**
   * Get critical queries that need immediate attention
   */
  getCriticalQueries(): SlowQueryEntry[] {
    return this.auditHistory
      .filter((e) => e.severity === 'critical' || e.severity === 'high')
      .sort((a, b) => b.executionTime - a.executionTime);
  }

  /**
   * Generate index creation script
   */
  generateIndexScript(): string {
    const stats = this.getStats();
    if (stats.suggestedIndexes.length === 0) {
      return '-- No index suggestions based on current audit data';
    }

    let script = '-- Suggested Indexes based on Slow Query Audit\n';
    script += '-- Generated at: ' + new Date().toISOString() + '\n\n';

    stats.suggestedIndexes.forEach((suggestion, i) => {
      script += `-- Priority ${i + 1}: Suggested ${suggestion.priority} times\n`;
      script += `CREATE INDEX IF NOT EXISTS idx_${suggestion.table}_${suggestion.columns}_opt ON ${suggestion.table}(${suggestion.columns});\n\n`;
    });

    return script;
  }
}

// Singleton instance
export const slowQueryAuditService = new SlowQueryAuditService();

// Export functions for external use
export const auditSlowQuery = slowQueryAuditService.auditQuery.bind(slowQueryAuditService);
export const getAuditHistory = slowQueryAuditService.getAuditHistory.bind(slowQueryAuditService);
export const getAuditStats = slowQueryAuditService.getStats.bind(slowQueryAuditService);
export const clearAuditHistory = slowQueryAuditService.clearHistory.bind(slowQueryAuditService);
export const getCriticalQueries = slowQueryAuditService.getCriticalQueries.bind(slowQueryAuditService);
export const generateIndexScript = slowQueryAuditService.generateIndexScript.bind(slowQueryAuditService);
export const getAuditConfig = slowQueryAuditService.getConfig.bind(slowQueryAuditService);
export const updateAuditConfig = slowQueryAuditService.updateConfig.bind(slowQueryAuditService);
