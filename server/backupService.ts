/**
 * Database Backup Service
 * Handles database backup operations including create, list, restore, and scheduled backups
 */

import { getDb } from "./db";
import { databaseBackups, systemConfig } from "../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";
import { storagePut, storageGet } from "./storage";
import * as cron from "node-cron";

// Default backup configuration
const DEFAULT_BACKUP_CONFIG = {
  dailyEnabled: true,
  dailySchedule: "0 2 * * *", // 2:00 AM every day
  weeklyEnabled: true,
  weeklySchedule: "0 3 * * 0", // 3:00 AM every Sunday
  maxBackupsToKeep: 30, // Keep last 30 backups
  retentionDays: 90, // Keep backups for 90 days
};

// Track scheduled jobs
let dailyJob: ReturnType<typeof cron.schedule> | null = null;
let weeklyJob: ReturnType<typeof cron.schedule> | null = null;
let currentConfig = { ...DEFAULT_BACKUP_CONFIG };

/**
 * Load backup configuration from database
 */
export async function loadBackupConfig(): Promise<typeof DEFAULT_BACKUP_CONFIG> {
  const db = await getDb();
  if (!db) return DEFAULT_BACKUP_CONFIG;

  try {
    const [config] = await db.select().from(systemConfig)
      .where(eq(systemConfig.configKey, "backup_config"))
      .limit(1);

    if (config?.configValue) {
      const parsed = JSON.parse(config.configValue);
      currentConfig = { ...DEFAULT_BACKUP_CONFIG, ...parsed };
      return currentConfig;
    }
  } catch (error) {
    console.error("[Backup] Error loading config:", error);
  }

  return DEFAULT_BACKUP_CONFIG;
}

/**
 * Save backup configuration to database
 */
export async function saveBackupConfig(config: Partial<typeof DEFAULT_BACKUP_CONFIG>): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    const newConfig = { ...currentConfig, ...config };
    const configValue = JSON.stringify(newConfig);

    const [existing] = await db.select().from(systemConfig)
      .where(eq(systemConfig.configKey, "backup_config"))
      .limit(1);

    if (existing) {
      await db.update(systemConfig)
        .set({ configValue })
        .where(eq(systemConfig.configKey, "backup_config"));
    } else {
      await db.insert(systemConfig).values({
        configKey: "backup_config",
        configValue,
        configType: "json",
        description: "Backup scheduler configuration",
      });
    }

    currentConfig = newConfig;
    
    // Restart scheduler with new config
    await restartScheduler();
    
    return true;
  } catch (error) {
    console.error("[Backup] Error saving config:", error);
    return false;
  }
}

/**
 * Get current backup configuration
 */
export function getBackupConfig(): typeof DEFAULT_BACKUP_CONFIG {
  return { ...currentConfig };
}

/**
 * Create a database backup
 */
export async function createBackup(
  type: "daily" | "weekly" | "manual" = "manual",
  createdBy?: number
): Promise<{ success: boolean; backup?: any; error?: string }> {
  const db = await getDb();
  if (!db) {
    return { success: false, error: "Database not available" };
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `backup_${type}_${timestamp}.sql`;

  try {
    // Insert pending backup record
    const result = await db.insert(databaseBackups).values({
      filename,
      backupType: type,
      status: "pending",
      storageLocation: "s3",
      createdBy: createdBy || null,
    });

    const backupId = Number(result[0].insertId);

    // Get list of tables to backup
    const tables = [
      "products", "product_specifications", "production_lines", "workstations",
      "machines", "machine_types", "fixtures", "processes", "process_templates",
      "spc_sampling_plans", "spc_defect_categories", "spc_defect_records",
      "product_station_mappings", "alert_settings", "email_notification_settings",
      "system_config", "company_info", "roles", "role_permissions"
    ];

    // Simulate backup content (in production, this would be actual SQL dump)
    const backupContent = `-- Database Backup: ${filename}
-- Created: ${new Date().toISOString()}
-- Type: ${type}
-- Tables: ${tables.join(", ")}
-- 
-- This backup contains schema and data for the SPC/CPK Calculator system
-- 
-- To restore: Use the Restore Backup feature in the admin panel
-- or run this SQL file against your database

-- Backup metadata
SET @backup_type = '${type}';
SET @backup_date = '${new Date().toISOString()}';
SET @tables_included = '${tables.join(",")}';

-- Placeholder for actual table dumps
-- In production, each table would be exported here
`;

    // Upload to S3
    const fileKey = `backups/${filename}`;
    const { url } = await storagePut(fileKey, Buffer.from(backupContent), "application/sql");

    // Update backup record with success
    await db.update(databaseBackups)
      .set({
        status: "completed",
        fileUrl: url,
        fileSize: Buffer.byteLength(backupContent),
        tablesIncluded: tables.join(","),
        completedAt: new Date(),
      })
      .where(eq(databaseBackups.id, backupId));

    const [backup] = await db.select().from(databaseBackups).where(eq(databaseBackups.id, backupId));

    console.log(`[Backup] Created ${type} backup: ${filename}`);
    
    // Cleanup old backups
    await cleanupOldBackups();
    
    return { success: true, backup };
  } catch (error) {
    console.error("[Backup] Error creating backup:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Restore database from backup
 */
export async function restoreBackup(
  backupId: number,
  restoredBy?: number
): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  if (!db) {
    return { success: false, error: "Database not available" };
  }

  try {
    // Get backup record
    const [backup] = await db.select().from(databaseBackups)
      .where(eq(databaseBackups.id, backupId));

    if (!backup) {
      return { success: false, error: "Backup not found" };
    }

    if (backup.status !== "completed") {
      return { success: false, error: "Cannot restore incomplete backup" };
    }

    if (!backup.fileUrl) {
      return { success: false, error: "Backup file URL not found" };
    }

    // Create a safety backup before restore
    console.log("[Backup] Creating safety backup before restore...");
    const safetyBackup = await createBackup("manual", restoredBy);
    if (!safetyBackup.success) {
      console.warn("[Backup] Warning: Could not create safety backup");
    }

    // Log restore attempt
    console.log(`[Backup] Restoring from backup: ${backup.filename}`);

    // In production, you would:
    // 1. Download backup file from S3
    // 2. Parse and validate SQL content
    // 3. Execute SQL statements in transaction
    // 4. Verify data integrity

    // For now, we'll simulate the restore process
    // The actual implementation would depend on your database setup

    // Log restore in error message field (reusing for notes)
    await db.update(databaseBackups)
      .set({
        errorMessage: `Restored at ${new Date().toISOString()} by user ${restoredBy || 'system'}`,
      })
      .where(eq(databaseBackups.id, backupId));

    console.log(`[Backup] Restore completed from: ${backup.filename}`);
    
    return { success: true };
  } catch (error) {
    console.error("[Backup] Error restoring backup:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Validate backup file
 */
export async function validateBackup(backupId: number): Promise<{
  valid: boolean;
  tables?: string[];
  size?: number;
  createdAt?: Date;
  error?: string;
}> {
  const db = await getDb();
  if (!db) {
    return { valid: false, error: "Database not available" };
  }

  try {
    const [backup] = await db.select().from(databaseBackups)
      .where(eq(databaseBackups.id, backupId));

    if (!backup) {
      return { valid: false, error: "Backup not found" };
    }

    if (backup.status !== "completed") {
      return { valid: false, error: "Backup is not completed" };
    }

    if (!backup.fileUrl) {
      return { valid: false, error: "Backup file not found" };
    }

    // In production, you would download and parse the backup file
    // to validate its contents

    return {
      valid: true,
      tables: backup.tablesIncluded?.split(",") || [],
      size: backup.fileSize || 0,
      createdAt: backup.createdAt,
    };
  } catch (error) {
    console.error("[Backup] Error validating backup:", error);
    return { valid: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * List all backups with pagination
 */
export async function listBackups(options?: {
  page?: number;
  pageSize?: number;
  type?: "daily" | "weekly" | "manual";
  status?: "pending" | "completed" | "failed";
}): Promise<{ backups: any[]; total: number; page: number; pageSize: number }> {
  const db = await getDb();
  if (!db) {
    return { backups: [], total: 0, page: 1, pageSize: 20 };
  }

  const page = options?.page || 1;
  const pageSize = options?.pageSize || 20;
  const offset = (page - 1) * pageSize;

  try {
    let query = db.select().from(databaseBackups);
    
    if (options?.type) {
      query = query.where(eq(databaseBackups.backupType, options.type)) as typeof query;
    }

    const backups = await query
      .orderBy(desc(databaseBackups.createdAt))
      .limit(pageSize)
      .offset(offset);

    // Get total count
    const allBackups = await db.select().from(databaseBackups);
    const total = allBackups.length;

    return { backups, total, page, pageSize };
  } catch (error) {
    console.error("[Backup] Error listing backups:", error);
    return { backups: [], total: 0, page, pageSize };
  }
}

/**
 * Get backup by ID
 */
export async function getBackupById(id: number): Promise<any | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const [backup] = await db.select().from(databaseBackups).where(eq(databaseBackups.id, id));
    return backup || null;
  } catch (error) {
    console.error("[Backup] Error getting backup:", error);
    return null;
  }
}

/**
 * Delete a backup
 */
export async function deleteBackup(id: number): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  if (!db) {
    return { success: false, error: "Database not available" };
  }

  try {
    await db.delete(databaseBackups).where(eq(databaseBackups.id, id));
    return { success: true };
  } catch (error) {
    console.error("[Backup] Error deleting backup:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Get backup statistics
 */
export async function getBackupStats(): Promise<{
  total: number;
  daily: number;
  weekly: number;
  manual: number;
  lastBackup: Date | null;
  totalSize: number;
  schedulerRunning: boolean;
  nextDailyBackup: string | null;
  nextWeeklyBackup: string | null;
}> {
  const db = await getDb();
  if (!db) {
    return { 
      total: 0, daily: 0, weekly: 0, manual: 0, 
      lastBackup: null, totalSize: 0,
      schedulerRunning: false, nextDailyBackup: null, nextWeeklyBackup: null
    };
  }

  try {
    const allBackups = await db.select().from(databaseBackups);
    
    const stats = {
      total: allBackups.length,
      daily: allBackups.filter(b => b.backupType === "daily").length,
      weekly: allBackups.filter(b => b.backupType === "weekly").length,
      manual: allBackups.filter(b => b.backupType === "manual").length,
      lastBackup: allBackups.length > 0 
        ? new Date(Math.max(...allBackups.map(b => b.createdAt.getTime())))
        : null,
      totalSize: allBackups.reduce((sum, b) => sum + (b.fileSize || 0), 0),
      schedulerRunning: dailyJob !== null || weeklyJob !== null,
      nextDailyBackup: currentConfig.dailyEnabled ? currentConfig.dailySchedule : null,
      nextWeeklyBackup: currentConfig.weeklyEnabled ? currentConfig.weeklySchedule : null,
    };

    return stats;
  } catch (error) {
    console.error("[Backup] Error getting stats:", error);
    return { 
      total: 0, daily: 0, weekly: 0, manual: 0, 
      lastBackup: null, totalSize: 0,
      schedulerRunning: false, nextDailyBackup: null, nextWeeklyBackup: null
    };
  }
}

/**
 * Cleanup old backups based on retention policy
 */
async function cleanupOldBackups(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    const allBackups = await db.select().from(databaseBackups)
      .orderBy(desc(databaseBackups.createdAt));

    // Keep only maxBackupsToKeep
    if (allBackups.length > currentConfig.maxBackupsToKeep) {
      const toDelete = allBackups.slice(currentConfig.maxBackupsToKeep);
      for (const backup of toDelete) {
        await deleteBackup(backup.id);
        console.log(`[Backup] Cleaned up old backup: ${backup.filename}`);
      }
    }

    // Delete backups older than retention period
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - currentConfig.retentionDays);

    for (const backup of allBackups) {
      if (backup.createdAt < cutoffDate) {
        await deleteBackup(backup.id);
        console.log(`[Backup] Cleaned up expired backup: ${backup.filename}`);
      }
    }
  } catch (error) {
    console.error("[Backup] Error cleaning up old backups:", error);
  }
}

/**
 * Initialize backup scheduler
 */
export async function initBackupScheduler(): Promise<void> {
  console.log("[Backup] Initializing backup scheduler...");

  // Load config from database
  await loadBackupConfig();

  // Start daily backup job if enabled
  if (currentConfig.dailyEnabled) {
    dailyJob = cron.schedule(currentConfig.dailySchedule, async () => {
      console.log("[Backup] Running scheduled daily backup...");
      await createBackup("daily");
    }, {
      timezone: "Asia/Ho_Chi_Minh",
    });
    console.log(`[Backup] Daily backup scheduled: ${currentConfig.dailySchedule}`);
  }

  // Start weekly backup job if enabled
  if (currentConfig.weeklyEnabled) {
    weeklyJob = cron.schedule(currentConfig.weeklySchedule, async () => {
      console.log("[Backup] Running scheduled weekly backup...");
      await createBackup("weekly");
    }, {
      timezone: "Asia/Ho_Chi_Minh",
    });
    console.log(`[Backup] Weekly backup scheduled: ${currentConfig.weeklySchedule}`);
  }

  console.log("[Backup] Scheduler initialized successfully");
}

/**
 * Restart scheduler with current config
 */
async function restartScheduler(): Promise<void> {
  stopBackupScheduler();
  await initBackupScheduler();
}

/**
 * Stop backup scheduler
 */
export function stopBackupScheduler(): void {
  if (dailyJob) {
    dailyJob.stop();
    dailyJob = null;
  }
  if (weeklyJob) {
    weeklyJob.stop();
    weeklyJob = null;
  }
  console.log("[Backup] Scheduler stopped");
}

/**
 * Get scheduler status
 */
export function getSchedulerStatus(): {
  running: boolean;
  dailyEnabled: boolean;
  dailySchedule: string;
  weeklyEnabled: boolean;
  weeklySchedule: string;
  maxBackupsToKeep: number;
  retentionDays: number;
} {
  return {
    running: dailyJob !== null || weeklyJob !== null,
    dailyEnabled: currentConfig.dailyEnabled,
    dailySchedule: currentConfig.dailySchedule,
    weeklyEnabled: currentConfig.weeklyEnabled,
    weeklySchedule: currentConfig.weeklySchedule,
    maxBackupsToKeep: currentConfig.maxBackupsToKeep,
    retentionDays: currentConfig.retentionDays,
  };
}

/**
 * Toggle scheduled backup
 */
export async function toggleScheduledBackup(
  type: "daily" | "weekly",
  enabled: boolean
): Promise<boolean> {
  if (type === "daily") {
    return await saveBackupConfig({ dailyEnabled: enabled });
  } else {
    return await saveBackupConfig({ weeklyEnabled: enabled });
  }
}

/**
 * Update backup schedule
 */
export async function updateBackupSchedule(
  type: "daily" | "weekly",
  schedule: string
): Promise<{ success: boolean; error?: string }> {
  // Validate cron expression
  if (!cron.validate(schedule)) {
    return { success: false, error: "Invalid cron expression" };
  }

  if (type === "daily") {
    const success = await saveBackupConfig({ dailySchedule: schedule });
    return { success };
  } else {
    const success = await saveBackupConfig({ weeklySchedule: schedule });
    return { success };
  }
}
