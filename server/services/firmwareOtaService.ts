/**
 * Firmware OTA Service
 * Quản lý firmware packages và OTA deployments cho thiết bị IoT
 */

import { getDb } from "../db";
import { eq, and, desc, inArray, sql } from "drizzle-orm";
import {
  iotFirmwarePackages,
  iotOtaDeployments,
  iotOtaDeviceStatus,
  iotDevices,
  type IotFirmwarePackage,
  type InsertIotFirmwarePackage,
  type IotOtaDeployment,
  type InsertIotOtaDeployment,
  type IotOtaDeviceStatus,
  type InsertIotOtaDeviceStatus,
} from "../../drizzle/schema";
import { storagePut } from "../storage";
import crypto from "crypto";

// ============================================
// Firmware Package Management
// ============================================

export async function createFirmwarePackage(
  data: Omit<InsertIotFirmwarePackage, "id" | "createdAt" | "updatedAt">
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(iotFirmwarePackages).values(data);
  return result[0].insertId;
}

export async function getFirmwarePackages(filters?: {
  deviceType?: string;
  status?: string;
  limit?: number;
}): Promise<IotFirmwarePackage[]> {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(iotFirmwarePackages);

  const conditions = [];
  if (filters?.deviceType) {
    conditions.push(eq(iotFirmwarePackages.deviceType, filters.deviceType as any));
  }
  if (filters?.status) {
    conditions.push(eq(iotFirmwarePackages.status, filters.status as any));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  query = query.orderBy(desc(iotFirmwarePackages.createdAt)) as any;

  if (filters?.limit) {
    query = query.limit(filters.limit) as any;
  }

  return await query;
}

export async function getFirmwarePackageById(id: number): Promise<IotFirmwarePackage | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(iotFirmwarePackages)
    .where(eq(iotFirmwarePackages.id, id))
    .limit(1);

  return result[0] || null;
}

export async function updateFirmwarePackage(
  id: number,
  data: Partial<InsertIotFirmwarePackage>
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(iotFirmwarePackages)
    .set(data)
    .where(eq(iotFirmwarePackages.id, id));
}

export async function deleteFirmwarePackage(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(iotFirmwarePackages).where(eq(iotFirmwarePackages.id, id));
}

export async function publishFirmwarePackage(
  id: number,
  publishedBy: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(iotFirmwarePackages)
    .set({
      status: "published",
      publishedAt: new Date().toISOString(),
      publishedBy,
    })
    .where(eq(iotFirmwarePackages.id, id));
}

// ============================================
// OTA Deployment Management
// ============================================

export async function createOtaDeployment(
  data: Omit<InsertIotOtaDeployment, "id" | "createdAt" | "updatedAt">
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Tính tổng số thiết bị
  const deviceIds = (data.targetDeviceIds as number[]) || [];
  const totalDevices = deviceIds.length;

  const result = await db.insert(iotOtaDeployments).values({
    ...data,
    totalDevices,
    pendingCount: totalDevices,
  });

  const deploymentId = result[0].insertId;

  // Tạo device status records cho từng thiết bị
  const firmware = await getFirmwarePackageById(data.firmwarePackageId);
  if (firmware && deviceIds.length > 0) {
    const deviceStatusRecords = deviceIds.map((deviceId) => ({
      deploymentId,
      deviceId,
      targetVersion: firmware.version,
      status: "pending" as const,
    }));

    await db.insert(iotOtaDeviceStatus).values(deviceStatusRecords);
  }

  return deploymentId;
}

export async function getOtaDeployments(filters?: {
  status?: string;
  firmwarePackageId?: number;
  limit?: number;
}): Promise<(IotOtaDeployment & { firmwareName?: string; firmwareVersion?: string })[]> {
  const db = await getDb();
  if (!db) return [];

  let query = db
    .select({
      deployment: iotOtaDeployments,
      firmwareName: iotFirmwarePackages.name,
      firmwareVersion: iotFirmwarePackages.version,
    })
    .from(iotOtaDeployments)
    .leftJoin(
      iotFirmwarePackages,
      eq(iotOtaDeployments.firmwarePackageId, iotFirmwarePackages.id)
    );

  const conditions = [];
  if (filters?.status) {
    conditions.push(eq(iotOtaDeployments.status, filters.status as any));
  }
  if (filters?.firmwarePackageId) {
    conditions.push(eq(iotOtaDeployments.firmwarePackageId, filters.firmwarePackageId));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  query = query.orderBy(desc(iotOtaDeployments.createdAt)) as any;

  if (filters?.limit) {
    query = query.limit(filters.limit) as any;
  }

  const results = await query;
  return results.map((r) => ({
    ...r.deployment,
    firmwareName: r.firmwareName || undefined,
    firmwareVersion: r.firmwareVersion || undefined,
  }));
}

export async function getOtaDeploymentById(
  id: number
): Promise<(IotOtaDeployment & { firmwareName?: string; firmwareVersion?: string }) | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select({
      deployment: iotOtaDeployments,
      firmwareName: iotFirmwarePackages.name,
      firmwareVersion: iotFirmwarePackages.version,
    })
    .from(iotOtaDeployments)
    .leftJoin(
      iotFirmwarePackages,
      eq(iotOtaDeployments.firmwarePackageId, iotFirmwarePackages.id)
    )
    .where(eq(iotOtaDeployments.id, id))
    .limit(1);

  if (!result[0]) return null;

  return {
    ...result[0].deployment,
    firmwareName: result[0].firmwareName || undefined,
    firmwareVersion: result[0].firmwareVersion || undefined,
  };
}

export async function updateOtaDeployment(
  id: number,
  data: Partial<InsertIotOtaDeployment>
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(iotOtaDeployments).set(data).where(eq(iotOtaDeployments.id, id));
}

export async function startOtaDeployment(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(iotOtaDeployments)
    .set({
      status: "in_progress",
      startedAt: new Date().toISOString(),
    })
    .where(eq(iotOtaDeployments.id, id));
}

export async function pauseOtaDeployment(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(iotOtaDeployments)
    .set({ status: "paused" })
    .where(eq(iotOtaDeployments.id, id));
}

export async function cancelOtaDeployment(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(iotOtaDeployments)
    .set({ status: "cancelled" })
    .where(eq(iotOtaDeployments.id, id));
}

export async function completeOtaDeployment(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(iotOtaDeployments)
    .set({
      status: "completed",
      completedAt: new Date().toISOString(),
    })
    .where(eq(iotOtaDeployments.id, id));
}

// ============================================
// Device OTA Status Management
// ============================================

export async function getOtaDeviceStatuses(
  deploymentId: number
): Promise<(IotOtaDeviceStatus & { deviceName?: string; deviceCode?: string })[]> {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({
      status: iotOtaDeviceStatus,
      deviceName: iotDevices.deviceName,
      deviceCode: iotDevices.deviceCode,
    })
    .from(iotOtaDeviceStatus)
    .leftJoin(iotDevices, eq(iotOtaDeviceStatus.deviceId, iotDevices.id))
    .where(eq(iotOtaDeviceStatus.deploymentId, deploymentId))
    .orderBy(iotOtaDeviceStatus.id);

  return result.map((r) => ({
    ...r.status,
    deviceName: r.deviceName || undefined,
    deviceCode: r.deviceCode || undefined,
  }));
}

export async function updateOtaDeviceStatus(
  id: number,
  data: Partial<InsertIotOtaDeviceStatus>
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(iotOtaDeviceStatus).set(data).where(eq(iotOtaDeviceStatus.id, id));

  // Cập nhật counts trong deployment
  const statusRecord = await db
    .select()
    .from(iotOtaDeviceStatus)
    .where(eq(iotOtaDeviceStatus.id, id))
    .limit(1);

  if (statusRecord[0]) {
    await updateDeploymentCounts(statusRecord[0].deploymentId);
  }
}

export async function updateDeploymentCounts(deploymentId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const statuses = await db
    .select()
    .from(iotOtaDeviceStatus)
    .where(eq(iotOtaDeviceStatus.deploymentId, deploymentId));

  const counts = {
    successCount: statuses.filter((s) => s.status === "completed").length,
    failedCount: statuses.filter((s) => s.status === "failed" || s.status === "rollback").length,
    pendingCount: statuses.filter((s) => s.status === "pending").length,
    inProgressCount: statuses.filter(
      (s) =>
        s.status === "downloading" ||
        s.status === "downloaded" ||
        s.status === "installing" ||
        s.status === "verifying"
    ).length,
  };

  await db
    .update(iotOtaDeployments)
    .set(counts)
    .where(eq(iotOtaDeployments.id, deploymentId));

  // Auto-complete deployment nếu tất cả thiết bị đã hoàn thành
  const total = statuses.length;
  if (counts.successCount + counts.failedCount === total && total > 0) {
    await completeOtaDeployment(deploymentId);
  }
}

// ============================================
// Firmware Upload Helper
// ============================================

export async function uploadFirmwareFile(
  fileBuffer: Buffer,
  fileName: string,
  contentType: string
): Promise<{ url: string; checksum: string; fileSize: number }> {
  // Tính checksum SHA256
  const checksum = crypto.createHash("sha256").update(fileBuffer).digest("hex");

  // Upload lên S3
  const fileKey = `firmware/${Date.now()}-${fileName}`;
  const { url } = await storagePut(fileKey, fileBuffer, contentType);

  return {
    url,
    checksum,
    fileSize: fileBuffer.length,
  };
}

// ============================================
// Simulate OTA Update Process (for demo)
// ============================================

export async function simulateOtaUpdate(
  deploymentId: number,
  deviceId: number
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Tìm device status record
  const statusRecords = await db
    .select()
    .from(iotOtaDeviceStatus)
    .where(
      and(
        eq(iotOtaDeviceStatus.deploymentId, deploymentId),
        eq(iotOtaDeviceStatus.deviceId, deviceId)
      )
    )
    .limit(1);

  if (!statusRecords[0]) return;

  const statusId = statusRecords[0].id;

  // Simulate download progress
  await updateOtaDeviceStatus(statusId, {
    status: "downloading",
    startedAt: new Date().toISOString(),
    downloadProgress: 0,
  });

  // Simulate progress updates (in real scenario, this would be from device callbacks)
  for (let progress = 25; progress <= 100; progress += 25) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    await updateOtaDeviceStatus(statusId, {
      downloadProgress: progress,
    });
  }

  await updateOtaDeviceStatus(statusId, {
    status: "downloaded",
    downloadedAt: new Date().toISOString(),
  });

  // Simulate installation
  await updateOtaDeviceStatus(statusId, {
    status: "installing",
    installProgress: 0,
  });

  for (let progress = 25; progress <= 100; progress += 25) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    await updateOtaDeviceStatus(statusId, {
      installProgress: progress,
    });
  }

  // Simulate verification
  await updateOtaDeviceStatus(statusId, {
    status: "verifying",
    installedAt: new Date().toISOString(),
  });

  await new Promise((resolve) => setTimeout(resolve, 500));

  // Random success/failure (90% success rate for demo)
  const success = Math.random() > 0.1;

  if (success) {
    await updateOtaDeviceStatus(statusId, {
      status: "completed",
      completedAt: new Date().toISOString(),
      progress: 100,
    });
  } else {
    await updateOtaDeviceStatus(statusId, {
      status: "failed",
      errorCode: "VERIFY_FAILED",
      errorMessage: "Firmware verification failed after installation",
    });
  }
}
