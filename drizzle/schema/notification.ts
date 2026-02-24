import { mysqlTable, mysqlSchema, AnyMySqlColumn, int, varchar, timestamp, index, json, decimal, text, mysqlEnum, datetime, bigint, tinyint, boolean, date } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"


// === NOTIFICATION Domain Tables ===

export const emailNotificationSettings = mysqlTable("email_notification_settings", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	email: varchar({ length: 320 }).notNull(),
	notifyOnSpcViolation: int().default(1).notNull(),
	notifyOnCaViolation: int().default(1).notNull(),
	notifyOnCpkViolation: int().default(1).notNull(),
	cpkThreshold: int().default(133).notNull(),
	notifyFrequency: mysqlEnum(['immediate','hourly','daily']).default('immediate').notNull(),
	isActive: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});


export const notificationChannels = mysqlTable("notification_channels", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	channelType: varchar({ length: 50 }).notNull(),
	channelConfig: text(),
	enabled: tinyint().default(1),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP'),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
});


export const notificationLogs = mysqlTable("notification_logs", {
	id: int().autoincrement().notNull(),
	userId: int(),
	channelType: varchar({ length: 50 }).notNull(),
	recipient: varchar({ length: 255 }).notNull(),
	subject: varchar({ length: 500 }),
	message: text(),
	status: mysqlEnum(['pending','sent','failed']).default('pending'),
	errorMessage: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP'),
});


export const smtpConfig = mysqlTable("smtp_config", {
	id: int().autoincrement().notNull(),
	host: varchar({ length: 255 }).notNull(),
	port: int().default(587).notNull(),
	secure: int().default(0).notNull(),
	username: varchar({ length: 255 }).notNull(),
	password: varchar({ length: 255 }).notNull(),
	fromEmail: varchar({ length: 320 }).notNull(),
	fromName: varchar({ length: 255 }).default('SPC/CPK Calculator').notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});


export const twilioConfig = mysqlTable("twilio_config", {
	id: int().autoincrement().notNull(),
	accountSid: varchar("account_sid", { length: 100 }),
	authToken: varchar("auth_token", { length: 100 }),
	fromNumber: varchar("from_number", { length: 50 }),
	enabled: int().default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});


export const webhookConfig = mysqlTable("webhook_config", {
	id: int().autoincrement().notNull(),
	slackWebhookUrl: varchar("slack_webhook_url", { length: 500 }),
	slackChannel: varchar("slack_channel", { length: 100 }),
	slackEnabled: int("slack_enabled").default(0).notNull(),
	teamsWebhookUrl: varchar("teams_webhook_url", { length: 500 }),
	teamsEnabled: int("teams_enabled").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});


export const notificationPreferences = mysqlTable("notification_preferences", {
  id: int().autoincrement().notNull().primaryKey(),
  userId: int("user_id").notNull(),
  // Email settings
  emailEnabled: int("email_enabled").default(1).notNull(),
  emailAddress: varchar("email_address", { length: 255 }),
  // Telegram settings
  telegramEnabled: int("telegram_enabled").default(0).notNull(),
  telegramChatId: varchar("telegram_chat_id", { length: 100 }),
  // Push notification settings
  pushEnabled: int("push_enabled").default(1).notNull(),
  // Severity filter: 'all', 'warning_up', 'critical_only'
  severityFilter: mysqlEnum("severity_filter", ['all', 'warning_up', 'critical_only']).default('warning_up').notNull(),
  // Quiet hours
  quietHoursEnabled: int("quiet_hours_enabled").default(0).notNull(),
  quietHoursStart: varchar("quiet_hours_start", { length: 5 }).default('22:00'),
  quietHoursEnd: varchar("quiet_hours_end", { length: 5 }).default('07:00'),
  // Timestamps
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_notification_user").on(table.userId),
]);


export type NotificationPreference = typeof notificationPreferences.$inferSelect;

export type InsertNotificationPreference = typeof notificationPreferences.$inferInsert;

// Scheduled MTTR/MTBF Reports - Cấu hình báo cáo định kỳ

export const unifiedWebhookConfigs = mysqlTable("unified_webhook_configs", {
	id: int().autoincrement().notNull().primaryKey(),
	userId: int("user_id").notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	// Channel type
	channelType: mysqlEnum("channel_type", ['slack', 'teams', 'discord', 'custom']).notNull(),
	// Webhook URL
	webhookUrl: varchar("webhook_url", { length: 500 }).notNull(),
	// Slack specific
	slackChannel: varchar("slack_channel", { length: 100 }),
	slackUsername: varchar("slack_username", { length: 100 }),
	slackIconEmoji: varchar("slack_icon_emoji", { length: 50 }),
	// Teams specific
	teamsTitle: varchar("teams_title", { length: 200 }),
	teamsThemeColor: varchar("teams_theme_color", { length: 10 }),
	// Custom webhook
	customHeaders: json("custom_headers"),
	customBodyTemplate: text("custom_body_template"),
	// Event subscriptions
	events: json("events"), // ['spc_violation', 'cpk_alert', 'auto_capture_defect', 'quality_alert']
	// Filters
	productionLineIds: json("production_line_ids"),
	workstationIds: json("workstation_ids"),
	productCodes: json("product_codes"),
	minSeverity: mysqlEnum("min_severity", ['info', 'minor', 'major', 'critical']).default('major'),
	// Rate limiting
	rateLimitMinutes: int("rate_limit_minutes").default(5),
	lastNotifiedAt: timestamp("last_notified_at", { mode: 'string' }),
	// Status
	isActive: int("is_active").default(1).notNull(),
	// Stats
	totalNotificationsSent: int("total_notifications_sent").default(0).notNull(),
	lastSuccessAt: timestamp("last_success_at", { mode: 'string' }),
	lastErrorAt: timestamp("last_error_at", { mode: 'string' }),
	lastErrorMessage: text("last_error_message"),
	// Metadata
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_unified_webhook_user").on(table.userId),
	index("idx_unified_webhook_type").on(table.channelType),
	index("idx_unified_webhook_active").on(table.isActive),
]);


export type UnifiedWebhookConfig = typeof unifiedWebhookConfigs.$inferSelect;

export type InsertUnifiedWebhookConfig = typeof unifiedWebhookConfigs.$inferInsert;

// Webhook Notification Logs - Lịch sử gửi webhook

export const unifiedWebhookLogs = mysqlTable("unified_webhook_logs", {
	id: int().autoincrement().notNull().primaryKey(),
	webhookConfigId: int("webhook_config_id").notNull(),
	// Event details
	eventType: varchar("event_type", { length: 100 }).notNull(),
	eventTitle: varchar("event_title", { length: 255 }).notNull(),
	eventMessage: text("event_message"),
	eventData: json("event_data"),
	severity: mysqlEnum(['info', 'minor', 'major', 'critical']).default('info'),
	// Source reference
	sourceType: varchar("source_type", { length: 50 }), // 'auto_capture', 'spc_analysis', 'quality_check'
	sourceId: int("source_id"),
	// Request/Response
	requestPayload: text("request_payload"),
	responseStatus: int("response_status"),
	responseBody: text("response_body"),
	// Status
	status: mysqlEnum(['pending', 'sent', 'failed']).default('pending').notNull(),
	sentAt: timestamp("sent_at", { mode: 'string' }),
	errorMessage: text("error_message"),
	retryCount: int("retry_count").default(0).notNull(),
	// Metadata
	processingTimeMs: int("processing_time_ms"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_unified_webhook_log_config").on(table.webhookConfigId),
	index("idx_unified_webhook_log_event").on(table.eventType),
	index("idx_unified_webhook_log_status").on(table.status),
	index("idx_unified_webhook_log_created").on(table.createdAt),
]);


export type UnifiedWebhookLog = typeof unifiedWebhookLogs.$inferSelect;

export type InsertUnifiedWebhookLog = typeof unifiedWebhookLogs.$inferInsert;

// Quality Trend Report Config - Cấu hình báo cáo xu hướng chất lượng
