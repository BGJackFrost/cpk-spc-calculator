import { mysqlTable, mysqlSchema, AnyMySqlColumn, int, varchar, timestamp, index, json, decimal, text, mysqlEnum, datetime, bigint, tinyint, boolean, date } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"


// === CUSTOM Domain Tables ===

export const customThemes = mysqlTable("custom_themes", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: varchar({ length: 255 }),
	primaryColor: varchar("primary_color", { length: 50 }).notNull(),
	secondaryColor: varchar("secondary_color", { length: 50 }).notNull(),
	accentColor: varchar("accent_color", { length: 50 }).notNull(),
	backgroundColor: varchar("background_color", { length: 50 }).notNull(),
	foregroundColor: varchar("foreground_color", { length: 50 }).notNull(),
	mutedColor: varchar("muted_color", { length: 50 }),
	mutedForegroundColor: varchar("muted_foreground_color", { length: 50 }),
	lightVariables: text("light_variables"),
	darkVariables: text("dark_variables"),
	isPublic: int("is_public").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});


export const customValidationRules = mysqlTable("custom_validation_rules", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 200 }).notNull(),
	description: text(),
	productId: int(),
	workstationId: int(),
	ruleType: mysqlEnum(['range_check','trend_check','pattern_check','comparison_check','formula_check','custom_script']).default('range_check').notNull(),
	ruleConfig: text(),
	actionOnViolation: mysqlEnum(['warning','alert','reject','log_only']).default('warning').notNull(),
	severity: mysqlEnum(['low','medium','high','critical']).default('medium').notNull(),
	violationMessage: text(),
	isActive: int().default(1).notNull(),
	priority: int().default(100).notNull(),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});


export const customWidgets = mysqlTable("custom_widgets", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	widgetType: mysqlEnum("widget_type", ['sql_query', 'api_endpoint', 'chart', 'table', 'kpi_card', 'gauge', 'custom']).notNull(),
	// SQL Query config
	sqlQuery: text("sql_query"),
	// API Endpoint config
	apiEndpoint: varchar("api_endpoint", { length: 1000 }),
	apiMethod: mysqlEnum("api_method", ['GET', 'POST']).default('GET'),
	apiHeaders: json("api_headers"),
	apiBody: json("api_body"),
	// Display config
	width: int().default(1).notNull(),
	height: int().default(1).notNull(),
	position: int().default(0).notNull(),
	refreshInterval: int("refresh_interval").default(60).notNull(),
	chartType: mysqlEnum("chart_type", ['line', 'bar', 'pie', 'doughnut', 'area', 'scatter', 'radar']),
	chartConfig: json("chart_config"),
	// Access control
	userId: int("user_id").notNull(),
	isPublic: int("is_public").default(0).notNull(),
	// Metadata
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_custom_widgets_user").on(table.userId),
	index("idx_custom_widgets_type").on(table.widgetType),
	index("idx_custom_widgets_public").on(table.isPublic),
]);


export type CustomWidget = typeof customWidgets.$inferSelect;

export type InsertCustomWidget = typeof customWidgets.$inferInsert;

// ============================================
// Camera Configs - Cấu hình camera AVI/AOI
// ============================================
