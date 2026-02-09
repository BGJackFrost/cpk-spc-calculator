import { mysqlTable, mysqlSchema, AnyMySqlColumn, int, varchar, timestamp, index, json, decimal, text, mysqlEnum, datetime, bigint, tinyint, boolean, date } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"


// === PRODUCT Domain Tables ===

export const productSpecifications = mysqlTable("product_specifications", {
	id: int().autoincrement().notNull(),
	productId: int().notNull(),
	workstationId: int(),
	parameterName: varchar({ length: 255 }).notNull(),
	usl: int().notNull(),
	lsl: int().notNull(),
	target: int(),
	unit: varchar({ length: 50 }),
	description: text(),
	isActive: int().default(1).notNull(),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_product_specifications_workstation").on(table.workstationId),
]);


export const productStationMachineStandards = mysqlTable("product_station_machine_standards", {
	id: int().autoincrement().notNull(),
	productId: int().notNull(),
	workstationId: int().notNull(),
	machineId: int(),
	measurementName: varchar({ length: 255 }).notNull(),
	usl: int(),
	lsl: int(),
	target: int(),
	unit: varchar({ length: 50 }).default('mm'),
	sampleSize: int().default(5).notNull(),
	sampleFrequency: int().default(60).notNull(),
	samplingMethod: varchar({ length: 100 }).default('random'),
	appliedSpcRules: text(),
	cpkWarningThreshold: int().default(133),
	cpkCriticalThreshold: int().default(100),
	notes: text(),
	isActive: int().default(1).notNull(),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	appliedCpkRules: text(),
	appliedCaRules: text(),
});


export const productStationMappings = mysqlTable("product_station_mappings", {
	id: int().autoincrement().notNull(),
	productCode: varchar({ length: 100 }).notNull(),
	stationName: varchar({ length: 100 }).notNull(),
	connectionId: int().notNull(),
	tableName: varchar({ length: 255 }).notNull(),
	productCodeColumn: varchar({ length: 100 }).default('product_code').notNull(),
	stationColumn: varchar({ length: 100 }).default('station').notNull(),
	valueColumn: varchar({ length: 100 }).default('value').notNull(),
	timestampColumn: varchar({ length: 100 }).default('timestamp').notNull(),
	usl: int(),
	lsl: int(),
	target: int(),
	isActive: int().default(1).notNull(),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	filterConditions: text(),
},
(table) => [
	index("idx_product_station_mappings_station").on(table.stationName),
	index("idx_product_station_mappings_active").on(table.isActive),
]);


export const products = mysqlTable("products", {
	id: int().autoincrement().notNull(),
	code: varchar({ length: 100 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	category: varchar({ length: 100 }),
	unit: varchar({ length: 50 }).default('pcs'),
	isActive: int().default(1).notNull(),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("products_code_unique").on(table.code),
	index("idx_products_code").on(table.code),
	index("idx_products_is_active").on(table.isActive),
	index("idx_products_active").on(table.isActive),
]);

