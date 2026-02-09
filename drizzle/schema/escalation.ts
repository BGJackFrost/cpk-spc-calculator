import { mysqlTable, mysqlSchema, AnyMySqlColumn, int, varchar, timestamp, index, json, decimal, text, mysqlEnum, datetime, bigint, tinyint, boolean, date } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"


// === ESCALATION Domain Tables ===

export const escalationConfigs = mysqlTable("escalation_configs", {
	id: int().autoincrement().notNull(),
	level: int().notNull(),
	name: varchar({ length: 100 }).notNull(),
	timeoutMinutes: int("timeout_minutes").default(15).notNull(),
	notifyEmails: text("notify_emails"),
	notifyPhones: text("notify_phones"),
	notifyOwner: int("notify_owner").default(0).notNull(),
	isActive: int("is_active").default(1).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("level").on(table.level),
]);


export const escalationHistory = mysqlTable("escalation_history", {
	id: int().autoincrement().notNull(),
	alertId: int("alert_id").notNull(),
	alertType: varchar("alert_type", { length: 100 }).notNull(),
	alertMessage: text("alert_message"),
	alertSeverity: mysqlEnum("alert_severity", ['info','warning','critical']).default('warning').notNull(),
	escalationLevel: int("escalation_level").notNull(),
	escalationLevelName: varchar("escalation_level_name", { length: 100 }).notNull(),
	escalationConfigId: int("escalation_config_id"),
	triggeredAt: timestamp("triggered_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	acknowledgedAt: bigint("acknowledged_at", { mode: "number" }),
	acknowledgedBy: int("acknowledged_by"),
	resolvedAt: bigint("resolved_at", { mode: "number" }),
	resolvedBy: int("resolved_by"),
	resolutionNotes: text("resolution_notes"),
	autoResolved: int("auto_resolved").default(0).notNull(),
	autoResolveReason: varchar("auto_resolve_reason", { length: 255 }),
	emailsSent: int("emails_sent").default(0).notNull(),
	smsSent: int("sms_sent").default(0).notNull(),
	webhooksSent: int("webhooks_sent").default(0).notNull(),
	notifiedEmails: text("notified_emails"),
	notifiedPhones: text("notified_phones"),
	productionLineId: int("production_line_id"),
	machineId: int("machine_id"),
	productId: int("product_id"),
	metricValue: decimal("metric_value", { precision: 10, scale: 4 }),
	thresholdValue: decimal("threshold_value", { precision: 10, scale: 4 }),
	status: mysqlEnum(['active','acknowledged','resolved','auto_resolved','expired']).default('active').notNull(),
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
	updatedAt: bigint("updated_at", { mode: "number" }),
	currentLevel: int("current_level").default(1),
	severity: varchar({ length: 20 }).default('medium'),
	alertTitle: varchar("alert_title", { length: 255 }),
	maxLevel: int("max_level").default(3),
	notificationsSent: int("notifications_sent").default(0),
	autoResolvedReason: text("auto_resolved_reason"),
	notes: text(),
	metadata: json(),
},
(table) => [
	index("idx_esc_hist_alert").on(table.alertId),
	index("idx_esc_hist_level").on(table.escalationLevel),
	index("idx_esc_hist_status").on(table.status),
	index("idx_esc_hist_triggered").on(table.triggeredAt),
	index("idx_esc_hist_line").on(table.productionLineId),
]);


export const escalationRealtimeStats = mysqlTable("escalation_realtime_stats", {
	id: int().autoincrement().notNull(),
	timestamp: bigint({ mode: "number" }).notNull(),
	intervalMinutes: int("interval_minutes").default(5).notNull(),
	totalAlerts: int("total_alerts").default(0).notNull(),
	criticalAlerts: int("critical_alerts").default(0).notNull(),
	highAlerts: int("high_alerts").default(0).notNull(),
	mediumAlerts: int("medium_alerts").default(0).notNull(),
	lowAlerts: int("low_alerts").default(0).notNull(),
	resolvedAlerts: int("resolved_alerts").default(0).notNull(),
	pendingAlerts: int("pending_alerts").default(0).notNull(),
	escalatedAlerts: int("escalated_alerts").default(0).notNull(),
	avgResolutionTimeMinutes: int("avg_resolution_time_minutes"),
	productionLineId: int("production_line_id"),
	alertType: varchar("alert_type", { length: 50 }),
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
},
(table) => [
	index("idx_realtime_stats_timestamp").on(table.timestamp),
	index("idx_realtime_stats_interval").on(table.intervalMinutes),
	index("idx_realtime_stats_line").on(table.productionLineId),
]);


export const escalationReportConfigs = mysqlTable("escalation_report_configs", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	frequency: mysqlEnum(['daily','weekly','monthly']).default('weekly').notNull(),
	dayOfWeek: int("day_of_week").default(1),
	dayOfMonth: int("day_of_month").default(1),
	timeOfDay: varchar("time_of_day", { length: 5 }).default('08:00').notNull(),
	timezone: varchar({ length: 50 }).default('Asia/Ho_Chi_Minh').notNull(),
	emailRecipients: json("email_recipients"),
	webhookConfigIds: json("webhook_config_ids"),
	includeStats: tinyint("include_stats").default(1).notNull(),
	includeTopAlerts: tinyint("include_top_alerts").default(1).notNull(),
	includeResolvedAlerts: tinyint("include_resolved_alerts").default(1).notNull(),
	includeTrends: tinyint("include_trends").default(1).notNull(),
	alertTypes: json("alert_types"),
	productionLineIds: json("production_line_ids"),
	isActive: tinyint("is_active").default(1).notNull(),
	lastRunAt: bigint("last_run_at", { mode: "number" }),
	nextRunAt: bigint("next_run_at", { mode: "number" }),
	createdBy: int("created_by"),
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
	updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
},
(table) => [
	index("idx_esc_report_active").on(table.isActive),
	index("idx_esc_report_next_run").on(table.nextRunAt),
]);


export const escalationReportHistory = mysqlTable("escalation_report_history", {
	id: int().autoincrement().notNull(),
	configId: int("config_id").notNull(),
	reportPeriodStart: bigint("report_period_start", { mode: "number" }).notNull(),
	reportPeriodEnd: bigint("report_period_end", { mode: "number" }).notNull(),
	totalAlerts: int("total_alerts").default(0).notNull(),
	resolvedAlerts: int("resolved_alerts").default(0).notNull(),
	pendingAlerts: int("pending_alerts").default(0).notNull(),
	avgResolutionTimeMinutes: int("avg_resolution_time_minutes"),
	emailsSent: int("emails_sent").default(0).notNull(),
	webhooksSent: int("webhooks_sent").default(0).notNull(),
	status: mysqlEnum(['pending','sent','partial','failed']).default('pending').notNull(),
	errorMessage: text("error_message"),
	reportData: json("report_data"),
	sentAt: bigint("sent_at", { mode: "number" }),
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
},
(table) => [
	index("idx_esc_report_hist_config").on(table.configId),
	index("idx_esc_report_hist_period").on(table.reportPeriodStart, table.reportPeriodEnd),
	index("idx_esc_report_hist_created").on(table.createdAt),
]);


export const escalationTemplates = mysqlTable("escalation_templates", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	level1TimeoutMinutes: int("level1_timeout_minutes").default(15).notNull(),
	level1Emails: json("level1_emails"),
	level1Webhooks: json("level1_webhooks"),
	level1SmsEnabled: tinyint("level1_sms_enabled").default(0).notNull(),
	level1SmsPhones: json("level1_sms_phones"),
	level2TimeoutMinutes: int("level2_timeout_minutes").default(30).notNull(),
	level2Emails: json("level2_emails"),
	level2Webhooks: json("level2_webhooks"),
	level2SmsEnabled: tinyint("level2_sms_enabled").default(0).notNull(),
	level2SmsPhones: json("level2_sms_phones"),
	level3TimeoutMinutes: int("level3_timeout_minutes").default(60).notNull(),
	level3Emails: json("level3_emails"),
	level3Webhooks: json("level3_webhooks"),
	level3SmsEnabled: tinyint("level3_sms_enabled").default(0).notNull(),
	level3SmsPhones: json("level3_sms_phones"),
	alertTypes: json("alert_types"),
	productionLineIds: json("production_line_ids"),
	machineIds: json("machine_ids"),
	isDefault: tinyint("is_default").default(0).notNull(),
	isActive: tinyint("is_active").default(1).notNull(),
	createdBy: int("created_by"),
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
	updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
},
(table) => [
	index("idx_escalation_template_active").on(table.isActive),
	index("idx_escalation_template_default").on(table.isDefault),
]);


export const escalationWebhookConfigs = mysqlTable("escalation_webhook_configs", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	channelType: mysqlEnum("channel_type", ['slack','teams','discord','custom']).notNull(),
	webhookUrl: varchar("webhook_url", { length: 500 }).notNull(),
	slackChannel: varchar("slack_channel", { length: 100 }),
	slackMentions: json("slack_mentions"),
	teamsTitle: varchar("teams_title", { length: 200 }),
	customHeaders: json("custom_headers"),
	customBodyTemplate: text("custom_body_template"),
	includeDetails: tinyint("include_details").default(1).notNull(),
	includeChart: tinyint("include_chart").default(0).notNull(),
	isActive: tinyint("is_active").default(1).notNull(),
	createdBy: int("created_by"),
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
	updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
},
(table) => [
	index("idx_esc_webhook_active").on(table.isActive),
	index("idx_esc_webhook_type").on(table.channelType),
]);


export const escalationWebhookLogs = mysqlTable("escalation_webhook_logs", {
	id: int().autoincrement().notNull(),
	webhookConfigId: int("webhook_config_id").notNull(),
	escalationHistoryId: int("escalation_history_id"),
	escalationLevel: int("escalation_level").notNull(),
	alertType: varchar("alert_type", { length: 50 }).notNull(),
	alertTitle: varchar("alert_title", { length: 255 }).notNull(),
	alertMessage: text("alert_message"),
	channelType: varchar("channel_type", { length: 20 }).notNull(),
	requestPayload: text("request_payload"),
	responseStatus: int("response_status"),
	responseBody: text("response_body"),
	success: tinyint().default(0).notNull(),
	errorMessage: text("error_message"),
	sentAt: bigint("sent_at", { mode: "number" }).notNull(),
},
(table) => [
	index("idx_esc_webhook_log_config").on(table.webhookConfigId),
	index("idx_esc_webhook_log_history").on(table.escalationHistoryId),
	index("idx_esc_webhook_log_sent").on(table.sentAt),
]);

