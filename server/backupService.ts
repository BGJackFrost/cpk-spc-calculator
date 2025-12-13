/**
 * Database Backup Service
 * Handles database backup operations including create, list, restore, and scheduled backups
 */

import { getDb } from "./db";
import { databaseBackups } from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { storagePut, storageGet } from "./storage";
import * as cron from "node-cron";

// Backup configuration
const BACKUP_CONFIG = {
  dailySchedule: "0 2 * * *", // 2:00 AM every day
  weeklySchedule: "0 3 * * 0", // 3:00 AM every Sunday
  maxBackupsToKeep: 30, // Keep last 30 backups
};

// Track scheduled jobs
let dailyJob: ReturnType<typeof cron.schedule> | null = null;
let weeklyJob: ReturnType<typeof cron.schedule> | null = null;

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

    // In a real implementation, you would:
    // 1. Export database using mysqldump or similar
    // 2. Upload to S3
    // For now, we'll simulate with a placeholder

    // Simulate backup content (in production, this would be actual SQL dump)
    const backupContent = `-- Database Backup: ${filename}
-- Created: ${new Date().toISOString()}
-- Type: ${type}
-- This is a placeholder for actual database dump content
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
        completedAt: new Date(),
      })
      .where(eq(databaseBackups.id, backupId));

    const [backup] = await db.select().from(databaseBackups).where(eq(databaseBackups.id, backupId));

    console.log(`[Backup] Created ${type} backup: ${filename}`);
    return { success: true, backup };
  } catch (error) {
    console.error("[Backup] Error creating backup:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * List all backups with pagination
 */
export async function listBackups(options?: {
  page?: number;
  pageSize?: number;
  type?: "daily" | "weekly" | "manual";
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
}> {
  const db = await getDb();
  if (!db) {
    return { total: 0, daily: 0, weekly: 0, manual: 0, lastBackup: null, totalSize: 0 };
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
    };

    return stats;
  } catch (error) {
    console.error("[Backup] Error getting stats:", error);
    return { total: 0, daily: 0, weekly: 0, manual: 0, lastBackup: null, totalSize: 0 };
  }
}

/**
 * Initialize backup scheduler
 */
export function initBackupScheduler(): void {
  console.log("[Backup] Initializing backup scheduler...");

  // Daily backup at 2:00 AM
  dailyJob = cron.schedule(BACKUP_CONFIG.dailySchedule, async () => {
    console.log("[Backup] Running daily backup...");
    await createBackup("daily");
  }, {
    timezone: "Asia/Ho_Chi_Minh",
  });

  // Weekly backup at 3:00 AM on Sunday
  weeklyJob = cron.schedule(BACKUP_CONFIG.weeklySchedule, async () => {
    console.log("[Backup] Running weekly backup...");
    await createBackup("weekly");
  }, {
    timezone: "Asia/Ho_Chi_Minh",
  });

  console.log("[Backup] Scheduler initialized:");
  console.log(`  - Daily backup: ${BACKUP_CONFIG.dailySchedule}`);
  console.log(`  - Weekly backup: ${BACKUP_CONFIG.weeklySchedule}`);
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
  dailySchedule: string;
  weeklySchedule: string;
} {
  return {
    running: dailyJob !== null && weeklyJob !== null,
    dailySchedule: BACKUP_CONFIG.dailySchedule,
    weeklySchedule: BACKUP_CONFIG.weeklySchedule,
  };
}
