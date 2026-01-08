/**
 * SPC Telegram Alert Service
 * Tự động gửi thông báo Telegram khi có cảnh báo CPK/SPC
 */

import { sendTelegramAlert, getTelegramConfigs } from './telegramService';
import { wsServer } from '../websocket';

export interface CpkThresholds {
  critical: number;
  warning: number;
  good: number;
}

const DEFAULT_CPK_THRESHOLDS: CpkThresholds = {
  critical: 1.0,
  warning: 1.33,
  good: 1.67,
};

const ALERT_COOLDOWN = 5 * 60 * 1000;
const alertCooldownCache: Map<string, number> = new Map();

function shouldSendAlert(alertKey: string): boolean {
  const lastSent = alertCooldownCache.get(alertKey);
  if (!lastSent) return true;
  return Date.now() - lastSent > ALERT_COOLDOWN;
}

function markAlertSent(alertKey: string): void {
  alertCooldownCache.set(alertKey, Date.now());
}

export function getCpkSeverity(cpk: number, thresholds: CpkThresholds = DEFAULT_CPK_THRESHOLDS): 'critical' | 'warning' | 'good' | 'excellent' {
  if (cpk < thresholds.critical) return 'critical';
  if (cpk < thresholds.warning) return 'warning';
  if (cpk < thresholds.good) return 'good';
  return 'excellent';
}

export async function sendCpkTelegramAlert(data: {
  planId?: number;
  planName?: string;
  productCode: string;
  stationName: string;
  cpk: number;
  cp?: number;
  mean?: number;
  stdDev?: number;
  usl?: number;
  lsl?: number;
  sampleCount?: number;
  violations?: string[];
  thresholds?: CpkThresholds;
}): Promise<{ sent: boolean; reason?: string }> {
  const thresholds = data.thresholds || DEFAULT_CPK_THRESHOLDS;
  const severity = getCpkSeverity(data.cpk, thresholds);
  
  if (severity === 'good' || severity === 'excellent') {
    return { sent: false, reason: 'CPK trong ngưỡng cho phép' };
  }
  
  const alertKey = `cpk_${data.productCode}_${data.stationName}`;
  if (!shouldSendAlert(alertKey)) {
    return { sent: false, reason: 'Đang trong thời gian cooldown' };
  }
  
  const result = await sendTelegramAlert('cpk_alert', {
    lineName: data.planName || `${data.productCode} - ${data.stationName}`,
    productName: data.productCode,
    stationName: data.stationName,
    cpk: data.cpk,
    cp: data.cp,
    mean: data.mean,
    stdDev: data.stdDev,
    usl: data.usl,
    lsl: data.lsl,
    sampleCount: data.sampleCount,
    threshold: thresholds.warning,
    severity,
    violations: data.violations,
  });
  
  if (result.sent > 0) {
    markAlertSent(alertKey);
    
    wsServer.sendCpkAlert({
      planId: data.planId || 0,
      planName: data.planName || `${data.productCode} - ${data.stationName}`,
      cpk: data.cpk,
      threshold: thresholds.warning,
      severity,
      timestamp: new Date(),
      productCode: data.productCode,
      stationName: data.stationName,
    });
    
    return { sent: true };
  }
  
  return { sent: false, reason: result.errors.join(', ') || 'Không có cấu hình Telegram active' };
}

export async function sendSpcViolationTelegramAlert(data: {
  planId?: number;
  planName?: string;
  productCode: string;
  stationName: string;
  machineName?: string;
  ruleNumber: number;
  ruleName: string;
  ruleDescription: string;
  violatingPoints: number[];
  value?: number;
}): Promise<{ sent: boolean; reason?: string }> {
  const alertKey = `spc_rule_${data.productCode}_${data.stationName}_rule${data.ruleNumber}`;
  if (!shouldSendAlert(alertKey)) {
    return { sent: false, reason: 'Đang trong thời gian cooldown' };
  }
  
  const result = await sendTelegramAlert('spc_violation', {
    lineName: data.planName || `${data.productCode} - ${data.stationName}`,
    machineName: data.machineName || data.stationName,
    ruleName: `Rule ${data.ruleNumber}: ${data.ruleName}`,
    ruleNumber: data.ruleNumber,
    description: data.ruleDescription,
    violatingPoints: data.violatingPoints,
    value: data.value,
    productCode: data.productCode,
    stationName: data.stationName,
  });
  
  if (result.sent > 0) {
    markAlertSent(alertKey);
    return { sent: true };
  }
  
  return { sent: false, reason: result.errors.join(', ') || 'Không có cấu hình Telegram active' };
}

export async function checkAndSendSpcAlerts(analysisResult: {
  id?: number;
  planId?: number;
  planName?: string;
  productCode: string;
  stationName: string;
  cpk: number | null;
  cp?: number | null;
  mean?: number | null;
  stdDev?: number | null;
  usl?: number | null;
  lsl?: number | null;
  sampleCount?: number;
  violations?: Array<{
    ruleNumber: number;
    ruleName: string;
    description: string;
    violatingPoints: number[];
  }>;
  thresholds?: CpkThresholds;
}): Promise<{
  cpkAlertSent: boolean;
  spcViolationAlertsSent: number;
  errors: string[];
}> {
  const result = {
    cpkAlertSent: false,
    spcViolationAlertsSent: 0,
    errors: [] as string[],
  };
  
  if (analysisResult.cpk !== null && analysisResult.cpk !== undefined) {
    const cpkResult = await sendCpkTelegramAlert({
      planId: analysisResult.planId,
      planName: analysisResult.planName,
      productCode: analysisResult.productCode,
      stationName: analysisResult.stationName,
      cpk: analysisResult.cpk,
      cp: analysisResult.cp ?? undefined,
      mean: analysisResult.mean ?? undefined,
      stdDev: analysisResult.stdDev ?? undefined,
      usl: analysisResult.usl ?? undefined,
      lsl: analysisResult.lsl ?? undefined,
      sampleCount: analysisResult.sampleCount,
      violations: analysisResult.violations?.map(v => `Rule ${v.ruleNumber}: ${v.ruleName}`),
      thresholds: analysisResult.thresholds,
    });
    
    result.cpkAlertSent = cpkResult.sent;
    if (!cpkResult.sent && cpkResult.reason && !cpkResult.reason.includes('ngưỡng cho phép')) {
      result.errors.push(`CPK Alert: ${cpkResult.reason}`);
    }
  }
  
  if (analysisResult.violations && analysisResult.violations.length > 0) {
    for (const violation of analysisResult.violations) {
      const violationResult = await sendSpcViolationTelegramAlert({
        planId: analysisResult.planId,
        planName: analysisResult.planName,
        productCode: analysisResult.productCode,
        stationName: analysisResult.stationName,
        ruleNumber: violation.ruleNumber,
        ruleName: violation.ruleName,
        ruleDescription: violation.description,
        violatingPoints: violation.violatingPoints,
      });
      
      if (violationResult.sent) {
        result.spcViolationAlertsSent++;
      } else if (violationResult.reason && !violationResult.reason.includes('cooldown')) {
        result.errors.push(`SPC Rule ${violation.ruleNumber}: ${violationResult.reason}`);
      }
    }
  }
  
  return result;
}

export async function hasTelegramConfigForSpcAlerts(): Promise<boolean> {
  const configs = await getTelegramConfigs();
  return configs.some(c => 
    c.isActive && 
    (c.alertTypes.includes('cpk_alert') || c.alertTypes.includes('spc_violation'))
  );
}

export function clearAlertCooldownCache(): void {
  alertCooldownCache.clear();
}

export default {
  sendCpkTelegramAlert,
  sendSpcViolationTelegramAlert,
  checkAndSendSpcAlerts,
  hasTelegramConfigForSpcAlerts,
  getCpkSeverity,
  clearAlertCooldownCache,
};
