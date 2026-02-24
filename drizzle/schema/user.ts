import { mysqlTable, mysqlSchema, AnyMySqlColumn, int, varchar, timestamp, index, json, decimal, text, mysqlEnum, datetime, bigint, tinyint, boolean, date } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"


// === USER Domain Tables ===

export const failedLoginAttempts = mysqlTable("failed_login_attempts", {
	id: int().autoincrement().notNull(),
	username: varchar({ length: 100 }).notNull(),
	ipAddress: varchar("ip_address", { length: 45 }),
	userAgent: text("user_agent"),
	reason: varchar({ length: 255 }),
	attemptedAt: timestamp("attempted_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});


export const localUsers = mysqlTable("local_users", {
	id: int().autoincrement().notNull(),
	username: varchar({ length: 100 }).notNull(),
	passwordHash: varchar({ length: 255 }).notNull(),
	name: text(),
	email: varchar({ length: 320 }),
	role: mysqlEnum(['user','manager','admin']).default('user').notNull(),
	isActive: int().default(1).notNull(),
	mustChangePassword: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	lastSignedIn: timestamp({ mode: 'string' }),
	avatar: varchar({ length: 500 }),
},
(table) => [
	index("local_users_username_unique").on(table.username),
]);


export const loginHistory = mysqlTable("login_history", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	username: varchar({ length: 100 }).notNull(),
	authType: mysqlEnum(['local','manus']).default('local').notNull(),
	eventType: mysqlEnum(['login','logout','login_failed']).notNull(),
	ipAddress: varchar({ length: 45 }),
	userAgent: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_login_user").on(table.userId),
	index("idx_login_event").on(table.eventType),
	index("idx_login_date").on(table.createdAt),
	index("idx_login_history_created_at").on(table.createdAt),
	index("idx_login_history_event").on(table.eventType),
	index("idx_login_history_user").on(table.userId, table.createdAt),
	index("").on(table.userId),
	index("idx_login_created").on(table.createdAt),
	index("idx_login_user_created").on(table.userId, table.createdAt),
]);


export const loginLocationHistory = mysqlTable("login_location_history", {
	id: int().autoincrement().notNull(),
	loginHistoryId: int("login_history_id").notNull(),
	userId: int("user_id").notNull(),
	ipAddress: varchar("ip_address", { length: 45 }).notNull(),
	country: varchar({ length: 100 }),
	countryCode: varchar("country_code", { length: 10 }),
	region: varchar({ length: 100 }),
	city: varchar({ length: 100 }),
	latitude: decimal({ precision: 10, scale: 7 }),
	longitude: decimal({ precision: 10, scale: 7 }),
	isp: varchar({ length: 255 }),
	timezone: varchar({ length: 100 }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});


export const modulePermissions = mysqlTable("module_permissions", {
	id: int().autoincrement().notNull(),
	moduleId: int().notNull(),
	code: varchar({ length: 100 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	actionType: mysqlEnum(['view','create','edit','delete','export','import','approve','manage']).default('view').notNull(),
	isActive: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});


export const permissions = mysqlTable("permissions", {
	id: int().autoincrement().notNull(),
	code: varchar({ length: 100 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	module: varchar({ length: 100 }).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	system: mysqlEnum(['SPC','MMS','COMMON']).default('COMMON').notNull(),
	parentId: int(),
	sortOrder: int().default(0),
},
(table) => [
	index("permissions_code_unique").on(table.code),
]);


export const roleModulePermissions = mysqlTable("role_module_permissions", {
	id: int().autoincrement().notNull(),
	roleId: int().notNull(),
	permissionId: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});


export const rolePermissions = mysqlTable("role_permissions", {
	id: int().autoincrement().notNull(),
	role: mysqlEnum(['user','admin','operator','viewer']).notNull(),
	permissionId: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});


export const roleTemplates = mysqlTable("role_templates", {
	id: int().autoincrement().notNull(),
	code: varchar({ length: 100 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	category: mysqlEnum(['production','quality','maintenance','management','system']).default('production').notNull(),
	permissionIds: text().notNull(),
	isDefault: int().default(0).notNull(),
	isActive: int().default(1).notNull(),
	createdBy: int(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("code").on(table.code),
]);


export const systemModules = mysqlTable("system_modules", {
	id: int().autoincrement().notNull(),
	code: varchar({ length: 100 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	systemType: mysqlEnum(['mms','spc','system','common']).default('common').notNull(),
	parentId: int(),
	icon: varchar({ length: 100 }),
	path: varchar({ length: 255 }),
	sortOrder: int().default(0).notNull(),
	isActive: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("code").on(table.code),
]);


export const userChartConfigs = mysqlTable("user_chart_configs", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull(),
	chartType: varchar("chart_type", { length: 50 }).notNull(),
	configName: varchar("config_name", { length: 100 }).notNull(),
	isDefault: int("is_default").default(0).notNull(),
	settings: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});


export const userDashboardConfigs = mysqlTable("user_dashboard_configs", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	widgetKey: varchar({ length: 100 }).notNull(),
	isVisible: int().default(1).notNull(),
	displayOrder: int().default(0).notNull(),
	config: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});


export const userLineAssignments = mysqlTable("user_line_assignments", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	productionLineId: int().notNull(),
	displayOrder: int().default(0).notNull(),
	isVisible: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});


export const userPermissions = mysqlTable("user_permissions", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	permissionId: int().notNull(),
	granted: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});


export const userPredictionConfigs = mysqlTable("user_prediction_configs", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	configType: mysqlEnum(['oee','cpk','spc']).notNull(),
	configName: varchar({ length: 100 }).notNull(),
	algorithm: mysqlEnum(['linear','moving_avg','exp_smoothing']).default('linear').notNull(),
	predictionDays: int().default(14).notNull(),
	confidenceLevel: decimal({ precision: 5, scale: 2 }).default('95.00').notNull(),
	alertThreshold: decimal({ precision: 5, scale: 2 }).default('5.00').notNull(),
	movingAvgWindow: int().default(7),
	smoothingFactor: decimal({ precision: 3, scale: 2 }).default('0.30'),
	historicalDays: int().default(30).notNull(),
	isDefault: int().default(0).notNull(),
	isActive: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});


export const userQuickAccess = mysqlTable("user_quick_access", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull(),
	menuId: varchar("menu_id", { length: 100 }).notNull(),
	menuPath: varchar("menu_path", { length: 255 }).notNull(),
	menuLabel: varchar("menu_label", { length: 100 }).notNull(),
	menuIcon: varchar("menu_icon", { length: 50 }),
	systemId: varchar("system_id", { length: 50 }),
	sortOrder: int("sort_order").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	categoryId: int("category_id"),
	isPinned: int("is_pinned").default(0).notNull(),
},
(table) => [
	index("idx_user_id").on(table.userId),
	index("unique_user_menu").on(table.userId, table.menuId),
	index("idx_user_quick_access_user_order").on(table.userId, table.sortOrder),
]);


export const userQuickAccessCategories = mysqlTable("user_quick_access_categories", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull(),
	name: varchar({ length: 100 }).notNull(),
	icon: varchar({ length: 50 }).default('Folder'),
	color: varchar({ length: 20 }).default('blue'),
	sortOrder: int("sort_order").default(0).notNull(),
	isExpanded: int("is_expanded").default(1).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});


export const userSessions = mysqlTable("user_sessions", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull(),
	authType: mysqlEnum("auth_type", ['local','manus']).default('local').notNull(),
	token: varchar({ length: 500 }).notNull(),
	deviceName: varchar("device_name", { length: 255 }),
	deviceType: varchar("device_type", { length: 50 }),
	deviceFingerprint: varchar("device_fingerprint", { length: 255 }),
	browser: varchar({ length: 100 }),
	os: varchar({ length: 100 }),
	userAgent: text("user_agent"),
	ipAddress: varchar("ip_address", { length: 45 }),
	location: varchar({ length: 255 }),
	lastActiveAt: timestamp("last_active_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	isActive: int("is_active").default(1).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("token").on(table.token),
]);


export const userSpcChartPreferences = mysqlTable("user_spc_chart_preferences", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull(),
	showXbarChart: int("show_xbar_chart").default(1).notNull(),
	showRChart: int("show_r_chart").default(1).notNull(),
	showHistogram: int("show_histogram").default(1).notNull(),
	showSampleTable: int("show_sample_table").default(1).notNull(),
	showCusumChart: int("show_cusum_chart").default(0).notNull(),
	showEwmaChart: int("show_ewma_chart").default(0).notNull(),
	showNormalProbabilityPlot: int("show_normal_probability_plot").default(0).notNull(),
	showBoxPlot: int("show_box_plot").default(0).notNull(),
	showCapabilityGauge: int("show_capability_gauge").default(0).notNull(),
	showCapabilityPieChart: int("show_capability_pie_chart").default(0).notNull(),
	showRunChart: int("show_run_chart").default(0).notNull(),
	showMovingAverageChart: int("show_moving_average_chart").default(0).notNull(),
	showSpecComparison: int("show_spec_comparison").default(0).notNull(),
	showSigmaZonesChart: int("show_sigma_zones_chart").default(0).notNull(),
	chartLayout: varchar("chart_layout", { length: 20 }).default('grid'),
	defaultTimeRange: int("default_time_range").default(7),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_user_id").on(table.userId),
]);


export const userThemePreferences = mysqlTable("user_theme_preferences", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull(),
	themeId: varchar("theme_id", { length: 50 }).default('default-blue').notNull(),
	isDarkMode: int("is_dark_mode").default(0).notNull(),
	customThemeId: int("custom_theme_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("user_theme_unique").on(table.userId),
]);


export const userNotifications = mysqlTable("user_notifications", {
	id: int().autoincrement().notNull().primaryKey(),
	userId: int("user_id").notNull(),
	// Notification type
	type: mysqlEnum("type", ['report_sent', 'spc_violation', 'cpk_alert', 'system', 'anomaly_detected']).notNull(),
	severity: mysqlEnum("severity", ['info', 'warning', 'critical']).default('info').notNull(),
	// Content
	title: varchar("title", { length: 255 }).notNull(),
	message: text("message").notNull(),
	// Reference data
	referenceType: varchar("reference_type", { length: 50 }), // 'report', 'spc_plan', 'analysis', etc.
	referenceId: int("reference_id"),
	// Metadata
	metadata: json("metadata"), // Additional data like report URL, CPK value, etc.
	// Status
	isRead: tinyint("is_read").default(0).notNull(),
	readAt: timestamp("read_at", { mode: 'string' }),
	// Timestamps
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_user_notifications_user").on(table.userId),
	index("idx_user_notifications_type").on(table.type),
	index("idx_user_notifications_read").on(table.isRead),
	index("idx_user_notifications_created").on(table.createdAt),
]);

export type UserNotification = typeof userNotifications.$inferSelect;

export type InsertUserNotification = typeof userNotifications.$inferInsert;

// Scheduled Report PDF History - Lịch sử PDF báo cáo đã xuất

export const loginAttempts = mysqlTable("login_attempts", {
	id: int().autoincrement().notNull().primaryKey(),
	username: varchar("username", { length: 100 }).notNull(),
	ipAddress: varchar("ip_address", { length: 45 }),
	userAgent: text("user_agent"),
	success: tinyint("success").default(0).notNull(),
	failureReason: varchar("failure_reason", { length: 255 }),
	attemptedAt: timestamp("attempted_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_login_attempts_username").on(table.username),
	index("idx_login_attempts_ip").on(table.ipAddress),
	index("idx_login_attempts_time").on(table.attemptedAt),
]);

export type LoginAttempt = typeof loginAttempts.$inferSelect;

export type InsertLoginAttempt = typeof loginAttempts.$inferInsert;

// Auth Audit Logs - Ghi log chi tiết cho các hoạt động authentication

export const authAuditLogs = mysqlTable("auth_audit_logs", {
	id: int().autoincrement().notNull().primaryKey(),
	userId: int("user_id"),
	username: varchar("username", { length: 100 }),
	// Event type: login_success, login_failed, logout, password_change, password_reset, 2fa_enabled, 2fa_disabled, account_locked, account_unlocked
	eventType: mysqlEnum("event_type", [
		'login_success', 'login_failed', 'logout', 
		'password_change', 'password_reset', 
		'2fa_enabled', '2fa_disabled', '2fa_verified',
		'account_locked', 'account_unlocked',
		'session_expired', 'token_refresh'
	]).notNull(),
	// Auth method: local, oauth, 2fa
	authMethod: mysqlEnum("auth_method", ['local', 'oauth', '2fa']).default('local'),
	// Details
	details: text("details"), // JSON string with additional info
	ipAddress: varchar("ip_address", { length: 45 }),
	userAgent: text("user_agent"),
	// Location info (optional)
	country: varchar("country", { length: 100 }),
	city: varchar("city", { length: 100 }),
	// Status
	severity: mysqlEnum("severity", ['info', 'warning', 'critical']).default('info').notNull(),
	// Timestamps
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_auth_audit_user").on(table.userId),
	index("idx_auth_audit_username").on(table.username),
	index("idx_auth_audit_event").on(table.eventType),
	index("idx_auth_audit_time").on(table.createdAt),
	index("idx_auth_audit_severity").on(table.severity),
]);

export type AuthAuditLog = typeof authAuditLogs.$inferSelect;

export type InsertAuthAuditLog = typeof authAuditLogs.$inferInsert;


// ============================================
// Phase 15: Factory/Workshop Hierarchy - Hoàn thiện 100% yêu cầu
// ============================================

// Factories - Quản lý nhà máy

export const userDashboardLayouts = mysqlTable("user_dashboard_layouts", {
	id: int().autoincrement().notNull().primaryKey(),
	userId: int("user_id").notNull(),
	name: varchar({ length: 255 }).default('Default Dashboard').notNull(),
	description: text(),
	// Layout settings
	gridColumns: int("grid_columns").default(12).notNull(), // Number of columns in grid
	rowHeight: int("row_height").default(100).notNull(), // Height of each row in pixels
	// Theme
	theme: mysqlEnum(['light', 'dark', 'auto']).default('auto'),
	// Status
	isDefault: int("is_default").default(0).notNull(),
	isActive: int("is_active").default(1).notNull(),
	// Metadata
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_user_dashboard_layout_user").on(table.userId),
	index("idx_user_dashboard_layout_default").on(table.isDefault),
]);


export type UserDashboardLayout = typeof userDashboardLayouts.$inferSelect;

export type InsertUserDashboardLayout = typeof userDashboardLayouts.$inferInsert;

// Batch Image Analysis Jobs - Batch job phân tích hình ảnh
