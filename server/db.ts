import { eq, and, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { 
  InsertUser, 
  users, 
  databaseConnections, 
  productStationMappings, 
  spcAnalysisHistory,
  alertSettings,
  InsertDatabaseConnection,
  InsertProductStationMapping,
  InsertSpcAnalysisHistory,
  InsertAlertSetting
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// User operations
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Database Connection operations
export async function createDatabaseConnection(data: InsertDatabaseConnection) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(databaseConnections).values(data);
  return result[0].insertId;
}

export async function getDatabaseConnections() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(databaseConnections).where(eq(databaseConnections.isActive, 1));
}

export async function getDatabaseConnectionById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(databaseConnections).where(eq(databaseConnections.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateDatabaseConnection(id: number, data: Partial<InsertDatabaseConnection>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(databaseConnections).set(data).where(eq(databaseConnections.id, id));
}

export async function deleteDatabaseConnection(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(databaseConnections).set({ isActive: 0 }).where(eq(databaseConnections.id, id));
}

// Product-Station Mapping operations
export async function createProductStationMapping(data: InsertProductStationMapping) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(productStationMappings).values(data);
  return result[0].insertId;
}

export async function getProductStationMappings() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(productStationMappings).where(eq(productStationMappings.isActive, 1));
}

export async function getProductStationMappingById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(productStationMappings).where(eq(productStationMappings.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function findProductStationMapping(productCode: string, stationName: string) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(productStationMappings)
    .where(and(
      eq(productStationMappings.productCode, productCode),
      eq(productStationMappings.stationName, stationName),
      eq(productStationMappings.isActive, 1)
    ))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateProductStationMapping(id: number, data: Partial<InsertProductStationMapping>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(productStationMappings).set(data).where(eq(productStationMappings.id, id));
}

export async function deleteProductStationMapping(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(productStationMappings).set({ isActive: 0 }).where(eq(productStationMappings.id, id));
}

export async function getUniqueProductCodes() {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.selectDistinct({ productCode: productStationMappings.productCode })
    .from(productStationMappings)
    .where(eq(productStationMappings.isActive, 1));
  return result.map(r => r.productCode);
}

export async function getStationsByProductCode(productCode: string) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.selectDistinct({ stationName: productStationMappings.stationName })
    .from(productStationMappings)
    .where(and(
      eq(productStationMappings.productCode, productCode),
      eq(productStationMappings.isActive, 1)
    ));
  return result.map(r => r.stationName);
}

// SPC Analysis History operations
export async function createSpcAnalysisHistory(data: InsertSpcAnalysisHistory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(spcAnalysisHistory).values(data);
  return result[0].insertId;
}

export async function getSpcAnalysisHistory(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(spcAnalysisHistory).orderBy(desc(spcAnalysisHistory.createdAt)).limit(limit);
}

export async function getSpcAnalysisHistoryByMapping(mappingId: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(spcAnalysisHistory)
    .where(eq(spcAnalysisHistory.mappingId, mappingId))
    .orderBy(desc(spcAnalysisHistory.createdAt))
    .limit(limit);
}

// Alert Settings operations
export async function getAlertSettings() {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(alertSettings).where(eq(alertSettings.isActive, 1)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function upsertAlertSettings(data: Partial<InsertAlertSetting>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getAlertSettings();
  if (existing) {
    await db.update(alertSettings).set(data).where(eq(alertSettings.id, existing.id));
    return existing.id;
  } else {
    const result = await db.insert(alertSettings).values(data as InsertAlertSetting);
    return result[0].insertId;
  }
}

// External database query helper
export async function queryExternalDatabase(connectionString: string, query: string, params: unknown[] = []) {
  let connection: mysql.Connection | null = null;
  try {
    connection = await mysql.createConnection(connectionString);
    const [rows] = await connection.execute(query, params);
    return rows as Record<string, unknown>[];
  } catch (error) {
    console.error("[External DB] Query failed:", error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// SPC/CPK Calculation utilities
export interface SpcResult {
  sampleCount: number;
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  range: number;
  cp: number | null;
  cpk: number | null;
  cpu: number | null;
  cpl: number | null;
  ucl: number;
  lcl: number;
  uclR: number;
  lclR: number;
  xBarData: { index: number; value: number; timestamp: Date }[];
  rangeData: { index: number; value: number }[];
  rawData: { value: number; timestamp: Date }[];
}

export function calculateSpc(
  data: { value: number; timestamp: Date }[],
  usl?: number | null,
  lsl?: number | null,
  subgroupSize = 5
): SpcResult {
  if (data.length === 0) {
    return {
      sampleCount: 0,
      mean: 0,
      stdDev: 0,
      min: 0,
      max: 0,
      range: 0,
      cp: null,
      cpk: null,
      cpu: null,
      cpl: null,
      ucl: 0,
      lcl: 0,
      uclR: 0,
      lclR: 0,
      xBarData: [],
      rangeData: [],
      rawData: [],
    };
  }

  const values = data.map(d => d.value);
  const n = values.length;
  
  // Basic statistics
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (n - 1);
  const stdDev = Math.sqrt(variance);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;

  // Create subgroups for X-bar and R charts
  const subgroups: number[][] = [];
  for (let i = 0; i < n; i += subgroupSize) {
    const subgroup = values.slice(i, Math.min(i + subgroupSize, n));
    if (subgroup.length > 0) {
      subgroups.push(subgroup);
    }
  }

  // Calculate X-bar (subgroup means) and R (subgroup ranges)
  const xBarValues = subgroups.map(sg => sg.reduce((a, b) => a + b, 0) / sg.length);
  const rangeValues = subgroups.map(sg => Math.max(...sg) - Math.min(...sg));

  const xBarMean = xBarValues.reduce((a, b) => a + b, 0) / xBarValues.length;
  const rMean = rangeValues.reduce((a, b) => a + b, 0) / rangeValues.length;

  // Control chart constants (for subgroup size 5)
  const A2 = 0.577;
  const D3 = 0;
  const D4 = 2.114;
  const d2 = 2.326;

  // Control limits for X-bar chart
  const ucl = xBarMean + A2 * rMean;
  const lcl = xBarMean - A2 * rMean;

  // Control limits for R chart
  const uclR = D4 * rMean;
  const lclR = D3 * rMean;

  // Estimate sigma using R-bar/d2
  const sigmaEstimate = rMean / d2;

  // Calculate Cp and Cpk if specification limits are provided
  let cp: number | null = null;
  let cpk: number | null = null;
  let cpu: number | null = null;
  let cpl: number | null = null;

  if (usl !== null && usl !== undefined && lsl !== null && lsl !== undefined && sigmaEstimate > 0) {
    cp = (usl - lsl) / (6 * sigmaEstimate);
    cpu = (usl - mean) / (3 * sigmaEstimate);
    cpl = (mean - lsl) / (3 * sigmaEstimate);
    cpk = Math.min(cpu, cpl);
  } else if (usl !== null && usl !== undefined && sigmaEstimate > 0) {
    cpu = (usl - mean) / (3 * sigmaEstimate);
    cpk = cpu;
  } else if (lsl !== null && lsl !== undefined && sigmaEstimate > 0) {
    cpl = (mean - lsl) / (3 * sigmaEstimate);
    cpk = cpl;
  }

  // Prepare chart data
  const xBarData = xBarValues.map((value, index) => ({
    index: index + 1,
    value,
    timestamp: data[index * subgroupSize]?.timestamp || new Date(),
  }));

  const rangeData = rangeValues.map((value, index) => ({
    index: index + 1,
    value,
  }));

  return {
    sampleCount: n,
    mean,
    stdDev,
    min,
    max,
    range,
    cp,
    cpk,
    cpu,
    cpl,
    ucl,
    lcl,
    uclR,
    lclR,
    xBarData,
    rangeData,
    rawData: data,
  };
}
