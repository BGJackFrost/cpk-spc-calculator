import { mysqlTable, mysqlSchema, AnyMySqlColumn, int, varchar, timestamp, index, json, decimal, text, mysqlEnum, datetime, bigint, tinyint, boolean, date } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"


// === MAINTENANCE Domain Tables ===

export const maintenanceHistory = mysqlTable("maintenance_history", {
	id: int().autoincrement().notNull(),
	workOrderId: int().notNull(),
	machineId: int().notNull(),
	action: varchar({ length: 255 }).notNull(),
	performedBy: int(),
	performedAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});


export const maintenanceSchedules = mysqlTable("maintenance_schedules", {
	id: int().autoincrement().notNull(),
	machineId: int().notNull(),
	maintenanceTypeId: int().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	frequency: mysqlEnum(['daily','weekly','biweekly','monthly','quarterly','biannually','annually','custom']).notNull(),
	customIntervalDays: int(),
	lastPerformedAt: timestamp({ mode: 'string' }),
	nextDueAt: timestamp({ mode: 'string' }),
	estimatedDuration: int(),
	assignedTechnicianId: int(),
	checklist: json(),
	priority: mysqlEnum(['low','medium','high','critical']).default('medium'),
	isActive: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});


export const maintenanceTypes = mysqlTable("maintenance_types", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	code: varchar({ length: 50 }).notNull(),
	category: mysqlEnum(['corrective','preventive','predictive','condition_based']).notNull(),
	description: text(),
	defaultPriority: mysqlEnum(['low','medium','high','critical']).default('medium'),
	estimatedDuration: int(),
	color: varchar({ length: 20 }).default('#3b82f6'),
	isActive: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});


export const mttrMtbfThresholds = mysqlTable("mttr_mtbf_thresholds", {
  id: int().autoincrement().primaryKey(),
  // Target type and ID
  targetType: mysqlEnum("target_type", ['device','machine','production_line','all']).notNull(),
  targetId: int("target_id"), // null means apply to all targets of this type
  // MTTR thresholds (in minutes)
  mttrWarningThreshold: decimal("mttr_warning_threshold", { precision: 10, scale: 2 }), // Warning if MTTR exceeds this
  mttrCriticalThreshold: decimal("mttr_critical_threshold", { precision: 10, scale: 2 }), // Critical if MTTR exceeds this
  // MTBF thresholds (in minutes)
  mtbfWarningThreshold: decimal("mtbf_warning_threshold", { precision: 10, scale: 2 }), // Warning if MTBF below this
  mtbfCriticalThreshold: decimal("mtbf_critical_threshold", { precision: 10, scale: 2 }), // Critical if MTBF below this
  // Availability thresholds (0-1)
  availabilityWarningThreshold: decimal("availability_warning_threshold", { precision: 5, scale: 4 }),
  availabilityCriticalThreshold: decimal("availability_critical_threshold", { precision: 5, scale: 4 }),
  // Alert settings
  enabled: int().default(1).notNull(),
  alertEmails: text("alert_emails"), // Comma-separated emails
  alertTelegram: int("alert_telegram").default(0), // Send to Telegram
  cooldownMinutes: int("cooldown_minutes").default(60), // Minimum time between alerts
  lastAlertAt: timestamp("last_alert_at", { mode: 'string' }),
  lastAlertType: varchar("last_alert_type", { length: 50 }),
  // Metadata
  createdBy: int("created_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_target_type_id").on(table.targetType, table.targetId),
  index("idx_enabled").on(table.enabled),
]);

// Alert history for MTTR/MTBF

export const mttrMtbfAlertHistory = mysqlTable("mttr_mtbf_alert_history", {
  id: int().autoincrement().primaryKey(),
  thresholdId: int("threshold_id").notNull(),
  targetType: mysqlEnum("target_type", ['device','machine','production_line']).notNull(),
  targetId: int("target_id").notNull(),
  targetName: varchar("target_name", { length: 255 }),
  // Alert details
  alertType: mysqlEnum("alert_type", ['mttr_warning','mttr_critical','mtbf_warning','mtbf_critical','availability_warning','availability_critical']).notNull(),
  currentValue: decimal("current_value", { precision: 15, scale: 4 }),
  thresholdValue: decimal("threshold_value", { precision: 15, scale: 4 }),
  message: text(),
  // Notification status
  emailSent: int("email_sent").default(0),
  telegramSent: int("telegram_sent").default(0),
  acknowledgedAt: timestamp("acknowledged_at", { mode: 'string' }),
  acknowledgedBy: int("acknowledged_by"),
  // Metadata
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
  index("idx_threshold_id").on(table.thresholdId),
  index("idx_target").on(table.targetType, table.targetId),
  index("idx_alert_type").on(table.alertType),
  index("idx_created_at").on(table.createdAt),
]);


export type MttrMtbfThreshold = typeof mttrMtbfThresholds.$inferSelect;

export type InsertMttrMtbfThreshold = typeof mttrMtbfThresholds.$inferInsert;

export type MttrMtbfAlertHistory = typeof mttrMtbfAlertHistory.$inferSelect;

export type InsertMttrMtbfAlertHistory = typeof mttrMtbfAlertHistory.$inferInsert;


// Phase 113 - Scheduled OEE Reports (Telegram/Slack)
