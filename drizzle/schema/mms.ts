import { mysqlTable, mysqlSchema, AnyMySqlColumn, int, varchar, timestamp, index, json, decimal, text, mysqlEnum, datetime, bigint, tinyint, boolean, date } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"


// === MMS Domain Tables ===

export const mmsScheduledReportLogs = mysqlTable("mms_scheduled_report_logs", {
	id: int().autoincrement().notNull(),
	reportId: int().notNull(),
	sentAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	status: mysqlEnum(['success','failed']).notNull(),
	recipientCount: int().default(0).notNull(),
	fileUrl: varchar({ length: 500 }),
	errorMessage: text(),
	executionTimeMs: int(),
	successCount: int().default(0).notNull(),
	failedCount: int().default(0).notNull(),
	reportFileUrl: varchar({ length: 1024 }),
	reportFileSizeKb: int().default(0),
	generationTimeMs: int().default(0),
});

// Legacy MMS scheduled reports - kept for backward compatibility

export const mmsScheduledReports = mysqlTable("mms_scheduled_reports", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 200 }).notNull(),
	reportType: mysqlEnum(['oee','cpk','oee_cpk_combined','production_summary']).notNull(),
	frequency: mysqlEnum(['daily','weekly','monthly']).notNull(),
	dayOfWeek: int(),
	dayOfMonth: int(),
	timeOfDay: varchar({ length: 5 }).default('08:00').notNull(),
	recipients: text().notNull(),
	machineIds: text(),
	productionLineIds: text(),
	includeCharts: int().default(1).notNull(),
	includeTrends: int().default(1).notNull(),
	includeAlerts: int().default(1).notNull(),
	format: mysqlEnum(['html','excel','pdf']).default('html').notNull(),
	lastSentAt: timestamp({ mode: 'string' }),
	lastSentStatus: mysqlEnum(['success','failed','pending']),
	lastSentError: text(),
	isActive: int().default(1).notNull(),
	createdBy: int(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

