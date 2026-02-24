/**
 * SPC Realtime Service - Xử lý lấy mẫu và tính toán SPC realtime
 * 
 * Service này chịu trách nhiệm:
 * 1. Lấy dữ liệu từ external database theo mapping
 * 2. Tính toán các chỉ số SPC (Mean, StdDev, UCL, LCL, Cp, Cpk, Pp, Ppk, Ca)
 * 3. Phát hiện vi phạm 8 SPC Rules
 * 4. Lưu kết quả vào database và gửi thông báo
 */

import { getDb } from "./db";
import { 
  spcRealtimeData, 
  spcSummaryStats, 
  spcSamplingPlans,
  productStationMappings,
  productSpecifications,
  spcPlanExecutionLogs,
  emailNotificationSettings
} from "../drizzle/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { notifyOwner } from "./_core/notification";

// Constants for SPC calculations
const A2_FACTORS: Record<number, number> = {
  2: 1.880, 3: 1.023, 4: 0.729, 5: 0.577,
  6: 0.483, 7: 0.419, 8: 0.373, 9: 0.337, 10: 0.308
};

const D3_FACTORS: Record<number, number> = {
  2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0.076, 8: 0.136, 9: 0.184, 10: 0.223
};

const D4_FACTORS: Record<number, number> = {
  2: 3.267, 3: 2.574, 4: 2.282, 5: 2.114,
  6: 2.004, 7: 1.924, 8: 1.864, 9: 1.816, 10: 1.777
};

const d2_FACTORS: Record<number, number> = {
  2: 1.128, 3: 1.693, 4: 2.059, 5: 2.326,
  6: 2.534, 7: 2.704, 8: 2.847, 9: 2.970, 10: 3.078
};

export interface SpcCalculationResult {
  mean: number;
  stdDev: number;
  range: number;
  min: number;
  max: number;
  ucl: number;
  lcl: number;
  xBarUcl: number;
  xBarLcl: number;
  rUcl: number;
  rLcl: number;
  cp: number | null;
  cpk: number | null;
  pp: number | null;
  ppk: number | null;
  ca: number | null;
  violations: SpcViolation[];
  overallStatus: "excellent" | "good" | "acceptable" | "needs_improvement" | "critical";
}

export interface SpcViolation {
  ruleNumber: number;
  ruleName: string;
  description: string;
  dataPointIndex: number;
  severity: "warning" | "critical";
}

export interface SubgroupData {
  index: number;
  values: number[];
  mean: number;
  range: number;
  timestamp: Date;
}

/**
 * Tính toán các chỉ số SPC từ dữ liệu subgroup
 */
export function calculateSpcMetrics(
  subgroups: SubgroupData[],
  usl: number | null,
  lsl: number | null,
  target: number | null,
  enabledSpcRules?: number[] // Array of enabled SPC rule numbers (1-8)
): SpcCalculationResult {
  if (subgroups.length === 0) {
    return {
      mean: 0, stdDev: 0, range: 0, min: 0, max: 0,
      ucl: 0, lcl: 0, xBarUcl: 0, xBarLcl: 0, rUcl: 0, rLcl: 0,
      cp: null, cpk: null, pp: null, ppk: null, ca: null,
      violations: [],
      overallStatus: "good"
    };
  }

  const n = subgroups[0].values.length; // Subgroup size
  const k = subgroups.length; // Number of subgroups

  // Calculate X-bar (grand mean)
  const xBar = subgroups.reduce((sum, sg) => sum + sg.mean, 0) / k;

  // Calculate R-bar (average range)
  const rBar = subgroups.reduce((sum, sg) => sum + sg.range, 0) / k;

  // All individual values
  const allValues = subgroups.flatMap(sg => sg.values);
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);

  // Calculate overall standard deviation (for Pp, Ppk)
  const overallStdDev = Math.sqrt(
    allValues.reduce((sum, v) => sum + Math.pow(v - xBar, 2), 0) / (allValues.length - 1)
  );

  // Estimate within-subgroup standard deviation (for Cp, Cpk)
  const d2 = d2_FACTORS[n] || 2.326;
  const withinStdDev = rBar / d2;

  // Control limits for X-bar chart
  const A2 = A2_FACTORS[n] || 0.577;
  const xBarUcl = xBar + A2 * rBar;
  const xBarLcl = xBar - A2 * rBar;

  // Control limits for R chart
  const D3 = D3_FACTORS[n] || 0;
  const D4 = D4_FACTORS[n] || 2.114;
  const rUcl = D4 * rBar;
  const rLcl = D3 * rBar;

  // Process capability indices
  let cp: number | null = null;
  let cpk: number | null = null;
  let pp: number | null = null;
  let ppk: number | null = null;
  let ca: number | null = null;

  if (usl !== null && lsl !== null && withinStdDev > 0) {
    // Cp = (USL - LSL) / (6 * sigma_within)
    cp = (usl - lsl) / (6 * withinStdDev);

    // Cpk = min(CPU, CPL)
    const cpu = (usl - xBar) / (3 * withinStdDev);
    const cpl = (xBar - lsl) / (3 * withinStdDev);
    cpk = Math.min(cpu, cpl);

    // Pp = (USL - LSL) / (6 * sigma_overall)
    if (overallStdDev > 0) {
      pp = (usl - lsl) / (6 * overallStdDev);

      // Ppk = min(PPU, PPL)
      const ppu = (usl - xBar) / (3 * overallStdDev);
      const ppl = (xBar - lsl) / (3 * overallStdDev);
      ppk = Math.min(ppu, ppl);
    }

    // Ca = (X-bar - Target) / ((USL - LSL) / 2) * 100%
    const targetValue = target ?? (usl + lsl) / 2;
    ca = Math.abs(xBar - targetValue) / ((usl - lsl) / 2);
  }

  // Detect violations (only check enabled rules)
  const violations = detectSpcViolations(subgroups, xBar, withinStdDev, xBarUcl, xBarLcl, usl, lsl, enabledSpcRules);

  // Determine overall status
  let overallStatus: "excellent" | "good" | "acceptable" | "needs_improvement" | "critical" = "good";
  if (cpk !== null) {
    if (cpk >= 1.67) overallStatus = "excellent";
    else if (cpk >= 1.33) overallStatus = "good";
    else if (cpk >= 1.0) overallStatus = "acceptable";
    else if (cpk >= 0.67) overallStatus = "needs_improvement";
    else overallStatus = "critical";
  }

  // Adjust status based on violations
  if (violations.some(v => v.severity === "critical")) {
    overallStatus = "critical";
  } else if (violations.length > 0 && overallStatus !== "critical") {
    overallStatus = overallStatus === "excellent" ? "good" : 
                    overallStatus === "good" ? "acceptable" : 
                    "needs_improvement";
  }

  return {
    mean: xBar,
    stdDev: withinStdDev,
    range: rBar,
    min,
    max,
    ucl: xBarUcl,
    lcl: xBarLcl,
    xBarUcl,
    xBarLcl,
    rUcl,
    rLcl,
    cp,
    cpk,
    pp,
    ppk,
    ca,
    violations,
    overallStatus
  };
}

/**
 * Phát hiện vi phạm 8 SPC Rules (Western Electric Rules)
 */
export function detectSpcViolations(
  subgroups: SubgroupData[],
  xBar: number,
  sigma: number,
  ucl: number,
  lcl: number,
  usl: number | null,
  lsl: number | null,
  enabledRules?: number[] // Array of enabled rule numbers (1-8), if undefined all rules are enabled
): SpcViolation[] {
  const violations: SpcViolation[] = [];
  const means = subgroups.map(sg => sg.mean);

  // Zone boundaries
  const zone1Upper = xBar + sigma;
  const zone1Lower = xBar - sigma;
  const zone2Upper = xBar + 2 * sigma;
  const zone2Lower = xBar - 2 * sigma;

  for (let i = 0; i < means.length; i++) {
    const value = means[i];

    // Rule 1: One point beyond 3 sigma (beyond UCL or LCL)
    if ((!enabledRules || enabledRules.includes(1)) && (value > ucl || value < lcl)) {
      violations.push({
        ruleNumber: 1,
        ruleName: "Beyond 3σ",
        description: `Điểm ${i + 1} vượt quá giới hạn kiểm soát (${value.toFixed(4)} ${value > ucl ? '>' : '<'} ${value > ucl ? ucl.toFixed(4) : lcl.toFixed(4)})`,
        dataPointIndex: i,
        severity: "critical"
      });
    }

    // Rule 2: Nine points in a row on same side of center line
    if ((!enabledRules || enabledRules.includes(2)) && i >= 8) {
      const last9 = means.slice(i - 8, i + 1);
      const allAbove = last9.every(v => v > xBar);
      const allBelow = last9.every(v => v < xBar);
      if (allAbove || allBelow) {
        violations.push({
          ruleNumber: 2,
          ruleName: "9 điểm liên tiếp cùng phía",
          description: `9 điểm liên tiếp (${i - 7} đến ${i + 1}) nằm ${allAbove ? 'trên' : 'dưới'} đường trung tâm`,
          dataPointIndex: i,
          severity: "warning"
        });
      }
    }

    // Rule 3: Six points in a row steadily increasing or decreasing
    if ((!enabledRules || enabledRules.includes(3)) && i >= 5) {
      const last6 = means.slice(i - 5, i + 1);
      let increasing = true;
      let decreasing = true;
      for (let j = 1; j < last6.length; j++) {
        if (last6[j] <= last6[j - 1]) increasing = false;
        if (last6[j] >= last6[j - 1]) decreasing = false;
      }
      if (increasing || decreasing) {
        violations.push({
          ruleNumber: 3,
          ruleName: "6 điểm tăng/giảm liên tục",
          description: `6 điểm liên tiếp (${i - 4} đến ${i + 1}) ${increasing ? 'tăng' : 'giảm'} liên tục`,
          dataPointIndex: i,
          severity: "warning"
        });
      }
    }

    // Rule 4: Fourteen points in a row alternating up and down
    if ((!enabledRules || enabledRules.includes(4)) && i >= 13) {
      const last14 = means.slice(i - 13, i + 1);
      let alternating = true;
      for (let j = 2; j < last14.length; j++) {
        const prev = last14[j - 1] - last14[j - 2];
        const curr = last14[j] - last14[j - 1];
        if (prev * curr >= 0) {
          alternating = false;
          break;
        }
      }
      if (alternating) {
        violations.push({
          ruleNumber: 4,
          ruleName: "14 điểm dao động",
          description: `14 điểm liên tiếp (${i - 12} đến ${i + 1}) dao động lên xuống xen kẽ`,
          dataPointIndex: i,
          severity: "warning"
        });
      }
    }

    // Rule 5: Two out of three points beyond 2 sigma on same side
    if ((!enabledRules || enabledRules.includes(5)) && i >= 2) {
      const last3 = means.slice(i - 2, i + 1);
      const above2Sigma = last3.filter(v => v > zone2Upper).length;
      const below2Sigma = last3.filter(v => v < zone2Lower).length;
      if (above2Sigma >= 2 || below2Sigma >= 2) {
        violations.push({
          ruleNumber: 5,
          ruleName: "2/3 điểm vượt 2σ",
          description: `2 trong 3 điểm gần nhất vượt quá vùng 2σ ${above2Sigma >= 2 ? 'phía trên' : 'phía dưới'}`,
          dataPointIndex: i,
          severity: "warning"
        });
      }
    }

    // Rule 6: Four out of five points beyond 1 sigma on same side
    if ((!enabledRules || enabledRules.includes(6)) && i >= 4) {
      const last5 = means.slice(i - 4, i + 1);
      const above1Sigma = last5.filter(v => v > zone1Upper).length;
      const below1Sigma = last5.filter(v => v < zone1Lower).length;
      if (above1Sigma >= 4 || below1Sigma >= 4) {
        violations.push({
          ruleNumber: 6,
          ruleName: "4/5 điểm vượt 1σ",
          description: `4 trong 5 điểm gần nhất vượt quá vùng 1σ ${above1Sigma >= 4 ? 'phía trên' : 'phía dưới'}`,
          dataPointIndex: i,
          severity: "warning"
        });
      }
    }

    // Rule 7: Fifteen points in a row within 1 sigma (stratification)
    if ((!enabledRules || enabledRules.includes(7)) && i >= 14) {
      const last15 = means.slice(i - 14, i + 1);
      const allWithin1Sigma = last15.every(v => v >= zone1Lower && v <= zone1Upper);
      if (allWithin1Sigma) {
        violations.push({
          ruleNumber: 7,
          ruleName: "15 điểm trong vùng 1σ",
          description: `15 điểm liên tiếp (${i - 13} đến ${i + 1}) nằm trong vùng 1σ - có thể có phân tầng`,
          dataPointIndex: i,
          severity: "warning"
        });
      }
    }

    // Rule 8: Eight points in a row beyond 1 sigma on either side (mixture)
    if ((!enabledRules || enabledRules.includes(8)) && i >= 7) {
      const last8 = means.slice(i - 7, i + 1);
      const allBeyond1Sigma = last8.every(v => v > zone1Upper || v < zone1Lower);
      if (allBeyond1Sigma) {
        violations.push({
          ruleNumber: 8,
          ruleName: "8 điểm ngoài vùng 1σ",
          description: `8 điểm liên tiếp (${i - 6} đến ${i + 1}) nằm ngoài vùng 1σ - có thể có hỗn hợp`,
          dataPointIndex: i,
          severity: "warning"
        });
      }
    }

    // Check against USL/LSL (specification limits)
    if (usl !== null && value > usl) {
      violations.push({
        ruleNumber: 9,
        ruleName: "Vượt USL",
        description: `Điểm ${i + 1} vượt quá giới hạn trên (${value.toFixed(4)} > USL ${usl.toFixed(4)})`,
        dataPointIndex: i,
        severity: "critical"
      });
    }
    if (lsl !== null && value < lsl) {
      violations.push({
        ruleNumber: 10,
        ruleName: "Dưới LSL",
        description: `Điểm ${i + 1} dưới giới hạn dưới (${value.toFixed(4)} < LSL ${lsl.toFixed(4)})`,
        dataPointIndex: i,
        severity: "critical"
      });
    }
  }

  // Remove duplicate violations for same point
  const uniqueViolations: SpcViolation[] = [];
  const seen = new Set<string>();
  for (const v of violations) {
    const key = `${v.ruleNumber}-${v.dataPointIndex}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueViolations.push(v);
    }
  }

  return uniqueViolations;
}

/**
 * Tạo dữ liệu subgroup từ mảng giá trị
 */
export function createSubgroups(values: number[], subgroupSize: number): SubgroupData[] {
  const subgroups: SubgroupData[] = [];
  
  for (let i = 0; i < values.length; i += subgroupSize) {
    const subgroupValues = values.slice(i, i + subgroupSize);
    if (subgroupValues.length === subgroupSize) {
      const mean = subgroupValues.reduce((a, b) => a + b, 0) / subgroupSize;
      const range = Math.max(...subgroupValues) - Math.min(...subgroupValues);
      subgroups.push({
        index: subgroups.length,
        values: subgroupValues,
        mean,
        range,
        timestamp: new Date()
      });
    }
  }
  
  return subgroups;
}

/**
 * Xác định trạng thái tổng thể dựa trên CPK
 */
export function getStatusFromCpk(cpk: number | null): "excellent" | "good" | "acceptable" | "needs_improvement" | "critical" {
  if (cpk === null) return "good";
  if (cpk >= 1.67) return "excellent";
  if (cpk >= 1.33) return "good";
  if (cpk >= 1.0) return "acceptable";
  if (cpk >= 0.67) return "needs_improvement";
  return "critical";
}
