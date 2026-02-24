import { getDb } from '../db';

export interface AlertConfig { id: number; name: string; targetType: 'device' | 'machine' | 'production_line' | 'all'; targetId?: number; oeeWarningThreshold: number; oeeCriticalThreshold: number; mttrWarningMinutes: number; mttrCriticalMinutes: number; mtbfWarningHours: number; mtbfCriticalHours: number; notifyEmail: boolean; notifyTelegram: boolean; emailRecipients: string[]; checkIntervalMinutes: number; cooldownMinutes: number; isEnabled: boolean; }
export interface AlertResult { configId: number; alertType: string; severity: 'info' | 'warning' | 'critical'; targetName: string; currentValue: number; thresholdValue: number; message: string; }

export async function getAlertConfigs(): Promise<AlertConfig[]> {
  const db = await getDb();
  const [rows] = await db.execute('SELECT * FROM iot_oee_alert_config WHERE is_enabled = 1');
  return (rows as any[]).map(row => ({ id: row.id, name: row.name, targetType: row.target_type, targetId: row.target_id, oeeWarningThreshold: parseFloat(row.oee_warning_threshold), oeeCriticalThreshold: parseFloat(row.oee_critical_threshold), mttrWarningMinutes: row.mttr_warning_minutes, mttrCriticalMinutes: row.mttr_critical_minutes, mtbfWarningHours: row.mtbf_warning_hours, mtbfCriticalHours: row.mtbf_critical_hours, notifyEmail: row.notify_email, notifyTelegram: row.notify_telegram, emailRecipients: row.email_recipients ? JSON.parse(row.email_recipients) : [], checkIntervalMinutes: row.check_interval_minutes, cooldownMinutes: row.cooldown_minutes, isEnabled: row.is_enabled }));
}

export async function checkOeeAlerts(config: AlertConfig): Promise<AlertResult[]> {
  const alerts: AlertResult[] = [];
  const db = await getDb();
  let query = 'SELECT AVG(oee) as avg_oee FROM oee_records WHERE created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)';
  if (config.targetType === 'production_line' && config.targetId) query += ` AND production_line_id = ${config.targetId}`;
  else if (config.targetType === 'machine' && config.targetId) query += ` AND machine_id = ${config.targetId}`;
  try {
    const [rows] = await db.execute(query);
    const avgOee = (rows as any[])[0]?.avg_oee || 0;
    if (avgOee < config.oeeCriticalThreshold) alerts.push({ configId: config.id, alertType: 'oee_critical', severity: 'critical', targetName: config.name, currentValue: avgOee, thresholdValue: config.oeeCriticalThreshold, message: `OEE ${avgOee.toFixed(1)}% < critical ${config.oeeCriticalThreshold}%` });
    else if (avgOee < config.oeeWarningThreshold) alerts.push({ configId: config.id, alertType: 'oee_warning', severity: 'warning', targetName: config.name, currentValue: avgOee, thresholdValue: config.oeeWarningThreshold, message: `OEE ${avgOee.toFixed(1)}% < warning ${config.oeeWarningThreshold}%` });
  } catch (error) { console.error('[OeeAlert] Error:', error); }
  return alerts;
}

export async function saveAlertHistory(alert: AlertResult): Promise<number> {
  const db = await getDb();
  const [result] = await db.execute(`INSERT INTO iot_oee_alert_history (config_id, alert_type, severity, target_name, current_value, threshold_value, message) VALUES (?, ?, ?, ?, ?, ?, ?)`, [alert.configId, alert.alertType, alert.severity, alert.targetName, alert.currentValue, alert.thresholdValue, alert.message]);
  return (result as any).insertId;
}

export async function getAlertHistory(limit = 100): Promise<any[]> { const db = await getDb(); const [rows] = await db.execute(`SELECT * FROM iot_oee_alert_history ORDER BY created_at DESC LIMIT ?`, [limit]); return rows as any[]; }

export async function getAlertStatistics(days = 7): Promise<any> {
  const db = await getDb();
  const [rows] = await db.execute(`SELECT COUNT(*) as total, SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical, SUM(CASE WHEN severity = 'warning' THEN 1 ELSE 0 END) as warning, SUM(CASE WHEN severity = 'info' THEN 1 ELSE 0 END) as info, SUM(CASE WHEN acknowledged = 1 THEN 1 ELSE 0 END) as acknowledged, SUM(CASE WHEN acknowledged = 0 THEN 1 ELSE 0 END) as pending FROM iot_oee_alert_history WHERE created_at > DATE_SUB(NOW(), INTERVAL ? DAY)`, [days]);
  const stats = (rows as any[])[0];
  return { total: stats.total || 0, bySeverity: { critical: stats.critical || 0, warning: stats.warning || 0, info: stats.info || 0 }, acknowledged: stats.acknowledged || 0, pending: stats.pending || 0 };
}

export async function sendOeeCriticalNotification(alert: AlertResult): Promise<boolean> {
  try {
    const { notifyOwner } = await import('../_core/notification');
    const title = `🚨 OEE Critical Alert: ${alert.targetName}`;
    const content = `**Alert Type:** ${alert.alertType}\n**Severity:** ${alert.severity.toUpperCase()}\n**Current Value:** ${alert.currentValue.toFixed(1)}%\n**Threshold:** ${alert.thresholdValue}%\n**Message:** ${alert.message}\n\n**Time:** ${new Date().toLocaleString('vi-VN')}`;
    return await notifyOwner({ title, content });
  } catch (error) {
    console.error('[OeeAlert] Failed to send notification:', error);
    return false;
  }
}

export async function runAllAlertChecks(): Promise<{ configId: number; alertsTriggered: number; notificationsSent: number }[]> {
  const configs = await getAlertConfigs();
  const results: { configId: number; alertsTriggered: number; notificationsSent: number }[] = [];
  for (const config of configs) {
    const alerts = await checkOeeAlerts(config);
    let notificationsSent = 0;
    for (const alert of alerts) {
      await saveAlertHistory(alert);
      if (alert.severity === 'critical') {
        const sent = await sendOeeCriticalNotification(alert);
        if (sent) notificationsSent++;
      }
    }
    results.push({ configId: config.id, alertsTriggered: alerts.length, notificationsSent });
  }
  return results;
}
