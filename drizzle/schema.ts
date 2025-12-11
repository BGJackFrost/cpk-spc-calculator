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


/**
 * Production Lines - dây chuyền sản xuất
 */
export const productionLines = mysqlTable("production_lines", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 100 }).notNull().unique(),
  description: text("description"),
  location: varchar("location", { length: 255 }),
  isActive: int("isActive").notNull().default(1),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProductionLine = typeof productionLines.$inferSelect;
export type InsertProductionLine = typeof productionLines.$inferInsert;

/**
 * Workstations - công trạm thuộc dây chuyền
 */
export const workstations = mysqlTable("workstations", {
  id: int("id").autoincrement().primaryKey(),
  productionLineId: int("productionLineId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 100 }).notNull(),
  description: text("description"),
  sequenceOrder: int("sequenceOrder").notNull().default(0),
  cycleTime: int("cycleTime"), // in seconds
  isActive: int("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Workstation = typeof workstations.$inferSelect;
export type InsertWorkstation = typeof workstations.$inferInsert;

/**
 * Machines - máy móc thuộc công trạm
 */
export const machines = mysqlTable("machines", {
  id: int("id").autoincrement().primaryKey(),
  workstationId: int("workstationId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 100 }).notNull(),
  machineType: varchar("machineType", { length: 100 }),
  manufacturer: varchar("manufacturer", { length: 255 }),
  model: varchar("model", { length: 255 }),
  serialNumber: varchar("serialNumber", { length: 255 }),
  installDate: timestamp("installDate"),
  status: mysqlEnum("status", ["active", "maintenance", "inactive"]).default("active").notNull(),
  isActive: int("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Machine = typeof machines.$inferSelect;
export type InsertMachine = typeof machines.$inferInsert;

/**
 * SPC Rules Configuration - cấu hình các quy tắc kiểm tra SPC
 */
export const spcRulesConfig = mysqlTable("spc_rules_config", {
  id: int("id").autoincrement().primaryKey(),
  mappingId: int("mappingId"),
  // 8 Western Electric Rules
  rule1Enabled: int("rule1Enabled").notNull().default(1), // Point beyond 3σ
  rule2Enabled: int("rule2Enabled").notNull().default(1), // 9 points same side of center
  rule3Enabled: int("rule3Enabled").notNull().default(1), // 6 points trending up/down
  rule4Enabled: int("rule4Enabled").notNull().default(1), // 14 points alternating
  rule5Enabled: int("rule5Enabled").notNull().default(1), // 2 of 3 points beyond 2σ
  rule6Enabled: int("rule6Enabled").notNull().default(1), // 4 of 5 points beyond 1σ
  rule7Enabled: int("rule7Enabled").notNull().default(1), // 15 points within 1σ
  rule8Enabled: int("rule8Enabled").notNull().default(1), // 8 points beyond 1σ both sides
  // CA Rules
  caRulesEnabled: int("caRulesEnabled").notNull().default(1),
  caThreshold: int("caThreshold").notNull().default(100), // CA threshold * 100
  // CPK Rules
  cpkExcellent: int("cpkExcellent").notNull().default(167), // >= 1.67
  cpkGood: int("cpkGood").notNull().default(133), // >= 1.33
  cpkAcceptable: int("cpkAcceptable").notNull().default(100), // >= 1.00
  isActive: int("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SpcRulesConfig = typeof spcRulesConfig.$inferSelect;
export type InsertSpcRulesConfig = typeof spcRulesConfig.$inferInsert;

/**
 * Sampling Configuration - cấu hình phương thức lấy mẫu
 */
export const samplingConfigs = mysqlTable("sampling_configs", {
  id: int("id").autoincrement().primaryKey(),
  mappingId: int("mappingId"),
  name: varchar("name", { length: 255 }).notNull(),
  // Time unit: year, month, week, day, hour, minute, second
  timeUnit: mysqlEnum("timeUnit", ["year", "month", "week", "day", "hour", "minute", "second"]).notNull().default("hour"),
  // Sampling frequency
  sampleSize: int("sampleSize").notNull().default(5), // Number of samples per subgroup
  subgroupSize: int("subgroupSize").notNull().default(5), // Number of measurements per subgroup
  intervalValue: int("intervalValue").notNull().default(30), // Interval value
  intervalUnit: mysqlEnum("intervalUnit", ["year", "month", "week", "day", "hour", "minute", "second"]).notNull().default("minute"),
  // Auto sampling
  autoSampling: int("autoSampling").notNull().default(0),
  isActive: int("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SamplingConfig = typeof samplingConfigs.$inferSelect;
export type InsertSamplingConfig = typeof samplingConfigs.$inferInsert;

/**
 * Dashboard Configuration - cấu hình dashboard realtime
 */
export const dashboardConfigs = mysqlTable("dashboard_configs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull().default("Default Dashboard"),
  displayCount: int("displayCount").notNull().default(4), // Number of production lines to display
  refreshInterval: int("refreshInterval").notNull().default(30), // Refresh interval in seconds
  layout: mysqlEnum("layout", ["grid", "list"]).notNull().default("grid"),
  isDefault: int("isDefault").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DashboardConfig = typeof dashboardConfigs.$inferSelect;
export type InsertDashboardConfig = typeof dashboardConfigs.$inferInsert;

/**
 * Dashboard Production Line Selection - dây chuyền được chọn hiển thị trên dashboard
 */
export const dashboardLineSelections = mysqlTable("dashboard_line_selections", {
  id: int("id").autoincrement().primaryKey(),
  dashboardConfigId: int("dashboardConfigId").notNull(),
  productionLineId: int("productionLineId").notNull(),
  displayOrder: int("displayOrder").notNull().default(0),
  showXbarChart: int("showXbarChart").notNull().default(1),
  showRChart: int("showRChart").notNull().default(1),
  showCpk: int("showCpk").notNull().default(1),
  showMean: int("showMean").notNull().default(1),
  showUclLcl: int("showUclLcl").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DashboardLineSelection = typeof dashboardLineSelections.$inferSelect;
export type InsertDashboardLineSelection = typeof dashboardLineSelections.$inferInsert;

/**
 * SPC Rule Violations - lưu các vi phạm quy tắc SPC
 */
export const spcRuleViolations = mysqlTable("spc_rule_violations", {
  id: int("id").autoincrement().primaryKey(),
  analysisId: int("analysisId").notNull(),
  ruleNumber: int("ruleNumber").notNull(), // 1-8 for Western Electric, 9 for CA, 10 for CPK
  ruleName: varchar("ruleName", { length: 255 }).notNull(),
  violationDescription: text("violationDescription"),
  dataPointIndex: int("dataPointIndex"),
  dataPointValue: int("dataPointValue"),
  severity: mysqlEnum("severity", ["warning", "critical"]).notNull().default("warning"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SpcRuleViolation = typeof spcRuleViolations.$inferSelect;
export type InsertSpcRuleViolation = typeof spcRuleViolations.$inferInsert;
