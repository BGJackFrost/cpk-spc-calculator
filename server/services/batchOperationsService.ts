/**
 * Batch Operations Service
 * 
 * Converts single operations to batch processing for better performance.
 * Supports batched inserts, updates, and deletes.
 */

import { getDb } from '../db';
import { sql } from 'drizzle-orm';

// Batch operation result
export interface BatchResult {
  success: boolean;
  totalItems: number;
  processedItems: number;
  failedItems: number;
  errors: { index: number; error: string }[];
  executionTime: number;
}

// Batch configuration
interface BatchConfig {
  batchSize: number;
  maxRetries: number;
  retryDelay: number; // ms
  parallelBatches: number;
}

const defaultConfig: BatchConfig = {
  batchSize: 100,
  maxRetries: 3,
  retryDelay: 1000,
  parallelBatches: 2,
};

/**
 * Split array into chunks
 */
function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Delay execution
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Batch insert records
 */
export async function batchInsert<T extends Record<string, any>>(
  tableName: string,
  records: T[],
  config: Partial<BatchConfig> = {}
): Promise<BatchResult> {
  const startTime = Date.now();
  const cfg = { ...defaultConfig, ...config };
  const result: BatchResult = {
    success: true,
    totalItems: records.length,
    processedItems: 0,
    failedItems: 0,
    errors: [],
    executionTime: 0,
  };

  if (records.length === 0) {
    result.executionTime = Date.now() - startTime;
    return result;
  }

  const db = await getDb();
  if (!db) {
    result.success = false;
    result.errors.push({ index: 0, error: 'Database connection not available' });
    result.executionTime = Date.now() - startTime;
    return result;
  }

  const batches = chunk(records, cfg.batchSize);

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    let retries = 0;
    let success = false;

    while (retries < cfg.maxRetries && !success) {
      try {
        // Build bulk insert query
        const columns = Object.keys(batch[0]);
        const placeholders = batch.map(
          (_, i) => `(${columns.map((_, j) => `?`).join(', ')})`
        ).join(', ');
        
        const values = batch.flatMap((record) => columns.map((col) => record[col]));
        
        const query = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES ${placeholders}`;
        
        await db.execute(sql.raw(query));
        
        result.processedItems += batch.length;
        success = true;
      } catch (error: any) {
        retries++;
        if (retries >= cfg.maxRetries) {
          result.failedItems += batch.length;
          result.errors.push({
            index: batchIndex * cfg.batchSize,
            error: error.message || 'Unknown error',
          });
        } else {
          await delay(cfg.retryDelay * retries);
        }
      }
    }
  }

  result.success = result.failedItems === 0;
  result.executionTime = Date.now() - startTime;
  return result;
}

/**
 * Batch update records
 */
export async function batchUpdate<T extends Record<string, any>>(
  tableName: string,
  records: { id: number | string; updates: Partial<T> }[],
  config: Partial<BatchConfig> = {}
): Promise<BatchResult> {
  const startTime = Date.now();
  const cfg = { ...defaultConfig, ...config };
  const result: BatchResult = {
    success: true,
    totalItems: records.length,
    processedItems: 0,
    failedItems: 0,
    errors: [],
    executionTime: 0,
  };

  if (records.length === 0) {
    result.executionTime = Date.now() - startTime;
    return result;
  }

  const db = await getDb();
  if (!db) {
    result.success = false;
    result.errors.push({ index: 0, error: 'Database connection not available' });
    result.executionTime = Date.now() - startTime;
    return result;
  }

  const batches = chunk(records, cfg.batchSize);

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    
    // Process updates in transaction
    try {
      for (let i = 0; i < batch.length; i++) {
        const { id, updates } = batch[i];
        const setClauses = Object.entries(updates)
          .map(([key, _]) => `${key} = ?`)
          .join(', ');
        const values = [...Object.values(updates), id];
        
        const query = `UPDATE ${tableName} SET ${setClauses} WHERE id = ?`;
        await db.execute(sql.raw(query));
        result.processedItems++;
      }
    } catch (error: any) {
      result.failedItems += batch.length - (result.processedItems % cfg.batchSize);
      result.errors.push({
        index: batchIndex * cfg.batchSize,
        error: error.message || 'Unknown error',
      });
    }
  }

  result.success = result.failedItems === 0;
  result.executionTime = Date.now() - startTime;
  return result;
}

/**
 * Batch delete records
 */
export async function batchDelete(
  tableName: string,
  ids: (number | string)[],
  config: Partial<BatchConfig> = {}
): Promise<BatchResult> {
  const startTime = Date.now();
  const cfg = { ...defaultConfig, ...config };
  const result: BatchResult = {
    success: true,
    totalItems: ids.length,
    processedItems: 0,
    failedItems: 0,
    errors: [],
    executionTime: 0,
  };

  if (ids.length === 0) {
    result.executionTime = Date.now() - startTime;
    return result;
  }

  const db = await getDb();
  if (!db) {
    result.success = false;
    result.errors.push({ index: 0, error: 'Database connection not available' });
    result.executionTime = Date.now() - startTime;
    return result;
  }

  const batches = chunk(ids, cfg.batchSize);

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    let retries = 0;
    let success = false;

    while (retries < cfg.maxRetries && !success) {
      try {
        const placeholders = batch.map(() => '?').join(', ');
        const query = `DELETE FROM ${tableName} WHERE id IN (${placeholders})`;
        
        await db.execute(sql.raw(query));
        
        result.processedItems += batch.length;
        success = true;
      } catch (error: any) {
        retries++;
        if (retries >= cfg.maxRetries) {
          result.failedItems += batch.length;
          result.errors.push({
            index: batchIndex * cfg.batchSize,
            error: error.message || 'Unknown error',
          });
        } else {
          await delay(cfg.retryDelay * retries);
        }
      }
    }
  }

  result.success = result.failedItems === 0;
  result.executionTime = Date.now() - startTime;
  return result;
}

/**
 * Batch upsert records (insert or update)
 */
export async function batchUpsert<T extends Record<string, any>>(
  tableName: string,
  records: T[],
  uniqueKey: string,
  config: Partial<BatchConfig> = {}
): Promise<BatchResult> {
  const startTime = Date.now();
  const cfg = { ...defaultConfig, ...config };
  const result: BatchResult = {
    success: true,
    totalItems: records.length,
    processedItems: 0,
    failedItems: 0,
    errors: [],
    executionTime: 0,
  };

  if (records.length === 0) {
    result.executionTime = Date.now() - startTime;
    return result;
  }

  const db = await getDb();
  if (!db) {
    result.success = false;
    result.errors.push({ index: 0, error: 'Database connection not available' });
    result.executionTime = Date.now() - startTime;
    return result;
  }

  const batches = chunk(records, cfg.batchSize);

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    
    try {
      const columns = Object.keys(batch[0]);
      const updateColumns = columns.filter((c) => c !== uniqueKey);
      
      const placeholders = batch.map(
        () => `(${columns.map(() => '?').join(', ')})`
      ).join(', ');
      
      const values = batch.flatMap((record) => columns.map((col) => record[col]));
      
      const updateClause = updateColumns
        .map((col) => `${col} = VALUES(${col})`)
        .join(', ');
      
      const query = `
        INSERT INTO ${tableName} (${columns.join(', ')}) 
        VALUES ${placeholders}
        ON DUPLICATE KEY UPDATE ${updateClause}
      `;
      
      await db.execute(sql.raw(query));
      result.processedItems += batch.length;
    } catch (error: any) {
      result.failedItems += batch.length;
      result.errors.push({
        index: batchIndex * cfg.batchSize,
        error: error.message || 'Unknown error',
      });
    }
  }

  result.success = result.failedItems === 0;
  result.executionTime = Date.now() - startTime;
  return result;
}

/**
 * Execute multiple queries in parallel batches
 */
export async function batchExecute(
  queries: string[],
  config: Partial<BatchConfig> = {}
): Promise<BatchResult> {
  const startTime = Date.now();
  const cfg = { ...defaultConfig, ...config };
  const result: BatchResult = {
    success: true,
    totalItems: queries.length,
    processedItems: 0,
    failedItems: 0,
    errors: [],
    executionTime: 0,
  };

  if (queries.length === 0) {
    result.executionTime = Date.now() - startTime;
    return result;
  }

  const db = await getDb();
  if (!db) {
    result.success = false;
    result.errors.push({ index: 0, error: 'Database connection not available' });
    result.executionTime = Date.now() - startTime;
    return result;
  }

  const batches = chunk(queries, cfg.parallelBatches);

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    
    const results = await Promise.allSettled(
      batch.map((query) => db.execute(sql.raw(query)))
    );

    results.forEach((r, i) => {
      const globalIndex = batchIndex * cfg.parallelBatches + i;
      if (r.status === 'fulfilled') {
        result.processedItems++;
      } else {
        result.failedItems++;
        result.errors.push({
          index: globalIndex,
          error: r.reason?.message || 'Unknown error',
        });
      }
    });
  }

  result.success = result.failedItems === 0;
  result.executionTime = Date.now() - startTime;
  return result;
}

/**
 * Get batch operation statistics
 */
export function getBatchStats(results: BatchResult[]): {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  totalItems: number;
  processedItems: number;
  avgExecutionTime: number;
  totalExecutionTime: number;
} {
  const stats = {
    totalOperations: results.length,
    successfulOperations: results.filter((r) => r.success).length,
    failedOperations: results.filter((r) => !r.success).length,
    totalItems: results.reduce((sum, r) => sum + r.totalItems, 0),
    processedItems: results.reduce((sum, r) => sum + r.processedItems, 0),
    avgExecutionTime: 0,
    totalExecutionTime: results.reduce((sum, r) => sum + r.executionTime, 0),
  };

  stats.avgExecutionTime = results.length > 0
    ? Math.round(stats.totalExecutionTime / results.length)
    : 0;

  return stats;
}
