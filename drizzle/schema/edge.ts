import { mysqlTable, mysqlSchema, AnyMySqlColumn, int, varchar, timestamp, index, json, decimal, text, mysqlEnum, datetime, bigint, tinyint, boolean, date } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"


// === EDGE Domain Tables ===

export const edgeGateways = mysqlTable("edge_gateways", {
	id: int().autoincrement().notNull().primaryKey(),
	gatewayCode: varchar("gateway_code", { length: 50 }).notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	location: varchar({ length: 255 }),
	productionLineId: int("production_line_id"),
	ipAddress: varchar("ip_address", { length: 45 }),
	macAddress: varchar("mac_address", { length: 17 }),
	status: mysqlEnum(['online', 'offline', 'syncing', 'error', 'maintenance']).default('offline').notNull(),
	lastHeartbeat: bigint("last_heartbeat", { mode: 'number' }),
	lastSyncAt: bigint("last_sync_at", { mode: 'number' }),
	bufferCapacity: int("buffer_capacity").default(10000),
	currentBufferSize: int("current_buffer_size").default(0),
	syncInterval: int("sync_interval").default(60),
	cpuUsage: decimal("cpu_usage", { precision: 5, scale: 2 }),
	memoryUsage: decimal("memory_usage", { precision: 5, scale: 2 }),
	diskUsage: decimal("disk_usage", { precision: 5, scale: 2 }),
	firmwareVersion: varchar("firmware_version", { length: 50 }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow(),
},
(table) => [
	index("idx_gateway_code").on(table.gatewayCode),
	index("idx_gateway_status").on(table.status),
	index("idx_gateway_line").on(table.productionLineId),
]);

// Edge Devices connected to Gateway

export const edgeDevices = mysqlTable("edge_devices", {
	id: int().autoincrement().notNull().primaryKey(),
	gatewayId: int("gateway_id").notNull(),
	deviceCode: varchar("device_code", { length: 50 }).notNull(),
	name: varchar({ length: 100 }).notNull(),
	deviceType: mysqlEnum("device_type", ['sensor', 'plc', 'actuator', 'meter', 'camera']).notNull(),
	protocol: mysqlEnum(['modbus_tcp', 'modbus_rtu', 'opcua', 'mqtt', 'http', 'serial']).default('modbus_tcp'),
	address: varchar({ length: 255 }),
	pollingInterval: int("polling_interval").default(1000),
	dataType: mysqlEnum("data_type", ['int16', 'int32', 'float32', 'float64', 'bool', 'string']).default('float32'),
	scaleFactor: decimal("scale_factor", { precision: 10, scale: 4 }).default('1.0000'),
	offset: decimal({ precision: 10, scale: 4 }).default('0.0000'),
	unit: varchar({ length: 20 }),
	status: mysqlEnum(['active', 'inactive', 'error', 'disconnected']).default('inactive'),
	lastValue: decimal("last_value", { precision: 15, scale: 6 }),
	lastReadAt: bigint("last_read_at", { mode: 'number' }),
	errorCount: int("error_count").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow(),
},
(table) => [
	index("idx_device_gateway").on(table.gatewayId),
	index("idx_device_code").on(table.deviceCode),
	index("idx_device_status").on(table.status),
]);

// Edge Data Buffer for offline storage

export const edgeDataBuffer = mysqlTable("edge_data_buffer", {
	id: int().autoincrement().notNull().primaryKey(),
	gatewayId: int("gateway_id").notNull(),
	deviceId: int("device_id").notNull(),
	value: decimal({ precision: 15, scale: 6 }).notNull(),
	rawValue: varchar("raw_value", { length: 100 }),
	quality: mysqlEnum(['good', 'uncertain', 'bad']).default('good'),
	capturedAt: bigint("captured_at", { mode: 'number' }).notNull(),
	syncedAt: bigint("synced_at", { mode: 'number' }),
	syncStatus: mysqlEnum("sync_status", ['pending', 'synced', 'failed']).default('pending'),
},
(table) => [
	index("idx_buffer_gateway").on(table.gatewayId),
	index("idx_buffer_device").on(table.deviceId),
	index("idx_buffer_sync_status").on(table.syncStatus),
	index("idx_buffer_captured").on(table.capturedAt),
]);

// Edge Sync Logs

export const edgeSyncLogs = mysqlTable("edge_sync_logs", {
	id: int().autoincrement().notNull().primaryKey(),
	gatewayId: int("gateway_id").notNull(),
	syncType: mysqlEnum("sync_type", ['full', 'incremental', 'manual']).default('incremental'),
	startedAt: bigint("started_at", { mode: 'number' }).notNull(),
	completedAt: bigint("completed_at", { mode: 'number' }),
	recordsSynced: int("records_synced").default(0),
	recordsFailed: int("records_failed").default(0),
	latencyMs: int("latency_ms"),
	status: mysqlEnum(['running', 'completed', 'failed', 'partial']).default('running'),
	errorMessage: text("error_message"),
},
(table) => [
	index("idx_sync_gateway").on(table.gatewayId),
	index("idx_sync_started").on(table.startedAt),
]);

// Time-Series Data Storage
