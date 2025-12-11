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


/**
 * Products - bảng sản phẩm
 */
export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }),
  unit: varchar("unit", { length: 50 }).default("pcs"),
  isActive: int("isActive").notNull().default(1),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

/**
 * Product Specifications - tiêu chuẩn USL/LSL cho từng mã sản phẩm và công trạm
 */
export const productSpecifications = mysqlTable("product_specifications", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  workstationId: int("workstationId"),
  parameterName: varchar("parameterName", { length: 255 }).notNull(),
  usl: int("usl").notNull(), // Upper Specification Limit * 10000 (for precision)
  lsl: int("lsl").notNull(), // Lower Specification Limit * 10000
  target: int("target"), // Target value * 10000
  unit: varchar("unit", { length: 50 }),
  description: text("description"),
  isActive: int("isActive").notNull().default(1),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProductSpecification = typeof productSpecifications.$inferSelect;
export type InsertProductSpecification = typeof productSpecifications.$inferInsert;

/**
 * Production Line Products - cấu hình dây chuyền - sản phẩm
 */
export const productionLineProducts = mysqlTable("production_line_products", {
  id: int("id").autoincrement().primaryKey(),
  productionLineId: int("productionLineId").notNull(),
  productId: int("productId").notNull(),
  isDefault: int("isDefault").notNull().default(0),
  cycleTime: int("cycleTime"), // in seconds
  targetOutput: int("targetOutput"), // per hour
  isActive: int("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProductionLineProduct = typeof productionLineProducts.$inferSelect;
export type InsertProductionLineProduct = typeof productionLineProducts.$inferInsert;

/**
 * Process Configurations - cấu hình quy trình sản xuất
 */
export const processConfigs = mysqlTable("process_configs", {
  id: int("id").autoincrement().primaryKey(),
  productionLineId: int("productionLineId").notNull(),
  productId: int("productId").notNull(),
  workstationId: int("workstationId").notNull(),
  processName: varchar("processName", { length: 255 }).notNull(),
  processOrder: int("processOrder").notNull().default(0),
  standardTime: int("standardTime"), // in seconds
  description: text("description"),
  isActive: int("isActive").notNull().default(1),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProcessConfig = typeof processConfigs.$inferSelect;
export type InsertProcessConfig = typeof processConfigs.$inferInsert;


/**
 * SPC Sampling Plans - kế hoạch lấy mẫu SPC
 */
export const spcSamplingPlans = mysqlTable("spc_sampling_plans", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  productionLineId: int("productionLineId").notNull(),
  productId: int("productId"),
  workstationId: int("workstationId"),
  samplingConfigId: int("samplingConfigId").notNull(),
  specificationId: int("specificationId"),
  // Mapping to external database
  mappingId: int("mappingId"),
  // Schedule
  startTime: timestamp("startTime"),
  endTime: timestamp("endTime"),
  isRecurring: int("isRecurring").notNull().default(1),
  // Status
  status: mysqlEnum("status", ["draft", "active", "paused", "completed"]).notNull().default("draft"),
  lastRunAt: timestamp("lastRunAt"),
  nextRunAt: timestamp("nextRunAt"),
  // Notification settings
  notifyOnViolation: int("notifyOnViolation").notNull().default(1),
  notifyEmail: varchar("notifyEmail", { length: 320 }),
  // Metadata
  isActive: int("isActive").notNull().default(1),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SpcSamplingPlan = typeof spcSamplingPlans.$inferSelect;
export type InsertSpcSamplingPlan = typeof spcSamplingPlans.$inferInsert;

/**
 * User Line Assignments - gán dây chuyền cho user để hiển thị trên dashboard
 */
export const userLineAssignments = mysqlTable("user_line_assignments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  productionLineId: int("productionLineId").notNull(),
  displayOrder: int("displayOrder").notNull().default(0),
  isVisible: int("isVisible").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserLineAssignment = typeof userLineAssignments.$inferSelect;
export type InsertUserLineAssignment = typeof userLineAssignments.$inferInsert;

/**
 * SPC Plan Execution Logs - lịch sử chạy kế hoạch SPC
 */
export const spcPlanExecutionLogs = mysqlTable("spc_plan_execution_logs", {
  id: int("id").autoincrement().primaryKey(),
  planId: int("planId").notNull(),
  executedAt: timestamp("executedAt").defaultNow().notNull(),
  status: mysqlEnum("status", ["success", "failed", "partial"]).notNull(),
  sampleCount: int("sampleCount").notNull().default(0),
  violationCount: int("violationCount").notNull().default(0),
  cpkValue: int("cpkValue"), // * 100
  meanValue: int("meanValue"), // * 10000
  stdDevValue: int("stdDevValue"), // * 10000
  errorMessage: text("errorMessage"),
  notificationSent: int("notificationSent").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SpcPlanExecutionLog = typeof spcPlanExecutionLogs.$inferSelect;
export type InsertSpcPlanExecutionLog = typeof spcPlanExecutionLogs.$inferInsert;

/**
 * Email Notification Settings - cấu hình thông báo email
 */
export const emailNotificationSettings = mysqlTable("email_notification_settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  notifyOnSpcViolation: int("notifyOnSpcViolation").notNull().default(1),
  notifyOnCaViolation: int("notifyOnCaViolation").notNull().default(1),
  notifyOnCpkViolation: int("notifyOnCpkViolation").notNull().default(1),
  cpkThreshold: int("cpkThreshold").notNull().default(133), // * 100, default 1.33
  notifyFrequency: mysqlEnum("notifyFrequency", ["immediate", "hourly", "daily"]).notNull().default("immediate"),
  isActive: int("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EmailNotificationSetting = typeof emailNotificationSettings.$inferSelect;
export type InsertEmailNotificationSetting = typeof emailNotificationSettings.$inferInsert;


/**
 * SPC Realtime Data - dữ liệu SPC realtime cho dashboard
 */
export const spcRealtimeData = mysqlTable("spc_realtime_data", {
  id: int("id").autoincrement().primaryKey(),
  planId: int("planId").notNull(),
  productionLineId: int("productionLineId").notNull(),
  mappingId: int("mappingId"),
  // Sample data
  sampleIndex: int("sampleIndex").notNull(),
  sampleValue: int("sampleValue").notNull(), // * 10000
  subgroupIndex: int("subgroupIndex").notNull(),
  subgroupMean: int("subgroupMean"), // * 10000
  subgroupRange: int("subgroupRange"), // * 10000
  // Control limits at time of sampling
  ucl: int("ucl"), // * 10000
  lcl: int("lcl"), // * 10000
  usl: int("usl"), // * 10000
  lsl: int("lsl"), // * 10000
  centerLine: int("centerLine"), // * 10000
  // Violation status
  isOutOfSpec: int("isOutOfSpec").notNull().default(0), // Outside USL/LSL
  isOutOfControl: int("isOutOfControl").notNull().default(0), // Outside UCL/LCL
  violatedRules: varchar("violatedRules", { length: 100 }), // Comma-separated rule numbers
  // Timestamps
  sampledAt: timestamp("sampledAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SpcRealtimeData = typeof spcRealtimeData.$inferSelect;
export type InsertSpcRealtimeData = typeof spcRealtimeData.$inferInsert;

/**
 * SPC Summary Statistics - thống kê tổng hợp SPC theo ca/ngày/tuần
 */
export const spcSummaryStats = mysqlTable("spc_summary_stats", {
  id: int("id").autoincrement().primaryKey(),
  planId: int("planId").notNull(),
  productionLineId: int("productionLineId").notNull(),
  mappingId: int("mappingId"),
  // Time period
  periodType: mysqlEnum("periodType", ["shift", "day", "week", "month"]).notNull(),
  periodStart: timestamp("periodStart").notNull(),
  periodEnd: timestamp("periodEnd").notNull(),
  // Statistics
  sampleCount: int("sampleCount").notNull().default(0),
  subgroupCount: int("subgroupCount").notNull().default(0),
  mean: int("mean"), // * 10000
  stdDev: int("stdDev"), // * 10000
  min: int("min"), // * 10000
  max: int("max"), // * 10000
  range: int("range"), // * 10000
  // Process capability
  cp: int("cp"), // * 1000
  cpk: int("cpk"), // * 1000
  pp: int("pp"), // * 1000 (Process Performance)
  ppk: int("ppk"), // * 1000 (Process Performance Index)
  ca: int("ca"), // * 1000 (Capability Accuracy)
  // Control limits
  xBarUcl: int("xBarUcl"), // * 10000
  xBarLcl: int("xBarLcl"), // * 10000
  rUcl: int("rUcl"), // * 10000
  rLcl: int("rLcl"), // * 10000
  // Violations
  outOfSpecCount: int("outOfSpecCount").notNull().default(0),
  outOfControlCount: int("outOfControlCount").notNull().default(0),
  rule1Violations: int("rule1Violations").notNull().default(0),
  rule2Violations: int("rule2Violations").notNull().default(0),
  rule3Violations: int("rule3Violations").notNull().default(0),
  rule4Violations: int("rule4Violations").notNull().default(0),
  rule5Violations: int("rule5Violations").notNull().default(0),
  rule6Violations: int("rule6Violations").notNull().default(0),
  rule7Violations: int("rule7Violations").notNull().default(0),
  rule8Violations: int("rule8Violations").notNull().default(0),
  // Status
  overallStatus: mysqlEnum("overallStatus", ["excellent", "good", "acceptable", "needs_improvement", "critical"]).notNull().default("good"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SpcSummaryStats = typeof spcSummaryStats.$inferSelect;
export type InsertSpcSummaryStats = typeof spcSummaryStats.$inferInsert;

/**
 * Permissions - định nghĩa các quyền trong hệ thống
 */
export const permissions = mysqlTable("permissions", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  module: varchar("module", { length: 100 }).notNull(), // dashboard, analyze, settings, etc.
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Permission = typeof permissions.$inferSelect;
export type InsertPermission = typeof permissions.$inferInsert;

/**
 * Role Permissions - gán quyền cho vai trò
 */
export const rolePermissions = mysqlTable("role_permissions", {
  id: int("id").autoincrement().primaryKey(),
  role: mysqlEnum("role", ["user", "admin", "operator", "viewer"]).notNull(),
  permissionId: int("permissionId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RolePermission = typeof rolePermissions.$inferSelect;
export type InsertRolePermission = typeof rolePermissions.$inferInsert;

/**
 * User Permissions - gán quyền đặc biệt cho user (override role)
 */
export const userPermissions = mysqlTable("user_permissions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  permissionId: int("permissionId").notNull(),
  granted: int("granted").notNull().default(1), // 1 = granted, 0 = denied
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UserPermission = typeof userPermissions.$inferSelect;
export type InsertUserPermission = typeof userPermissions.$inferInsert;

/**
 * SMTP Configuration - cấu hình server email
 */
export const smtpConfig = mysqlTable("smtp_config", {
  id: int("id").autoincrement().primaryKey(),
  host: varchar("host", { length: 255 }).notNull(),
  port: int("port").notNull().default(587),
  secure: int("secure").notNull().default(0), // 0 = false, 1 = true (TLS)
  username: varchar("username", { length: 255 }).notNull(),
  password: varchar("password", { length: 255 }).notNull(),
  fromEmail: varchar("fromEmail", { length: 320 }).notNull(),
  fromName: varchar("fromName", { length: 255 }).notNull().default("SPC/CPK Calculator"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SmtpConfig = typeof smtpConfig.$inferSelect;
export type InsertSmtpConfig = typeof smtpConfig.$inferInsert;
