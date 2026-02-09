import { mysqlTable, mysqlSchema, AnyMySqlColumn, int, varchar, timestamp, index, json, decimal, text, mysqlEnum, datetime, bigint, tinyint, boolean, date } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"


// === CORE Domain Tables ===

export const accountLockouts = mysqlTable("account_lockouts", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull(),
	username: varchar({ length: 100 }).notNull(),
	lockedAt: timestamp("locked_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	lockedUntil: timestamp("locked_until", { mode: 'string' }).notNull(),
	reason: varchar({ length: 255 }),
	failedAttempts: int("failed_attempts").default(0).notNull(),
	unlockedAt: timestamp("unlocked_at", { mode: 'string' }),
	unlockedBy: int("unlocked_by"),
});


export const auditLogs = mysqlTable("audit_logs", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	userName: varchar({ length: 255 }),
	action: mysqlEnum(['create','update','delete','login','logout','export','analyze']).notNull(),
	module: varchar({ length: 100 }).notNull(),
	tableName: varchar({ length: 100 }),
	recordId: int(),
	oldValue: text(),
	newValue: text(),
	description: text(),
	ipAddress: varchar({ length: 45 }),
	userAgent: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	authType: mysqlEnum(['local','online']).default('online'),
},
(table) => [
	index("idx_audit_logs_user_id").on(table.userId),
	index("idx_audit_logs_action").on(table.action),
	index("idx_audit_logs_created_at").on(table.createdAt),
	index("idx_audit_user").on(table.userId),
	index("idx_audit_action").on(table.action),
	index("idx_audit_date").on(table.createdAt),
	index("").on(table.action),
	index("idx_audit_logs_user").on(table.userId, table.createdAt),
	index("idx_audit_logs_module").on(table.module, table.createdAt),
	index("idx_audit_logs_created").on(table.createdAt),
	index("idx_audit_created").on(table.createdAt),
	index("idx_audit_user_created").on(table.userId, table.createdAt),
]);


export const autoResolveConfigs = mysqlTable("auto_resolve_configs", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	alertType: varchar("alert_type", { length: 100 }).notNull(),
	checkIntervalMinutes: int("check_interval_minutes").default(5).notNull(),
	consecutiveOkCount: int("consecutive_ok_count").default(3).notNull(),
	metricThreshold: decimal("metric_threshold", { precision: 10, scale: 4 }),
	metricOperator: mysqlEnum("metric_operator", ['gt','gte','lt','lte','eq']).default('gte').notNull(),
	autoResolveAfterMinutes: int("auto_resolve_after_minutes"),
	notifyOnAutoResolve: int("notify_on_auto_resolve").default(1).notNull(),
	notifyEmails: text("notify_emails"),
	notifyPhones: text("notify_phones"),
	productionLineIds: json("production_line_ids"),
	machineIds: json("machine_ids"),
	isActive: int("is_active").default(1).notNull(),
	lastRunAt: timestamp("last_run_at", { mode: 'string' }),
	createdBy: int("created_by"),
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
	updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
	notificationChannels: varchar("notification_channels", { length: 255 }),
},
(table) => [
	index("idx_auto_resolve_type").on(table.alertType),
	index("idx_auto_resolve_active").on(table.isActive),
]);


export const autoResolveLogs = mysqlTable("auto_resolve_logs", {
	id: int().autoincrement().notNull(),
	configId: int("config_id").notNull(),
	escalationHistoryId: int("escalation_history_id").notNull(),
	alertId: int("alert_id").notNull(),
	resolveReason: varchar("resolve_reason", { length: 255 }).notNull(),
	metricValueAtResolve: decimal("metric_value_at_resolve", { precision: 10, scale: 4 }),
	consecutiveOkCount: int("consecutive_ok_count").default(0).notNull(),
	notificationsSent: int("notifications_sent").default(0).notNull(),
	notificationErrors: text("notification_errors"),
	resolvedAt: timestamp("resolved_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
	escalationId: int("escalation_id"),
	alertType: varchar("alert_type", { length: 50 }),
	reason: text(),
	metricValue: decimal("metric_value", { precision: 10, scale: 4 }),
	notificationSent: tinyint("notification_sent").default(0),
},
(table) => [
	index("idx_auto_resolve_log_config").on(table.configId),
	index("idx_auto_resolve_log_esc").on(table.escalationHistoryId),
	index("idx_auto_resolve_log_resolved").on(table.resolvedAt),
]);


export const companies = mysqlTable("companies", {
	id: int().autoincrement().notNull(),
	code: varchar({ length: 50 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	address: text(),
	phone: varchar({ length: 50 }),
	email: varchar({ length: 320 }),
	taxCode: varchar({ length: 50 }),
	logo: varchar({ length: 500 }),
	isActive: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("code").on(table.code),
]);


export const departments = mysqlTable("departments", {
	id: int().autoincrement().notNull(),
	companyId: int().notNull(),
	code: varchar({ length: 50 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	parentId: int(),
	managerId: int(),
	isActive: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});


export const employeeProfiles = mysqlTable("employee_profiles", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	userType: mysqlEnum(['manus','local']).default('local').notNull(),
	employeeCode: varchar({ length: 50 }),
	companyId: int(),
	departmentId: int(),
	teamId: int(),
	positionId: int(),
	managerId: int(),
	phone: varchar({ length: 50 }),
	address: text(),
	dateOfBirth: timestamp({ mode: 'string' }),
	joinDate: timestamp({ mode: 'string' }),
	isActive: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("userId").on(table.userId),
	index("employeeCode").on(table.employeeCode),
]);


export const jigs = mysqlTable("jigs", {
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
});


export const latencyMetrics = mysqlTable("latency_metrics", {
	id: int().autoincrement().notNull(),
	sourceType: mysqlEnum("source_type", ['iot_device','webhook','api','database','mqtt']).notNull(),
	sourceId: varchar("source_id", { length: 100 }).notNull(),
	sourceName: varchar("source_name", { length: 200 }),
	latencyMs: int("latency_ms").notNull(),
	hourOfDay: int("hour_of_day").notNull(),
	dayOfWeek: int("day_of_week").notNull(),
	endpoint: varchar({ length: 255 }),
	statusCode: int("status_code"),
	isSuccess: int("is_success").default(1).notNull(),
	measuredAt: timestamp("measured_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_source").on(table.sourceType, table.sourceId),
	index("idx_time_bucket").on(table.hourOfDay, table.dayOfWeek),
	index("idx_measured_at").on(table.measuredAt),
]);


export const latencyRecords = mysqlTable("latency_records", {
	id: int().autoincrement().notNull(),
	deviceId: int("device_id"),
	deviceName: varchar("device_name", { length: 100 }),
	sourceType: mysqlEnum("source_type", ['sensor','plc','gateway','server']).notNull(),
	latencyMs: decimal("latency_ms", { precision: 10, scale: 2 }).notNull(),
	timestamp: timestamp({ mode: 'string' }).notNull(),
	metadata: json(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});


export const machines = mysqlTable("machines", {
	id: int().autoincrement().notNull(),
	workstationId: int().notNull(),
	name: varchar({ length: 255 }).notNull(),
	code: varchar({ length: 100 }).notNull(),
	machineType: varchar({ length: 100 }),
	manufacturer: varchar({ length: 255 }),
	model: varchar({ length: 255 }),
	serialNumber: varchar({ length: 255 }),
	installDate: timestamp({ mode: 'string' }),
	status: mysqlEnum(['active','maintenance','inactive']).default('active').notNull(),
	isActive: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	machineTypeId: int(),
	imageUrl: varchar({ length: 500 }),
},
(table) => [
	index("idx_machines_workstation_id").on(table.workstationId),
	index("idx_machines_machine_type_id").on(table.machineTypeId),
	index("idx_machines_machine_type").on(table.machineTypeId),
	index("idx_machines_active").on(table.isActive),
]);


export const mappingTemplates = mysqlTable("mapping_templates", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	category: varchar({ length: 100 }),
	tableName: varchar({ length: 255 }),
	productCodeColumn: varchar({ length: 255 }).default('product_code'),
	stationColumn: varchar({ length: 255 }).default('station'),
	valueColumn: varchar({ length: 255 }).default('value'),
	timestampColumn: varchar({ length: 255 }).default('timestamp'),
	defaultUsl: int(),
	defaultLsl: int(),
	defaultTarget: int(),
	filterConditions: text(),
	isActive: int().default(1).notNull(),
	createdBy: int(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});


export const memoryLeakReports = mysqlTable("memory_leak_reports", {
	id: int().autoincrement().notNull(),
	reportId: varchar("report_id", { length: 64 }).notNull(),
	heapUsed: bigint("heap_used", { mode: "number" }).notNull(),
	heapTotal: bigint("heap_total", { mode: "number" }).notNull(),
	external: bigint({ mode: "number" }),
	arrayBuffers: bigint("array_buffers", { mode: "number" }),
	rss: bigint({ mode: "number" }),
	threshold: bigint({ mode: "number" }),
	leakSuspected: int("leak_suspected").default(0).notNull(),
	growthRate: decimal("growth_rate", { precision: 10, scale: 4 }),
	stackTrace: text("stack_trace"),
	processId: varchar("process_id", { length: 50 }),
	hostname: varchar({ length: 100 }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("memory_leak_reports_report_id_unique").on(table.reportId),
]);


export const passwordResetTokens = mysqlTable("password_reset_tokens", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull(),
	token: varchar({ length: 255 }).notNull(),
	email: varchar({ length: 320 }).notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	usedAt: timestamp("used_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("token").on(table.token),
]);


export const poReceivingHistory = mysqlTable("po_receiving_history", {
	id: int().autoincrement().notNull(),
	purchaseOrderId: int().notNull(),
	purchaseOrderItemId: int().notNull(),
	sparePartId: int().notNull(),
	quantityReceived: int().notNull(),
	receivedBy: int(),
	receivedAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	notes: text(),
	batchNumber: varchar({ length: 100 }),
	qualityStatus: mysqlEnum(['good','damaged','rejected']).default('good'),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});


export const positions = mysqlTable("positions", {
	id: int().autoincrement().notNull(),
	code: varchar({ length: 50 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	level: int().default(1).notNull(),
	canApprove: int().default(0).notNull(),
	approvalLimit: decimal({ precision: 15, scale: 2 }),
	isActive: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("code").on(table.code),
]);


export const rateLimitConfig = mysqlTable("rate_limit_config", {
	id: int().autoincrement().notNull(),
	configKey: varchar({ length: 100 }).notNull(),
	configValue: text().notNull(),
	description: text(),
	updatedBy: int(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("configKey").on(table.configKey),
]);


export const rateLimitConfigHistory = mysqlTable("rate_limit_config_history", {
	id: int().autoincrement().notNull(),
	configKey: varchar({ length: 100 }).notNull(),
	oldValue: text(),
	newValue: text().notNull(),
	changedBy: int().notNull(),
	changedByName: varchar({ length: 255 }),
	changeReason: text(),
	ipAddress: varchar({ length: 45 }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});


export const rateLimitRoleConfig = mysqlTable("rate_limit_role_config", {
	id: int().autoincrement().notNull(),
	role: mysqlEnum(['user','admin','guest']).notNull(),
	maxRequests: int().default(5000).notNull(),
	maxAuthRequests: int().default(200).notNull(),
	maxExportRequests: int().default(100).notNull(),
	windowMs: int().default(900000).notNull(),
	description: text(),
	isActive: int().default(1).notNull(),
	updatedBy: int(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("role").on(table.role),
]);


export const reportTemplates = mysqlTable("report_templates", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	companyName: varchar({ length: 255 }),
	companyLogo: text(),
	headerText: text(),
	footerText: text(),
	primaryColor: varchar({ length: 20 }).default('#3b82f6'),
	secondaryColor: varchar({ length: 20 }).default('#64748b'),
	fontFamily: varchar({ length: 100 }).default('Arial'),
	showLogo: int().default(1).notNull(),
	showCompanyName: int().default(1).notNull(),
	showDate: int().default(1).notNull(),
	showCharts: int().default(1).notNull(),
	showRawData: int().default(0).notNull(),
	isDefault: int().default(0).notNull(),
	isActive: int().default(1).notNull(),
	createdBy: int(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});


export const sampleMeasurements = mysqlTable("sample_measurements", {
	id: int().autoincrement().notNull(),
	productCode: varchar("product_code", { length: 50 }).notNull(),
	stationName: varchar("station_name", { length: 100 }).notNull(),
	measurementValue: decimal("measurement_value", { precision: 10, scale: 4 }).notNull(),
	measurementTime: datetime("measurement_time", { mode: 'string'}).notNull(),
	operator: varchar({ length: 100 }),
	batchNumber: varchar("batch_number", { length: 50 }),
	status: varchar({ length: 20 }).default('OK'),
});


export const sampleProducts = mysqlTable("sample_products", {
	id: int().autoincrement().notNull(),
	productCode: varchar("product_code", { length: 50 }).notNull(),
	productName: varchar("product_name", { length: 255 }).notNull(),
	category: varchar({ length: 100 }),
	unit: varchar({ length: 50 }),
	usl: decimal({ precision: 10, scale: 3 }),
	lsl: decimal({ precision: 10, scale: 3 }),
	targetValue: decimal("target_value", { precision: 10, scale: 3 }),
	createdAt: datetime("created_at", { mode: 'string'}).default('CURRENT_TIMESTAMP'),
});


export const samplingConfigs = mysqlTable("sampling_configs", {
	id: int().autoincrement().notNull(),
	mappingId: int(),
	name: varchar({ length: 255 }).notNull(),
	timeUnit: mysqlEnum(['year','month','week','day','hour','minute','second']).default('hour').notNull(),
	sampleSize: int().default(5).notNull(),
	subgroupSize: int().default(5).notNull(),
	intervalValue: int().default(30).notNull(),
	intervalUnit: mysqlEnum(['year','month','week','day','hour','minute','second']).default('minute').notNull(),
	autoSampling: int().default(0).notNull(),
	isActive: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});


export const scheduledKpiReports = mysqlTable("scheduled_kpi_reports", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	frequency: mysqlEnum(['daily','weekly','monthly']).default('weekly').notNull(),
	dayOfWeek: int("day_of_week"),
	dayOfMonth: int("day_of_month"),
	timeOfDay: varchar("time_of_day", { length: 5 }).default('08:00').notNull(),
	productionLineIds: text("production_line_ids"),
	reportType: mysqlEnum("report_type", ['shift_summary','kpi_comparison','trend_analysis','full_report']).default('shift_summary').notNull(),
	includeCharts: int("include_charts").default(1).notNull(),
	includeDetails: int("include_details").default(1).notNull(),
	recipients: text().notNull(),
	ccRecipients: text("cc_recipients"),
	isEnabled: int("is_enabled").default(1).notNull(),
	lastSentAt: timestamp("last_sent_at", { mode: 'string' }),
	lastStatus: mysqlEnum("last_status", ['success','failed','pending']),
	lastError: text("last_error"),
	createdBy: int("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

// Legacy MMS scheduled report logs - kept for backward compatibility

export const securityAuditLogs = mysqlTable("security_audit_logs", {
	id: int().autoincrement().notNull(),
	eventId: varchar("event_id", { length: 64 }).notNull(),
	eventType: varchar("event_type", { length: 50 }).notNull(),
	eventCategory: mysqlEnum("event_category", ['authentication','authorization','data_access','configuration','system']).default('system').notNull(),
	severity: mysqlEnum(['info','warning','error','critical']).default('info').notNull(),
	userId: int("user_id"),
	username: varchar({ length: 100 }),
	ipAddress: varchar("ip_address", { length: 45 }),
	userAgent: text("user_agent"),
	resource: varchar({ length: 255 }),
	action: varchar({ length: 50 }),
	outcome: mysqlEnum(['success','failure','blocked']).default('success').notNull(),
	details: text(),
	riskScore: int("risk_score"),
	geoLocation: varchar("geo_location", { length: 100 }),
	deviceFingerprint: varchar("device_fingerprint", { length: 64 }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("security_audit_logs_event_id_unique").on(table.eventId),
]);


export const securitySettings = mysqlTable("security_settings", {
	id: int().autoincrement().notNull(),
	settingKey: varchar("setting_key", { length: 100 }).notNull(),
	settingValue: varchar("setting_value", { length: 255 }).notNull(),
	description: varchar({ length: 500 }),
	updatedBy: int("updated_by"),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("setting_key").on(table.settingKey),
]);


export const slowQueryLogs = mysqlTable("slow_query_logs", {
	id: int().autoincrement().notNull(),
	queryHash: varchar("query_hash", { length: 64 }).notNull(),
	queryText: text("query_text").notNull(),
	executionTime: int("execution_time").notNull(),
	rowsExamined: int("rows_examined"),
	rowsReturned: int("rows_returned"),
	connectionId: varchar("connection_id", { length: 100 }),
	userId: int("user_id"),
	databaseName: varchar("database_name", { length: 100 }),
	tableName: varchar("table_name", { length: 100 }),
	queryType: mysqlEnum("query_type", ['SELECT','INSERT','UPDATE','DELETE','OTHER']).default('SELECT'),
	isOptimized: int("is_optimized").default(0).notNull(),
	optimizationSuggestion: text("optimization_suggestion"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});


export const smsConfigs = mysqlTable("sms_configs", {
	id: int().autoincrement().notNull(),
	provider: mysqlEnum(['twilio','vonage','custom']).default('twilio').notNull(),
	enabled: int().default(0).notNull(),
	twilioAccountSid: varchar("twilio_account_sid", { length: 100 }),
	twilioAuthToken: varchar("twilio_auth_token", { length: 255 }),
	twilioFromNumber: varchar("twilio_from_number", { length: 20 }),
	vonageApiKey: varchar("vonage_api_key", { length: 100 }),
	vonageApiSecret: varchar("vonage_api_secret", { length: 255 }),
	vonageFromNumber: varchar("vonage_from_number", { length: 20 }),
	customWebhookUrl: varchar("custom_webhook_url", { length: 500 }),
	customWebhookMethod: mysqlEnum("custom_webhook_method", ['GET','POST']).default('POST'),
	customWebhookHeaders: text("custom_webhook_headers"),
	customWebhookBodyTemplate: text("custom_webhook_body_template"),
	createdBy: int("created_by"),
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
	updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});


export const smsLogs = mysqlTable("sms_logs", {
	id: int().autoincrement().notNull(),
	provider: varchar({ length: 20 }).notNull(),
	toNumber: varchar("to_number", { length: 20 }).notNull(),
	message: text().notNull(),
	status: mysqlEnum(['pending','sent','failed']).default('pending').notNull(),
	messageId: varchar("message_id", { length: 100 }),
	errorMessage: text("error_message"),
	escalationId: int("escalation_id"),
	alertId: int("alert_id"),
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
	escalationLevel: int("escalation_level"),
},
(table) => [
	index("idx_sms_status").on(table.status),
	index("idx_sms_escalation").on(table.escalationId),
	index("idx_sms_created").on(table.createdAt),
]);


export const spareParts = mysqlTable("spare_parts", {
	id: int().autoincrement().notNull(),
	partNumber: varchar({ length: 100 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	category: varchar({ length: 100 }),
	machineTypeId: int(),
	supplierId: int(),
	specifications: text(),
	unit: varchar({ length: 50 }).default('pcs'),
	unitPrice: decimal({ precision: 12, scale: 2 }),
	currency: varchar({ length: 10 }).default('VND'),
	minStock: int().default(0),
	maxStock: int(),
	reorderPoint: int(),
	reorderQuantity: int(),
	location: varchar({ length: 100 }),
	isActive: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	emailAlertThreshold: int().default(0),
});


export const sparePartsInventory = mysqlTable("spare_parts_inventory", {
	id: int().autoincrement().notNull(),
	sparePartId: int().notNull(),
	warehouseId: int(),
	quantity: int().default(0).notNull(),
	reservedQuantity: int().default(0).notNull(),
	lastUpdated: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	availableQuantity: int().default(0),
	lastStockCheck: timestamp({ mode: 'string' }),
	updatedAt: timestamp({ mode: 'string' }),
},
(table) => [
	index("idx_spare_parts_inventory_sparePartId").on(table.sparePartId),
	index("idx_inventory_part").on(table.sparePartId),
]);


export const sparePartsInventoryCheckItems = mysqlTable("spare_parts_inventory_check_items", {
	id: int().autoincrement().notNull(),
	checkId: int().notNull(),
	sparePartId: int().notNull(),
	systemQuantity: int().notNull(),
	actualQuantity: int(),
	discrepancy: int(),
	unitPrice: decimal({ precision: 12, scale: 2 }),
	systemValue: decimal({ precision: 14, scale: 2 }),
	actualValue: decimal({ precision: 14, scale: 2 }),
	status: mysqlEnum(['pending','counted','verified','adjusted']).default('pending'),
	notes: text(),
	countedBy: int(),
	countedAt: timestamp({ mode: 'string' }),
	verifiedBy: int(),
	verifiedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});


export const sparePartsInventoryChecks = mysqlTable("spare_parts_inventory_checks", {
	id: int().autoincrement().notNull(),
	checkNumber: varchar({ length: 50 }).notNull(),
	checkDate: timestamp({ mode: 'string' }).notNull(),
	checkType: mysqlEnum(['full','partial','cycle','spot']).default('full').notNull(),
	status: mysqlEnum(['draft','in_progress','completed','cancelled']).default('draft'),
	warehouseLocation: varchar({ length: 100 }),
	category: varchar({ length: 100 }),
	totalItems: int().default(0),
	checkedItems: int().default(0),
	matchedItems: int().default(0),
	discrepancyItems: int().default(0),
	totalSystemValue: decimal({ precision: 14, scale: 2 }),
	totalActualValue: decimal({ precision: 14, scale: 2 }),
	discrepancyValue: decimal({ precision: 14, scale: 2 }),
	notes: text(),
	completedAt: timestamp({ mode: 'string' }),
	completedBy: int(),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});


export const sparePartsStockMovements = mysqlTable("spare_parts_stock_movements", {
	id: int().autoincrement().notNull(),
	sparePartId: int().notNull(),
	movementType: mysqlEnum(['purchase_in','return_in','transfer_in','adjustment_in','initial_in','work_order_out','transfer_out','adjustment_out','scrap_out','return_supplier']).notNull(),
	quantity: int().notNull(),
	beforeQuantity: int().notNull(),
	afterQuantity: int().notNull(),
	unitCost: decimal({ precision: 12, scale: 2 }),
	totalCost: decimal({ precision: 14, scale: 2 }),
	referenceType: varchar({ length: 50 }),
	referenceId: int(),
	referenceNumber: varchar({ length: 100 }),
	fromLocation: varchar({ length: 100 }),
	toLocation: varchar({ length: 100 }),
	reason: text(),
	performedBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});


export const sparePartsTransactions = mysqlTable("spare_parts_transactions", {
	id: int().autoincrement().notNull(),
	sparePartId: int().notNull(),
	transactionType: mysqlEnum(['in','out','adjustment','return']).notNull(),
	quantity: int().notNull(),
	unitCost: decimal({ precision: 12, scale: 2 }),
	totalCost: decimal({ precision: 12, scale: 2 }),
	workOrderId: int(),
	purchaseOrderId: int(),
	reason: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	performedBy: int(),
	exportPurpose: mysqlEnum(['repair','borrow','destroy','normal']).default('normal'),
	borrowerName: varchar({ length: 255 }),
	borrowerDepartment: varchar({ length: 255 }),
	expectedReturnDate: timestamp({ mode: 'string' }),
	actualReturnDate: timestamp({ mode: 'string' }),
	returnedQuantity: int().default(0),
	returnStatus: mysqlEnum(['pending','partial','completed']).default('pending'),
	relatedTransactionId: int(),
},
(table) => [
	index("idx_spare_parts_transactions_sparePartId").on(table.sparePartId),
]);


export const structuredLogs = mysqlTable("structured_logs", {
	id: int().autoincrement().notNull(),
	logId: varchar("log_id", { length: 64 }).notNull(),
	level: mysqlEnum(['trace','debug','info','warn','error','fatal']).default('info').notNull(),
	message: text().notNull(),
	category: varchar({ length: 50 }),
	service: varchar({ length: 50 }),
	traceId: varchar("trace_id", { length: 64 }),
	spanId: varchar("span_id", { length: 64 }),
	parentSpanId: varchar("parent_span_id", { length: 64 }),
	userId: int("user_id"),
	sessionId: varchar("session_id", { length: 64 }),
	requestId: varchar("request_id", { length: 64 }),
	duration: int(),
	metadata: text(),
	tags: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});


export const teams = mysqlTable("teams", {
	id: int().autoincrement().notNull(),
	departmentId: int().notNull(),
	code: varchar({ length: 50 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	leaderId: int(),
	isActive: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});


export const technicians = mysqlTable("technicians", {
	id: int().autoincrement().notNull(),
	userId: int(),
	employeeCode: varchar({ length: 50 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	email: varchar({ length: 255 }),
	phone: varchar({ length: 50 }),
	specialization: varchar({ length: 255 }),
	skillLevel: mysqlEnum(['junior','intermediate','senior','expert']).default('intermediate'),
	isAvailable: int().default(1).notNull(),
	isActive: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});


export const telegramConfig = mysqlTable("telegram_config", {
	id: int().autoincrement().notNull(),
	botToken: varchar("bot_token", { length: 255 }).notNull(),
	chatId: varchar("chat_id", { length: 100 }).notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	isActive: int("is_active").default(1).notNull(),
	alertTypes: json("alert_types"),
	createdBy: int("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});


export const telegramMessageHistory = mysqlTable("telegram_message_history", {
	id: int().autoincrement().notNull(),
	configId: int("config_id").notNull(),
	messageType: varchar("message_type", { length: 50 }).notNull(),
	content: text().notNull(),
	status: mysqlEnum(['sent','failed','pending']).default('pending').notNull(),
	errorMessage: text("error_message"),
	sentAt: timestamp("sent_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});


export const trustedDevices = mysqlTable("trusted_devices", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull(),
	deviceFingerprint: varchar("device_fingerprint", { length: 255 }).notNull(),
	deviceName: varchar("device_name", { length: 255 }),
	ipAddress: varchar("ip_address", { length: 45 }),
	userAgent: text("user_agent"),
	lastUsedAt: timestamp("last_used_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});


export const twoFactorAuth = mysqlTable("two_factor_auth", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull(),
	secret: varchar({ length: 255 }).notNull(),
	isEnabled: int("is_enabled").default(0).notNull(),
	verifiedAt: timestamp("verified_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("user_id").on(table.userId),
]);


export const twoFactorBackupCodes = mysqlTable("two_factor_backup_codes", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull(),
	code: varchar({ length: 20 }).notNull(),
	usedAt: timestamp("used_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});


export const users = mysqlTable("users", {
	id: int().autoincrement().notNull(),
	openId: varchar({ length: 64 }).notNull(),
	name: text(),
	email: varchar({ length: 320 }),
	loginMethod: varchar({ length: 64 }),
	role: mysqlEnum(['user','manager','admin']).default('user').notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	lastSignedIn: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	avatar: varchar({ length: 500 }),
},
(table) => [
	index("users_openId_unique").on(table.openId),
]);


export const validationRuleLogs = mysqlTable("validation_rule_logs", {
	id: int().autoincrement().notNull(),
	ruleId: int().notNull(),
	productId: int(),
	workstationId: int(),
	machineId: int(),
	inputValue: varchar({ length: 500 }),
	passed: int().default(1).notNull(),
	violationDetails: text(),
	actionTaken: varchar({ length: 100 }),
	executedAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	executedBy: int(),
},
(table) => [
	index("idx_validation_rule").on(table.ruleId),
	index("idx_validation_executed").on(table.executedAt),
]);


export const videoTutorials = mysqlTable("video_tutorials", {
	id: int().autoincrement().notNull(),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	youtubeUrl: varchar("youtube_url", { length: 500 }).notNull(),
	youtubeId: varchar("youtube_id", { length: 50 }).notNull(),
	thumbnailUrl: varchar("thumbnail_url", { length: 500 }),
	duration: varchar({ length: 20 }),
	category: varchar({ length: 100 }).notNull(),
	level: mysqlEnum(['beginner','intermediate','advanced']).default('beginner').notNull(),
	sortOrder: int("sort_order").default(0).notNull(),
	isActive: int("is_active").default(1).notNull(),
	viewCount: int("view_count").default(0).notNull(),
	createdBy: int("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});


export const webhookEscalationLogs = mysqlTable("webhook_escalation_logs", {
	id: int().autoincrement().notNull(),
	ruleId: int("rule_id").notNull(),
	sourceWebhookId: int("source_webhook_id").notNull(),
	originalAlertId: int("original_alert_id"),
	originalAlertType: varchar("original_alert_type", { length: 50 }),
	currentLevel: int("current_level").default(1).notNull(),
	escalatedAt: timestamp("escalated_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	targetType: varchar("target_type", { length: 20 }).notNull(),
	targetValue: varchar("target_value", { length: 500 }).notNull(),
	status: mysqlEnum(['pending','sent','acknowledged','resolved','failed']).default('pending').notNull(),
	responseCode: int("response_code"),
	responseBody: text("response_body"),
	errorMessage: text("error_message"),
	resolvedAt: timestamp("resolved_at", { mode: 'string' }),
	resolvedBy: int("resolved_by"),
	resolutionNote: text("resolution_note"),
	metadata: json(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_rule").on(table.ruleId),
	index("idx_source_webhook").on(table.sourceWebhookId),
	index("idx_status").on(table.status),
	index("idx_created_at").on(table.createdAt),
]);


export const webhookEscalationRules = mysqlTable("webhook_escalation_rules", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	sourceWebhookId: int("source_webhook_id").notNull(),
	triggerAfterFailures: int("trigger_after_failures").default(3).notNull(),
	triggerAfterMinutes: int("trigger_after_minutes").default(15).notNull(),
	level1Targets: json("level1_targets"),
	level1DelayMinutes: int("level1_delay_minutes").default(0).notNull(),
	level2Targets: json("level2_targets"),
	level2DelayMinutes: int("level2_delay_minutes").default(15).notNull(),
	level3Targets: json("level3_targets"),
	level3DelayMinutes: int("level3_delay_minutes").default(30).notNull(),
	autoResolveOnSuccess: int("auto_resolve_on_success").default(1).notNull(),
	notifyOnEscalate: int("notify_on_escalate").default(1).notNull(),
	notifyOnResolve: int("notify_on_resolve").default(1).notNull(),
	isActive: int("is_active").default(1).notNull(),
	createdBy: int("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_source_webhook").on(table.sourceWebhookId),
	index("idx_active").on(table.isActive),
]);


export const webhookLogs = mysqlTable("webhook_logs", {
	id: int().autoincrement().notNull(),
	webhookId: int().notNull(),
	eventType: varchar({ length: 50 }).notNull(),
	payload: text().notNull(),
	responseStatus: int(),
	responseBody: text(),
	success: int().default(0).notNull(),
	errorMessage: text(),
	sentAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	retryCount: int().default(0).notNull(),
	maxRetries: int().default(5).notNull(),
	nextRetryAt: timestamp({ mode: 'string' }),
	lastRetryAt: timestamp({ mode: 'string' }),
	retryStatus: varchar({ length: 20 }).default('none'),
});


export const webhookSubscriptionsV2 = mysqlTable("webhook_subscriptions_v2", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 100 }).notNull(),
	url: varchar({ length: 500 }).notNull(),
	secret: varchar({ length: 255 }),
	events: text().notNull(),
	filters: text(),
	headers: text(),
	retryCount: int("retry_count").default(3).notNull(),
	retryDelayMs: int("retry_delay_ms").default(5000).notNull(),
	timeoutMs: int("timeout_ms").default(30000).notNull(),
	isActive: int("is_active").default(1).notNull(),
	lastTriggeredAt: timestamp("last_triggered_at", { mode: 'string' }),
	lastStatus: varchar("last_status", { length: 50 }),
	failureCount: int("failure_count").default(0).notNull(),
	createdBy: int("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});


export const webhooks = mysqlTable("webhooks", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	url: text().notNull(),
	webhookType: mysqlEnum(['slack','teams','custom']).default('custom').notNull(),
	secret: varchar({ length: 255 }),
	headers: text(),
	events: text().notNull(),
	isActive: int().default(1).notNull(),
	triggerCount: int().default(0).notNull(),
	lastTriggeredAt: timestamp({ mode: 'string' }),
	lastError: text(),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});


export const weeklyKpiSnapshots = mysqlTable("weekly_kpi_snapshots", {
	id: int().autoincrement().notNull(),
	productionLineId: int("production_line_id").notNull(),
	weekNumber: int("week_number").notNull(),
	year: int().notNull(),
	weekStartDate: timestamp("week_start_date", { mode: 'string' }).notNull(),
	weekEndDate: timestamp("week_end_date", { mode: 'string' }).notNull(),
	avgCpk: decimal("avg_cpk", { precision: 6, scale: 4 }),
	minCpk: decimal("min_cpk", { precision: 6, scale: 4 }),
	maxCpk: decimal("max_cpk", { precision: 6, scale: 4 }),
	avgOee: decimal("avg_oee", { precision: 5, scale: 2 }),
	minOee: decimal("min_oee", { precision: 5, scale: 2 }),
	maxOee: decimal("max_oee", { precision: 5, scale: 2 }),
	avgDefectRate: decimal("avg_defect_rate", { precision: 5, scale: 2 }),
	totalSamples: int("total_samples").default(0).notNull(),
	totalDefects: int("total_defects").default(0).notNull(),
	shiftData: text("shift_data"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});


export const workOrderParts = mysqlTable("work_order_parts", {
	id: int().autoincrement().notNull(),
	workOrderId: int().notNull(),
	sparePartId: int().notNull(),
	quantity: int().notNull(),
	unitCost: decimal({ precision: 12, scale: 2 }),
	totalCost: decimal({ precision: 12, scale: 2 }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});


export const workOrders = mysqlTable("work_orders", {
	id: int().autoincrement().notNull(),
	workOrderNumber: varchar({ length: 50 }).notNull(),
	machineId: int().notNull(),
	maintenanceTypeId: int().notNull(),
	scheduleId: int(),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	priority: mysqlEnum(['low','medium','high','critical']).default('medium'),
	status: mysqlEnum(['pending','assigned','in_progress','on_hold','completed','cancelled']).default('pending'),
	reportedAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	scheduledStartAt: timestamp({ mode: 'string' }),
	actualStartAt: timestamp({ mode: 'string' }),
	completedAt: timestamp({ mode: 'string' }),
	reportedBy: int(),
	assignedTo: int(),
	completedBy: int(),
	laborHours: decimal({ precision: 6, scale: 2 }),
	laborCost: decimal({ precision: 12, scale: 2 }),
	partsCost: decimal({ precision: 12, scale: 2 }),
	totalCost: decimal({ precision: 12, scale: 2 }),
	rootCause: text(),
	actionTaken: text(),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_work_orders_machineId").on(table.machineId),
	index("idx_work_orders_assignedTo").on(table.assignedTo),
	index("idx_work_orders_status").on(table.status),
]);


export const scheduledMttrMtbfReports = mysqlTable("scheduled_mttr_mtbf_reports", {
  id: int().autoincrement().primaryKey(),
  name: varchar({ length: 200 }).notNull(),
  targetType: mysqlEnum("target_type", ['device','machine','production_line']).notNull(),
  targetId: int("target_id").notNull(),
  targetName: varchar("target_name", { length: 255 }).notNull(),
  frequency: mysqlEnum(['daily','weekly','monthly']).notNull(),
  dayOfWeek: int("day_of_week"), // 0-6 for weekly
  dayOfMonth: int("day_of_month"), // 1-31 for monthly
  timeOfDay: varchar("time_of_day", { length: 5 }).default('08:00').notNull(),
  recipients: text().notNull(), // JSON array of emails
  format: mysqlEnum(['excel','pdf','both']).default('excel').notNull(),
  notificationChannel: mysqlEnum("notification_channel", ['email','telegram','both']).default('email').notNull(),
  telegramConfigId: int("telegram_config_id"), // Reference to telegram_config table
  isActive: int("is_active").default(1).notNull(),
  lastSentAt: timestamp("last_sent_at", { mode: 'string' }),
  lastSentStatus: mysqlEnum("last_sent_status", ['success','failed','pending']),
  lastSentError: text("last_sent_error"),
  createdBy: int("created_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_scheduled_mttr_target").on(table.targetType, table.targetId),
  index("idx_scheduled_mttr_active").on(table.isActive),
]);

// Phase 106 - MTTR/MTBF Thresholds for Auto Alert

export const scheduledOeeReports = mysqlTable("scheduled_oee_reports", {
  id: int().autoincrement().primaryKey(),
  name: varchar({ length: 200 }).notNull(),
  description: text(),
  // Target
  productionLineIds: json("production_line_ids").notNull(), // Array of production line IDs
  // Schedule
  frequency: mysqlEnum(['daily','weekly','monthly']).default('weekly').notNull(),
  dayOfWeek: int("day_of_week"), // 0-6 for weekly (0=Sunday)
  dayOfMonth: int("day_of_month"), // 1-31 for monthly
  hour: int().default(8).notNull(), // Hour to send (0-23)
  minute: int().default(0).notNull(), // Minute to send (0-59)
  timezone: varchar({ length: 50 }).default('Asia/Ho_Chi_Minh'),
  // Notification channels
  notificationChannel: mysqlEnum("notification_channel", ['telegram','slack','both']).default('telegram').notNull(),
  telegramConfigId: int("telegram_config_id"), // Reference to telegram_config
  slackWebhookUrl: varchar("slack_webhook_url", { length: 500 }),
  // Report settings
  includeAvailability: int("include_availability").default(1).notNull(),
  includePerformance: int("include_performance").default(1).notNull(),
  includeQuality: int("include_quality").default(1).notNull(),
  includeComparison: int("include_comparison").default(1).notNull(),
  includeTrend: int("include_trend").default(1).notNull(),
  // Status
  isActive: int("is_active").default(1).notNull(),
  lastSentAt: timestamp("last_sent_at", { mode: 'string' }),
  nextScheduledAt: timestamp("next_scheduled_at", { mode: 'string' }),
  // Metadata
  createdBy: int("created_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_scheduled_oee_active").on(table.isActive),
  index("idx_scheduled_oee_next").on(table.nextScheduledAt),
]);

// History of sent OEE reports

export const scheduledOeeReportHistory = mysqlTable("scheduled_oee_report_history", {
  id: int().autoincrement().primaryKey(),
  reportId: int("report_id").notNull(),
  reportName: varchar("report_name", { length: 200 }),
  // Sent details
  sentAt: timestamp("sent_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  channel: mysqlEnum(['telegram','slack']).notNull(),
  status: mysqlEnum(['sent','failed']).notNull(),
  errorMessage: text("error_message"),
  // Report data snapshot
  reportData: json("report_data"), // Snapshot of OEE data sent
  // Metadata
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
  index("idx_oee_report_history_report").on(table.reportId),
  index("idx_oee_report_history_sent").on(table.sentAt),
]);


export type ScheduledOeeReport = typeof scheduledOeeReports.$inferSelect;

export type InsertScheduledOeeReport = typeof scheduledOeeReports.$inferInsert;

export type ScheduledOeeReportHistory = typeof scheduledOeeReportHistory.$inferSelect;

export type InsertScheduledOeeReportHistory = typeof scheduledOeeReportHistory.$inferInsert;


// ============================================
// Phase 14 - Edge Gateway, TimescaleDB, Anomaly Detection
// ============================================

// Edge Gateway Management

export const sensorDataTimeseries = mysqlTable("sensor_data_ts", {
	id: int().autoincrement().notNull().primaryKey(),
	deviceId: int("device_id").notNull(),
	gatewayId: int("gateway_id"),
	timestamp: bigint({ mode: 'number' }).notNull(),
	timeBucket: bigint("time_bucket", { mode: 'number' }).notNull(),
	value: decimal({ precision: 15, scale: 6 }).notNull(),
	sensorType: varchar("sensor_type", { length: 50 }),
	unit: varchar({ length: 20 }),
	quality: mysqlEnum(['good', 'uncertain', 'bad']).default('good'),
	sourceType: mysqlEnum("source_type", ['edge', 'direct', 'import']).default('direct'),
	sourceId: varchar("source_id", { length: 50 }),
},
(table) => [
	index("idx_ts_device_time").on(table.deviceId, table.timestamp),
	index("idx_ts_bucket").on(table.timeBucket),
	index("idx_ts_gateway").on(table.gatewayId),
]);

// Hourly Aggregates

export const sensorDataHourly = mysqlTable("sensor_data_hourly", {
	id: int().autoincrement().notNull().primaryKey(),
	deviceId: int("device_id").notNull(),
	hourBucket: bigint("hour_bucket", { mode: 'number' }).notNull(),
	minValue: decimal("min_value", { precision: 15, scale: 6 }),
	maxValue: decimal("max_value", { precision: 15, scale: 6 }),
	avgValue: decimal("avg_value", { precision: 15, scale: 6 }),
	sumValue: decimal("sum_value", { precision: 20, scale: 6 }),
	sampleCount: int("sample_count").default(0),
	stdDev: decimal("std_dev", { precision: 15, scale: 6 }),
	variance: decimal({ precision: 15, scale: 6 }),
	goodCount: int("good_count").default(0),
	badCount: int("bad_count").default(0),
},
(table) => [
	index("idx_hourly_device").on(table.deviceId),
	index("idx_hourly_bucket").on(table.hourBucket),
]);

// Daily Aggregates

export const sensorDataDaily = mysqlTable("sensor_data_daily", {
	id: int().autoincrement().notNull().primaryKey(),
	deviceId: int("device_id").notNull(),
	dayBucket: bigint("day_bucket", { mode: 'number' }).notNull(),
	minValue: decimal("min_value", { precision: 15, scale: 6 }),
	maxValue: decimal("max_value", { precision: 15, scale: 6 }),
	avgValue: decimal("avg_value", { precision: 15, scale: 6 }),
	sumValue: decimal("sum_value", { precision: 20, scale: 6 }),
	sampleCount: int("sample_count").default(0),
	stdDev: decimal("std_dev", { precision: 15, scale: 6 }),
	variance: decimal({ precision: 15, scale: 6 }),
	uptimePercent: decimal("uptime_percent", { precision: 5, scale: 2 }),
	goodCount: int("good_count").default(0),
	badCount: int("bad_count").default(0),
	p50: decimal({ precision: 15, scale: 6 }),
	p95: decimal({ precision: 15, scale: 6 }),
	p99: decimal({ precision: 15, scale: 6 }),
},
(table) => [
	index("idx_daily_device").on(table.deviceId),
	index("idx_daily_bucket").on(table.dayBucket),
]);

// Isolation Forest Models

export const scheduledCpkJobs = mysqlTable("scheduled_cpk_jobs", {
  id: int().primaryKey().autoincrement(),
  name: varchar({ length: 255 }).notNull(),
  description: text(),
  frequency: varchar({ length: 50 }).notNull(), // 'daily', 'weekly', 'monthly'
  runTime: varchar("run_time", { length: 10 }).notNull(), // HH:mm format
  dayOfWeek: int("day_of_week"), // 0-6 for weekly
  dayOfMonth: int("day_of_month"), // 1-31 for monthly
  productCode: varchar("product_code", { length: 100 }),
  stationName: varchar("station_name", { length: 255 }),
  warningThreshold: int("warning_threshold").default(1330), // 1.33 * 1000
  criticalThreshold: int("critical_threshold").default(1000), // 1.0 * 1000
  emailRecipients: text("email_recipients"),
  enableEmail: boolean("enable_email").default(true),
  enableOwnerNotification: boolean("enable_owner_notification").default(true),
  isActive: boolean("is_active").default(true),
  lastRunAt: timestamp("last_run_at", { mode: 'date' }),
  createdBy: int("created_by"),
  createdAt: timestamp("created_at", { mode: 'date' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'date' }).defaultNow(),
});


// ===== Phase 10: Quality Images & Image Comparison =====


export const autoCaptureSchedules = mysqlTable("auto_capture_schedules", {
	id: int().autoincrement().notNull().primaryKey(),
	userId: int("user_id").notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	// Target configuration
	productionLineId: int("production_line_id"),
	workstationId: int("workstation_id"),
	productCode: varchar("product_code", { length: 100 }),
	// Camera configuration
	cameraId: varchar("camera_id", { length: 100 }),
	cameraUrl: varchar("camera_url", { length: 500 }),
	cameraType: mysqlEnum("camera_type", ['ip_camera', 'usb_camera', 'rtsp', 'http_snapshot']).default('ip_camera'),
	// Schedule configuration
	intervalSeconds: int("interval_seconds").default(60).notNull(), // Capture interval in seconds
	scheduleType: mysqlEnum("schedule_type", ['continuous', 'time_range', 'cron']).default('continuous'),
	startTime: varchar("start_time", { length: 5 }), // HH:mm format
	endTime: varchar("end_time", { length: 5 }), // HH:mm format
	daysOfWeek: json("days_of_week"), // [0-6], 0=Sunday
	cronExpression: varchar("cron_expression", { length: 100 }),
	timezone: varchar({ length: 50 }).default('Asia/Ho_Chi_Minh'),
	// Analysis settings
	enableAiAnalysis: int("enable_ai_analysis").default(1).notNull(),
	analysisType: mysqlEnum("analysis_type", ['quality_check', 'defect_detection', 'measurement', 'all']).default('quality_check'),
	qualityThreshold: decimal("quality_threshold", { precision: 5, scale: 2 }).default('80.00'),
	// Alert settings
	alertOnDefect: int("alert_on_defect").default(1).notNull(),
	alertSeverityThreshold: mysqlEnum("alert_severity_threshold", ['minor', 'major', 'critical']).default('major'),
	webhookConfigIds: json("webhook_config_ids"), // IDs of webhook configs to notify
	emailRecipients: json("email_recipients"),
	// Status
	status: mysqlEnum(['active', 'paused', 'stopped']).default('paused').notNull(),
	lastCaptureAt: timestamp("last_capture_at", { mode: 'string' }),
	lastAnalysisResult: json("last_analysis_result"),
	totalCaptures: int("total_captures").default(0).notNull(),
	totalDefectsFound: int("total_defects_found").default(0).notNull(),
	// Metadata
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_auto_capture_user").on(table.userId),
	index("idx_auto_capture_status").on(table.status),
	index("idx_auto_capture_line").on(table.productionLineId),
	index("idx_auto_capture_workstation").on(table.workstationId),
]);


export type AutoCaptureSchedule = typeof autoCaptureSchedules.$inferSelect;

export type InsertAutoCaptureSchedule = typeof autoCaptureSchedules.$inferInsert;

// Auto-capture History - Lịch sử chụp ảnh tự động

export const autoCaptureHistory = mysqlTable("auto_capture_history", {
	id: int().autoincrement().notNull().primaryKey(),
	scheduleId: int("schedule_id").notNull(),
	qualityImageId: int("quality_image_id"), // Reference to quality_images table
	// Capture details
	capturedAt: timestamp("captured_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	imageUrl: varchar("image_url", { length: 500 }),
	imageKey: varchar("image_key", { length: 255 }),
	// Analysis results
	analysisStatus: mysqlEnum("analysis_status", ['pending', 'analyzing', 'completed', 'failed']).default('pending'),
	qualityScore: decimal("quality_score", { precision: 5, scale: 2 }),
	defectsFound: int("defects_found").default(0),
	severity: mysqlEnum(['none', 'minor', 'major', 'critical']).default('none'),
	aiAnalysis: json("ai_analysis"),
	// Alert status
	alertSent: int("alert_sent").default(0).notNull(),
	alertChannels: json("alert_channels"), // Which channels were notified
	// Error handling
	errorMessage: text("error_message"),
	retryCount: int("retry_count").default(0).notNull(),
	// Metadata
	processingTimeMs: int("processing_time_ms"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_auto_capture_hist_schedule").on(table.scheduleId),
	index("idx_auto_capture_hist_captured").on(table.capturedAt),
	index("idx_auto_capture_hist_status").on(table.analysisStatus),
	index("idx_auto_capture_hist_severity").on(table.severity),
]);


export type AutoCaptureHistory = typeof autoCaptureHistory.$inferSelect;

export type InsertAutoCaptureHistory = typeof autoCaptureHistory.$inferInsert;

// Unified Webhook Notification Config - Cấu hình webhook thống nhất cho Slack/Teams

export const webhookTemplates = mysqlTable("webhook_templates", {
	id: int().autoincrement().notNull().primaryKey(),
	userId: int("user_id").notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	// Channel type: telegram, zalo, slack, teams, discord, custom
	channelType: mysqlEnum("channel_type", ['telegram', 'zalo', 'slack', 'teams', 'discord', 'custom']).notNull(),
	// Template content
	templateTitle: varchar("template_title", { length: 500 }),
	templateBody: text("template_body").notNull(), // Supports placeholders like {{cpk}}, {{product}}, etc.
	templateFormat: mysqlEnum("template_format", ['text', 'markdown', 'html', 'json']).default('text').notNull(),
	// Zalo specific
	zaloOaId: varchar("zalo_oa_id", { length: 100 }),
	zaloAccessToken: varchar("zalo_access_token", { length: 500 }),
	zaloTemplateId: varchar("zalo_template_id", { length: 100 }),
	// Telegram specific
	telegramBotToken: varchar("telegram_bot_token", { length: 255 }),
	telegramChatId: varchar("telegram_chat_id", { length: 100 }),
	telegramParseMode: mysqlEnum("telegram_parse_mode", ['HTML', 'Markdown', 'MarkdownV2']).default('HTML'),
	// Custom webhook
	webhookUrl: varchar("webhook_url", { length: 500 }),
	webhookMethod: mysqlEnum("webhook_method", ['GET', 'POST', 'PUT']).default('POST'),
	webhookHeaders: json("webhook_headers"), // Custom headers as JSON
	webhookAuthType: mysqlEnum("webhook_auth_type", ['none', 'bearer', 'basic', 'api_key']),
	webhookAuthValue: varchar("webhook_auth_value", { length: 500 }),
	// Event subscriptions
	events: json("events"), // ['spc_violation', 'cpk_alert', 'quality_issue', 'maintenance', 'system']
	// Filters
	productionLineIds: json("production_line_ids"),
	workstationIds: json("workstation_ids"),
	productCodes: json("product_codes"),
	minSeverity: mysqlEnum("min_severity", ['info', 'warning', 'critical']).default('warning'),
	// Rate limiting
	rateLimitMinutes: int("rate_limit_minutes").default(5),
	lastSentAt: timestamp("last_sent_at", { mode: 'string' }),
	// Status
	isActive: int("is_active").default(1).notNull(),
	isDefault: int("is_default").default(0).notNull(),
	// Stats
	totalSent: int("total_sent").default(0).notNull(),
	totalFailed: int("total_failed").default(0).notNull(),
	lastError: text("last_error"),
	// Metadata
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_webhook_template_user").on(table.userId),
	index("idx_webhook_template_channel").on(table.channelType),
	index("idx_webhook_template_active").on(table.isActive),
]);


export type WebhookTemplate = typeof webhookTemplates.$inferSelect;

export type InsertWebhookTemplate = typeof webhookTemplates.$inferInsert;

// Webhook Template Logs - Lịch sử gửi thông báo qua template

export const webhookTemplateLogs = mysqlTable("webhook_template_logs", {
	id: int().autoincrement().notNull().primaryKey(),
	templateId: int("template_id").notNull(),
	// Event details
	eventType: varchar("event_type", { length: 100 }).notNull(),
	eventTitle: varchar("event_title", { length: 255 }).notNull(),
	eventMessage: text("event_message"),
	eventData: json("event_data"),
	severity: mysqlEnum(['info', 'warning', 'critical']).default('info'),
	// Rendered content
	renderedTitle: varchar("rendered_title", { length: 500 }),
	renderedBody: text("rendered_body"),
	// Request/Response
	requestPayload: text("request_payload"),
	responseStatus: int("response_status"),
	responseBody: text("response_body"),
	// Status
	status: mysqlEnum(['pending', 'sent', 'failed', 'rate_limited']).default('pending').notNull(),
	errorMessage: text("error_message"),
	retryCount: int("retry_count").default(0).notNull(),
	nextRetryAt: timestamp("next_retry_at", { mode: 'string' }),
	// Timing
	sentAt: timestamp("sent_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_webhook_template_log_template").on(table.templateId),
	index("idx_webhook_template_log_event").on(table.eventType),
	index("idx_webhook_template_log_status").on(table.status),
	index("idx_webhook_template_log_created").on(table.createdAt),
]);


export type WebhookTemplateLog = typeof webhookTemplateLogs.$inferSelect;

export type InsertWebhookTemplateLog = typeof webhookTemplateLogs.$inferInsert;


// ============================================================
// PHASE 10 - Scheduled Reports, AI Vision Dashboard, Line Comparison
// ============================================================

// Scheduled Reports - Báo cáo tự động theo lịch

export const factories = mysqlTable("factories", {
  id: int().autoincrement().primaryKey(),
  code: varchar({ length: 50 }).notNull(),
  name: varchar({ length: 255 }).notNull(),
  description: text(),
  address: text(),
  city: varchar({ length: 100 }),
  country: varchar({ length: 100 }),
  timezone: varchar({ length: 50 }).default('Asia/Ho_Chi_Minh'),
  contactPerson: varchar("contact_person", { length: 255 }),
  contactPhone: varchar("contact_phone", { length: 50 }),
  contactEmail: varchar("contact_email", { length: 255 }),
  logoUrl: varchar("logo_url", { length: 500 }),
  imageUrl: varchar("image_url", { length: 500 }),
  latitude: decimal({ precision: 10, scale: 7 }),
  longitude: decimal({ precision: 10, scale: 7 }),
  capacity: int(),
  status: mysqlEnum(['active','inactive','maintenance']).default('active').notNull(),
  isActive: int("is_active").default(1).notNull(),
  createdBy: int("created_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_factories_code").on(table.code),
  index("idx_factories_status").on(table.status),
  index("idx_factories_active").on(table.isActive),
]);

export type Factory = typeof factories.$inferSelect;

export type InsertFactory = typeof factories.$inferInsert;

// Workshops - Quản lý nhà xưởng (thuộc nhà máy)

export const workshops = mysqlTable("workshops", {
  id: int().autoincrement().primaryKey(),
  factoryId: int("factory_id").notNull(),
  code: varchar({ length: 50 }).notNull(),
  name: varchar({ length: 255 }).notNull(),
  description: text(),
  floor: varchar({ length: 50 }),
  building: varchar({ length: 100 }),
  area: decimal({ precision: 10, scale: 2 }),
  areaUnit: varchar("area_unit", { length: 20 }).default('m2'),
  capacity: int(),
  managerName: varchar("manager_name", { length: 255 }),
  managerPhone: varchar("manager_phone", { length: 50 }),
  managerEmail: varchar("manager_email", { length: 255 }),
  imageUrl: varchar("image_url", { length: 500 }),
  floorPlanUrl: varchar("floor_plan_url", { length: 500 }),
  status: mysqlEnum(['active','inactive','maintenance']).default('active').notNull(),
  isActive: int("is_active").default(1).notNull(),
  createdBy: int("created_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_workshops_factory").on(table.factoryId),
  index("idx_workshops_code").on(table.code),
  index("idx_workshops_status").on(table.status),
  index("idx_workshops_active").on(table.isActive),
]);

export type Workshop = typeof workshops.$inferSelect;

export type InsertWorkshop = typeof workshops.$inferInsert;

// Measurement Remarks - Ghi chú cho điểm đo

export const workshopProductionLines = mysqlTable("workshop_production_lines", {
  id: int().autoincrement().primaryKey(),
  workshopId: int("workshop_id").notNull(),
  productionLineId: int("production_line_id").notNull(),
  assignedAt: timestamp("assigned_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  assignedBy: int("assigned_by"),
  notes: text(),
  isActive: int("is_active").default(1).notNull(),
},
(table) => [
  index("idx_workshop_production_lines_workshop").on(table.workshopId),
  index("idx_workshop_production_lines_line").on(table.productionLineId),
  index("idx_workshop_production_lines_unique").on(table.workshopId, table.productionLineId),
]);

export type WorkshopProductionLine = typeof workshopProductionLines.$inferSelect;

export type InsertWorkshopProductionLine = typeof workshopProductionLines.$inferInsert;


// Capacity Plans - Kế hoạch công suất cho Workshop

export const widgetTemplates = mysqlTable("widget_templates", {
	id: int().autoincrement().notNull().primaryKey(),
	key: varchar({ length: 100 }).notNull(), // Unique identifier: 'cpk_chart', 'spc_chart', 'alert_summary', etc.
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	category: mysqlEnum(['chart', 'stats', 'table', 'alert', 'ai', 'custom']).default('chart').notNull(),
	// Widget configuration schema
	defaultConfig: json("default_config"), // Default settings for this widget type
	// Size constraints
	minWidth: int("min_width").default(1).notNull(), // Grid units
	minHeight: int("min_height").default(1).notNull(),
	maxWidth: int("max_width").default(4).notNull(),
	maxHeight: int("max_height").default(4).notNull(),
	defaultWidth: int("default_width").default(2).notNull(),
	defaultHeight: int("default_height").default(2).notNull(),
	// Component reference
	componentName: varchar("component_name", { length: 100 }).notNull(), // React component name
	// Permissions
	requiredRole: mysqlEnum("required_role", ['user', 'manager', 'admin']).default('user'),
	// Status
	isActive: int("is_active").default(1).notNull(),
	isDefault: int("is_default").default(0).notNull(), // Show by default for new users
	displayOrder: int("display_order").default(0).notNull(),
	// Metadata
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("widget_templates_key_unique").on(table.key),
	index("idx_widget_template_category").on(table.category),
	index("idx_widget_template_active").on(table.isActive),
]);


export type WidgetTemplate = typeof widgetTemplates.$inferSelect;

export type InsertWidgetTemplate = typeof widgetTemplates.$inferInsert;

// Dashboard Widget Config - Cấu hình widget của từng user

export const annotationTemplates = mysqlTable("annotation_templates", {
	id: int().autoincrement().notNull().primaryKey(),
	userId: int("user_id").notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	// Template data
	annotations: json().notNull(), // Array of annotation objects
	// Categorization
	category: varchar({ length: 100 }),
	tags: json(), // Array of tags
	// Usage tracking
	usageCount: int("usage_count").default(0).notNull(),
	// Sharing
	isPublic: boolean("is_public").default(false),
	// Metadata
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_annotation_templates_user").on(table.userId),
	index("idx_annotation_templates_category").on(table.category),
	index("idx_annotation_templates_public").on(table.isPublic),
]);


export type AnnotationTemplate = typeof annotationTemplates.$inferSelect;

export type InsertAnnotationTemplate = typeof annotationTemplates.$inferInsert;

// Camera Configurations - Cấu hình camera

export const yieldDefectAlertHistory = mysqlTable("yield_defect_alert_history", {
  id: int("id").primaryKey().autoincrement(),
  alertType: varchar("alert_type", { length: 50 }).notNull(), // yield_low, defect_high, spc_violation
  severity: varchar("severity", { length: 20 }).notNull(), // info, warning, critical
  status: varchar("status", { length: 20 }).notNull().default("active"), // active, acknowledged, resolved, dismissed
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message"),
  source: varchar("source", { length: 100 }), // machine, line, station
  sourceId: varchar("source_id", { length: 100 }),
  sourceName: varchar("source_name", { length: 255 }),
  metricName: varchar("metric_name", { length: 100 }),
  metricValue: decimal("metric_value", { precision: 15, scale: 6 }),
  thresholdValue: decimal("threshold_value", { precision: 15, scale: 6 }),
  acknowledgedBy: varchar("acknowledged_by", { length: 255 }),
  acknowledgedAt: bigint("acknowledged_at", { mode: "number" }),
  resolvedBy: varchar("resolved_by", { length: 255 }),
  resolvedAt: bigint("resolved_at", { mode: "number" }),
  resolvedNote: text("resolved_note"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => [
  index("idx_alert_type").on(table.alertType),
  index("idx_alert_severity").on(table.severity),
  index("idx_alert_status").on(table.status),
  index("idx_alert_created").on(table.createdAt),
]);

export type YieldDefectAlertHistory = typeof yieldDefectAlertHistory.$inferSelect;

export type InsertYieldDefectAlertHistory = typeof yieldDefectAlertHistory.$inferInsert;

// ============================================================
// AVI/AOI Enhancement Module - Additional Tables
// ============================================================

// Reference Images - Ảnh tham chiếu cho so sánh

export const referenceImages = mysqlTable("reference_images", {
	id: int().autoincrement().notNull().primaryKey(),
	productId: int("product_id"),
	machineId: int("machine_id"),
	stationId: int("station_id"),
	imageUrl: text("image_url").notNull(),
	thumbnailUrl: text("thumbnail_url"),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	imageType: mysqlEnum("image_type", ['golden_sample', 'reference', 'standard']).default('reference').notNull(),
	isActive: tinyint("is_active").default(1).notNull(),
	metadata: json("metadata"),
	createdBy: int("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
	index("idx_ref_img_product").on(table.productId),
	index("idx_ref_img_machine").on(table.machineId),
]);

export type ReferenceImage = typeof referenceImages.$inferSelect;

export type InsertReferenceImage = typeof referenceImages.$inferInsert;

// NTF Confirmations - Xác nhận No Trouble Found
