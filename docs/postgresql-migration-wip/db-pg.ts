import { eq, and, desc, sql, gte, lte, asc, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
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
  InsertAlertSetting,
  products,
  InsertProduct,
  productSpecifications,
  InsertProductSpecification,
  processConfigs,
  InsertProcessConfig,
  productionLineProducts,
  InsertProductionLineProduct,
  spcSamplingPlans,
  userLineAssignments,
  emailNotificationSettings,
  spcPlanExecutionLogs,
  permissions,
  InsertPermission,
  rolePermissions,
  userPermissions,
  auditLogs,
  processTemplates,
  processSteps,
  processStepMachines,
  productionLineMachines,
  spcDefectCategories,
  spcDefectRecords,
  InsertSpcDefectCategory,
  InsertSpcDefectRecord,
  machineTypes,
  InsertMachineType,
  fixtures,
  InsertFixture,
  spcRealtimeData,
  InsertSpcRealtimeData,
  spcSummaryStats,
  InsertSpcSummaryStats,
  spcRules,
  InsertSpcRule,
  caRules,
  InsertCaRule,
  cpkRules,
  InsertCpkRule,
  mappingTemplates,
  InsertMappingTemplate,
  licenses,
  InsertLicense,
  reportTemplates,
  InsertReportTemplate,
  exportHistory,
  InsertExportHistory,
  loginHistory,
  InsertLoginHistory,
  productStationMachineStandards,
  InsertProductStationMachineStandard,
  customValidationRules,
  InsertCustomValidationRule,
  validationRuleLogs,
  InsertValidationRuleLog
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: Pool | null = null;
let _connectionRetries = 0;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// Connection pool configuration for better stability
const poolConfig = {
  max: 10,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 30000,
  ssl: { rejectUnauthorized: false },
};

async function createConnectionWithRetry(): Promise<Pool | null> {
  if (!process.env.DATABASE_URL) {
    console.warn("[Database] DATABASE_URL not configured");
    return null;
  }

  while (_connectionRetries < MAX_RETRIES) {
    try {
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ...poolConfig,
      });
      
      // Test connection
      const connection = await pool.connect();
      await connection.query("SELECT 1");
      connection.release();
      
      console.log("[Database] Connection pool established successfully");
      _connectionRetries = 0;
      return pool;
    } catch (error) {
      _connectionRetries++;
      console.warn(`[Database] Connection attempt ${_connectionRetries}/${MAX_RETRIES} failed:`, error);
      
      if (_connectionRetries < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * _connectionRetries));
      }
    }
  }
  
  console.error("[Database] All connection attempts failed");
  _connectionRetries = 0;
  return null;
}

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      // Try simple connection first (for compatibility)
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// Get database with connection pool for better stability
export async function getDbWithPool() {
  if (!_pool) {
    _pool = await createConnectionWithRetry();
  }
  
  if (_pool) {
    try {
      // Test if pool is still alive
      const connection = await _pool.connect();
      connection.release();
      return drizzle(_pool);
    } catch (error) {
      console.warn("[Database] Pool connection lost, reconnecting...", error);
      _pool = await createConnectionWithRetry();
      if (_pool) {
        return drizzle(_pool);
      }
    }
  }
  
  // Fallback to simple connection
  return getDb();
}

// Execute query with automatic retry on connection errors
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Check if it's a connection error that can be retried
      const isConnectionError = 
        error.code === 'ECONNRESET' ||
        error.code === 'PROTOCOL_CONNECTION_LOST' ||
        error.code === 'ETIMEDOUT' ||
        error.message?.includes('Connection lost');
      
      if (isConnectionError && attempt < maxRetries) {
        console.warn(`[Database] Connection error on attempt ${attempt}/${maxRetries}, retrying...`);
        
        // Reset pool to force reconnection
        if (_pool) {
          try {
            await _pool.end();
          } catch (e) {
            // Ignore pool end errors
          }
          _pool = null;
        }
        
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt));
        continue;
      }
      
      throw error;
    }
  }
  
  throw lastError;
}

// User operations
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) throw new Error("Database not available");
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

    await db.insert(users).values(values).onConflictDoUpdate({ target: users.openId, set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return [];
  
  return await db.select().from(users);
}

export async function updateUserRole(userId: number, role: "user" | "manager" | "admin") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

// Database Connection operations
export async function createDatabaseConnection(data: InsertDatabaseConnection) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(databaseConnections).values(data).returning({ id: databaseConnections.id });
  return result[0].id;
}

export async function getDatabaseConnections() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return [];
  
  return await db.select().from(databaseConnections).where(eq(databaseConnections.isActive, 1));
}

export async function getDatabaseConnectionById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return null;
  
  const result = await db.select().from(databaseConnections).where(eq(databaseConnections.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateDatabaseConnection(id: number, data: Partial<InsertDatabaseConnection>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  
  await db.update(databaseConnections).set(data).where(eq(databaseConnections.id, id));
}

export async function deleteDatabaseConnection(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  
  await db.update(databaseConnections).set({ isActive: 0 }).where(eq(databaseConnections.id, id));
}

// Product-Station Mapping operations
export async function createProductStationMapping(data: InsertProductStationMapping) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(productStationMappings).values(data).returning({ id: productStationMappings.id });
  return result[0].id;
}

export async function getProductStationMappings() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return [];
  
  return await db.select().from(productStationMappings).where(eq(productStationMappings.isActive, 1));
}

export async function getProductStationMappingById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return null;
  
  const result = await db.select().from(productStationMappings).where(eq(productStationMappings.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function findProductStationMapping(productCode: string, stationName: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
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
  if (!db) throw new Error("Database not available");
  
  await db.update(productStationMappings).set(data).where(eq(productStationMappings.id, id));
}

export async function deleteProductStationMapping(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  
  await db.update(productStationMappings).set({ isActive: 0 }).where(eq(productStationMappings.id, id));
}

export async function getUniqueProductCodes() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return [];
  
  const result = await db.selectDistinct({ productCode: productStationMappings.productCode })
    .from(productStationMappings)
    .where(eq(productStationMappings.isActive, 1));
  return result.map(r => r.productCode);
}

export async function getStationsByProductCode(productCode: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
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
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(spcAnalysisHistory).values(data).returning({ id: spcAnalysisHistory.id });
  return result[0].id;
}

export async function getSpcAnalysisHistory(limit = 50) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return [];
  
  return await db.select().from(spcAnalysisHistory).orderBy(desc(spcAnalysisHistory.createdAt)).limit(limit);
}

export async function getSpcAnalysisHistoryByMapping(mappingId: number, limit = 20) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return [];
  
  return await db.select().from(spcAnalysisHistory)
    .where(eq(spcAnalysisHistory.mappingId, mappingId))
    .orderBy(desc(spcAnalysisHistory.createdAt))
    .limit(limit);
}

// Lấy báo cáo SPC theo khoảng thời gian
export async function getSpcAnalysisReport(startDate: Date, endDate: Date, productionLineId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return [];
  
  let query = db.select().from(spcAnalysisHistory)
    .where(
      and(
        gte(spcAnalysisHistory.createdAt, startDate),
        lte(spcAnalysisHistory.createdAt, endDate)
      )
    )
    .orderBy(asc(spcAnalysisHistory.createdAt));
  
  return await query;
}

// Lấy thống kê CPK theo ngày
export async function getCpkTrendByDay(days: number = 30) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return [];
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const results = await db.select().from(spcAnalysisHistory)
    .where(gte(spcAnalysisHistory.createdAt, startDate))
    .orderBy(asc(spcAnalysisHistory.createdAt));
  
  // Group by date
  const grouped: Record<string, { date: string; cpkSum: number; count: number; cpkValues: number[] }> = {};
  
  for (const row of results) {
    const dateKey = new Date(row.createdAt).toISOString().split('T')[0];
    if (!grouped[dateKey]) {
      grouped[dateKey] = { date: dateKey, cpkSum: 0, count: 0, cpkValues: [] };
    }
    if (row.cpk) {
      grouped[dateKey].cpkSum += row.cpk / 1000;
      grouped[dateKey].count++;
      grouped[dateKey].cpkValues.push(row.cpk / 1000);
    }
  }
  
  return Object.values(grouped).map(g => ({
    date: g.date,
    avgCpk: g.count > 0 ? g.cpkSum / g.count : 0,
    minCpk: g.cpkValues.length > 0 ? Math.min(...g.cpkValues) : 0,
    maxCpk: g.cpkValues.length > 0 ? Math.max(...g.cpkValues) : 0,
    sampleCount: g.count,
  }));
}

export async function getRecentAnalysisForPlan(planId: number, limit = 20) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return [];
  
  // Lấy thông tin plan để biết mappingId
  const plan = await db.select().from(spcSamplingPlans).where(eq(spcSamplingPlans.id, planId)).limit(1);
  if (plan.length === 0 || !plan[0].mappingId) {
    // Nếu không có mappingId, trả về các phân tích gần nhất (manual analysis có mappingId = 0)
    return await db.select().from(spcAnalysisHistory)
      .orderBy(desc(spcAnalysisHistory.createdAt))
      .limit(limit);
  }
  
  // Lấy phân tích theo mappingId của plan
  return await db.select().from(spcAnalysisHistory)
    .where(eq(spcAnalysisHistory.mappingId, plan[0].mappingId))
    .orderBy(desc(spcAnalysisHistory.createdAt))
    .limit(limit);
}

// Alert Settings operations
export async function getAlertSettings() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return null;
  
  const result = await db.select().from(alertSettings).where(eq(alertSettings.isActive, 1)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function upsertAlertSettings(data: Partial<InsertAlertSetting>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  
  const existing = await getAlertSettings();
  if (existing) {
    await db.update(alertSettings).set(data).where(eq(alertSettings.id, existing.id));
    return existing.id;
  } else {
    const result = await db.insert(alertSettings).values(data as InsertAlertSetting).returning({ id: alertSettings.id });
    return result[0].id;
  }
}

// External database query helper - supports both MySQL and PostgreSQL
export async function queryExternalDatabase(connectionString: string, query: string, params: unknown[] = []) {
  // Detect database type from connection string
  const isPostgres = connectionString.startsWith('postgres');
  
  if (isPostgres) {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
    try {
      const result = await pool.query(query, params);
      return result.rows as Record<string, unknown>[];
    } catch (error) {
      console.error("[External DB] Query failed:", error);
      throw error;
    } finally {
      await pool.end();
    }
  } else {
    // MySQL connection - dynamic import to avoid errors when mysql2 not installed
    try {
      const mysql = await import('mysql2/promise');
      const connection = await mysql.createConnection(connectionString);
      try {
        const [rows] = await connection.execute(query, params);
        return rows as Record<string, unknown>[];
      } finally {
        await connection.end();
      }
    } catch (error) {
      console.error("[External DB] MySQL query failed:", error);
      throw error;
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


// Import new schema types
import {
  productionLines,
  workstations,
  machines,
  spcRulesConfig,
  samplingConfigs,
  dashboardConfigs,
  dashboardLineSelections,
  spcRuleViolations,
  InsertProductionLine,
  InsertWorkstation,
  InsertMachine,
  InsertSpcRulesConfig,
  InsertSamplingConfig,
  InsertDashboardConfig,
  InsertDashboardLineSelection,
  InsertSpcRuleViolation,
} from "../drizzle/schema";

// Production Line operations
export async function createProductionLine(data: InsertProductionLine) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(productionLines).values(data).returning({ id: productionLines.id });
  return result[0].id;
}

export async function getProductionLines() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return [];
  
  return await db.select().from(productionLines).where(eq(productionLines.isActive, 1));
}

export async function getProductionLineById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return null;
  
  const result = await db.select().from(productionLines).where(eq(productionLines.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateProductionLine(id: number, data: Partial<InsertProductionLine>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  
  await db.update(productionLines).set(data).where(eq(productionLines.id, id));
}

export async function deleteProductionLine(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  
  await db.update(productionLines).set({ isActive: 0 }).where(eq(productionLines.id, id));
}

// Workstation operations
export async function createWorkstation(data: InsertWorkstation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(workstations).values(data).returning({ id: workstations.id });
  return result[0].id;
}

export async function getWorkstationsByLine(productionLineId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return [];
  
  return await db.select().from(workstations)
    .where(and(eq(workstations.productionLineId, productionLineId), eq(workstations.isActive, 1)))
    .orderBy(workstations.sequenceOrder);
}

export async function updateWorkstation(id: number, data: Partial<InsertWorkstation>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  
  await db.update(workstations).set(data).where(eq(workstations.id, id));
}

export async function deleteWorkstation(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  
  await db.update(workstations).set({ isActive: 0 }).where(eq(workstations.id, id));
}

// Machine operations
export async function createMachine(data: InsertMachine) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(machines).values(data).returning({ id: machines.id });
  return result[0].id;
}

export async function getMachinesByWorkstation(workstationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return [];
  
  return await db.select().from(machines)
    .where(and(eq(machines.workstationId, workstationId), eq(machines.isActive, 1)));
}

export async function updateMachine(id: number, data: Partial<InsertMachine>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  
  await db.update(machines).set(data).where(eq(machines.id, id));
}

export async function deleteMachine(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  
  await db.update(machines).set({ isActive: 0 }).where(eq(machines.id, id));
}

// SPC Rules Config operations
export async function getSpcRulesConfig(mappingId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return null;
  
  const query = mappingId 
    ? and(eq(spcRulesConfig.mappingId, mappingId), eq(spcRulesConfig.isActive, 1))
    : eq(spcRulesConfig.isActive, 1);
  
  const result = await db.select().from(spcRulesConfig).where(query).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function upsertSpcRulesConfig(data: Partial<InsertSpcRulesConfig>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  
  const existing = await getSpcRulesConfig(data.mappingId ?? undefined);
  if (existing) {
    await db.update(spcRulesConfig).set(data).where(eq(spcRulesConfig.id, existing.id));
    return existing.id;
  } else {
    const result = await db.insert(spcRulesConfig).values(data as InsertSpcRulesConfig).returning({ id: spcRulesConfig.id });
    return result[0].id;
  }
}

// Sampling Config operations
export async function getSamplingConfigs() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return [];
  
  return await db.select().from(samplingConfigs).where(eq(samplingConfigs.isActive, 1));
}

export async function getSamplingConfigById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return null;
  
  const result = await db.select().from(samplingConfigs).where(eq(samplingConfigs.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createSamplingConfig(data: InsertSamplingConfig) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(samplingConfigs).values(data).returning({ id: samplingConfigs.id });
  return result[0].id;
}

export async function updateSamplingConfig(id: number, data: Partial<InsertSamplingConfig>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  
  await db.update(samplingConfigs).set(data).where(eq(samplingConfigs.id, id));
}

export async function deleteSamplingConfig(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  
  await db.update(samplingConfigs).set({ isActive: 0 }).where(eq(samplingConfigs.id, id));
}

// Dashboard Config operations
export async function getDashboardConfig(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return null;
  
  const result = await db.select().from(dashboardConfigs)
    .where(eq(dashboardConfigs.userId, userId))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function upsertDashboardConfig(data: InsertDashboardConfig) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  
  const existing = await getDashboardConfig(data.userId);
  if (existing) {
    await db.update(dashboardConfigs).set(data).where(eq(dashboardConfigs.id, existing.id));
    return existing.id;
  } else {
    const result = await db.insert(dashboardConfigs).values(data).returning({ id: dashboardConfigs.id });
    return result[0].id;
  }
}

// Dashboard Line Selection operations
export async function getDashboardLineSelections(dashboardConfigId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return [];
  
  return await db.select().from(dashboardLineSelections)
    .where(eq(dashboardLineSelections.dashboardConfigId, dashboardConfigId))
    .orderBy(dashboardLineSelections.displayOrder);
}

export async function setDashboardLineSelections(dashboardConfigId: number, selections: InsertDashboardLineSelection[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  
  // Delete existing selections
  await db.delete(dashboardLineSelections).where(eq(dashboardLineSelections.dashboardConfigId, dashboardConfigId));
  
  // Insert new selections
  if (selections.length > 0) {
    await db.insert(dashboardLineSelections).values(selections);
  }
}

// SPC Rule Violations operations
export async function createSpcRuleViolation(data: InsertSpcRuleViolation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(spcRuleViolations).values(data).returning({ id: spcRuleViolations.id });
  return result[0].id;
}

export async function getSpcRuleViolations(analysisId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return [];
  
  return await db.select().from(spcRuleViolations)
    .where(eq(spcRuleViolations.analysisId, analysisId));
}

// 8 SPC Rules (Western Electric Rules) checker
export interface SpcRuleViolationResult {
  ruleNumber: number;
  ruleName: string;
  violated: boolean;
  violationPoints: number[];
  description: string;
}

export function checkSpcRules(
  xBarData: { index: number; value: number }[],
  mean: number,
  ucl: number,
  lcl: number,
  rulesConfig?: {
    rule1Enabled?: number;
    rule2Enabled?: number;
    rule3Enabled?: number;
    rule4Enabled?: number;
    rule5Enabled?: number;
    rule6Enabled?: number;
    rule7Enabled?: number;
    rule8Enabled?: number;
  }
): SpcRuleViolationResult[] {
  const results: SpcRuleViolationResult[] = [];
  const sigma = (ucl - mean) / 3;
  const sigma1Upper = mean + sigma;
  const sigma1Lower = mean - sigma;
  const sigma2Upper = mean + 2 * sigma;
  const sigma2Lower = mean - 2 * sigma;

  // Rule 1: One point beyond 3σ
  if (rulesConfig?.rule1Enabled !== 0) {
    const violations = xBarData.filter(d => d.value > ucl || d.value < lcl).map(d => d.index);
    results.push({
      ruleNumber: 1,
      ruleName: "Beyond 3σ",
      violated: violations.length > 0,
      violationPoints: violations,
      description: "One or more points beyond 3σ control limits",
    });
  }

  // Rule 2: 9 points in a row on same side of center line
  if (rulesConfig?.rule2Enabled !== 0) {
    const violations: number[] = [];
    for (let i = 8; i < xBarData.length; i++) {
      const window = xBarData.slice(i - 8, i + 1);
      const allAbove = window.every(d => d.value > mean);
      const allBelow = window.every(d => d.value < mean);
      if (allAbove || allBelow) {
        violations.push(xBarData[i].index);
      }
    }
    results.push({
      ruleNumber: 2,
      ruleName: "9 Same Side",
      violated: violations.length > 0,
      violationPoints: violations,
      description: "9 points in a row on same side of center line",
    });
  }

  // Rule 3: 6 points in a row trending up or down
  if (rulesConfig?.rule3Enabled !== 0) {
    const violations: number[] = [];
    for (let i = 5; i < xBarData.length; i++) {
      const window = xBarData.slice(i - 5, i + 1);
      let increasing = true;
      let decreasing = true;
      for (let j = 1; j < window.length; j++) {
        if (window[j].value <= window[j - 1].value) increasing = false;
        if (window[j].value >= window[j - 1].value) decreasing = false;
      }
      if (increasing || decreasing) {
        violations.push(xBarData[i].index);
      }
    }
    results.push({
      ruleNumber: 3,
      ruleName: "6 Trending",
      violated: violations.length > 0,
      violationPoints: violations,
      description: "6 points in a row trending up or down",
    });
  }

  // Rule 4: 14 points alternating up and down
  if (rulesConfig?.rule4Enabled !== 0) {
    const violations: number[] = [];
    for (let i = 13; i < xBarData.length; i++) {
      const window = xBarData.slice(i - 13, i + 1);
      let alternating = true;
      for (let j = 1; j < window.length - 1; j++) {
        const prev = window[j - 1].value;
        const curr = window[j].value;
        const next = window[j + 1].value;
        if (!((curr > prev && curr > next) || (curr < prev && curr < next))) {
          alternating = false;
          break;
        }
      }
      if (alternating) {
        violations.push(xBarData[i].index);
      }
    }
    results.push({
      ruleNumber: 4,
      ruleName: "14 Alternating",
      violated: violations.length > 0,
      violationPoints: violations,
      description: "14 points alternating up and down",
    });
  }

  // Rule 5: 2 of 3 points beyond 2σ
  if (rulesConfig?.rule5Enabled !== 0) {
    const violations: number[] = [];
    for (let i = 2; i < xBarData.length; i++) {
      const window = xBarData.slice(i - 2, i + 1);
      const beyond2Sigma = window.filter(d => d.value > sigma2Upper || d.value < sigma2Lower);
      if (beyond2Sigma.length >= 2) {
        violations.push(xBarData[i].index);
      }
    }
    results.push({
      ruleNumber: 5,
      ruleName: "2 of 3 Beyond 2σ",
      violated: violations.length > 0,
      violationPoints: violations,
      description: "2 of 3 consecutive points beyond 2σ",
    });
  }

  // Rule 6: 4 of 5 points beyond 1σ
  if (rulesConfig?.rule6Enabled !== 0) {
    const violations: number[] = [];
    for (let i = 4; i < xBarData.length; i++) {
      const window = xBarData.slice(i - 4, i + 1);
      const beyond1Sigma = window.filter(d => d.value > sigma1Upper || d.value < sigma1Lower);
      if (beyond1Sigma.length >= 4) {
        violations.push(xBarData[i].index);
      }
    }
    results.push({
      ruleNumber: 6,
      ruleName: "4 of 5 Beyond 1σ",
      violated: violations.length > 0,
      violationPoints: violations,
      description: "4 of 5 consecutive points beyond 1σ",
    });
  }

  // Rule 7: 15 points within 1σ (stratification)
  if (rulesConfig?.rule7Enabled !== 0) {
    const violations: number[] = [];
    for (let i = 14; i < xBarData.length; i++) {
      const window = xBarData.slice(i - 14, i + 1);
      const within1Sigma = window.every(d => d.value >= sigma1Lower && d.value <= sigma1Upper);
      if (within1Sigma) {
        violations.push(xBarData[i].index);
      }
    }
    results.push({
      ruleNumber: 7,
      ruleName: "15 Within 1σ",
      violated: violations.length > 0,
      violationPoints: violations,
      description: "15 points in a row within 1σ (stratification)",
    });
  }

  // Rule 8: 8 points beyond 1σ on both sides
  if (rulesConfig?.rule8Enabled !== 0) {
    const violations: number[] = [];
    for (let i = 7; i < xBarData.length; i++) {
      const window = xBarData.slice(i - 7, i + 1);
      const beyond1Sigma = window.every(d => d.value > sigma1Upper || d.value < sigma1Lower);
      if (beyond1Sigma) {
        violations.push(xBarData[i].index);
      }
    }
    results.push({
      ruleNumber: 8,
      ruleName: "8 Beyond 1σ",
      violated: violations.length > 0,
      violationPoints: violations,
      description: "8 points in a row beyond 1σ on both sides",
    });
  }

  return results;
}

// CPK Status evaluation
export function evaluateCpkStatus(cpk: number | null, config?: { cpkExcellent?: number; cpkGood?: number; cpkAcceptable?: number }) {
  if (cpk === null) return { status: "unknown", color: "gray", label: "N/A" };
  
  const excellent = (config?.cpkExcellent ?? 167) / 100;
  const good = (config?.cpkGood ?? 133) / 100;
  const acceptable = (config?.cpkAcceptable ?? 100) / 100;
  
  if (cpk >= excellent) return { status: "excellent", color: "green", label: "Xuất sắc" };
  if (cpk >= good) return { status: "good", color: "blue", label: "Tốt" };
  if (cpk >= acceptable) return { status: "acceptable", color: "yellow", label: "Chấp nhận" };
  return { status: "poor", color: "red", label: "Kém" };
}

// CA (Capability Analysis) calculation
export function calculateCa(mean: number, target: number, usl: number, lsl: number): number {
  const tolerance = usl - lsl;
  return Math.abs(mean - target) / (tolerance / 2) * 100;
}


// Product operations
export async function createProduct(data: InsertProduct) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(products).values(data).returning({ id: products.id });
  return result[0].id;
}

export async function getProducts() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return [];
  
  return await db.select().from(products).where(eq(products.isActive, 1));
}

export async function getProductById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return null;
  
  const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateProduct(id: number, data: Partial<InsertProduct>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  
  await db.update(products).set(data).where(eq(products.id, id));
}

export async function deleteProduct(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  
  await db.update(products).set({ isActive: 0 }).where(eq(products.id, id));
}

// Product Specification operations
export async function createProductSpecification(data: InsertProductSpecification) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(productSpecifications).values(data).returning({ id: productSpecifications.id });
  return result[0].id;
}

export async function getProductSpecifications(productId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return [];
  
  if (productId) {
    return await db.select().from(productSpecifications)
      .where(and(eq(productSpecifications.productId, productId), eq(productSpecifications.isActive, 1)));
  }
  return await db.select().from(productSpecifications).where(eq(productSpecifications.isActive, 1));
}

export async function getProductSpecificationById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return null;
  
  const result = await db.select().from(productSpecifications).where(eq(productSpecifications.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateProductSpecification(id: number, data: Partial<InsertProductSpecification>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  
  await db.update(productSpecifications).set(data).where(eq(productSpecifications.id, id));
}

export async function deleteProductSpecification(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  
  await db.update(productSpecifications).set({ isActive: 0 }).where(eq(productSpecifications.id, id));
}

// Process Config operations
export async function createProcessConfig(data: InsertProcessConfig) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(processConfigs).values(data).returning({ id: processConfigs.id });
  return result[0].id;
}

export async function getProcessConfigs(productionLineId?: number, productId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return [];
  
  let query = db.select().from(processConfigs).where(eq(processConfigs.isActive, 1));
  if (productionLineId) {
    query = db.select().from(processConfigs)
      .where(and(eq(processConfigs.productionLineId, productionLineId), eq(processConfigs.isActive, 1)));
  }
  return await query;
}

export async function updateProcessConfig(id: number, data: Partial<InsertProcessConfig>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  
  await db.update(processConfigs).set(data).where(eq(processConfigs.id, id));
}

export async function deleteProcessConfig(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  
  await db.update(processConfigs).set({ isActive: 0 }).where(eq(processConfigs.id, id));
}

// Production Line Product operations
export async function createProductionLineProduct(data: InsertProductionLineProduct) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(productionLineProducts).values(data).returning({ id: productionLineProducts.id });
  return result[0].id;
}

export async function getProductionLineProducts(productionLineId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return [];
  
  if (productionLineId) {
    return await db.select().from(productionLineProducts)
      .where(and(eq(productionLineProducts.productionLineId, productionLineId), eq(productionLineProducts.isActive, 1)));
  }
  return await db.select().from(productionLineProducts).where(eq(productionLineProducts.isActive, 1));
}

export async function updateProductionLineProduct(id: number, data: Partial<InsertProductionLineProduct>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  
  await db.update(productionLineProducts).set(data).where(eq(productionLineProducts.id, id));
}

export async function deleteProductionLineProduct(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  
  await db.update(productionLineProducts).set({ isActive: 0 }).where(eq(productionLineProducts.id, id));
}


// ============ SPC Sampling Plans ============
export async function createSpcSamplingPlan(data: {
  name: string;
  description?: string;
  productionLineId: number;
  productId?: number;
  workstationId?: number;
  samplingConfigId: number;
  specificationId?: number;
  mappingId?: number;
  machineId?: number;
  fixtureId?: number;
  startTime?: Date;
  endTime?: Date;
  isRecurring?: boolean;
  notifyOnViolation?: boolean;
  notifyEmail?: string;
  createdBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return null;
  
  const result = await db.insert(spcSamplingPlans).values({
    name: data.name,
    description: data.description || null,
    productionLineId: data.productionLineId,
    productId: data.productId || null,
    workstationId: data.workstationId || null,
    samplingConfigId: data.samplingConfigId,
    specificationId: data.specificationId || null,
    mappingId: data.mappingId || null,
    machineId: data.machineId || null,
    fixtureId: data.fixtureId || null,
    startTime: data.startTime || null,
    endTime: data.endTime || null,
    isRecurring: data.isRecurring ? 1 : 0,
    notifyOnViolation: data.notifyOnViolation ? 1 : 0,
    notifyEmail: data.notifyEmail || null,
    createdBy: data.createdBy,
  });
  return result;
}

export async function getSpcSamplingPlans() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return [];
  return db.select().from(spcSamplingPlans).orderBy(spcSamplingPlans.createdAt);
}

export async function getSpcSamplingPlanById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return null;
  const result = await db.select().from(spcSamplingPlans).where(eq(spcSamplingPlans.id, id)).limit(1);
  return result[0] || null;
}

export async function updateSpcSamplingPlan(id: number, data: Partial<{
  name: string;
  description: string;
  productionLineId: number;
  productId: number;
  workstationId: number;
  samplingConfigId: number;
  specificationId: number;
  mappingId: number;
  machineId: number;
  fixtureId: number;
  startTime: Date;
  endTime: Date;
  isRecurring: boolean;
  notifyOnViolation: boolean;
  notifyEmail: string;
  status: "draft" | "active" | "paused" | "completed";
}>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return;
  
  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.productionLineId !== undefined) updateData.productionLineId = data.productionLineId;
  if (data.productId !== undefined) updateData.productId = data.productId;
  if (data.workstationId !== undefined) updateData.workstationId = data.workstationId;
  if (data.samplingConfigId !== undefined) updateData.samplingConfigId = data.samplingConfigId;
  if (data.specificationId !== undefined) updateData.specificationId = data.specificationId;
  if (data.mappingId !== undefined) updateData.mappingId = data.mappingId;
  if (data.machineId !== undefined) updateData.machineId = data.machineId;
  if (data.fixtureId !== undefined) updateData.fixtureId = data.fixtureId;
  if (data.startTime !== undefined) updateData.startTime = data.startTime;
  if (data.endTime !== undefined) updateData.endTime = data.endTime;
  if (data.isRecurring !== undefined) updateData.isRecurring = data.isRecurring ? 1 : 0;
  if (data.notifyOnViolation !== undefined) updateData.notifyOnViolation = data.notifyOnViolation ? 1 : 0;
  if (data.notifyEmail !== undefined) updateData.notifyEmail = data.notifyEmail;
  if (data.status !== undefined) updateData.status = data.status;
  
  await db.update(spcSamplingPlans).set(updateData).where(eq(spcSamplingPlans.id, id));
}

export async function deleteSpcSamplingPlan(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return;
  await db.delete(spcSamplingPlans).where(eq(spcSamplingPlans.id, id));
}

// ============ User Line Assignments ============
export async function getUserLineAssignments(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return [];
  return db.select().from(userLineAssignments).where(eq(userLineAssignments.userId, userId)).orderBy(userLineAssignments.displayOrder);
}

export async function createUserLineAssignment(userId: number, productionLineId: number, displayOrder: number = 0) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return null;
  const result = await db.insert(userLineAssignments).values({
    userId,
    productionLineId,
    displayOrder,
  });
  return result;
}

export async function deleteUserLineAssignment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return;
  await db.delete(userLineAssignments).where(eq(userLineAssignments.id, id));
}

export async function updateUserLineAssignmentOrder(id: number, displayOrder: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return;
  await db.update(userLineAssignments).set({ displayOrder }).where(eq(userLineAssignments.id, id));
}

// ============ Email Notification Settings ============
export async function getEmailNotificationSettings(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return null;
  const result = await db.select().from(emailNotificationSettings).where(eq(emailNotificationSettings.userId, userId)).limit(1);
  return result[0] || null;
}

export async function upsertEmailNotificationSettings(userId: number, data: {
  email: string;
  notifyOnSpcViolation?: boolean;
  notifyOnCaViolation?: boolean;
  notifyOnCpkViolation?: boolean;
  cpkThreshold?: number;
  notifyFrequency?: "immediate" | "hourly" | "daily";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return;
  
  const existing = await getEmailNotificationSettings(userId);
  
  if (existing) {
    await db.update(emailNotificationSettings).set({
      email: data.email,
      notifyOnSpcViolation: data.notifyOnSpcViolation !== undefined ? (data.notifyOnSpcViolation ? 1 : 0) : existing.notifyOnSpcViolation,
      notifyOnCaViolation: data.notifyOnCaViolation !== undefined ? (data.notifyOnCaViolation ? 1 : 0) : existing.notifyOnCaViolation,
      notifyOnCpkViolation: data.notifyOnCpkViolation !== undefined ? (data.notifyOnCpkViolation ? 1 : 0) : existing.notifyOnCpkViolation,
      cpkThreshold: data.cpkThreshold !== undefined ? data.cpkThreshold : existing.cpkThreshold,
      notifyFrequency: data.notifyFrequency || existing.notifyFrequency,
    }).where(eq(emailNotificationSettings.userId, userId));
  } else {
    await db.insert(emailNotificationSettings).values({
      userId,
      email: data.email,
      notifyOnSpcViolation: data.notifyOnSpcViolation !== undefined ? (data.notifyOnSpcViolation ? 1 : 0) : 1,
      notifyOnCaViolation: data.notifyOnCaViolation !== undefined ? (data.notifyOnCaViolation ? 1 : 0) : 1,
      notifyOnCpkViolation: data.notifyOnCpkViolation !== undefined ? (data.notifyOnCpkViolation ? 1 : 0) : 1,
      cpkThreshold: data.cpkThreshold || 133,
      notifyFrequency: data.notifyFrequency || "immediate",
    });
  }
}

// ============ Permission Functions ============

export async function getPermissions() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return [];
  return await db.select().from(permissions).orderBy(permissions.module);
}

export async function createPermission(data: InsertPermission) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  const result = await db.insert(permissions).values(data).returning({ id: permissions.id });
  return result[0].id;
}

export async function deletePermission(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  await db.delete(permissions).where(eq(permissions.id, id));
}

export async function getRolePermissions() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return [];
  return await db.select().from(rolePermissions);
}

export async function updateRolePermissions(role: string, permissionIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  
  // Delete existing permissions for this role
  await db.delete(rolePermissions).where(eq(rolePermissions.role, role as any));
  
  // Insert new permissions
  if (permissionIds.length > 0) {
    const values = permissionIds.map(permissionId => ({
      role: role as "user" | "admin" | "operator" | "viewer",
      permissionId,
    }));
    await db.insert(rolePermissions).values(values);
  }
}

export async function initDefaultPermissions() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  
  const defaultPermissions = [
    // Dashboard & Overview
    { code: "dashboard.view", name: "Xem Dashboard", module: "dashboard" },
    { code: "dashboard.config", name: "Cấu hình Dashboard", module: "dashboard" },
    { code: "realtime.view", name: "Xem Realtime Conveyor", module: "realtime" },
    { code: "spc_visualization.view", name: "Xem SPC Plan Overview", module: "spc_visualization" },
    
    // Analysis
    { code: "analyze.view", name: "Xem phân tích SPC", module: "analyze" },
    { code: "analyze.execute", name: "Thực hiện phân tích", module: "analyze" },
    { code: "analyze.export", name: "Xuất báo cáo", module: "analyze" },
    { code: "multi_analysis.view", name: "Xem phân tích đa đối tượng", module: "multi_analysis" },
    { code: "line_comparison.view", name: "Xem so sánh dây chuyền", module: "line_comparison" },
    { code: "history.view", name: "Xem lịch sử", module: "history" },
    { code: "spc_report.view", name: "Xem báo cáo SPC", module: "spc_report" },
    { code: "spc_report.export", name: "Xuất báo cáo SPC", module: "spc_report" },
    
    // Quality
    { code: "defect.view", name: "Xem quản lý lỗi", module: "defect" },
    { code: "defect.manage", name: "Quản lý lỗi", module: "defect" },
    { code: "defect_statistics.view", name: "Xem thống kê lỗi Pareto", module: "defect_statistics" },
    { code: "rules.view", name: "Xem quản lý Rules", module: "rules" },
    { code: "rules.manage", name: "Quản lý Rules", module: "rules" },
    
    // Production
    { code: "production_line.view", name: "Xem dây chuyền", module: "production_line" },
    { code: "production_line.manage", name: "Quản lý dây chuyền", module: "production_line" },
    { code: "workstation.view", name: "Xem công trạm", module: "workstation" },
    { code: "workstation.manage", name: "Quản lý công trạm", module: "workstation" },
    { code: "machine.view", name: "Xem máy", module: "machine" },
    { code: "machine.manage", name: "Quản lý máy", module: "machine" },
    { code: "machine_type.view", name: "Xem loại máy", module: "machine_type" },
    { code: "machine_type.manage", name: "Quản lý loại máy", module: "machine_type" },
    { code: "fixture.view", name: "Xem fixture", module: "fixture" },
    { code: "fixture.manage", name: "Quản lý fixture", module: "fixture" },
    { code: "process.view", name: "Xem quy trình", module: "process" },
    { code: "process.manage", name: "Quản lý quy trình", module: "process" },
    
    // Master Data
    { code: "product.view", name: "Xem sản phẩm", module: "product" },
    { code: "product.manage", name: "Quản lý sản phẩm", module: "product" },
    { code: "specification.view", name: "Xem tiêu chuẩn", module: "specification" },
    { code: "specification.manage", name: "Quản lý tiêu chuẩn", module: "specification" },
    { code: "mapping.view", name: "Xem Mapping", module: "mapping" },
    { code: "mapping.manage", name: "Quản lý Mapping", module: "mapping" },
    { code: "sampling.view", name: "Xem phương pháp lấy mẫu", module: "sampling" },
    { code: "sampling.manage", name: "Quản lý phương pháp lấy mẫu", module: "sampling" },
    { code: "spc_plan.view", name: "Xem kế hoạch SPC", module: "spc_plan" },
    { code: "spc_plan.manage", name: "Quản lý kế hoạch SPC", module: "spc_plan" },
    
    // Users
    { code: "user.view", name: "Xem người dùng", module: "user" },
    { code: "user.manage", name: "Quản lý người dùng", module: "user" },
    { code: "local_user.view", name: "Xem người dùng local", module: "local_user" },
    { code: "local_user.manage", name: "Quản lý người dùng local", module: "local_user" },
    { code: "permission.view", name: "Xem phân quyền", module: "permission" },
    { code: "permission.manage", name: "Quản lý phân quyền", module: "permission" },
    
    // System
    { code: "settings.view", name: "Xem cài đặt", module: "settings" },
    { code: "settings.manage", name: "Quản lý cài đặt", module: "settings" },
    { code: "notification.view", name: "Xem thông báo", module: "notification" },
    { code: "notification.manage", name: "Quản lý thông báo", module: "notification" },
    { code: "smtp.view", name: "Xem cấu hình SMTP", module: "smtp" },
    { code: "smtp.manage", name: "Quản lý cấu hình SMTP", module: "smtp" },
    { code: "webhook.view", name: "Xem webhook", module: "webhook" },
    { code: "webhook.manage", name: "Quản lý webhook", module: "webhook" },
    { code: "license.view", name: "Xem license", module: "license" },
    { code: "license.manage", name: "Quản lý license", module: "license" },
    { code: "audit_log.view", name: "Xem audit log", module: "audit_log" },
    { code: "seed_data.execute", name: "Khởi tạo dữ liệu mẫu", module: "seed_data" },
    { code: "report_template.view", name: "Xem template báo cáo", module: "report_template" },
    { code: "report_template.manage", name: "Quản lý template báo cáo", module: "report_template" },
    { code: "export_history.view", name: "Xem lịch sử xuất", module: "export_history" },
    { code: "about.view", name: "Xem thông tin hệ thống", module: "about" },
  ];
  
  // Insert permissions if not exist
  for (const perm of defaultPermissions) {
    const existing = await db.select().from(permissions).where(eq(permissions.code, perm.code)).limit(1);
    if (existing.length === 0) {
      await db.insert(permissions).values(perm);
    }
  }
  
  // Get all permission IDs
  const allPerms = await db.select().from(permissions);
  const permMap = new Map(allPerms.map(p => [p.code, p.id]));
  
  // Set default role permissions
  const adminPerms = allPerms.map(p => p.id);
  const operatorPerms = allPerms.filter(p => 
    p.code.includes(".view") || 
    ["analyze.execute", "analyze.export", "dashboard.config"].includes(p.code)
  ).map(p => p.id);
  const viewerPerms = allPerms.filter(p => p.code.includes(".view")).map(p => p.id);
  const userPerms = ["dashboard.view", "analyze.view", "history.view"].map(code => permMap.get(code)).filter(Boolean) as number[];
  
  await updateRolePermissions("admin", adminPerms);
  await updateRolePermissions("operator", operatorPerms);
  await updateRolePermissions("viewer", viewerPerms);
  await updateRolePermissions("user", userPerms);
}

export async function getUserPermissions(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return [];
  return await db.select().from(userPermissions).where(eq(userPermissions.userId, userId));
}

export async function checkUserPermission(userId: number, userRole: string, permissionCode: string): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return false;
  
  // Admin has all permissions
  if (userRole === "admin") return true;
  
  // Get permission ID
  const perm = await db.select().from(permissions).where(eq(permissions.code, permissionCode)).limit(1);
  if (perm.length === 0) return false;
  const permId = perm[0].id;
  
  // Check user-specific permission override
  const userPerm = await db.select().from(userPermissions)
    .where(and(
      eq(userPermissions.userId, userId),
      eq(userPermissions.permissionId, permId)
    ))
    .limit(1);
  
  if (userPerm.length > 0) {
    return userPerm[0].granted === 1;
  }
  
  // Check role permission
  const rolePerm = await db.select().from(rolePermissions)
    .where(and(
      eq(rolePermissions.role, userRole as any),
      eq(rolePermissions.permissionId, permId)
    ))
    .limit(1);
  
  return rolePerm.length > 0;
}

// Get all workstations
export async function getAllWorkstations() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return [];
  return await db.select().from(workstations).orderBy(workstations.productionLineId, workstations.sequenceOrder);
}

// Get all machines
export async function getAllMachines() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return [];
  return await db.select().from(machines).orderBy(machines.workstationId);
}

// ============ Audit Logs ============

export async function getAuditLogs(params: {
  page: number;
  pageSize: number;
  action?: string;
  module?: string;
  search?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return { logs: [], total: 0, totalPages: 0 };

  const { page, pageSize, action, module, search } = params;
  const offset = (page - 1) * pageSize;

  let query = db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt));

  // Apply filters
  const conditions = [];
  if (action) {
    conditions.push(eq(auditLogs.action, action as any));
  }
  if (module) {
    conditions.push(eq(auditLogs.module, module));
  }
  if (search) {
    conditions.push(
      sql`(${auditLogs.description} LIKE ${`%${search}%`} OR ${auditLogs.userName} LIKE ${`%${search}%`})`
    );
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  const logs = await query.limit(pageSize).offset(offset);
  
  // Get total count
  const countResult = await db.select({ count: sql<number>`count(*)` }).from(auditLogs);
  const total = countResult[0]?.count || 0;

  return {
    logs,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}


// ============================================
// Process Template Functions
// ============================================

export async function getProcessTemplates() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return [];
  return db.select().from(processTemplates).orderBy(processTemplates.name);
}

export async function getProcessTemplateById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return undefined;
  const result = await db.select().from(processTemplates).where(eq(processTemplates.id, id)).limit(1);
  return result[0];
}

export async function createProcessTemplate(data: { name: string; code: string; description?: string; version?: string; createdBy: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  await db.insert(processTemplates).values({
    name: data.name,
    code: data.code,
    description: data.description || null,
    version: data.version || "1.0",
    createdBy: data.createdBy,
  });
}

export async function updateProcessTemplate(id: number, data: { name?: string; code?: string; description?: string; version?: string; isActive?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  await db.update(processTemplates).set(data).where(eq(processTemplates.id, id));
}

export async function deleteProcessTemplate(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  await db.delete(processTemplates).where(eq(processTemplates.id, id));
}

// Process Steps
export async function getProcessSteps(templateId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return [];
  return db.select().from(processSteps).where(eq(processSteps.processTemplateId, templateId)).orderBy(processSteps.sequenceOrder);
}

export async function createProcessStep(data: { processTemplateId: number; name: string; code: string; description?: string; sequenceOrder: number; standardTime?: number; isRequired?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  await db.insert(processSteps).values({
    processTemplateId: data.processTemplateId,
    name: data.name,
    code: data.code,
    description: data.description || null,
    sequenceOrder: data.sequenceOrder,
    standardTime: data.standardTime || null,
    isRequired: data.isRequired ?? 1,
  });
}

export async function updateProcessStep(id: number, data: { name?: string; code?: string; description?: string; sequenceOrder?: number; standardTime?: number; isRequired?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  await db.update(processSteps).set(data).where(eq(processSteps.id, id));
}

export async function deleteProcessStep(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  await db.delete(processSteps).where(eq(processSteps.id, id));
}

export async function moveProcessStep(stepId: number, direction: "up" | "down") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  
  const step = await db.select().from(processSteps).where(eq(processSteps.id, stepId)).limit(1);
  if (!step[0]) return;
  
  const currentOrder = step[0].sequenceOrder;
  const templateId = step[0].processTemplateId;
  const newOrder = direction === "up" ? currentOrder - 1 : currentOrder + 1;
  
  // Find the step to swap with
  const otherStep = await db.select().from(processSteps)
    .where(and(eq(processSteps.processTemplateId, templateId), eq(processSteps.sequenceOrder, newOrder)))
    .limit(1);
  
  if (otherStep[0]) {
    // Swap orders
    await db.update(processSteps).set({ sequenceOrder: currentOrder }).where(eq(processSteps.id, otherStep[0].id));
    await db.update(processSteps).set({ sequenceOrder: newOrder }).where(eq(processSteps.id, stepId));
  }
}

// Process Step Machines
export async function getProcessStepMachines(stepId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return [];
  return db.select().from(processStepMachines).where(eq(processStepMachines.processStepId, stepId));
}

export async function createProcessStepMachine(data: { processStepId: number; machineName: string; machineCode?: string; isRequired?: number; quantity?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  await db.insert(processStepMachines).values({
    processStepId: data.processStepId,
    machineName: data.machineName,
    machineCode: data.machineCode || null,
    isRequired: data.isRequired ?? 1,
    quantity: data.quantity ?? 1,
  });
}

export async function deleteProcessStepMachine(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  await db.delete(processStepMachines).where(eq(processStepMachines.id, id));
}

// Production Line Machines
export async function getProductionLineMachines(lineId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return [];
  
  // Join with machines and machine_types to get full info
  const results = await db
    .select({
      id: productionLineMachines.id,
      productionLineId: productionLineMachines.productionLineId,
      machineId: productionLineMachines.machineId,
      machineName: machines.name,
      machineCode: machines.code,
      machineTypeId: machines.machineTypeId,
      machineTypeName: machineTypes.name,
      machineTypeCode: machineTypes.code,
    })
    .from(productionLineMachines)
    .leftJoin(machines, eq(productionLineMachines.machineId, machines.id))
    .leftJoin(machineTypes, eq(machines.machineTypeId, machineTypes.id))
    .where(eq(productionLineMachines.productionLineId, lineId));
  
  return results;
}

export async function addProductionLineMachine(lineId: number, machineId: number, assignedBy: number = 1) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  await db.insert(productionLineMachines).values({ productionLineId: lineId, machineId, assignedBy, isActive: 1 });
}

export async function removeProductionLineMachine(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  await db.delete(productionLineMachines).where(eq(productionLineMachines.id, id));
}

// ============ SPC Defect Categories ============
export async function getSpcDefectCategories() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return [];
  return await db.select().from(spcDefectCategories).where(eq(spcDefectCategories.isActive, 1));
}

export async function getSpcDefectCategoryById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return null;
  const result = await db.select().from(spcDefectCategories).where(eq(spcDefectCategories.id, id)).limit(1);
  return result[0] || null;
}

export async function createSpcDefectCategory(data: InsertSpcDefectCategory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  const result = await db.insert(spcDefectCategories).values(data).returning({ id: spcDefectCategories.id });
  return result[0].id;
}

export async function updateSpcDefectCategory(id: number, data: Partial<InsertSpcDefectCategory>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  await db.update(spcDefectCategories).set(data).where(eq(spcDefectCategories.id, id));
}

export async function deleteSpcDefectCategory(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  await db.update(spcDefectCategories).set({ isActive: 0 }).where(eq(spcDefectCategories.id, id));
}

// ============ SPC Defect Records ============
export async function getSpcDefectRecords(filters?: {
  productionLineId?: number;
  workstationId?: number;
  productId?: number;
  defectCategoryId?: number;
  status?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return [];
  
  let query = db.select().from(spcDefectRecords);
  const conditions: any[] = [];
  
  if (filters?.productionLineId) {
    conditions.push(eq(spcDefectRecords.productionLineId, filters.productionLineId));
  }
  if (filters?.workstationId) {
    conditions.push(eq(spcDefectRecords.workstationId, filters.workstationId));
  }
  if (filters?.productId) {
    conditions.push(eq(spcDefectRecords.productId, filters.productId));
  }
  if (filters?.defectCategoryId) {
    conditions.push(eq(spcDefectRecords.defectCategoryId, filters.defectCategoryId));
  }
  if (filters?.status) {
    conditions.push(eq(spcDefectRecords.status, filters.status));
  }
  if (filters?.startDate) {
    conditions.push(gte(spcDefectRecords.occurredAt, filters.startDate));
  }
  if (filters?.endDate) {
    conditions.push(lte(spcDefectRecords.occurredAt, filters.endDate));
  }
  
  if (conditions.length > 0) {
    return await query.where(and(...conditions)).orderBy(desc(spcDefectRecords.occurredAt));
  }
  return await query.orderBy(desc(spcDefectRecords.occurredAt));
}

export async function getSpcDefectRecordById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return null;
  const result = await db.select().from(spcDefectRecords).where(eq(spcDefectRecords.id, id)).limit(1);
  return result[0] || null;
}

export async function createSpcDefectRecord(data: InsertSpcDefectRecord) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  const result = await db.insert(spcDefectRecords).values(data).returning({ id: spcDefectRecords.id });
  return result[0].id;
}

export async function updateSpcDefectRecord(id: number, data: Partial<InsertSpcDefectRecord>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  await db.update(spcDefectRecords).set(data).where(eq(spcDefectRecords.id, id));
}

export async function deleteSpcDefectRecord(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  await db.delete(spcDefectRecords).where(eq(spcDefectRecords.id, id));
}

// ============ Defect Statistics for Pareto ============
export async function getDefectStatistics(filters?: {
  productionLineId?: number;
  startDate?: Date;
  endDate?: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return [];
  
  // Lấy tất cả defect records theo filter
  const records = await getSpcDefectRecords(filters);
  
  // Nhóm theo defect category và tính tổng
  const categoryStats: Record<number, { categoryId: number; count: number }> = {};
  for (const record of records) {
    if (!categoryStats[record.defectCategoryId]) {
      categoryStats[record.defectCategoryId] = { categoryId: record.defectCategoryId, count: 0 };
    }
    categoryStats[record.defectCategoryId].count += record.quantity;
  }
  
  // Lấy thông tin category
  const categories = await getSpcDefectCategories();
  const categoryMap = new Map(categories.map(c => [c.id, c]));
  
  // Tạo kết quả với thông tin category
  const result = Object.values(categoryStats).map(stat => ({
    ...stat,
    category: categoryMap.get(stat.categoryId),
  }));
  
  // Sắp xếp theo số lượng giảm dần
  return result.sort((a, b) => b.count - a.count);
}

// Thống kê lỗi theo rule vi phạm
export async function getDefectByRuleStatistics(filters?: {
  productionLineId?: number;
  startDate?: Date;
  endDate?: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return [];
  
  const records = await getSpcDefectRecords(filters);
  
  // Nhóm theo rule violated
  const ruleStats: Record<string, number> = {};
  for (const record of records) {
    const rule = record.ruleViolated || "Unknown";
    if (!ruleStats[rule]) {
      ruleStats[rule] = 0;
    }
    ruleStats[rule] += record.quantity;
  }
  
  // Chuyển thành mảng và sắp xếp
  return Object.entries(ruleStats)
    .map(([rule, count]) => ({ rule, count }))
    .sort((a, b) => b.count - a.count);
}


// ============ Machine Types CRUD ============
export async function getMachineTypes() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return [];
  return await db.select().from(machineTypes).where(eq(machineTypes.isActive, 1));
}

export async function getMachineTypeById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return null;
  const result = await db.select().from(machineTypes).where(eq(machineTypes.id, id));
  return result[0] || null;
}

export async function createMachineType(data: Omit<InsertMachineType, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return 0;
  const result = await db.insert(machineTypes).values(data).returning({ id: machineTypes.id });
  return result[0].id;
}

export async function updateMachineType(id: number, data: Partial<InsertMachineType>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return;
  await db.update(machineTypes).set(data).where(eq(machineTypes.id, id));
}

export async function deleteMachineType(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return;
  await db.update(machineTypes).set({ isActive: 0 }).where(eq(machineTypes.id, id));
}

// ============ Fixtures CRUD ============
export async function getFixtures(machineId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return [];
  if (machineId) {
    return await db.select().from(fixtures)
      .where(and(eq(fixtures.machineId, machineId), eq(fixtures.isActive, 1)));
  }
  return await db.select().from(fixtures).where(eq(fixtures.isActive, 1));
}

export async function getFixtureById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return null;
  const result = await db.select().from(fixtures).where(eq(fixtures.id, id));
  return result[0] || null;
}

export async function createFixture(data: Omit<InsertFixture, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return 0;
  const result = await db.insert(fixtures).values(data).returning({ id: fixtures.id });
  return result[0].id;
}

export async function updateFixture(id: number, data: Partial<InsertFixture>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return;
  await db.update(fixtures).set(data).where(eq(fixtures.id, id));
}

export async function deleteFixture(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return;
  await db.update(fixtures).set({ isActive: 0 }).where(eq(fixtures.id, id));
}

// Lấy fixtures theo máy với thông tin máy
export async function getFixturesWithMachineInfo() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return [];
  
  const allFixtures = await db.select().from(fixtures).where(eq(fixtures.isActive, 1));
  const allMachines = await getAllMachines();
  
  return allFixtures.map(fixture => {
    const machine = allMachines.find(m => m.id === fixture.machineId);
    return {
      ...fixture,
      machineName: machine?.name || "Unknown",
      machineCode: machine?.code || "Unknown",
    };
  });
}

// ==================== SPC Realtime Data ====================

export async function saveSpcRealtimeData(data: Omit<InsertSpcRealtimeData, "id" | "createdAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return 0;
  const result = await db.insert(spcRealtimeData).values(data).returning({ id: spcRealtimeData.id });
  return result[0].id;
}

export async function saveSpcRealtimeDataBatch(dataList: Omit<InsertSpcRealtimeData, "id" | "createdAt">[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (dataList.length === 0) return 0;
  await db.insert(spcRealtimeData).values(dataList);
  return dataList.length;
}

export async function getSpcRealtimeDataByPlan(planId: number, limit: number = 100) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return [];
  return await db.select().from(spcRealtimeData)
    .where(eq(spcRealtimeData.planId, planId))
    .orderBy(desc(spcRealtimeData.sampledAt))
    .limit(limit);
}

export async function getSpcRealtimeDataByPlanPaginated(
  planId: number, 
  page: number = 1, 
  pageSize: number = 50
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return { data: [], total: 0, page, pageSize, totalPages: 0 };
  
  const offset = (page - 1) * pageSize;
  
  const [data, countResult] = await Promise.all([
    db.select().from(spcRealtimeData)
      .where(eq(spcRealtimeData.planId, planId))
      .orderBy(desc(spcRealtimeData.sampledAt))
      .limit(pageSize)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(spcRealtimeData)
      .where(eq(spcRealtimeData.planId, planId))
  ]);
  
  const total = countResult[0]?.count || 0;
  const totalPages = Math.ceil(total / pageSize);
  
  return { data, total, page, pageSize, totalPages };
}

export async function getSpcRealtimeDataByTimeRange(
  planId: number, 
  startTime: Date, 
  endTime: Date
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return [];
  return await db.select().from(spcRealtimeData)
    .where(and(
      eq(spcRealtimeData.planId, planId),
      gte(spcRealtimeData.sampledAt, startTime),
      lte(spcRealtimeData.sampledAt, endTime)
    ))
    .orderBy(asc(spcRealtimeData.sampledAt));
}

export async function deleteSpcRealtimeDataByPlan(planId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return;
  await db.delete(spcRealtimeData).where(eq(spcRealtimeData.planId, planId));
}

// ==================== SPC Summary Stats ====================

export async function saveSpcSummaryStats(data: Omit<InsertSpcSummaryStats, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return 0;
  const result = await db.insert(spcSummaryStats).values(data).returning({ id: spcSummaryStats.id });
  return result[0].id;
}

export async function getSpcSummaryStatsByPlan(planId: number, periodType?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return [];
  
  if (periodType) {
    return await db.select().from(spcSummaryStats)
      .where(and(
        eq(spcSummaryStats.planId, planId),
        eq(spcSummaryStats.periodType, periodType as "shift" | "day" | "week" | "month")
      ))
      .orderBy(desc(spcSummaryStats.periodStart));
  }
  
  return await db.select().from(spcSummaryStats)
    .where(eq(spcSummaryStats.planId, planId))
    .orderBy(desc(spcSummaryStats.periodStart));
}

export async function getSpcSummaryStatsByTimeRange(
  planId: number,
  periodType: "shift" | "day" | "week" | "month",
  startTime: Date,
  endTime: Date
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return [];
  return await db.select().from(spcSummaryStats)
    .where(and(
      eq(spcSummaryStats.planId, planId),
      eq(spcSummaryStats.periodType, periodType),
      gte(spcSummaryStats.periodStart, startTime),
      lte(spcSummaryStats.periodEnd, endTime)
    ))
    .orderBy(asc(spcSummaryStats.periodStart));
}

export async function getLatestSpcSummaryStats(planId: number, periodType: "shift" | "day" | "week" | "month") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return null;
  const result = await db.select().from(spcSummaryStats)
    .where(and(
      eq(spcSummaryStats.planId, planId),
      eq(spcSummaryStats.periodType, periodType)
    ))
    .orderBy(desc(spcSummaryStats.periodStart))
    .limit(1);
  return result[0] || null;
}

export async function updateSpcSummaryStats(id: number, data: Partial<InsertSpcSummaryStats>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return;
  await db.update(spcSummaryStats).set(data).where(eq(spcSummaryStats.id, id));
}

export async function upsertSpcSummaryStats(
  planId: number,
  productionLineId: number,
  periodType: "shift" | "day" | "week" | "month",
  periodStart: Date,
  periodEnd: Date,
  data: Partial<InsertSpcSummaryStats>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return 0;
  
  // Check if exists
  const existing = await db.select().from(spcSummaryStats)
    .where(and(
      eq(spcSummaryStats.planId, planId),
      eq(spcSummaryStats.periodType, periodType),
      eq(spcSummaryStats.periodStart, periodStart)
    ))
    .limit(1);
  
  if (existing.length > 0) {
    await db.update(spcSummaryStats).set(data).where(eq(spcSummaryStats.id, existing[0].id));
    return existing[0].id;
  } else {
    const result = await db.insert(spcSummaryStats).values({
      planId,
      productionLineId,
      periodType,
      periodStart,
      periodEnd,
      ...data
    }).returning({ id: spcSummaryStats.id });
    return result[0].id;
  }
}

// ==================== Pagination Helpers ====================

export async function getSpcAnalysisHistoryPaginated(
  page: number = 1, 
  pageSize: number = 20,
  filters?: {
    productCode?: string;
    stationName?: string;
    startDate?: Date;
    endDate?: Date;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return { data: [], total: 0, page, pageSize, totalPages: 0 };
  
  const offset = (page - 1) * pageSize;
  const conditions = [];
  
  if (filters?.productCode) {
    conditions.push(eq(spcAnalysisHistory.productCode, filters.productCode));
  }
  if (filters?.stationName) {
    conditions.push(eq(spcAnalysisHistory.stationName, filters.stationName));
  }
  if (filters?.startDate) {
    conditions.push(gte(spcAnalysisHistory.createdAt, filters.startDate));
  }
  if (filters?.endDate) {
    conditions.push(lte(spcAnalysisHistory.createdAt, filters.endDate));
  }
  
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  
  const [data, countResult] = await Promise.all([
    whereClause 
      ? db.select().from(spcAnalysisHistory).where(whereClause).orderBy(desc(spcAnalysisHistory.createdAt)).limit(pageSize).offset(offset)
      : db.select().from(spcAnalysisHistory).orderBy(desc(spcAnalysisHistory.createdAt)).limit(pageSize).offset(offset),
    whereClause
      ? db.select({ count: sql<number>`count(*)` }).from(spcAnalysisHistory).where(whereClause)
      : db.select({ count: sql<number>`count(*)` }).from(spcAnalysisHistory)
  ]);
  
  const total = countResult[0]?.count || 0;
  const totalPages = Math.ceil(total / pageSize);
  
  return { data, total, page, pageSize, totalPages };
}

export async function getAuditLogsPaginated(
  page: number = 1,
  pageSize: number = 50,
  filters?: {
    userId?: number;
    action?: string;
    tableName?: string;
    startDate?: Date;
    endDate?: Date;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return { data: [], total: 0, page, pageSize, totalPages: 0 };
  
  const offset = (page - 1) * pageSize;
  const conditions = [];
  
  if (filters?.userId) {
    conditions.push(eq(auditLogs.userId, filters.userId));
  }
  if (filters?.action) {
    conditions.push(eq(auditLogs.action, filters.action as "create" | "update" | "delete" | "login" | "logout" | "export" | "analyze"));
  }
  if (filters?.tableName) {
    conditions.push(eq(auditLogs.tableName, filters.tableName));
  }
  if (filters?.startDate) {
    conditions.push(gte(auditLogs.createdAt, filters.startDate));
  }
  if (filters?.endDate) {
    conditions.push(lte(auditLogs.createdAt, filters.endDate));
  }
  
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  
  const [data, countResult] = await Promise.all([
    whereClause
      ? db.select().from(auditLogs).where(whereClause).orderBy(desc(auditLogs.createdAt)).limit(pageSize).offset(offset)
      : db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(pageSize).offset(offset),
    whereClause
      ? db.select({ count: sql<number>`count(*)` }).from(auditLogs).where(whereClause)
      : db.select({ count: sql<number>`count(*)` }).from(auditLogs)
  ]);
  
  const total = countResult[0]?.count || 0;
  const totalPages = Math.ceil(total / pageSize);
  
  return { data, total, page, pageSize, totalPages };
}


// ==================== SPC Rules ====================

export async function getSpcRules() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return [];
  return db.select().from(spcRules).orderBy(asc(spcRules.sortOrder));
}

export async function getSpcRuleById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return null;
  const result = await db.select().from(spcRules).where(eq(spcRules.id, id));
  return result[0];
}

export async function getSpcRuleByCode(code: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return null;
  const result = await db.select().from(spcRules).where(eq(spcRules.code, code));
  return result[0];
}

export async function getEnabledSpcRules() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return [];
  return db.select().from(spcRules).where(eq(spcRules.isEnabled, 1)).orderBy(asc(spcRules.sortOrder));
}

export async function createSpcRule(data: Omit<InsertSpcRule, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  const result = await db.insert(spcRules).values(data).returning({ id: spcRules.id });
  return result[0].id;
}

export async function updateSpcRule(id: number, data: Partial<InsertSpcRule>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return;
  await db.update(spcRules).set(data).where(eq(spcRules.id, id));
}

export async function deleteSpcRule(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return;
  await db.delete(spcRules).where(eq(spcRules.id, id));
}

export async function toggleSpcRule(id: number, isEnabled: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return;
  await db.update(spcRules).set({ isEnabled: isEnabled ? 1 : 0 }).where(eq(spcRules.id, id));
}

// ==================== CA Rules ====================

export async function getCaRules() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return [];
  return db.select().from(caRules).orderBy(asc(caRules.sortOrder));
}

export async function getCaRuleById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return null;
  const result = await db.select().from(caRules).where(eq(caRules.id, id));
  return result[0];
}

export async function getCaRuleByCode(code: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return null;
  const result = await db.select().from(caRules).where(eq(caRules.code, code));
  return result[0];
}

export async function getEnabledCaRules() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return [];
  return db.select().from(caRules).where(eq(caRules.isEnabled, 1)).orderBy(asc(caRules.sortOrder));
}

export async function createCaRule(data: Omit<InsertCaRule, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  const result = await db.insert(caRules).values(data).returning({ id: caRules.id });
  return result[0].id;
}

export async function updateCaRule(id: number, data: Partial<InsertCaRule>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return;
  await db.update(caRules).set(data).where(eq(caRules.id, id));
}

export async function deleteCaRule(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return;
  await db.delete(caRules).where(eq(caRules.id, id));
}

export async function toggleCaRule(id: number, isEnabled: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return;
  await db.update(caRules).set({ isEnabled: isEnabled ? 1 : 0 }).where(eq(caRules.id, id));
}

// ==================== CPK Rules ====================

export async function getCpkRules() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return [];
  return db.select().from(cpkRules).orderBy(asc(cpkRules.sortOrder));
}

export async function getCpkRuleById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return null;
  const result = await db.select().from(cpkRules).where(eq(cpkRules.id, id));
  return result[0];
}

export async function getCpkRuleByCode(code: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return null;
  const result = await db.select().from(cpkRules).where(eq(cpkRules.code, code));
  return result[0];
}

export async function getEnabledCpkRules() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return [];
  return db.select().from(cpkRules).where(eq(cpkRules.isEnabled, 1)).orderBy(asc(cpkRules.sortOrder));
}

export async function createCpkRule(data: Omit<InsertCpkRule, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  const result = await db.insert(cpkRules).values(data).returning({ id: cpkRules.id });
  return result[0].id;
}

export async function updateCpkRule(id: number, data: Partial<InsertCpkRule>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return;
  await db.update(cpkRules).set(data).where(eq(cpkRules.id, id));
}

export async function deleteCpkRule(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return;
  await db.delete(cpkRules).where(eq(cpkRules.id, id));
}

export async function toggleCpkRule(id: number, isEnabled: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return;
  await db.update(cpkRules).set({ isEnabled: isEnabled ? 1 : 0 }).where(eq(cpkRules.id, id));
}

// ==================== Seed Default Rules ====================

export async function seedDefaultSpcRules() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return;
  const existing = await db.select().from(spcRules);
  if (existing.length > 0) return;

  const defaultRules = [
    {
      code: "RULE1",
      name: "Điểm ngoài giới hạn kiểm soát",
      description: "Một điểm nằm ngoài giới hạn kiểm soát 3σ (UCL hoặc LCL)",
      category: "western_electric",
      formula: "X > UCL hoặc X < LCL",
      example: "Nếu UCL = 10.5 và LCL = 9.5, điểm 10.8 sẽ vi phạm rule này",
      severity: "critical" as const,
      consecutivePoints: 1,
      sigmaLevel: 3,
      isEnabled: 1,
      sortOrder: 1
    },
    {
      code: "RULE2",
      name: "9 điểm liên tiếp cùng phía",
      description: "9 điểm liên tiếp nằm cùng một phía của đường trung tâm (CL)",
      category: "western_electric",
      formula: "9 điểm liên tiếp > CL hoặc 9 điểm liên tiếp < CL",
      example: "9 điểm liên tiếp đều nằm trên đường trung tâm",
      severity: "warning" as const,
      consecutivePoints: 9,
      sigmaLevel: 0,
      isEnabled: 1,
      sortOrder: 2
    },
    {
      code: "RULE3",
      name: "6 điểm tăng/giảm liên tục",
      description: "6 điểm liên tiếp tăng dần hoặc giảm dần (trend)",
      category: "western_electric",
      formula: "X1 < X2 < X3 < X4 < X5 < X6 hoặc X1 > X2 > X3 > X4 > X5 > X6",
      example: "6 điểm: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6",
      severity: "warning" as const,
      consecutivePoints: 6,
      sigmaLevel: 0,
      isEnabled: 1,
      sortOrder: 3
    },
    {
      code: "RULE4",
      name: "14 điểm dao động xen kẽ",
      description: "14 điểm liên tiếp dao động lên xuống xen kẽ",
      category: "western_electric",
      formula: "Điểm tăng giảm xen kẽ 14 lần liên tiếp",
      example: "10.1, 10.3, 10.2, 10.4, 10.3, 10.5...",
      severity: "warning" as const,
      consecutivePoints: 14,
      sigmaLevel: 0,
      isEnabled: 1,
      sortOrder: 4
    },
    {
      code: "RULE5",
      name: "2/3 điểm trong vùng 2σ-3σ",
      description: "2 trong 3 điểm liên tiếp nằm trong vùng 2σ đến 3σ cùng phía",
      category: "western_electric",
      formula: "2/3 điểm trong khoảng (CL+2σ, UCL) hoặc (LCL, CL-2σ)",
      example: "3 điểm: 10.4, 10.45, 10.35 với 2σ = 10.3",
      severity: "warning" as const,
      consecutivePoints: 3,
      sigmaLevel: 2,
      isEnabled: 1,
      sortOrder: 5
    },
    {
      code: "RULE6",
      name: "4/5 điểm trong vùng 1σ-3σ",
      description: "4 trong 5 điểm liên tiếp nằm trong vùng 1σ đến 3σ cùng phía",
      category: "western_electric",
      formula: "4/5 điểm trong khoảng (CL+1σ, UCL) hoặc (LCL, CL-1σ)",
      example: "5 điểm với 4 điểm nằm trên vùng 1σ",
      severity: "warning" as const,
      consecutivePoints: 5,
      sigmaLevel: 1,
      isEnabled: 1,
      sortOrder: 6
    },
    {
      code: "RULE7",
      name: "15 điểm trong vùng ±1σ",
      description: "15 điểm liên tiếp nằm trong vùng ±1σ (stratification)",
      category: "western_electric",
      formula: "15 điểm trong khoảng (CL-1σ, CL+1σ)",
      example: "15 điểm đều nằm gần đường trung tâm",
      severity: "warning" as const,
      consecutivePoints: 15,
      sigmaLevel: 1,
      isEnabled: 1,
      sortOrder: 7
    },
    {
      code: "RULE8",
      name: "8 điểm ngoài vùng ±1σ",
      description: "8 điểm liên tiếp nằm ngoài vùng ±1σ cả hai phía (mixture)",
      category: "western_electric",
      formula: "8 điểm nằm ngoài (CL-1σ, CL+1σ) xen kẽ hai phía",
      example: "8 điểm dao động mạnh giữa hai phía",
      severity: "warning" as const,
      consecutivePoints: 8,
      sigmaLevel: 1,
      isEnabled: 1,
      sortOrder: 8
    }
  ];

  for (const rule of defaultRules) {
    await db.insert(spcRules).values(rule);
  }
}

export async function seedDefaultCaRules() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return;
  const existing = await db.select().from(caRules);
  if (existing.length > 0) return;

  const defaultRules = [
    {
      code: "CA_EXCELLENT",
      name: "Ca Xuất sắc",
      description: "Độ chính xác quy trình xuất sắc, tâm quy trình gần như trùng với tâm spec",
      formula: "|Ca| ≤ 0.125 (12.5%)",
      example: "Ca = 0.05 → Quy trình rất chính xác",
      severity: "warning" as const,
      minValue: 0,
      maxValue: 125,
      isEnabled: 1,
      sortOrder: 1
    },
    {
      code: "CA_GOOD",
      name: "Ca Tốt",
      description: "Độ chính xác quy trình tốt, cần theo dõi",
      formula: "0.125 < |Ca| ≤ 0.25 (12.5% - 25%)",
      example: "Ca = 0.18 → Quy trình tốt nhưng cần theo dõi",
      severity: "warning" as const,
      minValue: 125,
      maxValue: 250,
      isEnabled: 1,
      sortOrder: 2
    },
    {
      code: "CA_ACCEPTABLE",
      name: "Ca Chấp nhận được",
      description: "Độ chính xác quy trình chấp nhận được, cần cải tiến",
      formula: "0.25 < |Ca| ≤ 0.50 (25% - 50%)",
      example: "Ca = 0.35 → Cần điều chỉnh tâm quy trình",
      severity: "warning" as const,
      minValue: 250,
      maxValue: 500,
      isEnabled: 1,
      sortOrder: 3
    },
    {
      code: "CA_POOR",
      name: "Ca Kém",
      description: "Độ chính xác quy trình kém, cần hành động ngay",
      formula: "|Ca| > 0.50 (> 50%)",
      example: "Ca = 0.65 → Quy trình lệch tâm nghiêm trọng",
      severity: "critical" as const,
      minValue: 500,
      maxValue: null,
      isEnabled: 1,
      sortOrder: 4
    }
  ];

  for (const rule of defaultRules) {
    await db.insert(caRules).values(rule);
  }
}

export async function seedDefaultCpkRules() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return;
  const existing = await db.select().from(cpkRules);
  if (existing.length > 0) return;

  const defaultRules = [
    {
      code: "CPK_EXCELLENT",
      name: "CPK Xuất sắc",
      description: "Năng lực quy trình xuất sắc, quy trình rất ổn định",
      minCpk: 1670,
      maxCpk: null,
      status: "excellent",
      color: "green",
      action: "Duy trì quy trình hiện tại, có thể xem xét giảm tần suất kiểm tra",
      severity: "info" as const,
      isEnabled: 1,
      sortOrder: 1
    },
    {
      code: "CPK_GOOD",
      name: "CPK Tốt",
      description: "Năng lực quy trình tốt, đáp ứng yêu cầu",
      minCpk: 1330,
      maxCpk: 1670,
      status: "good",
      color: "blue",
      action: "Tiếp tục theo dõi, tìm cơ hội cải tiến",
      severity: "info" as const,
      isEnabled: 1,
      sortOrder: 2
    },
    {
      code: "CPK_ACCEPTABLE",
      name: "CPK Chấp nhận được",
      description: "Năng lực quy trình chấp nhận được, cần cải tiến",
      minCpk: 1000,
      maxCpk: 1330,
      status: "acceptable",
      color: "yellow",
      action: "Phân tích nguyên nhân biến động, lập kế hoạch cải tiến",
      severity: "warning" as const,
      isEnabled: 1,
      sortOrder: 3
    },
    {
      code: "CPK_POOR",
      name: "CPK Kém",
      description: "Năng lực quy trình kém, cần hành động khẩn cấp",
      minCpk: 670,
      maxCpk: 1000,
      status: "poor",
      color: "orange",
      action: "Kiểm tra 100% sản phẩm, phân tích và khắc phục ngay",
      severity: "warning" as const,
      isEnabled: 1,
      sortOrder: 4
    },
    {
      code: "CPK_UNACCEPTABLE",
      name: "CPK Không chấp nhận",
      description: "Năng lực quy trình không chấp nhận được, dừng sản xuất",
      minCpk: null,
      maxCpk: 670,
      status: "unacceptable",
      color: "red",
      action: "Dừng sản xuất, kiểm tra toàn bộ, tìm và khắc phục nguyên nhân gốc",
      severity: "critical" as const,
      isEnabled: 1,
      sortOrder: 5
    }
  ];

  for (const rule of defaultRules) {
    await db.insert(cpkRules).values(rule);
  }
}

export async function seedAllDefaultRules() {
  await seedDefaultSpcRules();
  await seedDefaultCaRules();
  await seedDefaultCpkRules();
}


// =====================
// Mapping Templates CRUD
// =====================

export async function getMappingTemplates() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return [];
  return await db.select().from(mappingTemplates).where(eq(mappingTemplates.isActive, 1));
}

export async function getMappingTemplateById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return null;
  const result = await db.select().from(mappingTemplates).where(eq(mappingTemplates.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createMappingTemplate(data: InsertMappingTemplate) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  const result = await db.insert(mappingTemplates).values(data).returning({ id: mappingTemplates.id });
  return result[0].id;
}

export async function updateMappingTemplate(id: number, data: Partial<InsertMappingTemplate>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  await db.update(mappingTemplates).set(data).where(eq(mappingTemplates.id, id));
}

export async function deleteMappingTemplate(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  await db.update(mappingTemplates).set({ isActive: 0 }).where(eq(mappingTemplates.id, id));
}

export async function seedDefaultMappingTemplates() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return;

  const defaultTemplates: InsertMappingTemplate[] = [
    {
      name: "SMT Solder Paste Printing",
      description: "Template cho công đoạn in keo hàn SMT",
      category: "SMT",
      tableName: "smt_solder_paste_data",
      productCodeColumn: "product_code",
      stationColumn: "station_name",
      valueColumn: "volume",
      timestampColumn: "measured_at",
      defaultUsl: 120,
      defaultLsl: 80,
      defaultTarget: 100,
    },
    {
      name: "SMT Pick & Place",
      description: "Template cho công đoạn gắp linh kiện SMT",
      category: "SMT",
      tableName: "smt_placement_data",
      productCodeColumn: "product_code",
      stationColumn: "machine_id",
      valueColumn: "placement_accuracy",
      timestampColumn: "timestamp",
      defaultUsl: 50,
      defaultLsl: -50,
      defaultTarget: 0,
    },
    {
      name: "Reflow Oven Temperature",
      description: "Template cho nhiệt độ lò reflow",
      category: "SMT",
      tableName: "reflow_temperature_data",
      productCodeColumn: "product_code",
      stationColumn: "zone",
      valueColumn: "temperature",
      timestampColumn: "recorded_at",
      defaultUsl: 250,
      defaultLsl: 230,
      defaultTarget: 240,
    },
    {
      name: "ICT Test Results",
      description: "Template cho kết quả kiểm tra ICT",
      category: "Testing",
      tableName: "ict_test_results",
      productCodeColumn: "board_id",
      stationColumn: "test_station",
      valueColumn: "resistance_value",
      timestampColumn: "test_time",
    },
    {
      name: "AOI Inspection",
      description: "Template cho kiểm tra quang học tự động",
      category: "Inspection",
      tableName: "aoi_inspection_data",
      productCodeColumn: "pcb_id",
      stationColumn: "aoi_machine",
      valueColumn: "defect_count",
      timestampColumn: "inspection_time",
      defaultUsl: 5,
      defaultLsl: 0,
      defaultTarget: 0,
    },
  ];

  for (const template of defaultTemplates) {
    await db.insert(mappingTemplates).values(template);
  }
}


// ============ LICENSE OPERATIONS ============

export async function getLicenses() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return [];
  return db.select().from(licenses).orderBy(desc(licenses.createdAt));
}

export async function getActiveLicense() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return null;
  const result = await db.select().from(licenses).where(eq(licenses.isActive, 1)).limit(1);
  return result[0] || null;
}

export async function getLicenseByKey(licenseKey: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return null;
  const result = await db.select().from(licenses).where(eq(licenses.licenseKey, licenseKey)).limit(1);
  return result[0] || null;
}

export async function createLicense(data: InsertLicense) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  await db.insert(licenses).values(data);
}

export async function activateLicense(licenseKey: string, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  
  // Deactivate all other licenses first
  await db.update(licenses).set({ isActive: 0 }).where(eq(licenses.isActive, 1));
  
  // Activate the new license
  await db.update(licenses)
    .set({ 
      isActive: 1, 
      activatedAt: new Date(), 
      activatedBy: userId 
    })
    .where(eq(licenses.licenseKey, licenseKey));
}

export async function deactivateLicense(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  await db.update(licenses).set({ isActive: 0 }).where(eq(licenses.id, id));
}

export async function deleteLicense(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  await db.delete(licenses).where(eq(licenses.id, id));
}

// Generate a random license key
export function generateLicenseKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const segments = 4;
  const segmentLength = 5;
  const parts: string[] = [];
  
  for (let i = 0; i < segments; i++) {
    let segment = '';
    for (let j = 0; j < segmentLength; j++) {
      segment += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    parts.push(segment);
  }
  
  return parts.join('-');
}

// Seed default trial license
export async function seedDefaultLicense() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  
  const existingLicense = await getActiveLicense();
  if (existingLicense) {
    return; // Already has an active license
  }
  
  const trialLicense: InsertLicense = {
    licenseKey: generateLicenseKey(),
    licenseType: 'trial',
    companyName: 'Trial Company',
    contactEmail: 'trial@example.com',
    maxUsers: 5,
    maxProductionLines: 3,
    maxSpcPlans: 10,
    features: JSON.stringify(['basic_spc', 'basic_cpk', 'basic_reports']),
    isActive: 1,
    activatedAt: new Date(),
  };
  
  await db.insert(licenses).values(trialLicense);
}


// Check licenses expiring soon (within specified days)
export async function getLicensesExpiringSoon(daysBeforeExpiry: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  
  const now = new Date();
  const futureDate = new Date(now.getTime() + daysBeforeExpiry * 24 * 60 * 60 * 1000);
  
  return await db.select()
    .from(licenses)
    .where(
      and(
        eq(licenses.isActive, 1),
        lte(licenses.expiresAt, futureDate),
        gte(licenses.expiresAt, now)
      )
    );
}

// Get expired licenses
export async function getExpiredLicenses() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  
  const now = new Date();
  
  return await db.select()
    .from(licenses)
    .where(
      and(
        eq(licenses.isActive, 1),
        lte(licenses.expiresAt, now)
      )
    );
}


// ==================== Report Templates ====================

export async function getReportTemplates() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return [];
  return await db.select().from(reportTemplates).orderBy(desc(reportTemplates.createdAt));
}

export async function getReportTemplateById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return null;
  const result = await db.select().from(reportTemplates).where(eq(reportTemplates.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getDefaultReportTemplate() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return null;
  const result = await db.select().from(reportTemplates)
    .where(and(eq(reportTemplates.isDefault, 1), eq(reportTemplates.isActive, 1)))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createReportTemplate(data: Omit<InsertReportTemplate, 'id' | 'createdAt' | 'updatedAt'>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  
  // Nếu đây là template mặc định, bỏ mặc định của các template khác
  if (data.isDefault) {
    await db.update(reportTemplates).set({ isDefault: 0 }).where(eq(reportTemplates.isDefault, 1));
  }
  
  const result = await db.insert(reportTemplates).values(data).returning({ id: reportTemplates.id });
  return result[0].id;
}

export async function updateReportTemplate(id: number, data: Partial<InsertReportTemplate>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  
  // Nếu đây là template mặc định, bỏ mặc định của các template khác
  if (data.isDefault) {
    await db.update(reportTemplates).set({ isDefault: 0 }).where(eq(reportTemplates.isDefault, 1));
  }
  
  await db.update(reportTemplates).set(data).where(eq(reportTemplates.id, id));
}

export async function deleteReportTemplate(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  await db.delete(reportTemplates).where(eq(reportTemplates.id, id));
}


// ==================== Export History ====================

export async function createExportHistory(data: InsertExportHistory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  const result = await db.insert(exportHistory).values(data).returning({ id: exportHistory.id });
  return result[0].id;
}

export async function getExportHistoryByUser(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  return db.select().from(exportHistory)
    .where(eq(exportHistory.userId, userId))
    .orderBy(desc(exportHistory.createdAt))
    .limit(limit);
}

export async function getExportHistoryById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  const results = await db.select().from(exportHistory).where(eq(exportHistory.id, id));
  return results[0] || null;
}

export async function deleteExportHistory(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  await db.delete(exportHistory).where(eq(exportHistory.id, id));
}

export async function getExportHistoryStats(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  
  const results = await db.select({
    exportType: exportHistory.exportType,
    count: sql<number>`COUNT(*)`,
  }).from(exportHistory)
    .where(eq(exportHistory.userId, userId))
    .groupBy(exportHistory.exportType);
  
  return results;
}


// ============================================
// Login History Functions
// ============================================

export async function logLoginEvent(data: {
  userId: number;
  username: string;
  authType: "local" | "manus";
  eventType: "login" | "logout" | "login_failed";
  ipAddress?: string;
  userAgent?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return;

  try {
    await db.insert(loginHistory).values({
      userId: data.userId,
      username: data.username,
      authType: data.authType,
      eventType: data.eventType,
      ipAddress: data.ipAddress || null,
      userAgent: data.userAgent || null,
    });
  } catch (error) {
    console.error("[LoginHistory] Failed to log event:", error);
  }
}

export async function getLoginHistory(params: {
  userId?: number;
  page: number;
  pageSize: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return { logs: [], total: 0, totalPages: 0 };

  const { userId, page, pageSize } = params;
  const offset = (page - 1) * pageSize;

  let query = db.select().from(loginHistory).orderBy(desc(loginHistory.createdAt));

  if (userId) {
    query = query.where(eq(loginHistory.userId, userId)) as any;
  }

  const logs = await query.limit(pageSize).offset(offset);

  // Get total count
  let countQuery = db.select({ count: sql<number>`count(*)` }).from(loginHistory);
  if (userId) {
    countQuery = countQuery.where(eq(loginHistory.userId, userId)) as any;
  }
  const countResult = await countQuery;
  const total = countResult[0]?.count || 0;

  return {
    logs,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getLoginStats(userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return { totalLogins: 0, lastLogin: null, failedAttempts: 0 };

  let query = db.select({
    eventType: loginHistory.eventType,
    count: sql<number>`COUNT(*)`,
    lastEvent: sql<Date>`MAX(createdAt)`,
  }).from(loginHistory).groupBy(loginHistory.eventType);

  if (userId) {
    query = query.where(eq(loginHistory.userId, userId)) as any;
  }

  const results = await query;

  const loginCount = results.find(r => r.eventType === "login")?.count || 0;
  const failedCount = results.find(r => r.eventType === "login_failed")?.count || 0;
  const logoutCount = results.find(r => r.eventType === "logout")?.count || 0;
  const lastLogin = results.find(r => r.eventType === "login")?.lastEvent || null;
  const total = loginCount + failedCount + logoutCount;

  return {
    total,
    totalLogins: loginCount,
    loginSuccess: loginCount,
    loginFailed: failedCount,
    logoutCount,
    lastLogin,
    failedAttempts: failedCount,
  };
}


// ============================================
// Measurement Standards Functions
// ============================================

export async function getMeasurementStandards() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return [];
  return db.select().from(productStationMachineStandards).orderBy(desc(productStationMachineStandards.createdAt));
}

export async function getMeasurementStandardById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return null;
  const results = await db.select().from(productStationMachineStandards).where(eq(productStationMachineStandards.id, id));
  return results[0] || null;
}

export async function getMeasurementStandardByProductWorkstation(
  productId: number, 
  workstationId: number, 
  machineId?: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return null;
  
  const conditions = [
    eq(productStationMachineStandards.productId, productId),
    eq(productStationMachineStandards.workstationId, workstationId)
  ];
  
  if (machineId) {
    conditions.push(eq(productStationMachineStandards.machineId, machineId));
  }
  
  const results = await db.select().from(productStationMachineStandards)
    .where(and(...conditions));
  return results[0] || null;
}

export async function createMeasurementStandard(data: {
  productId: number;
  workstationId: number;
  machineId?: number;
  usl: number;
  lsl: number;
  target?: number;
  sampleSize?: number;
  sampleFrequency?: number;
  samplingMethod?: string;
  appliedSpcRules?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  
  // Convert decimal values to integers (multiply by 10000 for precision)
  const insertData: InsertProductStationMachineStandard = {
    productId: data.productId,
    workstationId: data.workstationId,
    machineId: data.machineId || null,
    measurementName: "Default Measurement", // Default name
    usl: Math.round(data.usl * 10000),
    lsl: Math.round(data.lsl * 10000),
    target: data.target ? Math.round(data.target * 10000) : null,
    sampleSize: data.sampleSize || 5,
    sampleFrequency: data.sampleFrequency || 60, // minutes
    samplingMethod: data.samplingMethod || "random",
    appliedSpcRules: data.appliedSpcRules || null,
    createdBy: 1, // Default to admin
  };
  
  const result = await db.insert(productStationMachineStandards).values(insertData).returning({ id: productStationMachineStandards.id });
  return Number(result[0].id);
}

export async function updateMeasurementStandard(id: number, data: Partial<{
  productId: number;
  workstationId: number;
  machineId: number;
  usl: number;
  lsl: number;
  target: number;
  sampleSize: number;
  sampleFrequency: number;
  samplingMethod: string;
  appliedSpcRules: string;
}>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  
  const updateData: Record<string, unknown> = {};
  
  if (data.productId !== undefined) updateData.productId = data.productId;
  if (data.workstationId !== undefined) updateData.workstationId = data.workstationId;
  if (data.machineId !== undefined) updateData.machineId = data.machineId;
  if (data.usl !== undefined) updateData.usl = Math.round(data.usl * 10000);
  if (data.lsl !== undefined) updateData.lsl = Math.round(data.lsl * 10000);
  if (data.target !== undefined) updateData.target = Math.round(data.target * 10000);
  if (data.sampleSize !== undefined) updateData.sampleSize = data.sampleSize;
  if (data.sampleFrequency !== undefined) updateData.sampleFrequency = data.sampleFrequency;
  if (data.samplingMethod !== undefined) updateData.samplingMethod = data.samplingMethod;
  if (data.appliedSpcRules !== undefined) updateData.appliedSpcRules = data.appliedSpcRules;
  
  await db.update(productStationMachineStandards).set(updateData).where(eq(productStationMachineStandards.id, id));
}

export async function deleteMeasurementStandard(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  await db.delete(productStationMachineStandards).where(eq(productStationMachineStandards.id, id));
}


// ==================== Custom Validation Rules ====================

export async function getCustomValidationRules() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return [];
  return await db.select().from(customValidationRules).orderBy(asc(customValidationRules.priority));
}

export async function getCustomValidationRuleById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return null;
  const result = await db.select().from(customValidationRules).where(eq(customValidationRules.id, id)).limit(1);
  return result[0] || null;
}

export async function getCustomValidationRulesByProduct(productId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return [];
  return await db.select().from(customValidationRules)
    .where(
      or(
        eq(customValidationRules.productId, productId),
        sql`${customValidationRules.productId} IS NULL`
      )
    )
    .orderBy(asc(customValidationRules.priority));
}

export async function getActiveCustomValidationRules() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return [];
  return await db.select().from(customValidationRules)
    .where(eq(customValidationRules.isActive, 1))
    .orderBy(asc(customValidationRules.priority));
}

export async function createCustomValidationRule(data: Omit<InsertCustomValidationRule, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  const result = await db.insert(customValidationRules).values(data).returning({ id: customValidationRules.id });
  return result[0].id;
}

export async function updateCustomValidationRule(id: number, data: Partial<InsertCustomValidationRule>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  await db.update(customValidationRules).set(data).where(eq(customValidationRules.id, id));
}

export async function deleteCustomValidationRule(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  await db.delete(customValidationRules).where(eq(customValidationRules.id, id));
}

export async function toggleCustomValidationRule(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  const rule = await getCustomValidationRuleById(id);
  if (rule) {
    await db.update(customValidationRules)
      .set({ isActive: rule.isActive === 1 ? 0 : 1 })
      .where(eq(customValidationRules.id, id));
  }
}

// ==================== Validation Rule Logs ====================

export async function createValidationRuleLog(data: Omit<InsertValidationRuleLog, "id" | "executedAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  const result = await db.insert(validationRuleLogs).values(data).returning({ id: validationRuleLogs.id });
  return result[0].id;
}

export async function getValidationRuleLogs(ruleId?: number, limit: number = 100) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return [];
  
  if (ruleId) {
    return await db.select().from(validationRuleLogs)
      .where(eq(validationRuleLogs.ruleId, ruleId))
      .orderBy(desc(validationRuleLogs.executedAt))
      .limit(limit);
  }
  
  return await db.select().from(validationRuleLogs)
    .orderBy(desc(validationRuleLogs.executedAt))
    .limit(limit);
}


// ==================== Validation Rule Stats for Dashboard ====================

export async function getValidationViolationsByDay(days: number = 7) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return [];
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const logs = await db.select({
    executedAt: validationRuleLogs.executedAt,
    passed: validationRuleLogs.passed,
  }).from(validationRuleLogs)
    .where(gte(validationRuleLogs.executedAt, startDate))
    .orderBy(asc(validationRuleLogs.executedAt));
  
  // Group by day
  const dailyStats: { date: string; violations: number; total: number }[] = [];
  const dateMap = new Map<string, { violations: number; total: number }>();
  
  for (const log of logs) {
    const dateStr = new Date(log.executedAt).toISOString().split('T')[0];
    const existing = dateMap.get(dateStr) || { violations: 0, total: 0 };
    existing.total++;
    if (log.passed === 0) {
      existing.violations++;
    }
    dateMap.set(dateStr, existing);
  }
  
  // Fill in missing days with 0
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const stats = dateMap.get(dateStr) || { violations: 0, total: 0 };
    dailyStats.push({
      date: dateStr,
      violations: stats.violations,
      total: stats.total,
    });
  }
  
  return dailyStats;
}

export async function getRecentViolations(limit: number = 5) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) return [];
  
  return await db.select({
    id: validationRuleLogs.id,
    ruleId: validationRuleLogs.ruleId,
    violationDetails: validationRuleLogs.violationDetails,
    executedAt: validationRuleLogs.executedAt,
    ruleName: customValidationRules.name,
    severity: customValidationRules.severity,
  }).from(validationRuleLogs)
    .leftJoin(customValidationRules, eq(validationRuleLogs.ruleId, customValidationRules.id))
    .where(eq(validationRuleLogs.passed, 0))
    .orderBy(desc(validationRuleLogs.executedAt))
    .limit(limit);
}
