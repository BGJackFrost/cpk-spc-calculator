import { mysqlTable, mysqlSchema, AnyMySqlColumn, int, varchar, timestamp, index, json, decimal, text, mysqlEnum, datetime, bigint, tinyint, boolean, date } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"


// === OEE Domain Tables ===

export const oeeAlertConfigs = mysqlTable("oee_alert_configs", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull(),
	name: varchar({ length: 255 }).notNull(),
	machineId: int("machine_id"),
	oeeThreshold: decimal("oee_threshold", { precision: 5, scale: 2 }).notNull(),
	consecutiveDays: int("consecutive_days").default(3).notNull(),
	recipients: text().notNull(),
	isActive: int("is_active").default(1).notNull(),
	lastTriggeredAt: timestamp("last_triggered_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});


export const oeeAlertHistory = mysqlTable("oee_alert_history", {
	id: int().autoincrement().notNull(),
	alertConfigId: int("alert_config_id").notNull(),
	machineId: int("machine_id"),
	machineName: varchar("machine_name", { length: 255 }),
	oeeValue: decimal("oee_value", { precision: 5, scale: 2 }).notNull(),
	consecutiveDaysBelow: int("consecutive_days_below").notNull(),
	recipients: text().notNull(),
	emailSent: int("email_sent").default(0).notNull(),
	emailSentAt: timestamp("email_sent_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	acknowledged: tinyint().default(0),
	acknowledgedAt: datetime("acknowledged_at", { mode: 'string'}),
	acknowledgedBy: varchar("acknowledged_by", { length: 255 }),
	resolved: tinyint().default(0),
	resolvedAt: datetime("resolved_at", { mode: 'string'}),
	resolvedBy: varchar("resolved_by", { length: 255 }),
	resolution: text(),
});


export const oeeAlertThresholds = mysqlTable("oee_alert_thresholds", {
	id: int().autoincrement().notNull(),
	machineId: int(),
	productionLineId: int(),
	targetOee: decimal({ precision: 5, scale: 2 }).default('85.00').notNull(),
	warningThreshold: decimal({ precision: 5, scale: 2 }).default('80.00').notNull(),
	criticalThreshold: decimal({ precision: 5, scale: 2 }).default('70.00').notNull(),
	dropAlertThreshold: decimal({ precision: 5, scale: 2 }).default('5.00').notNull(),
	relativeDropThreshold: decimal({ precision: 5, scale: 2 }).default('10.00').notNull(),
	availabilityTarget: decimal({ precision: 5, scale: 2 }).default('90.00'),
	performanceTarget: decimal({ precision: 5, scale: 2 }).default('95.00'),
	qualityTarget: decimal({ precision: 5, scale: 2 }).default('99.00'),
	isActive: int().default(1).notNull(),
	createdBy: int(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});


export const oeeLossCategories = mysqlTable("oee_loss_categories", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	code: varchar({ length: 50 }).notNull(),
	type: mysqlEnum(['availability','performance','quality']).notNull(),
	description: text(),
	isActive: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});


export const oeeLossRecords = mysqlTable("oee_loss_records", {
	id: int().autoincrement().notNull(),
	oeeRecordId: int().notNull(),
	lossCategoryId: int().notNull(),
	durationMinutes: int().notNull(),
	quantity: int().default(0),
	description: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_oee_loss_record").on(table.oeeRecordId),
	index("idx_oee_loss_category").on(table.lossCategoryId),
]);


export const oeeRecords = mysqlTable("oee_records", {
	id: int().autoincrement().notNull(),
	machineId: int().notNull(),
	productionLineId: int(),
	shiftId: int(),
	recordDate: timestamp({ mode: 'string' }).notNull(),
	plannedProductionTime: int().default(0),
	actualRunTime: int().default(0),
	downtime: int().default(0),
	idealCycleTime: decimal({ precision: 10, scale: 4 }),
	totalCount: int().default(0),
	goodCount: int().default(0),
	defectCount: int().default(0),
	availability: decimal({ precision: 5, scale: 2 }),
	performance: decimal({ precision: 5, scale: 2 }),
	quality: decimal({ precision: 5, scale: 2 }),
	oee: decimal({ precision: 5, scale: 2 }),
	notes: text(),
	createdBy: int(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	plannedTime: int(),
	runTime: int(),
	cycleTime: decimal({ precision: 10, scale: 4 }),
	totalParts: int(),
	goodParts: int(),
	rejectParts: int(),
},
(table) => [
	index("idx_oee_records_machineId").on(table.machineId),
	index("idx_oee_records_recordDate").on(table.recordDate),
	index("idx_oee_records_machine").on(table.machineId, table.recordDate),
	index("idx_oee_records_line").on(table.productionLineId, table.recordDate),
	index("idx_oee_records_date").on(table.recordDate),
	index("idx_oee_machine").on(table.machineId),
	index("idx_oee_date").on(table.recordDate),
	index("idx_oee_machine_date").on(table.machineId, table.recordDate),
]);


export const oeeReportHistory = mysqlTable("oee_report_history", {
	id: int().autoincrement().notNull(),
	scheduleId: int("schedule_id").notNull(),
	reportPeriodStart: timestamp("report_period_start", { mode: 'string' }).notNull(),
	reportPeriodEnd: timestamp("report_period_end", { mode: 'string' }).notNull(),
	recipients: text().notNull(),
	reportData: text("report_data"),
	emailSent: int("email_sent").default(0).notNull(),
	emailSentAt: timestamp("email_sent_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});


export const oeeReportSchedules = mysqlTable("oee_report_schedules", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull(),
	name: varchar({ length: 255 }).notNull(),
	frequency: mysqlEnum(['weekly','monthly']).notNull(),
	dayOfWeek: int("day_of_week"),
	dayOfMonth: int("day_of_month"),
	hour: int().default(8).notNull(),
	machineIds: text("machine_ids"),
	recipients: text().notNull(),
	includeCharts: int("include_charts").default(1).notNull(),
	includeTrend: int("include_trend").default(1).notNull(),
	includeComparison: int("include_comparison").default(1).notNull(),
	isActive: int("is_active").default(1).notNull(),
	lastSentAt: timestamp("last_sent_at", { mode: 'string' }),
	nextScheduledAt: timestamp("next_scheduled_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});


export const oeeTargets = mysqlTable("oee_targets", {
	id: int().autoincrement().notNull(),
	machineId: int(),
	productionLineId: int(),
	targetOee: decimal({ precision: 5, scale: 2 }).default('85.00'),
	targetAvailability: decimal({ precision: 5, scale: 2 }).default('90.00'),
	targetPerformance: decimal({ precision: 5, scale: 2 }).default('95.00'),
	targetQuality: decimal({ precision: 5, scale: 2 }).default('99.00'),
	effectiveFrom: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	effectiveTo: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

