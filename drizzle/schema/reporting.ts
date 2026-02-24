import { mysqlTable, mysqlSchema, AnyMySqlColumn, int, varchar, timestamp, index, json, decimal, text, mysqlEnum, datetime, bigint, tinyint, boolean, date } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"


// === REPORTING Domain Tables ===

export const exportHistory = mysqlTable("export_history", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	exportType: varchar({ length: 20 }).notNull(),
	productCode: varchar({ length: 100 }),
	stationName: varchar({ length: 255 }),
	analysisType: varchar({ length: 50 }),
	startDate: timestamp({ mode: 'string' }),
	endDate: timestamp({ mode: 'string' }),
	sampleCount: int(),
	mean: int(),
	cpk: int(),
	fileName: varchar({ length: 255 }).notNull(),
	fileUrl: text(),
	fileSize: int(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});


export const scheduledReports = mysqlTable("scheduled_reports", {
	id: int().autoincrement().notNull().primaryKey(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	// User who created the report
	userId: int("user_id").notNull(),
	createdBy: int("created_by"),
	// Report type
	reportType: mysqlEnum("report_type", ['spc_summary', 'cpk_analysis', 'violation_report', 'production_line_status', 'ai_vision_dashboard', 'radar_chart_comparison', 'oee', 'cpk', 'oee_cpk_combined', 'production_summary']).default('spc_summary').notNull(),
	// Schedule configuration (legacy fields)
	scheduleType: mysqlEnum("schedule_type", ['daily', 'weekly', 'monthly']).default('daily').notNull(),
	scheduleTime: varchar("schedule_time", { length: 10 }).default('08:00').notNull(),
	scheduleDayOfWeek: int("schedule_day_of_week"),
	scheduleDayOfMonth: int("schedule_day_of_month"),
	// New schedule fields (used by OEE router)
	frequency: mysqlEnum("frequency", ['daily', 'weekly', 'monthly']).default('daily'),
	dayOfWeek: int("day_of_week"),
	dayOfMonth: int("day_of_month"),
	timeOfDay: varchar("time_of_day", { length: 10 }).default('08:00'),
	// Filter configuration
	productionLineIds: json("production_line_ids"),
	productIds: json("product_ids"),
	machineIds: json("machine_ids"),
	includeCharts: tinyint("include_charts").default(1).notNull(),
	includeRawData: tinyint("include_raw_data").default(0).notNull(),
	includeTrends: tinyint("include_trends").default(1),
	includeAlerts: tinyint("include_alerts").default(1),
	format: varchar("format", { length: 20 }).default('html'),
	// Email recipients
	recipients: json("recipients").notNull(),
	ccRecipients: json("cc_recipients"),
	// Status
	isActive: tinyint("is_active").default(1).notNull(),
	lastRunAt: timestamp("last_run_at", { mode: 'string' }),
	lastRunStatus: mysqlEnum("last_run_status", ['success', 'failed', 'pending']),
	lastRunError: text("last_run_error"),
	nextRunAt: timestamp("next_run_at", { mode: 'string' }),
	// Metadata
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_scheduled_report_user").on(table.userId),
	index("idx_scheduled_report_active").on(table.isActive),
	index("idx_scheduled_report_next_run").on(table.nextRunAt),
]);


export type ScheduledReport = typeof scheduledReports.$inferSelect;

export type InsertScheduledReport = typeof scheduledReports.$inferInsert;

// Scheduled Report Logs - Lịch sử chạy báo cáo

export const scheduledReportLogs = mysqlTable("scheduled_report_logs", {
	id: int().autoincrement().notNull().primaryKey(),
	reportId: int("report_id").notNull(),
	// Execution details
	startedAt: timestamp("started_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	status: mysqlEnum(['running', 'success', 'failed']).default('running').notNull(),
	errorMessage: text("error_message"),
	// Report details
	recipientCount: int("recipient_count").default(0).notNull(),
	emailsSent: int("emails_sent").default(0).notNull(),
	reportSize: int("report_size"), // in bytes
	// Generated report file
	reportFileUrl: text("report_file_url"),
	reportFileName: varchar("report_file_name", { length: 255 }),
},
(table) => [
	index("idx_scheduled_report_log_report").on(table.reportId),
	index("idx_scheduled_report_log_status").on(table.status),
	index("idx_scheduled_report_log_started").on(table.startedAt),
]);


export type ScheduledReportLog = typeof scheduledReportLogs.$inferSelect;

export type InsertScheduledReportLog = typeof scheduledReportLogs.$inferInsert;

// Line Comparison Sessions - Phiên so sánh dây chuyền

export const scheduledReportPdfHistory = mysqlTable("scheduled_report_pdf_history", {
	id: int().autoincrement().notNull().primaryKey(),
	reportId: int("report_id").notNull(),
	// PDF file info
	pdfUrl: varchar("pdf_url", { length: 500 }).notNull(),
	fileSize: int("file_size"), // bytes
	// Generation info
	generatedAt: timestamp("generated_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	generationTimeMs: int("generation_time_ms"),
	// Status
	status: mysqlEnum("status", ['success', 'failed']).default('success').notNull(),
	errorMessage: text("error_message"),
	// Metadata
	reportData: json("report_data"), // Snapshot of report data at generation time
},
(table) => [
	index("idx_pdf_history_report").on(table.reportId),
	index("idx_pdf_history_generated").on(table.generatedAt),
]);

export type ScheduledReportPdfHistory = typeof scheduledReportPdfHistory.$inferSelect;

export type InsertScheduledReportPdfHistory = typeof scheduledReportPdfHistory.$inferInsert;


// Login Attempts - Theo dõi số lần đăng nhập thất bại
