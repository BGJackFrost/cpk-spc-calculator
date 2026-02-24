/**
 * Scheduled Performance Checks Service
 * 
 * Runs performance checks at configurable intervals and sends notifications
 * when alerts are triggered.
 */

import cron, { ScheduledTask } from 'node-cron';
import { 
  runPerformanceChecks, 
  getAlerts, 
  PerformanceAlert,
  getAlertRules,
  PerformanceAlertRule
} from './performanceAlertService';
import { sendEmail } from '../emailService';
import { notifyOwner } from '../_core/notification';

// Check history storage
interface CheckResult {
  id: number;
  timestamp: Date;
  stats: {
    poolUtilization: number;
    queueLength: number;
    cacheHitRate: number;
  };
  alertsTriggered: number;
  alerts: PerformanceAlert[];
  duration: number;
}

// Configuration
interface ScheduledCheckConfig {
  enabled: boolean;
  intervalMinutes: number;
  notifyOnNewAlerts: boolean;
  notifyEmail: boolean;
  notifyOwner: boolean;
  emailRecipients: string[];
  maxHistorySize: number;
}

// Default configuration
let config: ScheduledCheckConfig = {
  enabled: true,
  intervalMinutes: 5,
  notifyOnNewAlerts: true,
  notifyEmail: true,
  notifyOwner: true,
  emailRecipients: [],
  maxHistorySize: 1000,
};

// Check history
let checkHistory: CheckResult[] = [];
let checkIdCounter = 1;

// Scheduled task reference
let scheduledTask: ScheduledTask | null = null;
let isRunning = false;

/**
 * Get current configuration
 */
export function getScheduledCheckConfig(): ScheduledCheckConfig {
  return { ...config };
}

/**
 * Update configuration
 */
export function updateScheduledCheckConfig(updates: Partial<ScheduledCheckConfig>): ScheduledCheckConfig {
  config = { ...config, ...updates };
  
  // Restart scheduled task if interval changed
  if (updates.intervalMinutes !== undefined || updates.enabled !== undefined) {
    stopScheduledChecks();
    if (config.enabled) {
      startScheduledChecks();
    }
  }
  
  return { ...config };
}

/**
 * Get check history
 */
export function getCheckHistory(options?: {
  limit?: number;
  startDate?: Date;
  endDate?: Date;
  hasAlerts?: boolean;
}): CheckResult[] {
  let filtered = [...checkHistory];
  
  if (options?.startDate) {
    filtered = filtered.filter(c => c.timestamp >= options.startDate!);
  }
  if (options?.endDate) {
    filtered = filtered.filter(c => c.timestamp <= options.endDate!);
  }
  if (options?.hasAlerts !== undefined) {
    filtered = options.hasAlerts 
      ? filtered.filter(c => c.alertsTriggered > 0)
      : filtered.filter(c => c.alertsTriggered === 0);
  }
  
  // Sort by timestamp descending
  filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  
  if (options?.limit) {
    filtered = filtered.slice(0, options.limit);
  }
  
  return filtered;
}

/**
 * Get check statistics
 */
export function getCheckStats(): {
  totalChecks: number;
  checksWithAlerts: number;
  lastCheckTime: Date | null;
  averagePoolUtilization: number;
  averageCacheHitRate: number;
  totalAlertsTriggered: number;
  isRunning: boolean;
  nextCheckTime: Date | null;
} {
  const checksWithAlerts = checkHistory.filter(c => c.alertsTriggered > 0).length;
  const lastCheck = checkHistory[0];
  
  // Calculate averages from last 100 checks
  const recentChecks = checkHistory.slice(0, 100);
  const avgPoolUtil = recentChecks.length > 0
    ? recentChecks.reduce((sum, c) => sum + c.stats.poolUtilization, 0) / recentChecks.length
    : 0;
  const avgCacheHit = recentChecks.length > 0
    ? recentChecks.reduce((sum, c) => sum + c.stats.cacheHitRate, 0) / recentChecks.length
    : 0;
  const totalAlerts = checkHistory.reduce((sum, c) => sum + c.alertsTriggered, 0);
  
  // Calculate next check time
  let nextCheckTime: Date | null = null;
  if (config.enabled && lastCheck) {
    nextCheckTime = new Date(lastCheck.timestamp.getTime() + config.intervalMinutes * 60 * 1000);
  }
  
  return {
    totalChecks: checkHistory.length,
    checksWithAlerts,
    lastCheckTime: lastCheck?.timestamp || null,
    averagePoolUtilization: avgPoolUtil,
    averageCacheHitRate: avgCacheHit,
    totalAlertsTriggered: totalAlerts,
    isRunning,
    nextCheckTime,
  };
}

/**
 * Send notification for new alerts
 */
async function sendAlertNotification(alerts: PerformanceAlert[]): Promise<void> {
  if (!config.notifyOnNewAlerts || alerts.length === 0) return;
  
  const criticalAlerts = alerts.filter(a => a.severity === 'critical');
  const warningAlerts = alerts.filter(a => a.severity === 'warning');
  const infoAlerts = alerts.filter(a => a.severity === 'info');
  
  const subject = criticalAlerts.length > 0
    ? `🚨 [CRITICAL] ${criticalAlerts.length} Performance Alert(s) Triggered`
    : `⚠️ ${alerts.length} Performance Alert(s) Triggered`;
  
  const alertListHtml = alerts.map(a => `
    <tr style="background-color: ${
      a.severity === 'critical' ? '#fee2e2' : 
      a.severity === 'warning' ? '#fef3c7' : '#dbeafe'
    };">
      <td style="padding: 8px; border: 1px solid #ddd;">${a.severity.toUpperCase()}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${a.ruleName}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${a.message}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${a.currentValue.toFixed(2)}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${a.threshold}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${a.createdAt?.toLocaleString('vi-VN')}</td>
    </tr>
  `).join('');
  
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
      <h2 style="color: ${criticalAlerts.length > 0 ? '#dc2626' : '#f59e0b'};">
        ${criticalAlerts.length > 0 ? '🚨 Critical Performance Alerts' : '⚠️ Performance Alerts'}
      </h2>
      
      <div style="margin: 20px 0; padding: 15px; background-color: #f3f4f6; border-radius: 8px;">
        <p><strong>Summary:</strong></p>
        <ul>
          <li>Critical: ${criticalAlerts.length}</li>
          <li>Warning: ${warningAlerts.length}</li>
          <li>Info: ${infoAlerts.length}</li>
        </ul>
      </div>
      
      <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        <thead>
          <tr style="background-color: #374151; color: white;">
            <th style="padding: 10px; text-align: left;">Severity</th>
            <th style="padding: 10px; text-align: left;">Rule</th>
            <th style="padding: 10px; text-align: left;">Message</th>
            <th style="padding: 10px; text-align: left;">Value</th>
            <th style="padding: 10px; text-align: left;">Threshold</th>
            <th style="padding: 10px; text-align: left;">Time</th>
          </tr>
        </thead>
        <tbody>
          ${alertListHtml}
        </tbody>
      </table>
      
      <p style="margin-top: 20px; color: #6b7280; font-size: 12px;">
        This is an automated notification from the SPC/CPK Performance Monitoring System.
      </p>
    </div>
  `;
  
  // Send email if configured
  if (config.notifyEmail && config.emailRecipients.length > 0) {
    try {
      await sendEmail(
        config.emailRecipients,
        subject,
        htmlContent
      );
    } catch (error) {
      console.error('[ScheduledPerformanceCheck] Failed to send email:', error);
    }
  }
  
  // Notify owner
  if (config.notifyOwner) {
    try {
      await notifyOwner({
        title: subject,
        content: `${alerts.length} performance alert(s) triggered:\n${alerts.map(a => `- [${a.severity.toUpperCase()}] ${a.message}`).join('\n')}`,
      });
    } catch (error) {
      console.error('[ScheduledPerformanceCheck] Failed to notify owner:', error);
    }
  }
}

/**
 * Send webhook notification for alerts
 */
async function sendWebhookNotification(alerts: PerformanceAlert[]): Promise<void> {
  // Get rules that have webhook notification enabled
  const rules = getAlertRules();
  const webhookRules = rules.filter(r => r.notifyWebhook);
  
  if (webhookRules.length === 0) return;
  
  // Filter alerts that match webhook-enabled rules
  const webhookAlerts = alerts.filter(a => 
    webhookRules.some(r => r.id === a.ruleId)
  );
  
  if (webhookAlerts.length === 0) return;
  
  // Trigger webhooks via the existing webhook service
  try {
    const { triggerWebhooks } = await import('../webhookService');
    await triggerWebhooks('cpk_alert', {
      alerts: webhookAlerts.map(a => ({
        id: a.id,
        severity: a.severity,
        type: a.type,
        ruleName: a.ruleName,
        message: a.message,
        currentValue: a.currentValue,
        threshold: a.threshold,
        createdAt: a.createdAt?.toISOString(),
      })),
      summary: {
        total: webhookAlerts.length,
        critical: webhookAlerts.filter(a => a.severity === 'critical').length,
        warning: webhookAlerts.filter(a => a.severity === 'warning').length,
        info: webhookAlerts.filter(a => a.severity === 'info').length,
      },
    });
  } catch (error) {
    console.error('[ScheduledPerformanceCheck] Failed to trigger webhooks:', error);
  }
}

/**
 * Run a single performance check
 */
export async function runSingleCheck(): Promise<CheckResult> {
  const startTime = Date.now();
  
  try {
    const result = await runPerformanceChecks();
    const duration = Date.now() - startTime;
    
    const checkResult: CheckResult = {
      id: checkIdCounter++,
      timestamp: new Date(),
      stats: result.stats,
      alertsTriggered: result.alerts.length,
      alerts: result.alerts,
      duration,
    };
    
    // Add to history
    checkHistory.unshift(checkResult);
    
    // Trim history if needed
    if (checkHistory.length > config.maxHistorySize) {
      checkHistory = checkHistory.slice(0, config.maxHistorySize);
    }
    
    // Send notifications for new alerts
    if (result.alerts.length > 0) {
      await sendAlertNotification(result.alerts);
      await sendWebhookNotification(result.alerts);
    }
    
    return checkResult;
  } catch (error) {
    console.error('[ScheduledPerformanceCheck] Error running check:', error);
    
    const checkResult: CheckResult = {
      id: checkIdCounter++,
      timestamp: new Date(),
      stats: {
        poolUtilization: 0,
        queueLength: 0,
        cacheHitRate: 0,
      },
      alertsTriggered: 0,
      alerts: [],
      duration: Date.now() - startTime,
    };
    
    checkHistory.unshift(checkResult);
    return checkResult;
  }
}

/**
 * Clear check history
 */
export function clearCheckHistory(): void {
  checkHistory = [];
  checkIdCounter = 1;
}

/**
 * Start scheduled checks
 */
export function startScheduledChecks(): void {
  if (scheduledTask) {
    scheduledTask.stop();
  }
  
  // Create cron expression for interval
  const cronExpression = `*/${config.intervalMinutes} * * * *`;
  
  scheduledTask = cron.schedule(cronExpression, async () => {
    if (isRunning) {
      console.log('[ScheduledPerformanceCheck] Previous check still running, skipping...');
      return;
    }
    
    isRunning = true;
    try {
      console.log('[ScheduledPerformanceCheck] Running scheduled check...');
      const result = await runSingleCheck();
      console.log(`[ScheduledPerformanceCheck] Check completed: ${result.alertsTriggered} alerts, ${result.duration}ms`);
    } finally {
      isRunning = false;
    }
  }, {
    timezone: 'Asia/Ho_Chi_Minh',
  });
  
  console.log(`[ScheduledPerformanceCheck] Started with interval: ${config.intervalMinutes} minutes`);
}

/**
 * Stop scheduled checks
 */
export function stopScheduledChecks(): void {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }
  isRunning = false;
  console.log('[ScheduledPerformanceCheck] Stopped');
}

/**
 * Initialize scheduled checks (call on server start)
 */
export function initScheduledPerformanceChecks(): void {
  if (config.enabled) {
    startScheduledChecks();
  }
}

export default {
  getScheduledCheckConfig,
  updateScheduledCheckConfig,
  getCheckHistory,
  getCheckStats,
  runSingleCheck,
  clearCheckHistory,
  startScheduledChecks,
  stopScheduledChecks,
  initScheduledPerformanceChecks,
};
