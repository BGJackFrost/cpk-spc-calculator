import { mysqlTable, mysqlSchema, AnyMySqlColumn, int, varchar, timestamp, index, json, decimal, text, mysqlEnum, datetime, bigint, tinyint, boolean, date } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"


// === SYSTEM Domain Tables ===

export const analyticsCache = mysqlTable("analytics_cache", {
	id: int().autoincrement().notNull(),
	cacheKey: varchar("cache_key", { length: 255 }).notNull(),
	cacheType: varchar("cache_type", { length: 50 }).notNull(),
	data: text().notNull(),
	computedAt: timestamp("computed_at", { mode: 'string' }).notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	hitCount: int("hit_count").default(0).notNull(),
	lastAccessedAt: timestamp("last_accessed_at", { mode: 'string' }),
	metadata: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("analytics_cache_cache_key_unique").on(table.cacheKey),
]);


export const apiRateLimits = mysqlTable("api_rate_limits", {
	id: int().autoincrement().notNull(),
	endpoint: varchar({ length: 255 }).notNull(),
	method: varchar({ length: 10 }).default('*').notNull(),
	windowMs: int("window_ms").default(60000).notNull(),
	maxRequests: int("max_requests").default(100).notNull(),
	userBased: int("user_based").default(1).notNull(),
	skipAuth: int("skip_auth").default(0).notNull(),
	isActive: int("is_active").default(1).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});


export const companyInfo = mysqlTable("company_info", {
	id: int().autoincrement().notNull(),
	companyName: varchar({ length: 255 }).notNull(),
	companyCode: varchar({ length: 50 }),
	address: text(),
	phone: varchar({ length: 50 }),
	email: varchar({ length: 320 }),
	website: varchar({ length: 255 }),
	taxCode: varchar({ length: 50 }),
	logo: text(),
	industry: varchar({ length: 100 }),
	contactPerson: varchar({ length: 255 }),
	contactPhone: varchar({ length: 50 }),
	contactEmail: varchar({ length: 320 }),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});


export const dataArchiveConfigs = mysqlTable("data_archive_configs", {
	id: int().autoincrement().notNull(),
	tableName: varchar("table_name", { length: 100 }).notNull(),
	retentionDays: int("retention_days").default(365).notNull(),
	archiveEnabled: int("archive_enabled").default(1).notNull(),
	deleteAfterArchive: int("delete_after_archive").default(0).notNull(),
	lastArchiveAt: timestamp("last_archive_at", { mode: 'string' }),
	lastArchiveCount: int("last_archive_count").default(0),
	archiveLocation: varchar("archive_location", { length: 500 }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("table_name").on(table.tableName),
]);


export const databaseBackups = mysqlTable("database_backups", {
	id: int().autoincrement().notNull(),
	filename: varchar({ length: 255 }).notNull(),
	fileSize: int(),
	fileUrl: text(),
	backupType: mysqlEnum(['daily','weekly','manual']).default('manual').notNull(),
	status: mysqlEnum(['pending','completed','failed']).default('pending').notNull(),
	errorMessage: text(),
	storageLocation: mysqlEnum(['s3','local']).default('s3').notNull(),
	tablesIncluded: text(),
	createdBy: int(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	completedAt: timestamp({ mode: 'string' }),
});


export const databaseConnections = mysqlTable("database_connections", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	connectionString: text().notNull(),
	databaseType: varchar({ length: 50 }).default('mysql').notNull(),
	description: text(),
	isActive: int().default(1).notNull(),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	host: varchar({ length: 255 }),
	port: int(),
	database: varchar({ length: 255 }),
	username: varchar({ length: 255 }),
	password: text(),
	filePath: text(),
	connectionOptions: text(),
	lastTestedAt: timestamp({ mode: 'string' }),
	lastTestStatus: varchar({ length: 50 }),
});


export const errorLogs = mysqlTable("error_logs", {
	id: int().autoincrement().notNull(),
	errorId: varchar("error_id", { length: 64 }).notNull(),
	errorType: varchar("error_type", { length: 100 }).notNull(),
	errorCode: varchar("error_code", { length: 50 }),
	message: text().notNull(),
	stackTrace: text("stack_trace"),
	severity: mysqlEnum(['low','medium','high','critical']).default('medium').notNull(),
	source: varchar({ length: 100 }),
	userId: int("user_id"),
	requestId: varchar("request_id", { length: 64 }),
	requestPath: varchar("request_path", { length: 500 }),
	requestMethod: varchar("request_method", { length: 10 }),
	userAgent: text("user_agent"),
	ipAddress: varchar("ip_address", { length: 45 }),
	metadata: text(),
	isResolved: int("is_resolved").default(0).notNull(),
	resolvedAt: timestamp("resolved_at", { mode: 'string' }),
	resolvedBy: int("resolved_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("error_logs_error_id_unique").on(table.errorId),
]);


export const licenseCustomers = mysqlTable("license_customers", {
	id: int().autoincrement().notNull(),
	companyName: varchar({ length: 255 }).notNull(),
	contactName: varchar({ length: 255 }),
	contactEmail: varchar({ length: 320 }),
	contactPhone: varchar({ length: 50 }),
	address: text(),
	industry: varchar({ length: 100 }),
	notes: text(),
	isActive: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});


export const licenseHeartbeats = mysqlTable("license_heartbeats", {
	id: int().autoincrement().notNull(),
	licenseKey: varchar({ length: 255 }).notNull(),
	hardwareFingerprint: varchar({ length: 64 }),
	hostname: varchar({ length: 255 }),
	platform: varchar({ length: 100 }),
	activeUsers: int(),
	ipAddress: varchar({ length: 45 }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});


export const licenseNotificationLogs = mysqlTable("license_notification_logs", {
	id: int().autoincrement().notNull(),
	licenseId: int("license_id").notNull(),
	licenseKey: varchar("license_key", { length: 255 }).notNull(),
	notificationType: mysqlEnum("notification_type", ['7_days_warning','30_days_warning','expired','activated','deactivated']).notNull(),
	recipientEmail: varchar("recipient_email", { length: 320 }).notNull(),
	subject: varchar({ length: 500 }),
	status: mysqlEnum(['sent','failed','pending']).default('pending').notNull(),
	errorMessage: text("error_message"),
	sentAt: timestamp("sent_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	content: text(),
	retryCount: int("retry_count").default(0).notNull(),
});


export const licenses = mysqlTable("licenses", {
	id: int().autoincrement().notNull(),
	licenseKey: varchar({ length: 255 }).notNull(),
	licenseType: mysqlEnum(['trial','standard','professional','enterprise']).default('trial').notNull(),
	companyName: varchar({ length: 255 }),
	contactEmail: varchar({ length: 320 }),
	maxUsers: int().default(5).notNull(),
	maxProductionLines: int().default(3).notNull(),
	maxSpcPlans: int().default(10).notNull(),
	features: text(),
	issuedAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	expiresAt: timestamp({ mode: 'string' }),
	activatedAt: timestamp({ mode: 'string' }),
	activatedBy: int(),
	isActive: int().default(0).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	licenseStatus: mysqlEnum(['pending','active','expired','revoked']).default('pending').notNull(),
	hardwareFingerprint: varchar({ length: 64 }),
	offlineLicenseFile: text(),
	activationMode: mysqlEnum(['online','offline','hybrid']).default('online'),
	lastValidatedAt: timestamp({ mode: 'string' }),
	price: decimal({ precision: 15, scale: 2 }),
	currency: varchar({ length: 3 }).default('VND'),
	systems: text(),
	systemFeatures: text(),
},
(table) => [
	index("licenses_licenseKey_unique").on(table.licenseKey),
	index("idx_license_status").on(table.licenseStatus),
	index("").on(table.licenseStatus),
]);


export const systemConfig = mysqlTable("system_config", {
	id: int().autoincrement().notNull(),
	configKey: varchar({ length: 100 }).notNull(),
	configValue: text(),
	configType: varchar({ length: 50 }).default('string').notNull(),
	description: text(),
	isEncrypted: int().default(0).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("system_config_configKey_unique").on(table.configKey),
]);


export const systemSettings = mysqlTable("system_settings", {
	id: int().autoincrement().notNull(),
	key: varchar({ length: 100 }).notNull(),
	value: text(),
	description: text(),
	updatedBy: int(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("system_settings_key_unique").on(table.key),
]);

