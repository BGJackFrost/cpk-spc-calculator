import { eq, and, desc, sql, gte, lte, asc, or, lt, gt } from "drizzle-orm";
import { 
  CursorPaginationInput, 
  CursorPaginationResult, 
  normalizePaginationInput, 
  buildPaginationResult, 
  encodeCursor,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE 
} from "../shared/pagination";
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
  jigs,
  InsertJig,
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
  InsertValidationRuleLog,
  licenseNotificationLogs,
  InsertLicenseNotificationLog
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: mysql.Pool | null = null;
let _connectionRetries = 0;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// Connection pool configuration for better stability
const poolConfig = {
  connectionLimit: 10,
  waitForConnections: true,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  connectTimeout: 30000,
  idleTimeout: 60000,
};

async function createConnectionWithRetry(): Promise<mysql.Pool | null> {
  if (!process.env.DATABASE_URL) {
    console.warn("[Database] DATABASE_URL not configured");
    return null;
  }

  while (_connectionRetries < MAX_RETRIES) {
    try {
      const pool = mysql.createPool({
        uri: process.env.DATABASE_URL,
        ...poolConfig,
      });
      
      // Test connection
      const connection = await pool.getConnection();
      await connection.ping();
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
      const connection = await _pool.getConnection();
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

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(users);
}

export async function updateUserRole(userId: number, role: "user" | "manager" | "admin") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(users).set({ role }).where(eq(users.id, userId));
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

// Lấy báo cáo SPC theo khoảng thời gian
export async function getSpcAnalysisReport(startDate: Date, endDate: Date, productionLineId?: number) {
  const db = await getDb();
  if (!db) return [];
  
  let query = db.select().from(spcAnalysisHistory)
    .where(
      and(
        gte(spcAnalysisHistory.createdAt, startDate),
        lte(spcAnalysisHistory.createdAt, endDate)
      )
    )
    .orderBy(asc(spcAnalysisHistory.createdAt))
    .limit(10000); // Safety limit to prevent unbounded queries
  
  return await query;
}

// Lấy thống kê CPK theo ngày
export async function getCpkTrendByDay(days: number = 30) {
  const db = await getDb();
  if (!db) return [];
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const results = await db.select().from(spcAnalysisHistory)
    .where(gte(spcAnalysisHistory.createdAt, startDate))
    .orderBy(asc(spcAnalysisHistory.createdAt))
    .limit(10000); // Safety limit to prevent unbounded queries
  
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
  
  const result = await db.insert(productionLines).values(data);
  return result[0].insertId;
}

export async function getProductionLines() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(productionLines).where(eq(productionLines.isActive, 1));
}

export async function getProductionLineById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(productionLines).where(eq(productionLines.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateProductionLine(id: number, data: Partial<InsertProductionLine>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(productionLines).set(data).where(eq(productionLines.id, id));
}

export async function deleteProductionLine(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(productionLines).set({ isActive: 0 }).where(eq(productionLines.id, id));
}

// Workstation operations
export async function createWorkstation(data: InsertWorkstation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(workstations).values(data);
  return result[0].insertId;
}

export async function getWorkstationsByLine(productionLineId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(workstations)
    .where(and(eq(workstations.productionLineId, productionLineId), eq(workstations.isActive, 1)))
    .orderBy(workstations.sequenceOrder);
}

export async function updateWorkstation(id: number, data: Partial<InsertWorkstation>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(workstations).set(data).where(eq(workstations.id, id));
}

export async function deleteWorkstation(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(workstations).set({ isActive: 0 }).where(eq(workstations.id, id));
}

// Machine operations
export async function createMachine(data: InsertMachine) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(machines).values(data);
  return result[0].insertId;
}

export async function getMachinesByWorkstation(workstationId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(machines)
    .where(and(eq(machines.workstationId, workstationId), eq(machines.isActive, 1)));
}

export async function updateMachine(id: number, data: Partial<InsertMachine>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(machines).set(data).where(eq(machines.id, id));
}

export async function deleteMachine(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(machines).set({ isActive: 0 }).where(eq(machines.id, id));
}

// SPC Rules Config operations
export async function getSpcRulesConfig(mappingId?: number) {
  const db = await getDb();
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
  
  const existing = await getSpcRulesConfig(data.mappingId ?? undefined);
  if (existing) {
    await db.update(spcRulesConfig).set(data).where(eq(spcRulesConfig.id, existing.id));
    return existing.id;
  } else {
    const result = await db.insert(spcRulesConfig).values(data as InsertSpcRulesConfig);
    return result[0].insertId;
  }
}

// Sampling Config operations
export async function getSamplingConfigs() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(samplingConfigs).where(eq(samplingConfigs.isActive, 1));
}

export async function getSamplingConfigById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(samplingConfigs).where(eq(samplingConfigs.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createSamplingConfig(data: InsertSamplingConfig) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(samplingConfigs).values(data);
  return result[0].insertId;
}

export async function updateSamplingConfig(id: number, data: Partial<InsertSamplingConfig>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(samplingConfigs).set(data).where(eq(samplingConfigs.id, id));
}

export async function deleteSamplingConfig(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(samplingConfigs).set({ isActive: 0 }).where(eq(samplingConfigs.id, id));
}

// Dashboard Config operations
export async function getDashboardConfig(userId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(dashboardConfigs)
    .where(eq(dashboardConfigs.userId, userId))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function upsertDashboardConfig(data: InsertDashboardConfig) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getDashboardConfig(data.userId);
  if (existing) {
    await db.update(dashboardConfigs).set(data).where(eq(dashboardConfigs.id, existing.id));
    return existing.id;
  } else {
    const result = await db.insert(dashboardConfigs).values(data);
    return result[0].insertId;
  }
}

// Dashboard Line Selection operations
export async function getDashboardLineSelections(dashboardConfigId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(dashboardLineSelections)
    .where(eq(dashboardLineSelections.dashboardConfigId, dashboardConfigId))
    .orderBy(dashboardLineSelections.displayOrder);
}

export async function setDashboardLineSelections(dashboardConfigId: number, selections: InsertDashboardLineSelection[]) {
  const db = await getDb();
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
  
  const result = await db.insert(spcRuleViolations).values(data);
  return result[0].insertId;
}

export async function getSpcRuleViolations(analysisId: number) {
  const db = await getDb();
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
  
  const result = await db.insert(products).values(data);
  return result[0].insertId;
}

export async function getProducts() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(products).where(eq(products.isActive, 1));
}

export async function getProductById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateProduct(id: number, data: Partial<InsertProduct>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(products).set(data).where(eq(products.id, id));
}

export async function deleteProduct(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(products).set({ isActive: 0 }).where(eq(products.id, id));
}

// Product Specification operations
export async function createProductSpecification(data: InsertProductSpecification) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(productSpecifications).values(data);
  return result[0].insertId;
}

export async function getProductSpecifications(productId?: number) {
  const db = await getDb();
  if (!db) return [];
  
  if (productId) {
    return await db.select().from(productSpecifications)
      .where(and(eq(productSpecifications.productId, productId), eq(productSpecifications.isActive, 1)));
  }
  return await db.select().from(productSpecifications).where(eq(productSpecifications.isActive, 1));
}

export async function getProductSpecificationById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(productSpecifications).where(eq(productSpecifications.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateProductSpecification(id: number, data: Partial<InsertProductSpecification>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(productSpecifications).set(data).where(eq(productSpecifications.id, id));
}

export async function deleteProductSpecification(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(productSpecifications).set({ isActive: 0 }).where(eq(productSpecifications.id, id));
}

// Process Config operations
export async function createProcessConfig(data: InsertProcessConfig) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(processConfigs).values(data);
  return result[0].insertId;
}

export async function getProcessConfigs(productionLineId?: number, productId?: number) {
  const db = await getDb();
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
  
  await db.update(processConfigs).set(data).where(eq(processConfigs.id, id));
}

export async function deleteProcessConfig(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(processConfigs).set({ isActive: 0 }).where(eq(processConfigs.id, id));
}

// Production Line Product operations
export async function createProductionLineProduct(data: InsertProductionLineProduct) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(productionLineProducts).values(data);
  return result[0].insertId;
}

export async function getProductionLineProducts(productionLineId?: number) {
  const db = await getDb();
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
  
  await db.update(productionLineProducts).set(data).where(eq(productionLineProducts.id, id));
}

export async function deleteProductionLineProduct(id: number) {
  const db = await getDb();
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
  if (!db) return [];
  return db.select().from(spcSamplingPlans).orderBy(spcSamplingPlans.createdAt);
}

export async function getSpcSamplingPlanById(id: number) {
  const db = await getDb();
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
  if (!db) return;
  await db.delete(spcSamplingPlans).where(eq(spcSamplingPlans.id, id));
}

// ============ User Line Assignments ============
export async function getUserLineAssignments(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(userLineAssignments).where(eq(userLineAssignments.userId, userId)).orderBy(userLineAssignments.displayOrder);
}

export async function createUserLineAssignment(userId: number, productionLineId: number, displayOrder: number = 0) {
  const db = await getDb();
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
  if (!db) return;
  await db.delete(userLineAssignments).where(eq(userLineAssignments.id, id));
}

export async function updateUserLineAssignmentOrder(id: number, displayOrder: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(userLineAssignments).set({ displayOrder }).where(eq(userLineAssignments.id, id));
}

// ============ Email Notification Settings ============
export async function getEmailNotificationSettings(userId: number) {
  const db = await getDb();
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
  if (!db) return [];
  return await db.select().from(permissions).orderBy(permissions.module);
}

export async function createPermission(data: InsertPermission) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(permissions).values(data);
  return result[0].insertId;
}

export async function deletePermission(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(permissions).where(eq(permissions.id, id));
}

export async function getRolePermissions() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(rolePermissions);
}

export async function updateRolePermissions(role: string, permissionIds: number[]) {
  const db = await getDb();
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
  if (!db) return [];
  return await db.select().from(userPermissions).where(eq(userPermissions.userId, userId));
}

export async function checkUserPermission(userId: number, userRole: string, permissionCode: string): Promise<boolean> {
  const db = await getDb();
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
  if (!db) return [];
  return await db.select().from(workstations).orderBy(workstations.productionLineId, workstations.sequenceOrder);
}

// Get all machines
export async function getAllMachines() {
  const db = await getDb();
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
  if (!db) return [];
  return db.select().from(processTemplates).orderBy(processTemplates.name);
}

export async function getProcessTemplateById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(processTemplates).where(eq(processTemplates.id, id)).limit(1);
  return result[0];
}

export async function createProcessTemplate(data: { name: string; code: string; description?: string; version?: string; createdBy: number }) {
  const db = await getDb();
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
  await db.update(processTemplates).set(data).where(eq(processTemplates.id, id));
}

export async function deleteProcessTemplate(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(processTemplates).where(eq(processTemplates.id, id));
}

// Process Steps
export async function getProcessSteps(templateId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(processSteps).where(eq(processSteps.processTemplateId, templateId)).orderBy(processSteps.sequenceOrder);
}

export async function createProcessStep(data: { processTemplateId: number; name: string; code: string; description?: string; sequenceOrder: number; standardTime?: number; isRequired?: number }) {
  const db = await getDb();
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
  await db.update(processSteps).set(data).where(eq(processSteps.id, id));
}

export async function deleteProcessStep(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(processSteps).where(eq(processSteps.id, id));
}

export async function moveProcessStep(stepId: number, direction: "up" | "down") {
  const db = await getDb();
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
  if (!db) return [];
  return db.select().from(processStepMachines).where(eq(processStepMachines.processStepId, stepId));
}

export async function createProcessStepMachine(data: { processStepId: number; machineName: string; machineCode?: string; isRequired?: number; quantity?: number }) {
  const db = await getDb();
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
  await db.delete(processStepMachines).where(eq(processStepMachines.id, id));
}

// Production Line Machines
export async function getProductionLineMachines(lineId: number) {
  const db = await getDb();
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
  await db.insert(productionLineMachines).values({ productionLineId: lineId, machineId, assignedBy, isActive: 1 });
}

export async function removeProductionLineMachine(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(productionLineMachines).where(eq(productionLineMachines.id, id));
}

// ============ SPC Defect Categories ============
export async function getSpcDefectCategories() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(spcDefectCategories).where(eq(spcDefectCategories.isActive, 1));
}

export async function getSpcDefectCategoryById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(spcDefectCategories).where(eq(spcDefectCategories.id, id)).limit(1);
  return result[0] || null;
}

export async function createSpcDefectCategory(data: InsertSpcDefectCategory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(spcDefectCategories).values(data);
  return result[0].insertId;
}

export async function updateSpcDefectCategory(id: number, data: Partial<InsertSpcDefectCategory>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(spcDefectCategories).set(data).where(eq(spcDefectCategories.id, id));
}

export async function deleteSpcDefectCategory(id: number) {
  const db = await getDb();
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
  if (!db) return null;
  const result = await db.select().from(spcDefectRecords).where(eq(spcDefectRecords.id, id)).limit(1);
  return result[0] || null;
}

export async function createSpcDefectRecord(data: InsertSpcDefectRecord) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(spcDefectRecords).values(data);
  return result[0].insertId;
}

export async function updateSpcDefectRecord(id: number, data: Partial<InsertSpcDefectRecord>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(spcDefectRecords).set(data).where(eq(spcDefectRecords.id, id));
}

export async function deleteSpcDefectRecord(id: number) {
  const db = await getDb();
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
  if (!db) return [];
  return await db.select().from(machineTypes).where(eq(machineTypes.isActive, 1));
}

export async function getMachineTypeById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(machineTypes).where(eq(machineTypes.id, id));
  return result[0] || null;
}

export async function createMachineType(data: Omit<InsertMachineType, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.insert(machineTypes).values(data);
  return result[0].insertId;
}

export async function updateMachineType(id: number, data: Partial<InsertMachineType>) {
  const db = await getDb();
  if (!db) return;
  await db.update(machineTypes).set(data).where(eq(machineTypes.id, id));
}

export async function deleteMachineType(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(machineTypes).set({ isActive: 0 }).where(eq(machineTypes.id, id));
}

// ============ Fixtures CRUD ============
export async function getFixtures(machineId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (machineId) {
    return await db.select().from(fixtures)
      .where(and(eq(fixtures.machineId, machineId), eq(fixtures.isActive, 1)));
  }
  return await db.select().from(fixtures).where(eq(fixtures.isActive, 1));
}

export async function getFixtureById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(fixtures).where(eq(fixtures.id, id));
  return result[0] || null;
}

export async function createFixture(data: Omit<InsertFixture, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.insert(fixtures).values(data);
  return result[0].insertId;
}

export async function updateFixture(id: number, data: Partial<InsertFixture>) {
  const db = await getDb();
  if (!db) return;
  await db.update(fixtures).set(data).where(eq(fixtures.id, id));
}

export async function deleteFixture(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(fixtures).set({ isActive: 0 }).where(eq(fixtures.id, id));
}

// Lấy fixtures theo máy với thông tin máy
export async function getFixturesWithMachineInfo() {
  const db = await getDb();
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

// ============ Jigs CRUD ============
export async function getJigs(machineId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (machineId) {
    return await db.select().from(jigs)
      .where(and(eq(jigs.machineId, machineId), eq(jigs.isActive, 1)));
  }
  return await db.select().from(jigs).where(eq(jigs.isActive, 1));
}

export async function getJigById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(jigs).where(eq(jigs.id, id));
  return result[0] || null;
}

export async function createJig(data: Omit<InsertJig, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.insert(jigs).values(data);
  return result[0].insertId;
}

export async function updateJig(id: number, data: Partial<InsertJig>) {
  const db = await getDb();
  if (!db) return;
  await db.update(jigs).set(data).where(eq(jigs.id, id));
}

export async function deleteJig(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(jigs).set({ isActive: 0 }).where(eq(jigs.id, id));
}

// Lấy jigs theo máy với thông tin máy
export async function getJigsWithMachineInfo() {
  const db = await getDb();
  if (!db) return [];
  
  const allJigs = await db.select().from(jigs).where(eq(jigs.isActive, 1));
  const allMachines = await getAllMachines();
  
  return allJigs.map(jig => {
    const machine = allMachines.find(m => m.id === jig.machineId);
    return {
      ...jig,
      machineName: machine?.name || "Unknown",
      machineCode: machine?.code || "Unknown",
    };
  });
}

// ==================== SPC Realtime Data ====================

export async function saveSpcRealtimeData(data: Omit<InsertSpcRealtimeData, "id" | "createdAt">) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.insert(spcRealtimeData).values(data);
  return result[0].insertId;
}

export async function saveSpcRealtimeDataBatch(dataList: Omit<InsertSpcRealtimeData, "id" | "createdAt">[]) {
  const db = await getDb();
  if (!db) return 0;
  if (dataList.length === 0) return 0;
  const result = await db.insert(spcRealtimeData).values(dataList);
  return result[0].affectedRows;
}

export async function getSpcRealtimeDataByPlan(planId: number, limit: number = 100) {
  const db = await getDb();
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
  if (!db) return;
  await db.delete(spcRealtimeData).where(eq(spcRealtimeData.planId, planId));
}

// ==================== SPC Summary Stats ====================

export async function saveSpcSummaryStats(data: Omit<InsertSpcSummaryStats, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.insert(spcSummaryStats).values(data);
  return result[0].insertId;
}

export async function getSpcSummaryStatsByPlan(planId: number, periodType?: string) {
  const db = await getDb();
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
    });
    return result[0].insertId;
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
  if (!db) return [];
  return db.select().from(spcRules).orderBy(asc(spcRules.sortOrder));
}

export async function getSpcRuleById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(spcRules).where(eq(spcRules.id, id));
  return result[0];
}

export async function getSpcRuleByCode(code: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(spcRules).where(eq(spcRules.code, code));
  return result[0];
}

export async function getEnabledSpcRules() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(spcRules).where(eq(spcRules.isEnabled, 1)).orderBy(asc(spcRules.sortOrder));
}

export async function createSpcRule(data: Omit<InsertSpcRule, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(spcRules).values(data);
  return result[0].insertId;
}

export async function updateSpcRule(id: number, data: Partial<InsertSpcRule>) {
  const db = await getDb();
  if (!db) return;
  await db.update(spcRules).set(data).where(eq(spcRules.id, id));
}

export async function deleteSpcRule(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(spcRules).where(eq(spcRules.id, id));
}

export async function toggleSpcRule(id: number, isEnabled: boolean) {
  const db = await getDb();
  if (!db) return;
  await db.update(spcRules).set({ isEnabled: isEnabled ? 1 : 0 }).where(eq(spcRules.id, id));
}

// ==================== CA Rules ====================

export async function getCaRules() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(caRules).orderBy(asc(caRules.sortOrder));
}

export async function getCaRuleById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(caRules).where(eq(caRules.id, id));
  return result[0];
}

export async function getCaRuleByCode(code: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(caRules).where(eq(caRules.code, code));
  return result[0];
}

export async function getEnabledCaRules() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(caRules).where(eq(caRules.isEnabled, 1)).orderBy(asc(caRules.sortOrder));
}

export async function createCaRule(data: Omit<InsertCaRule, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(caRules).values(data);
  return result[0].insertId;
}

export async function updateCaRule(id: number, data: Partial<InsertCaRule>) {
  const db = await getDb();
  if (!db) return;
  await db.update(caRules).set(data).where(eq(caRules.id, id));
}

export async function deleteCaRule(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(caRules).where(eq(caRules.id, id));
}

export async function toggleCaRule(id: number, isEnabled: boolean) {
  const db = await getDb();
  if (!db) return;
  await db.update(caRules).set({ isEnabled: isEnabled ? 1 : 0 }).where(eq(caRules.id, id));
}

// ==================== CPK Rules ====================

export async function getCpkRules() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(cpkRules).orderBy(asc(cpkRules.sortOrder));
}

export async function getCpkRuleById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(cpkRules).where(eq(cpkRules.id, id));
  return result[0];
}

export async function getCpkRuleByCode(code: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(cpkRules).where(eq(cpkRules.code, code));
  return result[0];
}

export async function getEnabledCpkRules() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(cpkRules).where(eq(cpkRules.isEnabled, 1)).orderBy(asc(cpkRules.sortOrder));
}

export async function createCpkRule(data: Omit<InsertCpkRule, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(cpkRules).values(data);
  return result[0].insertId;
}

export async function updateCpkRule(id: number, data: Partial<InsertCpkRule>) {
  const db = await getDb();
  if (!db) return;
  await db.update(cpkRules).set(data).where(eq(cpkRules.id, id));
}

export async function deleteCpkRule(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(cpkRules).where(eq(cpkRules.id, id));
}

export async function toggleCpkRule(id: number, isEnabled: boolean) {
  const db = await getDb();
  if (!db) return;
  await db.update(cpkRules).set({ isEnabled: isEnabled ? 1 : 0 }).where(eq(cpkRules.id, id));
}

// ==================== Seed Default Rules ====================

export async function seedDefaultSpcRules() {
  const db = await getDb();
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
  if (!db) return [];
  return await db.select().from(mappingTemplates).where(eq(mappingTemplates.isActive, 1));
}

export async function getMappingTemplateById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(mappingTemplates).where(eq(mappingTemplates.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createMappingTemplate(data: InsertMappingTemplate) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(mappingTemplates).values(data);
  return result[0].insertId;
}

export async function updateMappingTemplate(id: number, data: Partial<InsertMappingTemplate>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(mappingTemplates).set(data).where(eq(mappingTemplates.id, id));
}

export async function deleteMappingTemplate(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(mappingTemplates).set({ isActive: 0 }).where(eq(mappingTemplates.id, id));
}

export async function seedDefaultMappingTemplates() {
  const db = await getDb();
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
  if (!db) return [];
  return db.select().from(licenses).orderBy(desc(licenses.createdAt));
}

export async function getActiveLicense() {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(licenses).where(eq(licenses.isActive, 1)).limit(1);
  return result[0] || null;
}

export async function getLicenseByKey(licenseKey: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(licenses).where(eq(licenses.licenseKey, licenseKey)).limit(1);
  return result[0] || null;
}

export async function createLicense(data: InsertLicense) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(licenses).values(data);
}

export async function activateLicense(licenseKey: string, userId: number) {
  const db = await getDb();
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
  await db.update(licenses).set({ isActive: 0 }).where(eq(licenses.id, id));
}

export async function deleteLicense(id: number) {
  const db = await getDb();
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
  if (!db) return [];
  return await db.select().from(reportTemplates).orderBy(desc(reportTemplates.createdAt));
}

export async function getReportTemplateById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(reportTemplates).where(eq(reportTemplates.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getDefaultReportTemplate() {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(reportTemplates)
    .where(and(eq(reportTemplates.isDefault, 1), eq(reportTemplates.isActive, 1)))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createReportTemplate(data: Omit<InsertReportTemplate, 'id' | 'createdAt' | 'updatedAt'>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Nếu đây là template mặc định, bỏ mặc định của các template khác
  if (data.isDefault) {
    await db.update(reportTemplates).set({ isDefault: 0 }).where(eq(reportTemplates.isDefault, 1));
  }
  
  const result = await db.insert(reportTemplates).values(data);
  return result[0].insertId;
}

export async function updateReportTemplate(id: number, data: Partial<InsertReportTemplate>) {
  const db = await getDb();
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
  await db.delete(reportTemplates).where(eq(reportTemplates.id, id));
}


// ==================== Export History ====================

export async function createExportHistory(data: InsertExportHistory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(exportHistory).values(data);
  return result[0].insertId;
}

export async function getExportHistoryByUser(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(exportHistory)
    .where(eq(exportHistory.userId, userId))
    .orderBy(desc(exportHistory.createdAt))
    .limit(limit);
}

export async function getExportHistoryById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const results = await db.select().from(exportHistory).where(eq(exportHistory.id, id));
  return results[0] || null;
}

export async function deleteExportHistory(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(exportHistory).where(eq(exportHistory.id, id));
}

export async function getExportHistoryStats(userId: number) {
  const db = await getDb();
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
  if (!db) return [];
  return db.select().from(productStationMachineStandards).orderBy(desc(productStationMachineStandards.createdAt));
}

export async function getMeasurementStandardById(id: number) {
  const db = await getDb();
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
  
  const result = await db.insert(productStationMachineStandards).values(insertData);
  return Number(result[0].insertId);
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
  await db.delete(productStationMachineStandards).where(eq(productStationMachineStandards.id, id));
}


// ==================== Custom Validation Rules ====================

export async function getCustomValidationRules() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(customValidationRules).orderBy(asc(customValidationRules.priority));
}

export async function getCustomValidationRuleById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(customValidationRules).where(eq(customValidationRules.id, id)).limit(1);
  return result[0] || null;
}

export async function getCustomValidationRulesByProduct(productId: number) {
  const db = await getDb();
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
  if (!db) return [];
  return await db.select().from(customValidationRules)
    .where(eq(customValidationRules.isActive, 1))
    .orderBy(asc(customValidationRules.priority));
}

export async function createCustomValidationRule(data: Omit<InsertCustomValidationRule, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(customValidationRules).values(data);
  return result[0].insertId;
}

export async function updateCustomValidationRule(id: number, data: Partial<InsertCustomValidationRule>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(customValidationRules).set(data).where(eq(customValidationRules.id, id));
}

export async function deleteCustomValidationRule(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(customValidationRules).where(eq(customValidationRules.id, id));
}

export async function toggleCustomValidationRule(id: number) {
  const db = await getDb();
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
  const result = await db.insert(validationRuleLogs).values(data);
  return result[0].insertId;
}

export async function getValidationRuleLogs(ruleId?: number, limit: number = 100) {
  const db = await getDb();
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


// ============================================
// Cursor-based Pagination Functions
// ============================================

/**
 * Get users with cursor-based pagination
 */
export async function getUsersWithCursor(input: CursorPaginationInput): Promise<CursorPaginationResult<typeof users.$inferSelect>> {
  const db = await getDb();
  if (!db) return { items: [], nextCursor: null, prevCursor: null, hasMore: false };
  
  const { cursor, limit, direction } = normalizePaginationInput(input);
  
  let query = db.select().from(users);
  
  if (cursor) {
    if (direction === 'forward') {
      query = query.where(lt(users.id, cursor.id)) as any;
    } else {
      query = query.where(gt(users.id, cursor.id)) as any;
    }
  }
  
  const orderDirection = direction === 'forward' ? desc : asc;
  const items = await query.orderBy(orderDirection(users.id)).limit(limit + 1);
  
  // Get total count
  const countResult = await db.select({ count: sql<number>`count(*)` }).from(users);
  const totalCount = countResult[0]?.count || 0;
  
  return buildPaginationResult(items, limit, direction, totalCount);
}

/**
 * Get SPC analysis history with cursor-based pagination
 */
export async function getSpcAnalysisHistoryWithCursor(
  mappingId: number | null,
  input: CursorPaginationInput
): Promise<CursorPaginationResult<typeof spcAnalysisHistory.$inferSelect>> {
  const db = await getDb();
  if (!db) return { items: [], nextCursor: null, prevCursor: null, hasMore: false };
  
  const { cursor, limit, direction } = normalizePaginationInput(input);
  
  let conditions: any[] = [];
  
  if (mappingId) {
    conditions.push(eq(spcAnalysisHistory.mappingId, mappingId));
  }
  
  if (cursor) {
    if (cursor.createdAt) {
      const cursorDate = new Date(cursor.createdAt);
      if (direction === 'forward') {
        conditions.push(
          or(
            lt(spcAnalysisHistory.createdAt, cursorDate),
            and(
              eq(spcAnalysisHistory.createdAt, cursorDate),
              lt(spcAnalysisHistory.id, cursor.id)
            )
          )
        );
      } else {
        conditions.push(
          or(
            gt(spcAnalysisHistory.createdAt, cursorDate),
            and(
              eq(spcAnalysisHistory.createdAt, cursorDate),
              gt(spcAnalysisHistory.id, cursor.id)
            )
          )
        );
      }
    } else {
      if (direction === 'forward') {
        conditions.push(lt(spcAnalysisHistory.id, cursor.id));
      } else {
        conditions.push(gt(spcAnalysisHistory.id, cursor.id));
      }
    }
  }
  
  let query = db.select().from(spcAnalysisHistory);
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  const orderDirection = direction === 'forward' ? desc : asc;
  const items = await query
    .orderBy(orderDirection(spcAnalysisHistory.createdAt), orderDirection(spcAnalysisHistory.id))
    .limit(limit + 1);
  
  // Get total count
  let countQuery = db.select({ count: sql<number>`count(*)` }).from(spcAnalysisHistory);
  if (mappingId) {
    countQuery = countQuery.where(eq(spcAnalysisHistory.mappingId, mappingId)) as any;
  }
  const countResult = await countQuery;
  const totalCount = countResult[0]?.count || 0;
  
  return buildPaginationResult(items, limit, direction, totalCount);
}

/**
 * Get audit logs with cursor-based pagination
 */
export async function getAuditLogsWithCursor(
  params: {
    action?: string;
    module?: string;
    search?: string;
  },
  input: CursorPaginationInput
): Promise<CursorPaginationResult<typeof auditLogs.$inferSelect>> {
  const db = await getDb();
  if (!db) return { items: [], nextCursor: null, prevCursor: null, hasMore: false };
  
  const { cursor, limit, direction } = normalizePaginationInput(input);
  const { action, module, search } = params;
  
  let conditions: any[] = [];
  
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
  
  if (cursor) {
    if (cursor.createdAt) {
      const cursorDate = new Date(cursor.createdAt);
      if (direction === 'forward') {
        conditions.push(
          or(
            lt(auditLogs.createdAt, cursorDate),
            and(
              eq(auditLogs.createdAt, cursorDate),
              lt(auditLogs.id, cursor.id)
            )
          )
        );
      } else {
        conditions.push(
          or(
            gt(auditLogs.createdAt, cursorDate),
            and(
              eq(auditLogs.createdAt, cursorDate),
              gt(auditLogs.id, cursor.id)
            )
          )
        );
      }
    } else {
      if (direction === 'forward') {
        conditions.push(lt(auditLogs.id, cursor.id));
      } else {
        conditions.push(gt(auditLogs.id, cursor.id));
      }
    }
  }
  
  let query = db.select().from(auditLogs);
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  const orderDirection = direction === 'forward' ? desc : asc;
  const items = await query
    .orderBy(orderDirection(auditLogs.createdAt), orderDirection(auditLogs.id))
    .limit(limit + 1);
  
  // Get total count with filters
  let countQuery = db.select({ count: sql<number>`count(*)` }).from(auditLogs);
  const filterConditions = conditions.filter(c => c !== conditions[conditions.length - 1]); // Remove cursor condition
  if (filterConditions.length > 0) {
    countQuery = countQuery.where(and(...filterConditions)) as any;
  }
  const countResult = await countQuery;
  const totalCount = countResult[0]?.count || 0;
  
  return buildPaginationResult(items, limit, direction, totalCount);
}

/**
 * Get login history with cursor-based pagination
 */
export async function getLoginHistoryWithCursor(
  userId: number | null,
  input: CursorPaginationInput & {
    username?: string;
    eventType?: 'login' | 'logout' | 'login_failed';
    authType?: 'manus' | 'local';
    startDate?: string;
    endDate?: string;
  }
): Promise<CursorPaginationResult<typeof loginHistory.$inferSelect>> {
  const db = await getDb();
  if (!db) return { items: [], nextCursor: null, prevCursor: null, hasMore: false };
  
  const { cursor, limit, direction } = normalizePaginationInput(input);
  const { username, eventType, authType, startDate, endDate } = input;
  
  let conditions: any[] = [];
  
  if (userId) {
    conditions.push(eq(loginHistory.userId, userId));
  }
  
  // Filter by username (partial match)
  if (username) {
    conditions.push(like(loginHistory.username, `%${username}%`));
  }
  
  // Filter by event type
  if (eventType) {
    conditions.push(eq(loginHistory.eventType, eventType));
  }
  
  // Filter by auth type
  if (authType) {
    conditions.push(eq(loginHistory.authType, authType));
  }
  
  // Filter by date range
  if (startDate) {
    conditions.push(gte(loginHistory.createdAt, new Date(startDate)));
  }
  if (endDate) {
    const endDateTime = new Date(endDate);
    endDateTime.setHours(23, 59, 59, 999);
    conditions.push(lte(loginHistory.createdAt, endDateTime));
  }
  
  if (cursor) {
    if (cursor.createdAt) {
      const cursorDate = new Date(cursor.createdAt);
      if (direction === 'forward') {
        conditions.push(
          or(
            lt(loginHistory.createdAt, cursorDate),
            and(
              eq(loginHistory.createdAt, cursorDate),
              lt(loginHistory.id, cursor.id)
            )
          )
        );
      } else {
        conditions.push(
          or(
            gt(loginHistory.createdAt, cursorDate),
            and(
              eq(loginHistory.createdAt, cursorDate),
              gt(loginHistory.id, cursor.id)
            )
          )
        );
      }
    } else {
      if (direction === 'forward') {
        conditions.push(lt(loginHistory.id, cursor.id));
      } else {
        conditions.push(gt(loginHistory.id, cursor.id));
      }
    }
  }
  
  let query = db.select().from(loginHistory);
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  const orderDirection = direction === 'forward' ? desc : asc;
  const items = await query
    .orderBy(orderDirection(loginHistory.createdAt), orderDirection(loginHistory.id))
    .limit(limit + 1);
  
  // Get total count with same filters
  let countConditions: any[] = [];
  if (userId) countConditions.push(eq(loginHistory.userId, userId));
  if (username) countConditions.push(like(loginHistory.username, `%${username}%`));
  if (eventType) countConditions.push(eq(loginHistory.eventType, eventType));
  if (authType) countConditions.push(eq(loginHistory.authType, authType));
  if (startDate) countConditions.push(gte(loginHistory.createdAt, new Date(startDate)));
  if (endDate) {
    const endDateTime = new Date(endDate);
    endDateTime.setHours(23, 59, 59, 999);
    countConditions.push(lte(loginHistory.createdAt, endDateTime));
  }
  
  let countQuery = db.select({ count: sql<number>`count(*)` }).from(loginHistory);
  if (countConditions.length > 0) {
    countQuery = countQuery.where(and(...countConditions)) as any;
  }
  const countResult = await countQuery;
  const totalCount = countResult[0]?.count || 0;
  
  return buildPaginationResult(items, limit, direction, totalCount);
}

/**
 * Get licenses with cursor-based pagination
 */
export async function getLicensesWithCursor(
  params: {
    status?: string;
    customerId?: number;
    search?: string;
    licenseType?: string;
    currency?: string;
    priceFilter?: 'all' | 'free' | 'paid' | 'high';
  },
  input: CursorPaginationInput
): Promise<CursorPaginationResult<typeof licenses.$inferSelect>> {
  const db = await getDb();
  if (!db) return { items: [], nextCursor: null, prevCursor: null, hasMore: false };
  
  const { cursor, limit, direction } = normalizePaginationInput(input);
  const { status, customerId, search, licenseType, currency, priceFilter } = params;
  
  let conditions: any[] = [];
  let filterConditions: any[] = []; // For counting without cursor
  
  if (status) {
    const statusCondition = status === 'active' 
      ? eq(licenses.isActive, 1)
      : status === 'pending'
        ? and(eq(licenses.isActive, 0), sql`${licenses.licenseStatus} != 'revoked'`)
        : status === 'expired'
          ? sql`${licenses.expiresAt} < NOW()`
          : eq(licenses.licenseStatus, status as any);
    conditions.push(statusCondition);
    filterConditions.push(statusCondition);
  }
  if (customerId) {
    conditions.push(eq(licenses.customerId, customerId));
    filterConditions.push(eq(licenses.customerId, customerId));
  }
  if (search) {
    const searchCondition = sql`(${licenses.licenseKey} LIKE ${`%${search}%`} OR ${licenses.companyName} LIKE ${`%${search}%`} OR ${licenses.contactEmail} LIKE ${`%${search}%`})`;
    conditions.push(searchCondition);
    filterConditions.push(searchCondition);
  }
  if (licenseType) {
    conditions.push(eq(licenses.licenseType, licenseType as any));
    filterConditions.push(eq(licenses.licenseType, licenseType as any));
  }
  if (currency) {
    conditions.push(eq(licenses.currency, currency));
    filterConditions.push(eq(licenses.currency, currency));
  }
  if (priceFilter && priceFilter !== 'all') {
    const priceCondition = priceFilter === 'free'
      ? sql`(${licenses.price} IS NULL OR ${licenses.price} = 0)`
      : priceFilter === 'paid'
        ? sql`${licenses.price} > 0`
        : sql`${licenses.price} >= 10000000`; // high >= 10M
    conditions.push(priceCondition);
    filterConditions.push(priceCondition);
  }
  
  if (cursor) {
    if (direction === 'forward') {
      conditions.push(lt(licenses.id, cursor.id));
    } else {
      conditions.push(gt(licenses.id, cursor.id));
    }
  }
  
  let query = db.select().from(licenses);
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  const orderDirection = direction === 'forward' ? desc : asc;
  const items = await query
    .orderBy(orderDirection(licenses.createdAt), orderDirection(licenses.id))
    .limit(limit + 1);
  
  // Get total count with filters (excluding cursor condition)
  let countQuery = db.select({ count: sql<number>`count(*)` }).from(licenses);
  if (filterConditions.length > 0) {
    countQuery = countQuery.where(and(...filterConditions)) as any;
  }
  const countResult = await countQuery;
  const totalCount = countResult[0]?.count || 0;
  
  return buildPaginationResult(items, limit, direction, totalCount);
}


// ============ License Notification Logs ============
export async function getLicenseNotificationLogs(filters?: {
  licenseId?: number;
  notificationType?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return { logs: [], total: 0 };
  
  const conditions: any[] = [];
  
  if (filters?.licenseId) {
    conditions.push(eq(licenseNotificationLogs.licenseId, filters.licenseId));
  }
  if (filters?.notificationType) {
    conditions.push(eq(licenseNotificationLogs.notificationType, filters.notificationType as any));
  }
  if (filters?.status) {
    conditions.push(eq(licenseNotificationLogs.status, filters.status as any));
  }
  if (filters?.startDate) {
    conditions.push(gte(licenseNotificationLogs.createdAt, filters.startDate));
  }
  if (filters?.endDate) {
    conditions.push(lte(licenseNotificationLogs.createdAt, filters.endDate));
  }
  
  let query = db.select().from(licenseNotificationLogs);
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  const logs = await query
    .orderBy(desc(licenseNotificationLogs.createdAt))
    .limit(filters?.limit || 50)
    .offset(filters?.offset || 0);
  
  // Get total count
  let countQuery = db.select({ count: sql<number>`count(*)` }).from(licenseNotificationLogs);
  if (conditions.length > 0) {
    countQuery = countQuery.where(and(...conditions)) as any;
  }
  const countResult = await countQuery;
  const total = countResult[0]?.count || 0;
  
  return { logs, total };
}

export async function getLicenseNotificationStats(days: number = 30) {
  const db = await getDb();
  if (!db) return { byType: [], byStatus: [], byDay: [] };
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  // Stats by notification type
  const byType = await db.select({
    notificationType: licenseNotificationLogs.notificationType,
    count: sql<number>`count(*)`,
  })
    .from(licenseNotificationLogs)
    .where(gte(licenseNotificationLogs.createdAt, startDate))
    .groupBy(licenseNotificationLogs.notificationType);
  
  // Stats by status
  const byStatus = await db.select({
    status: licenseNotificationLogs.status,
    count: sql<number>`count(*)`,
  })
    .from(licenseNotificationLogs)
    .where(gte(licenseNotificationLogs.createdAt, startDate))
    .groupBy(licenseNotificationLogs.status);
  
  // Stats by day
  const byDay = await db.select({
    date: sql<string>`DATE(created_at)`.as('date'),
    sent: sql<number>`SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END)`.as('sent'),
    failed: sql<number>`SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END)`.as('failed'),
    pending: sql<number>`SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END)`.as('pending'),
  })
    .from(licenseNotificationLogs)
    .where(gte(licenseNotificationLogs.createdAt, startDate))
    .groupBy(sql`DATE(created_at)`)
    .orderBy(sql`DATE(created_at)`);
  
  return { byType, byStatus, byDay };
}

export async function createLicenseNotificationLog(data: Omit<InsertLicenseNotificationLog, "id" | "createdAt">) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.insert(licenseNotificationLogs).values(data);
  return result[0].insertId;
}

export async function updateLicenseNotificationLog(id: number, data: Partial<InsertLicenseNotificationLog>) {
  const db = await getDb();
  if (!db) return;
  await db.update(licenseNotificationLogs).set(data).where(eq(licenseNotificationLogs.id, id));
}


export async function getNotificationLogById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [log] = await db.select().from(licenseNotificationLogs).where(eq(licenseNotificationLogs.id, id));
  return log || null;
}

export async function getFailedNotificationLogs(limit: number = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select()
    .from(licenseNotificationLogs)
    .where(eq(licenseNotificationLogs.status, "failed"))
    .orderBy(desc(licenseNotificationLogs.createdAt))
    .limit(limit);
}


// ============ License Dashboard Stats ============
export async function getLicenseDashboardStats() {
  const db = await getDb();
  if (!db) return {
    total: 0,
    byType: [],
    byStatus: [],
    expiringIn7Days: 0,
    expiringIn30Days: 0,
    expired: 0,
    activationsByMonth: [],
  };
  
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  
  // Total count
  const totalResult = await db.select({ count: sql<number>`count(*)` }).from(licenses);
  const total = totalResult[0]?.count || 0;
  
  // By license type
  const byType = await db.select({
    licenseType: licenses.licenseType,
    count: sql<number>`count(*)`,
  })
    .from(licenses)
    .groupBy(licenses.licenseType);
  
  // By status
  const byStatus = await db.select({
    status: licenses.licenseStatus,
    count: sql<number>`count(*)`,
  })
    .from(licenses)
    .groupBy(licenses.licenseStatus);
  
  // Expiring in 7 days
  const expiring7Result = await db.select({ count: sql<number>`count(*)` })
    .from(licenses)
    .where(
      and(
        eq(licenses.licenseStatus, "active"),
        gte(licenses.expiresAt, now),
        lte(licenses.expiresAt, in7Days)
      )
    );
  const expiringIn7Days = expiring7Result[0]?.count || 0;
  
  // Expiring in 30 days
  const expiring30Result = await db.select({ count: sql<number>`count(*)` })
    .from(licenses)
    .where(
      and(
        eq(licenses.licenseStatus, "active"),
        gte(licenses.expiresAt, in7Days),
        lte(licenses.expiresAt, in30Days)
      )
    );
  const expiringIn30Days = expiring30Result[0]?.count || 0;
  
  // Already expired
  const expiredResult = await db.select({ count: sql<number>`count(*)` })
    .from(licenses)
    .where(eq(licenses.licenseStatus, "expired"));
  const expired = expiredResult[0]?.count || 0;
  
  // Activations by month (last 12 months)
  const activationsByMonth = await db.select({
    month: sql<string>`DATE_FORMAT(activated_at, '%Y-%m')`.as('month'),
    count: sql<number>`count(*)`,
  })
    .from(licenses)
    .where(
      and(
        sql`activated_at IS NOT NULL`,
        gte(licenses.activatedAt, new Date(now.getFullYear() - 1, now.getMonth(), 1))
      )
    )
    .groupBy(sql`DATE_FORMAT(activated_at, '%Y-%m')`)
    .orderBy(sql`DATE_FORMAT(activated_at, '%Y-%m')`);
  
  return {
    total,
    byType,
    byStatus,
    expiringIn7Days,
    expiringIn30Days,
    expired,
    activationsByMonth,
  };
}


// ==================== WEBHOOK ESCALATION RULES ====================

export interface EscalationTarget {
  type: 'webhook' | 'email';
  value: string;
}

export interface CreateEscalationRuleInput {
  name: string;
  description?: string;
  sourceWebhookId: number;
  triggerAfterFailures?: number;
  triggerAfterMinutes?: number;
  level1Targets?: EscalationTarget[];
  level1DelayMinutes?: number;
  level2Targets?: EscalationTarget[];
  level2DelayMinutes?: number;
  level3Targets?: EscalationTarget[];
  level3DelayMinutes?: number;
  autoResolveOnSuccess?: boolean;
  notifyOnEscalate?: boolean;
  notifyOnResolve?: boolean;
  isActive?: boolean;
  createdBy?: number;
}

export async function getEscalationRules() {
  const db = await getDb();
  const result = await db.execute(sql`
    SELECT * FROM webhook_escalation_rules ORDER BY created_at DESC
  `);
  return (result[0] as any[]).map(row => ({
    ...row,
    level1_targets: row.level1_targets ? JSON.parse(row.level1_targets) : [],
    level2_targets: row.level2_targets ? JSON.parse(row.level2_targets) : [],
    level3_targets: row.level3_targets ? JSON.parse(row.level3_targets) : [],
  }));
}

export async function getEscalationRuleById(id: number) {
  const db = await getDb();
  const result = await db.execute(sql`
    SELECT * FROM webhook_escalation_rules WHERE id = ${id}
  `);
  const rows = result[0] as any[];
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    ...row,
    level1_targets: row.level1_targets ? JSON.parse(row.level1_targets) : [],
    level2_targets: row.level2_targets ? JSON.parse(row.level2_targets) : [],
    level3_targets: row.level3_targets ? JSON.parse(row.level3_targets) : [],
  };
}

export async function getEscalationRulesByWebhookId(webhookId: number) {
  const db = await getDb();
  const result = await db.execute(sql`
    SELECT * FROM webhook_escalation_rules 
    WHERE source_webhook_id = ${webhookId} AND is_active = 1
    ORDER BY created_at DESC
  `);
  return (result[0] as any[]).map(row => ({
    ...row,
    level1_targets: row.level1_targets ? JSON.parse(row.level1_targets) : [],
    level2_targets: row.level2_targets ? JSON.parse(row.level2_targets) : [],
    level3_targets: row.level3_targets ? JSON.parse(row.level3_targets) : [],
  }));
}

export async function createEscalationRule(input: CreateEscalationRuleInput) {
  const db = await getDb();
  const result = await db.execute(sql`
    INSERT INTO webhook_escalation_rules (
      name, description, source_webhook_id,
      trigger_after_failures, trigger_after_minutes,
      level1_targets, level1_delay_minutes,
      level2_targets, level2_delay_minutes,
      level3_targets, level3_delay_minutes,
      auto_resolve_on_success, notify_on_escalate, notify_on_resolve,
      is_active, created_by
    ) VALUES (
      ${input.name},
      ${input.description || null},
      ${input.sourceWebhookId},
      ${input.triggerAfterFailures || 3},
      ${input.triggerAfterMinutes || 15},
      ${JSON.stringify(input.level1Targets || [])},
      ${input.level1DelayMinutes || 0},
      ${JSON.stringify(input.level2Targets || [])},
      ${input.level2DelayMinutes || 15},
      ${JSON.stringify(input.level3Targets || [])},
      ${input.level3DelayMinutes || 30},
      ${input.autoResolveOnSuccess !== false ? 1 : 0},
      ${input.notifyOnEscalate !== false ? 1 : 0},
      ${input.notifyOnResolve !== false ? 1 : 0},
      ${input.isActive !== false ? 1 : 0},
      ${input.createdBy || null}
    )
  `);
  return (result[0] as any).insertId;
}

export async function updateEscalationRule(id: number, data: Partial<CreateEscalationRuleInput>) {
  const db = await getDb();
  const updates: string[] = [];
  const values: any[] = [];

  if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name); }
  if (data.description !== undefined) { updates.push('description = ?'); values.push(data.description); }
  if (data.triggerAfterFailures !== undefined) { updates.push('trigger_after_failures = ?'); values.push(data.triggerAfterFailures); }
  if (data.triggerAfterMinutes !== undefined) { updates.push('trigger_after_minutes = ?'); values.push(data.triggerAfterMinutes); }
  if (data.level1Targets !== undefined) { updates.push('level1_targets = ?'); values.push(JSON.stringify(data.level1Targets)); }
  if (data.level1DelayMinutes !== undefined) { updates.push('level1_delay_minutes = ?'); values.push(data.level1DelayMinutes); }
  if (data.level2Targets !== undefined) { updates.push('level2_targets = ?'); values.push(JSON.stringify(data.level2Targets)); }
  if (data.level2DelayMinutes !== undefined) { updates.push('level2_delay_minutes = ?'); values.push(data.level2DelayMinutes); }
  if (data.level3Targets !== undefined) { updates.push('level3_targets = ?'); values.push(JSON.stringify(data.level3Targets)); }
  if (data.level3DelayMinutes !== undefined) { updates.push('level3_delay_minutes = ?'); values.push(data.level3DelayMinutes); }
  if (data.autoResolveOnSuccess !== undefined) { updates.push('auto_resolve_on_success = ?'); values.push(data.autoResolveOnSuccess ? 1 : 0); }
  if (data.notifyOnEscalate !== undefined) { updates.push('notify_on_escalate = ?'); values.push(data.notifyOnEscalate ? 1 : 0); }
  if (data.notifyOnResolve !== undefined) { updates.push('notify_on_resolve = ?'); values.push(data.notifyOnResolve ? 1 : 0); }
  if (data.isActive !== undefined) { updates.push('is_active = ?'); values.push(data.isActive ? 1 : 0); }

  if (updates.length === 0) return;

  values.push(id);
  await db.execute(sql.raw(`UPDATE webhook_escalation_rules SET ${updates.join(', ')} WHERE id = ?`, values));
}

export async function deleteEscalationRule(id: number) {
  const db = await getDb();
  await db.execute(sql`DELETE FROM webhook_escalation_rules WHERE id = ${id}`);
}

// Escalation Logs
export async function getEscalationLogs(filters: {
  ruleId?: number;
  sourceWebhookId?: number;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  const conditions: string[] = ['1=1'];
  const values: any[] = [];

  if (filters.ruleId) { conditions.push('rule_id = ?'); values.push(filters.ruleId); }
  if (filters.sourceWebhookId) { conditions.push('source_webhook_id = ?'); values.push(filters.sourceWebhookId); }
  if (filters.status) { conditions.push('status = ?'); values.push(filters.status); }
  if (filters.startDate) { conditions.push('escalated_at >= ?'); values.push(filters.startDate); }
  if (filters.endDate) { conditions.push('escalated_at <= ?'); values.push(filters.endDate); }

  const limit = filters.limit || 50;
  const offset = filters.offset || 0;

  const countResult = await db.execute(sql.raw(
    `SELECT COUNT(*) as total FROM webhook_escalation_logs WHERE ${conditions.join(' AND ')}`,
    values
  ));
  const total = (countResult[0] as any[])[0]?.total || 0;

  const result = await db.execute(sql.raw(
    `SELECT * FROM webhook_escalation_logs WHERE ${conditions.join(' AND ')} ORDER BY escalated_at DESC LIMIT ? OFFSET ?`,
    [...values, limit, offset]
  ));

  return { logs: result[0] as any[], total };
}

export async function getPendingEscalations() {
  const db = await getDb();
  const result = await db.execute(sql`
    SELECT * FROM webhook_escalation_logs 
    WHERE status IN ('pending', 'sent') AND resolved_at IS NULL
    ORDER BY escalated_at DESC
  `);
  return result[0] as any[];
}

export async function updateEscalationLog(id: number, data: {
  status?: string;
  resolvedAt?: Date;
  resolvedBy?: number;
  resolutionNote?: string;
  acknowledgedAt?: Date;
  acknowledgedBy?: number;
}) {
  const db = await getDb();
  const updates: string[] = [];
  const values: any[] = [];

  if (data.status) { updates.push('status = ?'); values.push(data.status); }
  if (data.resolvedAt) { updates.push('resolved_at = ?'); values.push(data.resolvedAt); }
  if (data.resolvedBy) { updates.push('resolved_by = ?'); values.push(data.resolvedBy); }
  if (data.resolutionNote) { updates.push('resolution_note = ?'); values.push(data.resolutionNote); }
  if (data.acknowledgedAt) { updates.push('acknowledged_at = ?'); values.push(data.acknowledgedAt); }
  if (data.acknowledgedBy) { updates.push('acknowledged_by = ?'); values.push(data.acknowledgedBy); }

  if (updates.length === 0) return;

  values.push(id);
  await db.execute(sql.raw(`UPDATE webhook_escalation_logs SET ${updates.join(', ')} WHERE id = ?`, values));
}

// ==================== LATENCY METRICS ====================

export interface RecordLatencyInput {
  sourceType: 'iot_device' | 'webhook' | 'api' | 'database' | 'mqtt';
  sourceId: string;
  sourceName?: string;
  latencyMs: number;
  endpoint?: string;
  statusCode?: number;
  isSuccess?: boolean;
}

export async function recordLatencyMetric(input: RecordLatencyInput) {
  const db = await getDb();
  const result = await db.execute(sql`
    INSERT INTO latency_metrics (
      source_type, source_id, source_name, latency_ms, endpoint, status_code, is_success
    ) VALUES (
      ${input.sourceType},
      ${input.sourceId},
      ${input.sourceName || null},
      ${input.latencyMs},
      ${input.endpoint || null},
      ${input.statusCode || null},
      ${input.isSuccess !== false ? 1 : 0}
    )
  `);
  return (result[0] as any).insertId;
}

export async function getLatencyHeatmapData(filters: {
  sourceType?: string;
  sourceId?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  const db = await getDb();
  const conditions: string[] = ['1=1'];
  const values: any[] = [];

  if (filters.sourceType) { conditions.push('source_type = ?'); values.push(filters.sourceType); }
  if (filters.sourceId) { conditions.push('source_id = ?'); values.push(filters.sourceId); }
  if (filters.startDate) { conditions.push('recorded_at >= ?'); values.push(filters.startDate); }
  if (filters.endDate) { conditions.push('recorded_at <= ?'); values.push(filters.endDate); }

  const result = await db.execute(sql.raw(`
    SELECT 
      HOUR(recorded_at) as hour_of_day,
      DAYOFWEEK(recorded_at) - 1 as day_of_week,
      AVG(latency_ms) as avg_latency,
      MIN(latency_ms) as min_latency,
      MAX(latency_ms) as max_latency,
      COUNT(*) as count,
      SUM(CASE WHEN is_success = 1 THEN 1 ELSE 0 END) as success_count
    FROM latency_metrics
    WHERE ${conditions.join(' AND ')}
    GROUP BY HOUR(recorded_at), DAYOFWEEK(recorded_at)
    ORDER BY day_of_week, hour_of_day
  `, values));

  return result[0] as any[];
}

export async function getLatencyStats(filters: {
  sourceType?: string;
  sourceId?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  const db = await getDb();
  const conditions: string[] = ['1=1'];
  const values: any[] = [];

  if (filters.sourceType) { conditions.push('source_type = ?'); values.push(filters.sourceType); }
  if (filters.sourceId) { conditions.push('source_id = ?'); values.push(filters.sourceId); }
  if (filters.startDate) { conditions.push('recorded_at >= ?'); values.push(filters.startDate); }
  if (filters.endDate) { conditions.push('recorded_at <= ?'); values.push(filters.endDate); }

  const result = await db.execute(sql.raw(`
    SELECT 
      AVG(latency_ms) as avg_latency,
      MIN(latency_ms) as min_latency,
      MAX(latency_ms) as max_latency,
      COUNT(*) as total_count,
      SUM(CASE WHEN is_success = 1 THEN 1 ELSE 0 END) as success_count
    FROM latency_metrics
    WHERE ${conditions.join(' AND ')}
  `, values));

  return (result[0] as any[])[0] || {
    avg_latency: 0,
    min_latency: 0,
    max_latency: 0,
    total_count: 0,
    success_count: 0,
  };
}

export async function getLatencyTimeSeries(filters: {
  sourceType?: string;
  sourceId?: string;
  startDate?: Date;
  endDate?: Date;
  interval?: 'hour' | 'day' | 'week';
}) {
  const db = await getDb();
  const conditions: string[] = ['1=1'];
  const values: any[] = [];

  if (filters.sourceType) { conditions.push('source_type = ?'); values.push(filters.sourceType); }
  if (filters.sourceId) { conditions.push('source_id = ?'); values.push(filters.sourceId); }
  if (filters.startDate) { conditions.push('recorded_at >= ?'); values.push(filters.startDate); }
  if (filters.endDate) { conditions.push('recorded_at <= ?'); values.push(filters.endDate); }

  const interval = filters.interval || 'hour';
  let dateFormat: string;
  switch (interval) {
    case 'day': dateFormat = '%Y-%m-%d'; break;
    case 'week': dateFormat = '%Y-%u'; break;
    default: dateFormat = '%Y-%m-%d %H:00'; break;
  }

  const result = await db.execute(sql.raw(`
    SELECT 
      DATE_FORMAT(recorded_at, '${dateFormat}') as time_bucket,
      AVG(latency_ms) as avg_latency,
      MIN(latency_ms) as min_latency,
      MAX(latency_ms) as max_latency,
      COUNT(*) as count
    FROM latency_metrics
    WHERE ${conditions.join(' AND ')}
    GROUP BY DATE_FORMAT(recorded_at, '${dateFormat}')
    ORDER BY time_bucket
  `, values));

  return result[0] as any[];
}

export async function getLatencySources() {
  const db = await getDb();
  const result = await db.execute(sql`
    SELECT DISTINCT source_type, source_id, source_name
    FROM latency_metrics
    ORDER BY source_type, source_id
  `);
  return result[0] as any[];
}


/**
 * Get latency percentile trends (P50, P95, P99)
 */
export async function getLatencyPercentileTrends(filters: {
  sourceType?: string;
  sourceId?: string;
  startDate?: Date;
  endDate?: Date;
  interval?: 'hour' | 'day' | 'week';
}) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions: string[] = ['1=1'];
  const values: any[] = [];

  if (filters.sourceType) { conditions.push('source_type = ?'); values.push(filters.sourceType); }
  if (filters.sourceId) { conditions.push('source_id = ?'); values.push(filters.sourceId); }
  if (filters.startDate) { conditions.push('recorded_at >= ?'); values.push(filters.startDate.toISOString()); }
  if (filters.endDate) { conditions.push('recorded_at <= ?'); values.push(filters.endDate.toISOString()); }

  const interval = filters.interval || 'hour';
  let dateFormat: string;
  switch (interval) {
    case 'day': dateFormat = '%Y-%m-%d'; break;
    case 'week': dateFormat = '%Y-%u'; break;
    default: dateFormat = '%Y-%m-%d %H:00'; break;
  }

  try {
    const result = await db.execute({
      sql: `
        SELECT 
          DATE_FORMAT(recorded_at, '${dateFormat}') as time_bucket,
          AVG(latency_ms) as avg_latency,
          MIN(latency_ms) as min_latency,
          MAX(latency_ms) as max_latency,
          COUNT(*) as count
        FROM latency_metrics
        WHERE ${conditions.join(' AND ')}
        GROUP BY DATE_FORMAT(recorded_at, '${dateFormat}')
        ORDER BY time_bucket
        LIMIT 500
      `,
      args: values,
    } as any);

    return ((result as any).rows || []).map((row: any) => {
      const avg = Number(row.avg_latency) || 0;
      const min = Number(row.min_latency) || 0;
      const max = Number(row.max_latency) || 0;
      const range = max - min;
      
      // Estimate percentiles based on distribution
      const p50 = avg;
      const p95 = Math.min(avg + range * 0.6, max);
      const p99 = Math.min(avg + range * 0.8, max);
      
      return {
        time_bucket: row.time_bucket,
        avg_latency: avg,
        min_latency: min,
        max_latency: max,
        count: Number(row.count) || 0,
        p50,
        p95,
        p99,
      };
    });
  } catch (error) {
    console.error('[DB] Error getting latency percentile trends:', error);
    return [];
  }
}


// ============================================
// Phase 98: IoT Enhancement - 3D Model Upload, Work Order Notifications, MTTR/MTBF Report
// ============================================

// 3D Models
export async function get3dModels(filters?: { category?: string; isPublic?: boolean; isActive?: boolean }) {
  const db = await getDb();
  try {
    // Build query using sql template tag for proper parameter binding
    let query;
    
    if (filters?.category && filters?.isPublic !== undefined && filters?.isActive !== undefined) {
      query = sql`SELECT * FROM iot_3d_models WHERE category = ${filters.category} AND is_public = ${filters.isPublic ? 1 : 0} AND is_active = ${filters.isActive ? 1 : 0} ORDER BY created_at DESC`;
    } else if (filters?.category && filters?.isPublic !== undefined) {
      query = sql`SELECT * FROM iot_3d_models WHERE category = ${filters.category} AND is_public = ${filters.isPublic ? 1 : 0} ORDER BY created_at DESC`;
    } else if (filters?.category && filters?.isActive !== undefined) {
      query = sql`SELECT * FROM iot_3d_models WHERE category = ${filters.category} AND is_active = ${filters.isActive ? 1 : 0} ORDER BY created_at DESC`;
    } else if (filters?.isPublic !== undefined && filters?.isActive !== undefined) {
      query = sql`SELECT * FROM iot_3d_models WHERE is_public = ${filters.isPublic ? 1 : 0} AND is_active = ${filters.isActive ? 1 : 0} ORDER BY created_at DESC`;
    } else if (filters?.category) {
      query = sql`SELECT * FROM iot_3d_models WHERE category = ${filters.category} ORDER BY created_at DESC`;
    } else if (filters?.isPublic !== undefined) {
      query = sql`SELECT * FROM iot_3d_models WHERE is_public = ${filters.isPublic ? 1 : 0} ORDER BY created_at DESC`;
    } else if (filters?.isActive !== undefined) {
      query = sql`SELECT * FROM iot_3d_models WHERE is_active = ${filters.isActive ? 1 : 0} ORDER BY created_at DESC`;
    } else {
      query = sql`SELECT * FROM iot_3d_models ORDER BY created_at DESC`;
    }
    
    const result = await db.execute(query);
    
    return (result[0] as any[]) || [];
  } catch (error) {
    console.error('[DB] Error getting 3D models:', error);
    return [];
  }
}

export async function get3dModelById(id: number) {
  const db = await getDb();
  try {
    const result = await db.execute(sql`
      SELECT * FROM iot_3d_models WHERE id = ${id}
    `);
    return (result[0] as any[])[0] || null;
  } catch (error) {
    console.error('[DB] Error getting 3D model by ID:', error);
    return null;
  }
}

export async function create3dModel(data: {
  name: string;
  description?: string;
  category?: string;
  modelUrl: string;
  modelFormat?: string;
  thumbnailUrl?: string;
  fileSize?: number;
  defaultScale?: number;
  defaultRotationX?: number;
  defaultRotationY?: number;
  defaultRotationZ?: number;
  boundingBoxWidth?: number;
  boundingBoxHeight?: number;
  boundingBoxDepth?: number;
  manufacturer?: string;
  modelNumber?: string;
  tags?: string[];
  metadata?: any;
  isPublic?: boolean;
  uploadedBy?: number;
}) {
  const db = await getDb();
  try {
    const result = await db.execute(sql`
      INSERT INTO iot_3d_models 
        (name, description, category, model_url, model_format, thumbnail_url, file_size,
         default_scale, default_rotation_x, default_rotation_y, default_rotation_z,
         bounding_box_width, bounding_box_height, bounding_box_depth,
         manufacturer, model_number, tags, metadata, is_public, uploaded_by)
        VALUES (
          ${data.name},
          ${data.description || null},
          ${data.category || 'machine'},
          ${data.modelUrl},
          ${data.modelFormat || 'glb'},
          ${data.thumbnailUrl || null},
          ${data.fileSize || null},
          ${data.defaultScale || 1},
          ${data.defaultRotationX || 0},
          ${data.defaultRotationY || 0},
          ${data.defaultRotationZ || 0},
          ${data.boundingBoxWidth || null},
          ${data.boundingBoxHeight || null},
          ${data.boundingBoxDepth || null},
          ${data.manufacturer || null},
          ${data.modelNumber || null},
          ${data.tags ? JSON.stringify(data.tags) : null},
          ${data.metadata ? JSON.stringify(data.metadata) : null},
          ${data.isPublic ? 1 : 0},
          ${data.uploadedBy || null}
        )
    `);
    return { id: (result as any)[0]?.insertId || (result as any).insertId };
  } catch (error) {
    console.error('[DB] Error creating 3D model:', error);
    throw error;
  }
}

export async function update3dModel(id: number, data: Partial<{
  name: string;
  description: string;
  category: string;
  modelUrl: string;
  modelFormat: string;
  thumbnailUrl: string;
  fileSize: number;
  defaultScale: number;
  defaultRotationX: number;
  defaultRotationY: number;
  defaultRotationZ: number;
  boundingBoxWidth: number;
  boundingBoxHeight: number;
  boundingBoxDepth: number;
  manufacturer: string;
  modelNumber: string;
  tags: string[];
  metadata: any;
  isPublic: boolean;
  isActive: boolean;
}>) {
  const db = await getDb();
  try {
    const updates: string[] = [];
    const values: any[] = [];
    
    if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name); }
    if (data.description !== undefined) { updates.push('description = ?'); values.push(data.description); }
    if (data.category !== undefined) { updates.push('category = ?'); values.push(data.category); }
    if (data.modelUrl !== undefined) { updates.push('model_url = ?'); values.push(data.modelUrl); }
    if (data.modelFormat !== undefined) { updates.push('model_format = ?'); values.push(data.modelFormat); }
    if (data.thumbnailUrl !== undefined) { updates.push('thumbnail_url = ?'); values.push(data.thumbnailUrl); }
    if (data.fileSize !== undefined) { updates.push('file_size = ?'); values.push(data.fileSize); }
    if (data.defaultScale !== undefined) { updates.push('default_scale = ?'); values.push(data.defaultScale); }
    if (data.defaultRotationX !== undefined) { updates.push('default_rotation_x = ?'); values.push(data.defaultRotationX); }
    if (data.defaultRotationY !== undefined) { updates.push('default_rotation_y = ?'); values.push(data.defaultRotationY); }
    if (data.defaultRotationZ !== undefined) { updates.push('default_rotation_z = ?'); values.push(data.defaultRotationZ); }
    if (data.boundingBoxWidth !== undefined) { updates.push('bounding_box_width = ?'); values.push(data.boundingBoxWidth); }
    if (data.boundingBoxHeight !== undefined) { updates.push('bounding_box_height = ?'); values.push(data.boundingBoxHeight); }
    if (data.boundingBoxDepth !== undefined) { updates.push('bounding_box_depth = ?'); values.push(data.boundingBoxDepth); }
    if (data.manufacturer !== undefined) { updates.push('manufacturer = ?'); values.push(data.manufacturer); }
    if (data.modelNumber !== undefined) { updates.push('model_number = ?'); values.push(data.modelNumber); }
    if (data.tags !== undefined) { updates.push('tags = ?'); values.push(JSON.stringify(data.tags)); }
    if (data.metadata !== undefined) { updates.push('metadata = ?'); values.push(JSON.stringify(data.metadata)); }
    if (data.isPublic !== undefined) { updates.push('is_public = ?'); values.push(data.isPublic ? 1 : 0); }
    if (data.isActive !== undefined) { updates.push('is_active = ?'); values.push(data.isActive ? 1 : 0); }
    
    if (updates.length === 0) return { success: true };
    
    values.push(id);
    await db.execute(sql.raw(
      `UPDATE iot_3d_models SET ${updates.join(', ')} WHERE id = ?`,
      values
    ));
    return { success: true };
  } catch (error) {
    console.error('[DB] Error updating 3D model:', error);
    throw error;
  }
}

export async function delete3dModel(id: number) {
  const db = await getDb();
  try {
    await db.execute(sql`DELETE FROM iot_3d_models WHERE id = ${id}`);
    return { success: true };
  } catch (error) {
    console.error('[DB] Error deleting 3D model:', error);
    throw error;
  }
}

// 3D Model Instances
export async function get3dModelInstances(floorPlan3dId: number) {
  const db = await getDb();
  try {
    const result = await db.execute(sql`
      SELECT i.*, m.name as model_name, m.model_url, m.model_format, m.thumbnail_url
      FROM iot_3d_model_instances i
      LEFT JOIN iot_3d_models m ON i.model_id = m.id
      WHERE i.floor_plan_3d_id = ${floorPlan3dId}
      ORDER BY i.created_at DESC
    `);
    return (result[0] as any[]) || [];
  } catch (error) {
    console.error('[DB] Error getting 3D model instances:', error);
    return [];
  }
}

export async function create3dModelInstance(data: {
  modelId: number;
  floorPlan3dId: number;
  deviceId?: number;
  machineId?: number;
  name?: string;
  positionX: number;
  positionY: number;
  positionZ: number;
  rotationX?: number;
  rotationY?: number;
  rotationZ?: number;
  scaleX?: number;
  scaleY?: number;
  scaleZ?: number;
  visible?: boolean;
  opacity?: number;
  wireframe?: boolean;
  castShadow?: boolean;
  receiveShadow?: boolean;
  clickable?: boolean;
  tooltip?: string;
  popupContent?: string;
  animationEnabled?: boolean;
  animationType?: string;
  animationSpeed?: number;
  metadata?: any;
}) {
  const db = await getDb();
  try {
    const result = await db.execute(sql`
      INSERT INTO iot_3d_model_instances 
        (model_id, floor_plan_3d_id, device_id, machine_id, name,
         position_x, position_y, position_z, rotation_x, rotation_y, rotation_z,
         scale_x, scale_y, scale_z, visible, opacity, wireframe, cast_shadow, receive_shadow,
         clickable, tooltip, popup_content, animation_enabled, animation_type, animation_speed, metadata)
        VALUES (
          ${data.modelId},
          ${data.floorPlan3dId},
          ${data.deviceId || null},
          ${data.machineId || null},
          ${data.name || null},
          ${data.positionX},
          ${data.positionY},
          ${data.positionZ},
          ${data.rotationX || 0},
          ${data.rotationY || 0},
          ${data.rotationZ || 0},
          ${data.scaleX || 1},
          ${data.scaleY || 1},
          ${data.scaleZ || 1},
          ${data.visible !== false ? 1 : 0},
          ${data.opacity || 1},
          ${data.wireframe ? 1 : 0},
          ${data.castShadow !== false ? 1 : 0},
          ${data.receiveShadow !== false ? 1 : 0},
          ${data.clickable !== false ? 1 : 0},
          ${data.tooltip || null},
          ${data.popupContent || null},
          ${data.animationEnabled ? 1 : 0},
          ${data.animationType || 'none'},
          ${data.animationSpeed || 1},
          ${data.metadata ? JSON.stringify(data.metadata) : null}
        )
    `);
    return { id: (result as any)[0]?.insertId || (result as any).insertId };
  } catch (error) {
    console.error('[DB] Error creating 3D model instance:', error);
    throw error;
  }
}

export async function update3dModelInstance(id: number, data: Partial<{
  positionX: number;
  positionY: number;
  positionZ: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  visible: boolean;
  opacity: number;
  wireframe: boolean;
  castShadow: boolean;
  receiveShadow: boolean;
  clickable: boolean;
  tooltip: string;
  popupContent: string;
  animationEnabled: boolean;
  animationType: string;
  animationSpeed: number;
  metadata: any;
}>) {
  const db = await getDb();
  try {
    const updates: string[] = [];
    const values: any[] = [];
    
    if (data.positionX !== undefined) { updates.push('position_x = ?'); values.push(data.positionX); }
    if (data.positionY !== undefined) { updates.push('position_y = ?'); values.push(data.positionY); }
    if (data.positionZ !== undefined) { updates.push('position_z = ?'); values.push(data.positionZ); }
    if (data.rotationX !== undefined) { updates.push('rotation_x = ?'); values.push(data.rotationX); }
    if (data.rotationY !== undefined) { updates.push('rotation_y = ?'); values.push(data.rotationY); }
    if (data.rotationZ !== undefined) { updates.push('rotation_z = ?'); values.push(data.rotationZ); }
    if (data.scaleX !== undefined) { updates.push('scale_x = ?'); values.push(data.scaleX); }
    if (data.scaleY !== undefined) { updates.push('scale_y = ?'); values.push(data.scaleY); }
    if (data.scaleZ !== undefined) { updates.push('scale_z = ?'); values.push(data.scaleZ); }
    if (data.visible !== undefined) { updates.push('visible = ?'); values.push(data.visible ? 1 : 0); }
    if (data.opacity !== undefined) { updates.push('opacity = ?'); values.push(data.opacity); }
    if (data.wireframe !== undefined) { updates.push('wireframe = ?'); values.push(data.wireframe ? 1 : 0); }
    if (data.castShadow !== undefined) { updates.push('cast_shadow = ?'); values.push(data.castShadow ? 1 : 0); }
    if (data.receiveShadow !== undefined) { updates.push('receive_shadow = ?'); values.push(data.receiveShadow ? 1 : 0); }
    if (data.clickable !== undefined) { updates.push('clickable = ?'); values.push(data.clickable ? 1 : 0); }
    if (data.tooltip !== undefined) { updates.push('tooltip = ?'); values.push(data.tooltip); }
    if (data.popupContent !== undefined) { updates.push('popup_content = ?'); values.push(data.popupContent); }
    if (data.animationEnabled !== undefined) { updates.push('animation_enabled = ?'); values.push(data.animationEnabled ? 1 : 0); }
    if (data.animationType !== undefined) { updates.push('animation_type = ?'); values.push(data.animationType); }
    if (data.animationSpeed !== undefined) { updates.push('animation_speed = ?'); values.push(data.animationSpeed); }
    if (data.metadata !== undefined) { updates.push('metadata = ?'); values.push(JSON.stringify(data.metadata)); }
    
    if (updates.length === 0) return { success: true };
    
    values.push(id);
    await db.execute(sql.raw(
      `UPDATE iot_3d_model_instances SET ${updates.join(', ')} WHERE id = ?`,
      values
    ));
    return { success: true };
  } catch (error) {
    console.error('[DB] Error updating 3D model instance:', error);
    throw error;
  }
}

export async function delete3dModelInstance(id: number) {
  const db = await getDb();
  try {
    await db.execute(sql`DELETE FROM iot_3d_model_instances WHERE id = ${id}`);
    return { success: true };
  } catch (error) {
    console.error('[DB] Error deleting 3D model instance:', error);
    throw error;
  }
}

// Technician Notification Preferences
export async function getTechnicianNotificationPrefs(technicianId: number) {
  const db = await getDb();
  try {
    const result = await db.execute({
      sql: 'SELECT * FROM iot_technician_notification_prefs WHERE technician_id = ?',
      args: [technicianId],
    } as any);
    return ((result as any).rows || [])[0] || null;
  } catch (error) {
    console.error('[DB] Error getting technician notification prefs:', error);
    return null;
  }
}

export async function upsertTechnicianNotificationPrefs(technicianId: number, data: {
  pushEnabled?: boolean;
  pushToken?: string;
  pushPlatform?: string;
  smsEnabled?: boolean;
  phoneNumber?: string;
  phoneCountryCode?: string;
  emailEnabled?: boolean;
  email?: string;
  notifyNewWorkOrder?: boolean;
  notifyAssigned?: boolean;
  notifyStatusChange?: boolean;
  notifyDueSoon?: boolean;
  notifyOverdue?: boolean;
  notifyComment?: boolean;
  minPriorityForPush?: string;
  minPriorityForSms?: string;
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}) {
  const db = await getDb();
  try {
    // Check if exists
    const existing = await getTechnicianNotificationPrefs(technicianId);
    
    if (existing) {
      // Update
      const updates: string[] = [];
      const values: any[] = [];
      
      if (data.pushEnabled !== undefined) { updates.push('push_enabled = ?'); values.push(data.pushEnabled ? 1 : 0); }
      if (data.pushToken !== undefined) { updates.push('push_token = ?'); values.push(data.pushToken); }
      if (data.pushPlatform !== undefined) { updates.push('push_platform = ?'); values.push(data.pushPlatform); }
      if (data.smsEnabled !== undefined) { updates.push('sms_enabled = ?'); values.push(data.smsEnabled ? 1 : 0); }
      if (data.phoneNumber !== undefined) { updates.push('phone_number = ?'); values.push(data.phoneNumber); }
      if (data.phoneCountryCode !== undefined) { updates.push('phone_country_code = ?'); values.push(data.phoneCountryCode); }
      if (data.emailEnabled !== undefined) { updates.push('email_enabled = ?'); values.push(data.emailEnabled ? 1 : 0); }
      if (data.email !== undefined) { updates.push('email = ?'); values.push(data.email); }
      if (data.notifyNewWorkOrder !== undefined) { updates.push('notify_new_work_order = ?'); values.push(data.notifyNewWorkOrder ? 1 : 0); }
      if (data.notifyAssigned !== undefined) { updates.push('notify_assigned = ?'); values.push(data.notifyAssigned ? 1 : 0); }
      if (data.notifyStatusChange !== undefined) { updates.push('notify_status_change = ?'); values.push(data.notifyStatusChange ? 1 : 0); }
      if (data.notifyDueSoon !== undefined) { updates.push('notify_due_soon = ?'); values.push(data.notifyDueSoon ? 1 : 0); }
      if (data.notifyOverdue !== undefined) { updates.push('notify_overdue = ?'); values.push(data.notifyOverdue ? 1 : 0); }
      if (data.notifyComment !== undefined) { updates.push('notify_comment = ?'); values.push(data.notifyComment ? 1 : 0); }
      if (data.minPriorityForPush !== undefined) { updates.push('min_priority_for_push = ?'); values.push(data.minPriorityForPush); }
      if (data.minPriorityForSms !== undefined) { updates.push('min_priority_for_sms = ?'); values.push(data.minPriorityForSms); }
      if (data.quietHoursEnabled !== undefined) { updates.push('quiet_hours_enabled = ?'); values.push(data.quietHoursEnabled ? 1 : 0); }
      if (data.quietHoursStart !== undefined) { updates.push('quiet_hours_start = ?'); values.push(data.quietHoursStart); }
      if (data.quietHoursEnd !== undefined) { updates.push('quiet_hours_end = ?'); values.push(data.quietHoursEnd); }
      
      if (updates.length > 0) {
        values.push(technicianId);
        await db.execute({
          sql: `UPDATE iot_technician_notification_prefs SET ${updates.join(', ')} WHERE technician_id = ?`,
          args: values,
        } as any);
      }
    } else {
      // Insert
      await db.execute({
        sql: `INSERT INTO iot_technician_notification_prefs 
          (technician_id, push_enabled, push_token, push_platform, sms_enabled, phone_number, phone_country_code,
           email_enabled, email, notify_new_work_order, notify_assigned, notify_status_change,
           notify_due_soon, notify_overdue, notify_comment, min_priority_for_push, min_priority_for_sms,
           quiet_hours_enabled, quiet_hours_start, quiet_hours_end)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          technicianId,
          data.pushEnabled !== false ? 1 : 0,
          data.pushToken || null,
          data.pushPlatform || 'web',
          data.smsEnabled ? 1 : 0,
          data.phoneNumber || null,
          data.phoneCountryCode || '+84',
          data.emailEnabled !== false ? 1 : 0,
          data.email || null,
          data.notifyNewWorkOrder !== false ? 1 : 0,
          data.notifyAssigned !== false ? 1 : 0,
          data.notifyStatusChange !== false ? 1 : 0,
          data.notifyDueSoon !== false ? 1 : 0,
          data.notifyOverdue !== false ? 1 : 0,
          data.notifyComment ? 1 : 0,
          data.minPriorityForPush || 'medium',
          data.minPriorityForSms || 'high',
          data.quietHoursEnabled ? 1 : 0,
          data.quietHoursStart || '22:00',
          data.quietHoursEnd || '07:00',
        ],
      } as any);
    }
    return { success: true };
  } catch (error) {
    console.error('[DB] Error upserting technician notification prefs:', error);
    throw error;
  }
}

// Work Order Notifications
export async function createWorkOrderNotification(data: {
  workOrderId: number;
  technicianId: number;
  notificationType: string;
  channel: string;
  title: string;
  message: string;
  metadata?: any;
}) {
  const db = await getDb();
  try {
    const result = await db.execute({
      sql: `INSERT INTO iot_work_order_notifications 
        (work_order_id, technician_id, notification_type, channel, title, message, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        data.workOrderId,
        data.technicianId,
        data.notificationType,
        data.channel,
        data.title,
        data.message,
        data.metadata ? JSON.stringify(data.metadata) : null,
      ],
    } as any);
    return { id: (result as any).insertId };
  } catch (error) {
    console.error('[DB] Error creating work order notification:', error);
    throw error;
  }
}

export async function updateNotificationStatus(id: number, status: string, externalMessageId?: string, failureReason?: string) {
  const db = await getDb();
  try {
    const updates: string[] = ['status = ?'];
    const values: any[] = [status];
    
    if (status === 'sent') {
      updates.push('sent_at = NOW()');
    } else if (status === 'delivered') {
      updates.push('delivered_at = NOW()');
    } else if (status === 'read') {
      updates.push('read_at = NOW()');
    } else if (status === 'failed') {
      updates.push('failed_at = NOW()');
      if (failureReason) {
        updates.push('failure_reason = ?');
        values.push(failureReason);
      }
    }
    
    if (externalMessageId) {
      updates.push('external_message_id = ?');
      values.push(externalMessageId);
    }
    
    values.push(id);
    await db.execute({
      sql: `UPDATE iot_work_order_notifications SET ${updates.join(', ')} WHERE id = ?`,
      args: values,
    } as any);
    return { success: true };
  } catch (error) {
    console.error('[DB] Error updating notification status:', error);
    throw error;
  }
}

export async function getWorkOrderNotifications(workOrderId: number) {
  const db = await getDb();
  try {
    const result = await db.execute({
      sql: `SELECT n.*, t.user_id as technician_user_id
            FROM iot_work_order_notifications n
            LEFT JOIN iot_technicians t ON n.technician_id = t.id
            WHERE n.work_order_id = ?
            ORDER BY n.created_at DESC`,
      args: [workOrderId],
    } as any);
    return (result as any).rows || [];
  } catch (error) {
    console.error('[DB] Error getting work order notifications:', error);
    return [];
  }
}

// SMS Config
export async function getSmsConfig() {
  const db = await getDb();
  try {
    const result = await db.execute({
      sql: 'SELECT * FROM iot_sms_config ORDER BY id DESC LIMIT 1',
      args: [],
    } as any);
    return ((result as any).rows || [])[0] || null;
  } catch (error) {
    console.error('[DB] Error getting SMS config:', error);
    return null;
  }
}

export async function upsertSmsConfig(data: {
  provider?: string;
  accountSid?: string;
  authToken?: string;
  fromNumber?: string;
  maxSmsPerDay?: number;
  maxSmsPerHour?: number;
  cooldownMinutes?: number;
  isEnabled?: boolean;
}) {
  const db = await getDb();
  try {
    const existing = await getSmsConfig();
    
    if (existing) {
      const updates: string[] = [];
      const values: any[] = [];
      
      if (data.provider !== undefined) { updates.push('provider = ?'); values.push(data.provider); }
      if (data.accountSid !== undefined) { updates.push('account_sid = ?'); values.push(data.accountSid); }
      if (data.authToken !== undefined) { updates.push('auth_token = ?'); values.push(data.authToken); }
      if (data.fromNumber !== undefined) { updates.push('from_number = ?'); values.push(data.fromNumber); }
      if (data.maxSmsPerDay !== undefined) { updates.push('max_sms_per_day = ?'); values.push(data.maxSmsPerDay); }
      if (data.maxSmsPerHour !== undefined) { updates.push('max_sms_per_hour = ?'); values.push(data.maxSmsPerHour); }
      if (data.cooldownMinutes !== undefined) { updates.push('cooldown_minutes = ?'); values.push(data.cooldownMinutes); }
      if (data.isEnabled !== undefined) { updates.push('is_enabled = ?'); values.push(data.isEnabled ? 1 : 0); }
      
      if (updates.length > 0) {
        values.push(existing.id);
        await db.execute({
          sql: `UPDATE iot_sms_config SET ${updates.join(', ')} WHERE id = ?`,
          args: values,
        } as any);
      }
    } else {
      await db.execute({
        sql: `INSERT INTO iot_sms_config 
          (provider, account_sid, auth_token, from_number, max_sms_per_day, max_sms_per_hour, cooldown_minutes, is_enabled)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          data.provider || 'twilio',
          data.accountSid || null,
          data.authToken || null,
          data.fromNumber || null,
          data.maxSmsPerDay || 100,
          data.maxSmsPerHour || 20,
          data.cooldownMinutes || 5,
          data.isEnabled ? 1 : 0,
        ],
      } as any);
    }
    return { success: true };
  } catch (error) {
    console.error('[DB] Error upserting SMS config:', error);
    throw error;
  }
}

// Push Config
export async function getPushConfig() {
  const db = await getDb();
  try {
    const result = await db.execute({
      sql: 'SELECT * FROM iot_push_config ORDER BY id DESC LIMIT 1',
      args: [],
    } as any);
    return ((result as any).rows || [])[0] || null;
  } catch (error) {
    console.error('[DB] Error getting push config:', error);
    return null;
  }
}

export async function upsertPushConfig(data: {
  provider?: string;
  projectId?: string;
  serverKey?: string;
  vapidPublicKey?: string;
  vapidPrivateKey?: string;
  isEnabled?: boolean;
}) {
  const db = await getDb();
  try {
    const existing = await getPushConfig();
    
    if (existing) {
      const updates: string[] = [];
      const values: any[] = [];
      
      if (data.provider !== undefined) { updates.push('provider = ?'); values.push(data.provider); }
      if (data.projectId !== undefined) { updates.push('project_id = ?'); values.push(data.projectId); }
      if (data.serverKey !== undefined) { updates.push('server_key = ?'); values.push(data.serverKey); }
      if (data.vapidPublicKey !== undefined) { updates.push('vapid_public_key = ?'); values.push(data.vapidPublicKey); }
      if (data.vapidPrivateKey !== undefined) { updates.push('vapid_private_key = ?'); values.push(data.vapidPrivateKey); }
      if (data.isEnabled !== undefined) { updates.push('is_enabled = ?'); values.push(data.isEnabled ? 1 : 0); }
      
      if (updates.length > 0) {
        values.push(existing.id);
        await db.execute({
          sql: `UPDATE iot_push_config SET ${updates.join(', ')} WHERE id = ?`,
          args: values,
        } as any);
      }
    } else {
      await db.execute({
        sql: `INSERT INTO iot_push_config 
          (provider, project_id, server_key, vapid_public_key, vapid_private_key, is_enabled)
          VALUES (?, ?, ?, ?, ?, ?)`,
        args: [
          data.provider || 'firebase',
          data.projectId || null,
          data.serverKey || null,
          data.vapidPublicKey || null,
          data.vapidPrivateKey || null,
          data.isEnabled ? 1 : 0,
        ],
      } as any);
    }
    return { success: true };
  } catch (error) {
    console.error('[DB] Error upserting push config:', error);
    throw error;
  }
}

// MTTR/MTBF Statistics
export async function getMttrMtbfStats(filters: {
  targetType: string;
  targetId: number;
  periodType?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  const db = await getDb();
  try {
    const conditions: string[] = ['target_type = ?', 'target_id = ?'];
    const values: any[] = [filters.targetType, filters.targetId];
    
    if (filters.periodType) {
      conditions.push('period_type = ?');
      values.push(filters.periodType);
    }
    if (filters.startDate) {
      conditions.push('period_start >= ?');
      values.push(filters.startDate.toISOString().slice(0, 19).replace('T', ' '));
    }
    if (filters.endDate) {
      conditions.push('period_end <= ?');
      values.push(filters.endDate.toISOString().slice(0, 19).replace('T', ' '));
    }
    
    const result = await db.execute({
      sql: `SELECT * FROM iot_mttr_mtbf_stats 
            WHERE ${conditions.join(' AND ')}
            ORDER BY period_start DESC`,
      args: values,
    } as any);
    return (result as any).rows || [];
  } catch (error) {
    console.error('[DB] Error getting MTTR/MTBF stats:', error);
    return [];
  }
}

export async function createMttrMtbfStats(data: {
  targetType: string;
  targetId: number;
  periodType: string;
  periodStart: Date;
  periodEnd: Date;
  mttr?: number;
  mttrMin?: number;
  mttrMax?: number;
  mttrStdDev?: number;
  mtbf?: number;
  mtbfMin?: number;
  mtbfMax?: number;
  mtbfStdDev?: number;
  mttf?: number;
  availability?: number;
  totalFailures?: number;
  totalRepairs?: number;
  totalDowntimeMinutes?: number;
  totalUptimeHours?: number;
  correctiveWorkOrders?: number;
  preventiveWorkOrders?: number;
  predictiveWorkOrders?: number;
  emergencyWorkOrders?: number;
  totalLaborCost?: number;
  totalPartsCost?: number;
  totalMaintenanceCost?: number;
}) {
  const db = await getDb();
  try {
    const result = await db.execute({
      sql: `INSERT INTO iot_mttr_mtbf_stats 
        (target_type, target_id, period_type, period_start, period_end,
         mttr, mttr_min, mttr_max, mttr_std_dev,
         mtbf, mtbf_min, mtbf_max, mtbf_std_dev, mttf, availability,
         total_failures, total_repairs, total_downtime_minutes, total_uptime_hours,
         corrective_work_orders, preventive_work_orders, predictive_work_orders, emergency_work_orders,
         total_labor_cost, total_parts_cost, total_maintenance_cost)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        data.targetType,
        data.targetId,
        data.periodType,
        data.periodStart.toISOString().slice(0, 19).replace('T', ' '),
        data.periodEnd.toISOString().slice(0, 19).replace('T', ' '),
        data.mttr || null,
        data.mttrMin || null,
        data.mttrMax || null,
        data.mttrStdDev || null,
        data.mtbf || null,
        data.mtbfMin || null,
        data.mtbfMax || null,
        data.mtbfStdDev || null,
        data.mttf || null,
        data.availability || null,
        data.totalFailures || 0,
        data.totalRepairs || 0,
        data.totalDowntimeMinutes || 0,
        data.totalUptimeHours || 0,
        data.correctiveWorkOrders || 0,
        data.preventiveWorkOrders || 0,
        data.predictiveWorkOrders || 0,
        data.emergencyWorkOrders || 0,
        data.totalLaborCost || 0,
        data.totalPartsCost || 0,
        data.totalMaintenanceCost || 0,
      ],
    } as any);
    return { id: (result as any).insertId };
  } catch (error) {
    console.error('[DB] Error creating MTTR/MTBF stats:', error);
    throw error;
  }
}

// Failure Events
export async function getFailureEvents(filters: {
  targetType?: string;
  targetId?: number;
  workOrderId?: number;
  failureType?: string;
  severity?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}) {
  const db = await getDb();
  try {
    const conditions: string[] = [];
    const values: any[] = [];
    
    if (filters.targetType) {
      conditions.push('target_type = ?');
      values.push(filters.targetType);
    }
    if (filters.targetId) {
      conditions.push('target_id = ?');
      values.push(filters.targetId);
    }
    if (filters.workOrderId) {
      conditions.push('work_order_id = ?');
      values.push(filters.workOrderId);
    }
    if (filters.failureType) {
      conditions.push('failure_type = ?');
      values.push(filters.failureType);
    }
    if (filters.severity) {
      conditions.push('severity = ?');
      values.push(filters.severity);
    }
    if (filters.startDate) {
      conditions.push('failure_start_at >= ?');
      values.push(filters.startDate.toISOString().slice(0, 19).replace('T', ' '));
    }
    if (filters.endDate) {
      conditions.push('failure_start_at <= ?');
      values.push(filters.endDate.toISOString().slice(0, 19).replace('T', ' '));
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limitClause = filters.limit ? `LIMIT ${filters.limit}` : '';
    
    const result = await db.execute({
      sql: `SELECT * FROM iot_failure_events ${whereClause} ORDER BY failure_start_at DESC ${limitClause}`,
      args: values,
    } as any);
    return (result as any).rows || [];
  } catch (error) {
    console.error('[DB] Error getting failure events:', error);
    return [];
  }
}

export async function createFailureEvent(data: {
  targetType: string;
  targetId: number;
  workOrderId?: number;
  failureCode?: string;
  failureType?: string;
  severity?: string;
  description?: string;
  failureStartAt: Date;
  failureEndAt?: Date;
  repairStartAt?: Date;
  repairEndAt?: Date;
  downtimeDuration?: number;
  repairDuration?: number;
  waitingDuration?: number;
  rootCauseCategory?: string;
  rootCause?: string;
  resolutionType?: string;
  resolution?: string;
  previousFailureId?: number;
  timeSincePreviousFailure?: number;
  reportedBy?: number;
  verifiedBy?: number;
}) {
  const db = await getDb();
  try {
    const result = await db.execute({
      sql: `INSERT INTO iot_failure_events 
        (target_type, target_id, work_order_id, failure_code, failure_type, severity, description,
         failure_start_at, failure_end_at, repair_start_at, repair_end_at,
         downtime_duration, repair_duration, waiting_duration,
         root_cause_category, root_cause, resolution_type, resolution,
         previous_failure_id, time_since_previous_failure, reported_by, verified_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        data.targetType,
        data.targetId,
        data.workOrderId || null,
        data.failureCode || null,
        data.failureType || 'breakdown',
        data.severity || 'moderate',
        data.description || null,
        data.failureStartAt.toISOString().slice(0, 19).replace('T', ' '),
        data.failureEndAt ? data.failureEndAt.toISOString().slice(0, 19).replace('T', ' ') : null,
        data.repairStartAt ? data.repairStartAt.toISOString().slice(0, 19).replace('T', ' ') : null,
        data.repairEndAt ? data.repairEndAt.toISOString().slice(0, 19).replace('T', ' ') : null,
        data.downtimeDuration || null,
        data.repairDuration || null,
        data.waitingDuration || null,
        data.rootCauseCategory || 'unknown',
        data.rootCause || null,
        data.resolutionType || 'repair',
        data.resolution || null,
        data.previousFailureId || null,
        data.timeSincePreviousFailure || null,
        data.reportedBy || null,
        data.verifiedBy || null,
      ],
    } as any);
    return { id: (result as any).insertId };
  } catch (error) {
    console.error('[DB] Error creating failure event:', error);
    throw error;
  }
}

export async function updateFailureEvent(id: number, data: Partial<{
  failureEndAt: Date;
  repairStartAt: Date;
  repairEndAt: Date;
  downtimeDuration: number;
  repairDuration: number;
  waitingDuration: number;
  rootCauseCategory: string;
  rootCause: string;
  resolutionType: string;
  resolution: string;
  verifiedBy: number;
}>) {
  const db = await getDb();
  try {
    const updates: string[] = [];
    const values: any[] = [];
    
    if (data.failureEndAt !== undefined) { 
      updates.push('failure_end_at = ?'); 
      values.push(data.failureEndAt.toISOString().slice(0, 19).replace('T', ' ')); 
    }
    if (data.repairStartAt !== undefined) { 
      updates.push('repair_start_at = ?'); 
      values.push(data.repairStartAt.toISOString().slice(0, 19).replace('T', ' ')); 
    }
    if (data.repairEndAt !== undefined) { 
      updates.push('repair_end_at = ?'); 
      values.push(data.repairEndAt.toISOString().slice(0, 19).replace('T', ' ')); 
    }
    if (data.downtimeDuration !== undefined) { updates.push('downtime_duration = ?'); values.push(data.downtimeDuration); }
    if (data.repairDuration !== undefined) { updates.push('repair_duration = ?'); values.push(data.repairDuration); }
    if (data.waitingDuration !== undefined) { updates.push('waiting_duration = ?'); values.push(data.waitingDuration); }
    if (data.rootCauseCategory !== undefined) { updates.push('root_cause_category = ?'); values.push(data.rootCauseCategory); }
    if (data.rootCause !== undefined) { updates.push('root_cause = ?'); values.push(data.rootCause); }
    if (data.resolutionType !== undefined) { updates.push('resolution_type = ?'); values.push(data.resolutionType); }
    if (data.resolution !== undefined) { updates.push('resolution = ?'); values.push(data.resolution); }
    if (data.verifiedBy !== undefined) { updates.push('verified_by = ?'); values.push(data.verifiedBy); }
    
    if (updates.length === 0) return { success: true };
    
    values.push(id);
    await db.execute({
      sql: `UPDATE iot_failure_events SET ${updates.join(', ')} WHERE id = ?`,
      args: values,
    } as any);
    return { success: true };
  } catch (error) {
    console.error('[DB] Error updating failure event:', error);
    throw error;
  }
}

// Calculate MTTR/MTBF from failure events AND work orders
export async function calculateMttrMtbf(targetType: string, targetId: number, periodStart: Date, periodEnd: Date) {
  const db = await getDb();
  try {
    // First, get data from failure events
    const failureResult = await db.execute({
      sql: `SELECT 
              COUNT(*) as total_failures,
              AVG(repair_duration) as avg_repair_time,
              MIN(repair_duration) as min_repair_time,
              MAX(repair_duration) as max_repair_time,
              STDDEV(repair_duration) as std_repair_time,
              SUM(downtime_duration) as total_downtime,
              AVG(time_since_previous_failure) as avg_time_between_failures,
              MIN(time_since_previous_failure) as min_time_between_failures,
              MAX(time_since_previous_failure) as max_time_between_failures,
              STDDEV(time_since_previous_failure) as std_time_between_failures
            FROM iot_failure_events
            WHERE target_type = ? AND target_id = ?
              AND failure_start_at >= ? AND failure_start_at <= ?
              AND repair_duration IS NOT NULL`,
      args: [
        targetType,
        targetId,
        periodStart.toISOString().slice(0, 19).replace('T', ' '),
        periodEnd.toISOString().slice(0, 19).replace('T', ' '),
      ],
    } as any);
    
    const failureStats = ((failureResult as any).rows || [])[0] || {};
    
    // Second, get MTTR from work orders (time from created to completed)
    let deviceCondition = '';
    if (targetType === 'device') {
      deviceCondition = 'device_id = ?';
    } else if (targetType === 'machine') {
      deviceCondition = 'device_id IN (SELECT id FROM iot_devices WHERE machine_id = ?)';
    } else {
      deviceCondition = 'device_id IN (SELECT id FROM iot_devices WHERE production_line_id = ?)';
    }
    
    const workOrderResult = await db.execute({
      sql: `SELECT 
              COUNT(*) as total_work_orders,
              AVG(TIMESTAMPDIFF(MINUTE, created_at, completed_at)) as avg_repair_time_wo,
              MIN(TIMESTAMPDIFF(MINUTE, created_at, completed_at)) as min_repair_time_wo,
              MAX(TIMESTAMPDIFF(MINUTE, created_at, completed_at)) as max_repair_time_wo,
              STDDEV(TIMESTAMPDIFF(MINUTE, created_at, completed_at)) as std_repair_time_wo,
              SUM(actual_duration) as total_actual_duration
            FROM iot_maintenance_work_orders
            WHERE ${deviceCondition}
              AND status = 'completed'
              AND completed_at IS NOT NULL
              AND created_at >= ? AND created_at <= ?`,
      args: [
        targetId,
        periodStart.toISOString().slice(0, 19).replace('T', ' '),
        periodEnd.toISOString().slice(0, 19).replace('T', ' '),
      ],
    } as any);
    
    const woStats = ((workOrderResult as any).rows || [])[0] || {};
    
    // Third, calculate MTBF from work orders (time between corrective work orders)
    const mtbfResult = await db.execute({
      sql: `SELECT 
              created_at
            FROM iot_maintenance_work_orders
            WHERE ${deviceCondition}
              AND work_order_type IN ('corrective', 'emergency')
              AND created_at >= ? AND created_at <= ?
            ORDER BY created_at ASC`,
      args: [
        targetId,
        periodStart.toISOString().slice(0, 19).replace('T', ' '),
        periodEnd.toISOString().slice(0, 19).replace('T', ' '),
      ],
    } as any);
    
    const woTimestamps = ((mtbfResult as any).rows || []).map((r: any) => new Date(r.created_at).getTime());
    
    // Calculate time between failures from work orders
    let mtbfFromWo = 0;
    let mtbfMinWo = 0;
    let mtbfMaxWo = 0;
    const timeBetweenFailures: number[] = [];
    
    if (woTimestamps.length > 1) {
      for (let i = 1; i < woTimestamps.length; i++) {
        const diffHours = (woTimestamps[i] - woTimestamps[i-1]) / (1000 * 60 * 60);
        timeBetweenFailures.push(diffHours);
      }
      mtbfFromWo = timeBetweenFailures.reduce((a, b) => a + b, 0) / timeBetweenFailures.length;
      mtbfMinWo = Math.min(...timeBetweenFailures);
      mtbfMaxWo = Math.max(...timeBetweenFailures);
    }
    
    // Calculate total period hours
    const periodHours = (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60);
    const totalDowntimeHours = (Number(failureStats.total_downtime) || 0) / 60;
    const totalUptimeHours = periodHours - totalDowntimeHours;
    
    // Combine data: prioritize work order data if available, fallback to failure events
    const hasWorkOrderData = Number(woStats.total_work_orders) > 0;
    const hasFailureData = Number(failureStats.total_failures) > 0;
    
    // MTTR: prefer work order actual data
    const mttr = hasWorkOrderData 
      ? Number(woStats.avg_repair_time_wo) || 0
      : Number(failureStats.avg_repair_time) || 0;
    const mttrMin = hasWorkOrderData
      ? Number(woStats.min_repair_time_wo) || 0
      : Number(failureStats.min_repair_time) || 0;
    const mttrMax = hasWorkOrderData
      ? Number(woStats.max_repair_time_wo) || 0
      : Number(failureStats.max_repair_time) || 0;
    const mttrStdDev = hasWorkOrderData
      ? Number(woStats.std_repair_time_wo) || 0
      : Number(failureStats.std_repair_time) || 0;
    
    // MTBF: combine both sources
    const mtbfFromFailure = Number(failureStats.avg_time_between_failures) || 0;
    const mtbf = mtbfFromWo > 0 ? mtbfFromWo : mtbfFromFailure;
    const mtbfMin = mtbfMinWo > 0 ? mtbfMinWo : Number(failureStats.min_time_between_failures) || 0;
    const mtbfMax = mtbfMaxWo > 0 ? mtbfMaxWo : Number(failureStats.max_time_between_failures) || 0;
    const mtbfStdDev = Number(failureStats.std_time_between_failures) || 0;
    
    // Availability = MTBF / (MTBF + MTTR/60)
    const availability = mtbf > 0 ? mtbf / (mtbf + mttr / 60) : 0;
    
    // Total failures = max of both sources
    const totalFailures = Math.max(
      Number(failureStats.total_failures) || 0,
      Number(woStats.total_work_orders) || 0
    );
    
    return {
      mttr,
      mttrMin,
      mttrMax,
      mttrStdDev,
      mtbf,
      mtbfMin,
      mtbfMax,
      mtbfStdDev,
      availability,
      totalFailures,
      totalDowntimeMinutes: Number(failureStats.total_downtime) || Number(woStats.total_actual_duration) || 0,
      totalUptimeHours,
      // Additional data source info
      dataSource: {
        failureEvents: hasFailureData,
        workOrders: hasWorkOrderData,
        workOrderCount: Number(woStats.total_work_orders) || 0,
        failureEventCount: Number(failureStats.total_failures) || 0,
      },
    };
  } catch (error) {
    console.error('[DB] Error calculating MTTR/MTBF:', error);
    return null;
  }
}

// Get work order counts by type for MTTR/MTBF report
export async function getWorkOrderCountsByType(targetType: string, targetId: number, periodStart: Date, periodEnd: Date) {
  const db = await getDb();
  try {
    // Map target type to appropriate table/column
    let deviceCondition = '';
    if (targetType === 'device') {
      deviceCondition = 'device_id = ?';
    } else if (targetType === 'machine') {
      deviceCondition = 'device_id IN (SELECT id FROM iot_devices WHERE machine_id = ?)';
    } else {
      deviceCondition = 'device_id IN (SELECT id FROM iot_devices WHERE production_line_id = ?)';
    }
    
    const result = await db.execute({
      sql: `SELECT 
              work_order_type,
              COUNT(*) as count,
              SUM(actual_cost) as total_cost,
              SUM(actual_duration) as total_duration
            FROM iot_maintenance_work_orders
            WHERE ${deviceCondition}
              AND created_at >= ? AND created_at <= ?
            GROUP BY work_order_type`,
      args: [
        targetId,
        periodStart.toISOString().slice(0, 19).replace('T', ' '),
        periodEnd.toISOString().slice(0, 19).replace('T', ' '),
      ],
    } as any);
    
    const counts: Record<string, number> = {
      corrective: 0,
      preventive: 0,
      predictive: 0,
      emergency: 0,
      inspection: 0,
    };
    let totalLaborCost = 0;
    
    for (const row of (result as any).rows || []) {
      counts[row.work_order_type] = Number(row.count) || 0;
      totalLaborCost += Number(row.total_cost) || 0;
    }
    
    return {
      correctiveWorkOrders: counts.corrective,
      preventiveWorkOrders: counts.preventive,
      predictiveWorkOrders: counts.predictive,
      emergencyWorkOrders: counts.emergency,
      totalLaborCost,
    };
  } catch (error) {
    console.error('[DB] Error getting work order counts:', error);
    return {
      correctiveWorkOrders: 0,
      preventiveWorkOrders: 0,
      predictiveWorkOrders: 0,
      emergencyWorkOrders: 0,
      totalLaborCost: 0,
    };
  }
}


// ===== LOGIN CUSTOMIZATION FUNCTIONS =====

export async function getLoginCustomization(): Promise<{
  id: number;
  logoUrl: string | null;
  logoAlt: string;
  welcomeTitle: string;
  welcomeSubtitle: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundGradient: string | null;
  footerText: string | null;
  showOauth: boolean;
  showRegister: boolean;
  customCss: string | null;
} | null> {
  const db = await getDb();
  if (!db) return null;
  
  const [rows] = await db.execute(
    `SELECT id, logo_url as logoUrl, logo_alt as logoAlt, welcome_title as welcomeTitle, 
     welcome_subtitle as welcomeSubtitle, primary_color as primaryColor, 
     secondary_color as secondaryColor, background_gradient as backgroundGradient,
     footer_text as footerText, show_oauth as showOauth, show_register as showRegister,
     custom_css as customCss
     FROM login_customization WHERE id = 1`
  );
  
  const result = rows as any[];
  if (!result.length) {
    return {
      id: 1,
      logoUrl: null,
      logoAlt: "Logo",
      welcomeTitle: "Chào mừng",
      welcomeSubtitle: "Đăng nhập để tiếp tục",
      primaryColor: "#3b82f6",
      secondaryColor: "#1e40af",
      backgroundGradient: null,
      footerText: null,
      showOauth: true,
      showRegister: true,
      customCss: null,
    };
  }
  
  return result[0];
}

export async function updateLoginCustomization(data: {
  logoUrl?: string | null;
  logoAlt?: string;
  welcomeTitle?: string;
  welcomeSubtitle?: string;
  primaryColor?: string;
  secondaryColor?: string;
  backgroundGradient?: string | null;
  footerText?: string | null;
  showOauth?: boolean;
  showRegister?: boolean;
  customCss?: string | null;
  updatedBy: number;
}): Promise<{ success: boolean }> {
  const db = await getDb();
  if (!db) return { success: false };
  
  const updates: string[] = [];
  
  if (data.logoUrl !== undefined) updates.push(`logo_url = ${data.logoUrl ? `'${data.logoUrl}'` : 'NULL'}`);
  if (data.logoAlt !== undefined) updates.push(`logo_alt = '${data.logoAlt}'`);
  if (data.welcomeTitle !== undefined) updates.push(`welcome_title = '${data.welcomeTitle}'`);
  if (data.welcomeSubtitle !== undefined) updates.push(`welcome_subtitle = '${data.welcomeSubtitle}'`);
  if (data.primaryColor !== undefined) updates.push(`primary_color = '${data.primaryColor}'`);
  if (data.secondaryColor !== undefined) updates.push(`secondary_color = '${data.secondaryColor}'`);
  if (data.backgroundGradient !== undefined) updates.push(`background_gradient = ${data.backgroundGradient ? `'${data.backgroundGradient}'` : 'NULL'}`);
  if (data.footerText !== undefined) updates.push(`footer_text = ${data.footerText ? `'${data.footerText}'` : 'NULL'}`);
  if (data.showOauth !== undefined) updates.push(`show_oauth = ${data.showOauth}`);
  if (data.showRegister !== undefined) updates.push(`show_register = ${data.showRegister}`);
  if (data.customCss !== undefined) updates.push(`custom_css = ${data.customCss ? `'${data.customCss}'` : 'NULL'}`);
  
  updates.push(`updated_at = ${Date.now()}`);
  updates.push(`updated_by = ${data.updatedBy}`);
  
  await db.execute(`UPDATE login_customization SET ${updates.join(", ")} WHERE id = 1`);
  
  return { success: true };
}


// ============================================
// Login Attempts & Account Lockout Functions
// ============================================

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;
const LOCKOUT_ESCALATION_MULTIPLIER = 2; // Double lockout time for each subsequent lockout

export async function recordLoginAttempt(data: {
  username: string;
  success: boolean;
  failureReason?: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const db = await getDb();
  if (!db) return;

  try {
    await db.execute(
      `INSERT INTO login_attempts (username, ip_address, user_agent, success, failure_reason, attempted_at)
       VALUES ('${data.username}', ${data.ipAddress ? `'${data.ipAddress}'` : 'NULL'}, ${data.userAgent ? `'${data.userAgent.substring(0, 500)}'` : 'NULL'}, ${data.success ? 1 : 0}, ${data.failureReason ? `'${data.failureReason}'` : 'NULL'}, NOW())`
    );
  } catch (error) {
    console.error("[LoginAttempts] Failed to record attempt:", error);
  }
}

export async function getRecentFailedAttempts(username: string, minutes: number = 30): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  try {
    const [rows] = await db.execute(
      `SELECT COUNT(*) as count FROM login_attempts 
       WHERE username = '${username}' 
       AND success = 0 
       AND attempted_at > DATE_SUB(NOW(), INTERVAL ${minutes} MINUTE)`
    );
    return (rows as any[])[0]?.count || 0;
  } catch (error) {
    console.error("[LoginAttempts] Failed to get recent attempts:", error);
    return 0;
  }
}

export async function isAccountLocked(username: string): Promise<{ locked: boolean; lockedUntil?: Date; reason?: string }> {
  const db = await getDb();
  if (!db) return { locked: false };

  try {
    const [rows] = await db.execute(
      `SELECT * FROM account_lockouts 
       WHERE username = '${username}' 
       AND locked_until > NOW() 
       AND unlocked_at IS NULL
       ORDER BY locked_at DESC LIMIT 1`
    );
    
    const result = rows as any[];
    if (result.length > 0) {
      return {
        locked: true,
        lockedUntil: new Date(result[0].locked_until),
        reason: result[0].reason,
      };
    }
    return { locked: false };
  } catch (error) {
    console.error("[AccountLockout] Failed to check lock status:", error);
    return { locked: false };
  }
}

export async function lockAccount(data: {
  userId: number;
  username: string;
  reason: string;
  failedAttempts: number;
}): Promise<{ success: boolean; lockedUntil: Date }> {
  const db = await getDb();
  if (!db) return { success: false, lockedUntil: new Date() };

  try {
    // Check previous lockouts to calculate escalation
    const [prevLockouts] = await db.execute(
      `SELECT COUNT(*) as count FROM account_lockouts WHERE username = '${data.username}'`
    );
    const lockoutCount = (prevLockouts as any[])[0]?.count || 0;
    
    // Calculate lockout duration with escalation
    const baseDuration = LOCKOUT_DURATION_MINUTES;
    const escalatedDuration = baseDuration * Math.pow(LOCKOUT_ESCALATION_MULTIPLIER, Math.min(lockoutCount, 5));
    
    const lockedUntil = new Date(Date.now() + escalatedDuration * 60 * 1000);
    
    await db.execute(
      `INSERT INTO account_lockouts (user_id, username, locked_at, locked_until, reason, failed_attempts)
       VALUES (${data.userId}, '${data.username}', NOW(), '${lockedUntil.toISOString().slice(0, 19).replace('T', ' ')}', '${data.reason}', ${data.failedAttempts})`
    );
    
    return { success: true, lockedUntil };
  } catch (error) {
    console.error("[AccountLockout] Failed to lock account:", error);
    return { success: false, lockedUntil: new Date() };
  }
}

export async function unlockAccount(username: string, unlockedBy: number): Promise<{ success: boolean }> {
  const db = await getDb();
  if (!db) return { success: false };

  try {
    await db.execute(
      `UPDATE account_lockouts 
       SET unlocked_at = NOW(), unlocked_by = ${unlockedBy} 
       WHERE username = '${username}' AND unlocked_at IS NULL`
    );
    return { success: true };
  } catch (error) {
    console.error("[AccountLockout] Failed to unlock account:", error);
    return { success: false };
  }
}

export async function getAccountLockoutHistory(params: {
  username?: string;
  page: number;
  pageSize: number;
}) {
  const db = await getDb();
  if (!db) return { lockouts: [], total: 0, totalPages: 0 };

  const { username, page, pageSize } = params;
  const offset = (page - 1) * pageSize;

  try {
    let whereClause = "";
    if (username) {
      whereClause = `WHERE username = '${username}'`;
    }

    const [rows] = await db.execute(
      `SELECT * FROM account_lockouts ${whereClause} ORDER BY locked_at DESC LIMIT ${pageSize} OFFSET ${offset}`
    );

    const [countRows] = await db.execute(
      `SELECT COUNT(*) as count FROM account_lockouts ${whereClause}`
    );
    const total = (countRows as any[])[0]?.count || 0;

    return {
      lockouts: rows as any[],
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  } catch (error) {
    console.error("[AccountLockout] Failed to get history:", error);
    return { lockouts: [], total: 0, totalPages: 0 };
  }
}

// ============================================
// Auth Audit Log Functions
// ============================================

export type AuthAuditEventType = 
  | 'login_success' | 'login_failed' | 'logout'
  | 'password_change' | 'password_reset'
  | '2fa_enabled' | '2fa_disabled' | '2fa_verified'
  | 'account_locked' | 'account_unlocked'
  | 'session_expired' | 'token_refresh';

export async function logAuthAuditEvent(data: {
  userId?: number;
  username?: string;
  eventType: AuthAuditEventType;
  authMethod?: 'local' | 'oauth' | '2fa';
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  severity?: 'info' | 'warning' | 'critical';
}) {
  const db = await getDb();
  if (!db) return;

  try {
    const detailsJson = data.details ? JSON.stringify(data.details) : null;
    const severity = data.severity || getSeverityForEvent(data.eventType);
    
    await db.execute(
      `INSERT INTO auth_audit_logs (user_id, username, event_type, auth_method, details, ip_address, user_agent, severity, created_at)
       VALUES (${data.userId || 'NULL'}, ${data.username ? `'${data.username}'` : 'NULL'}, '${data.eventType}', '${data.authMethod || 'local'}', ${detailsJson ? `'${detailsJson.replace(/'/g, "''")}'` : 'NULL'}, ${data.ipAddress ? `'${data.ipAddress}'` : 'NULL'}, ${data.userAgent ? `'${data.userAgent.substring(0, 500).replace(/'/g, "''")}'` : 'NULL'}, '${severity}', NOW())`
    );
  } catch (error) {
    console.error("[AuthAudit] Failed to log event:", error);
  }
}

function getSeverityForEvent(eventType: AuthAuditEventType): 'info' | 'warning' | 'critical' {
  switch (eventType) {
    case 'login_failed':
    case 'password_reset':
      return 'warning';
    case 'account_locked':
    case '2fa_disabled':
      return 'critical';
    default:
      return 'info';
  }
}

export async function getAuthAuditLogs(params: {
  userId?: number;
  username?: string;
  eventType?: AuthAuditEventType;
  severity?: 'info' | 'warning' | 'critical';
  startDate?: Date;
  endDate?: Date;
  page: number;
  pageSize: number;
}) {
  const db = await getDb();
  if (!db) return { logs: [], total: 0, totalPages: 0 };

  const { userId, username, eventType, severity, startDate, endDate, page, pageSize } = params;
  const offset = (page - 1) * pageSize;

  try {
    const conditions: string[] = [];
    if (userId) conditions.push(`user_id = ${userId}`);
    if (username) conditions.push(`username = '${username}'`);
    if (eventType) conditions.push(`event_type = '${eventType}'`);
    if (severity) conditions.push(`severity = '${severity}'`);
    if (startDate) conditions.push(`created_at >= '${startDate.toISOString().slice(0, 19).replace('T', ' ')}'`);
    if (endDate) conditions.push(`created_at <= '${endDate.toISOString().slice(0, 19).replace('T', ' ')}'`);

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows] = await db.execute(
      `SELECT * FROM auth_audit_logs ${whereClause} ORDER BY created_at DESC LIMIT ${pageSize} OFFSET ${offset}`
    );

    const [countRows] = await db.execute(
      `SELECT COUNT(*) as count FROM auth_audit_logs ${whereClause}`
    );
    const total = (countRows as any[])[0]?.count || 0;

    return {
      logs: rows as any[],
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  } catch (error) {
    console.error("[AuthAudit] Failed to get logs:", error);
    return { logs: [], total: 0, totalPages: 0 };
  }
}

export async function getAuthAuditStats(days: number = 30) {
  const db = await getDb();
  if (!db) return null;

  try {
    const [rows] = await db.execute(
      `SELECT 
        event_type,
        COUNT(*) as count,
        MAX(created_at) as last_occurrence
       FROM auth_audit_logs 
       WHERE created_at > DATE_SUB(NOW(), INTERVAL ${days} DAY)
       GROUP BY event_type`
    );

    const stats = rows as any[];
    return {
      totalEvents: stats.reduce((sum, s) => sum + Number(s.count), 0),
      loginSuccess: Number(stats.find(s => s.event_type === 'login_success')?.count || 0),
      loginFailed: Number(stats.find(s => s.event_type === 'login_failed')?.count || 0),
      passwordChanges: Number(stats.find(s => s.event_type === 'password_change')?.count || 0),
      passwordResets: Number(stats.find(s => s.event_type === 'password_reset')?.count || 0),
      twoFactorEnabled: Number(stats.find(s => s.event_type === '2fa_enabled')?.count || 0),
      twoFactorDisabled: Number(stats.find(s => s.event_type === '2fa_disabled')?.count || 0),
      accountLocked: Number(stats.find(s => s.event_type === 'account_locked')?.count || 0),
      accountUnlocked: Number(stats.find(s => s.event_type === 'account_unlocked')?.count || 0),
      byEventType: stats,
    };
  } catch (error) {
    console.error("[AuthAudit] Failed to get stats:", error);
    return null;
  }
}

export { MAX_LOGIN_ATTEMPTS, LOCKOUT_DURATION_MINUTES };


// ============================================
// Auth Audit Dashboard Functions
// ============================================

export async function getRecentFailedLoginsForDashboard(hours: number = 24) {
  const db = await getDb();
  if (!db) return { count: 0, recentAttempts: [] };

  try {
    // Get count of failed logins in the last X hours
    const [countRows] = await db.execute(
      `SELECT COUNT(*) as count FROM auth_audit_logs 
       WHERE event_type = 'login_failed' 
       AND created_at > DATE_SUB(NOW(), INTERVAL ${hours} HOUR)`
    );
    const count = (countRows as any[])[0]?.count || 0;

    // Get recent failed login attempts with details
    const [recentRows] = await db.execute(
      `SELECT id, user_id, username, ip_address, user_agent, details, created_at 
       FROM auth_audit_logs 
       WHERE event_type = 'login_failed' 
       AND created_at > DATE_SUB(NOW(), INTERVAL ${hours} HOUR)
       ORDER BY created_at DESC 
       LIMIT 10`
    );

    return {
      count: Number(count),
      recentAttempts: recentRows as any[],
    };
  } catch (error) {
    console.error("[AuthAudit] Failed to get recent failed logins:", error);
    return { count: 0, recentAttempts: [] };
  }
}

export async function getLockedAccountsForDashboard() {
  const db = await getDb();
  if (!db) return { count: 0, lockedAccounts: [] };

  try {
    // Get currently locked accounts (locked_until > NOW and not unlocked)
    const [rows] = await db.execute(
      `SELECT id, user_id, username, locked_at, locked_until, reason, failed_attempts 
       FROM account_lockouts 
       WHERE locked_until > NOW() 
       AND unlocked_at IS NULL
       ORDER BY locked_at DESC`
    );

    return {
      count: (rows as any[]).length,
      lockedAccounts: rows as any[],
    };
  } catch (error) {
    console.error("[AuthAudit] Failed to get locked accounts:", error);
    return { count: 0, lockedAccounts: [] };
  }
}

export async function getFailedLoginsTrend(days: number = 7) {
  const db = await getDb();
  if (!db) return [];

  try {
    const [rows] = await db.execute(
      `SELECT DATE(created_at) as date, COUNT(*) as count 
       FROM auth_audit_logs 
       WHERE event_type = 'login_failed' 
       AND created_at > DATE_SUB(NOW(), INTERVAL ${days} DAY)
       GROUP BY DATE(created_at)
       ORDER BY date ASC`
    );

    return rows as { date: string; count: number }[];
  } catch (error) {
    console.error("[AuthAudit] Failed to get failed logins trend:", error);
    return [];
  }
}

export async function getSecurityOverviewStats() {
  const db = await getDb();
  if (!db) return null;

  try {
    // Get stats for the last 24 hours and 7 days
    const [stats24h] = await db.execute(
      `SELECT 
        SUM(CASE WHEN event_type = 'login_failed' THEN 1 ELSE 0 END) as failed_logins_24h,
        SUM(CASE WHEN event_type = 'login_success' THEN 1 ELSE 0 END) as success_logins_24h,
        SUM(CASE WHEN event_type = 'account_locked' THEN 1 ELSE 0 END) as accounts_locked_24h
       FROM auth_audit_logs 
       WHERE created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)`
    );

    const [stats7d] = await db.execute(
      `SELECT 
        SUM(CASE WHEN event_type = 'login_failed' THEN 1 ELSE 0 END) as failed_logins_7d,
        SUM(CASE WHEN event_type = 'login_success' THEN 1 ELSE 0 END) as success_logins_7d,
        SUM(CASE WHEN event_type = 'account_locked' THEN 1 ELSE 0 END) as accounts_locked_7d
       FROM auth_audit_logs 
       WHERE created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)`
    );

    // Get currently locked accounts count
    const [lockedCount] = await db.execute(
      `SELECT COUNT(*) as count FROM account_lockouts 
       WHERE locked_until > NOW() AND unlocked_at IS NULL`
    );

    // Get critical events in last 24h
    const [criticalEvents] = await db.execute(
      `SELECT COUNT(*) as count FROM auth_audit_logs 
       WHERE severity = 'critical' 
       AND created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)`
    );

    const s24h = (stats24h as any[])[0] || {};
    const s7d = (stats7d as any[])[0] || {};

    return {
      failedLogins24h: Number(s24h.failed_logins_24h || 0),
      successLogins24h: Number(s24h.success_logins_24h || 0),
      accountsLocked24h: Number(s24h.accounts_locked_24h || 0),
      failedLogins7d: Number(s7d.failed_logins_7d || 0),
      successLogins7d: Number(s7d.success_logins_7d || 0),
      accountsLocked7d: Number(s7d.accounts_locked_7d || 0),
      currentlyLockedAccounts: Number((lockedCount as any[])[0]?.count || 0),
      criticalEvents24h: Number((criticalEvents as any[])[0]?.count || 0),
    };
  } catch (error) {
    console.error("[AuthAudit] Failed to get security overview stats:", error);
    return null;
  }
}

export async function getAuthAuditLogsWithUserInfo(params: {
  userId?: number;
  username?: string;
  eventType?: AuthAuditEventType;
  severity?: 'info' | 'warning' | 'critical';
  startDate?: Date;
  endDate?: Date;
  page: number;
  pageSize: number;
}) {
  const db = await getDb();
  if (!db) return { logs: [], total: 0, totalPages: 0 };

  const { userId, username, eventType, severity, startDate, endDate, page, pageSize } = params;
  const offset = (page - 1) * pageSize;

  try {
    const conditions: string[] = [];
    if (userId) conditions.push(`a.user_id = ${userId}`);
    if (username) conditions.push(`a.username LIKE '%${username}%'`);
    if (eventType) conditions.push(`a.event_type = '${eventType}'`);
    if (severity) conditions.push(`a.severity = '${severity}'`);
    if (startDate) conditions.push(`a.created_at >= '${startDate.toISOString().slice(0, 19).replace('T', ' ')}'`);
    if (endDate) conditions.push(`a.created_at <= '${endDate.toISOString().slice(0, 19).replace('T', ' ')}'`);

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows] = await db.execute(
      `SELECT a.*, u.name as user_name, u.email as user_email, u.avatar as user_avatar
       FROM auth_audit_logs a
       LEFT JOIN users u ON a.user_id = u.id
       ${whereClause} 
       ORDER BY a.created_at DESC 
       LIMIT ${pageSize} OFFSET ${offset}`
    );

    const [countRows] = await db.execute(
      `SELECT COUNT(*) as count FROM auth_audit_logs a ${whereClause}`
    );
    const total = (countRows as any[])[0]?.count || 0;

    return {
      logs: rows as any[],
      total: Number(total),
      totalPages: Math.ceil(Number(total) / pageSize),
    };
  } catch (error) {
    console.error("[AuthAudit] Failed to get logs with user info:", error);
    return { logs: [], total: 0, totalPages: 0 };
  }
}

// Get all users for filter dropdown
export async function getAllUsersForFilter() {
  const db = await getDb();
  if (!db) return [];

  try {
    const [rows] = await db.execute(
      `SELECT DISTINCT u.id, u.name, u.email, u.openId 
       FROM users u 
       ORDER BY u.name ASC`
    );
    return rows as { id: number; name: string | null; email: string | null; openId: string }[];
  } catch (error) {
    console.error("[AuthAudit] Failed to get users for filter:", error);
    return [];
  }
}


// ============= CAPACITY PLANS =============

// Get all capacity plans with filters
export async function getCapacityPlans(filters?: {
  workshopId?: number;
  productId?: number;
  startDate?: Date;
  endDate?: Date;
  status?: string;
}) {
  const db = await getDb();
  if (!db) return [];

  try {
    let query = `
      SELECT 
        cp.*,
        w.name as workshop_name,
        w.code as workshop_code,
        f.name as factory_name,
        p.name as product_name,
        p.code as product_code
      FROM capacity_plans cp
      LEFT JOIN workshops w ON cp.workshop_id = w.id
      LEFT JOIN factories f ON w.factory_id = f.id
      LEFT JOIN products p ON cp.product_id = p.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters?.workshopId) {
      query += ` AND cp.workshop_id = ?`;
      params.push(filters.workshopId);
    }
    if (filters?.productId) {
      query += ` AND cp.product_id = ?`;
      params.push(filters.productId);
    }
    if (filters?.startDate) {
      query += ` AND cp.plan_date >= ?`;
      params.push(filters.startDate.toISOString().split('T')[0]);
    }
    if (filters?.endDate) {
      query += ` AND cp.plan_date <= ?`;
      params.push(filters.endDate.toISOString().split('T')[0]);
    }
    if (filters?.status) {
      query += ` AND cp.status = ?`;
      params.push(filters.status);
    }

    query += ` ORDER BY cp.plan_date DESC, cp.workshop_id ASC`;

    const [rows] = await db.execute(query, params);
    return rows as any[];
  } catch (error) {
    console.error("[CapacityPlans] Failed to get capacity plans:", error);
    return [];
  }
}

// Create capacity plan
export async function createCapacityPlan(data: {
  workshopId: number;
  productId?: number;
  planDate: string;
  plannedCapacity: number;
  targetEfficiency?: number;
  shiftType?: string;
  notes?: string;
  createdBy?: number;
}) {
  const db = await getDb();
  if (!db) return null;

  try {
    const [result] = await db.execute(
      `INSERT INTO capacity_plans 
        (workshop_id, product_id, plan_date, planned_capacity, target_efficiency, shift_type, notes, created_by, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft')`,
      [
        data.workshopId,
        data.productId || null,
        data.planDate,
        data.plannedCapacity,
        data.targetEfficiency || 85.00,
        data.shiftType || 'full_day',
        data.notes || null,
        data.createdBy || null
      ]
    );
    return (result as any).insertId;
  } catch (error) {
    console.error("[CapacityPlans] Failed to create capacity plan:", error);
    return null;
  }
}

// Update capacity plan
export async function updateCapacityPlan(id: number, data: {
  plannedCapacity?: number;
  actualCapacity?: number;
  targetEfficiency?: number;
  actualEfficiency?: number;
  shiftType?: string;
  notes?: string;
  status?: string;
  approvedBy?: number;
}) {
  const db = await getDb();
  if (!db) return false;

  try {
    const updates: string[] = [];
    const params: any[] = [];

    if (data.plannedCapacity !== undefined) {
      updates.push('planned_capacity = ?');
      params.push(data.plannedCapacity);
    }
    if (data.actualCapacity !== undefined) {
      updates.push('actual_capacity = ?');
      params.push(data.actualCapacity);
      // Calculate actual efficiency
      const [rows] = await db.execute(
        `SELECT planned_capacity FROM capacity_plans WHERE id = ?`,
        [id]
      );
      const plan = (rows as any[])[0];
      if (plan && plan.planned_capacity > 0) {
        const efficiency = (data.actualCapacity / plan.planned_capacity) * 100;
        updates.push('actual_efficiency = ?');
        params.push(efficiency.toFixed(2));
      }
    }
    if (data.targetEfficiency !== undefined) {
      updates.push('target_efficiency = ?');
      params.push(data.targetEfficiency);
    }
    if (data.actualEfficiency !== undefined) {
      updates.push('actual_efficiency = ?');
      params.push(data.actualEfficiency);
    }
    if (data.shiftType !== undefined) {
      updates.push('shift_type = ?');
      params.push(data.shiftType);
    }
    if (data.notes !== undefined) {
      updates.push('notes = ?');
      params.push(data.notes);
    }
    if (data.status !== undefined) {
      updates.push('status = ?');
      params.push(data.status);
      if (data.status === 'approved' && data.approvedBy) {
        updates.push('approved_by = ?');
        params.push(data.approvedBy);
        updates.push('approved_at = NOW()');
      }
    }

    if (updates.length === 0) return false;

    params.push(id);
    await db.execute(
      `UPDATE capacity_plans SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
    return true;
  } catch (error) {
    console.error("[CapacityPlans] Failed to update capacity plan:", error);
    return false;
  }
}

// Delete capacity plan
export async function deleteCapacityPlan(id: number) {
  const db = await getDb();
  if (!db) return false;

  try {
    await db.execute(`DELETE FROM capacity_plan_history WHERE capacity_plan_id = ?`, [id]);
    await db.execute(`DELETE FROM capacity_plans WHERE id = ?`, [id]);
    return true;
  } catch (error) {
    console.error("[CapacityPlans] Failed to delete capacity plan:", error);
    return false;
  }
}

// Get capacity comparison data for workshops
export async function getCapacityComparison(filters?: {
  factoryId?: number;
  workshopId?: number;
  startDate?: Date;
  endDate?: Date;
}) {
  const db = await getDb();
  if (!db) return [];

  try {
    let query = `
      SELECT 
        w.id as workshop_id,
        w.name as workshop_name,
        w.code as workshop_code,
        f.name as factory_name,
        cp.plan_date,
        SUM(cp.planned_capacity) as total_planned,
        SUM(cp.actual_capacity) as total_actual,
        AVG(cp.target_efficiency) as avg_target_efficiency,
        AVG(cp.actual_efficiency) as avg_actual_efficiency,
        COUNT(cp.id) as plan_count
      FROM workshops w
      LEFT JOIN factories f ON w.factory_id = f.id
      LEFT JOIN capacity_plans cp ON w.id = cp.workshop_id
      WHERE w.is_active = 1
    `;
    const params: any[] = [];

    if (filters?.factoryId) {
      query += ` AND w.factory_id = ?`;
      params.push(filters.factoryId);
    }
    if (filters?.workshopId) {
      query += ` AND w.id = ?`;
      params.push(filters.workshopId);
    }
    if (filters?.startDate) {
      query += ` AND cp.plan_date >= ?`;
      params.push(filters.startDate.toISOString().split('T')[0]);
    }
    if (filters?.endDate) {
      query += ` AND cp.plan_date <= ?`;
      params.push(filters.endDate.toISOString().split('T')[0]);
    }

    query += ` GROUP BY w.id, w.name, w.code, f.name, cp.plan_date`;
    query += ` ORDER BY w.name ASC, cp.plan_date DESC`;

    const [rows] = await db.execute(query, params);
    return rows as any[];
  } catch (error) {
    console.error("[CapacityPlans] Failed to get capacity comparison:", error);
    return [];
  }
}

// Get capacity summary by workshop
export async function getCapacitySummaryByWorkshop(filters?: {
  factoryId?: number;
  startDate?: Date;
  endDate?: Date;
}) {
  const db = await getDb();
  if (!db) return [];

  try {
    let query = `
      SELECT 
        w.id as workshop_id,
        w.name as workshop_name,
        w.code as workshop_code,
        w.capacity as max_capacity,
        f.name as factory_name,
        COALESCE(SUM(cp.planned_capacity), 0) as total_planned,
        COALESCE(SUM(cp.actual_capacity), 0) as total_actual,
        COALESCE(AVG(cp.actual_efficiency), 0) as avg_efficiency,
        COUNT(cp.id) as plan_count,
        SUM(CASE WHEN cp.actual_capacity >= cp.planned_capacity THEN 1 ELSE 0 END) as achieved_count
      FROM workshops w
      LEFT JOIN factories f ON w.factory_id = f.id
      LEFT JOIN capacity_plans cp ON w.id = cp.workshop_id
    `;
    const params: any[] = [];
    const conditions: string[] = ['w.is_active = 1'];

    if (filters?.factoryId) {
      conditions.push(`w.factory_id = ?`);
      params.push(filters.factoryId);
    }
    if (filters?.startDate) {
      conditions.push(`(cp.plan_date IS NULL OR cp.plan_date >= ?)`);
      params.push(filters.startDate.toISOString().split('T')[0]);
    }
    if (filters?.endDate) {
      conditions.push(`(cp.plan_date IS NULL OR cp.plan_date <= ?)`);
      params.push(filters.endDate.toISOString().split('T')[0]);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` GROUP BY w.id, w.name, w.code, w.capacity, f.name`;
    query += ` ORDER BY f.name ASC, w.name ASC`;

    const [rows] = await db.execute(query, params);
    return (rows as any[]).map(row => ({
      ...row,
      achievementRate: row.plan_count > 0 ? (row.achieved_count / row.plan_count * 100).toFixed(1) : 0,
      utilizationRate: row.total_planned > 0 ? (row.total_actual / row.total_planned * 100).toFixed(1) : 0
    }));
  } catch (error) {
    console.error("[CapacityPlans] Failed to get capacity summary:", error);
    return [];
  }
}


// ============================================================
// PHASE 12 - Dashboard Customization & Batch Image Analysis
// ============================================================

// Widget Templates
export async function getWidgetTemplates(filters?: { category?: string; isActive?: boolean }) {
  try {
    const db = await getDbConnection();
    let query = `SELECT * FROM widget_templates WHERE 1=1`;
    const params: any[] = [];
    
    if (filters?.category) {
      query += ` AND category = ?`;
      params.push(filters.category);
    }
    if (filters?.isActive !== undefined) {
      query += ` AND is_active = ?`;
      params.push(filters.isActive ? 1 : 0);
    }
    
    query += ` ORDER BY display_order ASC, name ASC`;
    const [rows] = await db.execute(query, params);
    return rows as any[];
  } catch (error) {
    console.error("[WidgetTemplates] Failed to get templates:", error);
    return [];
  }
}

export async function getWidgetTemplateByKey(key: string) {
  try {
    const db = await getDbConnection();
    const [rows] = await db.execute(
      `SELECT * FROM widget_templates WHERE \`key\` = ? LIMIT 1`,
      [key]
    );
    return (rows as any[])[0] || null;
  } catch (error) {
    console.error("[WidgetTemplates] Failed to get template by key:", error);
    return null;
  }
}

// Dashboard Widget Configs
export async function getUserDashboardWidgets(userId: number, dashboardId?: number) {
  try {
    const db = await getDbConnection();
    let query = `
      SELECT dwc.*, wt.key as widget_key, wt.name as widget_name, wt.category, 
             wt.component_name, wt.default_config, wt.min_width, wt.min_height,
             wt.max_width, wt.max_height
      FROM dashboard_widget_configs dwc
      JOIN widget_templates wt ON dwc.widget_template_id = wt.id
      WHERE dwc.user_id = ? AND dwc.is_visible = 1
    `;
    const params: any[] = [userId];
    
    if (dashboardId) {
      query += ` AND dwc.dashboard_id = ?`;
      params.push(dashboardId);
    } else {
      query += ` AND (dwc.dashboard_id IS NULL OR dwc.dashboard_id = 0)`;
    }
    
    query += ` ORDER BY dwc.grid_y ASC, dwc.grid_x ASC`;
    const [rows] = await db.execute(query, params);
    return rows as any[];
  } catch (error) {
    console.error("[DashboardWidgets] Failed to get user widgets:", error);
    return [];
  }
}

export async function saveUserDashboardWidget(data: {
  userId: number;
  widgetTemplateId: number;
  gridX: number;
  gridY: number;
  gridWidth: number;
  gridHeight: number;
  config?: any;
  dashboardId?: number;
}) {
  try {
    const db = await getDbConnection();
    const [result] = await db.execute(
      `INSERT INTO dashboard_widget_configs 
       (user_id, widget_template_id, grid_x, grid_y, grid_width, grid_height, config, dashboard_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.userId,
        data.widgetTemplateId,
        data.gridX,
        data.gridY,
        data.gridWidth,
        data.gridHeight,
        data.config ? JSON.stringify(data.config) : null,
        data.dashboardId || null
      ]
    );
    return (result as any).insertId;
  } catch (error) {
    console.error("[DashboardWidgets] Failed to save widget:", error);
    throw error;
  }
}

export async function updateUserDashboardWidget(id: number, userId: number, data: {
  gridX?: number;
  gridY?: number;
  gridWidth?: number;
  gridHeight?: number;
  config?: any;
  isVisible?: boolean;
}) {
  try {
    const db = await getDbConnection();
    const updates: string[] = [];
    const params: any[] = [];
    
    if (data.gridX !== undefined) {
      updates.push('grid_x = ?');
      params.push(data.gridX);
    }
    if (data.gridY !== undefined) {
      updates.push('grid_y = ?');
      params.push(data.gridY);
    }
    if (data.gridWidth !== undefined) {
      updates.push('grid_width = ?');
      params.push(data.gridWidth);
    }
    if (data.gridHeight !== undefined) {
      updates.push('grid_height = ?');
      params.push(data.gridHeight);
    }
    if (data.config !== undefined) {
      updates.push('config = ?');
      params.push(JSON.stringify(data.config));
    }
    if (data.isVisible !== undefined) {
      updates.push('is_visible = ?');
      params.push(data.isVisible ? 1 : 0);
    }
    
    if (updates.length === 0) return false;
    
    params.push(id, userId);
    await db.execute(
      `UPDATE dashboard_widget_configs SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      params
    );
    return true;
  } catch (error) {
    console.error("[DashboardWidgets] Failed to update widget:", error);
    return false;
  }
}

export async function deleteUserDashboardWidget(id: number, userId: number) {
  try {
    const db = await getDbConnection();
    await db.execute(
      `DELETE FROM dashboard_widget_configs WHERE id = ? AND user_id = ?`,
      [id, userId]
    );
    return true;
  } catch (error) {
    console.error("[DashboardWidgets] Failed to delete widget:", error);
    return false;
  }
}

export async function initializeDefaultWidgets(userId: number) {
  try {
    const db = await getDbConnection();
    
    // Check if user already has widgets
    const [existing] = await db.execute(
      `SELECT COUNT(*) as count FROM dashboard_widget_configs WHERE user_id = ?`,
      [userId]
    );
    if ((existing as any[])[0]?.count > 0) {
      return false; // Already initialized
    }
    
    // Get default widget templates
    const [templates] = await db.execute(
      `SELECT * FROM widget_templates WHERE is_default = 1 AND is_active = 1 ORDER BY display_order ASC`
    );
    
    // Calculate grid positions (4 columns layout)
    let gridX = 0;
    let gridY = 0;
    const gridCols = 12;
    
    for (const template of templates as any[]) {
      const width = template.default_width;
      const height = template.default_height;
      
      // Move to next row if doesn't fit
      if (gridX + width > gridCols) {
        gridX = 0;
        gridY += 2; // Assume max height of 2 for row
      }
      
      await db.execute(
        `INSERT INTO dashboard_widget_configs 
         (user_id, widget_template_id, grid_x, grid_y, grid_width, grid_height, config)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, template.id, gridX, gridY, width, height, template.default_config]
      );
      
      gridX += width;
    }
    
    return true;
  } catch (error) {
    console.error("[DashboardWidgets] Failed to initialize default widgets:", error);
    return false;
  }
}

// Batch Image Analysis Jobs
export async function createBatchImageJob(data: {
  userId: number;
  name: string;
  description?: string;
  analysisType: string;
  productCode?: string;
  productionLineId?: number;
  workstationId?: number;
  totalImages: number;
}) {
  try {
    const db = await getDbConnection();
    const [result] = await db.execute(
      `INSERT INTO batch_image_analysis_jobs 
       (user_id, name, description, analysis_type, product_code, production_line_id, workstation_id, total_images, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        data.userId,
        data.name,
        data.description || null,
        data.analysisType,
        data.productCode || null,
        data.productionLineId || null,
        data.workstationId || null,
        data.totalImages
      ]
    );
    return (result as any).insertId;
  } catch (error) {
    console.error("[BatchImageAnalysis] Failed to create job:", error);
    throw error;
  }
}

export async function getBatchImageJobs(userId: number, filters?: { status?: string; limit?: number }) {
  try {
    const db = await getDbConnection();
    let query = `SELECT * FROM batch_image_analysis_jobs WHERE user_id = ?`;
    const params: any[] = [userId];
    
    if (filters?.status) {
      query += ` AND status = ?`;
      params.push(filters.status);
    }
    
    query += ` ORDER BY created_at DESC`;
    
    if (filters?.limit) {
      query += ` LIMIT ?`;
      params.push(filters.limit);
    }
    
    const [rows] = await db.execute(query, params);
    return rows as any[];
  } catch (error) {
    console.error("[BatchImageAnalysis] Failed to get jobs:", error);
    return [];
  }
}

export async function getBatchImageJobById(jobId: number) {
  try {
    const db = await getDbConnection();
    const [rows] = await db.execute(
      `SELECT * FROM batch_image_analysis_jobs WHERE id = ?`,
      [jobId]
    );
    return (rows as any[])[0] || null;
  } catch (error) {
    console.error("[BatchImageAnalysis] Failed to get job:", error);
    return null;
  }
}

export async function updateBatchImageJob(jobId: number, data: {
  status?: string;
  processedImages?: number;
  successImages?: number;
  failedImages?: number;
  okCount?: number;
  ngCount?: number;
  warningCount?: number;
  avgQualityScore?: number;
  defectsSummary?: any;
  startedAt?: Date;
  completedAt?: Date;
  processingTimeMs?: number;
  errorMessage?: string;
}) {
  try {
    const db = await getDbConnection();
    const updates: string[] = [];
    const params: any[] = [];
    
    if (data.status) {
      updates.push('status = ?');
      params.push(data.status);
    }
    if (data.processedImages !== undefined) {
      updates.push('processed_images = ?');
      params.push(data.processedImages);
    }
    if (data.successImages !== undefined) {
      updates.push('success_images = ?');
      params.push(data.successImages);
    }
    if (data.failedImages !== undefined) {
      updates.push('failed_images = ?');
      params.push(data.failedImages);
    }
    if (data.okCount !== undefined) {
      updates.push('ok_count = ?');
      params.push(data.okCount);
    }
    if (data.ngCount !== undefined) {
      updates.push('ng_count = ?');
      params.push(data.ngCount);
    }
    if (data.warningCount !== undefined) {
      updates.push('warning_count = ?');
      params.push(data.warningCount);
    }
    if (data.avgQualityScore !== undefined) {
      updates.push('avg_quality_score = ?');
      params.push(data.avgQualityScore);
    }
    if (data.defectsSummary !== undefined) {
      updates.push('defects_summary = ?');
      params.push(JSON.stringify(data.defectsSummary));
    }
    if (data.startedAt) {
      updates.push('started_at = ?');
      params.push(data.startedAt);
    }
    if (data.completedAt) {
      updates.push('completed_at = ?');
      params.push(data.completedAt);
    }
    if (data.processingTimeMs !== undefined) {
      updates.push('processing_time_ms = ?');
      params.push(data.processingTimeMs);
    }
    if (data.errorMessage !== undefined) {
      updates.push('error_message = ?');
      params.push(data.errorMessage);
    }
    
    if (updates.length === 0) return false;
    
    params.push(jobId);
    await db.execute(
      `UPDATE batch_image_analysis_jobs SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
    return true;
  } catch (error) {
    console.error("[BatchImageAnalysis] Failed to update job:", error);
    return false;
  }
}

// Batch Image Items
export async function addBatchImageItem(data: {
  jobId: number;
  fileName: string;
  fileSize?: number;
  imageUrl: string;
  imageKey?: string;
  thumbnailUrl?: string;
  processOrder?: number;
}) {
  try {
    const db = await getDbConnection();
    const [result] = await db.execute(
      `INSERT INTO batch_image_items 
       (job_id, file_name, file_size, image_url, image_key, thumbnail_url, process_order, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        data.jobId,
        data.fileName,
        data.fileSize || null,
        data.imageUrl,
        data.imageKey || null,
        data.thumbnailUrl || null,
        data.processOrder || 0
      ]
    );
    return (result as any).insertId;
  } catch (error) {
    console.error("[BatchImageItems] Failed to add item:", error);
    throw error;
  }
}

export async function getBatchImageItems(jobId: number, filters?: { status?: string; limit?: number; offset?: number }) {
  try {
    const db = await getDbConnection();
    let query = `SELECT * FROM batch_image_items WHERE job_id = ?`;
    const params: any[] = [jobId];
    
    if (filters?.status) {
      query += ` AND status = ?`;
      params.push(filters.status);
    }
    
    query += ` ORDER BY process_order ASC, id ASC`;
    
    if (filters?.limit) {
      query += ` LIMIT ?`;
      params.push(filters.limit);
      if (filters?.offset) {
        query += ` OFFSET ?`;
        params.push(filters.offset);
      }
    }
    
    const [rows] = await db.execute(query, params);
    return rows as any[];
  } catch (error) {
    console.error("[BatchImageItems] Failed to get items:", error);
    return [];
  }
}

export async function updateBatchImageItem(itemId: number, data: {
  status?: string;
  result?: string;
  qualityScore?: number;
  confidence?: number;
  defectsFound?: number;
  defectTypes?: any;
  defectLocations?: any;
  aiAnalysis?: any;
  aiModelUsed?: string;
  processingTimeMs?: number;
  analyzedAt?: Date;
  errorMessage?: string;
  retryCount?: number;
}) {
  try {
    const db = await getDbConnection();
    const updates: string[] = [];
    const params: any[] = [];
    
    if (data.status) {
      updates.push('status = ?');
      params.push(data.status);
    }
    if (data.result) {
      updates.push('result = ?');
      params.push(data.result);
    }
    if (data.qualityScore !== undefined) {
      updates.push('quality_score = ?');
      params.push(data.qualityScore);
    }
    if (data.confidence !== undefined) {
      updates.push('confidence = ?');
      params.push(data.confidence);
    }
    if (data.defectsFound !== undefined) {
      updates.push('defects_found = ?');
      params.push(data.defectsFound);
    }
    if (data.defectTypes !== undefined) {
      updates.push('defect_types = ?');
      params.push(JSON.stringify(data.defectTypes));
    }
    if (data.defectLocations !== undefined) {
      updates.push('defect_locations = ?');
      params.push(JSON.stringify(data.defectLocations));
    }
    if (data.aiAnalysis !== undefined) {
      updates.push('ai_analysis = ?');
      params.push(JSON.stringify(data.aiAnalysis));
    }
    if (data.aiModelUsed) {
      updates.push('ai_model_used = ?');
      params.push(data.aiModelUsed);
    }
    if (data.processingTimeMs !== undefined) {
      updates.push('processing_time_ms = ?');
      params.push(data.processingTimeMs);
    }
    if (data.analyzedAt) {
      updates.push('analyzed_at = ?');
      params.push(data.analyzedAt);
    }
    if (data.errorMessage !== undefined) {
      updates.push('error_message = ?');
      params.push(data.errorMessage);
    }
    if (data.retryCount !== undefined) {
      updates.push('retry_count = ?');
      params.push(data.retryCount);
    }
    
    if (updates.length === 0) return false;
    
    params.push(itemId);
    await db.execute(
      `UPDATE batch_image_items SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
    return true;
  } catch (error) {
    console.error("[BatchImageItems] Failed to update item:", error);
    return false;
  }
}

export async function getNextPendingBatchItem(jobId: number) {
  try {
    const db = await getDbConnection();
    const [rows] = await db.execute(
      `SELECT * FROM batch_image_items 
       WHERE job_id = ? AND status = 'pending' 
       ORDER BY process_order ASC, id ASC 
       LIMIT 1`,
      [jobId]
    );
    return (rows as any[])[0] || null;
  } catch (error) {
    console.error("[BatchImageItems] Failed to get next pending item:", error);
    return null;
  }
}

export async function getBatchImageStats(jobId: number) {
  try {
    const db = await getDbConnection();
    const [rows] = await db.execute(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
        SUM(CASE WHEN result = 'ok' THEN 1 ELSE 0 END) as ok_count,
        SUM(CASE WHEN result = 'ng' THEN 1 ELSE 0 END) as ng_count,
        SUM(CASE WHEN result = 'warning' THEN 1 ELSE 0 END) as warning_count,
        AVG(quality_score) as avg_quality_score,
        SUM(defects_found) as total_defects
       FROM batch_image_items WHERE job_id = ?`,
      [jobId]
    );
    return (rows as any[])[0] || null;
  } catch (error) {
    console.error("[BatchImageItems] Failed to get stats:", error);
    return null;
  }
}

// ============================================
// Audit Log Dashboard Functions
// ============================================

/**
 * Get audit log statistics for dashboard
 */
export async function getAuditLogStats(filters?: {
  userId?: number;
  startDate?: string;
  endDate?: string;
}) {
  const db = await getDb();
  if (!db) return null;

  const conditions: any[] = [];
  if (filters?.userId) conditions.push(eq(auditLogs.userId, filters.userId));
  if (filters?.startDate) conditions.push(gte(auditLogs.createdAt, filters.startDate));
  if (filters?.endDate) conditions.push(lte(auditLogs.createdAt, filters.endDate));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalResult, actionStats, moduleStats, userStats, recentActivity] = await Promise.all([
    whereClause
      ? db.select({ count: sql<number>`count(*)` }).from(auditLogs).where(whereClause)
      : db.select({ count: sql<number>`count(*)` }).from(auditLogs),
    whereClause
      ? db.select({ action: auditLogs.action, count: sql<number>`count(*)` }).from(auditLogs).where(whereClause).groupBy(auditLogs.action).orderBy(sql`count(*) DESC`)
      : db.select({ action: auditLogs.action, count: sql<number>`count(*)` }).from(auditLogs).groupBy(auditLogs.action).orderBy(sql`count(*) DESC`),
    whereClause
      ? db.select({ module: auditLogs.module, count: sql<number>`count(*)` }).from(auditLogs).where(whereClause).groupBy(auditLogs.module).orderBy(sql`count(*) DESC`).limit(10)
      : db.select({ module: auditLogs.module, count: sql<number>`count(*)` }).from(auditLogs).groupBy(auditLogs.module).orderBy(sql`count(*) DESC`).limit(10),
    whereClause
      ? db.select({ userId: auditLogs.userId, userName: auditLogs.userName, count: sql<number>`count(*)` }).from(auditLogs).where(whereClause).groupBy(auditLogs.userId, auditLogs.userName).orderBy(sql`count(*) DESC`).limit(10)
      : db.select({ userId: auditLogs.userId, userName: auditLogs.userName, count: sql<number>`count(*)` }).from(auditLogs).groupBy(auditLogs.userId, auditLogs.userName).orderBy(sql`count(*) DESC`).limit(10),
    db.select({ hour: sql<string>`DATE_FORMAT(createdAt, '%Y-%m-%d %H:00:00')`, count: sql<number>`count(*)` }).from(auditLogs)
      .where(gte(auditLogs.createdAt, sql`DATE_SUB(NOW(), INTERVAL 24 HOUR)`))
      .groupBy(sql`DATE_FORMAT(createdAt, '%Y-%m-%d %H:00:00')`)
      .orderBy(sql`DATE_FORMAT(createdAt, '%Y-%m-%d %H:00:00')`),
  ]);

  return {
    total: totalResult[0]?.count || 0,
    byAction: actionStats,
    byModule: moduleStats,
    topUsers: userStats,
    recentActivity,
  };
}

export async function getAuditLogUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.selectDistinct({ userId: auditLogs.userId, userName: auditLogs.userName }).from(auditLogs).orderBy(auditLogs.userName);
}

export async function getAuditLogModules() {
  const db = await getDb();
  if (!db) return [];
  return db.selectDistinct({ module: auditLogs.module }).from(auditLogs).orderBy(auditLogs.module);
}

export async function getAuditLogsAdvanced(params: {
  page: number;
  pageSize: number;
  userId?: number;
  action?: string;
  module?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  authType?: string;
  sortOrder?: 'asc' | 'desc';
}) {
  const db = await getDb();
  if (!db) return { logs: [], total: 0, totalPages: 0, page: params.page, pageSize: params.pageSize };

  const { page, pageSize, userId, action, module, search, startDate, endDate, authType, sortOrder: sortDir = 'desc' } = params;
  const offset = (page - 1) * pageSize;

  const conditions: any[] = [];
  if (userId) conditions.push(eq(auditLogs.userId, userId));
  if (action && action !== 'all') conditions.push(eq(auditLogs.action, action as any));
  if (module && module !== 'all') conditions.push(eq(auditLogs.module, module));
  if (authType && authType !== 'all') conditions.push(eq(auditLogs.authType, authType as any));
  if (startDate) conditions.push(gte(auditLogs.createdAt, startDate));
  if (endDate) conditions.push(lte(auditLogs.createdAt, endDate));
  if (search) {
    conditions.push(sql`(${auditLogs.description} LIKE ${`%${search}%`} OR ${auditLogs.userName} LIKE ${`%${search}%`} OR ${auditLogs.tableName} LIKE ${`%${search}%`})`);
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const orderByClause = sortDir === 'asc' ? asc(auditLogs.createdAt) : desc(auditLogs.createdAt);

  const [logs, countResult] = await Promise.all([
    whereClause
      ? db.select().from(auditLogs).where(whereClause).orderBy(orderByClause).limit(pageSize).offset(offset)
      : db.select().from(auditLogs).orderBy(orderByClause).limit(pageSize).offset(offset),
    whereClause
      ? db.select({ count: sql<number>`count(*)` }).from(auditLogs).where(whereClause)
      : db.select({ count: sql<number>`count(*)` }).from(auditLogs),
  ]);

  const total = countResult[0]?.count || 0;
  return { logs, total, totalPages: Math.ceil(total / pageSize), page, pageSize };
}

export async function getAuditLogsForExport(params: {
  userId?: number;
  action?: string;
  module?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions: any[] = [];
  if (params.userId) conditions.push(eq(auditLogs.userId, params.userId));
  if (params.action && params.action !== 'all') conditions.push(eq(auditLogs.action, params.action as any));
  if (params.module && params.module !== 'all') conditions.push(eq(auditLogs.module, params.module));
  if (params.startDate) conditions.push(gte(auditLogs.createdAt, params.startDate));
  if (params.endDate) conditions.push(lte(auditLogs.createdAt, params.endDate));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const maxLimit = params.limit || 10000;

  return whereClause
    ? db.select().from(auditLogs).where(whereClause).orderBy(desc(auditLogs.createdAt)).limit(maxLimit)
    : db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(maxLimit);
}

// ─── Activity Heatmap Data ──────────────────────────────────────
export async function getActivityHeatmapData(params: {
  weeks?: number;
  userId?: number;
  action?: string;
  module?: string;
}): Promise<{
  heatmap: Array<{ dayOfWeek: number; hour: number; count: number }>;
  dailyTotals: Array<{ date: string; count: number }>;
  hourlyTotals: Array<{ hour: number; count: number }>;
  peakHour: number;
  peakDay: number;
  totalActivities: number;
  dateRange: { start: string; end: string };
}> {
  const db = await getDb();
  if (!db) return { heatmap: [], dailyTotals: [], hourlyTotals: [], peakHour: 0, peakDay: 0, totalActivities: 0, dateRange: { start: '', end: '' } };

  const weeks = params.weeks || 4;
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (weeks * 7));

  const conditions: any[] = [
    gte(auditLogs.createdAt, startDate),
    lte(auditLogs.createdAt, endDate),
  ];
  if (params.userId) conditions.push(eq(auditLogs.userId, params.userId));
  if (params.action) conditions.push(eq(auditLogs.action, params.action));
  if (params.module) conditions.push(eq(auditLogs.module, params.module));

  const logs = await db.select({ createdAt: auditLogs.createdAt })
    .from(auditLogs)
    .where(and(...conditions))
    .orderBy(asc(auditLogs.createdAt));

  const heatmapGrid: Record<string, number> = {};
  const dailyTotalsMap: Record<string, number> = {};
  const hourlyTotalsArr = new Array(24).fill(0);
  let totalActivities = 0;

  for (const log of logs) {
    if (!log.createdAt) continue;
    const date = new Date(log.createdAt);
    const dayOfWeek = date.getDay();
    const hour = date.getHours();
    const dateStr = date.toISOString().slice(0, 10);

    const key = `${dayOfWeek}-${hour}`;
    heatmapGrid[key] = (heatmapGrid[key] || 0) + 1;
    dailyTotalsMap[dateStr] = (dailyTotalsMap[dateStr] || 0) + 1;
    hourlyTotalsArr[hour]++;
    totalActivities++;
  }

  const heatmap: Array<{ dayOfWeek: number; hour: number; count: number }> = [];
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      heatmap.push({ dayOfWeek: day, hour, count: heatmapGrid[`${day}-${hour}`] || 0 });
    }
  }

  const dailyTotals = Object.entries(dailyTotalsMap)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const hourlyTotals = hourlyTotalsArr.map((count: number, hour: number) => ({ hour, count }));

  let peakHour = 0, peakHourCount = 0;
  hourlyTotals.forEach((h: { hour: number; count: number }) => {
    if (h.count > peakHourCount) { peakHour = h.hour; peakHourCount = h.count; }
  });

  const dayTotals = new Array(7).fill(0);
  heatmap.forEach(h => { dayTotals[h.dayOfWeek] += h.count; });
  let peakDay = 0, peakDayCount = 0;
  dayTotals.forEach((count: number, day: number) => {
    if (count > peakDayCount) { peakDay = day; peakDayCount = count; }
  });

  return {
    heatmap,
    dailyTotals,
    hourlyTotals,
    peakHour,
    peakDay,
    totalActivities,
    dateRange: { start: startDate.toISOString(), end: endDate.toISOString() },
  };
}
