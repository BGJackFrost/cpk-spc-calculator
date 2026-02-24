import { router, protectedProcedure } from '../_core/trpc';
import { z } from 'zod';
import { getDb } from '../db';
import { getAlertHistory, getAlertStatistics, runAllAlertChecks } from '../services/iotOeeAlertService';

export const iotOeeAlertRouter = router({
  getConfigs: protectedProcedure.input(z.object({}).optional()).query(async () => { const db = await getDb(); const [rows] = await db.execute('SELECT * FROM iot_oee_alert_config ORDER BY created_at DESC'); return rows; }),

  createConfig: protectedProcedure.input(z.object({ name: z.string(), description: z.string().optional(), targetType: z.enum(['device', 'machine', 'production_line', 'all']).default('all'), targetId: z.number().optional(), oeeWarningThreshold: z.number().default(75), oeeCriticalThreshold: z.number().default(65), mttrWarningMinutes: z.number().default(60), mttrCriticalMinutes: z.number().default(120), mtbfWarningHours: z.number().default(100), mtbfCriticalHours: z.number().default(50), notifyEmail: z.boolean().default(true), notifyTelegram: z.boolean().default(false), emailRecipients: z.array(z.string()).default([]), checkIntervalMinutes: z.number().default(15), cooldownMinutes: z.number().default(30) })).mutation(async ({ input }) => {
    const db = await getDb();
    const [result] = await db.execute(`INSERT INTO iot_oee_alert_config (name, description, target_type, target_id, oee_warning_threshold, oee_critical_threshold, mttr_warning_minutes, mttr_critical_minutes, mtbf_warning_hours, mtbf_critical_hours, notify_email, notify_telegram, email_recipients, check_interval_minutes, cooldown_minutes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [input.name, input.description || null, input.targetType, input.targetId || null, input.oeeWarningThreshold, input.oeeCriticalThreshold, input.mttrWarningMinutes, input.mttrCriticalMinutes, input.mtbfWarningHours, input.mtbfCriticalHours, input.notifyEmail, input.notifyTelegram, JSON.stringify(input.emailRecipients), input.checkIntervalMinutes, input.cooldownMinutes]);
    return { id: (result as any).insertId };
  }),

  updateConfig: protectedProcedure.input(z.object({ id: z.number(), name: z.string().optional(), isEnabled: z.boolean().optional(), oeeWarningThreshold: z.number().optional(), oeeCriticalThreshold: z.number().optional() })).mutation(async ({ input }) => {
    const db = await getDb(); const updates: string[] = []; const values: any[] = [];
    if (input.name !== undefined) { updates.push('name = ?'); values.push(input.name); }
    if (input.isEnabled !== undefined) { updates.push('is_enabled = ?'); values.push(input.isEnabled); }
    if (input.oeeWarningThreshold !== undefined) { updates.push('oee_warning_threshold = ?'); values.push(input.oeeWarningThreshold); }
    if (input.oeeCriticalThreshold !== undefined) { updates.push('oee_critical_threshold = ?'); values.push(input.oeeCriticalThreshold); }
    if (updates.length > 0) { values.push(input.id); await db.execute(`UPDATE iot_oee_alert_config SET ${updates.join(', ')} WHERE id = ?`, values); }
    return { success: true };
  }),

  deleteConfig: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => { const db = await getDb(); await db.execute('DELETE FROM iot_oee_alert_config WHERE id = ?', [input.id]); return { success: true }; }),
  getHistory: protectedProcedure.input(z.object({ limit: z.number().default(100) })).query(async ({ input }) => getAlertHistory(input.limit)),
  getStatistics: protectedProcedure.input(z.object({ days: z.number().default(7) })).query(async ({ input }) => getAlertStatistics(input.days)),
  acknowledgeAlert: protectedProcedure.input(z.object({ alertId: z.number() })).mutation(async ({ input, ctx }) => { const db = await getDb(); await db.execute('UPDATE iot_oee_alert_history SET acknowledged = 1, acknowledged_at = NOW(), acknowledged_by = ? WHERE id = ?', [ctx.user.id, input.alertId]); return { success: true }; }),
  runCheck: protectedProcedure.mutation(async () => runAllAlertChecks()),
});
