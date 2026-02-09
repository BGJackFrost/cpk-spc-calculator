import { mysqlTable, mysqlSchema, AnyMySqlColumn, int, varchar, timestamp, index, json, decimal, text, mysqlEnum, datetime, bigint, tinyint, boolean, date } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"


// === ALERT Domain Tables ===

export const alertAnalytics = mysqlTable("alert_analytics", {
	id: int().autoincrement().notNull(),
	date: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	alertType: varchar("alert_type", { length: 100 }).notNull(),
	severity: mysqlEnum(['info','warning','critical']).default('info').notNull(),
	source: varchar({ length: 255 }),
	count: int().default(0).notNull(),
	resolvedCount: int("resolved_count").default(0).notNull(),
	totalResolutionTimeMs: bigint("total_resolution_time_ms", { mode: "number" }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});


export const alertEscalationLogs = mysqlTable("alert_escalation_logs", {
	id: int().autoincrement().notNull(),
	alertId: int("alert_id").notNull(),
	escalationLevel: int("escalation_level").notNull(),
	levelName: varchar("level_name", { length: 100 }).notNull(),
	notifiedEmails: text("notified_emails"),
	notifiedPhones: text("notified_phones"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});


export const alertNotificationLogs = mysqlTable("alert_notification_logs", {
	id: int().autoincrement().notNull(),
	alertId: int("alert_id").notNull(),
	emailSent: int("email_sent").default(0).notNull(),
	emailError: text("email_error"),
	smsSent: int("sms_sent").default(0).notNull(),
	smsError: text("sms_error"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});


export const alertPriorityHistory = mysqlTable("alert_priority_history", {
	id: int().autoincrement().notNull(),
	alertId: int("alert_id").notNull(),
	escalationHistoryId: int("escalation_history_id"),
	previousPriority: varchar("previous_priority", { length: 20 }),
	newPriority: mysqlEnum("new_priority", ['critical','high','medium','low']).notNull(),
	assignedBy: mysqlEnum("assigned_by", ['ai','rule','manual']).notNull(),
	aiConfidence: decimal("ai_confidence", { precision: 5, scale: 2 }),
	aiReasoning: text("ai_reasoning"),
	matchedRuleIds: text("matched_rule_ids"),
	contextData: text("context_data"),
	createdBy: int("created_by"),
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
},
(table) => [
	index("idx_priority_history_alert").on(table.alertId),
	index("idx_priority_history_escalation").on(table.escalationHistoryId),
	index("idx_priority_history_priority").on(table.newPriority),
	index("idx_priority_history_created").on(table.createdAt),
]);


export const alertPriorityRules = mysqlTable("alert_priority_rules", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	alertType: varchar("alert_type", { length: 50 }).notNull(),
	condition: text().notNull(),
	priority: mysqlEnum(['critical','high','medium','low']).notNull(),
	weight: int().default(1).notNull(),
	autoAssign: tinyint("auto_assign").default(1).notNull(),
	isActive: tinyint("is_active").default(1).notNull(),
	createdBy: int("created_by"),
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
	updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
},
(table) => [
	index("idx_priority_rule_type").on(table.alertType),
	index("idx_priority_rule_active").on(table.isActive),
	index("idx_priority_rule_priority").on(table.priority),
]);


export const alertSettings = mysqlTable("alert_settings", {
	id: int().autoincrement().notNull(),
	mappingId: int(),
	cpkWarningThreshold: int().default(133).notNull(),
	cpkCriticalThreshold: int().default(100).notNull(),
	notifyOwner: int().default(1).notNull(),
	isActive: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});


export const alertWebhookConfigs = mysqlTable("alert_webhook_configs", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	channelType: mysqlEnum("channel_type", ['slack','teams','email','discord','custom']).notNull(),
	webhookUrl: varchar("webhook_url", { length: 500 }),
	emailRecipients: json("email_recipients"),
	emailSubjectTemplate: varchar("email_subject_template", { length: 255 }),
	slackChannel: varchar("slack_channel", { length: 100 }),
	slackBotToken: varchar("slack_bot_token", { length: 255 }),
	teamsWebhookUrl: varchar("teams_webhook_url", { length: 500 }),
	alertTypes: json("alert_types"),
	productionLineIds: json("production_line_ids"),
	machineIds: json("machine_ids"),
	minSeverity: mysqlEnum("min_severity", ['info','warning','critical']).default('warning').notNull(),
	rateLimitMinutes: int("rate_limit_minutes").default(5),
	lastAlertSentAt: timestamp("last_alert_sent_at", { mode: 'string' }),
	isActive: int("is_active").default(1).notNull(),
	testMode: int("test_mode").default(0).notNull(),
	createdBy: int("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});


export const alertWebhookLogs = mysqlTable("alert_webhook_logs", {
	id: int().autoincrement().notNull(),
	webhookConfigId: int("webhook_config_id").notNull(),
	alertType: varchar("alert_type", { length: 50 }).notNull(),
	alertTitle: varchar("alert_title", { length: 255 }).notNull(),
	alertMessage: text("alert_message"),
	alertData: json("alert_data"),
	channelType: varchar("channel_type", { length: 20 }).notNull(),
	recipientInfo: varchar("recipient_info", { length: 255 }),
	status: mysqlEnum(['pending','sent','failed','rate_limited']).default('pending').notNull(),
	responseCode: int("response_code"),
	responseBody: text("response_body"),
	errorMessage: text("error_message"),
	sentAt: timestamp("sent_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_webhook_config").on(table.webhookConfigId),
	index("idx_alert_type").on(table.alertType),
	index("idx_created_at").on(table.createdAt),
]);


export const alertEmailConfigs = mysqlTable("alert_email_configs", {
	id: int().autoincrement().notNull().primaryKey(),
	userId: int("user_id").notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	isActive: int("is_active").default(1).notNull(),
	productionLineId: int("production_line_id"),
	workstationId: int("workstation_id"),
	productCode: varchar("product_code", { length: 100 }),
	alertTypes: json("alert_types"),
	severityThreshold: mysqlEnum("severity_threshold", ['minor', 'major', 'critical']).default('major').notNull(),
	emailRecipients: json("email_recipients"),
	emailSubjectTemplate: varchar("email_subject_template", { length: 500 }),
	emailBodyTemplate: text("email_body_template"),
	includeImage: int("include_image").default(1).notNull(),
	includeAiAnalysis: int("include_ai_analysis").default(1).notNull(),
	cooldownMinutes: int("cooldown_minutes").default(30).notNull(),
	lastAlertSentAt: timestamp("last_alert_sent_at", { mode: 'string' }),
	totalAlertsSent: int("total_alerts_sent").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_alert_configs_user").on(table.userId),
	index("idx_alert_configs_active").on(table.isActive),
	index("idx_alert_configs_line").on(table.productionLineId),
]);


export const alertEmailHistory = mysqlTable("alert_email_history", {
	id: int().autoincrement().notNull().primaryKey(),
	configId: int("config_id").notNull(),
	qualityImageId: int("quality_image_id"),
	comparisonId: int("comparison_id"),
	alertType: varchar("alert_type", { length: 100 }).notNull(),
	severity: mysqlEnum(['minor', 'major', 'critical']).notNull(),
	subject: varchar({ length: 500 }).notNull(),
	body: text().notNull(),
	recipients: json().notNull(),
	status: mysqlEnum(['pending', 'sent', 'failed']).default('pending').notNull(),
	sentAt: timestamp("sent_at", { mode: 'string' }),
	errorMessage: text("error_message"),
	retryCount: int("retry_count").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_alert_history_config").on(table.configId),
	index("idx_alert_history_status").on(table.status),
	index("idx_alert_history_created").on(table.createdAt),
	index("idx_alert_history_severity").on(table.severity),
]);


// ============================================
// Phase 10 - Auto-capture, Webhook Notification, Quality Trend Report
// ============================================

// Auto-capture Schedule - Lịch chụp ảnh tự động

export const customAlertRules = mysqlTable("custom_alert_rules", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  metricType: varchar("metric_type", { length: 50 }).notNull(),
  operator: varchar("operator", { length: 20 }).notNull(),
  threshold: decimal("threshold", { precision: 15, scale: 6 }).notNull(),
  thresholdMax: decimal("threshold_max", { precision: 15, scale: 6 }),
  severity: varchar("severity", { length: 20 }).notNull().default("warning"),
  isActive: boolean("is_active").notNull().default(true),
  evaluationIntervalMinutes: int("evaluation_interval_minutes").notNull().default(5),
  cooldownMinutes: int("cooldown_minutes").notNull().default(30),
  consecutiveBreachesRequired: int("consecutive_breaches_required").notNull().default(1),
  currentConsecutiveBreaches: int("current_consecutive_breaches").notNull().default(0),
  notificationChannels: text("notification_channels"),
  recipients: text("recipients"),
  webhookUrl: varchar("webhook_url", { length: 500 }),
  lastEvaluatedAt: bigint("last_evaluated_at", { mode: "number" }),
  lastTriggeredAt: bigint("last_triggered_at", { mode: "number" }),
  totalTriggers: int("total_triggers").notNull().default(0),
  createdBy: varchar("created_by", { length: 255 }),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
}, (table) => [
  index("idx_custom_alert_metric").on(table.metricType),
  index("idx_custom_alert_active").on(table.isActive),
  index("idx_custom_alert_severity").on(table.severity),
]);

export type CustomAlertRule = typeof customAlertRules.$inferSelect;

export type InsertCustomAlertRule = typeof customAlertRules.$inferInsert;


export const customAlertHistory = mysqlTable("custom_alert_history", {
  id: int("id").primaryKey().autoincrement(),
  ruleId: int("rule_id").notNull(),
  ruleName: varchar("rule_name", { length: 255 }).notNull(),
  metricType: varchar("metric_type", { length: 50 }).notNull(),
  currentValue: decimal("current_value", { precision: 15, scale: 6 }).notNull(),
  threshold: decimal("threshold", { precision: 15, scale: 6 }).notNull(),
  operator: varchar("operator", { length: 20 }).notNull(),
  severity: varchar("severity", { length: 20 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  message: text("message"),
  notificationChannels: text("notification_channels"),
  triggeredAt: bigint("triggered_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  acknowledgedAt: bigint("acknowledged_at", { mode: "number" }),
  acknowledgedBy: varchar("acknowledged_by", { length: 255 }),
  resolvedAt: bigint("resolved_at", { mode: "number" }),
  resolvedBy: varchar("resolved_by", { length: 255 }),
}, (table) => [
  index("idx_custom_alert_hist_rule").on(table.ruleId),
  index("idx_custom_alert_hist_status").on(table.status),
  index("idx_custom_alert_hist_severity").on(table.severity),
  index("idx_custom_alert_hist_triggered").on(table.triggeredAt),
]);

export type CustomAlertHistoryEntry = typeof customAlertHistory.$inferSelect;

export type InsertCustomAlertHistoryEntry = typeof customAlertHistory.$inferInsert;

