import { mysqlTable, mysqlSchema, AnyMySqlColumn, int, varchar, timestamp, index, json, decimal, text, mysqlEnum, datetime, bigint, tinyint, boolean, date } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"


// === KPI Domain Tables ===

export const kpiAlertStats = mysqlTable("kpi_alert_stats", {
	id: int().autoincrement().notNull(),
	date: timestamp({ mode: 'string' }).notNull(),
	productionLineId: int("production_line_id"),
	productionLineName: varchar("production_line_name", { length: 255 }),
	alertType: varchar("alert_type", { length: 50 }).notNull(),
	alertCount: int("alert_count").default(0).notNull(),
	avgValue: decimal("avg_value", { precision: 10, scale: 4 }),
	minValue: decimal("min_value", { precision: 10, scale: 4 }),
	maxValue: decimal("max_value", { precision: 10, scale: 4 }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	machineId: int("machine_id"),
	severity: varchar({ length: 20 }).default('warning'),
	currentValue: varchar("current_value", { length: 50 }),
	previousValue: varchar("previous_value", { length: 50 }),
	thresholdValue: varchar("threshold_value", { length: 50 }),
	changePercent: varchar("change_percent", { length: 50 }),
	emailSent: tinyint("email_sent").default(0),
	notificationSent: tinyint("notification_sent").default(0),
	acknowledgedBy: int("acknowledged_by"),
	acknowledgedAt: datetime("acknowledged_at", { mode: 'string'}),
	resolvedBy: int("resolved_by"),
	resolvedAt: datetime("resolved_at", { mode: 'string'}),
	resolutionNotes: text("resolution_notes"),
	alertMessage: text("alert_message"),
},
(table) => [
	index("idx_date").on(table.date),
	index("idx_alert_type").on(table.alertType),
	index("idx_production_line").on(table.productionLineId),
]);


export const kpiAlertThresholds = mysqlTable("kpi_alert_thresholds", {
	id: int().autoincrement().notNull(),
	productionLineId: int("production_line_id").notNull(),
	cpkWarning: decimal("cpk_warning", { precision: 5, scale: 3 }).default('1.330').notNull(),
	cpkCritical: decimal("cpk_critical", { precision: 5, scale: 3 }).default('1.000').notNull(),
	oeeWarning: decimal("oee_warning", { precision: 5, scale: 2 }).default('75.00').notNull(),
	oeeCritical: decimal("oee_critical", { precision: 5, scale: 2 }).default('60.00').notNull(),
	defectRateWarning: decimal("defect_rate_warning", { precision: 5, scale: 2 }).default('2.00').notNull(),
	defectRateCritical: decimal("defect_rate_critical", { precision: 5, scale: 2 }).default('5.00').notNull(),
	weeklyDeclineThreshold: decimal("weekly_decline_threshold", { precision: 5, scale: 2 }).default('-5.00').notNull(),
	emailAlertEnabled: int("email_alert_enabled").default(1).notNull(),
	alertEmails: text("alert_emails"),
	createdBy: int("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});


export const kpiReportHistory = mysqlTable("kpi_report_history", {
	id: int().autoincrement().notNull(),
	scheduledReportId: int("scheduled_report_id").notNull(),
	reportName: varchar("report_name", { length: 255 }).notNull(),
	reportType: varchar("report_type", { length: 50 }).notNull(),
	frequency: varchar({ length: 20 }).notNull(),
	recipients: text().notNull(),
	status: mysqlEnum(['sent','failed','pending']).default('pending').notNull(),
	errorMessage: text("error_message"),
	reportData: text("report_data"),
	fileUrl: varchar("file_url", { length: 500 }),
	sentAt: timestamp("sent_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

