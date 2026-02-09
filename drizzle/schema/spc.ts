import { mysqlTable, mysqlSchema, AnyMySqlColumn, int, varchar, timestamp, index, json, decimal, text, mysqlEnum, datetime, bigint, tinyint, boolean, date } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"


// === SPC Domain Tables ===

export const caRules = mysqlTable("ca_rules", {
	id: int().autoincrement().notNull(),
	code: varchar({ length: 50 }).notNull(),
	name: varchar({ length: 200 }).notNull(),
	description: text(),
	formula: text(),
	example: text(),
	severity: mysqlEnum(['warning','critical']).default('warning').notNull(),
	minValue: int(),
	maxValue: int(),
	isEnabled: int().default(1).notNull(),
	sortOrder: int().default(0).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("ca_rules_code_unique").on(table.code),
]);


export const chartAnnotations = mysqlTable("chart_annotations", {
	id: int().autoincrement().notNull(),
	planId: int("plan_id"),
	mappingId: int("mapping_id"),
	chartType: varchar("chart_type", { length: 50 }).notNull(),
	annotationType: mysqlEnum("annotation_type", ['point','line','area','text','marker']).notNull(),
	xValue: decimal("x_value", { precision: 20, scale: 6 }),
	yValue: decimal("y_value", { precision: 20, scale: 6 }),
	xStart: decimal("x_start", { precision: 20, scale: 6 }),
	xEnd: decimal("x_end", { precision: 20, scale: 6 }),
	yStart: decimal("y_start", { precision: 20, scale: 6 }),
	yEnd: decimal("y_end", { precision: 20, scale: 6 }),
	label: varchar({ length: 255 }),
	description: text(),
	color: varchar({ length: 20 }).default('#ff0000'),
	style: text(),
	createdBy: int("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});


export const cpkRules = mysqlTable("cpk_rules", {
	id: int().autoincrement().notNull(),
	code: varchar({ length: 50 }).notNull(),
	name: varchar({ length: 200 }).notNull(),
	description: text(),
	minCpk: int(),
	maxCpk: int(),
	status: varchar({ length: 50 }).notNull(),
	color: varchar({ length: 20 }),
	action: text(),
	severity: mysqlEnum(['info','warning','critical']).default('info').notNull(),
	isEnabled: int().default(1).notNull(),
	sortOrder: int().default(0).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("cpk_rules_code_unique").on(table.code),
]);


export const spcAnalysisHistory = mysqlTable("spc_analysis_history", {
	id: int().autoincrement().notNull(),
	mappingId: int().notNull(),
	productCode: varchar({ length: 100 }).notNull(),
	stationName: varchar({ length: 100 }).notNull(),
	startDate: timestamp({ mode: 'string' }).notNull(),
	endDate: timestamp({ mode: 'string' }).notNull(),
	sampleCount: int().notNull(),
	mean: int().notNull(),
	stdDev: int().notNull(),
	cp: int(),
	cpk: int(),
	ucl: int(),
	lcl: int(),
	usl: int(),
	lsl: int(),
	alertTriggered: int().default(0).notNull(),
	llmAnalysis: text(),
	analyzedBy: int().notNull(),
	analyzedAt: timestamp("analyzed_at", { mode: 'string' }).default('CURRENT_TIMESTAMP'),
	productionLineId: int("production_line_id"),
	violations: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_spc_analysis_history_product_code").on(table.productCode),	index("idx_spc_analysis_history_station_name").on(table.stationName),
	index("idx_spc_analysis_history_created_at").on(table.createdAt),
	index("idx_spc_analysis_history_cpk").on(table.cpk),
	index("idx_spc_analysis_product").on(table.productCode),
	index("idx_spc_analysis_station").on(table.stationName),
	index("idx_spc_analysis_date").on(table.createdAt),
	index("idx_spc_analysis_mapping").on(table.mappingId),
	index("").on(table.stationName),
	index("idx_spc_analysis_history_mapping").on(table.mappingId),
	index("idx_spc_analysis_history_composite").on(table.productCode, table.stationName, table.createdAt),
	index("idx_spc_analysis_history_product").on(table.productCode, table.startDate),
	index("idx_spc_analysis_history_dates").on(table.startDate, table.endDate),
	index("idx_spc_history_mapping").on(table.mappingId),
	index("idx_spc_history_created").on(table.createdAt),
	index("idx_spc_history_mapping_created").on(table.mappingId, table.createdAt),
]);


export const spcDefectCategories = mysqlTable("spc_defect_categories", {
	id: int().autoincrement().notNull(),
	code: varchar({ length: 50 }).notNull(),
	name: varchar({ length: 200 }).notNull(),
	description: text(),
	category: varchar({ length: 100 }),
	severity: varchar({ length: 20 }).default('medium').notNull(),
	isActive: int().default(1).notNull(),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});


export const spcDefectRecords = mysqlTable("spc_defect_records", {
	id: int().autoincrement().notNull(),
	defectCategoryId: int().notNull(),
	productionLineId: int(),
	workstationId: int(),
	productId: int(),
	spcAnalysisId: int(),
	ruleViolated: varchar({ length: 100 }),
	quantity: int().default(1).notNull(),
	notes: text(),
	occurredAt: timestamp({ mode: 'string' }).notNull(),
	reportedBy: int().notNull(),
	status: varchar({ length: 20 }).default('open').notNull(),
	resolvedAt: timestamp({ mode: 'string' }),
	resolvedBy: int(),
	rootCause: text(),
	correctiveAction: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	verificationStatus: mysqlEnum(['pending','real_ng','ntf']).default('pending'),
	verifiedAt: timestamp({ mode: 'string' }),
	verifiedBy: int(),
	verificationNotes: text(),
	ntfReason: varchar({ length: 200 }),
},
(table) => [
	index("idx_spc_defect_records_production_line").on(table.productionLineId),
	index("idx_spc_defect_records_created_at").on(table.createdAt),
	index("idx_spc_defect_records_status").on(table.verificationStatus),
	index("idx_spc_defects_category").on(table.defectCategoryId, table.occurredAt),
	index("idx_spc_defects_status").on(table.status, table.occurredAt),
	index("idx_spc_defects_line").on(table.productionLineId, table.occurredAt),
]);


export const spcPlanExecutionLogs = mysqlTable("spc_plan_execution_logs", {
	id: int().autoincrement().notNull(),
	planId: int().notNull(),
	executedAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	status: mysqlEnum(['success','failed','partial']).notNull(),
	sampleCount: int().default(0).notNull(),
	violationCount: int().default(0).notNull(),
	cpkValue: int(),
	meanValue: int(),
	stdDevValue: int(),
	errorMessage: text(),
	notificationSent: int().default(0).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_spc_exec_plan").on(table.planId, table.executedAt),
	index("idx_spc_exec_status").on(table.status, table.executedAt),
]);


export const spcPlanTemplates = mysqlTable("spc_plan_templates", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	measurementName: varchar({ length: 255 }),
	usl: decimal({ precision: 15, scale: 6 }),
	lsl: decimal({ precision: 15, scale: 6 }),
	target: decimal({ precision: 15, scale: 6 }),
	unit: varchar({ length: 50 }),
	sampleSize: int().default(5),
	sampleFrequency: int().default(60),
	enabledSpcRules: text(),
	enabledCpkRules: text(),
	enabledCaRules: text(),
	isRecurring: int().default(1),
	notifyOnViolation: int().default(1),
	createdBy: int(),
	isPublic: int().default(0),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});


export const spcRealtimeData = mysqlTable("spc_realtime_data", {
	id: int().autoincrement().notNull(),
	planId: int().notNull(),
	productionLineId: int().notNull(),
	mappingId: int(),
	sampleIndex: int().notNull(),
	sampleValue: int().notNull(),
	subgroupIndex: int().notNull(),
	subgroupMean: int(),
	subgroupRange: int(),
	ucl: int(),
	lcl: int(),
	usl: int(),
	lsl: int(),
	centerLine: int(),
	isOutOfSpec: int().default(0).notNull(),
	isOutOfControl: int().default(0).notNull(),
	violatedRules: varchar({ length: 100 }),
	sampledAt: timestamp({ mode: 'string' }).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_spc_realtime_plan").on(table.planId),
	index("idx_spc_realtime_line").on(table.productionLineId),
	index("idx_spc_realtime_sampled").on(table.sampledAt),
	index("idx_realtime_plan").on(table.planId),
	index("idx_realtime_sampled").on(table.sampledAt),
	index("idx_realtime_plan_sampled").on(table.planId, table.sampledAt),
]);


export const spcRuleViolations = mysqlTable("spc_rule_violations", {
	id: int().autoincrement().notNull(),
	analysisId: int().notNull(),
	ruleNumber: int().notNull(),
	ruleName: varchar({ length: 255 }).notNull(),
	violationDescription: text(),
	dataPointIndex: int(),
	dataPointValue: int(),
	severity: mysqlEnum(['warning','critical']).default('warning').notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_spc_violations_analysis").on(table.analysisId, table.severity),
]);


export const spcRules = mysqlTable("spc_rules", {
	id: int().autoincrement().notNull(),
	code: varchar({ length: 50 }).notNull(),
	name: varchar({ length: 200 }).notNull(),
	description: text(),
	category: varchar({ length: 100 }).default('western_electric').notNull(),
	formula: text(),
	example: text(),
	severity: mysqlEnum(['warning','critical']).default('warning').notNull(),
	threshold: int(),
	consecutivePoints: int(),
	sigmaLevel: int(),
	isEnabled: int().default(1).notNull(),
	sortOrder: int().default(0).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("spc_rules_code_unique").on(table.code),
]);


export const spcRulesConfig = mysqlTable("spc_rules_config", {
	id: int().autoincrement().notNull(),
	mappingId: int(),
	rule1Enabled: int().default(1).notNull(),
	rule2Enabled: int().default(1).notNull(),
	rule3Enabled: int().default(1).notNull(),
	rule4Enabled: int().default(1).notNull(),
	rule5Enabled: int().default(1).notNull(),
	rule6Enabled: int().default(1).notNull(),
	rule7Enabled: int().default(1).notNull(),
	rule8Enabled: int().default(1).notNull(),
	caRulesEnabled: int().default(1).notNull(),
	caThreshold: int().default(100).notNull(),
	cpkExcellent: int().default(167).notNull(),
	cpkGood: int().default(133).notNull(),
	cpkAcceptable: int().default(100).notNull(),
	isActive: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});


export const spcSamplingPlans = mysqlTable("spc_sampling_plans", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	productionLineId: int().notNull(),
	productId: int(),
	workstationId: int(),
	samplingConfigId: int().notNull(),
	specificationId: int(),
	startTime: timestamp({ mode: 'string' }),
	endTime: timestamp({ mode: 'string' }),
	isRecurring: int().default(1).notNull(),
	status: mysqlEnum(['draft','active','paused','completed']).default('draft').notNull(),
	lastRunAt: timestamp({ mode: 'string' }),
	nextRunAt: timestamp({ mode: 'string' }),
	notifyOnViolation: int().default(1).notNull(),
	notifyEmail: varchar({ length: 320 }),
	isActive: int().default(1).notNull(),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	mappingId: int(),
	machineId: int(),
	fixtureId: int(),
	enabledSpcRules: text(),
	enabledCaRules: text(),
	enabledCpkRules: text(),
	alertThresholdId: int(),
	cpkAlertEnabled: int().default(0).notNull(),
	cpkUpperLimit: varchar({ length: 20 }),
	cpkLowerLimit: varchar({ length: 20 }),
},
(table) => [
	index("idx_spc_sampling_plans_status").on(table.status),
	index("idx_spc_sampling_plans_production_line").on(table.productionLineId),
	index("").on(table.productionLineId),
	index("idx_spc_sampling_plans_product").on(table.productId),
	index("idx_spc_sampling_plans_active").on(table.isActive),
]);


export const spcSummaryStats = mysqlTable("spc_summary_stats", {
	id: int().autoincrement().notNull(),
	planId: int().notNull(),
	productionLineId: int().notNull(),
	mappingId: int(),
	periodType: mysqlEnum(['shift','day','week','month']).notNull(),
	periodStart: timestamp({ mode: 'string' }).notNull(),
	periodEnd: timestamp({ mode: 'string' }).notNull(),
	sampleCount: int().default(0).notNull(),
	subgroupCount: int().default(0).notNull(),
	mean: int(),
	stdDev: int(),
	min: int(),
	max: int(),
	range: int(),
	cp: int(),
	cpk: int(),
	pp: int(),
	ppk: int(),
	ca: int(),
	xBarUcl: int(),
	xBarLcl: int(),
	rUcl: int(),
	rLcl: int(),
	outOfSpecCount: int().default(0).notNull(),
	outOfControlCount: int().default(0).notNull(),
	rule1Violations: int().default(0).notNull(),
	rule2Violations: int().default(0).notNull(),
	rule3Violations: int().default(0).notNull(),
	rule4Violations: int().default(0).notNull(),
	rule5Violations: int().default(0).notNull(),
	rule6Violations: int().default(0).notNull(),
	rule7Violations: int().default(0).notNull(),
	rule8Violations: int().default(0).notNull(),
	overallStatus: mysqlEnum(['excellent','good','acceptable','needs_improvement','critical']).default('good').notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_spc_summary_plan").on(table.planId),
	index("idx_spc_summary_line").on(table.productionLineId),
	index("idx_spc_summary_period").on(table.periodType, table.periodStart),
	index("idx_summary_plan").on(table.planId),
	index("idx_summary_period").on(table.periodStart),
	index("idx_summary_plan_period").on(table.planId, table.periodStart),
]);


export const lineComparisonSessions = mysqlTable("line_comparison_sessions", {
	id: int().autoincrement().notNull().primaryKey(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	userId: int("user_id").notNull(),
	// Comparison configuration
	productionLineIds: json("production_line_ids").notNull(), // Array of production line IDs to compare
	productId: int("product_id"), // Optional: filter by product
	dateFrom: timestamp("date_from", { mode: 'string' }).notNull(),
	dateTo: timestamp("date_to", { mode: 'string' }).notNull(),
	// Metrics to compare
	compareMetrics: json("compare_metrics"), // Array of metrics: ['cpk', 'ppk', 'ng_rate', 'oee', etc.]
	// Results cache
	comparisonResults: json("comparison_results"),
	// Metadata
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_line_comparison_user").on(table.userId),
	index("idx_line_comparison_created").on(table.createdAt),
]);


export type LineComparisonSession = typeof lineComparisonSessions.$inferSelect;

export type InsertLineComparisonSession = typeof lineComparisonSessions.$inferInsert;

// AI Vision Dashboard Configs - Cấu hình dashboard AI Vision cho từng user

export const measurementRemarks = mysqlTable("measurement_remarks", {
  id: int().autoincrement().primaryKey(),
  measurementId: int("measurement_id").notNull(),
  measurementType: mysqlEnum("measurement_type", ['machine_measurement','spc_analysis','inspection']).notNull(),
  remark: text().notNull(),
  remarkType: mysqlEnum("remark_type", ['note','issue','correction','observation','action']).default('note'),
  severity: mysqlEnum(['info','warning','critical']).default('info'),
  imageUrls: json("image_urls"),
  attachmentUrls: json("attachment_urls"),
  createdBy: int("created_by"),
  createdByName: varchar("created_by_name", { length: 255 }),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_measurement_remarks_measurement").on(table.measurementId),
  index("idx_measurement_remarks_type").on(table.measurementType),
  index("idx_measurement_remarks_created_by").on(table.createdBy),
]);

export type MeasurementRemark = typeof measurementRemarks.$inferSelect;

export type InsertMeasurementRemark = typeof measurementRemarks.$inferInsert;

// Inspection Remarks - Ghi chú cho kết quả kiểm tra
