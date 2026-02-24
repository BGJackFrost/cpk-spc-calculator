import { mysqlTable, mysqlSchema, AnyMySqlColumn, int, varchar, timestamp, index, json, decimal, text, mysqlEnum, datetime, bigint, tinyint, boolean, date } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"


// === PREDICTIVE Domain Tables ===

export const predictiveAlertAdjustmentLogs = mysqlTable("predictive_alert_adjustment_logs", {
	id: int().autoincrement().notNull(),
	thresholdId: int("threshold_id").notNull(),
	adjustmentType: mysqlEnum("adjustment_type", ['auto','manual']).notNull(),
	oldValues: text("old_values").notNull(),
	newValues: text("new_values").notNull(),
	reason: text(),
	adjustedBy: int("adjusted_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});


export const predictiveAlertHistory = mysqlTable("predictive_alert_history", {
	id: int().autoincrement().notNull(),
	thresholdId: int("threshold_id").notNull(),
	productionLineId: int("production_line_id"),
	alertType: mysqlEnum("alert_type", ['oee_low','oee_decline','defect_high','defect_increase','auto_adjust']).notNull(),
	severity: mysqlEnum(['warning','critical','info']).notNull(),
	currentValue: decimal("current_value", { precision: 10, scale: 4 }),
	thresholdValue: decimal("threshold_value", { precision: 10, scale: 4 }),
	predictedValue: decimal("predicted_value", { precision: 10, scale: 4 }),
	changePercent: decimal("change_percent", { precision: 10, scale: 4 }),
	title: varchar({ length: 255 }).notNull(),
	message: text().notNull(),
	recommendations: text(),
	status: mysqlEnum(['pending','sent','acknowledged','resolved']).default('pending').notNull(),
	acknowledgedBy: int("acknowledged_by"),
	acknowledgedAt: timestamp("acknowledged_at", { mode: 'string' }),
	resolvedBy: int("resolved_by"),
	resolvedAt: timestamp("resolved_at", { mode: 'string' }),
	resolutionNotes: text("resolution_notes"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});


export const predictiveAlertThresholds = mysqlTable("predictive_alert_thresholds", {
	id: int().autoincrement().notNull(),
	productionLineId: int("production_line_id"),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	predictionType: mysqlEnum("prediction_type", ['oee','defect_rate','both']).default('both').notNull(),
	oeeWarningThreshold: decimal("oee_warning_threshold", { precision: 5, scale: 2 }).default('75.00'),
	oeeCriticalThreshold: decimal("oee_critical_threshold", { precision: 5, scale: 2 }).default('65.00'),
	oeeDeclineThreshold: decimal("oee_decline_threshold", { precision: 5, scale: 2 }).default('5.00'),
	defectWarningThreshold: decimal("defect_warning_threshold", { precision: 5, scale: 2 }).default('3.00'),
	defectCriticalThreshold: decimal("defect_critical_threshold", { precision: 5, scale: 2 }).default('5.00'),
	defectIncreaseThreshold: decimal("defect_increase_threshold", { precision: 5, scale: 2 }).default('20.00'),
	autoAdjustEnabled: int("auto_adjust_enabled").default(0).notNull(),
	autoAdjustSensitivity: mysqlEnum("auto_adjust_sensitivity", ['low','medium','high']).default('medium').notNull(),
	autoAdjustPeriodDays: int("auto_adjust_period_days").default(30).notNull(),
	emailAlertEnabled: int("email_alert_enabled").default(1).notNull(),
	alertEmails: text("alert_emails"),
	alertFrequency: mysqlEnum("alert_frequency", ['immediate','hourly','daily']).default('immediate').notNull(),
	isActive: int("is_active").default(1).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	lastAlertSentAt: timestamp("last_alert_sent_at", { mode: 'string' }),
	lastAutoAdjustAt: timestamp("last_auto_adjust_at", { mode: 'string' }),
	createdBy: int("created_by"),
});

