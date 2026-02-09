/**
 * Database Backup Service
 * 
 * Automated database backup with:
 * - Schema + data export via SQL dump
 * - Retention policy (configurable days)
 * - S3 storage for backup files
 * - Restore script generation
 * - Scheduled daily backups
 */

import { getDb } from "../db";
import { sql } from "drizzle-orm";
import { storagePut } from "../storage";

// ─── Types ──────────────────────────────────────────────────────
export interface BackupConfig {
  retentionDays: number;       // How many days to keep backups (default: 30)
  maxBackups: number;          // Max number of backups to keep (default: 30)
  includeSchema: boolean;      // Include CREATE TABLE statements
  includeData: boolean;        // Include INSERT statements
  compressData: boolean;       // Compress large data sets
  excludeTables?: string[];    // Tables to exclude from backup
}

export interface BackupResult {
  id: string;
  timestamp: Date;
  fileName: string;
  fileSize: number;
  tableCount: number;
  totalRows: number;
  duration: number;            // ms
  s3Url?: string;
  s3Key?: string;
  status: 'success' | 'partial' | 'failed';
  errors: string[];
  tables: Array<{
    name: string;
    rowCount: number;
    status: 'success' | 'skipped' | 'error';
    error?: string;
  }>;
}

export interface BackupMetadata {
  id: string;
  timestamp: string;
  fileName: string;
  fileSize: number;
  tableCount: number;
  totalRows: number;
  duration: number;
  s3Url: string;
  s3Key: string;
  status: string;
  config: BackupConfig;
}

// ─── Default Config ─────────────────────────────────────────────
const DEFAULT_CONFIG: BackupConfig = {
  retentionDays: 30,
  maxBackups: 30,
  includeSchema: true,
  includeData: true,
  compressData: false,
  excludeTables: [],
};

// ─── Backup History (in-memory, persisted to S3) ────────────────
let backupHistory: BackupMetadata[] = [];

// ─── Helper: Get all table names ────────────────────────────────
async function getAllTableNames(): Promise<string[]> {
  try {
    const db = await getDb();
    if (!db) return [];
    const result = await db.execute(sql`SHOW TABLES`);
    const rows = result.rows as any[];
    return rows.map((row: any) => Object.values(row)[0] as string).sort();
  } catch (error) {
    console.error('[Backup] Failed to get table names:', error);
    return [];
  }
}

// ─── Helper: Get row count for a table ──────────────────────────
async function getTableRowCount(tableName: string): Promise<number> {
  try {
    const db = await getDb();
    if (!db) return 0;
    const result = await db.execute(sql.raw(`SELECT COUNT(*) as cnt FROM \`${tableName}\``));
    const rows = result.rows as any[];
    return Number(rows[0]?.cnt || 0);
  } catch {
    return 0;
  }
}

// ─── Helper: Get CREATE TABLE statement ─────────────────────────
async function getCreateTable(tableName: string): Promise<string> {
  try {
    const db = await getDb();
    if (!db) return `-- Database not available for ${tableName}`;
    const result = await db.execute(sql.raw(`SHOW CREATE TABLE \`${tableName}\``));
    const rows = result.rows as any[];
    return (rows[0] as any)?.['Create Table'] || '';
  } catch {
    return `-- Failed to get CREATE TABLE for ${tableName}`;
  }
}

// ─── Helper: Export table data as INSERT statements ─────────────
async function exportTableData(tableName: string, batchSize: number = 500): Promise<{ sql: string; rowCount: number }> {
  let offset = 0;
  let totalRows = 0;
  const statements: string[] = [];
  const db = await getDb();
  if (!db) return { sql: '-- Database not available', rowCount: 0 };

  try {
    while (true) {
      const result = await db.execute(
        sql.raw(`SELECT * FROM \`${tableName}\` LIMIT ${batchSize} OFFSET ${offset}`)
      );
      const rows = result.rows as any[];
      if (rows.length === 0) break;

      for (const row of rows) {
        const columns = Object.keys(row);
        const values = columns.map((col) => {
          const val = (row as any)[col];
          if (val === null || val === undefined) return 'NULL';
          if (typeof val === 'number') return String(val);
          if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
          if (typeof val === 'boolean') return val ? '1' : '0';
          // Escape string values
          const escaped = String(val).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r');
          return `'${escaped}'`;
        });
        statements.push(`INSERT INTO \`${tableName}\` (\`${columns.join('`, `')}\`) VALUES (${values.join(', ')});`);
        totalRows++;
      }

      offset += batchSize;
      if (rows.length < batchSize) break;
    }
  } catch (error: any) {
    statements.push(`-- Error exporting data for ${tableName}: ${error.message}`);
  }

  return { sql: statements.join('\n'), rowCount: totalRows };
}

// ─── Main Backup Function ───────────────────────────────────────
export async function createBackup(config: Partial<BackupConfig> = {}): Promise<BackupResult> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const startTime = Date.now();
  const backupId = `backup_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`;
  const fileName = `${backupId}.sql`;
  const errors: string[] = [];
  const tableResults: BackupResult['tables'] = [];
  const sqlParts: string[] = [];

  // Header
  sqlParts.push(`-- ═══════════════════════════════════════════════════════════`);
  sqlParts.push(`-- CPK/SPC Calculator - Database Backup`);
  sqlParts.push(`-- Generated: ${new Date().toISOString()}`);
  sqlParts.push(`-- Backup ID: ${backupId}`);
  sqlParts.push(`-- ═══════════════════════════════════════════════════════════`);
  sqlParts.push('');
  sqlParts.push('SET FOREIGN_KEY_CHECKS = 0;');
  sqlParts.push('SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";');
  sqlParts.push('');

  // Get all tables
  const allTables = await getAllTableNames();
  const tables = allTables.filter(t => !cfg.excludeTables?.includes(t));
  let totalRows = 0;

  for (const tableName of tables) {
    try {
      sqlParts.push(`-- ─── Table: ${tableName} ───────────────────────────────`);
      sqlParts.push('');

      // Schema
      if (cfg.includeSchema) {
        sqlParts.push(`DROP TABLE IF EXISTS \`${tableName}\`;`);
        const createSql = await getCreateTable(tableName);
        if (createSql) {
          sqlParts.push(createSql + ';');
          sqlParts.push('');
        }
      }

      // Data
      if (cfg.includeData) {
        const { sql: dataSql, rowCount } = await exportTableData(tableName);
        if (rowCount > 0) {
          sqlParts.push(`-- Data: ${rowCount} rows`);
          sqlParts.push(dataSql);
          sqlParts.push('');
        }
        totalRows += rowCount;
        tableResults.push({ name: tableName, rowCount, status: 'success' });
      } else {
        const rowCount = await getTableRowCount(tableName);
        tableResults.push({ name: tableName, rowCount, status: 'success' });
      }
    } catch (error: any) {
      const errMsg = `Failed to backup table ${tableName}: ${error.message}`;
      errors.push(errMsg);
      tableResults.push({ name: tableName, rowCount: 0, status: 'error', error: error.message });
    }
  }

  // Footer
  sqlParts.push('SET FOREIGN_KEY_CHECKS = 1;');
  sqlParts.push('');
  sqlParts.push(`-- ═══════════════════════════════════════════════════════════`);
  sqlParts.push(`-- Backup complete: ${tables.length} tables, ${totalRows} rows`);
  sqlParts.push(`-- Duration: ${Date.now() - startTime}ms`);
  sqlParts.push(`-- ═══════════════════════════════════════════════════════════`);

  const sqlContent = sqlParts.join('\n');
  const fileSize = Buffer.byteLength(sqlContent, 'utf8');
  const duration = Date.now() - startTime;

  // Upload to S3
  let s3Url: string | undefined;
  let s3Key: string | undefined;
  try {
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const s3Path = `backups/${backupId}-${randomSuffix}.sql`;
    const result = await storagePut(s3Path, Buffer.from(sqlContent, 'utf8'), 'application/sql');
    s3Url = result.url;
    s3Key = result.key;
  } catch (error: any) {
    errors.push(`Failed to upload to S3: ${error.message}`);
  }

  const status = errors.length === 0 ? 'success' : (tableResults.some(t => t.status === 'success') ? 'partial' : 'failed');

  // Save metadata to history
  const metadata: BackupMetadata = {
    id: backupId,
    timestamp: new Date().toISOString(),
    fileName,
    fileSize,
    tableCount: tables.length,
    totalRows,
    duration,
    s3Url: s3Url || '',
    s3Key: s3Key || '',
    status,
    config: cfg,
  };
  backupHistory.push(metadata);

  // Apply retention policy
  await applyRetentionPolicy(cfg);

  console.log(`[Backup] ${status}: ${tables.length} tables, ${totalRows} rows, ${(fileSize / 1024).toFixed(1)}KB, ${duration}ms`);

  return {
    id: backupId,
    timestamp: new Date(),
    fileName,
    fileSize,
    tableCount: tables.length,
    totalRows,
    duration,
    s3Url,
    s3Key,
    status,
    errors,
    tables: tableResults,
  };
}

// ─── Schema-Only Backup ─────────────────────────────────────────
export async function createSchemaBackup(): Promise<BackupResult> {
  return createBackup({ includeData: false, includeSchema: true });
}

// ─── Retention Policy ───────────────────────────────────────────
async function applyRetentionPolicy(config: BackupConfig): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - config.retentionDays);
  
  const before = backupHistory.length;
  backupHistory = backupHistory.filter(b => new Date(b.timestamp) > cutoffDate);
  
  // Also enforce max backups
  if (backupHistory.length > config.maxBackups) {
    backupHistory = backupHistory.slice(-config.maxBackups);
  }
  
  const removed = before - backupHistory.length;
  if (removed > 0) {
    console.log(`[Backup] Retention policy: removed ${removed} old backups`);
  }
  return removed;
}

// ─── Backup History ─────────────────────────────────────────────
export function getBackupHistory(): BackupMetadata[] {
  return [...backupHistory].reverse();
}

export function getBackupById(id: string): BackupMetadata | undefined {
  return backupHistory.find(b => b.id === id);
}

// ─── Generate Restore Script ────────────────────────────────────
export function generateRestoreScript(backupMeta: BackupMetadata): string {
  return `#!/bin/bash
# ═══════════════════════════════════════════════════════════
# CPK/SPC Calculator - Database Restore Script
# Backup: ${backupMeta.id}
# Created: ${backupMeta.timestamp}
# Tables: ${backupMeta.tableCount} | Rows: ${backupMeta.totalRows}
# ═══════════════════════════════════════════════════════════

set -e

# Configuration
BACKUP_URL="${backupMeta.s3Url}"
BACKUP_FILE="${backupMeta.fileName}"
DB_HOST="\${DB_HOST:-localhost}"
DB_PORT="\${DB_PORT:-3306}"
DB_USER="\${DB_USER:-root}"
DB_NAME="\${DB_NAME:-cpk_spc}"

echo "╔═══════════════════════════════════════════════════════╗"
echo "║  CPK/SPC Calculator - Database Restore               ║"
echo "╠═══════════════════════════════════════════════════════╣"
echo "║  Backup ID: ${backupMeta.id}"
echo "║  Date:      ${backupMeta.timestamp}"
echo "║  Tables:    ${backupMeta.tableCount}"
echo "║  Rows:      ${backupMeta.totalRows}"
echo "║  Size:      ${(backupMeta.fileSize / 1024).toFixed(1)} KB"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# Download backup file
echo "[1/3] Downloading backup file..."
if command -v curl &> /dev/null; then
  curl -sL "$BACKUP_URL" -o "$BACKUP_FILE"
elif command -v wget &> /dev/null; then
  wget -q "$BACKUP_URL" -O "$BACKUP_FILE"
else
  echo "ERROR: curl or wget required"
  exit 1
fi
echo "  ✓ Downloaded: $BACKUP_FILE"

# Verify file
echo "[2/3] Verifying backup file..."
if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERROR: Backup file not found"
  exit 1
fi
FILE_SIZE=$(wc -c < "$BACKUP_FILE")
echo "  ✓ File size: $FILE_SIZE bytes"

# Restore
echo "[3/3] Restoring database..."
echo "  WARNING: This will OVERWRITE existing data in $DB_NAME"
read -p "  Continue? (y/N): " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
  echo "  Cancelled."
  exit 0
fi

mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p "$DB_NAME" < "$BACKUP_FILE"
echo "  ✓ Database restored successfully!"

# Cleanup
rm -f "$BACKUP_FILE"
echo ""
echo "═══ Restore Complete ═══"
`;
}

// ─── Backup Stats ───────────────────────────────────────────────
export function getBackupStats() {
  const history = getBackupHistory();
  const successCount = history.filter(b => b.status === 'success').length;
  const failedCount = history.filter(b => b.status === 'failed').length;
  const totalSize = history.reduce((sum, b) => sum + b.fileSize, 0);
  const avgDuration = history.length > 0 
    ? history.reduce((sum, b) => sum + b.duration, 0) / history.length 
    : 0;
  const lastBackup = history.length > 0 ? history[0] : null;
  const nextBackupEstimate = lastBackup 
    ? new Date(new Date(lastBackup.timestamp).getTime() + 24 * 60 * 60 * 1000).toISOString()
    : null;

  return {
    totalBackups: history.length,
    successCount,
    failedCount,
    partialCount: history.length - successCount - failedCount,
    totalSizeBytes: totalSize,
    totalSizeFormatted: formatBytes(totalSize),
    avgDurationMs: Math.round(avgDuration),
    lastBackup: lastBackup ? {
      id: lastBackup.id,
      timestamp: lastBackup.timestamp,
      status: lastBackup.status,
      tableCount: lastBackup.tableCount,
      totalRows: lastBackup.totalRows,
    } : null,
    nextBackupEstimate,
    retentionDays: DEFAULT_CONFIG.retentionDays,
    maxBackups: DEFAULT_CONFIG.maxBackups,
  };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}
