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
  userPermissions
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

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(users);
}

export async function updateUserRole(userId: number, role: "user" | "admin") {
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
    { code: "dashboard.view", name: "Xem Dashboard", module: "dashboard" },
    { code: "dashboard.config", name: "Cấu hình Dashboard", module: "dashboard" },
    { code: "analyze.view", name: "Xem phân tích SPC", module: "analyze" },
    { code: "analyze.execute", name: "Thực hiện phân tích", module: "analyze" },
    { code: "analyze.export", name: "Xuất báo cáo", module: "analyze" },
    { code: "history.view", name: "Xem lịch sử", module: "history" },
    { code: "mapping.view", name: "Xem Mapping", module: "mapping" },
    { code: "mapping.manage", name: "Quản lý Mapping", module: "mapping" },
    { code: "product.view", name: "Xem sản phẩm", module: "product" },
    { code: "product.manage", name: "Quản lý sản phẩm", module: "product" },
    { code: "specification.view", name: "Xem tiêu chuẩn", module: "specification" },
    { code: "specification.manage", name: "Quản lý tiêu chuẩn", module: "specification" },
    { code: "production_line.view", name: "Xem dây chuyền", module: "production_line" },
    { code: "production_line.manage", name: "Quản lý dây chuyền", module: "production_line" },
    { code: "sampling.view", name: "Xem phương pháp lấy mẫu", module: "sampling" },
    { code: "sampling.manage", name: "Quản lý phương pháp lấy mẫu", module: "sampling" },
    { code: "spc_plan.view", name: "Xem kế hoạch SPC", module: "spc_plan" },
    { code: "spc_plan.manage", name: "Quản lý kế hoạch SPC", module: "spc_plan" },
    { code: "notification.view", name: "Xem thông báo", module: "notification" },
    { code: "notification.manage", name: "Quản lý thông báo", module: "notification" },
    { code: "user.view", name: "Xem người dùng", module: "user" },
    { code: "user.manage", name: "Quản lý người dùng", module: "user" },
    { code: "settings.view", name: "Xem cài đặt", module: "settings" },
    { code: "settings.manage", name: "Quản lý cài đặt", module: "settings" },
    { code: "permission.view", name: "Xem phân quyền", module: "permission" },
    { code: "permission.manage", name: "Quản lý phân quyền", module: "permission" },
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
