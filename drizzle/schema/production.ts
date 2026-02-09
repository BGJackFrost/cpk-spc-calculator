import { mysqlTable, mysqlSchema, AnyMySqlColumn, int, varchar, timestamp, index, json, decimal, text, mysqlEnum, datetime, bigint, tinyint, boolean, date } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"


// === PRODUCTION Domain Tables ===

export const downtimeReasons = mysqlTable("downtime_reasons", {
	id: int().autoincrement().notNull(),
	machineId: int("machine_id"),
	oeeDataId: int("oee_data_id"),
	reasonCode: varchar("reason_code", { length: 50 }).notNull(),
	reasonCategory: varchar("reason_category", { length: 100 }),
	reasonDescription: varchar("reason_description", { length: 500 }),
	durationMinutes: int("duration_minutes").notNull(),
	occurredAt: timestamp("occurred_at", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});


export const fixtures = mysqlTable("fixtures", {
	id: int().autoincrement().notNull(),
	machineId: int().notNull(),
	code: varchar({ length: 50 }).notNull(),
	name: varchar({ length: 200 }).notNull(),
	description: text(),
	imageUrl: varchar({ length: 500 }),
	position: int().default(1).notNull(),
	status: mysqlEnum(['active','maintenance','inactive']).default('active').notNull(),
	installDate: timestamp({ mode: 'string' }),
	lastMaintenanceDate: timestamp({ mode: 'string' }),
	isActive: int().default(1).notNull(),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_fixtures_machine_id").on(table.machineId),
	index("idx_fixtures_active").on(table.isActive),
]);


export const machineApiKeys = mysqlTable("machine_api_keys", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	apiKey: varchar({ length: 64 }).notNull(),
	apiKeyHash: varchar({ length: 255 }).notNull(),
	vendorName: varchar({ length: 255 }).notNull(),
	machineType: varchar({ length: 100 }).notNull(),
	machineId: int(),
	productionLineId: int(),
	permissions: text(),
	rateLimit: int().default(100).notNull(),
	isActive: int().default(1).notNull(),
	expiresAt: timestamp({ mode: 'string' }),
	lastUsedAt: timestamp({ mode: 'string' }),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("apiKey").on(table.apiKey),
]);


export const machineAreaAssignments = mysqlTable("machine_area_assignments", {
	id: int().autoincrement().notNull(),
	machineId: int().notNull(),
	areaId: int().notNull(),
	sortOrder: int().default(0),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});


export const machineAreas = mysqlTable("machine_areas", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	code: varchar({ length: 100 }).notNull(),
	description: text(),
	parentId: int(),
	type: mysqlEnum(['factory','line','zone','area']).default('area'),
	sortOrder: int().default(0),
	isActive: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});


export const machineBom = mysqlTable("machine_bom", {
	id: int().autoincrement().notNull(),
	machineId: int().notNull(),
	sparePartId: int().notNull(),
	quantity: int().default(1).notNull(),
	isRequired: int().default(1).notNull(),
	replacementInterval: int(),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_machine_bom_machine").on(table.machineId),
	index("idx_machine_bom_spare_part").on(table.sparePartId),
]);


export const machineDataLogs = mysqlTable("machine_data_logs", {
	id: int().autoincrement().notNull(),
	apiKeyId: int().notNull(),
	endpoint: varchar({ length: 255 }).notNull(),
	method: varchar({ length: 10 }).notNull(),
	requestBody: text(),
	responseStatus: int().notNull(),
	responseBody: text(),
	processingTimeMs: int(),
	ipAddress: varchar({ length: 45 }),
	userAgent: varchar({ length: 500 }),
	errorMessage: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});


export const machineDowntimeRecords = mysqlTable("machine_downtime_records", {
	id: int().autoincrement().notNull(),
	machineId: int("machine_id").notNull(),
	machineName: varchar("machine_name", { length: 100 }),
	productionLineId: int("production_line_id"),
	downtimeCategory: varchar("downtime_category", { length: 100 }).notNull(),
	downtimeReason: varchar("downtime_reason", { length: 255 }).notNull(),
	startTime: timestamp("start_time", { mode: 'string' }).notNull(),
	endTime: timestamp("end_time", { mode: 'string' }),
	durationMinutes: int("duration_minutes"),
	severity: mysqlEnum(['minor','moderate','major','critical']).default('moderate').notNull(),
	resolvedBy: int("resolved_by"),
	resolution: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});


export const machineFieldMappings = mysqlTable("machine_field_mappings", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 200 }).notNull(),
	apiKeyId: int(),
	machineType: varchar({ length: 100 }),
	sourceField: varchar({ length: 200 }).notNull(),
	targetField: varchar({ length: 200 }).notNull(),
	targetTable: mysqlEnum(['measurements','inspection_data','oee_records']).notNull(),
	transformType: mysqlEnum(['direct','multiply','divide','add','subtract','custom']).default('direct').notNull(),
	transformValue: decimal({ precision: 15, scale: 6 }),
	customTransform: text(),
	defaultValue: varchar({ length: 255 }),
	isRequired: int().default(0).notNull(),
	isActive: int().default(1).notNull(),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});


export const machineInspectionData = mysqlTable("machine_inspection_data", {
	id: int().autoincrement().notNull(),
	apiKeyId: int().notNull(),
	machineId: int(),
	productionLineId: int(),
	factoryId: int("factory_id"),
	workshopId: int("workshop_id"),
	workstationId: int("workstation_id"),
	batchId: varchar({ length: 100 }),
	productCode: varchar({ length: 100 }),
	serialNumber: varchar({ length: 100 }),
	inspectionType: varchar({ length: 50 }).notNull(),
	inspectionResult: varchar({ length: 20 }).notNull(),
	defectCount: int().default(0),
	defectTypes: text(),
	defectDetails: text(),
	imageUrls: text(),
	inspectedAt: timestamp({ mode: 'string' }).notNull(),
	cycleTimeMs: int(),
	operatorId: varchar({ length: 50 }),
	shiftId: varchar({ length: 50 }),
	rawData: text(),
	remark: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});


export const machineIntegrationConfigs = mysqlTable("machine_integration_configs", {
	id: int().autoincrement().notNull(),
	apiKeyId: int().notNull(),
	configType: varchar({ length: 50 }).notNull(),
	configName: varchar({ length: 255 }).notNull(),
	configValue: text().notNull(),
	isActive: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});


export const machineMeasurementData = mysqlTable("machine_measurement_data", {
	id: int().autoincrement().notNull(),
	apiKeyId: int().notNull(),
	machineId: int(),
	productionLineId: int(),
	factoryId: int("factory_id"),
	workshopId: int("workshop_id"),
	workstationId: int("workstation_id"),
	batchId: varchar({ length: 100 }),
	productCode: varchar({ length: 100 }),
	serialNumber: varchar({ length: 100 }),
	parameterName: varchar({ length: 255 }).notNull(),
	parameterCode: varchar({ length: 100 }),
	measuredValue: decimal({ precision: 15, scale: 6 }).notNull(),
	unit: varchar({ length: 50 }),
	lsl: decimal({ precision: 15, scale: 6 }),
	usl: decimal({ precision: 15, scale: 6 }),
	target: decimal({ precision: 15, scale: 6 }),
	isWithinSpec: int(),
	measuredAt: timestamp({ mode: 'string' }).notNull(),
	operatorId: varchar({ length: 50 }),
	shiftId: varchar({ length: 50 }),
	rawData: text(),
	remark: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});


export const machineOeeData = mysqlTable("machine_oee_data", {
	id: int().autoincrement().notNull(),
	apiKeyId: int().notNull(),
	machineId: int(),
	productionLineId: int(),
	shiftId: varchar({ length: 50 }),
	recordDate: varchar({ length: 10 }).notNull(),
	plannedProductionTime: int(),
	actualProductionTime: int(),
	downtime: int(),
	downtimeReasons: text(),
	idealCycleTime: decimal({ precision: 10, scale: 4 }),
	actualCycleTime: decimal({ precision: 10, scale: 4 }),
	totalCount: int(),
	goodCount: int(),
	rejectCount: int(),
	reworkCount: int(),
	availability: decimal({ precision: 5, scale: 2 }),
	performance: decimal({ precision: 5, scale: 2 }),
	quality: decimal({ precision: 5, scale: 2 }),
	oee: decimal({ precision: 5, scale: 2 }),
	recordedAt: timestamp({ mode: 'string' }).notNull(),
	rawData: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});


export const machineOnlineStatus = mysqlTable("machine_online_status", {
	id: int().autoincrement().notNull(),
	machineId: int().notNull(),
	connectionId: int(),
	isOnline: int().default(0).notNull(),
	lastHeartbeat: timestamp({ mode: 'string' }),
	lastDataReceived: timestamp({ mode: 'string' }),
	currentCpk: int(),
	currentMean: int(),
	activeAlarmCount: int().default(0).notNull(),
	warningCount: int().default(0).notNull(),
	criticalCount: int().default(0).notNull(),
	status: mysqlEnum(['idle','running','warning','critical','offline']).default('offline'),
	statusMessage: text(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("machineId").on(table.machineId),
	index("idx_machine_status_machine").on(table.machineId),
]);


export const machineRealtimeEvents = mysqlTable("machine_realtime_events", {
	id: int().autoincrement().notNull(),
	eventType: mysqlEnum(['inspection','measurement','oee','alert','status']).notNull(),
	machineId: int(),
	machineName: varchar({ length: 200 }),
	apiKeyId: int(),
	eventData: text().notNull(),
	severity: mysqlEnum(['info','warning','error','critical']).default('info').notNull(),
	isProcessed: int().default(0).notNull(),
	processedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});


export const machineStatusHistory = mysqlTable("machine_status_history", {
	id: int().autoincrement().notNull(),
	machineId: int().notNull(),
	status: mysqlEnum(['online','offline','idle','running','warning','critical','maintenance']).notNull(),
	startTime: timestamp({ mode: 'string' }).notNull(),
	endTime: timestamp({ mode: 'string' }),
	durationMinutes: int(),
	reason: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});


export const machineTypes = mysqlTable("machine_types", {
	id: int().autoincrement().notNull(),
	code: varchar({ length: 50 }).notNull(),
	name: varchar({ length: 200 }).notNull(),
	description: text(),
	category: varchar({ length: 100 }),
	isActive: int().default(1).notNull(),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});


export const machineWebhookConfigs = mysqlTable("machine_webhook_configs", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 200 }).notNull(),
	webhookUrl: varchar({ length: 500 }).notNull(),
	webhookSecret: varchar({ length: 255 }),
	triggerType: mysqlEnum(['inspection_fail','oee_low','measurement_out_of_spec','all']).notNull(),
	machineIds: text(),
	oeeThreshold: decimal({ precision: 5, scale: 2 }),
	isActive: int().default(1).notNull(),
	retryCount: int().default(3).notNull(),
	retryDelaySeconds: int().default(60).notNull(),
	headers: text(),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});


export const machineWebhookLogs = mysqlTable("machine_webhook_logs", {
	id: int().autoincrement().notNull(),
	webhookConfigId: int().notNull(),
	triggerType: varchar({ length: 50 }).notNull(),
	triggerDataId: int(),
	requestPayload: text(),
	responseStatus: int(),
	responseBody: text(),
	responseTime: int(),
	attempt: int().default(1).notNull(),
	status: mysqlEnum(['pending','success','failed','retrying']).default('pending').notNull(),
	errorMessage: text(),
	triggeredAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	completedAt: timestamp({ mode: 'string' }),
});


export const productionLineMachines = mysqlTable("production_line_machines", {
	id: int().autoincrement().notNull(),
	productionLineId: int().notNull(),
	machineId: int().notNull(),
	processStepId: int(),
	assignedAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	assignedBy: int().notNull(),
	isActive: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});


export const productionLineProducts = mysqlTable("production_line_products", {
	id: int().autoincrement().notNull(),
	productionLineId: int().notNull(),
	productId: int().notNull(),
	isDefault: int().default(0).notNull(),
	cycleTime: int(),
	targetOutput: int(),
	isActive: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});


export const productionLines = mysqlTable("production_lines", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	code: varchar({ length: 100 }).notNull(),
	description: text(),
	location: varchar({ length: 255 }),
	isActive: int().default(1).notNull(),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	productId: int(),
	processTemplateId: int(),
	supervisorId: int(),
	imageUrl: varchar({ length: 500 }),
	factoryId: int("factory_id"),
	workshopId: int("workshop_id"),
},
(table) => [
	index("production_lines_code_unique").on(table.code),
]);


export const shiftReports = mysqlTable("shift_reports", {
	id: int().autoincrement().notNull(),
	shiftDate: timestamp({ mode: 'string' }).notNull(),
	shiftType: mysqlEnum(['morning','afternoon','night']).notNull(),
	shiftStart: timestamp({ mode: 'string' }).notNull(),
	shiftEnd: timestamp({ mode: 'string' }).notNull(),
	productionLineId: int(),
	machineId: int(),
	oee: decimal({ precision: 5, scale: 2 }),
	availability: decimal({ precision: 5, scale: 2 }),
	performance: decimal({ precision: 5, scale: 2 }),
	quality: decimal({ precision: 5, scale: 2 }),
	cpk: decimal({ precision: 6, scale: 4 }),
	cp: decimal({ precision: 6, scale: 4 }),
	ppk: decimal({ precision: 6, scale: 4 }),
	totalProduced: int().default(0),
	goodCount: int().default(0),
	defectCount: int().default(0),
	plannedTime: int().default(0),
	actualRunTime: int().default(0),
	downtime: int().default(0),
	alertCount: int().default(0),
	spcViolationCount: int().default(0),
	status: mysqlEnum(['generated','sent','failed']).default('generated'),
	sentAt: timestamp({ mode: 'string' }),
	sentTo: text(),
	reportContent: text(),
	reportFileUrl: varchar({ length: 500 }),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP'),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
});


export const workstations = mysqlTable("workstations", {
	id: int().autoincrement().notNull(),
	productionLineId: int().notNull(),
	name: varchar({ length: 255 }).notNull(),
	code: varchar({ length: 100 }).notNull(),
	description: text(),
	sequenceOrder: int().default(0).notNull(),
	cycleTime: int(),
	isActive: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	imageUrl: varchar({ length: 500 }),
},
(table) => [
	index("idx_workstations_active").on(table.isActive),
]);


// ============ IoT Enhancement Tables ============

// IoT Device Groups

export const machineYieldStatistics = mysqlTable("machine_yield_statistics", {
	id: int().autoincrement().notNull().primaryKey(),
	machineId: int("machine_id").notNull(),
	productId: int("product_id"),
	date: varchar({ length: 10 }).notNull(), // YYYY-MM-DD
	shift: varchar({ length: 20 }),
	totalInspected: int("total_inspected").default(0).notNull(),
	okCount: int("ok_count").default(0).notNull(),
	ngCount: int("ng_count").default(0).notNull(),
	ntfCount: int("ntf_count").default(0).notNull(),
	yieldRate: decimal("yield_rate", { precision: 8, scale: 4 }),
	firstPassYield: decimal("first_pass_yield", { precision: 8, scale: 4 }),
	topDefects: json("top_defects"),
	metadata: json("metadata"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
	index("idx_yield_machine").on(table.machineId),
	index("idx_yield_date").on(table.date),
	index("idx_yield_product").on(table.productId),
]);

export type MachineYieldStatistic = typeof machineYieldStatistics.$inferSelect;

export type InsertMachineYieldStatistic = typeof machineYieldStatistics.$inferInsert;

// AI Image Analysis Results - Kết quả phân tích ảnh AI
