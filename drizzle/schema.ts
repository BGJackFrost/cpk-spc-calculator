import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Database connections - stores external database connection strings
 */
export const databaseConnections = mysqlTable("database_connections", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  connectionString: text("connectionString").notNull(),
  databaseType: varchar("databaseType", { length: 50 }).notNull().default("mysql"),
  description: text("description"),
  isActive: int("isActive").notNull().default(1),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DatabaseConnection = typeof databaseConnections.$inferSelect;
export type InsertDatabaseConnection = typeof databaseConnections.$inferInsert;

/**
 * Product-Station Mapping - maps product codes and stations to specific database tables
 */
export const productStationMappings = mysqlTable("product_station_mappings", {
  id: int("id").autoincrement().primaryKey(),
  productCode: varchar("productCode", { length: 100 }).notNull(),
  stationName: varchar("stationName", { length: 100 }).notNull(),
  connectionId: int("connectionId").notNull(),
  tableName: varchar("tableName", { length: 255 }).notNull(),
  productCodeColumn: varchar("productCodeColumn", { length: 100 }).notNull().default("product_code"),
  stationColumn: varchar("stationColumn", { length: 100 }).notNull().default("station"),
  valueColumn: varchar("valueColumn", { length: 100 }).notNull().default("value"),
  timestampColumn: varchar("timestampColumn", { length: 100 }).notNull().default("timestamp"),
  usl: int("usl"),
  lsl: int("lsl"),
  target: int("target"),
  isActive: int("isActive").notNull().default(1),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProductStationMapping = typeof productStationMappings.$inferSelect;
export type InsertProductStationMapping = typeof productStationMappings.$inferInsert;

/**
 * SPC Analysis History - stores historical SPC/CPK analysis results
 */
export const spcAnalysisHistory = mysqlTable("spc_analysis_history", {
  id: int("id").autoincrement().primaryKey(),
  mappingId: int("mappingId").notNull(),
  productCode: varchar("productCode", { length: 100 }).notNull(),
  stationName: varchar("stationName", { length: 100 }).notNull(),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  sampleCount: int("sampleCount").notNull(),
  mean: int("mean").notNull(),
  stdDev: int("stdDev").notNull(),
  cp: int("cp"),
  cpk: int("cpk"),
  ucl: int("ucl"),
  lcl: int("lcl"),
  usl: int("usl"),
  lsl: int("lsl"),
  alertTriggered: int("alertTriggered").notNull().default(0),
  llmAnalysis: text("llmAnalysis"),
  analyzedBy: int("analyzedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SpcAnalysisHistory = typeof spcAnalysisHistory.$inferSelect;
export type InsertSpcAnalysisHistory = typeof spcAnalysisHistory.$inferInsert;

/**
 * Alert Settings - configures CPK thresholds for notifications
 */
export const alertSettings = mysqlTable("alert_settings", {
  id: int("id").autoincrement().primaryKey(),
  mappingId: int("mappingId"),
  cpkWarningThreshold: int("cpkWarningThreshold").notNull().default(133),
  cpkCriticalThreshold: int("cpkCriticalThreshold").notNull().default(100),
  notifyOwner: int("notifyOwner").notNull().default(1),
  isActive: int("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AlertSetting = typeof alertSettings.$inferSelect;
export type InsertAlertSetting = typeof alertSettings.$inferInsert;
