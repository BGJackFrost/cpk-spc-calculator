import { mysqlTable, mysqlSchema, AnyMySqlColumn, int, varchar, timestamp, index, json, decimal, text, mysqlEnum, datetime, bigint, tinyint, boolean, date } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"


// === DASHBOARD Domain Tables ===

export const dashboardConfigs = mysqlTable("dashboard_configs", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	name: varchar({ length: 255 }).default('Default Dashboard').notNull(),
	displayCount: int().default(4).notNull(),
	refreshInterval: int().default(30).notNull(),
	layout: mysqlEnum(['grid','list']).default('grid').notNull(),
	isDefault: int().default(0).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});


export const dashboardLineSelections = mysqlTable("dashboard_line_selections", {
	id: int().autoincrement().notNull(),
	dashboardConfigId: int().notNull(),
	productionLineId: int().notNull(),
	displayOrder: int().default(0).notNull(),
	showXbarChart: int().default(1).notNull(),
	showRchart: int().default(1).notNull(),
	showCpk: int().default(1).notNull(),
	showMean: int().default(1).notNull(),
	showUclLcl: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});


export const dashboardWidgetConfigs = mysqlTable("dashboard_widget_configs", {
	id: int().autoincrement().notNull().primaryKey(),
	userId: int("user_id").notNull(),
	widgetTemplateId: int("widget_template_id").notNull(),
	// Layout position (grid-based)
	gridX: int("grid_x").default(0).notNull(), // Column position
	gridY: int("grid_y").default(0).notNull(), // Row position
	gridWidth: int("grid_width").default(2).notNull(), // Width in grid units
	gridHeight: int("grid_height").default(2).notNull(), // Height in grid units
	// Widget-specific configuration
	config: json("config"), // Custom settings for this widget instance
	// Visibility
	isVisible: int("is_visible").default(1).notNull(),
	// Dashboard assignment (for multiple dashboards per user)
	dashboardId: int("dashboard_id"), // Optional: for multiple dashboards
	// Metadata
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_dashboard_widget_user").on(table.userId),
	index("idx_dashboard_widget_template").on(table.widgetTemplateId),
	index("idx_dashboard_widget_dashboard").on(table.dashboardId),
]);


export type DashboardWidgetConfig = typeof dashboardWidgetConfigs.$inferSelect;

export type InsertDashboardWidgetConfig = typeof dashboardWidgetConfigs.$inferInsert;

// User Dashboard Layouts - Lưu layout dashboard của user
