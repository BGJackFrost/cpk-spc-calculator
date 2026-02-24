/**
 * Floor Plan Service
 * Quản lý sơ đồ mặt bằng và vị trí thiết bị IoT
 */

import { getDb } from "../db";
import { eq, and, desc, inArray } from "drizzle-orm";
import {
  iotFloorPlans,
  iotFloorPlanZones,
  iotDevicePositions,
  iotDevices,
  iotDeviceHealth,
  type IotFloorPlan,
  type InsertIotFloorPlan,
  type IotFloorPlanZone,
  type InsertIotFloorPlanZone,
  type IotDevicePosition,
  type InsertIotDevicePosition,
} from "../../drizzle/schema";
import { storagePut } from "../storage";

// ============================================
// Floor Plan Management
// ============================================

export async function createFloorPlan(
  data: Omit<InsertIotFloorPlan, "id" | "createdAt" | "updatedAt">
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(iotFloorPlans).values(data);
  return result[0].insertId;
}

export async function getFloorPlans(filters?: {
  buildingName?: string;
  isActive?: boolean;
}): Promise<IotFloorPlan[]> {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(iotFloorPlans);

  const conditions = [];
  if (filters?.buildingName) {
    conditions.push(eq(iotFloorPlans.buildingName, filters.buildingName));
  }
  if (filters?.isActive !== undefined) {
    conditions.push(eq(iotFloorPlans.isActive, filters.isActive ? 1 : 0));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  query = query.orderBy(iotFloorPlans.sortOrder, iotFloorPlans.name) as any;

  return await query;
}

export async function getFloorPlanById(id: number): Promise<IotFloorPlan | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(iotFloorPlans)
    .where(eq(iotFloorPlans.id, id))
    .limit(1);

  return result[0] || null;
}

export async function updateFloorPlan(
  id: number,
  data: Partial<InsertIotFloorPlan>
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(iotFloorPlans).set(data).where(eq(iotFloorPlans.id, id));
}

export async function deleteFloorPlan(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Delete related zones and positions first
  await db.delete(iotDevicePositions).where(eq(iotDevicePositions.floorPlanId, id));
  await db.delete(iotFloorPlanZones).where(eq(iotFloorPlanZones.floorPlanId, id));
  await db.delete(iotFloorPlans).where(eq(iotFloorPlans.id, id));
}

// ============================================
// Floor Plan Zone Management
// ============================================

export async function createFloorPlanZone(
  data: Omit<InsertIotFloorPlanZone, "id" | "createdAt" | "updatedAt">
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(iotFloorPlanZones).values(data);
  return result[0].insertId;
}

export async function getFloorPlanZones(floorPlanId: number): Promise<IotFloorPlanZone[]> {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(iotFloorPlanZones)
    .where(eq(iotFloorPlanZones.floorPlanId, floorPlanId))
    .orderBy(iotFloorPlanZones.name);
}

export async function getFloorPlanZoneById(id: number): Promise<IotFloorPlanZone | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(iotFloorPlanZones)
    .where(eq(iotFloorPlanZones.id, id))
    .limit(1);

  return result[0] || null;
}

export async function updateFloorPlanZone(
  id: number,
  data: Partial<InsertIotFloorPlanZone>
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(iotFloorPlanZones).set(data).where(eq(iotFloorPlanZones.id, id));
}

export async function deleteFloorPlanZone(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Update device positions to remove zone reference
  await db
    .update(iotDevicePositions)
    .set({ zoneId: null })
    .where(eq(iotDevicePositions.zoneId, id));

  await db.delete(iotFloorPlanZones).where(eq(iotFloorPlanZones.id, id));
}

// ============================================
// Device Position Management
// ============================================

export async function createDevicePosition(
  data: Omit<InsertIotDevicePosition, "id" | "createdAt" | "updatedAt">
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if device already has a position on this floor plan
  const existing = await db
    .select()
    .from(iotDevicePositions)
    .where(
      and(
        eq(iotDevicePositions.deviceId, data.deviceId),
        eq(iotDevicePositions.floorPlanId, data.floorPlanId)
      )
    )
    .limit(1);

  if (existing[0]) {
    // Update existing position
    await db
      .update(iotDevicePositions)
      .set(data)
      .where(eq(iotDevicePositions.id, existing[0].id));
    return existing[0].id;
  }

  const result = await db.insert(iotDevicePositions).values(data);
  return result[0].insertId;
}

export async function getDevicePositions(
  floorPlanId: number
): Promise<
  (IotDevicePosition & {
    deviceName?: string;
    deviceCode?: string;
    deviceType?: string;
    status?: string;
    healthScore?: number;
  })[]
> {
  const db = await getDb();
  if (!db) return [];

  const positions = await db
    .select({
      position: iotDevicePositions,
      deviceName: iotDevices.deviceName,
      deviceCode: iotDevices.deviceCode,
      deviceType: iotDevices.deviceType,
      status: iotDevices.status,
    })
    .from(iotDevicePositions)
    .leftJoin(iotDevices, eq(iotDevicePositions.deviceId, iotDevices.id))
    .where(eq(iotDevicePositions.floorPlanId, floorPlanId));

  // Get health scores for devices
  const deviceIds = positions.map((p) => p.position.deviceId).filter(Boolean);
  let healthMap: Record<number, number> = {};

  if (deviceIds.length > 0) {
    const healthRecords = await db
      .select()
      .from(iotDeviceHealth)
      .where(inArray(iotDeviceHealth.deviceId, deviceIds));

    healthMap = healthRecords.reduce((acc, h) => {
      acc[h.deviceId] = parseFloat(h.healthScore || "100");
      return acc;
    }, {} as Record<number, number>);
  }

  return positions.map((p) => ({
    ...p.position,
    deviceName: p.deviceName || undefined,
    deviceCode: p.deviceCode || undefined,
    deviceType: p.deviceType || undefined,
    status: p.status || undefined,
    healthScore: healthMap[p.position.deviceId] || 100,
  }));
}

export async function getDevicePositionById(
  id: number
): Promise<IotDevicePosition | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(iotDevicePositions)
    .where(eq(iotDevicePositions.id, id))
    .limit(1);

  return result[0] || null;
}

export async function updateDevicePosition(
  id: number,
  data: Partial<InsertIotDevicePosition>
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(iotDevicePositions).set(data).where(eq(iotDevicePositions.id, id));
}

export async function deleteDevicePosition(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(iotDevicePositions).where(eq(iotDevicePositions.id, id));
}

export async function removeDeviceFromFloorPlan(
  deviceId: number,
  floorPlanId: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .delete(iotDevicePositions)
    .where(
      and(
        eq(iotDevicePositions.deviceId, deviceId),
        eq(iotDevicePositions.floorPlanId, floorPlanId)
      )
    );
}

// ============================================
// Floor Plan with Full Data
// ============================================

export interface FloorPlanWithData extends IotFloorPlan {
  zones: IotFloorPlanZone[];
  devices: (IotDevicePosition & {
    deviceName?: string;
    deviceCode?: string;
    deviceType?: string;
    status?: string;
    healthScore?: number;
  })[];
}

export async function getFloorPlanWithData(id: number): Promise<FloorPlanWithData | null> {
  const floorPlan = await getFloorPlanById(id);
  if (!floorPlan) return null;

  const zones = await getFloorPlanZones(id);
  const devices = await getDevicePositions(id);

  return {
    ...floorPlan,
    zones,
    devices,
  };
}

// ============================================
// Zone Alert Statistics
// ============================================

export async function getZoneAlertStats(
  floorPlanId: number
): Promise<Record<number, { alertCount: number; criticalCount: number }>> {
  const db = await getDb();
  if (!db) return {};

  const positions = await getDevicePositions(floorPlanId);
  const stats: Record<number, { alertCount: number; criticalCount: number }> = {};

  for (const pos of positions) {
    if (!pos.zoneId) continue;

    if (!stats[pos.zoneId]) {
      stats[pos.zoneId] = { alertCount: 0, criticalCount: 0 };
    }

    // Count alerts based on device status
    if (pos.status === "error" || pos.status === "offline") {
      stats[pos.zoneId].alertCount++;
    }
    if (pos.healthScore && pos.healthScore < 50) {
      stats[pos.zoneId].criticalCount++;
    }
  }

  return stats;
}

// ============================================
// Floor Plan Image Upload
// ============================================

export async function uploadFloorPlanImage(
  fileBuffer: Buffer,
  fileName: string,
  contentType: string
): Promise<{ url: string }> {
  const fileKey = `floor-plans/${Date.now()}-${fileName}`;
  const { url } = await storagePut(fileKey, fileBuffer, contentType);
  return { url };
}

// ============================================
// Get Devices Not On Floor Plan
// ============================================

export async function getDevicesNotOnFloorPlan(
  floorPlanId: number
): Promise<{ id: number; deviceCode: string; deviceName: string; deviceType: string }[]> {
  const db = await getDb();
  if (!db) return [];

  // Get all devices
  const allDevices = await db
    .select({
      id: iotDevices.id,
      deviceCode: iotDevices.deviceCode,
      deviceName: iotDevices.deviceName,
      deviceType: iotDevices.deviceType,
    })
    .from(iotDevices)
    .where(eq(iotDevices.status, "active"));

  // Get devices already on floor plan
  const positionsOnPlan = await db
    .select({ deviceId: iotDevicePositions.deviceId })
    .from(iotDevicePositions)
    .where(eq(iotDevicePositions.floorPlanId, floorPlanId));

  const deviceIdsOnPlan = new Set(positionsOnPlan.map((p) => p.deviceId));

  // Filter out devices already on floor plan
  return allDevices.filter((d) => !deviceIdsOnPlan.has(d.id));
}
