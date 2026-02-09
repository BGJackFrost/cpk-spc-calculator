import { mysqlTable, mysqlSchema, AnyMySqlColumn, int, varchar, timestamp, index, json, decimal, text, mysqlEnum, datetime, bigint, tinyint, boolean, date } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"


// === MOBILE Domain Tables ===

export const mobileDevices = mysqlTable("mobile_devices", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull(),
	token: varchar({ length: 500 }).notNull(),
	platform: mysqlEnum(['ios','android']).notNull(),
	deviceName: varchar("device_name", { length: 255 }),
	deviceModel: varchar("device_model", { length: 255 }),
	isActive: int("is_active").default(1).notNull(),
	lastActiveAt: timestamp("last_active_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_mobile_devices_user").on(table.userId),
	index("idx_mobile_devices_token").on(table.token),
]);


export const mobileNotificationSettings = mysqlTable("mobile_notification_settings", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull(),
	enabled: int().default(1).notNull(),
	cpkAlerts: int("cpk_alerts").default(1).notNull(),
	spcAlerts: int("spc_alerts").default(1).notNull(),
	oeeAlerts: int("oee_alerts").default(1).notNull(),
	dailyReport: int("daily_report").default(0).notNull(),
	soundEnabled: int("sound_enabled").default(1).notNull(),
	vibrationEnabled: int("vibration_enabled").default(1).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_mobile_notification_user").on(table.userId),
]);

