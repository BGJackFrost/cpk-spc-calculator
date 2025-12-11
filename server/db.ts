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
  InsertProductionLineProduct
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
