import { mysqlTable, mysqlSchema, AnyMySqlColumn, int, varchar, timestamp, index, json, decimal, text, mysqlEnum, datetime, bigint, tinyint, boolean, date } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"


// === FLOOR-PLAN Domain Tables ===

export const floorPlanConfigs = mysqlTable("floor_plan_configs", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	productionLineId: int("production_line_id"),
	width: int().default(800).notNull(),
	height: int().default(600).notNull(),
	gridSize: int("grid_size").default(20).notNull(),
	backgroundColor: varchar("background_color", { length: 20 }).default('#f8fafc'),
	backgroundImage: varchar("background_image", { length: 500 }),
	machinePositions: json("machine_positions"),
	isActive: int("is_active").default(1).notNull(),
	createdBy: int("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});


export const floorPlanItems = mysqlTable("floor_plan_items", {
	id: int().autoincrement().notNull(),
	floorPlanId: int("floor_plan_id").notNull(),
	itemType: mysqlEnum("item_type", ['machine','workstation','conveyor','storage','wall','door','custom']).notNull(),
	name: varchar({ length: 100 }).notNull(),
	x: int().default(0).notNull(),
	y: int().default(0).notNull(),
	width: int().default(80).notNull(),
	height: int().default(60).notNull(),
	rotation: int().default(0).notNull(),
	color: varchar({ length: 20 }).default('#3b82f6'),
	machineId: int("machine_id"),
	metadata: json(),
	zIndex: int("z_index").default(1).notNull(),
	isLocked: int("is_locked").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_floor_plan").on(table.floorPlanId),
	index("idx_machine").on(table.machineId),
]);

