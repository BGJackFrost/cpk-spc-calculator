import { mysqlTable, mysqlSchema, AnyMySqlColumn, int, varchar, timestamp, index, json, decimal, text, mysqlEnum, datetime, bigint, tinyint, boolean, date } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"


// === QUALITY Domain Tables ===

export const ntfAlertConfig = mysqlTable("ntf_alert_config", {
	id: int().autoincrement().notNull(),
	warningThreshold: decimal({ precision: 5, scale: 2 }).default('20.00'),
	criticalThreshold: decimal({ precision: 5, scale: 2 }).default('30.00'),
	alertEmails: text(),
	enabled: tinyint().default(1),
	checkIntervalMinutes: int().default(60),
	cooldownMinutes: int().default(120),
	lastAlertAt: timestamp({ mode: 'string' }),
	lastAlertNtfRate: decimal({ precision: 5, scale: 2 }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP'),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
});


export const ntfAlertHistory = mysqlTable("ntf_alert_history", {
	id: int().autoincrement().notNull(),
	ntfRate: decimal({ precision: 5, scale: 2 }).notNull(),
	totalDefects: int().notNull(),
	ntfCount: int().notNull(),
	realNgCount: int().notNull(),
	pendingCount: int().notNull(),
	alertType: mysqlEnum(['warning','critical']).notNull(),
	emailSent: tinyint().default(0),
	emailSentAt: timestamp({ mode: 'string' }),
	emailRecipients: text(),
	periodStart: timestamp({ mode: 'string' }).notNull(),
	periodEnd: timestamp({ mode: 'string' }).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP'),
});


export const ntfReportSchedule = mysqlTable("ntf_report_schedule", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 200 }).notNull(),
	reportType: mysqlEnum(['daily','weekly','monthly']).notNull(),
	sendHour: int().default(8),
	sendDay: int(),
	recipients: text().notNull(),
	enabled: tinyint().default(1),
	lastSentAt: timestamp({ mode: 'string' }),
	lastSentStatus: mysqlEnum(['success','failed']),
	lastSentError: text(),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP'),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
});


export const qualityImages = mysqlTable("quality_images", {
	id: int().autoincrement().notNull().primaryKey(),
	userId: int("user_id").notNull(),
	imageUrl: varchar("image_url", { length: 500 }).notNull(),
	imageKey: varchar("image_key", { length: 255 }).notNull(),
	imageType: mysqlEnum("image_type", ['before', 'after', 'reference', 'defect', 'camera_capture']).default('before').notNull(),
	productCode: varchar("product_code", { length: 100 }),
	productionLineId: int("production_line_id"),
	workstationId: int("workstation_id"),
	batchNumber: varchar("batch_number", { length: 100 }),
	captureSource: mysqlEnum("capture_source", ['upload', 'camera', 'api']).default('upload').notNull(),
	aiAnalysis: json("ai_analysis"),
	qualityScore: decimal("quality_score", { precision: 5, scale: 2 }),
	defectsFound: int("defects_found").default(0),
	severity: mysqlEnum(['none', 'minor', 'major', 'critical']).default('none'),
	notes: text(),
	metadata: json(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_quality_images_user").on(table.userId),
	index("idx_quality_images_product").on(table.productCode),
	index("idx_quality_images_line").on(table.productionLineId),
	index("idx_quality_images_type").on(table.imageType),
	index("idx_quality_images_created").on(table.createdAt),
]);


export const qualityTrendReportConfigs = mysqlTable("quality_trend_report_configs", {
	id: int().autoincrement().notNull().primaryKey(),
	userId: int("user_id").notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	// Report scope
	productionLineIds: json("production_line_ids"),
	workstationIds: json("workstation_ids"),
	productCodes: json("product_codes"),
	// Time range
	periodType: mysqlEnum("period_type", ['daily', 'weekly', 'monthly', 'quarterly', 'yearly']).default('weekly'),
	comparisonPeriods: int("comparison_periods").default(4), // Number of periods to compare
	// Metrics to include
	includeCpk: int("include_cpk").default(1).notNull(),
	includePpk: int("include_ppk").default(1).notNull(),
	includeDefectRate: int("include_defect_rate").default(1).notNull(),
	includeViolationCount: int("include_violation_count").default(1).notNull(),
	includeQualityScore: int("include_quality_score").default(1).notNull(),
	// Chart types
	enableLineChart: int("enable_line_chart").default(1).notNull(),
	enableBarChart: int("enable_bar_chart").default(1).notNull(),
	enablePieChart: int("enable_pie_chart").default(1).notNull(),
	enableHeatmap: int("enable_heatmap").default(0).notNull(),
	// Schedule (optional)
	scheduleEnabled: int("schedule_enabled").default(0).notNull(),
	scheduleFrequency: mysqlEnum("schedule_frequency", ['daily', 'weekly', 'monthly']),
	scheduleTime: varchar("schedule_time", { length: 5 }), // HH:mm
	scheduleDayOfWeek: int("schedule_day_of_week"), // 0-6
	scheduleDayOfMonth: int("schedule_day_of_month"), // 1-31
	// Delivery
	emailRecipients: json("email_recipients"),
	webhookConfigIds: json("webhook_config_ids"),
	// Status
	isActive: int("is_active").default(1).notNull(),
	lastGeneratedAt: timestamp("last_generated_at", { mode: 'string' }),
	// Metadata
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_trend_report_user").on(table.userId),
	index("idx_trend_report_active").on(table.isActive),
]);


export type QualityTrendReportConfig = typeof qualityTrendReportConfigs.$inferSelect;

export type InsertQualityTrendReportConfig = typeof qualityTrendReportConfigs.$inferInsert;

// Quality Trend Report History - Lịch sử báo cáo xu hướng

export const qualityTrendReportHistory = mysqlTable("quality_trend_report_history", {
	id: int().autoincrement().notNull().primaryKey(),
	configId: int("config_id").notNull(),
	reportName: varchar("report_name", { length: 255 }).notNull(),
	// Report period
	periodStart: timestamp("period_start", { mode: 'string' }).notNull(),
	periodEnd: timestamp("period_end", { mode: 'string' }).notNull(),
	periodType: varchar("period_type", { length: 20 }).notNull(),
	// Report data
	reportData: json("report_data"), // Full report data including all metrics and charts
	// Summary metrics
	avgCpk: decimal("avg_cpk", { precision: 10, scale: 4 }),
	avgPpk: decimal("avg_ppk", { precision: 10, scale: 4 }),
	avgDefectRate: decimal("avg_defect_rate", { precision: 10, scale: 4 }),
	totalViolations: int("total_violations").default(0),
	avgQualityScore: decimal("avg_quality_score", { precision: 5, scale: 2 }),
	// Trend analysis
	cpkTrend: mysqlEnum("cpk_trend", ['improving', 'stable', 'declining']),
	cpkTrendPercent: decimal("cpk_trend_percent", { precision: 10, scale: 2 }),
	defectTrend: mysqlEnum("defect_trend", ['improving', 'stable', 'declining']),
	defectTrendPercent: decimal("defect_trend_percent", { precision: 10, scale: 2 }),
	// Delivery status
	emailSent: int("email_sent").default(0).notNull(),
	webhookSent: int("webhook_sent").default(0).notNull(),
	deliveryStatus: mysqlEnum("delivery_status", ['pending', 'sent', 'partial', 'failed']).default('pending'),
	deliveryError: text("delivery_error"),
	// Metadata
	generatedAt: timestamp("generated_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_trend_history_config").on(table.configId),
	index("idx_trend_history_period").on(table.periodStart, table.periodEnd),
	index("idx_trend_history_generated").on(table.generatedAt),
]);


export type QualityTrendReportHistory = typeof qualityTrendReportHistory.$inferSelect;

export type InsertQualityTrendReportHistory = typeof qualityTrendReportHistory.$inferInsert;


// Webhook Templates - Template tùy chỉnh cho các hệ thống thông báo (Telegram, Zalo, etc.)

export const qualityStatisticsReports = mysqlTable("quality_statistics_reports", {
	id: int().autoincrement().notNull().primaryKey(),
	// Report period
	reportDate: date("report_date").notNull(),
	periodType: mysqlEnum("period_type", ['daily', 'weekly', 'monthly', 'quarterly', 'yearly']).default('daily').notNull(),
	// Scope
	productionLineId: int("production_line_id"),
	workstationId: int("workstation_id"),
	productId: int("product_id"),
	// Statistics
	totalSamples: int("total_samples").default(0).notNull(),
	okCount: int("ok_count").default(0).notNull(),
	ngCount: int("ng_count").default(0).notNull(),
	warningCount: int("warning_count").default(0).notNull(),
	okRate: decimal("ok_rate", { precision: 5, scale: 2 }), // Percentage
	ngRate: decimal("ng_rate", { precision: 5, scale: 2 }),
	// Quality metrics
	avgQualityScore: decimal("avg_quality_score", { precision: 5, scale: 2 }),
	minQualityScore: decimal("min_quality_score", { precision: 5, scale: 2 }),
	maxQualityScore: decimal("max_quality_score", { precision: 5, scale: 2 }),
	stdDevQualityScore: decimal("std_dev_quality_score", { precision: 5, scale: 2 }),
	// CPK/SPC metrics
	avgCpk: decimal("avg_cpk", { precision: 5, scale: 3 }),
	minCpk: decimal("min_cpk", { precision: 5, scale: 3 }),
	maxCpk: decimal("max_cpk", { precision: 5, scale: 3 }),
	// Defect analysis
	totalDefects: int("total_defects").default(0).notNull(),
	defectsByType: json("defects_by_type"), // { type: count }
	topDefectTypes: json("top_defect_types"), // Array of top defect types
	// Trend data
	trendData: json("trend_data"), // Array of { date, okRate, ngRate, avgScore }
	// Comparison with previous period
	prevPeriodOkRate: decimal("prev_period_ok_rate", { precision: 5, scale: 2 }),
	okRateChange: decimal("ok_rate_change", { precision: 5, scale: 2 }), // Percentage change
	trendDirection: mysqlEnum("trend_direction", ['improving', 'stable', 'declining']).default('stable'),
	// Metadata
	generatedAt: timestamp("generated_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	generatedBy: int("generated_by"),
},
(table) => [
	index("idx_quality_stats_date").on(table.reportDate),
	index("idx_quality_stats_period").on(table.periodType),
	index("idx_quality_stats_line").on(table.productionLineId),
	index("idx_quality_stats_product").on(table.productId),
]);


export type QualityStatisticsReport = typeof qualityStatisticsReports.$inferSelect;

export type InsertQualityStatisticsReport = typeof qualityStatisticsReports.$inferInsert;


// =============================================
// AOI/AVI Integration Tables
// =============================================

// Defect Types for AOI/AVI

export const ntfConfirmations = mysqlTable("ntf_confirmations", {
	id: int().autoincrement().notNull().primaryKey(),
	inspectionId: int("inspection_id"),
	originalResult: mysqlEnum("original_result", ['ng', 'ok', 'ntf']).notNull(),
	confirmedResult: mysqlEnum("confirmed_result", ['ng', 'ok', 'ntf']).notNull(),
	reason: text(),
	confirmedBy: int("confirmed_by"),
	confirmedAt: timestamp("confirmed_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	metadata: json("metadata"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
}, (table) => [
	index("idx_ntf_inspection").on(table.inspectionId),
	index("idx_ntf_confirmed_by").on(table.confirmedBy),
]);

export type NtfConfirmation = typeof ntfConfirmations.$inferSelect;

export type InsertNtfConfirmation = typeof ntfConfirmations.$inferInsert;

// Inspection Measurement Points - Điểm đo kiểm tra
