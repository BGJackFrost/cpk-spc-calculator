import { mysqlTable, mysqlSchema, AnyMySqlColumn, int, varchar, timestamp, index, json, decimal, text, mysqlEnum, datetime, bigint, tinyint, boolean, date } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"


// === PROCESS Domain Tables ===

export const processConfigs = mysqlTable("process_configs", {
	id: int().autoincrement().notNull(),
	productionLineId: int().notNull(),
	productId: int().notNull(),
	workstationId: int().notNull(),
	processName: varchar({ length: 255 }).notNull(),
	processOrder: int().default(0).notNull(),
	standardTime: int(),
	description: text(),
	isActive: int().default(1).notNull(),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});


export const processStepMachines = mysqlTable("process_step_machines", {
	id: int().autoincrement().notNull(),
	processStepId: int().notNull(),
	machineTypeId: int(),
	machineName: varchar({ length: 255 }).notNull(),
	machineCode: varchar({ length: 100 }),
	isRequired: int().default(1).notNull(),
	quantity: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});


export const processSteps = mysqlTable("process_steps", {
	id: int().autoincrement().notNull(),
	processTemplateId: int().notNull(),
	name: varchar({ length: 255 }).notNull(),
	code: varchar({ length: 100 }).notNull(),
	description: text(),
	sequenceOrder: int().default(1).notNull(),
	standardTime: int(),
	workstationTypeId: int(),
	isRequired: int().default(1).notNull(),
	isActive: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});


export const processTemplates = mysqlTable("process_templates", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	code: varchar({ length: 100 }).notNull(),
	description: text(),
	version: varchar({ length: 50 }).default('1.0'),
	isActive: int().default(1).notNull(),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	imageUrl: varchar({ length: 500 }),
},
(table) => [
	index("process_templates_code_unique").on(table.code),
]);

