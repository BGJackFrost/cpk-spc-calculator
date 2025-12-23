/**
 * KPI Alert Threshold Service
 * Quản lý ngưỡng cảnh báo KPI tùy chỉnh cho từng dây chuyền
 */

import { getDb } from "../db";
import { kpiAlertThresholds, productionLines } from "../../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export interface KpiAlertThreshold {
  id: number;
  productionLineId: number;
  cpkWarning: number;
  cpkCritical: number;
  oeeWarning: number;
  oeeCritical: number;
  defectRateWarning: number;
  defectRateCritical: number;
  weeklyDeclineThreshold: number;
  emailAlertEnabled: boolean;
  alertEmails: string | null;
  createdBy: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface KpiAlertThresholdWithLine extends KpiAlertThreshold {
  lineName: string;
  lineCode: string;
}

export interface CreateKpiAlertThresholdInput {
  productionLineId: number;
  cpkWarning?: number;
  cpkCritical?: number;
  oeeWarning?: number;
  oeeCritical?: number;
  defectRateWarning?: number;
  defectRateCritical?: number;
  weeklyDeclineThreshold?: number;
  emailAlertEnabled?: boolean;
  alertEmails?: string;
  createdBy?: number;
}

export interface UpdateKpiAlertThresholdInput {
  cpkWarning?: number;
  cpkCritical?: number;
  oeeWarning?: number;
  oeeCritical?: number;
  defectRateWarning?: number;
  defectRateCritical?: number;
  weeklyDeclineThreshold?: number;
  emailAlertEnabled?: boolean;
  alertEmails?: string;
}

// Default thresholds
export const DEFAULT_THRESHOLDS = {
  cpkWarning: 1.33,
  cpkCritical: 1.0,
  oeeWarning: 75.0,
  oeeCritical: 60.0,
  defectRateWarning: 2.0,
  defectRateCritical: 5.0,
  weeklyDeclineThreshold: -5.0
};

/**
 * Get all KPI alert thresholds with production line info
 */
export async function getKpiAlertThresholds(): Promise<KpiAlertThresholdWithLine[]> {
  const db = await getDb();
  if (!db) return [];

  const results = await db
    .select({
      id: kpiAlertThresholds.id,
      productionLineId: kpiAlertThresholds.productionLineId,
      cpkWarning: kpiAlertThresholds.cpkWarning,
      cpkCritical: kpiAlertThresholds.cpkCritical,
      oeeWarning: kpiAlertThresholds.oeeWarning,
      oeeCritical: kpiAlertThresholds.oeeCritical,
      defectRateWarning: kpiAlertThresholds.defectRateWarning,
      defectRateCritical: kpiAlertThresholds.defectRateCritical,
      weeklyDeclineThreshold: kpiAlertThresholds.weeklyDeclineThreshold,
      emailAlertEnabled: kpiAlertThresholds.emailAlertEnabled,
      alertEmails: kpiAlertThresholds.alertEmails,
      createdBy: kpiAlertThresholds.createdBy,
      createdAt: kpiAlertThresholds.createdAt,
      updatedAt: kpiAlertThresholds.updatedAt,
      lineName: productionLines.name,
      lineCode: productionLines.code
    })
    .from(kpiAlertThresholds)
    .leftJoin(productionLines, eq(kpiAlertThresholds.productionLineId, productionLines.id))
    .orderBy(desc(kpiAlertThresholds.updatedAt));

  return results.map(r => ({
    ...r,
    cpkWarning: parseFloat(String(r.cpkWarning)),
    cpkCritical: parseFloat(String(r.cpkCritical)),
    oeeWarning: parseFloat(String(r.oeeWarning)),
    oeeCritical: parseFloat(String(r.oeeCritical)),
    defectRateWarning: parseFloat(String(r.defectRateWarning)),
    defectRateCritical: parseFloat(String(r.defectRateCritical)),
    weeklyDeclineThreshold: parseFloat(String(r.weeklyDeclineThreshold)),
    emailAlertEnabled: r.emailAlertEnabled === 1,
    lineName: r.lineName || "Unknown",
    lineCode: r.lineCode || "N/A"
  }));
}

/**
 * Get KPI alert threshold by production line ID
 */
export async function getKpiAlertThresholdByLineId(lineId: number): Promise<KpiAlertThreshold | null> {
  const db = await getDb();
  if (!db) return null;

  const results = await db
    .select()
    .from(kpiAlertThresholds)
    .where(eq(kpiAlertThresholds.productionLineId, lineId))
    .limit(1);

  if (results.length === 0) return null;

  const r = results[0];
  return {
    ...r,
    cpkWarning: parseFloat(String(r.cpkWarning)),
    cpkCritical: parseFloat(String(r.cpkCritical)),
    oeeWarning: parseFloat(String(r.oeeWarning)),
    oeeCritical: parseFloat(String(r.oeeCritical)),
    defectRateWarning: parseFloat(String(r.defectRateWarning)),
    defectRateCritical: parseFloat(String(r.defectRateCritical)),
    weeklyDeclineThreshold: parseFloat(String(r.weeklyDeclineThreshold)),
    emailAlertEnabled: r.emailAlertEnabled === 1
  };
}

/**
 * Get threshold by ID
 */
export async function getKpiAlertThresholdById(id: number): Promise<KpiAlertThreshold | null> {
  const db = await getDb();
  if (!db) return null;

  const results = await db
    .select()
    .from(kpiAlertThresholds)
    .where(eq(kpiAlertThresholds.id, id))
    .limit(1);

  if (results.length === 0) return null;

  const r = results[0];
  return {
    ...r,
    cpkWarning: parseFloat(String(r.cpkWarning)),
    cpkCritical: parseFloat(String(r.cpkCritical)),
    oeeWarning: parseFloat(String(r.oeeWarning)),
    oeeCritical: parseFloat(String(r.oeeCritical)),
    defectRateWarning: parseFloat(String(r.defectRateWarning)),
    defectRateCritical: parseFloat(String(r.defectRateCritical)),
    weeklyDeclineThreshold: parseFloat(String(r.weeklyDeclineThreshold)),
    emailAlertEnabled: r.emailAlertEnabled === 1
  };
}

/**
 * Get effective thresholds for a production line (returns defaults if not configured)
 */
export async function getEffectiveThresholds(lineId: number): Promise<typeof DEFAULT_THRESHOLDS & { emailAlertEnabled: boolean; alertEmails: string | null }> {
  const threshold = await getKpiAlertThresholdByLineId(lineId);
  
  if (threshold) {
    return {
      cpkWarning: threshold.cpkWarning,
      cpkCritical: threshold.cpkCritical,
      oeeWarning: threshold.oeeWarning,
      oeeCritical: threshold.oeeCritical,
      defectRateWarning: threshold.defectRateWarning,
      defectRateCritical: threshold.defectRateCritical,
      weeklyDeclineThreshold: threshold.weeklyDeclineThreshold,
      emailAlertEnabled: threshold.emailAlertEnabled,
      alertEmails: threshold.alertEmails
    };
  }

  return {
    ...DEFAULT_THRESHOLDS,
    emailAlertEnabled: true,
    alertEmails: null
  };
}

/**
 * Create new KPI alert threshold
 */
export async function createKpiAlertThreshold(input: CreateKpiAlertThresholdInput): Promise<KpiAlertThreshold> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if threshold already exists for this line
  const existing = await getKpiAlertThresholdByLineId(input.productionLineId);
  if (existing) {
    throw new Error(`Threshold already exists for production line ${input.productionLineId}`);
  }

  const result = await db.insert(kpiAlertThresholds).values({
    productionLineId: input.productionLineId,
    cpkWarning: String(input.cpkWarning ?? DEFAULT_THRESHOLDS.cpkWarning),
    cpkCritical: String(input.cpkCritical ?? DEFAULT_THRESHOLDS.cpkCritical),
    oeeWarning: String(input.oeeWarning ?? DEFAULT_THRESHOLDS.oeeWarning),
    oeeCritical: String(input.oeeCritical ?? DEFAULT_THRESHOLDS.oeeCritical),
    defectRateWarning: String(input.defectRateWarning ?? DEFAULT_THRESHOLDS.defectRateWarning),
    defectRateCritical: String(input.defectRateCritical ?? DEFAULT_THRESHOLDS.defectRateCritical),
    weeklyDeclineThreshold: String(input.weeklyDeclineThreshold ?? DEFAULT_THRESHOLDS.weeklyDeclineThreshold),
    emailAlertEnabled: input.emailAlertEnabled !== false ? 1 : 0,
    alertEmails: input.alertEmails || null,
    createdBy: input.createdBy || null
  });

  const insertId = result[0].insertId;
  const created = await getKpiAlertThresholdById(insertId);
  if (!created) throw new Error("Failed to create threshold");
  
  return created;
}

/**
 * Update KPI alert threshold
 */
export async function updateKpiAlertThreshold(id: number, input: UpdateKpiAlertThresholdInput): Promise<KpiAlertThreshold> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: Record<string, any> = {};
  
  if (input.cpkWarning !== undefined) updateData.cpkWarning = String(input.cpkWarning);
  if (input.cpkCritical !== undefined) updateData.cpkCritical = String(input.cpkCritical);
  if (input.oeeWarning !== undefined) updateData.oeeWarning = String(input.oeeWarning);
  if (input.oeeCritical !== undefined) updateData.oeeCritical = String(input.oeeCritical);
  if (input.defectRateWarning !== undefined) updateData.defectRateWarning = String(input.defectRateWarning);
  if (input.defectRateCritical !== undefined) updateData.defectRateCritical = String(input.defectRateCritical);
  if (input.weeklyDeclineThreshold !== undefined) updateData.weeklyDeclineThreshold = String(input.weeklyDeclineThreshold);
  if (input.emailAlertEnabled !== undefined) updateData.emailAlertEnabled = input.emailAlertEnabled ? 1 : 0;
  if (input.alertEmails !== undefined) updateData.alertEmails = input.alertEmails || null;

  await db.update(kpiAlertThresholds)
    .set(updateData)
    .where(eq(kpiAlertThresholds.id, id));

  const updated = await getKpiAlertThresholdById(id);
  if (!updated) throw new Error("Threshold not found");
  
  return updated;
}

/**
 * Delete KPI alert threshold
 */
export async function deleteKpiAlertThreshold(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  await db.delete(kpiAlertThresholds).where(eq(kpiAlertThresholds.id, id));
  return true;
}

/**
 * Get production lines without configured thresholds
 */
export async function getLinesWithoutThresholds(): Promise<Array<{ id: number; name: string; code: string }>> {
  const db = await getDb();
  if (!db) return [];

  const allLines = await db.select({
    id: productionLines.id,
    name: productionLines.name,
    code: productionLines.code
  }).from(productionLines);

  const configuredLineIds = await db.select({
    lineId: kpiAlertThresholds.productionLineId
  }).from(kpiAlertThresholds);

  const configuredIds = new Set(configuredLineIds.map(c => c.lineId));
  
  return allLines.filter(line => !configuredIds.has(line.id));
}

/**
 * Evaluate KPI against thresholds
 */
export function evaluateKpi(
  value: number | null,
  warningThreshold: number,
  criticalThreshold: number,
  isHigherBetter: boolean = true
): "excellent" | "good" | "warning" | "critical" | "unknown" {
  if (value === null) return "unknown";

  if (isHigherBetter) {
    // For CPK, OEE - higher is better
    if (value >= warningThreshold * 1.25) return "excellent";
    if (value >= warningThreshold) return "good";
    if (value >= criticalThreshold) return "warning";
    return "critical";
  } else {
    // For defect rate - lower is better
    if (value <= warningThreshold * 0.5) return "excellent";
    if (value <= warningThreshold) return "good";
    if (value <= criticalThreshold) return "warning";
    return "critical";
  }
}

/**
 * Check if KPI values trigger alerts based on thresholds
 */
export async function checkKpiAlerts(
  lineId: number,
  cpk: number | null,
  oee: number | null,
  defectRate: number | null,
  weeklyChange?: { cpk?: number; oee?: number }
): Promise<Array<{
  type: "cpk" | "oee" | "defect_rate" | "weekly_decline";
  level: "warning" | "critical";
  message: string;
  value: number;
  threshold: number;
}>> {
  const thresholds = await getEffectiveThresholds(lineId);
  const alerts: Array<{
    type: "cpk" | "oee" | "defect_rate" | "weekly_decline";
    level: "warning" | "critical";
    message: string;
    value: number;
    threshold: number;
  }> = [];

  // Check CPK
  if (cpk !== null) {
    if (cpk < thresholds.cpkCritical) {
      alerts.push({
        type: "cpk",
        level: "critical",
        message: `CPK (${cpk.toFixed(3)}) dưới ngưỡng nghiêm trọng (${thresholds.cpkCritical})`,
        value: cpk,
        threshold: thresholds.cpkCritical
      });
    } else if (cpk < thresholds.cpkWarning) {
      alerts.push({
        type: "cpk",
        level: "warning",
        message: `CPK (${cpk.toFixed(3)}) dưới ngưỡng cảnh báo (${thresholds.cpkWarning})`,
        value: cpk,
        threshold: thresholds.cpkWarning
      });
    }
  }

  // Check OEE
  if (oee !== null) {
    if (oee < thresholds.oeeCritical) {
      alerts.push({
        type: "oee",
        level: "critical",
        message: `OEE (${oee.toFixed(1)}%) dưới ngưỡng nghiêm trọng (${thresholds.oeeCritical}%)`,
        value: oee,
        threshold: thresholds.oeeCritical
      });
    } else if (oee < thresholds.oeeWarning) {
      alerts.push({
        type: "oee",
        level: "warning",
        message: `OEE (${oee.toFixed(1)}%) dưới ngưỡng cảnh báo (${thresholds.oeeWarning}%)`,
        value: oee,
        threshold: thresholds.oeeWarning
      });
    }
  }

  // Check Defect Rate
  if (defectRate !== null) {
    if (defectRate > thresholds.defectRateCritical) {
      alerts.push({
        type: "defect_rate",
        level: "critical",
        message: `Tỷ lệ lỗi (${defectRate.toFixed(2)}%) vượt ngưỡng nghiêm trọng (${thresholds.defectRateCritical}%)`,
        value: defectRate,
        threshold: thresholds.defectRateCritical
      });
    } else if (defectRate > thresholds.defectRateWarning) {
      alerts.push({
        type: "defect_rate",
        level: "warning",
        message: `Tỷ lệ lỗi (${defectRate.toFixed(2)}%) vượt ngưỡng cảnh báo (${thresholds.defectRateWarning}%)`,
        value: defectRate,
        threshold: thresholds.defectRateWarning
      });
    }
  }

  // Check weekly decline
  if (weeklyChange) {
    if (weeklyChange.cpk !== undefined && weeklyChange.cpk < thresholds.weeklyDeclineThreshold) {
      alerts.push({
        type: "weekly_decline",
        level: "warning",
        message: `CPK giảm ${Math.abs(weeklyChange.cpk).toFixed(1)}% so với tuần trước (ngưỡng: ${Math.abs(thresholds.weeklyDeclineThreshold)}%)`,
        value: weeklyChange.cpk,
        threshold: thresholds.weeklyDeclineThreshold
      });
    }
    if (weeklyChange.oee !== undefined && weeklyChange.oee < thresholds.weeklyDeclineThreshold) {
      alerts.push({
        type: "weekly_decline",
        level: "warning",
        message: `OEE giảm ${Math.abs(weeklyChange.oee).toFixed(1)}% so với tuần trước (ngưỡng: ${Math.abs(thresholds.weeklyDeclineThreshold)}%)`,
        value: weeklyChange.oee,
        threshold: thresholds.weeklyDeclineThreshold
      });
    }
  }

  return alerts;
}
