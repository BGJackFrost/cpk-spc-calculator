import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, json, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  avatar: varchar("avatar", { length: 500 }), // URL ảnh đại diện
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "manager", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Local users for offline authentication
 */
export const localUsers = mysqlTable("local_users", {
  id: int("id").autoincrement().primaryKey(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  avatar: varchar("avatar", { length: 500 }), // URL ảnh đại diện
  role: mysqlEnum("role", ["user", "manager", "admin"]).default("user").notNull(),
  isActive: int("isActive").notNull().default(1),
  mustChangePassword: int("mustChangePassword").notNull().default(1), // Force password change on first login
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn"),
});

export type LocalUser = typeof localUsers.$inferSelect;
export type InsertLocalUser = typeof localUsers.$inferInsert;

/**
 * Login history - tracks user login/logout events for audit
 */
export const loginHistory = mysqlTable("login_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  username: varchar("username", { length: 100 }).notNull(),
  authType: mysqlEnum("authType", ["local", "manus"]).notNull().default("local"),
  eventType: mysqlEnum("eventType", ["login", "logout", "login_failed"]).notNull(),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LoginHistory = typeof loginHistory.$inferSelect;
export type InsertLoginHistory = typeof loginHistory.$inferInsert;

/**
 * Companies - Công ty
 */
export const companies = mysqlTable("companies", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address"),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 320 }),
  taxCode: varchar("taxCode", { length: 50 }),
  logo: varchar("logo", { length: 500 }),
  isActive: int("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Company = typeof companies.$inferSelect;
export type InsertCompany = typeof companies.$inferInsert;

/**
 * Departments - Phòng ban
 */
export const departments = mysqlTable("departments", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  code: varchar("code", { length: 50 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  parentId: int("parentId"), // Phòng ban cha (cho cấu trúc cây)
  managerId: int("managerId"), // Trưởng phòng
  isActive: int("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Department = typeof departments.$inferSelect;
export type InsertDepartment = typeof departments.$inferInsert;

/**
 * Teams - Nhóm/Tổ
 */
export const teams = mysqlTable("teams", {
  id: int("id").autoincrement().primaryKey(),
  departmentId: int("departmentId").notNull(),
  code: varchar("code", { length: 50 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  leaderId: int("leaderId"), // Trưởng nhóm
  isActive: int("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Team = typeof teams.$inferSelect;
export type InsertTeam = typeof teams.$inferInsert;

/**
 * Positions - Chức vụ
 */
export const positions = mysqlTable("positions", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  level: int("level").notNull().default(1), // Cấp bậc (1-10, 1 là cao nhất)
  canApprove: int("canApprove").notNull().default(0), // Có quyền phê duyệt
  approvalLimit: decimal("approvalLimit", { precision: 15, scale: 2 }), // Hạn mức phê duyệt (VND)
  isActive: int("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Position = typeof positions.$inferSelect;
export type InsertPosition = typeof positions.$inferInsert;

/**
 * Employee Profiles - Thông tin nhân viên mở rộng
 */
export const employeeProfiles = mysqlTable("employee_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(), // Liên kết với users hoặc localUsers
  userType: mysqlEnum("userType", ["manus", "local"]).notNull().default("local"),
  employeeCode: varchar("employeeCode", { length: 50 }).unique(),
  companyId: int("companyId"),
  departmentId: int("departmentId"),
  teamId: int("teamId"),
  positionId: int("positionId"),
  managerId: int("managerId"), // Quản lý trực tiếp
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  dateOfBirth: timestamp("dateOfBirth"),
  joinDate: timestamp("joinDate"),
  isActive: int("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EmployeeProfile = typeof employeeProfiles.$inferSelect;
export type InsertEmployeeProfile = typeof employeeProfiles.$inferInsert;

/**
 * Approval Workflows - Quy trình phê duyệt
 */
export const approvalWorkflows = mysqlTable("approval_workflows", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  entityType: mysqlEnum("entityType", ["purchase_order", "stock_export", "maintenance_request", "leave_request"]).notNull(),
  isActive: int("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ApprovalWorkflow = typeof approvalWorkflows.$inferSelect;
export type InsertApprovalWorkflow = typeof approvalWorkflows.$inferInsert;

/**
 * Approval Steps - Các bước phê duyệt
 */
export const approvalSteps = mysqlTable("approval_steps", {
  id: int("id").autoincrement().primaryKey(),
  workflowId: int("workflowId").notNull(),
  stepOrder: int("stepOrder").notNull(), // Thứ tự bước
  name: varchar("name", { length: 255 }).notNull(),
  approverType: mysqlEnum("approverType", ["position", "user", "manager", "department_head"]).notNull(),
  approverId: int("approverId"), // ID của position hoặc user tùy theo approverType
  minAmount: decimal("minAmount", { precision: 15, scale: 2 }), // Giá trị tối thiểu cần bước này
  maxAmount: decimal("maxAmount", { precision: 15, scale: 2 }), // Giá trị tối đa cần bước này
  isRequired: int("isRequired").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ApprovalStep = typeof approvalSteps.$inferSelect;
export type InsertApprovalStep = typeof approvalSteps.$inferInsert;

/**
 * Approval Requests - Yêu cầu phê duyệt
 */
export const approvalRequests = mysqlTable("approval_requests", {
  id: int("id").autoincrement().primaryKey(),
  workflowId: int("workflowId").notNull(),
  entityType: mysqlEnum("entityType", ["purchase_order", "stock_export", "maintenance_request", "leave_request"]).notNull(),
  entityId: int("entityId").notNull(), // ID của đơn hàng, phiếu xuất, etc.
  requesterId: int("requesterId").notNull(), // Người yêu cầu
  currentStepId: int("currentStepId"), // Bước hiện tại
  status: mysqlEnum("status", ["pending", "approved", "rejected", "cancelled"]).notNull().default("pending"),
  totalAmount: decimal("totalAmount", { precision: 15, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ApprovalRequest = typeof approvalRequests.$inferSelect;
export type InsertApprovalRequest = typeof approvalRequests.$inferInsert;

/**
 * Approval Histories - Lịch sử phê duyệt
 */
export const approvalHistories = mysqlTable("approval_histories", {
  id: int("id").autoincrement().primaryKey(),
  requestId: int("requestId").notNull(),
  stepId: int("stepId").notNull(),
  approverId: int("approverId").notNull(),
  action: mysqlEnum("action", ["approved", "rejected", "returned"]).notNull(),
  comments: text("comments"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ApprovalHistory = typeof approvalHistories.$inferSelect;
export type InsertApprovalHistory = typeof approvalHistories.$inferInsert;

/**
 * System Modules - Lưu trữ các module trong hệ thống
 */
export const systemModules = mysqlTable("system_modules", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  systemType: mysqlEnum("systemType", ["mms", "spc", "system", "common"]).notNull().default("common"),
  parentId: int("parentId"), // Hỗ trợ cấu trúc cây module
  icon: varchar("icon", { length: 100 }),
  path: varchar("path", { length: 255 }), // Route path
  sortOrder: int("sortOrder").notNull().default(0),
  isActive: int("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SystemModule = typeof systemModules.$inferSelect;
export type InsertSystemModule = typeof systemModules.$inferInsert;

/**
 * Module Permissions - Các quyền của từng module
 */
export const modulePermissions = mysqlTable("module_permissions", {
  id: int("id").autoincrement().primaryKey(),
  moduleId: int("moduleId").notNull(),
  code: varchar("code", { length: 100 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  actionType: mysqlEnum("actionType", ["view", "create", "edit", "delete", "export", "import", "approve", "manage"]).notNull().default("view"),
  isActive: int("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ModulePermission = typeof modulePermissions.$inferSelect;
export type InsertModulePermission = typeof modulePermissions.$inferInsert;

/**
 * Role Module Permissions - Gán quyền cho vai trò theo module
 */
export const roleModulePermissions = mysqlTable("role_module_permissions", {
  id: int("id").autoincrement().primaryKey(),
  roleId: int("roleId").notNull(),
  permissionId: int("permissionId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RoleModulePermission = typeof roleModulePermissions.$inferSelect;
export type InsertRoleModulePermission = typeof roleModulePermissions.$inferInsert;

/**
 * Role templates - predefined permission sets for quick role assignment
 */
export const roleTemplates = mysqlTable("role_templates", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: mysqlEnum("category", ["production", "quality", "maintenance", "management", "system"]).notNull().default("production"),
  permissionIds: text("permissionIds").notNull(), // JSON array of permission IDs
  isDefault: int("isDefault").notNull().default(0), // Built-in templates
  isActive: int("isActive").notNull().default(1),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RoleTemplate = typeof roleTemplates.$inferSelect;
export type InsertRoleTemplate = typeof roleTemplates.$inferInsert;

/**
 * Database connections - stores external database connection strings
 * Supports multiple database types: mysql, sqlserver, oracle, postgres, access, excel
 */
export const databaseConnections = mysqlTable("database_connections", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  // Database type: mysql, sqlserver, oracle, postgres, access, excel
  databaseType: varchar("databaseType", { length: 50 }).notNull().default("mysql"),
  // Connection details (encrypted)
  host: varchar("host", { length: 255 }),
  port: int("port"),
  database: varchar("database", { length: 255 }),
  username: varchar("username", { length: 255 }),
  password: text("password"), // encrypted
  // For file-based databases (Access, Excel)
  filePath: text("filePath"),
  // Additional connection options as JSON
  connectionOptions: text("connectionOptions"),
  // Legacy connection string (encrypted, for backward compatibility)
  connectionString: text("connectionString"),
  description: text("description"),
  // Connection status
  lastTestedAt: timestamp("lastTestedAt"),
  lastTestStatus: varchar("lastTestStatus", { length: 50 }),
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
  filterConditions: text("filterConditions"), // JSON array of filter conditions
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
  imageUrl: varchar("imageUrl", { length: 500 }), // Ảnh dây chuyền
  // New fields for improved production line management
  productId: int("productId"), // Sản phẩm sản xuất trên dây chuyền
  processTemplateId: int("processTemplateId"), // Quy trình sản xuất
  supervisorId: int("supervisorId"), // Người phụ trách
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
  imageUrl: varchar("imageUrl", { length: 500 }), // Ảnh công trạm
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
  machineTypeId: int("machineTypeId"), // FK to machine_types
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 100 }).notNull(),
  machineType: varchar("machineType", { length: 100 }), // Legacy field, use machineTypeId instead
  manufacturer: varchar("manufacturer", { length: 255 }),
  model: varchar("model", { length: 255 }),
  serialNumber: varchar("serialNumber", { length: 255 }),
  imageUrl: varchar("imageUrl", { length: 500 }), // Ảnh máy
  installDate: timestamp("installDate"),
  status: mysqlEnum("status", ["active", "maintenance", "inactive"]).default("active").notNull(),
  isActive: int("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Machine = typeof machines.$inferSelect;
export type InsertMachine = typeof machines.$inferInsert;

/**
 * Machine BOM (Bill of Materials) - Danh sách phụ tùng cần thiết cho máy
 */
export const machineBom = mysqlTable("machine_bom", {
  id: int("id").autoincrement().primaryKey(),
  machineId: int("machineId").notNull(),
  sparePartId: int("sparePartId").notNull(),
  quantity: int("quantity").notNull().default(1), // Số lượng cần thiết
  isRequired: int("isRequired").notNull().default(1), // Bắt buộc hay tùy chọn
  replacementInterval: int("replacementInterval"), // Chu kỳ thay thế (ngày)
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MachineBom = typeof machineBom.$inferSelect;
export type InsertMachineBom = typeof machineBom.$inferInsert;

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
  // Fixture (optional - for fixture-specific SPC)
  machineId: int("machineId"),
  fixtureId: int("fixtureId"),
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
  // Rules configuration - JSON array of enabled rule IDs
  enabledSpcRules: text("enabledSpcRules"), // JSON array: [1,2,3,4,5,6,7,8]
  enabledCaRules: text("enabledCaRules"), // JSON array: [1,2,3,4]
  enabledCpkRules: text("enabledCpkRules"), // JSON array: [1,2,3,4,5]
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
 * system: SPC (SPC/CPK System) hoặc MMS (Maintenance Management System)
 * module: dashboard, analyze, settings, spare-parts, maintenance, etc.
 */
export const permissions = mysqlTable("permissions", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  system: mysqlEnum("system", ["SPC", "MMS", "COMMON"]).notNull().default("COMMON"), // Hệ thống: SPC, MMS, COMMON
  module: varchar("module", { length: 100 }).notNull(), // dashboard, analyze, settings, etc.
  parentId: int("parentId"), // Cho cây quyền
  sortOrder: int("sortOrder").default(0), // Thứ tự hiển thị
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

/**
 * Audit Logs - ghi lại các thao tác quan trọng trong hệ thống
 */
export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  userName: varchar("userName", { length: 255 }),
  action: mysqlEnum("action", ["create", "update", "delete", "login", "logout", "export", "analyze", "import", "backup", "restore", "config_change", "permission_change", "license_activate", "license_revoke", "api_access"]).notNull(),
  module: varchar("module", { length: 100 }).notNull(), // product, mapping, spc, etc.
  tableName: varchar("tableName", { length: 100 }),
  recordId: int("recordId"),
  oldValue: text("oldValue"), // JSON string
  newValue: text("newValue"), // JSON string
  description: text("description"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  authType: mysqlEnum("authType", ["local", "online"]).default("online"), // Loại xác thực: local hoặc online
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

/**
 * System Settings - cấu hình hệ thống
 */
export const systemSettings = mysqlTable("system_settings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value"),
  description: text("description"),
  updatedBy: int("updatedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = typeof systemSettings.$inferInsert;


/**
 * Process Templates - mẫu quy trình sản xuất
 */
export const processTemplates = mysqlTable("process_templates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 100 }).notNull().unique(),
  description: text("description"),
  imageUrl: varchar("imageUrl", { length: 500 }), // Ảnh quy trình
  version: varchar("version", { length: 50 }).default("1.0"),
  isActive: int("isActive").notNull().default(1),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProcessTemplate = typeof processTemplates.$inferSelect;
export type InsertProcessTemplate = typeof processTemplates.$inferInsert;

/**
 * Process Steps - công đoạn trong quy trình
 */
export const processSteps = mysqlTable("process_steps", {
  id: int("id").autoincrement().primaryKey(),
  processTemplateId: int("processTemplateId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 100 }).notNull(),
  description: text("description"),
  sequenceOrder: int("sequenceOrder").notNull().default(1), // Thứ tự công đoạn
  standardTime: int("standardTime"), // Thời gian tiêu chuẩn (giây)
  workstationTypeId: int("workstationTypeId"), // Loại công trạm cần thiết
  isRequired: int("isRequired").notNull().default(1), // Bắt buộc hay không
  isActive: int("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProcessStep = typeof processSteps.$inferSelect;
export type InsertProcessStep = typeof processSteps.$inferInsert;

/**
 * Process Step Machines - máy móc cho từng công đoạn
 */
export const processStepMachines = mysqlTable("process_step_machines", {
  id: int("id").autoincrement().primaryKey(),
  processStepId: int("processStepId").notNull(),
  machineTypeId: int("machineTypeId"), // Loại máy cần thiết
  machineName: varchar("machineName", { length: 255 }).notNull(),
  machineCode: varchar("machineCode", { length: 100 }),
  isRequired: int("isRequired").notNull().default(1),
  quantity: int("quantity").notNull().default(1), // Số lượng máy cần
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProcessStepMachine = typeof processStepMachines.$inferSelect;
export type InsertProcessStepMachine = typeof processStepMachines.$inferInsert;

/**
 * Production Line Machines - máy cụ thể được gán vào dây chuyền
 */
export const productionLineMachines = mysqlTable("production_line_machines", {
  id: int("id").autoincrement().primaryKey(),
  productionLineId: int("productionLineId").notNull(),
  machineId: int("machineId").notNull(), // Máy cụ thể từ bảng machines
  processStepId: int("processStepId"), // Công đoạn mà máy này thực hiện
  assignedAt: timestamp("assignedAt").defaultNow().notNull(),
  assignedBy: int("assignedBy").notNull(),
  isActive: int("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProductionLineMachine = typeof productionLineMachines.$inferSelect;
export type InsertProductionLineMachine = typeof productionLineMachines.$inferInsert;

/**
 * User Dashboard Config - cấu hình widget cho từng user
 */
export const userDashboardConfigs = mysqlTable("user_dashboard_configs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  widgetKey: varchar("widgetKey", { length: 100 }).notNull(), // e.g., "mapping_count", "recent_analysis", "cpk_alerts", "system_status"
  isVisible: int("isVisible").notNull().default(1),
  displayOrder: int("displayOrder").notNull().default(0),
  config: text("config"), // JSON config for widget-specific settings
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserDashboardConfig = typeof userDashboardConfigs.$inferSelect;
export type InsertUserDashboardConfig = typeof userDashboardConfigs.$inferInsert;

/**
 * SPC Defect Categories - Danh mục lỗi SPC
 */
export const spcDefectCategories = mysqlTable("spc_defect_categories", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 50 }).notNull(), // Mã lỗi: DEF001, DEF002...
  name: varchar("name", { length: 200 }).notNull(), // Tên lỗi
  description: text("description"), // Mô tả chi tiết
  category: varchar("category", { length: 100 }), // Nhóm lỗi: Machine, Material, Method, Man, Environment
  severity: varchar("severity", { length: 20 }).notNull().default("medium"), // low, medium, high, critical
  isActive: int("isActive").notNull().default(1),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SpcDefectCategory = typeof spcDefectCategories.$inferSelect;
export type InsertSpcDefectCategory = typeof spcDefectCategories.$inferInsert;

/**
 * SPC Defect Records - Ghi nhận lỗi SPC
 */
export const spcDefectRecords = mysqlTable("spc_defect_records", {
  id: int("id").autoincrement().primaryKey(),
  defectCategoryId: int("defectCategoryId").notNull(), // FK to spc_defect_categories
  productionLineId: int("productionLineId"), // Dây chuyền
  workstationId: int("workstationId"), // Công trạm
  productId: int("productId"), // Sản phẩm
  spcAnalysisId: int("spcAnalysisId"), // FK to spc_analysis_history (nếu phát hiện từ phân tích SPC)
  ruleViolated: varchar("ruleViolated", { length: 100 }), // Rule vi phạm: Rule1, Rule2... hoặc CPK, CA
  quantity: int("quantity").notNull().default(1), // Số lượng lỗi
  notes: text("notes"), // Ghi chú
  occurredAt: timestamp("occurredAt").notNull(), // Thời điểm xảy ra lỗi
  reportedBy: int("reportedBy").notNull(), // Người báo cáo
  status: varchar("status", { length: 20 }).notNull().default("open"), // open, investigating, resolved, closed
  resolvedAt: timestamp("resolvedAt"), // Thời điểm giải quyết
  resolvedBy: int("resolvedBy"), // Người giải quyết
  rootCause: text("rootCause"), // Nguyên nhân gốc
  correctiveAction: text("correctiveAction"), // Hành động khắc phục
  
  // NTF (Not True Fail) verification
  verificationStatus: mysqlEnum("verificationStatus", ["pending", "real_ng", "ntf"]).default("pending"), // pending: chưa xác nhận, real_ng: lỗi thật, ntf: không phải lỗi thật
  verifiedAt: timestamp("verifiedAt"), // Thời điểm xác nhận
  verifiedBy: int("verifiedBy"), // Người xác nhận
  verificationNotes: text("verificationNotes"), // Ghi chú xác nhận
  ntfReason: varchar("ntfReason", { length: 200 }), // Lý do NTF: sensor_error, false_detection, calibration_issue, etc.
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SpcDefectRecord = typeof spcDefectRecords.$inferSelect;
export type InsertSpcDefectRecord = typeof spcDefectRecords.$inferInsert;

/**
 * Machine Types - Loại máy (SMT, AOI, Reflow, etc.)
 */
export const machineTypes = mysqlTable("machine_types", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 50 }).notNull(), // Mã loại máy: SMT, AOI, REFLOW...
  name: varchar("name", { length: 200 }).notNull(), // Tên loại máy
  description: text("description"), // Mô tả
  category: varchar("category", { length: 100 }), // Nhóm: Assembly, Inspection, Soldering...
  isActive: int("isActive").notNull().default(1),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MachineType = typeof machineTypes.$inferSelect;
export type InsertMachineType = typeof machineTypes.$inferInsert;

/**
 * Fixtures - Fixture thuộc máy
 */
export const fixtures = mysqlTable("fixtures", {
  id: int("id").autoincrement().primaryKey(),
  machineId: int("machineId").notNull(), // FK to machines
  code: varchar("code", { length: 50 }).notNull(), // Mã fixture: FIX001, FIX002...
  name: varchar("name", { length: 200 }).notNull(), // Tên fixture
  description: text("description"), // Mô tả
  position: int("position").notNull().default(1), // Vị trí trên máy
  status: mysqlEnum("status", ["active", "maintenance", "inactive"]).default("active").notNull(),
  installDate: timestamp("installDate"),
  lastMaintenanceDate: timestamp("lastMaintenanceDate"),
  isActive: int("isActive").notNull().default(1),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Fixture = typeof fixtures.$inferSelect;
export type InsertFixture = typeof fixtures.$inferInsert;


/**
 * SPC Rules - Quản lý các quy tắc SPC (Western Electric Rules)
 */
export const spcRules = mysqlTable("spc_rules", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(), // RULE1, RULE2, ...
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"), // Mô tả chi tiết rule
  category: varchar("category", { length: 100 }).notNull().default("western_electric"), // western_electric, nelson, etc.
  formula: text("formula"), // Công thức/điều kiện
  example: text("example"), // Ví dụ minh họa
  severity: mysqlEnum("severity", ["warning", "critical"]).default("warning").notNull(),
  threshold: int("threshold"), // Ngưỡng (nếu có)
  consecutivePoints: int("consecutivePoints"), // Số điểm liên tiếp
  sigmaLevel: int("sigmaLevel"), // Mức sigma (1, 2, 3)
  isEnabled: int("isEnabled").notNull().default(1),
  sortOrder: int("sortOrder").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SpcRule = typeof spcRules.$inferSelect;
export type InsertSpcRule = typeof spcRules.$inferInsert;

/**
 * CA Rules - Quản lý các quy tắc Control Analysis
 */
export const caRules = mysqlTable("ca_rules", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(), // CA1, CA2, ...
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  formula: text("formula"),
  example: text("example"),
  severity: mysqlEnum("severity", ["warning", "critical"]).default("warning").notNull(),
  minValue: int("minValue"), // Giá trị min (nhân 1000)
  maxValue: int("maxValue"), // Giá trị max (nhân 1000)
  isEnabled: int("isEnabled").notNull().default(1),
  sortOrder: int("sortOrder").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CaRule = typeof caRules.$inferSelect;
export type InsertCaRule = typeof caRules.$inferInsert;

/**
 * CPK Rules - Quản lý các quy tắc CPK/Process Capability
 */
export const cpkRules = mysqlTable("cpk_rules", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(), // CPK_EXCELLENT, CPK_GOOD, ...
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  minCpk: int("minCpk"), // Giá trị CPK min (nhân 1000, vd: 1330 = 1.33)
  maxCpk: int("maxCpk"), // Giá trị CPK max (nhân 1000)
  status: varchar("status", { length: 50 }).notNull(), // excellent, good, acceptable, poor, unacceptable
  color: varchar("color", { length: 20 }), // Màu hiển thị: green, yellow, orange, red
  action: text("action"), // Hành động khuyến nghị
  severity: mysqlEnum("severity", ["info", "warning", "critical"]).default("info").notNull(),
  isEnabled: int("isEnabled").notNull().default(1),
  sortOrder: int("sortOrder").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CpkRule = typeof cpkRules.$inferSelect;
export type InsertCpkRule = typeof cpkRules.$inferInsert;


/**
 * Mapping Templates - các mẫu mapping phổ biến
 */
export const mappingTemplates = mysqlTable("mapping_templates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }), // SMT, Assembly, Testing, etc.
  tableName: varchar("tableName", { length: 255 }),
  productCodeColumn: varchar("productCodeColumn", { length: 255 }).default("product_code"),
  stationColumn: varchar("stationColumn", { length: 255 }).default("station"),
  valueColumn: varchar("valueColumn", { length: 255 }).default("value"),
  timestampColumn: varchar("timestampColumn", { length: 255 }).default("timestamp"),
  defaultUsl: int("defaultUsl"),
  defaultLsl: int("defaultLsl"),
  defaultTarget: int("defaultTarget"),
  filterConditions: text("filterConditions"), // JSON array of default filter conditions
  isActive: int("isActive").notNull().default(1),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MappingTemplate = typeof mappingTemplates.$inferSelect;
export type InsertMappingTemplate = typeof mappingTemplates.$inferInsert;


/**
 * Licenses - quản lý license và kích hoạt hệ thống
 */
export const licenses = mysqlTable("licenses", {
  id: int("id").autoincrement().primaryKey(),
  licenseKey: varchar("licenseKey", { length: 255 }).notNull().unique(),
  licenseType: mysqlEnum("licenseType", ["trial", "standard", "professional", "enterprise"]).notNull().default("trial"),
  licenseStatus: mysqlEnum("licenseStatus", ["pending", "active", "expired", "revoked"]).notNull().default("pending"),
  companyName: varchar("companyName", { length: 255 }),
  contactEmail: varchar("contactEmail", { length: 320 }),
  maxUsers: int("maxUsers").notNull().default(5),
  maxProductionLines: int("maxProductionLines").notNull().default(3),
  maxSpcPlans: int("maxSpcPlans").notNull().default(10),
  features: text("features"), // JSON array of enabled features
  issuedAt: timestamp("issuedAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt"),
  activatedAt: timestamp("activatedAt"),
  activatedBy: int("activatedBy"),
  isActive: int("isActive").notNull().default(0),
  hardwareFingerprint: varchar("hardwareFingerprint", { length: 64 }), // For hardware binding
  offlineLicenseFile: text("offlineLicenseFile"), // Base64 encoded offline license
  activationMode: mysqlEnum("activationMode", ["online", "offline", "hybrid"]).default("online"),
  lastValidatedAt: timestamp("lastValidatedAt"), // Last online validation
  price: decimal("price", { precision: 15, scale: 2 }), // Giá tiền license (VND)
  currency: varchar("currency", { length: 3 }).default("VND"), // Mã tiền tệ
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type License = typeof licenses.$inferSelect;
export type InsertLicense = typeof licenses.$inferInsert;

/**
 * License Heartbeats - logs periodic license validation checks
 */
export const licenseHeartbeats = mysqlTable("license_heartbeats", {
  id: int("id").autoincrement().primaryKey(),
  licenseKey: varchar("licenseKey", { length: 255 }).notNull(),
  hardwareFingerprint: varchar("hardwareFingerprint", { length: 64 }),
  hostname: varchar("hostname", { length: 255 }),
  platform: varchar("platform", { length: 100 }),
  activeUsers: int("activeUsers"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LicenseHeartbeat = typeof licenseHeartbeats.$inferSelect;
export type InsertLicenseHeartbeat = typeof licenseHeartbeats.$inferInsert;

/**
 * License Customers - stores customer information for vendor management
 */
export const licenseCustomers = mysqlTable("license_customers", {
  id: int("id").autoincrement().primaryKey(),
  companyName: varchar("companyName", { length: 255 }).notNull(),
  contactName: varchar("contactName", { length: 255 }),
  contactEmail: varchar("contactEmail", { length: 320 }),
  contactPhone: varchar("contactPhone", { length: 50 }),
  address: text("address"),
  industry: varchar("industry", { length: 100 }),
  notes: text("notes"),
  isActive: int("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LicenseCustomer = typeof licenseCustomers.$inferSelect;
export type InsertLicenseCustomer = typeof licenseCustomers.$inferInsert;


/**
 * Webhooks - stores webhook configurations for notifications
 */
export const webhooks = mysqlTable("webhooks", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  url: text("url").notNull(),
  webhookType: mysqlEnum("webhookType", ["slack", "teams", "custom"]).notNull().default("custom"),
  secret: varchar("secret", { length: 255 }),
  headers: text("headers"), // JSON object of custom headers
  events: text("events").notNull(), // JSON array of event types: cpk_alert, rule_violation, analysis_complete
  isActive: int("isActive").notNull().default(1),
  triggerCount: int("triggerCount").notNull().default(0),
  lastTriggeredAt: timestamp("lastTriggeredAt"),
  lastError: text("lastError"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Webhook = typeof webhooks.$inferSelect;
export type InsertWebhook = typeof webhooks.$inferInsert;

/**
 * Webhook logs - stores webhook delivery logs
 */
export const webhookLogs = mysqlTable("webhook_logs", {
  id: int("id").autoincrement().primaryKey(),
  webhookId: int("webhookId").notNull(),
  eventType: varchar("eventType", { length: 50 }).notNull(),
  payload: text("payload").notNull(), // JSON payload sent
  responseStatus: int("responseStatus"),
  responseBody: text("responseBody"),
  success: int("success").notNull().default(0),
  errorMessage: text("errorMessage"),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
  // Retry mechanism fields
  retryCount: int("retryCount").notNull().default(0),
  maxRetries: int("maxRetries").notNull().default(5),
  nextRetryAt: timestamp("nextRetryAt"),
  lastRetryAt: timestamp("lastRetryAt"),
  retryStatus: varchar("retryStatus", { length: 20 }).default("none"), // none, pending, exhausted
});

export type WebhookLog = typeof webhookLogs.$inferSelect;
export type InsertWebhookLog = typeof webhookLogs.$inferInsert;


/**
 * Report Templates - mẫu báo cáo tùy chỉnh
 */
export const reportTemplates = mysqlTable("report_templates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  // Header settings
  companyName: varchar("companyName", { length: 255 }),
  companyLogo: text("companyLogo"), // URL hoặc base64
  headerText: text("headerText"),
  footerText: text("footerText"),
  // Style settings
  primaryColor: varchar("primaryColor", { length: 20 }).default("#3b82f6"),
  secondaryColor: varchar("secondaryColor", { length: 20 }).default("#64748b"),
  fontFamily: varchar("fontFamily", { length: 100 }).default("Arial"),
  // Content settings
  showLogo: int("showLogo").notNull().default(1),
  showCompanyName: int("showCompanyName").notNull().default(1),
  showDate: int("showDate").notNull().default(1),
  showCharts: int("showCharts").notNull().default(1),
  showRawData: int("showRawData").notNull().default(0),
  // Status
  isDefault: int("isDefault").notNull().default(0),
  isActive: int("isActive").notNull().default(1),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ReportTemplate = typeof reportTemplates.$inferSelect;
export type InsertReportTemplate = typeof reportTemplates.$inferInsert;


/**
 * Export History - lịch sử xuất báo cáo
 */
export const exportHistory = mysqlTable("export_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  exportType: varchar("exportType", { length: 20 }).notNull(), // 'pdf' | 'excel'
  productCode: varchar("productCode", { length: 100 }),
  stationName: varchar("stationName", { length: 255 }),
  analysisType: varchar("analysisType", { length: 50 }), // 'single' | 'batch' | 'spcplan'
  startDate: timestamp("startDate"),
  endDate: timestamp("endDate"),
  // SPC Result summary
  sampleCount: int("sampleCount"),
  mean: int("mean"), // * 10000 for precision
  cpk: int("cpk"), // * 10000 for precision
  // File info
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileUrl: text("fileUrl"), // S3 URL if stored
  fileSize: int("fileSize"), // bytes
  // Metadata
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ExportHistory = typeof exportHistory.$inferSelect;
export type InsertExportHistory = typeof exportHistory.$inferInsert;


/**
 * System Configuration - stores system setup and configuration
 */
export const systemConfig = mysqlTable("system_config", {
  id: int("id").autoincrement().primaryKey(),
  configKey: varchar("configKey", { length: 100 }).notNull().unique(),
  configValue: text("configValue"),
  configType: varchar("configType", { length: 50 }).notNull().default("string"), // string, number, boolean, json
  description: text("description"),
  isEncrypted: int("isEncrypted").notNull().default(0), // For sensitive data
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SystemConfig = typeof systemConfig.$inferSelect;
export type InsertSystemConfig = typeof systemConfig.$inferInsert;

/**
 * Company Info - stores customer/company information
 */
export const companyInfo = mysqlTable("company_info", {
  id: int("id").autoincrement().primaryKey(),
  companyName: varchar("companyName", { length: 255 }).notNull(),
  companyCode: varchar("companyCode", { length: 50 }),
  address: text("address"),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 320 }),
  website: varchar("website", { length: 255 }),
  taxCode: varchar("taxCode", { length: 50 }),
  logo: text("logo"), // Base64 or URL
  industry: varchar("industry", { length: 100 }), // Manufacturing, Electronics, etc.
  contactPerson: varchar("contactPerson", { length: 255 }),
  contactPhone: varchar("contactPhone", { length: 50 }),
  contactEmail: varchar("contactEmail", { length: 320 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CompanyInfo = typeof companyInfo.$inferSelect;
export type InsertCompanyInfo = typeof companyInfo.$inferInsert;


/**
 * Database Backups - stores backup history and metadata
 */
export const databaseBackups = mysqlTable("database_backups", {
  id: int("id").autoincrement().primaryKey(),
  filename: varchar("filename", { length: 255 }).notNull(),
  fileSize: int("fileSize"), // Size in bytes
  fileUrl: text("fileUrl"), // S3 URL or local path
  backupType: mysqlEnum("backupType", ["daily", "weekly", "manual"]).notNull().default("manual"),
  status: mysqlEnum("status", ["pending", "completed", "failed"]).notNull().default("pending"),
  errorMessage: text("errorMessage"),
  storageLocation: mysqlEnum("storageLocation", ["s3", "local"]).notNull().default("s3"),
  tablesIncluded: text("tablesIncluded"), // JSON array of table names
  createdBy: int("createdBy"), // null for automated backups
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type DatabaseBackup = typeof databaseBackups.$inferSelect;
export type InsertDatabaseBackup = typeof databaseBackups.$inferInsert;


/**
 * Jigs - Đồ gá thuộc máy
 */
export const jigs = mysqlTable("jigs", {
  id: int("id").autoincrement().primaryKey(),
  machineId: int("machineId").notNull(), // FK to machines
  code: varchar("code", { length: 50 }).notNull(), // Mã jig: JIG001, JIG002...
  name: varchar("name", { length: 200 }).notNull(), // Tên jig
  description: text("description"), // Mô tả
  imageUrl: varchar("imageUrl", { length: 500 }), // Ảnh jig
  position: int("position").notNull().default(1), // Vị trí trên máy
  status: mysqlEnum("status", ["active", "maintenance", "inactive"]).default("active").notNull(),
  installDate: timestamp("installDate"),
  lastMaintenanceDate: timestamp("lastMaintenanceDate"),
  isActive: int("isActive").notNull().default(1),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Jig = typeof jigs.$inferSelect;
export type InsertJig = typeof jigs.$inferInsert;

/**
 * Product Station Machine Standards - Tiêu chuẩn đo theo Sản phẩm-Công trạm-Máy
 * Mỗi sản phẩm tại các công trạm và máy khác nhau có tiêu chuẩn đo, phương pháp lấy mẫu, SPC Rule khác nhau
 */
export const productStationMachineStandards = mysqlTable("product_station_machine_standards", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(), // FK to products
  workstationId: int("workstationId").notNull(), // FK to workstations
  machineId: int("machineId"), // FK to machines (optional, null = all machines)
  
  // Tiêu chuẩn đo
  measurementName: varchar("measurementName", { length: 255 }).notNull(), // Tên phép đo
  usl: int("usl"), // Upper Specification Limit * 10000
  lsl: int("lsl"), // Lower Specification Limit * 10000
  target: int("target"), // Target value * 10000
  unit: varchar("unit", { length: 50 }).default("mm"), // Đơn vị đo
  
  // Phương pháp lấy mẫu
  sampleSize: int("sampleSize").notNull().default(5), // Số mẫu mỗi lần lấy
  sampleFrequency: int("sampleFrequency").notNull().default(60), // Tần suất lấy mẫu (phút)
  samplingMethod: varchar("samplingMethod", { length: 100 }).default("random"), // random, systematic, stratified
  
  // SPC Rules được áp dụng (JSON array of rule IDs)
  appliedSpcRules: text("appliedSpcRules"), // ["RULE1", "RULE2", ...]
  appliedCpkRules: text("appliedCpkRules"), // ["CPK1", "CPK2", ...] - CPK Rules
  appliedCaRules: text("appliedCaRules"), // ["CA1", "CA2", ...] - CA Rules
  
  // CPK thresholds
  cpkWarningThreshold: int("cpkWarningThreshold").default(133), // 1.33 * 100
  cpkCriticalThreshold: int("cpkCriticalThreshold").default(100), // 1.00 * 100
  
  // Metadata
  notes: text("notes"),
  isActive: int("isActive").notNull().default(1),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProductStationMachineStandard = typeof productStationMachineStandards.$inferSelect;
export type InsertProductStationMachineStandard = typeof productStationMachineStandards.$inferInsert;


/**
 * Custom Validation Rules - Quy tắc kiểm tra tùy chỉnh cho từng sản phẩm
 */
export const customValidationRules = mysqlTable("custom_validation_rules", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  productId: int("productId"), // Null = áp dụng cho tất cả sản phẩm
  workstationId: int("workstationId"), // Null = áp dụng cho tất cả công trạm
  ruleType: mysqlEnum("ruleType", [
    "range_check",      // Kiểm tra giá trị trong khoảng
    "trend_check",      // Kiểm tra xu hướng
    "pattern_check",    // Kiểm tra mẫu
    "comparison_check", // So sánh với giá trị khác
    "formula_check",    // Kiểm tra theo công thức
    "custom_script"     // Script tùy chỉnh
  ]).notNull().default("range_check"),
  // Cấu hình quy tắc (JSON)
  ruleConfig: text("ruleConfig"), // JSON: { minValue, maxValue, formula, script, etc. }
  // Hành động khi vi phạm
  actionOnViolation: mysqlEnum("actionOnViolation", [
    "warning",    // Cảnh báo
    "alert",      // Gửi thông báo
    "reject",     // Từ chối dữ liệu
    "log_only"    // Chỉ ghi log
  ]).notNull().default("warning"),
  // Mức độ nghiêm trọng
  severity: mysqlEnum("severity", ["low", "medium", "high", "critical"]).notNull().default("medium"),
  // Thông báo khi vi phạm
  violationMessage: text("violationMessage"),
  // Trạng thái
  isActive: int("isActive").notNull().default(1),
  // Thứ tự ưu tiên (số nhỏ = ưu tiên cao)
  priority: int("priority").notNull().default(100),
  // Metadata
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CustomValidationRule = typeof customValidationRules.$inferSelect;
export type InsertCustomValidationRule = typeof customValidationRules.$inferInsert;

/**
 * Validation Rule Execution Log - Lịch sử thực thi quy tắc kiểm tra
 */
export const validationRuleLogs = mysqlTable("validation_rule_logs", {
  id: int("id").autoincrement().primaryKey(),
  ruleId: int("ruleId").notNull(),
  productId: int("productId"),
  workstationId: int("workstationId"),
  machineId: int("machineId"),
  // Dữ liệu được kiểm tra
  inputValue: varchar("inputValue", { length: 500 }),
  // Kết quả
  passed: int("passed").notNull().default(1), // 1 = pass, 0 = fail
  violationDetails: text("violationDetails"), // Chi tiết vi phạm nếu có
  actionTaken: varchar("actionTaken", { length: 100 }),
  // Metadata
  executedAt: timestamp("executedAt").defaultNow().notNull(),
  executedBy: int("executedBy"),
});

export type ValidationRuleLog = typeof validationRuleLogs.$inferSelect;
export type InsertValidationRuleLog = typeof validationRuleLogs.$inferInsert;

/**
 * Realtime Machine Connections - cấu hình kết nối máy realtime
 */
export const realtimeMachineConnections = mysqlTable("realtime_machine_connections", {
  id: int("id").autoincrement().primaryKey(),
  machineId: int("machineId").notNull(),
  connectionType: mysqlEnum("connectionType", ["database", "opcua", "api", "file", "mqtt"]).notNull(),
  connectionConfig: text("connectionConfig"), // JSON config
  pollingIntervalMs: int("pollingIntervalMs").notNull().default(1000),
  dataQuery: text("dataQuery"), // SQL query hoặc config để lấy dữ liệu
  measurementColumn: varchar("measurementColumn", { length: 100 }),
  timestampColumn: varchar("timestampColumn", { length: 100 }),
  lastDataAt: timestamp("lastDataAt"),
  lastError: text("lastError"),
  isActive: int("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RealtimeMachineConnection = typeof realtimeMachineConnections.$inferSelect;
export type InsertRealtimeMachineConnection = typeof realtimeMachineConnections.$inferInsert;

/**
 * Realtime Data Buffer - buffer dữ liệu realtime
 */
export const realtimeDataBuffer = mysqlTable("realtime_data_buffer", {
  id: int("id").autoincrement().primaryKey(),
  connectionId: int("connectionId").notNull(),
  machineId: int("machineId").notNull(),
  measurementName: varchar("measurementName", { length: 100 }).notNull(),
  value: int("value").notNull(), // * 10000
  sampledAt: timestamp("sampledAt").notNull(),
  processedAt: timestamp("processedAt").defaultNow().notNull(),
  // SPC calculations
  subgroupIndex: int("subgroupIndex"),
  subgroupMean: int("subgroupMean"), // * 10000
  subgroupRange: int("subgroupRange"), // * 10000
  ucl: int("ucl"), // * 10000
  lcl: int("lcl"), // * 10000
  isOutOfSpec: int("isOutOfSpec").notNull().default(0),
  isOutOfControl: int("isOutOfControl").notNull().default(0),
  violatedRules: varchar("violatedRules", { length: 50 }),
});

export type RealtimeDataBuffer = typeof realtimeDataBuffer.$inferSelect;
export type InsertRealtimeDataBuffer = typeof realtimeDataBuffer.$inferInsert;

/**
 * Realtime Alerts - cảnh báo realtime
 */
export const realtimeAlerts = mysqlTable("realtime_alerts", {
  id: int("id").autoincrement().primaryKey(),
  connectionId: int("connectionId").notNull(),
  machineId: int("machineId").notNull(),
  alertType: mysqlEnum("alertType", ["out_of_spec", "out_of_control", "rule_violation", "connection_lost"]).notNull(),
  severity: mysqlEnum("severity", ["warning", "critical"]).notNull(),
  message: text("message"),
  ruleNumber: int("ruleNumber"),
  value: int("value"), // * 10000
  threshold: int("threshold"), // * 10000
  acknowledgedAt: timestamp("acknowledgedAt"),
  acknowledgedBy: int("acknowledgedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RealtimeAlert = typeof realtimeAlerts.$inferSelect;
export type InsertRealtimeAlert = typeof realtimeAlerts.$inferInsert;


/**
 * Alarm Thresholds - cấu hình ngưỡng alarm cho từng máy/fixture
 */
export const alarmThresholds = mysqlTable("alarm_thresholds", {
  id: int("id").autoincrement().primaryKey(),
  machineId: int("machineId"),
  fixtureId: int("fixtureId"),
  measurementName: varchar("measurementName", { length: 100 }),
  // Ngưỡng cảnh báo (warning)
  warningUsl: int("warningUsl"), // * 10000
  warningLsl: int("warningLsl"), // * 10000
  warningCpkMin: int("warningCpkMin"), // * 10000 (e.g., 1.33 = 13300)
  // Ngưỡng nghiêm trọng (critical)
  criticalUsl: int("criticalUsl"), // * 10000
  criticalLsl: int("criticalLsl"), // * 10000
  criticalCpkMin: int("criticalCpkMin"), // * 10000 (e.g., 1.0 = 10000)
  // SPC Rules
  enableSpcRules: int("enableSpcRules").notNull().default(1),
  spcRuleSeverity: mysqlEnum("spcRuleSeverity", ["warning", "critical"]).default("warning"),
  // Thông báo
  enableSound: int("enableSound").notNull().default(1),
  enableEmail: int("enableEmail").notNull().default(0),
  emailRecipients: text("emailRecipients"), // JSON array of emails
  // Escalation
  escalationDelayMinutes: int("escalationDelayMinutes").default(5),
  escalationEmails: text("escalationEmails"), // JSON array of emails for escalation
  // Metadata
  isActive: int("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AlarmThreshold = typeof alarmThresholds.$inferSelect;
export type InsertAlarmThreshold = typeof alarmThresholds.$inferInsert;

/**
 * Machine Online Status - trạng thái online của máy
 */
export const machineOnlineStatus = mysqlTable("machine_online_status", {
  id: int("id").autoincrement().primaryKey(),
  machineId: int("machineId").notNull().unique(),
  connectionId: int("connectionId"),
  isOnline: int("isOnline").notNull().default(0),
  lastHeartbeat: timestamp("lastHeartbeat"),
  lastDataReceived: timestamp("lastDataReceived"),
  currentCpk: int("currentCpk"), // * 10000
  currentMean: int("currentMean"), // * 10000
  activeAlarmCount: int("activeAlarmCount").notNull().default(0),
  warningCount: int("warningCount").notNull().default(0),
  criticalCount: int("criticalCount").notNull().default(0),
  status: mysqlEnum("status", ["idle", "running", "warning", "critical", "offline"]).default("offline"),
  statusMessage: text("statusMessage"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MachineOnlineStatus = typeof machineOnlineStatus.$inferSelect;
export type InsertMachineOnlineStatus = typeof machineOnlineStatus.$inferInsert;


/**
 * Machine Areas - khu vực/dây chuyền máy
 */
export const machineAreas = mysqlTable("machine_areas", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 100 }).notNull(),
  description: text("description"),
  parentId: int("parentId"), // For hierarchical structure (e.g., Factory > Line > Zone)
  type: mysqlEnum("type", ["factory", "line", "zone", "area"]).default("area"),
  sortOrder: int("sortOrder").default(0),
  isActive: int("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MachineArea = typeof machineAreas.$inferSelect;
export type InsertMachineArea = typeof machineAreas.$inferInsert;

/**
 * Machine Area Assignments - gán máy vào khu vực
 */
export const machineAreaAssignments = mysqlTable("machine_area_assignments", {
  id: int("id").autoincrement().primaryKey(),
  machineId: int("machineId").notNull(),
  areaId: int("areaId").notNull(),
  sortOrder: int("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MachineAreaAssignment = typeof machineAreaAssignments.$inferSelect;
export type InsertMachineAreaAssignment = typeof machineAreaAssignments.$inferInsert;

/**
 * Machine Status History - lịch sử trạng thái máy (cho báo cáo uptime/downtime)
 */
export const machineStatusHistory = mysqlTable("machine_status_history", {
  id: int("id").autoincrement().primaryKey(),
  machineId: int("machineId").notNull(),
  status: mysqlEnum("status", ["online", "offline", "idle", "running", "warning", "critical", "maintenance"]).notNull(),
  startTime: timestamp("startTime").notNull(),
  endTime: timestamp("endTime"),
  durationMinutes: int("durationMinutes"),
  reason: text("reason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MachineStatusHistory = typeof machineStatusHistory.$inferSelect;
export type InsertMachineStatusHistory = typeof machineStatusHistory.$inferInsert;


// ============================================
// MMS - MACHINE MANAGEMENT SYSTEM
// ============================================

/**
 * OEE Loss Categories - danh mục tổn thất OEE
 */
export const oeeLossCategories = mysqlTable("oee_loss_categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).notNull(),
  type: mysqlEnum("type", ["availability", "performance", "quality"]).notNull(),
  description: text("description"),
  color: varchar("color", { length: 20 }).default("#6b7280"),
  sortOrder: int("sortOrder").default(0),
  isActive: int("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OeeLossCategory = typeof oeeLossCategories.$inferSelect;
export type InsertOeeLossCategory = typeof oeeLossCategories.$inferInsert;

/**
 * OEE Targets - mục tiêu OEE theo máy/dây chuyền
 */
export const oeeTargets = mysqlTable("oee_targets", {
  id: int("id").autoincrement().primaryKey(),
  machineId: int("machineId"),
  productionLineId: int("productionLineId"),
  targetOee: decimal("targetOee", { precision: 5, scale: 2 }).default("85.00"),
  targetAvailability: decimal("targetAvailability", { precision: 5, scale: 2 }).default("90.00"),
  targetPerformance: decimal("targetPerformance", { precision: 5, scale: 2 }).default("95.00"),
  targetQuality: decimal("targetQuality", { precision: 5, scale: 2 }).default("99.00"),
  effectiveFrom: timestamp("effectiveFrom").notNull(),
  effectiveTo: timestamp("effectiveTo"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OeeTarget = typeof oeeTargets.$inferSelect;
export type InsertOeeTarget = typeof oeeTargets.$inferInsert;

/**
 * OEE Records - bản ghi OEE theo ca/ngày
 */
export const oeeRecords = mysqlTable("oee_records", {
  id: int("id").autoincrement().primaryKey(),
  machineId: int("machineId").notNull(),
  productionLineId: int("productionLineId"),
  shiftId: int("shiftId"),
  recordDate: timestamp("recordDate").notNull(),
  
  // Thời gian
  plannedProductionTime: int("plannedProductionTime").notNull(), // phút
  actualRunTime: int("actualRunTime").notNull(), // phút
  downtime: int("downtime").default(0), // phút
  
  // Sản lượng
  idealCycleTime: decimal("idealCycleTime", { precision: 10, scale: 4 }), // giây/sản phẩm
  totalCount: int("totalCount").default(0),
  goodCount: int("goodCount").default(0),
  defectCount: int("defectCount").default(0),
  
  // Chỉ số OEE
  availability: decimal("availability", { precision: 5, scale: 2 }),
  performance: decimal("performance", { precision: 5, scale: 2 }),
  quality: decimal("quality", { precision: 5, scale: 2 }),
  oee: decimal("oee", { precision: 5, scale: 2 }),
  
  notes: text("notes"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OeeRecord = typeof oeeRecords.$inferSelect;
export type InsertOeeRecord = typeof oeeRecords.$inferInsert;

/**
 * OEE Loss Records - chi tiết tổn thất OEE
 */
export const oeeLossRecords = mysqlTable("oee_loss_records", {
  id: int("id").autoincrement().primaryKey(),
  oeeRecordId: int("oeeRecordId").notNull(),
  lossCategoryId: int("lossCategoryId").notNull(),
  durationMinutes: int("durationMinutes").notNull(),
  quantity: int("quantity").default(0),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OeeLossRecord = typeof oeeLossRecords.$inferSelect;
export type InsertOeeLossRecord = typeof oeeLossRecords.$inferInsert;

/**
 * Maintenance Types - loại bảo trì
 */
export const maintenanceTypes = mysqlTable("maintenance_types", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).notNull(),
  category: mysqlEnum("category", ["corrective", "preventive", "predictive", "condition_based"]).notNull(),
  description: text("description"),
  defaultPriority: mysqlEnum("defaultPriority", ["low", "medium", "high", "critical"]).default("medium"),
  estimatedDuration: int("estimatedDuration"), // phút
  color: varchar("color", { length: 20 }).default("#3b82f6"),
  isActive: int("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MaintenanceType = typeof maintenanceTypes.$inferSelect;
export type InsertMaintenanceType = typeof maintenanceTypes.$inferInsert;

/**
 * Technicians - kỹ thuật viên bảo trì
 */
export const technicians = mysqlTable("technicians", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  employeeCode: varchar("employeeCode", { length: 50 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  specialization: varchar("specialization", { length: 255 }),
  skillLevel: mysqlEnum("skillLevel", ["junior", "intermediate", "senior", "expert"]).default("intermediate"),
  isAvailable: int("isAvailable").notNull().default(1),
  isActive: int("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Technician = typeof technicians.$inferSelect;
export type InsertTechnician = typeof technicians.$inferInsert;

/**
 * Maintenance Schedules - lịch bảo trì định kỳ
 */
export const maintenanceSchedules = mysqlTable("maintenance_schedules", {
  id: int("id").autoincrement().primaryKey(),
  machineId: int("machineId").notNull(),
  maintenanceTypeId: int("maintenanceTypeId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  
  // Lịch trình
  frequency: mysqlEnum("frequency", ["daily", "weekly", "biweekly", "monthly", "quarterly", "biannually", "annually", "custom"]).notNull(),
  customIntervalDays: int("customIntervalDays"),
  lastPerformedAt: timestamp("lastPerformedAt"),
  nextDueAt: timestamp("nextDueAt"),
  
  // Thông tin bổ sung
  estimatedDuration: int("estimatedDuration"), // phút
  assignedTechnicianId: int("assignedTechnicianId"),
  checklist: json("checklist"), // JSON array of checklist items
  
  priority: mysqlEnum("priority", ["low", "medium", "high", "critical"]).default("medium"),
  isActive: int("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MaintenanceSchedule = typeof maintenanceSchedules.$inferSelect;
export type InsertMaintenanceSchedule = typeof maintenanceSchedules.$inferInsert;

/**
 * Work Orders - phiếu công việc bảo trì
 */
export const workOrders = mysqlTable("work_orders", {
  id: int("id").autoincrement().primaryKey(),
  workOrderNumber: varchar("workOrderNumber", { length: 50 }).notNull(),
  machineId: int("machineId").notNull(),
  maintenanceTypeId: int("maintenanceTypeId").notNull(),
  scheduleId: int("scheduleId"), // null nếu là corrective
  
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  priority: mysqlEnum("priority", ["low", "medium", "high", "critical"]).default("medium"),
  status: mysqlEnum("status", ["pending", "assigned", "in_progress", "on_hold", "completed", "cancelled"]).default("pending"),
  
  // Thời gian
  reportedAt: timestamp("reportedAt").defaultNow().notNull(),
  scheduledStartAt: timestamp("scheduledStartAt"),
  actualStartAt: timestamp("actualStartAt"),
  completedAt: timestamp("completedAt"),
  
  // Người thực hiện
  reportedBy: int("reportedBy"),
  assignedTo: int("assignedTo"),
  completedBy: int("completedBy"),
  
  // Chi phí
  laborHours: decimal("laborHours", { precision: 6, scale: 2 }),
  laborCost: decimal("laborCost", { precision: 12, scale: 2 }),
  partsCost: decimal("partsCost", { precision: 12, scale: 2 }),
  totalCost: decimal("totalCost", { precision: 12, scale: 2 }),
  
  // Kết quả
  rootCause: text("rootCause"),
  actionTaken: text("actionTaken"),
  notes: text("notes"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WorkOrder = typeof workOrders.$inferSelect;
export type InsertWorkOrder = typeof workOrders.$inferInsert;

/**
 * Work Order Parts - phụ tùng sử dụng trong work order
 */
export const workOrderParts = mysqlTable("work_order_parts", {
  id: int("id").autoincrement().primaryKey(),
  workOrderId: int("workOrderId").notNull(),
  sparePartId: int("sparePartId").notNull(),
  quantity: int("quantity").notNull(),
  unitCost: decimal("unitCost", { precision: 12, scale: 2 }),
  totalCost: decimal("totalCost", { precision: 12, scale: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WorkOrderPart = typeof workOrderParts.$inferSelect;
export type InsertWorkOrderPart = typeof workOrderParts.$inferInsert;

/**
 * Maintenance History - lịch sử bảo trì
 */
export const maintenanceHistory = mysqlTable("maintenance_history", {
  id: int("id").autoincrement().primaryKey(),
  workOrderId: int("workOrderId").notNull(),
  machineId: int("machineId").notNull(),
  action: varchar("action", { length: 255 }).notNull(),
  performedBy: int("performedBy"),
  performedAt: timestamp("performedAt").defaultNow().notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MaintenanceHistoryRecord = typeof maintenanceHistory.$inferSelect;
export type InsertMaintenanceHistory = typeof maintenanceHistory.$inferInsert;

/**
 * Suppliers - nhà cung cấp phụ tùng
 */
export const suppliers = mysqlTable("suppliers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).notNull(),
  contactPerson: varchar("contactPerson", { length: 255 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  website: varchar("website", { length: 255 }),
  paymentTerms: varchar("paymentTerms", { length: 100 }),
  leadTimeDays: int("leadTimeDays"),
  rating: int("rating").default(3), // 1-5
  notes: text("notes"),
  isActive: int("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = typeof suppliers.$inferInsert;

/**
 * Spare Parts - danh mục phụ tùng
 */
export const spareParts = mysqlTable("spare_parts", {
  id: int("id").autoincrement().primaryKey(),
  partNumber: varchar("partNumber", { length: 100 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }),
  
  // Liên kết
  machineTypeId: int("machineTypeId"),
  supplierId: int("supplierId"),
  
  // Thông tin kỹ thuật
  specifications: text("specifications"),
  unit: varchar("unit", { length: 50 }).default("pcs"),
  
  // Giá và chi phí
  unitPrice: decimal("unitPrice", { precision: 12, scale: 2 }),
  currency: varchar("currency", { length: 10 }).default("VND"),
  
  // Tồn kho
  minStock: int("minStock").default(0),
  maxStock: int("maxStock"),
  reorderPoint: int("reorderPoint"),
  reorderQuantity: int("reorderQuantity"),
  emailAlertThreshold: int("emailAlertThreshold").default(0), // Ngưỡng cảnh báo email (0 = dùng minStock)
  
  // Vị trí
  warehouseLocation: varchar("warehouseLocation", { length: 100 }),
  
  isActive: int("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SparePart = typeof spareParts.$inferSelect;
export type InsertSparePart = typeof spareParts.$inferInsert;

/**
 * Spare Parts Inventory - tồn kho phụ tùng
 */
export const sparePartsInventory = mysqlTable("spare_parts_inventory", {
  id: int("id").autoincrement().primaryKey(),
  sparePartId: int("sparePartId").notNull(),
  quantity: int("quantity").notNull().default(0),
  reservedQuantity: int("reservedQuantity").default(0),
  availableQuantity: int("availableQuantity").default(0),
  lastStockCheck: timestamp("lastStockCheck"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SparePartInventory = typeof sparePartsInventory.$inferSelect;
export type InsertSparePartInventory = typeof sparePartsInventory.$inferInsert;

/**
 * Spare Parts Transactions - giao dịch phụ tùng
 */
export const sparePartsTransactions = mysqlTable("spare_parts_transactions", {
  id: int("id").autoincrement().primaryKey(),
  sparePartId: int("sparePartId").notNull(),
  transactionType: mysqlEnum("transactionType", ["in", "out", "adjustment", "return"]).notNull(),
  quantity: int("quantity").notNull(),
  workOrderId: int("workOrderId"),
  purchaseOrderId: int("purchaseOrderId"),
  unitCost: decimal("unitCost", { precision: 12, scale: 2 }),
  totalCost: decimal("totalCost", { precision: 12, scale: 2 }),
  reason: text("reason"),
  performedBy: int("performedBy"),
  
  // Mục đích xuất kho
  exportPurpose: mysqlEnum("exportPurpose", ["repair", "borrow", "destroy", "normal"]).default("normal"),
  borrowerName: varchar("borrowerName", { length: 255 }), // Người mượn
  borrowerDepartment: varchar("borrowerDepartment", { length: 255 }), // Phòng ban
  expectedReturnDate: timestamp("expectedReturnDate"), // Ngày dự kiến trả
  actualReturnDate: timestamp("actualReturnDate"), // Ngày trả thực tế
  returnedQuantity: int("returnedQuantity").default(0), // Số lượng đã trả
  returnStatus: mysqlEnum("returnStatus", ["pending", "partial", "completed"]).default("pending"), // Trạng thái trả
  relatedTransactionId: int("relatedTransactionId"), // Liên kết với giao dịch xuất kho gốc
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SparePartTransaction = typeof sparePartsTransactions.$inferSelect;
export type InsertSparePartTransaction = typeof sparePartsTransactions.$inferInsert;

/**
 * Purchase Orders - đơn đặt hàng phụ tùng
 */
export const purchaseOrders = mysqlTable("purchase_orders", {
  id: int("id").autoincrement().primaryKey(),
  poNumber: varchar("poNumber", { length: 50 }).notNull(),
  supplierId: int("supplierId").notNull(),
  status: mysqlEnum("status", ["draft", "pending", "approved", "ordered", "partial_received", "received", "cancelled"]).default("draft"),
  
  orderDate: timestamp("orderDate"),
  expectedDeliveryDate: timestamp("expectedDeliveryDate"),
  actualDeliveryDate: timestamp("actualDeliveryDate"),
  
  subtotal: decimal("subtotal", { precision: 14, scale: 2 }),
  tax: decimal("tax", { precision: 14, scale: 2 }),
  shipping: decimal("shipping", { precision: 14, scale: 2 }),
  total: decimal("total", { precision: 14, scale: 2 }),
  
  notes: text("notes"),
  createdBy: int("createdBy"),
  approvedBy: int("approvedBy"),
  approvedAt: timestamp("approvedAt"),
  rejectedBy: int("rejectedBy"),
  rejectedAt: timestamp("rejectedAt"),
  rejectionReason: text("rejectionReason"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPurchaseOrder = typeof purchaseOrders.$inferInsert;

/**
 * Purchase Order Items - chi tiết đơn đặt hàng
 */
export const purchaseOrderItems = mysqlTable("purchase_order_items", {
  id: int("id").autoincrement().primaryKey(),
  purchaseOrderId: int("purchaseOrderId").notNull(),
  sparePartId: int("sparePartId").notNull(),
  quantity: int("quantity").notNull(),
  unitPrice: decimal("unitPrice", { precision: 12, scale: 2 }),
  totalPrice: decimal("totalPrice", { precision: 12, scale: 2 }),
  receivedQuantity: int("receivedQuantity").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;
export type InsertPurchaseOrderItem = typeof purchaseOrderItems.$inferInsert;

/**
 * PO Receiving History - lịch sử nhập kho từng lần theo đơn đặt hàng
 */
export const poReceivingHistory = mysqlTable("po_receiving_history", {
  id: int("id").autoincrement().primaryKey(),
  purchaseOrderId: int("purchaseOrderId").notNull(),
  purchaseOrderItemId: int("purchaseOrderItemId").notNull(),
  sparePartId: int("sparePartId").notNull(),
  quantityReceived: int("quantityReceived").notNull(),
  receivedBy: int("receivedBy"),
  receivedAt: timestamp("receivedAt").defaultNow().notNull(),
  notes: text("notes"),
  batchNumber: varchar("batchNumber", { length: 100 }), // Số lô hàng
  qualityStatus: mysqlEnum("qualityStatus", ["good", "damaged", "rejected"]).default("good"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PoReceivingHistory = typeof poReceivingHistory.$inferSelect;
export type InsertPoReceivingHistory = typeof poReceivingHistory.$inferInsert;

/**
 * Sensor Types - loại sensor
 */
export const sensorTypes = mysqlTable("sensor_types", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).notNull(),
  unit: varchar("unit", { length: 50 }),
  description: text("description"),
  minValue: decimal("minValue", { precision: 12, scale: 4 }),
  maxValue: decimal("maxValue", { precision: 12, scale: 4 }),
  warningThreshold: decimal("warningThreshold", { precision: 12, scale: 4 }),
  criticalThreshold: decimal("criticalThreshold", { precision: 12, scale: 4 }),
  isActive: int("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SensorType = typeof sensorTypes.$inferSelect;
export type InsertSensorType = typeof sensorTypes.$inferInsert;

/**
 * Machine Sensors - sensor gắn trên máy
 */
export const machineSensors = mysqlTable("machine_sensors", {
  id: int("id").autoincrement().primaryKey(),
  machineId: int("machineId").notNull(),
  sensorTypeId: int("sensorTypeId").notNull(),
  sensorCode: varchar("sensorCode", { length: 100 }).notNull(),
  location: varchar("location", { length: 255 }),
  installDate: timestamp("installDate"),
  calibrationDate: timestamp("calibrationDate"),
  nextCalibrationDate: timestamp("nextCalibrationDate"),
  isActive: int("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MachineSensor = typeof machineSensors.$inferSelect;
export type InsertMachineSensor = typeof machineSensors.$inferInsert;

/**
 * Sensor Data - dữ liệu sensor realtime
 */
export const sensorData = mysqlTable("sensor_data", {
  id: int("id").autoincrement().primaryKey(),
  sensorId: int("sensorId").notNull(),
  machineId: int("machineId").notNull(),
  value: decimal("value", { precision: 12, scale: 4 }).notNull(),
  status: mysqlEnum("status", ["normal", "warning", "critical"]).default("normal"),
  recordedAt: timestamp("recordedAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SensorDataRecord = typeof sensorData.$inferSelect;
export type InsertSensorData = typeof sensorData.$inferInsert;

/**
 * Prediction Models - mô hình dự đoán
 */
export const predictionModels = mysqlTable("prediction_models", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  machineTypeId: int("machineTypeId"),
  modelType: mysqlEnum("modelType", ["rul", "anomaly", "failure", "degradation"]).notNull(),
  description: text("description"),
  
  // Cấu hình model
  inputFeatures: json("inputFeatures"), // JSON array of sensor types
  modelParameters: json("modelParameters"),
  
  // Hiệu suất
  accuracy: decimal("accuracy", { precision: 5, scale: 2 }),
  lastTrainedAt: timestamp("lastTrainedAt"),
  trainingDataCount: int("trainingDataCount"),
  
  isActive: int("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PredictionModel = typeof predictionModels.$inferSelect;
export type InsertPredictionModel = typeof predictionModels.$inferInsert;

/**
 * Predictions - kết quả dự đoán
 */
export const predictions = mysqlTable("predictions", {
  id: int("id").autoincrement().primaryKey(),
  machineId: int("machineId").notNull(),
  modelId: int("modelId").notNull(),
  
  predictionType: mysqlEnum("predictionType", ["rul", "failure_probability", "anomaly_score", "health_index"]).notNull(),
  predictedValue: decimal("predictedValue", { precision: 12, scale: 4 }),
  confidence: decimal("confidence", { precision: 5, scale: 2 }),
  
  // RUL specific
  estimatedFailureDate: timestamp("estimatedFailureDate"),
  remainingUsefulLife: int("remainingUsefulLife"), // hours
  
  // Status
  severity: mysqlEnum("severity", ["low", "medium", "high", "critical"]).default("low"),
  isAcknowledged: int("isAcknowledged").default(0),
  acknowledgedBy: int("acknowledgedBy"),
  acknowledgedAt: timestamp("acknowledgedAt"),
  
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Prediction = typeof predictions.$inferSelect;
export type InsertPrediction = typeof predictions.$inferInsert;

/**
 * MMS Dashboard Widgets - cấu hình widget dashboard MMS
 */
export const mmsDashboardWidgets = mysqlTable("mms_dashboard_widgets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  widgetType: varchar("widgetType", { length: 100 }).notNull(),
  title: varchar("title", { length: 255 }),
  config: json("config"),
  position: int("position").default(0),
  width: int("width").default(1), // 1-4 columns
  height: int("height").default(1), // 1-3 rows
  isVisible: int("isVisible").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MmsDashboardWidget = typeof mmsDashboardWidgets.$inferSelect;
export type InsertMmsDashboardWidget = typeof mmsDashboardWidgets.$inferInsert;

/**
 * Scheduled Reports Configuration
 * Cấu hình báo cáo tự động gửi định kỳ
 */
export const scheduledReports = mysqlTable("scheduled_reports", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  reportType: mysqlEnum("reportType", ["oee_daily", "oee_weekly", "oee_monthly", "maintenance_daily", "maintenance_weekly", "maintenance_monthly", "combined_weekly", "combined_monthly"]).notNull(),
  schedule: mysqlEnum("schedule", ["daily", "weekly", "monthly"]).notNull().default("weekly"),
  dayOfWeek: int("dayOfWeek").default(1), // 0-6 for weekly (0=Sunday)
  dayOfMonth: int("dayOfMonth").default(1), // 1-31 for monthly
  hour: int("hour").notNull().default(8), // Hour to send (0-23)
  recipients: text("recipients").notNull(), // Comma-separated emails
  includeCharts: int("includeCharts").notNull().default(1),
  includeTables: int("includeTables").notNull().default(1),
  includeRecommendations: int("includeRecommendations").notNull().default(1),
  machineIds: json("machineIds"), // Array of machine IDs to include, null = all
  productionLineIds: json("productionLineIds"), // Array of line IDs, null = all
  isActive: int("isActive").notNull().default(1),
  lastSentAt: timestamp("lastSentAt"),
  nextScheduledAt: timestamp("nextScheduledAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ScheduledReport = typeof scheduledReports.$inferSelect;
export type InsertScheduledReport = typeof scheduledReports.$inferInsert;

/**
 * Scheduled Report Logs
 * Lịch sử gửi báo cáo tự động
 */
export const scheduledReportLogs = mysqlTable("scheduled_report_logs", {
  id: int("id").autoincrement().primaryKey(),
  reportId: int("reportId").notNull(),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
  status: mysqlEnum("status", ["success", "failed", "partial"]).notNull(),
  recipientCount: int("recipientCount").notNull().default(0),
  successCount: int("successCount").notNull().default(0),
  failedCount: int("failedCount").notNull().default(0),
  errorMessage: text("errorMessage"),
  reportFileUrl: varchar("reportFileUrl", { length: 500 }),
  reportFileSizeKb: int("reportFileSizeKb"),
  generationTimeMs: int("generationTimeMs"),
});

export type ScheduledReportLog = typeof scheduledReportLogs.$inferSelect;
export type InsertScheduledReportLog = typeof scheduledReportLogs.$inferInsert;

/**
 * Shift Reports - báo cáo ca làm việc tự động
 */
export const shiftReports = mysqlTable("shift_reports", {
  id: int("id").autoincrement().primaryKey(),
  
  // Shift info
  shiftDate: timestamp("shiftDate").notNull(),
  shiftType: mysqlEnum("shiftType", ["morning", "afternoon", "night"]).notNull(),
  shiftStart: timestamp("shiftStart").notNull(),
  shiftEnd: timestamp("shiftEnd").notNull(),
  
  // Production line/machine info
  productionLineId: int("productionLineId"),
  machineId: int("machineId"),
  
  // OEE metrics
  oee: decimal("oee", { precision: 5, scale: 2 }),
  availability: decimal("availability", { precision: 5, scale: 2 }),
  performance: decimal("performance", { precision: 5, scale: 2 }),
  quality: decimal("quality", { precision: 5, scale: 2 }),
  
  // SPC metrics
  cpk: decimal("cpk", { precision: 6, scale: 4 }),
  cp: decimal("cp", { precision: 6, scale: 4 }),
  ppk: decimal("ppk", { precision: 6, scale: 4 }),
  
  // Production stats
  totalProduced: int("totalProduced").default(0),
  goodCount: int("goodCount").default(0),
  defectCount: int("defectCount").default(0),
  
  // Time stats
  plannedTime: int("plannedTime").default(0), // minutes
  actualRunTime: int("actualRunTime").default(0),
  downtime: int("downtime").default(0),
  
  // Alerts and issues
  alertCount: int("alertCount").default(0),
  spcViolationCount: int("spcViolationCount").default(0),
  
  // Report status
  status: mysqlEnum("status", ["generated", "sent", "failed"]).default("generated"),
  sentAt: timestamp("sentAt"),
  sentTo: text("sentTo"), // JSON array of emails
  
  // Report content
  reportContent: text("reportContent"), // HTML content
  reportFileUrl: varchar("reportFileUrl", { length: 500 }),
  
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ShiftReport = typeof shiftReports.$inferSelect;
export type InsertShiftReport = typeof shiftReports.$inferInsert;


/**
 * Rate limit configuration - persistent storage for rate limit settings
 */
export const rateLimitConfig = mysqlTable("rate_limit_config", {
  id: int("id").autoincrement().primaryKey(),
  configKey: varchar("configKey", { length: 100 }).notNull().unique(),
  configValue: text("configValue").notNull(), // JSON value
  description: text("description"),
  updatedBy: int("updatedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type RateLimitConfig = typeof rateLimitConfig.$inferSelect;
export type InsertRateLimitConfig = typeof rateLimitConfig.$inferInsert;

/**
 * Rate limit config history - audit log for config changes
 */
export const rateLimitConfigHistory = mysqlTable("rate_limit_config_history", {
  id: int("id").autoincrement().primaryKey(),
  configKey: varchar("configKey", { length: 100 }).notNull(),
  oldValue: text("oldValue"),
  newValue: text("newValue").notNull(),
  changedBy: int("changedBy").notNull(),
  changedByName: varchar("changedByName", { length: 255 }),
  changeReason: text("changeReason"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type RateLimitConfigHistory = typeof rateLimitConfigHistory.$inferSelect;
export type InsertRateLimitConfigHistory = typeof rateLimitConfigHistory.$inferInsert;

/**
 * Rate limit role config - different limits per role
 */
export const rateLimitRoleConfig = mysqlTable("rate_limit_role_config", {
  id: int("id").autoincrement().primaryKey(),
  role: mysqlEnum("role", ["user", "admin", "guest"]).notNull().unique(),
  maxRequests: int("maxRequests").notNull().default(5000),
  maxAuthRequests: int("maxAuthRequests").notNull().default(200),
  maxExportRequests: int("maxExportRequests").notNull().default(100),
  windowMs: int("windowMs").notNull().default(900000), // 15 minutes
  description: text("description"),
  isActive: int("isActive").notNull().default(1),
  updatedBy: int("updatedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type RateLimitRoleConfig = typeof rateLimitRoleConfig.$inferSelect;
export type InsertRateLimitRoleConfig = typeof rateLimitRoleConfig.$inferInsert;



/**
 * Spare Parts Inventory Checks - kiểm kê kho phụ tùng
 */
export const sparePartsInventoryChecks = mysqlTable("spare_parts_inventory_checks", {
  id: int("id").autoincrement().primaryKey(),
  checkNumber: varchar("checkNumber", { length: 50 }).notNull(),
  checkDate: timestamp("checkDate").notNull(),
  checkType: mysqlEnum("checkType", ["full", "partial", "cycle", "spot"]).notNull().default("full"),
  status: mysqlEnum("status", ["draft", "in_progress", "completed", "cancelled"]).default("draft"),
  
  // Phạm vi kiểm kê
  warehouseLocation: varchar("warehouseLocation", { length: 100 }),
  category: varchar("category", { length: 100 }),
  
  // Kết quả
  totalItems: int("totalItems").default(0),
  checkedItems: int("checkedItems").default(0),
  matchedItems: int("matchedItems").default(0),
  discrepancyItems: int("discrepancyItems").default(0),
  
  // Giá trị
  totalSystemValue: decimal("totalSystemValue", { precision: 14, scale: 2 }),
  totalActualValue: decimal("totalActualValue", { precision: 14, scale: 2 }),
  discrepancyValue: decimal("discrepancyValue", { precision: 14, scale: 2 }),
  
  notes: text("notes"),
  completedAt: timestamp("completedAt"),
  completedBy: int("completedBy"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SparePartInventoryCheck = typeof sparePartsInventoryChecks.$inferSelect;
export type InsertSparePartInventoryCheck = typeof sparePartsInventoryChecks.$inferInsert;

/**
 * Spare Parts Inventory Check Items - chi tiết kiểm kê từng phụ tùng
 */
export const sparePartsInventoryCheckItems = mysqlTable("spare_parts_inventory_check_items", {
  id: int("id").autoincrement().primaryKey(),
  checkId: int("checkId").notNull(),
  sparePartId: int("sparePartId").notNull(),
  
  // Số lượng
  systemQuantity: int("systemQuantity").notNull(),
  actualQuantity: int("actualQuantity"),
  discrepancy: int("discrepancy"),
  
  // Giá trị
  unitPrice: decimal("unitPrice", { precision: 12, scale: 2 }),
  systemValue: decimal("systemValue", { precision: 14, scale: 2 }),
  actualValue: decimal("actualValue", { precision: 14, scale: 2 }),
  
  // Trạng thái
  status: mysqlEnum("status", ["pending", "counted", "verified", "adjusted"]).default("pending"),
  
  // Ghi chú
  notes: text("notes"),
  countedBy: int("countedBy"),
  countedAt: timestamp("countedAt"),
  verifiedBy: int("verifiedBy"),
  verifiedAt: timestamp("verifiedAt"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SparePartInventoryCheckItem = typeof sparePartsInventoryCheckItems.$inferSelect;
export type InsertSparePartInventoryCheckItem = typeof sparePartsInventoryCheckItems.$inferInsert;

/**
 * Spare Parts Stock Movements - lịch sử di chuyển tồn kho
 */
export const sparePartsStockMovements = mysqlTable("spare_parts_stock_movements", {
  id: int("id").autoincrement().primaryKey(),
  sparePartId: int("sparePartId").notNull(),
  movementType: mysqlEnum("movementType", [
    "purchase_in",      // Nhập mua
    "return_in",        // Nhập trả
    "transfer_in",      // Nhập chuyển kho
    "adjustment_in",    // Điều chỉnh tăng
    "initial_in",       // Nhập đầu kỳ
    "work_order_out",   // Xuất cho work order
    "transfer_out",     // Xuất chuyển kho
    "adjustment_out",   // Điều chỉnh giảm
    "scrap_out",        // Xuất hủy
    "return_supplier"   // Trả nhà cung cấp
  ]).notNull(),
  
  // Số lượng
  quantity: int("quantity").notNull(),
  beforeQuantity: int("beforeQuantity").notNull(),
  afterQuantity: int("afterQuantity").notNull(),
  
  // Giá trị
  unitCost: decimal("unitCost", { precision: 12, scale: 2 }),
  totalCost: decimal("totalCost", { precision: 14, scale: 2 }),
  
  // Liên kết
  referenceType: varchar("referenceType", { length: 50 }), // purchase_order, work_order, inventory_check, etc.
  referenceId: int("referenceId"),
  referenceNumber: varchar("referenceNumber", { length: 100 }),
  
  // Vị trí
  fromLocation: varchar("fromLocation", { length: 100 }),
  toLocation: varchar("toLocation", { length: 100 }),
  
  reason: text("reason"),
  performedBy: int("performedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SparePartStockMovement = typeof sparePartsStockMovements.$inferSelect;
export type InsertSparePartStockMovement = typeof sparePartsStockMovements.$inferInsert;

/**
 * NTF Alert Configuration - cấu hình cảnh báo NTF rate
 */
export const ntfAlertConfig = mysqlTable("ntf_alert_config", {
  id: int("id").autoincrement().primaryKey(),
  
  // Ngưỡng cảnh báo
  warningThreshold: decimal("warningThreshold", { precision: 5, scale: 2 }).default("20.00"), // 20%
  criticalThreshold: decimal("criticalThreshold", { precision: 5, scale: 2 }).default("30.00"), // 30%
  
  // Email nhận cảnh báo (JSON array)
  alertEmails: text("alertEmails"), // ["email1@example.com", "email2@example.com"]
  
  // Bật/tắt cảnh báo
  enabled: boolean("enabled").default(true),
  
  // Tần suất kiểm tra (phút)
  checkIntervalMinutes: int("checkIntervalMinutes").default(60), // Mặc định 1 giờ
  
  // Cooldown giữa các cảnh báo (phút)
  cooldownMinutes: int("cooldownMinutes").default(120), // 2 giờ
  
  // Lần cảnh báo cuối
  lastAlertAt: timestamp("lastAlertAt"),
  lastAlertNtfRate: decimal("lastAlertNtfRate", { precision: 5, scale: 2 }),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type NtfAlertConfig = typeof ntfAlertConfig.$inferSelect;
export type InsertNtfAlertConfig = typeof ntfAlertConfig.$inferInsert;

/**
 * NTF Alert History - lịch sử cảnh báo NTF
 */
export const ntfAlertHistory = mysqlTable("ntf_alert_history", {
  id: int("id").autoincrement().primaryKey(),
  
  // Thông tin cảnh báo
  ntfRate: decimal("ntfRate", { precision: 5, scale: 2 }).notNull(),
  totalDefects: int("totalDefects").notNull(),
  ntfCount: int("ntfCount").notNull(),
  realNgCount: int("realNgCount").notNull(),
  pendingCount: int("pendingCount").notNull(),
  
  // Loại cảnh báo
  alertType: mysqlEnum("alertType", ["warning", "critical"]).notNull(),
  
  // Trạng thái gửi
  emailSent: boolean("emailSent").default(false),
  emailSentAt: timestamp("emailSentAt"),
  emailRecipients: text("emailRecipients"), // JSON array
  
  // Thời gian
  periodStart: timestamp("periodStart").notNull(),
  periodEnd: timestamp("periodEnd").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type NtfAlertHistory = typeof ntfAlertHistory.$inferSelect;
export type InsertNtfAlertHistory = typeof ntfAlertHistory.$inferInsert;

/**
 * NTF Report Schedule - lịch gửi báo cáo NTF định kỳ
 */
export const ntfReportSchedule = mysqlTable("ntf_report_schedule", {
  id: int("id").autoincrement().primaryKey(),
  
  // Tên lịch
  name: varchar("name", { length: 200 }).notNull(),
  
  // Loại báo cáo
  reportType: mysqlEnum("reportType", ["daily", "weekly", "monthly"]).notNull(),
  
  // Thời gian gửi (giờ trong ngày, 0-23)
  sendHour: int("sendHour").default(8), // 8:00 AM
  
  // Ngày gửi (cho weekly: 0-6 = CN-T7, cho monthly: 1-28)
  sendDay: int("sendDay"),
  
  // Email nhận báo cáo (JSON array)
  recipients: text("recipients").notNull(), // ["email1@example.com"]
  
  // Bật/tắt
  enabled: boolean("enabled").default(true),
  
  // Lần gửi cuối
  lastSentAt: timestamp("lastSentAt"),
  lastSentStatus: mysqlEnum("lastSentStatus", ["success", "failed"]),
  lastSentError: text("lastSentError"),
  
  // Metadata
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type NtfReportSchedule = typeof ntfReportSchedule.$inferSelect;
export type InsertNtfReportSchedule = typeof ntfReportSchedule.$inferInsert;


/**
 * SPC Plan Templates - mẫu kế hoạch SPC để tái sử dụng
 */
export const spcPlanTemplates = mysqlTable("spc_plan_templates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  measurementName: varchar("measurementName", { length: 255 }),
  usl: decimal("usl", { precision: 15, scale: 6 }),
  lsl: decimal("lsl", { precision: 15, scale: 6 }),
  target: decimal("target", { precision: 15, scale: 6 }),
  unit: varchar("unit", { length: 50 }),
  sampleSize: int("sampleSize").default(5),
  sampleFrequency: int("sampleFrequency").default(60),
  enabledSpcRules: text("enabledSpcRules"),
  enabledCpkRules: text("enabledCpkRules"),
  enabledCaRules: text("enabledCaRules"),
  isRecurring: int("isRecurring").default(1),
  notifyOnViolation: int("notifyOnViolation").default(1),
  createdBy: int("createdBy"),
  isPublic: int("isPublic").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SpcPlanTemplate = typeof spcPlanTemplates.$inferSelect;
export type InsertSpcPlanTemplate = typeof spcPlanTemplates.$inferInsert;


/**
 * User Prediction Configs - Lưu cấu hình dự báo theo user
 */
export const userPredictionConfigs = mysqlTable("user_prediction_configs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  configType: mysqlEnum("configType", ["oee", "cpk", "spc"]).notNull(), // Loại dự báo
  configName: varchar("configName", { length: 100 }).notNull(), // Tên cấu hình
  algorithm: mysqlEnum("algorithm", ["linear", "moving_avg", "exp_smoothing"]).notNull().default("linear"),
  predictionDays: int("predictionDays").notNull().default(14),
  confidenceLevel: decimal("confidenceLevel", { precision: 5, scale: 2 }).notNull().default("95.00"),
  alertThreshold: decimal("alertThreshold", { precision: 5, scale: 2 }).notNull().default("5.00"),
  movingAvgWindow: int("movingAvgWindow").default(7),
  smoothingFactor: decimal("smoothingFactor", { precision: 3, scale: 2 }).default("0.30"),
  historicalDays: int("historicalDays").notNull().default(30), // Số ngày dữ liệu lịch sử
  isDefault: int("isDefault").notNull().default(0), // Cấu hình mặc định
  isActive: int("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserPredictionConfig = typeof userPredictionConfigs.$inferSelect;
export type InsertUserPredictionConfig = typeof userPredictionConfigs.$inferInsert;


/**
 * OEE Alert Thresholds - Cấu hình ngưỡng cảnh báo OEE theo máy/dây chuyền
 */
export const oeeAlertThresholds = mysqlTable("oee_alert_thresholds", {
  id: int("id").autoincrement().primaryKey(),
  machineId: int("machineId"), // Null = áp dụng cho tất cả máy trong dây chuyền
  productionLineId: int("productionLineId"), // Null = áp dụng cho tất cả dây chuyền
  targetOee: decimal("targetOee", { precision: 5, scale: 2 }).notNull().default("85.00"),
  warningThreshold: decimal("warningThreshold", { precision: 5, scale: 2 }).notNull().default("80.00"), // Ngưỡng cảnh báo vàng
  criticalThreshold: decimal("criticalThreshold", { precision: 5, scale: 2 }).notNull().default("70.00"), // Ngưỡng cảnh báo đỏ
  dropAlertThreshold: decimal("dropAlertThreshold", { precision: 5, scale: 2 }).notNull().default("5.00"), // % giảm để cảnh báo
  relativeDropThreshold: decimal("relativeDropThreshold", { precision: 5, scale: 2 }).notNull().default("10.00"), // % giảm tương đối
  availabilityTarget: decimal("availabilityTarget", { precision: 5, scale: 2 }).default("90.00"),
  performanceTarget: decimal("performanceTarget", { precision: 5, scale: 2 }).default("95.00"),
  qualityTarget: decimal("qualityTarget", { precision: 5, scale: 2 }).default("99.00"),
  isActive: int("isActive").notNull().default(1),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OeeAlertThreshold = typeof oeeAlertThresholds.$inferSelect;
export type InsertOeeAlertThreshold = typeof oeeAlertThresholds.$inferInsert;


// ==================== Machine Integration API ====================

/**
 * API Keys for machine vendors to push data
 */
export const machineApiKeys = mysqlTable("machine_api_keys", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  apiKey: varchar("apiKey", { length: 64 }).notNull().unique(),
  apiKeyHash: varchar("apiKeyHash", { length: 255 }).notNull(), // Hashed version for security
  vendorName: varchar("vendorName", { length: 255 }).notNull(), // AOI, AVI, etc.
  machineType: varchar("machineType", { length: 100 }).notNull(), // aoi, avi, spi, etc.
  machineId: int("machineId"), // Link to specific machine if applicable
  productionLineId: int("productionLineId"), // Link to production line
  permissions: text("permissions"), // JSON array of allowed endpoints
  rateLimit: int("rateLimit").notNull().default(100), // Requests per minute
  isActive: int("isActive").notNull().default(1),
  expiresAt: timestamp("expiresAt"), // Optional expiration
  lastUsedAt: timestamp("lastUsedAt"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MachineApiKey = typeof machineApiKeys.$inferSelect;
export type InsertMachineApiKey = typeof machineApiKeys.$inferInsert;

/**
 * Log all API requests from machines
 */
export const machineDataLogs = mysqlTable("machine_data_logs", {
  id: int("id").autoincrement().primaryKey(),
  apiKeyId: int("apiKeyId").notNull(),
  endpoint: varchar("endpoint", { length: 255 }).notNull(),
  method: varchar("method", { length: 10 }).notNull(),
  requestBody: text("requestBody"), // JSON request payload
  responseStatus: int("responseStatus").notNull(),
  responseBody: text("responseBody"), // JSON response
  processingTimeMs: int("processingTimeMs"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: varchar("userAgent", { length: 500 }),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MachineDataLog = typeof machineDataLogs.$inferSelect;
export type InsertMachineDataLog = typeof machineDataLogs.$inferInsert;

/**
 * Machine integration configurations
 */
export const machineIntegrationConfigs = mysqlTable("machine_integration_configs", {
  id: int("id").autoincrement().primaryKey(),
  apiKeyId: int("apiKeyId").notNull(),
  configType: varchar("configType", { length: 50 }).notNull(), // field_mapping, webhook, etc.
  configName: varchar("configName", { length: 255 }).notNull(),
  configValue: text("configValue").notNull(), // JSON configuration
  isActive: int("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MachineIntegrationConfig = typeof machineIntegrationConfigs.$inferSelect;
export type InsertMachineIntegrationConfig = typeof machineIntegrationConfigs.$inferInsert;

/**
 * Inspection data from AOI/AVI machines
 */
export const machineInspectionData = mysqlTable("machine_inspection_data", {
  id: int("id").autoincrement().primaryKey(),
  apiKeyId: int("apiKeyId").notNull(),
  machineId: int("machineId"),
  productionLineId: int("productionLineId"),
  batchId: varchar("batchId", { length: 100 }),
  productCode: varchar("productCode", { length: 100 }),
  serialNumber: varchar("serialNumber", { length: 100 }),
  inspectionType: varchar("inspectionType", { length: 50 }).notNull(), // aoi, avi, spi, etc.
  inspectionResult: varchar("inspectionResult", { length: 20 }).notNull(), // pass, fail, rework
  defectCount: int("defectCount").default(0),
  defectTypes: text("defectTypes"), // JSON array of defect types
  defectDetails: text("defectDetails"), // JSON detailed defect info
  imageUrls: text("imageUrls"), // JSON array of image URLs
  inspectedAt: timestamp("inspectedAt").notNull(),
  cycleTimeMs: int("cycleTimeMs"),
  operatorId: varchar("operatorId", { length: 50 }),
  shiftId: varchar("shiftId", { length: 50 }),
  rawData: text("rawData"), // Original JSON from machine
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MachineInspectionData = typeof machineInspectionData.$inferSelect;
export type InsertMachineInspectionData = typeof machineInspectionData.$inferInsert;

/**
 * Measurement data from machines (for SPC)
 */
export const machineMeasurementData = mysqlTable("machine_measurement_data", {
  id: int("id").autoincrement().primaryKey(),
  apiKeyId: int("apiKeyId").notNull(),
  machineId: int("machineId"),
  productionLineId: int("productionLineId"),
  batchId: varchar("batchId", { length: 100 }),
  productCode: varchar("productCode", { length: 100 }),
  serialNumber: varchar("serialNumber", { length: 100 }),
  parameterName: varchar("parameterName", { length: 255 }).notNull(),
  parameterCode: varchar("parameterCode", { length: 100 }),
  measuredValue: decimal("measuredValue", { precision: 15, scale: 6 }).notNull(),
  unit: varchar("unit", { length: 50 }),
  lsl: decimal("lsl", { precision: 15, scale: 6 }), // Lower Spec Limit
  usl: decimal("usl", { precision: 15, scale: 6 }), // Upper Spec Limit
  target: decimal("target", { precision: 15, scale: 6 }),
  isWithinSpec: int("isWithinSpec"),
  measuredAt: timestamp("measuredAt").notNull(),
  operatorId: varchar("operatorId", { length: 50 }),
  shiftId: varchar("shiftId", { length: 50 }),
  rawData: text("rawData"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MachineMeasurementData = typeof machineMeasurementData.$inferSelect;
export type InsertMachineMeasurementData = typeof machineMeasurementData.$inferInsert;

/**
 * OEE data from machines
 */
export const machineOeeData = mysqlTable("machine_oee_data", {
  id: int("id").autoincrement().primaryKey(),
  apiKeyId: int("apiKeyId").notNull(),
  machineId: int("machineId"),
  productionLineId: int("productionLineId"),
  shiftId: varchar("shiftId", { length: 50 }),
  recordDate: varchar("recordDate", { length: 10 }).notNull(), // YYYY-MM-DD
  plannedProductionTime: int("plannedProductionTime"), // minutes
  actualProductionTime: int("actualProductionTime"), // minutes
  downtime: int("downtime"), // minutes
  downtimeReasons: text("downtimeReasons"), // JSON array
  idealCycleTime: decimal("idealCycleTime", { precision: 10, scale: 4 }), // seconds
  actualCycleTime: decimal("actualCycleTime", { precision: 10, scale: 4 }),
  totalCount: int("totalCount"),
  goodCount: int("goodCount"),
  rejectCount: int("rejectCount"),
  reworkCount: int("reworkCount"),
  availability: decimal("availability", { precision: 5, scale: 2 }),
  performance: decimal("performance", { precision: 5, scale: 2 }),
  quality: decimal("quality", { precision: 5, scale: 2 }),
  oee: decimal("oee", { precision: 5, scale: 2 }),
  recordedAt: timestamp("recordedAt").notNull(),
  rawData: text("rawData"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MachineOeeData = typeof machineOeeData.$inferSelect;
export type InsertMachineOeeData = typeof machineOeeData.$inferInsert;


// ==================== Machine Webhook Configs ====================
export const machineWebhookConfigs = mysqlTable("machine_webhook_configs", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  webhookUrl: varchar("webhookUrl", { length: 500 }).notNull(),
  webhookSecret: varchar("webhookSecret", { length: 255 }),
  triggerType: mysqlEnum("triggerType", ["inspection_fail", "oee_low", "measurement_out_of_spec", "all"]).notNull(),
  machineIds: text("machineIds"), // JSON array of machine IDs, null = all machines
  oeeThreshold: decimal("oeeThreshold", { precision: 5, scale: 2 }), // Trigger when OEE below this
  isActive: int("isActive").notNull().default(1),
  retryCount: int("retryCount").notNull().default(3),
  retryDelaySeconds: int("retryDelaySeconds").notNull().default(60),
  headers: text("headers"), // JSON object for custom headers
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MachineWebhookConfig = typeof machineWebhookConfigs.$inferSelect;
export type InsertMachineWebhookConfig = typeof machineWebhookConfigs.$inferInsert;

// ==================== Machine Webhook Logs ====================
export const machineWebhookLogs = mysqlTable("machine_webhook_logs", {
  id: int("id").autoincrement().primaryKey(),
  webhookConfigId: int("webhookConfigId").notNull(),
  triggerType: varchar("triggerType", { length: 50 }).notNull(),
  triggerDataId: int("triggerDataId"), // ID of the data that triggered webhook
  requestPayload: text("requestPayload"),
  responseStatus: int("responseStatus"),
  responseBody: text("responseBody"),
  responseTime: int("responseTime"), // milliseconds
  attempt: int("attempt").notNull().default(1),
  status: mysqlEnum("status", ["pending", "success", "failed", "retrying"]).notNull().default("pending"),
  errorMessage: text("errorMessage"),
  triggeredAt: timestamp("triggeredAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type MachineWebhookLog = typeof machineWebhookLogs.$inferSelect;
export type InsertMachineWebhookLog = typeof machineWebhookLogs.$inferInsert;

// ==================== Machine Field Mappings ====================
export const machineFieldMappings = mysqlTable("machine_field_mappings", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  apiKeyId: int("apiKeyId"), // Specific to API key, null = global
  machineType: varchar("machineType", { length: 100 }), // AOI, AVI, CMM, etc.
  sourceField: varchar("sourceField", { length: 200 }).notNull(), // Field name from machine data
  targetField: varchar("targetField", { length: 200 }).notNull(), // Field name in SPC system
  targetTable: mysqlEnum("targetTable", ["measurements", "inspection_data", "oee_records"]).notNull(),
  transformType: mysqlEnum("transformType", ["direct", "multiply", "divide", "add", "subtract", "custom"]).notNull().default("direct"),
  transformValue: decimal("transformValue", { precision: 15, scale: 6 }), // Value for transform
  customTransform: text("customTransform"), // Custom JS expression
  defaultValue: varchar("defaultValue", { length: 255 }), // Default if source is null
  isRequired: int("isRequired").notNull().default(0),
  isActive: int("isActive").notNull().default(1),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MachineFieldMapping = typeof machineFieldMappings.$inferSelect;
export type InsertMachineFieldMapping = typeof machineFieldMappings.$inferInsert;

// ==================== Machine Realtime Events (for SSE) ====================
export const machineRealtimeEvents = mysqlTable("machine_realtime_events", {
  id: int("id").autoincrement().primaryKey(),
  eventType: mysqlEnum("eventType", ["inspection", "measurement", "oee", "alert", "status"]).notNull(),
  machineId: int("machineId"),
  machineName: varchar("machineName", { length: 200 }),
  apiKeyId: int("apiKeyId"),
  eventData: text("eventData").notNull(), // JSON data
  severity: mysqlEnum("severity", ["info", "warning", "error", "critical"]).notNull().default("info"),
  isProcessed: int("isProcessed").notNull().default(0),
  processedAt: timestamp("processedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MachineRealtimeEvent = typeof machineRealtimeEvents.$inferSelect;
export type InsertMachineRealtimeEvent = typeof machineRealtimeEvents.$inferInsert;


// OEE Alert Configurations
export const oeeAlertConfigs = mysqlTable("oee_alert_configs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  machineId: int("machine_id"), // null = all machines
  oeeThreshold: decimal("oee_threshold", { precision: 5, scale: 2 }).notNull(), // e.g., 85.00
  consecutiveDays: int("consecutive_days").notNull().default(3), // trigger after N days
  recipients: text("recipients").notNull(), // JSON array of emails
  isActive: int("is_active").notNull().default(1),
  lastTriggeredAt: timestamp("last_triggered_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type OeeAlertConfig = typeof oeeAlertConfigs.$inferSelect;
export type InsertOeeAlertConfig = typeof oeeAlertConfigs.$inferInsert;

// OEE Alert History
export const oeeAlertHistory = mysqlTable("oee_alert_history", {
  id: int("id").autoincrement().primaryKey(),
  alertConfigId: int("alert_config_id").notNull(),
  machineId: int("machine_id"),
  machineName: varchar("machine_name", { length: 255 }),
  oeeValue: decimal("oee_value", { precision: 5, scale: 2 }).notNull(),
  consecutiveDaysBelow: int("consecutive_days_below").notNull(),
  recipients: text("recipients").notNull(),
  emailSent: int("email_sent").notNull().default(0),
  emailSentAt: timestamp("email_sent_at"),
  acknowledged: int("acknowledged").notNull().default(0),
  acknowledgedAt: timestamp("acknowledged_at"),
  acknowledgedBy: varchar("acknowledged_by", { length: 255 }),
  resolved: int("resolved").notNull().default(0),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: varchar("resolved_by", { length: 255 }),
  resolution: text("resolution"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type OeeAlertHistory = typeof oeeAlertHistory.$inferSelect;
export type InsertOeeAlertHistory = typeof oeeAlertHistory.$inferInsert;

// OEE Report Schedules
export const oeeReportSchedules = mysqlTable("oee_report_schedules", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  frequency: mysqlEnum("frequency", ["weekly", "monthly"]).notNull(),
  dayOfWeek: int("day_of_week"), // 0-6 for weekly (0=Sunday)
  dayOfMonth: int("day_of_month"), // 1-31 for monthly
  hour: int("hour").notNull().default(8), // Hour to send (0-23)
  machineIds: text("machine_ids"), // JSON array, null = all machines
  recipients: text("recipients").notNull(), // JSON array of emails
  includeCharts: int("include_charts").notNull().default(1),
  includeTrend: int("include_trend").notNull().default(1),
  includeComparison: int("include_comparison").notNull().default(1),
  isActive: int("is_active").notNull().default(1),
  lastSentAt: timestamp("last_sent_at"),
  nextScheduledAt: timestamp("next_scheduled_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type OeeReportSchedule = typeof oeeReportSchedules.$inferSelect;
export type InsertOeeReportSchedule = typeof oeeReportSchedules.$inferInsert;

// OEE Report History
export const oeeReportHistory = mysqlTable("oee_report_history", {
  id: int("id").autoincrement().primaryKey(),
  scheduleId: int("schedule_id").notNull(),
  reportPeriodStart: timestamp("report_period_start").notNull(),
  reportPeriodEnd: timestamp("report_period_end").notNull(),
  recipients: text("recipients").notNull(),
  reportData: text("report_data"), // JSON summary
  emailSent: int("email_sent").notNull().default(0),
  emailSentAt: timestamp("email_sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type OeeReportHistory = typeof oeeReportHistory.$inferSelect;
export type InsertOeeReportHistory = typeof oeeReportHistory.$inferInsert;

// Downtime Reasons (for Pareto analysis)
export const downtimeReasons = mysqlTable("downtime_reasons", {
  id: int("id").autoincrement().primaryKey(),
  machineId: int("machine_id"),
  oeeDataId: int("oee_data_id"),
  reasonCode: varchar("reason_code", { length: 50 }).notNull(),
  reasonCategory: varchar("reason_category", { length: 100 }), // e.g., "Equipment", "Material", "Labor"
  reasonDescription: varchar("reason_description", { length: 500 }),
  durationMinutes: int("duration_minutes").notNull(),
  occurredAt: timestamp("occurred_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type DowntimeReason = typeof downtimeReasons.$inferSelect;
export type InsertDowntimeReason = typeof downtimeReasons.$inferInsert;
