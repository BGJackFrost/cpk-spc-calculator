import { mysqlTable, mysqlSchema, AnyMySqlColumn, int, varchar, timestamp, index, json, decimal, text, mysqlEnum, datetime, bigint, tinyint, boolean, date } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"


// === ERP Domain Tables ===

export const erpIntegrationConfigs = mysqlTable("erp_integration_configs", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 100 }).notNull(),
	erpType: mysqlEnum("erp_type", ['sap','oracle','dynamics','custom']).notNull(),
	connectionUrl: varchar("connection_url", { length: 500 }).notNull(),
	authType: mysqlEnum("auth_type", ['basic','oauth2','api_key','certificate']).notNull(),
	credentials: text(),
	syncDirection: mysqlEnum("sync_direction", ['inbound','outbound','bidirectional']).notNull(),
	syncEntities: text("sync_entities"),
	syncSchedule: varchar("sync_schedule", { length: 50 }),
	lastSyncAt: timestamp("last_sync_at", { mode: 'string' }),
	lastSyncStatus: varchar("last_sync_status", { length: 50 }),
	isActive: int("is_active").default(1).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	syncInterval: int("sync_interval").default(3600),
	mappingConfig: text("mapping_config"),
});

