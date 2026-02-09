import { mysqlTable, mysqlSchema, AnyMySqlColumn, int, varchar, timestamp, index, json, decimal, text, mysqlEnum, datetime, bigint, tinyint, boolean, date } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"


// === FIREBASE Domain Tables ===

export const firebaseConfig = mysqlTable("firebase_config", {
	id: int().autoincrement().notNull(),
	projectId: varchar("project_id", { length: 255 }).notNull(),
	clientEmail: varchar("client_email", { length: 255 }).notNull(),
	privateKey: text("private_key").notNull(),
	isActive: tinyint("is_active").default(1).notNull(),
	createdBy: int("created_by"),
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
	updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});


export const firebaseDeviceTokens = mysqlTable("firebase_device_tokens", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull(),
	token: varchar({ length: 500 }).notNull(),
	deviceType: mysqlEnum("device_type", ['android','ios','web']).notNull(),
	deviceName: varchar("device_name", { length: 100 }),
	deviceModel: varchar("device_model", { length: 100 }),
	appVersion: varchar("app_version", { length: 20 }),
	isActive: tinyint("is_active").default(1).notNull(),
	lastUsedAt: bigint("last_used_at", { mode: "number" }),
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
	updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
},
(table) => [
	index("idx_device_token_user").on(table.userId),
	index("idx_device_token_active").on(table.isActive),
]);


export const firebasePushConfigs = mysqlTable("firebase_push_configs", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull(),
	enablePush: tinyint("enable_push").default(1).notNull(),
	enableCriticalAlerts: tinyint("enable_critical_alerts").default(1).notNull(),
	enableHighAlerts: tinyint("enable_high_alerts").default(1).notNull(),
	enableMediumAlerts: tinyint("enable_medium_alerts").default(0).notNull(),
	enableLowAlerts: tinyint("enable_low_alerts").default(0).notNull(),
	quietHoursStart: varchar("quiet_hours_start", { length: 10 }),
	quietHoursEnd: varchar("quiet_hours_end", { length: 10 }),
	alertTypes: text("alert_types"),
	productionLineIds: text("production_line_ids"),
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
	updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
},
(table) => [
	index("idx_push_config_user").on(table.userId),
]);


export const firebasePushHistory = mysqlTable("firebase_push_history", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull(),
	deviceTokenId: int("device_token_id"),
	escalationHistoryId: int("escalation_history_id"),
	title: varchar({ length: 255 }).notNull(),
	body: text().notNull(),
	data: text(),
	priority: mysqlEnum(['critical','high','medium','low']).notNull(),
	status: mysqlEnum(['sent','delivered','failed','clicked']).notNull(),
	errorMessage: text("error_message"),
	sentAt: bigint("sent_at", { mode: "number" }).notNull(),
	deliveredAt: bigint("delivered_at", { mode: "number" }),
	clickedAt: bigint("clicked_at", { mode: "number" }),
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
},
(table) => [
	index("idx_push_history_user").on(table.userId),
	index("idx_push_history_escalation").on(table.escalationHistoryId),
	index("idx_push_history_status").on(table.status),
	index("idx_push_history_sent").on(table.sentAt),
]);


export const firebasePushSettings = mysqlTable("firebase_push_settings", {
	id: int().autoincrement().notNull(),
	userId: varchar("user_id", { length: 100 }).notNull(),
	enabled: tinyint().default(1).notNull(),
	iotAlerts: tinyint("iot_alerts").default(1).notNull(),
	spcAlerts: tinyint("spc_alerts").default(1).notNull(),
	cpkAlerts: tinyint("cpk_alerts").default(1).notNull(),
	escalationAlerts: tinyint("escalation_alerts").default(1).notNull(),
	systemAlerts: tinyint("system_alerts").default(1).notNull(),
	criticalOnly: tinyint("critical_only").default(0).notNull(),
	quietHoursEnabled: tinyint("quiet_hours_enabled").default(0).notNull(),
	quietHoursStart: varchar("quiet_hours_start", { length: 10 }),
	quietHoursEnd: varchar("quiet_hours_end", { length: 10 }),
	productionLineIds: text("production_line_ids"),
	machineIds: text("machine_ids"),
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
	updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
},
(table) => [
	index("idx_push_settings_user").on(table.userId),
]);


export const firebaseTopicSubscriptions = mysqlTable("firebase_topic_subscriptions", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull(),
	topicId: int("topic_id").notNull(),
	deviceTokenId: int("device_token_id").notNull(),
	subscribedAt: bigint("subscribed_at", { mode: "number" }).notNull(),
	unsubscribedAt: bigint("unsubscribed_at", { mode: "number" }),
	isActive: tinyint("is_active").default(1).notNull(),
},
(table) => [
	index("idx_subscription_user").on(table.userId),
	index("idx_subscription_topic").on(table.topicId),
	index("idx_subscription_active").on(table.isActive),
]);


export const firebaseTopics = mysqlTable("firebase_topics", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	topicKey: varchar("topic_key", { length: 100 }).notNull(),
	alertType: varchar("alert_type", { length: 50 }),
	productionLineId: int("production_line_id"),
	isActive: tinyint("is_active").default(1).notNull(),
	subscriberCount: int("subscriber_count").default(0).notNull(),
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
	updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
},
(table) => [
	index("idx_topic_key").on(table.topicKey),
	index("idx_topic_active").on(table.isActive),
]);

