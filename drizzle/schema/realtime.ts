import { mysqlTable, mysqlSchema, AnyMySqlColumn, int, varchar, timestamp, index, json, decimal, text, mysqlEnum, datetime, bigint, tinyint, boolean, date } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"


// === REALTIME Domain Tables ===

export const realtimeAlerts = mysqlTable("realtime_alerts", {
	id: int().autoincrement().notNull(),
	connectionId: int().notNull(),
	machineId: int().notNull(),
	alertType: mysqlEnum(['out_of_spec','out_of_control','rule_violation','connection_lost']).notNull(),
	severity: mysqlEnum(['warning','critical']).notNull(),
	message: text(),
	ruleNumber: int(),
	value: int(),
	threshold: int(),
	acknowledgedAt: timestamp({ mode: 'string' }),
	acknowledgedBy: int(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_alerts_ack").on(table.acknowledgedAt),
	index("idx_alerts_created").on(table.createdAt),
]);


export const realtimeDataBuffer = mysqlTable("realtime_data_buffer", {
	id: int().autoincrement().notNull(),
	connectionId: int().notNull(),
	machineId: int().notNull(),
	measurementName: varchar({ length: 100 }).notNull(),
	value: int().notNull(),
	sampledAt: timestamp({ mode: 'string' }).notNull(),
	processedAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	subgroupIndex: int(),
	subgroupMean: int(),
	subgroupRange: int(),
	ucl: int(),
	lcl: int(),
	isOutOfSpec: int().default(0).notNull(),
	isOutOfControl: int().default(0).notNull(),
	violatedRules: varchar({ length: 50 }),
},
(table) => [
	index("idx_connection_time").on(table.connectionId, table.sampledAt),
	index("idx_machine_time").on(table.machineId, table.sampledAt),
]);


export const realtimeDataStreams = mysqlTable("realtime_data_streams", {
	id: int().autoincrement().notNull(),
	streamId: varchar("stream_id", { length: 64 }).notNull(),
	name: varchar({ length: 100 }).notNull(),
	streamType: mysqlEnum("stream_type", ['spc','oee','iot','system','security','ai']).notNull(),
	source: varchar({ length: 100 }).notNull(),
	interval: int().default(5000).notNull(),
	isActive: int("is_active").default(0).notNull(),
	lastDataAt: timestamp("last_data_at", { mode: 'string' }),
	subscriberCount: int("subscriber_count").default(0).notNull(),
	errorCount: int("error_count").default(0).notNull(),
	config: text(),
	metadata: text(),
	createdBy: int("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("realtime_data_streams_stream_id_unique").on(table.streamId),
]);


export const realtimeMachineConnections = mysqlTable("realtime_machine_connections", {
	id: int().autoincrement().notNull(),
	machineId: int().notNull(),
	connectionType: mysqlEnum(['database','opcua','api','file','mqtt']).notNull(),
	connectionConfig: text(),
	pollingIntervalMs: int().default(1000).notNull(),
	dataQuery: text(),
	measurementColumn: varchar({ length: 100 }),
	timestampColumn: varchar({ length: 100 }),
	lastDataAt: timestamp({ mode: 'string' }),
	lastError: text(),
	isActive: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

