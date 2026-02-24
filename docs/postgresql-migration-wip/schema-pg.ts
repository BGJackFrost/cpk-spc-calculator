import { integer, pgEnum, pgTable, text, timestamp, varchar, numeric, jsonb, boolean, serial, decimal } from "drizzle-orm/pg-core";

/**
 * Core user table backing auth flow.
 */

// PostgreSQL Enum Types
export const roleEnum = pgEnum("role", ["user", "manager", "admin"]);
export const authTypeEnum = pgEnum("authType", ["local", "manus", "online"]);
export const eventTypeEnum = pgEnum("eventType", ["login", "logout", "login_failed", "status", "data_received", "error", "webhook_triggered", "alert", "measurement", "inspection", "oee"]);
export const userTypeEnum = pgEnum("userType", ["manus", "local", "online"]);
export const entityTypeEnum = pgEnum("entityType", ["purchase_order", "stock_export", "maintenance_request", "leave_request"]);
export const approverTypeEnum = pgEnum("approverType", ["position", "user", "manager", "department_head"]);
export const statusEnum = pgEnum("status", ["pending", "approved", "rejected", "cancelled", "active", "inactive", "draft", "normal", "generated", "offline", "sent", "failed", "received", "completed", "in_progress", "scheduled", "running", "stopped", "error", "success", "warning", "critical", "idle", "maintenance", "high", "low", "medium", "partial_received", "ordered"]);
export const actionEnum = pgEnum("action", ["approved", "rejected", "returned"]);
export const systemTypeEnum = pgEnum("systemType", ["mms", "spc", "system", "common"]);
export const actionTypeEnum = pgEnum("actionType", ["view", "create", "edit", "delete", "export", "import", "approve", "manage"]);
export const categoryEnum = pgEnum("category", ["production", "quality", "maintenance", "management", "system", "preventive", "corrective"]);
export const timeUnitEnum = pgEnum("timeUnit", ["year", "month", "week", "day", "hour", "minute", "second"]);
export const intervalUnitEnum = pgEnum("intervalUnit", ["year", "month", "week", "day", "hour", "minute", "second"]);
export const layoutEnum = pgEnum("layout", ["grid", "list"]);
export const severityEnum = pgEnum("severity", ["info", "low", "medium", "warning", "critical"]);
export const notifyFrequencyEnum = pgEnum("notifyFrequency", ["immediate", "hourly", "daily"]);
export const periodTypeEnum = pgEnum("periodType", ["shift", "day", "week", "month"]);
export const overallStatusEnum = pgEnum("overallStatus", ["excellent", "good", "acceptable", "needs_improvement", "critical"]);
export const systemEnum = pgEnum("system", ["SPC", "MMS", "COMMON"]);
export const verificationStatusEnum = pgEnum("verificationStatus", ["pending", "real_ng", "ntf"]);
export const licenseTypeEnum = pgEnum("licenseType", ["trial", "standard", "professional", "enterprise"]);
export const licenseStatusEnum = pgEnum("licenseStatus", ["pending", "active", "expired", "revoked"]);
export const activationModeEnum = pgEnum("activationMode", ["online", "offline", "hybrid"]);
export const webhookTypeEnum = pgEnum("webhookType", ["slack", "teams", "custom"]);
export const backupTypeEnum = pgEnum("backupType", ["daily", "weekly", "manual"]);
export const storageLocationEnum = pgEnum("storageLocation", ["s3", "local"]);
export const ruleTypeEnum = pgEnum("ruleType", [
    "range_check",      // Kiểm tra giá trị trong khoảng
    "trend_check",      // Kiểm tra xu hướng
    "pattern_check",    // Kiểm tra mẫu
    "comparison_check", // So sánh với giá trị khác
    "formula_check",    // Kiểm tra theo công thức
    "custom_script"     // Script tùy chỉnh
  ]);
export const actionOnViolationEnum = pgEnum("actionOnViolation", [
    "warning",    // Cảnh báo
    "alert",      // Gửi thông báo
    "reject",     // Từ chối dữ liệu
    "log_only"    // Chỉ ghi log
  ]);
export const connectionTypeEnum = pgEnum("connectionType", ["database", "opcua", "api", "file", "mqtt"]);
export const alertTypeEnum = pgEnum("alertType", ["out_of_spec", "out_of_control", "rule_violation", "connection_lost"]);
export const spcRuleSeverityEnum = pgEnum("spcRuleSeverity", ["warning", "critical"]);
export const typeEnum = pgEnum("type", ["factory", "line", "zone", "area"]);
export const defaultPriorityEnum = pgEnum("defaultPriority", ["low", "medium", "high", "critical"]);
export const skillLevelEnum = pgEnum("skillLevel", ["junior", "intermediate", "senior", "expert"]);
export const frequencyEnum = pgEnum("frequency", ["daily", "weekly", "biweekly", "monthly", "quarterly", "biannually", "annually", "custom"]);
export const priorityEnum = pgEnum("priority", ["low", "medium", "high", "critical"]);
export const transactionTypeEnum = pgEnum("transactionType", ["in", "out", "adjustment", "return"]);
export const exportPurposeEnum = pgEnum("exportPurpose", ["repair", "borrow", "destroy", "normal"]);
export const returnStatusEnum = pgEnum("returnStatus", ["pending", "partial", "completed"]);
export const qualityStatusEnum = pgEnum("qualityStatus", ["good", "damaged", "rejected"]);
export const modelTypeEnum = pgEnum("modelType", ["rul", "anomaly", "failure", "degradation"]);
export const predictionTypeEnum = pgEnum("predictionType", ["rul", "failure_probability", "anomaly_score", "health_index"]);
export const reportTypeEnum = pgEnum("reportType", ["oee_daily", "oee_weekly", "oee_monthly", "maintenance_daily", "maintenance_weekly", "maintenance_monthly", "combined_weekly", "combined_monthly"]);
export const scheduleEnum = pgEnum("schedule", ["daily", "weekly", "monthly"]);
export const shiftTypeEnum = pgEnum("shiftType", ["morning", "afternoon", "night"]);
export const checkTypeEnum = pgEnum("checkType", ["full", "partial", "cycle", "spot"]);
export const movementTypeEnum = pgEnum("movementType", [
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
  ]);
export const lastSentStatusEnum = pgEnum("lastSentStatus", ["success", "failed"]);
export const configTypeEnum = pgEnum("configType", ["oee", "cpk", "spc"]);
export const algorithmEnum = pgEnum("algorithm", ["linear", "moving_avg", "exp_smoothing"]);
export const triggerTypeEnum = pgEnum("triggerType", ["inspection_fail", "oee_low", "measurement_out_of_spec", "all"]);
export const targetTableEnum = pgEnum("targetTable", ["measurements", "inspection_data", "oee_records"]);
export const transformTypeEnum = pgEnum("transformType", ["direct", "multiply", "divide", "add", "subtract", "custom"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  avatar: varchar("avatar", { length: 500 }), // URL ảnh đại diện
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Local users for offline authentication
 */
export const localUsers = pgTable("local_users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  avatar: varchar("avatar", { length: 500 }), // URL ảnh đại diện
  role: roleEnum("role").default("user").notNull(),
  isActive: integer("isActive").notNull().default(1),
  mustChangePassword: integer("mustChangePassword").notNull().default(1), // Force password change on first login
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn"),
});

export type LocalUser = typeof localUsers.$inferSelect;
export type InsertLocalUser = typeof localUsers.$inferInsert;

/**
 * Login history - tracks user login/logout events for audit
 */
export const loginHistory = pgTable("login_history", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  username: varchar("username", { length: 100 }).notNull(),
  authType: authTypeEnum("authType").notNull().default("local"),
  eventType: eventTypeEnum("eventType").notNull(),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LoginHistory = typeof loginHistory.$inferSelect;
export type InsertLoginHistory = typeof loginHistory.$inferInsert;

/**
 * Companies - Công ty
 */
export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address"),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 320 }),
  taxCode: varchar("taxCode", { length: 50 }),
  logo: varchar("logo", { length: 500 }),
  isActive: integer("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Company = typeof companies.$inferSelect;
export type InsertCompany = typeof companies.$inferInsert;

/**
 * Departments - Phòng ban
 */
export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  companyId: integer("companyId").notNull(),
  code: varchar("code", { length: 50 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  parentId: integer("parentId"), // Phòng ban cha (cho cấu trúc cây)
  managerId: integer("managerId"), // Trưởng phòng
  isActive: integer("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Department = typeof departments.$inferSelect;
export type InsertDepartment = typeof departments.$inferInsert;

/**
 * Teams - Nhóm/Tổ
 */
export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  departmentId: integer("departmentId").notNull(),
  code: varchar("code", { length: 50 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  leaderId: integer("leaderId"), // Trưởng nhóm
  isActive: integer("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Team = typeof teams.$inferSelect;
export type InsertTeam = typeof teams.$inferInsert;

/**
 * Positions - Chức vụ
 */
export const positions = pgTable("positions", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  level: integer("level").notNull().default(1), // Cấp bậc (1-10, 1 là cao nhất)
  canApprove: integer("canApprove").notNull().default(0), // Có quyền phê duyệt
  approvalLimit: decimal("approvalLimit", { precision: 15, scale: 2 }), // Hạn mức phê duyệt (VND)
  isActive: integer("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Position = typeof positions.$inferSelect;
export type InsertPosition = typeof positions.$inferInsert;

/**
 * Employee Profiles - Thông tin nhân viên mở rộng
 */
export const employeeProfiles = pgTable("employee_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(), // Liên kết với users hoặc localUsers
  userType: userTypeEnum("userType").notNull().default("local"),
  employeeCode: varchar("employeeCode", { length: 50 }).unique(),
  companyId: integer("companyId"),
  departmentId: integer("departmentId"),
  teamId: integer("teamId"),
  positionId: integer("positionId"),
  managerId: integer("managerId"), // Quản lý trực tiếp
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  dateOfBirth: timestamp("dateOfBirth"),
  joinDate: timestamp("joinDate"),
  isActive: integer("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type EmployeeProfile = typeof employeeProfiles.$inferSelect;
export type InsertEmployeeProfile = typeof employeeProfiles.$inferInsert;

/**
 * Approval Workflows - Quy trình phê duyệt
 */
export const approvalWorkflows = pgTable("approval_workflows", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  entityType: entityTypeEnum("entityType").notNull(),
  isActive: integer("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type ApprovalWorkflow = typeof approvalWorkflows.$inferSelect;
export type InsertApprovalWorkflow = typeof approvalWorkflows.$inferInsert;

/**
 * Approval Steps - Các bước phê duyệt
 */
export const approvalSteps = pgTable("approval_steps", {
  id: serial("id").primaryKey(),
  workflowId: integer("workflowId").notNull(),
  stepOrder: integer("stepOrder").notNull(), // Thứ tự bước
  name: varchar("name", { length: 255 }).notNull(),
  approverType: approverTypeEnum("approverType").notNull(),
  approverId: integer("approverId"), // ID của position hoặc user tùy theo approverType
  minAmount: decimal("minAmount", { precision: 15, scale: 2 }), // Giá trị tối thiểu cần bước này
  maxAmount: decimal("maxAmount", { precision: 15, scale: 2 }), // Giá trị tối đa cần bước này
  isRequired: integer("isRequired").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ApprovalStep = typeof approvalSteps.$inferSelect;
export type InsertApprovalStep = typeof approvalSteps.$inferInsert;

/**
 * Approval Requests - Yêu cầu phê duyệt
 */
export const approvalRequests = pgTable("approval_requests", {
  id: serial("id").primaryKey(),
  workflowId: integer("workflowId").notNull(),
  entityType: entityTypeEnum("entityType").notNull(),
  entityId: integer("entityId").notNull(), // ID của đơn hàng, phiếu xuất, etc.
  requesterId: integer("requesterId").notNull(), // Người yêu cầu
  currentStepId: integer("currentStepId"), // Bước hiện tại
  status: statusEnum("status").notNull().default("pending"),
  totalAmount: decimal("totalAmount", { precision: 15, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type ApprovalRequest = typeof approvalRequests.$inferSelect;
export type InsertApprovalRequest = typeof approvalRequests.$inferInsert;

/**
 * Approval Histories - Lịch sử phê duyệt
 */
export const approvalHistories = pgTable("approval_histories", {
  id: serial("id").primaryKey(),
  requestId: integer("requestId").notNull(),
  stepId: integer("stepId").notNull(),
  approverId: integer("approverId").notNull(),
  action: actionEnum("action").notNull(),
  comments: text("comments"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ApprovalHistory = typeof approvalHistories.$inferSelect;
export type InsertApprovalHistory = typeof approvalHistories.$inferInsert;

/**
 * System Modules - Lưu trữ các module trong hệ thống
 */
export const systemModules = pgTable("system_modules", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  systemType: systemTypeEnum("systemType").notNull().default("common"),
  parentId: integer("parentId"), // Hỗ trợ cấu trúc cây module
  icon: varchar("icon", { length: 100 }),
  path: varchar("path", { length: 255 }), // Route path
  sortOrder: integer("sortOrder").notNull().default(0),
  isActive: integer("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type SystemModule = typeof systemModules.$inferSelect;
export type InsertSystemModule = typeof systemModules.$inferInsert;

/**
 * Module Permissions - Các quyền của từng module
 */
export const modulePermissions = pgTable("module_permissions", {
  id: serial("id").primaryKey(),
  moduleId: integer("moduleId").notNull(),
  code: varchar("code", { length: 100 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  actionType: actionTypeEnum("actionType").notNull().default("view"),
  isActive: integer("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ModulePermission = typeof modulePermissions.$inferSelect;
export type InsertModulePermission = typeof modulePermissions.$inferInsert;

/**
 * Role Module Permissions - Gán quyền cho vai trò theo module
 */
export const roleModulePermissions = pgTable("role_module_permissions", {
  id: serial("id").primaryKey(),
  roleId: integer("roleId").notNull(),
  permissionId: integer("permissionId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RoleModulePermission = typeof roleModulePermissions.$inferSelect;
export type InsertRoleModulePermission = typeof roleModulePermissions.$inferInsert;

/**
 * Role templates - predefined permission sets for quick role assignment
 */
export const roleTemplates = pgTable("role_templates", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: categoryEnum("category").notNull().default("production"),
  permissionIds: text("permissionIds").notNull(), // JSON array of permission IDs
  isDefault: integer("isDefault").notNull().default(0), // Built-in templates
  isActive: integer("isActive").notNull().default(1),
  createdBy: integer("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type RoleTemplate = typeof roleTemplates.$inferSelect;
export type InsertRoleTemplate = typeof roleTemplates.$inferInsert;

/**
 * Database connections - stores external database connection strings
 * Supports multiple database types: mysql, sqlserver, oracle, postgres, access, excel
 */
export const databaseConnections = pgTable("database_connections", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  // Database type: mysql, sqlserver, oracle, postgres, access, excel
  databaseType: varchar("databaseType", { length: 50 }).notNull().default("mysql"),
  // Connection details (encrypted)
  host: varchar("host", { length: 255 }),
  port: integer("port"),
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
  isActive: integer("isActive").notNull().default(1),
  createdBy: integer("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type DatabaseConnection = typeof databaseConnections.$inferSelect;
export type InsertDatabaseConnection = typeof databaseConnections.$inferInsert;

/**
 * Product-Station Mapping - maps product codes and stations to specific database tables
 */
export const productStationMappings = pgTable("product_station_mappings", {
  id: serial("id").primaryKey(),
  productCode: varchar("productCode", { length: 100 }).notNull(),
  stationName: varchar("stationName", { length: 100 }).notNull(),
  connectionId: integer("connectionId").notNull(),
  tableName: varchar("tableName", { length: 255 }).notNull(),
  productCodeColumn: varchar("productCodeColumn", { length: 100 }).notNull().default("product_code"),
  stationColumn: varchar("stationColumn", { length: 100 }).notNull().default("station"),
  valueColumn: varchar("valueColumn", { length: 100 }).notNull().default("value"),
  timestampColumn: varchar("timestampColumn", { length: 100 }).notNull().default("timestamp"),
  usl: integer("usl"),
  lsl: integer("lsl"),
  target: integer("target"),
  filterConditions: text("filterConditions"), // JSON array of filter conditions
  isActive: integer("isActive").notNull().default(1),
  createdBy: integer("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type ProductStationMapping = typeof productStationMappings.$inferSelect;
export type InsertProductStationMapping = typeof productStationMappings.$inferInsert;

/**
 * SPC Analysis History - stores historical SPC/CPK analysis results
 */
export const spcAnalysisHistory = pgTable("spc_analysis_history", {
  id: serial("id").primaryKey(),
  mappingId: integer("mappingId").notNull(),
  productCode: varchar("productCode", { length: 100 }).notNull(),
  stationName: varchar("stationName", { length: 100 }).notNull(),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  sampleCount: integer("sampleCount").notNull(),
  mean: integer("mean").notNull(),
  stdDev: integer("stdDev").notNull(),
  cp: integer("cp"),
  cpk: integer("cpk"),
  ucl: integer("ucl"),
  lcl: integer("lcl"),
  usl: integer("usl"),
  lsl: integer("lsl"),
  alertTriggered: integer("alertTriggered").notNull().default(0),
  llmAnalysis: text("llmAnalysis"),
  analyzedBy: integer("analyzedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SpcAnalysisHistory = typeof spcAnalysisHistory.$inferSelect;
export type InsertSpcAnalysisHistory = typeof spcAnalysisHistory.$inferInsert;

/**
 * Alert Settings - configures CPK thresholds for notifications
 */
export const alertSettings = pgTable("alert_settings", {
  id: serial("id").primaryKey(),
  mappingId: integer("mappingId"),
  cpkWarningThreshold: integer("cpkWarningThreshold").notNull().default(133),
  cpkCriticalThreshold: integer("cpkCriticalThreshold").notNull().default(100),
  notifyOwner: integer("notifyOwner").notNull().default(1),
  isActive: integer("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type AlertSetting = typeof alertSettings.$inferSelect;
export type InsertAlertSetting = typeof alertSettings.$inferInsert;


/**
 * Production Lines - dây chuyền sản xuất
 */
export const productionLines = pgTable("production_lines", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 100 }).notNull().unique(),
  description: text("description"),
  location: varchar("location", { length: 255 }),
  imageUrl: varchar("imageUrl", { length: 500 }), // Ảnh dây chuyền
  // New fields for improved production line management
  productId: integer("productId"), // Sản phẩm sản xuất trên dây chuyền
  processTemplateId: integer("processTemplateId"), // Quy trình sản xuất
  supervisorId: integer("supervisorId"), // Người phụ trách
  isActive: integer("isActive").notNull().default(1),
  createdBy: integer("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type ProductionLine = typeof productionLines.$inferSelect;
export type InsertProductionLine = typeof productionLines.$inferInsert;

/**
 * Workstations - công trạm thuộc dây chuyền
 */
export const workstations = pgTable("workstations", {
  id: serial("id").primaryKey(),
  productionLineId: integer("productionLineId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 100 }).notNull(),
  description: text("description"),
  imageUrl: varchar("imageUrl", { length: 500 }), // Ảnh công trạm
  sequenceOrder: integer("sequenceOrder").notNull().default(0),
  cycleTime: integer("cycleTime"), // in seconds
  isActive: integer("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Workstation = typeof workstations.$inferSelect;
export type InsertWorkstation = typeof workstations.$inferInsert;

/**
 * Machines - máy móc thuộc công trạm
 */
export const machines = pgTable("machines", {
  id: serial("id").primaryKey(),
  workstationId: integer("workstationId").notNull(),
  machineTypeId: integer("machineTypeId"), // FK to machine_types
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 100 }).notNull(),
  machineType: varchar("machineType", { length: 100 }), // Legacy field, use machineTypeId instead
  manufacturer: varchar("manufacturer", { length: 255 }),
  model: varchar("model", { length: 255 }),
  serialNumber: varchar("serialNumber", { length: 255 }),
  imageUrl: varchar("imageUrl", { length: 500 }), // Ảnh máy
  installDate: timestamp("installDate"),
  status: statusEnum("status").default("active").notNull(),
  isActive: integer("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Machine = typeof machines.$inferSelect;
export type InsertMachine = typeof machines.$inferInsert;

/**
 * Machine BOM (Bill of Materials) - Danh sách phụ tùng cần thiết cho máy
 */
export const machineBom = pgTable("machine_bom", {
  id: serial("id").primaryKey(),
  machineId: integer("machineId").notNull(),
  sparePartId: integer("sparePartId").notNull(),
  quantity: integer("quantity").notNull().default(1), // Số lượng cần thiết
  isRequired: integer("isRequired").notNull().default(1), // Bắt buộc hay tùy chọn
  replacementInterval: integer("replacementInterval"), // Chu kỳ thay thế (ngày)
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type MachineBom = typeof machineBom.$inferSelect;
export type InsertMachineBom = typeof machineBom.$inferInsert;

/**
 * SPC Rules Configuration - cấu hình các quy tắc kiểm tra SPC
 */
export const spcRulesConfig = pgTable("spc_rules_config", {
  id: serial("id").primaryKey(),
  mappingId: integer("mappingId"),
  // 8 Western Electric Rules
  rule1Enabled: integer("rule1Enabled").notNull().default(1), // Point beyond 3σ
  rule2Enabled: integer("rule2Enabled").notNull().default(1), // 9 points same side of center
  rule3Enabled: integer("rule3Enabled").notNull().default(1), // 6 points trending up/down
  rule4Enabled: integer("rule4Enabled").notNull().default(1), // 14 points alternating
  rule5Enabled: integer("rule5Enabled").notNull().default(1), // 2 of 3 points beyond 2σ
  rule6Enabled: integer("rule6Enabled").notNull().default(1), // 4 of 5 points beyond 1σ
  rule7Enabled: integer("rule7Enabled").notNull().default(1), // 15 points within 1σ
  rule8Enabled: integer("rule8Enabled").notNull().default(1), // 8 points beyond 1σ both sides
  // CA Rules
  caRulesEnabled: integer("caRulesEnabled").notNull().default(1),
  caThreshold: integer("caThreshold").notNull().default(100), // CA threshold * 100
  // CPK Rules
  cpkExcellent: integer("cpkExcellent").notNull().default(167), // >= 1.67
  cpkGood: integer("cpkGood").notNull().default(133), // >= 1.33
  cpkAcceptable: integer("cpkAcceptable").notNull().default(100), // >= 1.00
  isActive: integer("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type SpcRulesConfig = typeof spcRulesConfig.$inferSelect;
export type InsertSpcRulesConfig = typeof spcRulesConfig.$inferInsert;

/**
 * Sampling Configuration - cấu hình phương thức lấy mẫu
 */
export const samplingConfigs = pgTable("sampling_configs", {
  id: serial("id").primaryKey(),
  mappingId: integer("mappingId"),
  name: varchar("name", { length: 255 }).notNull(),
  // Time unit: year, month, week, day, hour, minute, second
  timeUnit: timeUnitEnum("timeUnit").notNull().default("hour"),
  // Sampling frequency
  sampleSize: integer("sampleSize").notNull().default(5), // Number of samples per subgroup
  subgroupSize: integer("subgroupSize").notNull().default(5), // Number of measurements per subgroup
  intervalValue: integer("intervalValue").notNull().default(30), // Interval value
  intervalUnit: intervalUnitEnum("intervalUnit").notNull().default("minute"),
  // Auto sampling
  autoSampling: integer("autoSampling").notNull().default(0),
  isActive: integer("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type SamplingConfig = typeof samplingConfigs.$inferSelect;
export type InsertSamplingConfig = typeof samplingConfigs.$inferInsert;

/**
 * Dashboard Configuration - cấu hình dashboard realtime
 */
export const dashboardConfigs = pgTable("dashboard_configs", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull().default("Default Dashboard"),
  displayCount: integer("displayCount").notNull().default(4), // Number of production lines to display
  refreshInterval: integer("refreshInterval").notNull().default(30), // Refresh interval in seconds
  layout: layoutEnum("layout").notNull().default("grid"),
  isDefault: integer("isDefault").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type DashboardConfig = typeof dashboardConfigs.$inferSelect;
export type InsertDashboardConfig = typeof dashboardConfigs.$inferInsert;

/**
 * Dashboard Production Line Selection - dây chuyền được chọn hiển thị trên dashboard
 */
export const dashboardLineSelections = pgTable("dashboard_line_selections", {
  id: serial("id").primaryKey(),
  dashboardConfigId: integer("dashboardConfigId").notNull(),
  productionLineId: integer("productionLineId").notNull(),
  displayOrder: integer("displayOrder").notNull().default(0),
  showXbarChart: integer("showXbarChart").notNull().default(1),
  showRChart: integer("showRChart").notNull().default(1),
  showCpk: integer("showCpk").notNull().default(1),
  showMean: integer("showMean").notNull().default(1),
  showUclLcl: integer("showUclLcl").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type DashboardLineSelection = typeof dashboardLineSelections.$inferSelect;
export type InsertDashboardLineSelection = typeof dashboardLineSelections.$inferInsert;

/**
 * SPC Rule Violations - lưu các vi phạm quy tắc SPC
 */
export const spcRuleViolations = pgTable("spc_rule_violations", {
  id: serial("id").primaryKey(),
  analysisId: integer("analysisId").notNull(),
  ruleNumber: integer("ruleNumber").notNull(), // 1-8 for Western Electric, 9 for CA, 10 for CPK
  ruleName: varchar("ruleName", { length: 255 }).notNull(),
  violationDescription: text("violationDescription"),
  dataPointIndex: integer("dataPointIndex"),
  dataPointValue: integer("dataPointValue"),
  severity: severityEnum("severity").notNull().default("warning"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SpcRuleViolation = typeof spcRuleViolations.$inferSelect;
export type InsertSpcRuleViolation = typeof spcRuleViolations.$inferInsert;


/**
 * Products - bảng sản phẩm
 */
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }),
  unit: varchar("unit", { length: 50 }).default("pcs"),
  isActive: integer("isActive").notNull().default(1),
  createdBy: integer("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

/**
 * Product Specifications - tiêu chuẩn USL/LSL cho từng mã sản phẩm và công trạm
 */
export const productSpecifications = pgTable("product_specifications", {
  id: serial("id").primaryKey(),
  productId: integer("productId").notNull(),
  workstationId: integer("workstationId"),
  parameterName: varchar("parameterName", { length: 255 }).notNull(),
  usl: integer("usl").notNull(), // Upper Specification Limit * 10000 (for precision)
  lsl: integer("lsl").notNull(), // Lower Specification Limit * 10000
  target: integer("target"), // Target value * 10000
  unit: varchar("unit", { length: 50 }),
  description: text("description"),
  isActive: integer("isActive").notNull().default(1),
  createdBy: integer("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type ProductSpecification = typeof productSpecifications.$inferSelect;
export type InsertProductSpecification = typeof productSpecifications.$inferInsert;

/**
 * Production Line Products - cấu hình dây chuyền - sản phẩm
 */
export const productionLineProducts = pgTable("production_line_products", {
  id: serial("id").primaryKey(),
  productionLineId: integer("productionLineId").notNull(),
  productId: integer("productId").notNull(),
  isDefault: integer("isDefault").notNull().default(0),
  cycleTime: integer("cycleTime"), // in seconds
  targetOutput: integer("targetOutput"), // per hour
  isActive: integer("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type ProductionLineProduct = typeof productionLineProducts.$inferSelect;
export type InsertProductionLineProduct = typeof productionLineProducts.$inferInsert;

/**
 * Process Configurations - cấu hình quy trình sản xuất
 */
export const processConfigs = pgTable("process_configs", {
  id: serial("id").primaryKey(),
  productionLineId: integer("productionLineId").notNull(),
  productId: integer("productId").notNull(),
  workstationId: integer("workstationId").notNull(),
  processName: varchar("processName", { length: 255 }).notNull(),
  processOrder: integer("processOrder").notNull().default(0),
  standardTime: integer("standardTime"), // in seconds
  description: text("description"),
  isActive: integer("isActive").notNull().default(1),
  createdBy: integer("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type ProcessConfig = typeof processConfigs.$inferSelect;
export type InsertProcessConfig = typeof processConfigs.$inferInsert;


/**
 * SPC Sampling Plans - kế hoạch lấy mẫu SPC
 */
export const spcSamplingPlans = pgTable("spc_sampling_plans", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  productionLineId: integer("productionLineId").notNull(),
  productId: integer("productId"),
  workstationId: integer("workstationId"),
  samplingConfigId: integer("samplingConfigId").notNull(),
  specificationId: integer("specificationId"),
  // Mapping to external database
  mappingId: integer("mappingId"),
  // Fixture (optional - for fixture-specific SPC)
  machineId: integer("machineId"),
  fixtureId: integer("fixtureId"),
  // Schedule
  startTime: timestamp("startTime"),
  endTime: timestamp("endTime"),
  isRecurring: integer("isRecurring").notNull().default(1),
  // Status
  status: statusEnum("status").notNull().default("draft"),
  lastRunAt: timestamp("lastRunAt"),
  nextRunAt: timestamp("nextRunAt"),
  // Notification settings
  notifyOnViolation: integer("notifyOnViolation").notNull().default(1),
  notifyEmail: varchar("notifyEmail", { length: 320 }),
  // Rules configuration - JSON array of enabled rule IDs
  enabledSpcRules: text("enabledSpcRules"), // JSON array: [1,2,3,4,5,6,7,8]
  enabledCaRules: text("enabledCaRules"), // JSON array: [1,2,3,4]
  enabledCpkRules: text("enabledCpkRules"), // JSON array: [1,2,3,4,5]
  // Metadata
  isActive: integer("isActive").notNull().default(1),
  createdBy: integer("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type SpcSamplingPlan = typeof spcSamplingPlans.$inferSelect;
export type InsertSpcSamplingPlan = typeof spcSamplingPlans.$inferInsert;

/**
 * User Line Assignments - gán dây chuyền cho user để hiển thị trên dashboard
 */
export const userLineAssignments = pgTable("user_line_assignments", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  productionLineId: integer("productionLineId").notNull(),
  displayOrder: integer("displayOrder").notNull().default(0),
  isVisible: integer("isVisible").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type UserLineAssignment = typeof userLineAssignments.$inferSelect;
export type InsertUserLineAssignment = typeof userLineAssignments.$inferInsert;

/**
 * SPC Plan Execution Logs - lịch sử chạy kế hoạch SPC
 */
export const spcPlanExecutionLogs = pgTable("spc_plan_execution_logs", {
  id: serial("id").primaryKey(),
  planId: integer("planId").notNull(),
  executedAt: timestamp("executedAt").defaultNow().notNull(),
  status: statusEnum("status").notNull(),
  sampleCount: integer("sampleCount").notNull().default(0),
  violationCount: integer("violationCount").notNull().default(0),
  cpkValue: integer("cpkValue"), // * 100
  meanValue: integer("meanValue"), // * 10000
  stdDevValue: integer("stdDevValue"), // * 10000
  errorMessage: text("errorMessage"),
  notificationSent: integer("notificationSent").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SpcPlanExecutionLog = typeof spcPlanExecutionLogs.$inferSelect;
export type InsertSpcPlanExecutionLog = typeof spcPlanExecutionLogs.$inferInsert;

/**
 * Email Notification Settings - cấu hình thông báo email
 */
export const emailNotificationSettings = pgTable("email_notification_settings", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  notifyOnSpcViolation: integer("notifyOnSpcViolation").notNull().default(1),
  notifyOnCaViolation: integer("notifyOnCaViolation").notNull().default(1),
  notifyOnCpkViolation: integer("notifyOnCpkViolation").notNull().default(1),
  cpkThreshold: integer("cpkThreshold").notNull().default(133), // * 100, default 1.33
  notifyFrequency: notifyFrequencyEnum("notifyFrequency").notNull().default("immediate"),
  isActive: integer("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type EmailNotificationSetting = typeof emailNotificationSettings.$inferSelect;
export type InsertEmailNotificationSetting = typeof emailNotificationSettings.$inferInsert;


/**
 * SPC Realtime Data - dữ liệu SPC realtime cho dashboard
 */
export const spcRealtimeData = pgTable("spc_realtime_data", {
  id: serial("id").primaryKey(),
  planId: integer("planId").notNull(),
  productionLineId: integer("productionLineId").notNull(),
  mappingId: integer("mappingId"),
  // Sample data
  sampleIndex: integer("sampleIndex").notNull(),
  sampleValue: integer("sampleValue").notNull(), // * 10000
  subgroupIndex: integer("subgroupIndex").notNull(),
  subgroupMean: integer("subgroupMean"), // * 10000
  subgroupRange: integer("subgroupRange"), // * 10000
  // Control limits at time of sampling
  ucl: integer("ucl"), // * 10000
  lcl: integer("lcl"), // * 10000
  usl: integer("usl"), // * 10000
  lsl: integer("lsl"), // * 10000
  centerLine: integer("centerLine"), // * 10000
  // Violation status
  isOutOfSpec: integer("isOutOfSpec").notNull().default(0), // Outside USL/LSL
  isOutOfControl: integer("isOutOfControl").notNull().default(0), // Outside UCL/LCL
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
export const spcSummaryStats = pgTable("spc_summary_stats", {
  id: serial("id").primaryKey(),
  planId: integer("planId").notNull(),
  productionLineId: integer("productionLineId").notNull(),
  mappingId: integer("mappingId"),
  // Time period
  periodType: periodTypeEnum("periodType").notNull(),
  periodStart: timestamp("periodStart").notNull(),
  periodEnd: timestamp("periodEnd").notNull(),
  // Statistics
  sampleCount: integer("sampleCount").notNull().default(0),
  subgroupCount: integer("subgroupCount").notNull().default(0),
  mean: integer("mean"), // * 10000
  stdDev: integer("stdDev"), // * 10000
  min: integer("min"), // * 10000
  max: integer("max"), // * 10000
  range: integer("range"), // * 10000
  // Process capability
  cp: integer("cp"), // * 1000
  cpk: integer("cpk"), // * 1000
  pp: integer("pp"), // * 1000 (Process Performance)
  ppk: integer("ppk"), // * 1000 (Process Performance Index)
  ca: integer("ca"), // * 1000 (Capability Accuracy)
  // Control limits
  xBarUcl: integer("xBarUcl"), // * 10000
  xBarLcl: integer("xBarLcl"), // * 10000
  rUcl: integer("rUcl"), // * 10000
  rLcl: integer("rLcl"), // * 10000
  // Violations
  outOfSpecCount: integer("outOfSpecCount").notNull().default(0),
  outOfControlCount: integer("outOfControlCount").notNull().default(0),
  rule1Violations: integer("rule1Violations").notNull().default(0),
  rule2Violations: integer("rule2Violations").notNull().default(0),
  rule3Violations: integer("rule3Violations").notNull().default(0),
  rule4Violations: integer("rule4Violations").notNull().default(0),
  rule5Violations: integer("rule5Violations").notNull().default(0),
  rule6Violations: integer("rule6Violations").notNull().default(0),
  rule7Violations: integer("rule7Violations").notNull().default(0),
  rule8Violations: integer("rule8Violations").notNull().default(0),
  // Status
  overallStatus: overallStatusEnum("overallStatus").notNull().default("good"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type SpcSummaryStats = typeof spcSummaryStats.$inferSelect;
export type InsertSpcSummaryStats = typeof spcSummaryStats.$inferInsert;

/**
 * Permissions - định nghĩa các quyền trong hệ thống
 * system: SPC (SPC/CPK System) hoặc MMS (Maintenance Management System)
 * module: dashboard, analyze, settings, spare-parts, maintenance, etc.
 */
export const permissions = pgTable("permissions", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  system: systemEnum("system").notNull().default("COMMON"), // Hệ thống: SPC, MMS, COMMON
  module: varchar("module", { length: 100 }).notNull(), // dashboard, analyze, settings, etc.
  parentId: integer("parentId"), // Cho cây quyền
  sortOrder: integer("sortOrder").default(0), // Thứ tự hiển thị
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Permission = typeof permissions.$inferSelect;
export type InsertPermission = typeof permissions.$inferInsert;

/**
 * Role Permissions - gán quyền cho vai trò
 */
export const rolePermissions = pgTable("role_permissions", {
  id: serial("id").primaryKey(),
  role: roleEnum("role").notNull(),
  permissionId: integer("permissionId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RolePermission = typeof rolePermissions.$inferSelect;
export type InsertRolePermission = typeof rolePermissions.$inferInsert;

/**
 * User Permissions - gán quyền đặc biệt cho user (override role)
 */
export const userPermissions = pgTable("user_permissions", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  permissionId: integer("permissionId").notNull(),
  granted: integer("granted").notNull().default(1), // 1 = granted, 0 = denied
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UserPermission = typeof userPermissions.$inferSelect;
export type InsertUserPermission = typeof userPermissions.$inferInsert;

/**
 * SMTP Configuration - cấu hình server email
 */
export const smtpConfig = pgTable("smtp_config", {
  id: serial("id").primaryKey(),
  host: varchar("host", { length: 255 }).notNull(),
  port: integer("port").notNull().default(587),
  secure: integer("secure").notNull().default(0), // 0 = false, 1 = true (TLS)
  username: varchar("username", { length: 255 }).notNull(),
  password: varchar("password", { length: 255 }).notNull(),
  fromEmail: varchar("fromEmail", { length: 320 }).notNull(),
  fromName: varchar("fromName", { length: 255 }).notNull().default("SPC/CPK Calculator"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type SmtpConfig = typeof smtpConfig.$inferSelect;
export type InsertSmtpConfig = typeof smtpConfig.$inferInsert;

/**
 * Audit Logs - ghi lại các thao tác quan trọng trong hệ thống
 */
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  userName: varchar("userName", { length: 255 }),
  action: actionEnum("action").notNull(),
  module: varchar("module", { length: 100 }).notNull(), // product, mapping, spc, etc.
  tableName: varchar("tableName", { length: 100 }),
  recordId: integer("recordId"),
  oldValue: text("oldValue"), // JSON string
  newValue: text("newValue"), // JSON string
  description: text("description"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  authType: authTypeEnum("authType").default("online"), // Loại xác thực: local hoặc online
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

/**
 * System Settings - cấu hình hệ thống
 */
export const systemSettings = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value"),
  description: text("description"),
  updatedBy: integer("updatedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = typeof systemSettings.$inferInsert;


/**
 * Process Templates - mẫu quy trình sản xuất
 */
export const processTemplates = pgTable("process_templates", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 100 }).notNull().unique(),
  description: text("description"),
  imageUrl: varchar("imageUrl", { length: 500 }), // Ảnh quy trình
  version: varchar("version", { length: 50 }).default("1.0"),
  isActive: integer("isActive").notNull().default(1),
  createdBy: integer("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type ProcessTemplate = typeof processTemplates.$inferSelect;
export type InsertProcessTemplate = typeof processTemplates.$inferInsert;

/**
 * Process Steps - công đoạn trong quy trình
 */
export const processSteps = pgTable("process_steps", {
  id: serial("id").primaryKey(),
  processTemplateId: integer("processTemplateId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 100 }).notNull(),
  description: text("description"),
  sequenceOrder: integer("sequenceOrder").notNull().default(1), // Thứ tự công đoạn
  standardTime: integer("standardTime"), // Thời gian tiêu chuẩn (giây)
  workstationTypeId: integer("workstationTypeId"), // Loại công trạm cần thiết
  isRequired: integer("isRequired").notNull().default(1), // Bắt buộc hay không
  isActive: integer("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type ProcessStep = typeof processSteps.$inferSelect;
export type InsertProcessStep = typeof processSteps.$inferInsert;

/**
 * Process Step Machines - máy móc cho từng công đoạn
 */
export const processStepMachines = pgTable("process_step_machines", {
  id: serial("id").primaryKey(),
  processStepId: integer("processStepId").notNull(),
  machineTypeId: integer("machineTypeId"), // Loại máy cần thiết
  machineName: varchar("machineName", { length: 255 }).notNull(),
  machineCode: varchar("machineCode", { length: 100 }),
  isRequired: integer("isRequired").notNull().default(1),
  quantity: integer("quantity").notNull().default(1), // Số lượng máy cần
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProcessStepMachine = typeof processStepMachines.$inferSelect;
export type InsertProcessStepMachine = typeof processStepMachines.$inferInsert;

/**
 * Production Line Machines - máy cụ thể được gán vào dây chuyền
 */
export const productionLineMachines = pgTable("production_line_machines", {
  id: serial("id").primaryKey(),
  productionLineId: integer("productionLineId").notNull(),
  machineId: integer("machineId").notNull(), // Máy cụ thể từ bảng machines
  processStepId: integer("processStepId"), // Công đoạn mà máy này thực hiện
  assignedAt: timestamp("assignedAt").defaultNow().notNull(),
  assignedBy: integer("assignedBy").notNull(),
  isActive: integer("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProductionLineMachine = typeof productionLineMachines.$inferSelect;
export type InsertProductionLineMachine = typeof productionLineMachines.$inferInsert;

/**
 * User Dashboard Config - cấu hình widget cho từng user
 */
export const userDashboardConfigs = pgTable("user_dashboard_configs", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  widgetKey: varchar("widgetKey", { length: 100 }).notNull(), // e.g., "mapping_count", "recent_analysis", "cpk_alerts", "system_status"
  isVisible: integer("isVisible").notNull().default(1),
  displayOrder: integer("displayOrder").notNull().default(0),
  config: text("config"), // JSON config for widget-specific settings
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type UserDashboardConfig = typeof userDashboardConfigs.$inferSelect;
export type InsertUserDashboardConfig = typeof userDashboardConfigs.$inferInsert;

/**
 * SPC Defect Categories - Danh mục lỗi SPC
 */
export const spcDefectCategories = pgTable("spc_defect_categories", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull(), // Mã lỗi: DEF001, DEF002...
  name: varchar("name", { length: 200 }).notNull(), // Tên lỗi
  description: text("description"), // Mô tả chi tiết
  category: varchar("category", { length: 100 }), // Nhóm lỗi: Machine, Material, Method, Man, Environment
  severity: varchar("severity", { length: 20 }).notNull().default("medium"), // low, medium, high, critical
  isActive: integer("isActive").notNull().default(1),
  createdBy: integer("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type SpcDefectCategory = typeof spcDefectCategories.$inferSelect;
export type InsertSpcDefectCategory = typeof spcDefectCategories.$inferInsert;

/**
 * SPC Defect Records - Ghi nhận lỗi SPC
 */
export const spcDefectRecords = pgTable("spc_defect_records", {
  id: serial("id").primaryKey(),
  defectCategoryId: integer("defectCategoryId").notNull(), // FK to spc_defect_categories
  productionLineId: integer("productionLineId"), // Dây chuyền
  workstationId: integer("workstationId"), // Công trạm
  productId: integer("productId"), // Sản phẩm
  spcAnalysisId: integer("spcAnalysisId"), // FK to spc_analysis_history (nếu phát hiện từ phân tích SPC)
  ruleViolated: varchar("ruleViolated", { length: 100 }), // Rule vi phạm: Rule1, Rule2... hoặc CPK, CA
  quantity: integer("quantity").notNull().default(1), // Số lượng lỗi
  notes: text("notes"), // Ghi chú
  occurredAt: timestamp("occurredAt").notNull(), // Thời điểm xảy ra lỗi
  reportedBy: integer("reportedBy").notNull(), // Người báo cáo
  status: varchar("status", { length: 20 }).notNull().default("open"), // open, investigating, resolved, closed
  resolvedAt: timestamp("resolvedAt"), // Thời điểm giải quyết
  resolvedBy: integer("resolvedBy"), // Người giải quyết
  rootCause: text("rootCause"), // Nguyên nhân gốc
  correctiveAction: text("correctiveAction"), // Hành động khắc phục
  
  // NTF (Not True Fail) verification
  verificationStatus: verificationStatusEnum("verificationStatus").default("pending"), // pending: chưa xác nhận, real_ng: lỗi thật, ntf: không phải lỗi thật
  verifiedAt: timestamp("verifiedAt"), // Thời điểm xác nhận
  verifiedBy: integer("verifiedBy"), // Người xác nhận
  verificationNotes: text("verificationNotes"), // Ghi chú xác nhận
  ntfReason: varchar("ntfReason", { length: 200 }), // Lý do NTF: sensor_error, false_detection, calibration_issue, etc.
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type SpcDefectRecord = typeof spcDefectRecords.$inferSelect;
export type InsertSpcDefectRecord = typeof spcDefectRecords.$inferInsert;

/**
 * Machine Types - Loại máy (SMT, AOI, Reflow, etc.)
 */
export const machineTypes = pgTable("machine_types", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull(), // Mã loại máy: SMT, AOI, REFLOW...
  name: varchar("name", { length: 200 }).notNull(), // Tên loại máy
  description: text("description"), // Mô tả
  category: varchar("category", { length: 100 }), // Nhóm: Assembly, Inspection, Soldering...
  isActive: integer("isActive").notNull().default(1),
  createdBy: integer("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type MachineType = typeof machineTypes.$inferSelect;
export type InsertMachineType = typeof machineTypes.$inferInsert;

/**
 * Fixtures - Fixture thuộc máy
 */
export const fixtures = pgTable("fixtures", {
  id: serial("id").primaryKey(),
  machineId: integer("machineId").notNull(), // FK to machines
  code: varchar("code", { length: 50 }).notNull(), // Mã fixture: FIX001, FIX002...
  name: varchar("name", { length: 200 }).notNull(), // Tên fixture
  description: text("description"), // Mô tả
  position: integer("position").notNull().default(1), // Vị trí trên máy
  status: statusEnum("status").default("active").notNull(),
  installDate: timestamp("installDate"),
  lastMaintenanceDate: timestamp("lastMaintenanceDate"),
  isActive: integer("isActive").notNull().default(1),
  createdBy: integer("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Fixture = typeof fixtures.$inferSelect;
export type InsertFixture = typeof fixtures.$inferInsert;


/**
 * SPC Rules - Quản lý các quy tắc SPC (Western Electric Rules)
 */
export const spcRules = pgTable("spc_rules", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(), // RULE1, RULE2, ...
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"), // Mô tả chi tiết rule
  category: varchar("category", { length: 100 }).notNull().default("western_electric"), // western_electric, nelson, etc.
  formula: text("formula"), // Công thức/điều kiện
  example: text("example"), // Ví dụ minh họa
  severity: severityEnum("severity").default("warning").notNull(),
  threshold: integer("threshold"), // Ngưỡng (nếu có)
  consecutivePoints: integer("consecutivePoints"), // Số điểm liên tiếp
  sigmaLevel: integer("sigmaLevel"), // Mức sigma (1, 2, 3)
  isEnabled: integer("isEnabled").notNull().default(1),
  sortOrder: integer("sortOrder").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type SpcRule = typeof spcRules.$inferSelect;
export type InsertSpcRule = typeof spcRules.$inferInsert;

/**
 * CA Rules - Quản lý các quy tắc Control Analysis
 */
export const caRules = pgTable("ca_rules", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(), // CA1, CA2, ...
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  formula: text("formula"),
  example: text("example"),
  severity: severityEnum("severity").default("warning").notNull(),
  minValue: integer("minValue"), // Giá trị min (nhân 1000)
  maxValue: integer("maxValue"), // Giá trị max (nhân 1000)
  isEnabled: integer("isEnabled").notNull().default(1),
  sortOrder: integer("sortOrder").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type CaRule = typeof caRules.$inferSelect;
export type InsertCaRule = typeof caRules.$inferInsert;

/**
 * CPK Rules - Quản lý các quy tắc CPK/Process Capability
 */
export const cpkRules = pgTable("cpk_rules", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(), // CPK_EXCELLENT, CPK_GOOD, ...
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  minCpk: integer("minCpk"), // Giá trị CPK min (nhân 1000, vd: 1330 = 1.33)
  maxCpk: integer("maxCpk"), // Giá trị CPK max (nhân 1000)
  status: varchar("status", { length: 50 }).notNull(), // excellent, good, acceptable, poor, unacceptable
  color: varchar("color", { length: 20 }), // Màu hiển thị: green, yellow, orange, red
  action: text("action"), // Hành động khuyến nghị
  severity: severityEnum("severity").default("info").notNull(),
  isEnabled: integer("isEnabled").notNull().default(1),
  sortOrder: integer("sortOrder").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type CpkRule = typeof cpkRules.$inferSelect;
export type InsertCpkRule = typeof cpkRules.$inferInsert;


/**
 * Mapping Templates - các mẫu mapping phổ biến
 */
export const mappingTemplates = pgTable("mapping_templates", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }), // SMT, Assembly, Testing, etc.
  tableName: varchar("tableName", { length: 255 }),
  productCodeColumn: varchar("productCodeColumn", { length: 255 }).default("product_code"),
  stationColumn: varchar("stationColumn", { length: 255 }).default("station"),
  valueColumn: varchar("valueColumn", { length: 255 }).default("value"),
  timestampColumn: varchar("timestampColumn", { length: 255 }).default("timestamp"),
  defaultUsl: integer("defaultUsl"),
  defaultLsl: integer("defaultLsl"),
  defaultTarget: integer("defaultTarget"),
  filterConditions: text("filterConditions"), // JSON array of default filter conditions
  isActive: integer("isActive").notNull().default(1),
  createdBy: integer("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type MappingTemplate = typeof mappingTemplates.$inferSelect;
export type InsertMappingTemplate = typeof mappingTemplates.$inferInsert;


/**
 * Licenses - quản lý license và kích hoạt hệ thống
 */
export const licenses = pgTable("licenses", {
  id: serial("id").primaryKey(),
  licenseKey: varchar("licenseKey", { length: 255 }).notNull().unique(),
  licenseType: licenseTypeEnum("licenseType").notNull().default("trial"),
  licenseStatus: licenseStatusEnum("licenseStatus").notNull().default("pending"),
  companyName: varchar("companyName", { length: 255 }),
  contactEmail: varchar("contactEmail", { length: 320 }),
  maxUsers: integer("maxUsers").notNull().default(5),
  maxProductionLines: integer("maxProductionLines").notNull().default(3),
  maxSpcPlans: integer("maxSpcPlans").notNull().default(10),
  features: text("features"), // JSON array of enabled features
  issuedAt: timestamp("issuedAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt"),
  activatedAt: timestamp("activatedAt"),
  activatedBy: integer("activatedBy"),
  isActive: integer("isActive").notNull().default(0),
  hardwareFingerprint: varchar("hardwareFingerprint", { length: 64 }), // For hardware binding
  offlineLicenseFile: text("offlineLicenseFile"), // Base64 encoded offline license
  activationMode: activationModeEnum("activationMode").default("online"),
  lastValidatedAt: timestamp("lastValidatedAt"), // Last online validation
  price: decimal("price", { precision: 15, scale: 2 }), // Giá tiền license (VND)
  currency: varchar("currency", { length: 3 }).default("VND"), // Mã tiền tệ
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type License = typeof licenses.$inferSelect;
export type InsertLicense = typeof licenses.$inferInsert;

/**
 * License Heartbeats - logs periodic license validation checks
 */
export const licenseHeartbeats = pgTable("license_heartbeats", {
  id: serial("id").primaryKey(),
  licenseKey: varchar("licenseKey", { length: 255 }).notNull(),
  hardwareFingerprint: varchar("hardwareFingerprint", { length: 64 }),
  hostname: varchar("hostname", { length: 255 }),
  platform: varchar("platform", { length: 100 }),
  activeUsers: integer("activeUsers"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LicenseHeartbeat = typeof licenseHeartbeats.$inferSelect;
export type InsertLicenseHeartbeat = typeof licenseHeartbeats.$inferInsert;

/**
 * License Customers - stores customer information for vendor management
 */
export const licenseCustomers = pgTable("license_customers", {
  id: serial("id").primaryKey(),
  companyName: varchar("companyName", { length: 255 }).notNull(),
  contactName: varchar("contactName", { length: 255 }),
  contactEmail: varchar("contactEmail", { length: 320 }),
  contactPhone: varchar("contactPhone", { length: 50 }),
  address: text("address"),
  industry: varchar("industry", { length: 100 }),
  notes: text("notes"),
  isActive: integer("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type LicenseCustomer = typeof licenseCustomers.$inferSelect;
export type InsertLicenseCustomer = typeof licenseCustomers.$inferInsert;


/**
 * Webhooks - stores webhook configurations for notifications
 */
export const webhooks = pgTable("webhooks", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  url: text("url").notNull(),
  webhookType: webhookTypeEnum("webhookType").notNull().default("custom"),
  secret: varchar("secret", { length: 255 }),
  headers: text("headers"), // JSON object of custom headers
  events: text("events").notNull(), // JSON array of event types: cpk_alert, rule_violation, analysis_complete
  isActive: integer("isActive").notNull().default(1),
  triggerCount: integer("triggerCount").notNull().default(0),
  lastTriggeredAt: timestamp("lastTriggeredAt"),
  lastError: text("lastError"),
  createdBy: integer("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Webhook = typeof webhooks.$inferSelect;
export type InsertWebhook = typeof webhooks.$inferInsert;

/**
 * Webhook logs - stores webhook delivery logs
 */
export const webhookLogs = pgTable("webhook_logs", {
  id: serial("id").primaryKey(),
  webhookId: integer("webhookId").notNull(),
  eventType: varchar("eventType", { length: 50 }).notNull(),
  payload: text("payload").notNull(), // JSON payload sent
  responseStatus: integer("responseStatus"),
  responseBody: text("responseBody"),
  success: integer("success").notNull().default(0),
  errorMessage: text("errorMessage"),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
  // Retry mechanism fields
  retryCount: integer("retryCount").notNull().default(0),
  maxRetries: integer("maxRetries").notNull().default(5),
  nextRetryAt: timestamp("nextRetryAt"),
  lastRetryAt: timestamp("lastRetryAt"),
  retryStatus: varchar("retryStatus", { length: 20 }).default("none"), // none, pending, exhausted
});

export type WebhookLog = typeof webhookLogs.$inferSelect;
export type InsertWebhookLog = typeof webhookLogs.$inferInsert;


/**
 * Report Templates - mẫu báo cáo tùy chỉnh
 */
export const reportTemplates = pgTable("report_templates", {
  id: serial("id").primaryKey(),
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
  showLogo: integer("showLogo").notNull().default(1),
  showCompanyName: integer("showCompanyName").notNull().default(1),
  showDate: integer("showDate").notNull().default(1),
  showCharts: integer("showCharts").notNull().default(1),
  showRawData: integer("showRawData").notNull().default(0),
  // Status
  isDefault: integer("isDefault").notNull().default(0),
  isActive: integer("isActive").notNull().default(1),
  createdBy: integer("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type ReportTemplate = typeof reportTemplates.$inferSelect;
export type InsertReportTemplate = typeof reportTemplates.$inferInsert;


/**
 * Export History - lịch sử xuất báo cáo
 */
export const exportHistory = pgTable("export_history", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  exportType: varchar("exportType", { length: 20 }).notNull(), // 'pdf' | 'excel'
  productCode: varchar("productCode", { length: 100 }),
  stationName: varchar("stationName", { length: 255 }),
  analysisType: varchar("analysisType", { length: 50 }), // 'single' | 'batch' | 'spcplan'
  startDate: timestamp("startDate"),
  endDate: timestamp("endDate"),
  // SPC Result summary
  sampleCount: integer("sampleCount"),
  mean: integer("mean"), // * 10000 for precision
  cpk: integer("cpk"), // * 10000 for precision
  // File info
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileUrl: text("fileUrl"), // S3 URL if stored
  fileSize: integer("fileSize"), // bytes
  // Metadata
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ExportHistory = typeof exportHistory.$inferSelect;
export type InsertExportHistory = typeof exportHistory.$inferInsert;


/**
 * System Configuration - stores system setup and configuration
 */
export const systemConfig = pgTable("system_config", {
  id: serial("id").primaryKey(),
  configKey: varchar("configKey", { length: 100 }).notNull().unique(),
  configValue: text("configValue"),
  configType: varchar("configType", { length: 50 }).notNull().default("string"), // string, number, boolean, json
  description: text("description"),
  isEncrypted: integer("isEncrypted").notNull().default(0), // For sensitive data
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type SystemConfig = typeof systemConfig.$inferSelect;
export type InsertSystemConfig = typeof systemConfig.$inferInsert;

/**
 * Company Info - stores customer/company information
 */
export const companyInfo = pgTable("company_info", {
  id: serial("id").primaryKey(),
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
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type CompanyInfo = typeof companyInfo.$inferSelect;
export type InsertCompanyInfo = typeof companyInfo.$inferInsert;


/**
 * Database Backups - stores backup history and metadata
 */
export const databaseBackups = pgTable("database_backups", {
  id: serial("id").primaryKey(),
  filename: varchar("filename", { length: 255 }).notNull(),
  fileSize: integer("fileSize"), // Size in bytes
  fileUrl: text("fileUrl"), // S3 URL or local path
  backupType: backupTypeEnum("backupType").notNull().default("manual"),
  status: statusEnum("status").notNull().default("pending"),
  errorMessage: text("errorMessage"),
  storageLocation: storageLocationEnum("storageLocation").notNull().default("s3"),
  tablesIncluded: text("tablesIncluded"), // JSON array of table names
  createdBy: integer("createdBy"), // null for automated backups
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type DatabaseBackup = typeof databaseBackups.$inferSelect;
export type InsertDatabaseBackup = typeof databaseBackups.$inferInsert;


/**
 * Jigs - Đồ gá thuộc máy
 */
export const jigs = pgTable("jigs", {
  id: serial("id").primaryKey(),
  machineId: integer("machineId").notNull(), // FK to machines
  code: varchar("code", { length: 50 }).notNull(), // Mã jig: JIG001, JIG002...
  name: varchar("name", { length: 200 }).notNull(), // Tên jig
  description: text("description"), // Mô tả
  imageUrl: varchar("imageUrl", { length: 500 }), // Ảnh jig
  position: integer("position").notNull().default(1), // Vị trí trên máy
  status: statusEnum("status").default("active").notNull(),
  installDate: timestamp("installDate"),
  lastMaintenanceDate: timestamp("lastMaintenanceDate"),
  isActive: integer("isActive").notNull().default(1),
  createdBy: integer("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Jig = typeof jigs.$inferSelect;
export type InsertJig = typeof jigs.$inferInsert;

/**
 * Product Station Machine Standards - Tiêu chuẩn đo theo Sản phẩm-Công trạm-Máy
 * Mỗi sản phẩm tại các công trạm và máy khác nhau có tiêu chuẩn đo, phương pháp lấy mẫu, SPC Rule khác nhau
 */
export const productStationMachineStandards = pgTable("product_station_machine_standards", {
  id: serial("id").primaryKey(),
  productId: integer("productId").notNull(), // FK to products
  workstationId: integer("workstationId").notNull(), // FK to workstations
  machineId: integer("machineId"), // FK to machines (optional, null = all machines)
  
  // Tiêu chuẩn đo
  measurementName: varchar("measurementName", { length: 255 }).notNull(), // Tên phép đo
  usl: integer("usl"), // Upper Specification Limit * 10000
  lsl: integer("lsl"), // Lower Specification Limit * 10000
  target: integer("target"), // Target value * 10000
  unit: varchar("unit", { length: 50 }).default("mm"), // Đơn vị đo
  
  // Phương pháp lấy mẫu
  sampleSize: integer("sampleSize").notNull().default(5), // Số mẫu mỗi lần lấy
  sampleFrequency: integer("sampleFrequency").notNull().default(60), // Tần suất lấy mẫu (phút)
  samplingMethod: varchar("samplingMethod", { length: 100 }).default("random"), // random, systematic, stratified
  
  // SPC Rules được áp dụng (JSON array of rule IDs)
  appliedSpcRules: text("appliedSpcRules"), // ["RULE1", "RULE2", ...]
  appliedCpkRules: text("appliedCpkRules"), // ["CPK1", "CPK2", ...] - CPK Rules
  appliedCaRules: text("appliedCaRules"), // ["CA1", "CA2", ...] - CA Rules
  
  // CPK thresholds
  cpkWarningThreshold: integer("cpkWarningThreshold").default(133), // 1.33 * 100
  cpkCriticalThreshold: integer("cpkCriticalThreshold").default(100), // 1.00 * 100
  
  // Metadata
  notes: text("notes"),
  isActive: integer("isActive").notNull().default(1),
  createdBy: integer("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type ProductStationMachineStandard = typeof productStationMachineStandards.$inferSelect;
export type InsertProductStationMachineStandard = typeof productStationMachineStandards.$inferInsert;


/**
 * Custom Validation Rules - Quy tắc kiểm tra tùy chỉnh cho từng sản phẩm
 */
export const customValidationRules = pgTable("custom_validation_rules", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  productId: integer("productId"), // Null = áp dụng cho tất cả sản phẩm
  workstationId: integer("workstationId"), // Null = áp dụng cho tất cả công trạm
  ruleType: ruleTypeEnum("ruleType").notNull().default("range_check"),
  // Cấu hình quy tắc (JSON)
  ruleConfig: text("ruleConfig"), // JSON: { minValue, maxValue, formula, script, etc. }
  // Hành động khi vi phạm
  actionOnViolation: actionOnViolationEnum("actionOnViolation").notNull().default("warning"),
  // Mức độ nghiêm trọng
  severity: severityEnum("severity").notNull().default("medium"),
  // Thông báo khi vi phạm
  violationMessage: text("violationMessage"),
  // Trạng thái
  isActive: integer("isActive").notNull().default(1),
  // Thứ tự ưu tiên (số nhỏ = ưu tiên cao)
  priority: integer("priority").notNull().default(100),
  // Metadata
  createdBy: integer("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type CustomValidationRule = typeof customValidationRules.$inferSelect;
export type InsertCustomValidationRule = typeof customValidationRules.$inferInsert;

/**
 * Validation Rule Execution Log - Lịch sử thực thi quy tắc kiểm tra
 */
export const validationRuleLogs = pgTable("validation_rule_logs", {
  id: serial("id").primaryKey(),
  ruleId: integer("ruleId").notNull(),
  productId: integer("productId"),
  workstationId: integer("workstationId"),
  machineId: integer("machineId"),
  // Dữ liệu được kiểm tra
  inputValue: varchar("inputValue", { length: 500 }),
  // Kết quả
  passed: integer("passed").notNull().default(1), // 1 = pass, 0 = fail
  violationDetails: text("violationDetails"), // Chi tiết vi phạm nếu có
  actionTaken: varchar("actionTaken", { length: 100 }),
  // Metadata
  executedAt: timestamp("executedAt").defaultNow().notNull(),
  executedBy: integer("executedBy"),
});

export type ValidationRuleLog = typeof validationRuleLogs.$inferSelect;
export type InsertValidationRuleLog = typeof validationRuleLogs.$inferInsert;

/**
 * Realtime Machine Connections - cấu hình kết nối máy realtime
 */
export const realtimeMachineConnections = pgTable("realtime_machine_connections", {
  id: serial("id").primaryKey(),
  machineId: integer("machineId").notNull(),
  connectionType: connectionTypeEnum("connectionType").notNull(),
  connectionConfig: text("connectionConfig"), // JSON config
  pollingIntervalMs: integer("pollingIntervalMs").notNull().default(1000),
  dataQuery: text("dataQuery"), // SQL query hoặc config để lấy dữ liệu
  measurementColumn: varchar("measurementColumn", { length: 100 }),
  timestampColumn: varchar("timestampColumn", { length: 100 }),
  lastDataAt: timestamp("lastDataAt"),
  lastError: text("lastError"),
  isActive: integer("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type RealtimeMachineConnection = typeof realtimeMachineConnections.$inferSelect;
export type InsertRealtimeMachineConnection = typeof realtimeMachineConnections.$inferInsert;

/**
 * Realtime Data Buffer - buffer dữ liệu realtime
 */
export const realtimeDataBuffer = pgTable("realtime_data_buffer", {
  id: serial("id").primaryKey(),
  connectionId: integer("connectionId").notNull(),
  machineId: integer("machineId").notNull(),
  measurementName: varchar("measurementName", { length: 100 }).notNull(),
  value: integer("value").notNull(), // * 10000
  sampledAt: timestamp("sampledAt").notNull(),
  processedAt: timestamp("processedAt").defaultNow().notNull(),
  // SPC calculations
  subgroupIndex: integer("subgroupIndex"),
  subgroupMean: integer("subgroupMean"), // * 10000
  subgroupRange: integer("subgroupRange"), // * 10000
  ucl: integer("ucl"), // * 10000
  lcl: integer("lcl"), // * 10000
  isOutOfSpec: integer("isOutOfSpec").notNull().default(0),
  isOutOfControl: integer("isOutOfControl").notNull().default(0),
  violatedRules: varchar("violatedRules", { length: 50 }),
});

export type RealtimeDataBuffer = typeof realtimeDataBuffer.$inferSelect;
export type InsertRealtimeDataBuffer = typeof realtimeDataBuffer.$inferInsert;

/**
 * Realtime Alerts - cảnh báo realtime
 */
export const realtimeAlerts = pgTable("realtime_alerts", {
  id: serial("id").primaryKey(),
  connectionId: integer("connectionId").notNull(),
  machineId: integer("machineId").notNull(),
  alertType: alertTypeEnum("alertType").notNull(),
  severity: severityEnum("severity").notNull(),
  message: text("message"),
  ruleNumber: integer("ruleNumber"),
  value: integer("value"), // * 10000
  threshold: integer("threshold"), // * 10000
  acknowledgedAt: timestamp("acknowledgedAt"),
  acknowledgedBy: integer("acknowledgedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RealtimeAlert = typeof realtimeAlerts.$inferSelect;
export type InsertRealtimeAlert = typeof realtimeAlerts.$inferInsert;


/**
 * Alarm Thresholds - cấu hình ngưỡng alarm cho từng máy/fixture
 */
export const alarmThresholds = pgTable("alarm_thresholds", {
  id: serial("id").primaryKey(),
  machineId: integer("machineId"),
  fixtureId: integer("fixtureId"),
  measurementName: varchar("measurementName", { length: 100 }),
  // Ngưỡng cảnh báo (warning)
  warningUsl: integer("warningUsl"), // * 10000
  warningLsl: integer("warningLsl"), // * 10000
  warningCpkMin: integer("warningCpkMin"), // * 10000 (e.g., 1.33 = 13300)
  // Ngưỡng nghiêm trọng (critical)
  criticalUsl: integer("criticalUsl"), // * 10000
  criticalLsl: integer("criticalLsl"), // * 10000
  criticalCpkMin: integer("criticalCpkMin"), // * 10000 (e.g., 1.0 = 10000)
  // SPC Rules
  enableSpcRules: integer("enableSpcRules").notNull().default(1),
  spcRuleSeverity: spcRuleSeverityEnum("spcRuleSeverity").default("warning"),
  // Thông báo
  enableSound: integer("enableSound").notNull().default(1),
  enableEmail: integer("enableEmail").notNull().default(0),
  emailRecipients: text("emailRecipients"), // JSON array of emails
  // Escalation
  escalationDelayMinutes: integer("escalationDelayMinutes").default(5),
  escalationEmails: text("escalationEmails"), // JSON array of emails for escalation
  // Metadata
  isActive: integer("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type AlarmThreshold = typeof alarmThresholds.$inferSelect;
export type InsertAlarmThreshold = typeof alarmThresholds.$inferInsert;

/**
 * Machine Online Status - trạng thái online của máy
 */
export const machineOnlineStatus = pgTable("machine_online_status", {
  id: serial("id").primaryKey(),
  machineId: integer("machineId").notNull().unique(),
  connectionId: integer("connectionId"),
  isOnline: integer("isOnline").notNull().default(0),
  lastHeartbeat: timestamp("lastHeartbeat"),
  lastDataReceived: timestamp("lastDataReceived"),
  currentCpk: integer("currentCpk"), // * 10000
  currentMean: integer("currentMean"), // * 10000
  activeAlarmCount: integer("activeAlarmCount").notNull().default(0),
  warningCount: integer("warningCount").notNull().default(0),
  criticalCount: integer("criticalCount").notNull().default(0),
  status: statusEnum("status").default("offline"),
  statusMessage: text("statusMessage"),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type MachineOnlineStatus = typeof machineOnlineStatus.$inferSelect;
export type InsertMachineOnlineStatus = typeof machineOnlineStatus.$inferInsert;


/**
 * Machine Areas - khu vực/dây chuyền máy
 */
export const machineAreas = pgTable("machine_areas", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 100 }).notNull(),
  description: text("description"),
  parentId: integer("parentId"), // For hierarchical structure (e.g., Factory > Line > Zone)
  type: typeEnum("type").default("area"),
  sortOrder: integer("sortOrder").default(0),
  isActive: integer("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type MachineArea = typeof machineAreas.$inferSelect;
export type InsertMachineArea = typeof machineAreas.$inferInsert;

/**
 * Machine Area Assignments - gán máy vào khu vực
 */
export const machineAreaAssignments = pgTable("machine_area_assignments", {
  id: serial("id").primaryKey(),
  machineId: integer("machineId").notNull(),
  areaId: integer("areaId").notNull(),
  sortOrder: integer("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MachineAreaAssignment = typeof machineAreaAssignments.$inferSelect;
export type InsertMachineAreaAssignment = typeof machineAreaAssignments.$inferInsert;

/**
 * Machine Status History - lịch sử trạng thái máy (cho báo cáo uptime/downtime)
 */
export const machineStatusHistory = pgTable("machine_status_history", {
  id: serial("id").primaryKey(),
  machineId: integer("machineId").notNull(),
  status: statusEnum("status").notNull(),
  startTime: timestamp("startTime").notNull(),
  endTime: timestamp("endTime"),
  durationMinutes: integer("durationMinutes"),
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
export const oeeLossCategories = pgTable("oee_loss_categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).notNull(),
  type: typeEnum("type").notNull(),
  description: text("description"),
  color: varchar("color", { length: 20 }).default("#6b7280"),
  sortOrder: integer("sortOrder").default(0),
  isActive: integer("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OeeLossCategory = typeof oeeLossCategories.$inferSelect;
export type InsertOeeLossCategory = typeof oeeLossCategories.$inferInsert;

/**
 * OEE Targets - mục tiêu OEE theo máy/dây chuyền
 */
export const oeeTargets = pgTable("oee_targets", {
  id: serial("id").primaryKey(),
  machineId: integer("machineId"),
  productionLineId: integer("productionLineId"),
  targetOee: decimal("targetOee", { precision: 5, scale: 2 }).default("85.00"),
  targetAvailability: decimal("targetAvailability", { precision: 5, scale: 2 }).default("90.00"),
  targetPerformance: decimal("targetPerformance", { precision: 5, scale: 2 }).default("95.00"),
  targetQuality: decimal("targetQuality", { precision: 5, scale: 2 }).default("99.00"),
  effectiveFrom: timestamp("effectiveFrom").notNull(),
  effectiveTo: timestamp("effectiveTo"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type OeeTarget = typeof oeeTargets.$inferSelect;
export type InsertOeeTarget = typeof oeeTargets.$inferInsert;

/**
 * OEE Records - bản ghi OEE theo ca/ngày
 */
export const oeeRecords = pgTable("oee_records", {
  id: serial("id").primaryKey(),
  machineId: integer("machineId").notNull(),
  productionLineId: integer("productionLineId"),
  shiftId: integer("shiftId"),
  recordDate: timestamp("recordDate").notNull(),
  
  // Thời gian
  plannedProductionTime: integer("plannedProductionTime").notNull(), // phút
  actualRunTime: integer("actualRunTime").notNull(), // phút
  downtime: integer("downtime").default(0), // phút
  
  // Sản lượng
  idealCycleTime: decimal("idealCycleTime", { precision: 10, scale: 4 }), // giây/sản phẩm
  totalCount: integer("totalCount").default(0),
  goodCount: integer("goodCount").default(0),
  defectCount: integer("defectCount").default(0),
  
  // Chỉ số OEE
  availability: decimal("availability", { precision: 5, scale: 2 }),
  performance: decimal("performance", { precision: 5, scale: 2 }),
  quality: decimal("quality", { precision: 5, scale: 2 }),
  oee: decimal("oee", { precision: 5, scale: 2 }),
  
  notes: text("notes"),
  createdBy: integer("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type OeeRecord = typeof oeeRecords.$inferSelect;
export type InsertOeeRecord = typeof oeeRecords.$inferInsert;

/**
 * OEE Loss Records - chi tiết tổn thất OEE
 */
export const oeeLossRecords = pgTable("oee_loss_records", {
  id: serial("id").primaryKey(),
  oeeRecordId: integer("oeeRecordId").notNull(),
  lossCategoryId: integer("lossCategoryId").notNull(),
  durationMinutes: integer("durationMinutes").notNull(),
  quantity: integer("quantity").default(0),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OeeLossRecord = typeof oeeLossRecords.$inferSelect;
export type InsertOeeLossRecord = typeof oeeLossRecords.$inferInsert;

/**
 * Maintenance Types - loại bảo trì
 */
export const maintenanceTypes = pgTable("maintenance_types", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).notNull(),
  category: categoryEnum("category").notNull(),
  description: text("description"),
  defaultPriority: defaultPriorityEnum("defaultPriority").default("medium"),
  estimatedDuration: integer("estimatedDuration"), // phút
  color: varchar("color", { length: 20 }).default("#3b82f6"),
  isActive: integer("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MaintenanceType = typeof maintenanceTypes.$inferSelect;
export type InsertMaintenanceType = typeof maintenanceTypes.$inferInsert;

/**
 * Technicians - kỹ thuật viên bảo trì
 */
export const technicians = pgTable("technicians", {
  id: serial("id").primaryKey(),
  userId: integer("userId"),
  employeeCode: varchar("employeeCode", { length: 50 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  specialization: varchar("specialization", { length: 255 }),
  skillLevel: skillLevelEnum("skillLevel").default("intermediate"),
  isAvailable: integer("isAvailable").notNull().default(1),
  isActive: integer("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Technician = typeof technicians.$inferSelect;
export type InsertTechnician = typeof technicians.$inferInsert;

/**
 * Maintenance Schedules - lịch bảo trì định kỳ
 */
export const maintenanceSchedules = pgTable("maintenance_schedules", {
  id: serial("id").primaryKey(),
  machineId: integer("machineId").notNull(),
  maintenanceTypeId: integer("maintenanceTypeId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  
  // Lịch trình
  frequency: frequencyEnum("frequency").notNull(),
  customIntervalDays: integer("customIntervalDays"),
  lastPerformedAt: timestamp("lastPerformedAt"),
  nextDueAt: timestamp("nextDueAt"),
  
  // Thông tin bổ sung
  estimatedDuration: integer("estimatedDuration"), // phút
  assignedTechnicianId: integer("assignedTechnicianId"),
  checklist: jsonb("checklist"), // JSON array of checklist items
  
  priority: priorityEnum("priority").default("medium"),
  isActive: integer("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type MaintenanceSchedule = typeof maintenanceSchedules.$inferSelect;
export type InsertMaintenanceSchedule = typeof maintenanceSchedules.$inferInsert;

/**
 * Work Orders - phiếu công việc bảo trì
 */
export const workOrders = pgTable("work_orders", {
  id: serial("id").primaryKey(),
  workOrderNumber: varchar("workOrderNumber", { length: 50 }).notNull(),
  machineId: integer("machineId").notNull(),
  maintenanceTypeId: integer("maintenanceTypeId").notNull(),
  scheduleId: integer("scheduleId"), // null nếu là corrective
  
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  priority: priorityEnum("priority").default("medium"),
  status: statusEnum("status").default("pending"),
  
  // Thời gian
  reportedAt: timestamp("reportedAt").defaultNow().notNull(),
  scheduledStartAt: timestamp("scheduledStartAt"),
  actualStartAt: timestamp("actualStartAt"),
  completedAt: timestamp("completedAt"),
  
  // Người thực hiện
  reportedBy: integer("reportedBy"),
  assignedTo: integer("assignedTo"),
  completedBy: integer("completedBy"),
  
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
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type WorkOrder = typeof workOrders.$inferSelect;
export type InsertWorkOrder = typeof workOrders.$inferInsert;

/**
 * Work Order Parts - phụ tùng sử dụng trong work order
 */
export const workOrderParts = pgTable("work_order_parts", {
  id: serial("id").primaryKey(),
  workOrderId: integer("workOrderId").notNull(),
  sparePartId: integer("sparePartId").notNull(),
  quantity: integer("quantity").notNull(),
  unitCost: decimal("unitCost", { precision: 12, scale: 2 }),
  totalCost: decimal("totalCost", { precision: 12, scale: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WorkOrderPart = typeof workOrderParts.$inferSelect;
export type InsertWorkOrderPart = typeof workOrderParts.$inferInsert;

/**
 * Maintenance History - lịch sử bảo trì
 */
export const maintenanceHistory = pgTable("maintenance_history", {
  id: serial("id").primaryKey(),
  workOrderId: integer("workOrderId").notNull(),
  machineId: integer("machineId").notNull(),
  action: varchar("action", { length: 255 }).notNull(),
  performedBy: integer("performedBy"),
  performedAt: timestamp("performedAt").defaultNow().notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MaintenanceHistoryRecord = typeof maintenanceHistory.$inferSelect;
export type InsertMaintenanceHistory = typeof maintenanceHistory.$inferInsert;

/**
 * Suppliers - nhà cung cấp phụ tùng
 */
export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).notNull(),
  contactPerson: varchar("contactPerson", { length: 255 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  website: varchar("website", { length: 255 }),
  paymentTerms: varchar("paymentTerms", { length: 100 }),
  leadTimeDays: integer("leadTimeDays"),
  rating: integer("rating").default(3), // 1-5
  notes: text("notes"),
  isActive: integer("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = typeof suppliers.$inferInsert;

/**
 * Spare Parts - danh mục phụ tùng
 */
export const spareParts = pgTable("spare_parts", {
  id: serial("id").primaryKey(),
  partNumber: varchar("partNumber", { length: 100 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }),
  
  // Liên kết
  machineTypeId: integer("machineTypeId"),
  supplierId: integer("supplierId"),
  
  // Thông tin kỹ thuật
  specifications: text("specifications"),
  unit: varchar("unit", { length: 50 }).default("pcs"),
  
  // Giá và chi phí
  unitPrice: decimal("unitPrice", { precision: 12, scale: 2 }),
  currency: varchar("currency", { length: 10 }).default("VND"),
  
  // Tồn kho
  minStock: integer("minStock").default(0),
  maxStock: integer("maxStock"),
  reorderPoint: integer("reorderPoint"),
  reorderQuantity: integer("reorderQuantity"),
  emailAlertThreshold: integer("emailAlertThreshold").default(0), // Ngưỡng cảnh báo email (0 = dùng minStock)
  
  // Vị trí
  warehouseLocation: varchar("warehouseLocation", { length: 100 }),
  
  isActive: integer("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type SparePart = typeof spareParts.$inferSelect;
export type InsertSparePart = typeof spareParts.$inferInsert;

/**
 * Spare Parts Inventory - tồn kho phụ tùng
 */
export const sparePartsInventory = pgTable("spare_parts_inventory", {
  id: serial("id").primaryKey(),
  sparePartId: integer("sparePartId").notNull(),
  quantity: integer("quantity").notNull().default(0),
  reservedQuantity: integer("reservedQuantity").default(0),
  availableQuantity: integer("availableQuantity").default(0),
  lastStockCheck: timestamp("lastStockCheck"),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type SparePartInventory = typeof sparePartsInventory.$inferSelect;
export type InsertSparePartInventory = typeof sparePartsInventory.$inferInsert;

/**
 * Spare Parts Transactions - giao dịch phụ tùng
 */
export const sparePartsTransactions = pgTable("spare_parts_transactions", {
  id: serial("id").primaryKey(),
  sparePartId: integer("sparePartId").notNull(),
  transactionType: transactionTypeEnum("transactionType").notNull(),
  quantity: integer("quantity").notNull(),
  workOrderId: integer("workOrderId"),
  purchaseOrderId: integer("purchaseOrderId"),
  unitCost: decimal("unitCost", { precision: 12, scale: 2 }),
  totalCost: decimal("totalCost", { precision: 12, scale: 2 }),
  reason: text("reason"),
  performedBy: integer("performedBy"),
  
  // Mục đích xuất kho
  exportPurpose: exportPurposeEnum("exportPurpose").default("normal"),
  borrowerName: varchar("borrowerName", { length: 255 }), // Người mượn
  borrowerDepartment: varchar("borrowerDepartment", { length: 255 }), // Phòng ban
  expectedReturnDate: timestamp("expectedReturnDate"), // Ngày dự kiến trả
  actualReturnDate: timestamp("actualReturnDate"), // Ngày trả thực tế
  returnedQuantity: integer("returnedQuantity").default(0), // Số lượng đã trả
  returnStatus: returnStatusEnum("returnStatus").default("pending"), // Trạng thái trả
  relatedTransactionId: integer("relatedTransactionId"), // Liên kết với giao dịch xuất kho gốc
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SparePartTransaction = typeof sparePartsTransactions.$inferSelect;
export type InsertSparePartTransaction = typeof sparePartsTransactions.$inferInsert;

/**
 * Purchase Orders - đơn đặt hàng phụ tùng
 */
export const purchaseOrders = pgTable("purchase_orders", {
  id: serial("id").primaryKey(),
  poNumber: varchar("poNumber", { length: 50 }).notNull(),
  supplierId: integer("supplierId").notNull(),
  status: statusEnum("status").default("draft"),
  
  orderDate: timestamp("orderDate"),
  expectedDeliveryDate: timestamp("expectedDeliveryDate"),
  actualDeliveryDate: timestamp("actualDeliveryDate"),
  
  subtotal: decimal("subtotal", { precision: 14, scale: 2 }),
  tax: decimal("tax", { precision: 14, scale: 2 }),
  shipping: decimal("shipping", { precision: 14, scale: 2 }),
  total: decimal("total", { precision: 14, scale: 2 }),
  
  notes: text("notes"),
  createdBy: integer("createdBy"),
  approvedBy: integer("approvedBy"),
  approvedAt: timestamp("approvedAt"),
  rejectedBy: integer("rejectedBy"),
  rejectedAt: timestamp("rejectedAt"),
  rejectionReason: text("rejectionReason"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPurchaseOrder = typeof purchaseOrders.$inferInsert;

/**
 * Purchase Order Items - chi tiết đơn đặt hàng
 */
export const purchaseOrderItems = pgTable("purchase_order_items", {
  id: serial("id").primaryKey(),
  purchaseOrderId: integer("purchaseOrderId").notNull(),
  sparePartId: integer("sparePartId").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unitPrice", { precision: 12, scale: 2 }),
  totalPrice: decimal("totalPrice", { precision: 12, scale: 2 }),
  receivedQuantity: integer("receivedQuantity").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;
export type InsertPurchaseOrderItem = typeof purchaseOrderItems.$inferInsert;

/**
 * PO Receiving History - lịch sử nhập kho từng lần theo đơn đặt hàng
 */
export const poReceivingHistory = pgTable("po_receiving_history", {
  id: serial("id").primaryKey(),
  purchaseOrderId: integer("purchaseOrderId").notNull(),
  purchaseOrderItemId: integer("purchaseOrderItemId").notNull(),
  sparePartId: integer("sparePartId").notNull(),
  quantityReceived: integer("quantityReceived").notNull(),
  receivedBy: integer("receivedBy"),
  receivedAt: timestamp("receivedAt").defaultNow().notNull(),
  notes: text("notes"),
  batchNumber: varchar("batchNumber", { length: 100 }), // Số lô hàng
  qualityStatus: qualityStatusEnum("qualityStatus").default("good"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PoReceivingHistory = typeof poReceivingHistory.$inferSelect;
export type InsertPoReceivingHistory = typeof poReceivingHistory.$inferInsert;

/**
 * Sensor Types - loại sensor
 */
export const sensorTypes = pgTable("sensor_types", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).notNull(),
  unit: varchar("unit", { length: 50 }),
  description: text("description"),
  minValue: decimal("minValue", { precision: 12, scale: 4 }),
  maxValue: decimal("maxValue", { precision: 12, scale: 4 }),
  warningThreshold: decimal("warningThreshold", { precision: 12, scale: 4 }),
  criticalThreshold: decimal("criticalThreshold", { precision: 12, scale: 4 }),
  isActive: integer("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SensorType = typeof sensorTypes.$inferSelect;
export type InsertSensorType = typeof sensorTypes.$inferInsert;

/**
 * Machine Sensors - sensor gắn trên máy
 */
export const machineSensors = pgTable("machine_sensors", {
  id: serial("id").primaryKey(),
  machineId: integer("machineId").notNull(),
  sensorTypeId: integer("sensorTypeId").notNull(),
  sensorCode: varchar("sensorCode", { length: 100 }).notNull(),
  location: varchar("location", { length: 255 }),
  installDate: timestamp("installDate"),
  calibrationDate: timestamp("calibrationDate"),
  nextCalibrationDate: timestamp("nextCalibrationDate"),
  isActive: integer("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MachineSensor = typeof machineSensors.$inferSelect;
export type InsertMachineSensor = typeof machineSensors.$inferInsert;

/**
 * Sensor Data - dữ liệu sensor realtime
 */
export const sensorData = pgTable("sensor_data", {
  id: serial("id").primaryKey(),
  sensorId: integer("sensorId").notNull(),
  machineId: integer("machineId").notNull(),
  value: decimal("value", { precision: 12, scale: 4 }).notNull(),
  status: statusEnum("status").default("normal"),
  recordedAt: timestamp("recordedAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SensorDataRecord = typeof sensorData.$inferSelect;
export type InsertSensorData = typeof sensorData.$inferInsert;

/**
 * Prediction Models - mô hình dự đoán
 */
export const predictionModels = pgTable("prediction_models", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  machineTypeId: integer("machineTypeId"),
  modelType: modelTypeEnum("modelType").notNull(),
  description: text("description"),
  
  // Cấu hình model
  inputFeatures: jsonb("inputFeatures"), // JSON array of sensor types
  modelParameters: jsonb("modelParameters"),
  
  // Hiệu suất
  accuracy: decimal("accuracy", { precision: 5, scale: 2 }),
  lastTrainedAt: timestamp("lastTrainedAt"),
  trainingDataCount: integer("trainingDataCount"),
  
  isActive: integer("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type PredictionModel = typeof predictionModels.$inferSelect;
export type InsertPredictionModel = typeof predictionModels.$inferInsert;

/**
 * Predictions - kết quả dự đoán
 */
export const predictions = pgTable("predictions", {
  id: serial("id").primaryKey(),
  machineId: integer("machineId").notNull(),
  modelId: integer("modelId").notNull(),
  
  predictionType: predictionTypeEnum("predictionType").notNull(),
  predictedValue: decimal("predictedValue", { precision: 12, scale: 4 }),
  confidence: decimal("confidence", { precision: 5, scale: 2 }),
  
  // RUL specific
  estimatedFailureDate: timestamp("estimatedFailureDate"),
  remainingUsefulLife: integer("remainingUsefulLife"), // hours
  
  // Status
  severity: severityEnum("severity").default("low"),
  isAcknowledged: integer("isAcknowledged").default(0),
  acknowledgedBy: integer("acknowledgedBy"),
  acknowledgedAt: timestamp("acknowledgedAt"),
  
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Prediction = typeof predictions.$inferSelect;
export type InsertPrediction = typeof predictions.$inferInsert;

/**
 * MMS Dashboard Widgets - cấu hình widget dashboard MMS
 */
export const mmsDashboardWidgets = pgTable("mms_dashboard_widgets", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  widgetType: varchar("widgetType", { length: 100 }).notNull(),
  title: varchar("title", { length: 255 }),
  config: jsonb("config"),
  position: integer("position").default(0),
  width: integer("width").default(1), // 1-4 columns
  height: integer("height").default(1), // 1-3 rows
  isVisible: integer("isVisible").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type MmsDashboardWidget = typeof mmsDashboardWidgets.$inferSelect;
export type InsertMmsDashboardWidget = typeof mmsDashboardWidgets.$inferInsert;

/**
 * Scheduled Reports Configuration
 * Cấu hình báo cáo tự động gửi định kỳ
 */
export const scheduledReports = pgTable("scheduled_reports", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  reportType: reportTypeEnum("reportType").notNull(),
  schedule: scheduleEnum("schedule").notNull().default("weekly"),
  dayOfWeek: integer("dayOfWeek").default(1), // 0-6 for weekly (0=Sunday)
  dayOfMonth: integer("dayOfMonth").default(1), // 1-31 for monthly
  hour: integer("hour").notNull().default(8), // Hour to send (0-23)
  recipients: text("recipients").notNull(), // Comma-separated emails
  includeCharts: integer("includeCharts").notNull().default(1),
  includeTables: integer("includeTables").notNull().default(1),
  includeRecommendations: integer("includeRecommendations").notNull().default(1),
  machineIds: jsonb("machineIds"), // Array of machine IDs to include, null = all
  productionLineIds: jsonb("productionLineIds"), // Array of line IDs, null = all
  isActive: integer("isActive").notNull().default(1),
  lastSentAt: timestamp("lastSentAt"),
  nextScheduledAt: timestamp("nextScheduledAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type ScheduledReport = typeof scheduledReports.$inferSelect;
export type InsertScheduledReport = typeof scheduledReports.$inferInsert;

/**
 * Scheduled Report Logs
 * Lịch sử gửi báo cáo tự động
 */
export const scheduledReportLogs = pgTable("scheduled_report_logs", {
  id: serial("id").primaryKey(),
  reportId: integer("reportId").notNull(),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
  status: statusEnum("status").notNull(),
  recipientCount: integer("recipientCount").notNull().default(0),
  successCount: integer("successCount").notNull().default(0),
  failedCount: integer("failedCount").notNull().default(0),
  errorMessage: text("errorMessage"),
  reportFileUrl: varchar("reportFileUrl", { length: 500 }),
  reportFileSizeKb: integer("reportFileSizeKb"),
  generationTimeMs: integer("generationTimeMs"),
});

export type ScheduledReportLog = typeof scheduledReportLogs.$inferSelect;
export type InsertScheduledReportLog = typeof scheduledReportLogs.$inferInsert;

/**
 * Shift Reports - báo cáo ca làm việc tự động
 */
export const shiftReports = pgTable("shift_reports", {
  id: serial("id").primaryKey(),
  
  // Shift info
  shiftDate: timestamp("shiftDate").notNull(),
  shiftType: shiftTypeEnum("shiftType").notNull(),
  shiftStart: timestamp("shiftStart").notNull(),
  shiftEnd: timestamp("shiftEnd").notNull(),
  
  // Production line/machine info
  productionLineId: integer("productionLineId"),
  machineId: integer("machineId"),
  
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
  totalProduced: integer("totalProduced").default(0),
  goodCount: integer("goodCount").default(0),
  defectCount: integer("defectCount").default(0),
  
  // Time stats
  plannedTime: integer("plannedTime").default(0), // minutes
  actualRunTime: integer("actualRunTime").default(0),
  downtime: integer("downtime").default(0),
  
  // Alerts and issues
  alertCount: integer("alertCount").default(0),
  spcViolationCount: integer("spcViolationCount").default(0),
  
  // Report status
  status: statusEnum("status").default("generated"),
  sentAt: timestamp("sentAt"),
  sentTo: text("sentTo"), // JSON array of emails
  
  // Report content
  reportContent: text("reportContent"), // HTML content
  reportFileUrl: varchar("reportFileUrl", { length: 500 }),
  
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type ShiftReport = typeof shiftReports.$inferSelect;
export type InsertShiftReport = typeof shiftReports.$inferInsert;


/**
 * Rate limit configuration - persistent storage for rate limit settings
 */
export const rateLimitConfig = pgTable("rate_limit_config", {
  id: serial("id").primaryKey(),
  configKey: varchar("configKey", { length: 100 }).notNull().unique(),
  configValue: text("configValue").notNull(), // JSON value
  description: text("description"),
  updatedBy: integer("updatedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type RateLimitConfig = typeof rateLimitConfig.$inferSelect;
export type InsertRateLimitConfig = typeof rateLimitConfig.$inferInsert;

/**
 * Rate limit config history - audit log for config changes
 */
export const rateLimitConfigHistory = pgTable("rate_limit_config_history", {
  id: serial("id").primaryKey(),
  configKey: varchar("configKey", { length: 100 }).notNull(),
  oldValue: text("oldValue"),
  newValue: text("newValue").notNull(),
  changedBy: integer("changedBy").notNull(),
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
export const rateLimitRoleConfig = pgTable("rate_limit_role_config", {
  id: serial("id").primaryKey(),
  role: roleEnum("role").notNull().unique(),
  maxRequests: integer("maxRequests").notNull().default(5000),
  maxAuthRequests: integer("maxAuthRequests").notNull().default(200),
  maxExportRequests: integer("maxExportRequests").notNull().default(100),
  windowMs: integer("windowMs").notNull().default(900000), // 15 minutes
  description: text("description"),
  isActive: integer("isActive").notNull().default(1),
  updatedBy: integer("updatedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type RateLimitRoleConfig = typeof rateLimitRoleConfig.$inferSelect;
export type InsertRateLimitRoleConfig = typeof rateLimitRoleConfig.$inferInsert;



/**
 * Spare Parts Inventory Checks - kiểm kê kho phụ tùng
 */
export const sparePartsInventoryChecks = pgTable("spare_parts_inventory_checks", {
  id: serial("id").primaryKey(),
  checkNumber: varchar("checkNumber", { length: 50 }).notNull(),
  checkDate: timestamp("checkDate").notNull(),
  checkType: checkTypeEnum("checkType").notNull().default("full"),
  status: statusEnum("status").default("draft"),
  
  // Phạm vi kiểm kê
  warehouseLocation: varchar("warehouseLocation", { length: 100 }),
  category: varchar("category", { length: 100 }),
  
  // Kết quả
  totalItems: integer("totalItems").default(0),
  checkedItems: integer("checkedItems").default(0),
  matchedItems: integer("matchedItems").default(0),
  discrepancyItems: integer("discrepancyItems").default(0),
  
  // Giá trị
  totalSystemValue: decimal("totalSystemValue", { precision: 14, scale: 2 }),
  totalActualValue: decimal("totalActualValue", { precision: 14, scale: 2 }),
  discrepancyValue: decimal("discrepancyValue", { precision: 14, scale: 2 }),
  
  notes: text("notes"),
  completedAt: timestamp("completedAt"),
  completedBy: integer("completedBy"),
  createdBy: integer("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type SparePartInventoryCheck = typeof sparePartsInventoryChecks.$inferSelect;
export type InsertSparePartInventoryCheck = typeof sparePartsInventoryChecks.$inferInsert;

/**
 * Spare Parts Inventory Check Items - chi tiết kiểm kê từng phụ tùng
 */
export const sparePartsInventoryCheckItems = pgTable("spare_parts_inventory_check_items", {
  id: serial("id").primaryKey(),
  checkId: integer("checkId").notNull(),
  sparePartId: integer("sparePartId").notNull(),
  
  // Số lượng
  systemQuantity: integer("systemQuantity").notNull(),
  actualQuantity: integer("actualQuantity"),
  discrepancy: integer("discrepancy"),
  
  // Giá trị
  unitPrice: decimal("unitPrice", { precision: 12, scale: 2 }),
  systemValue: decimal("systemValue", { precision: 14, scale: 2 }),
  actualValue: decimal("actualValue", { precision: 14, scale: 2 }),
  
  // Trạng thái
  status: statusEnum("status").default("pending"),
  
  // Ghi chú
  notes: text("notes"),
  countedBy: integer("countedBy"),
  countedAt: timestamp("countedAt"),
  verifiedBy: integer("verifiedBy"),
  verifiedAt: timestamp("verifiedAt"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SparePartInventoryCheckItem = typeof sparePartsInventoryCheckItems.$inferSelect;
export type InsertSparePartInventoryCheckItem = typeof sparePartsInventoryCheckItems.$inferInsert;

/**
 * Spare Parts Stock Movements - lịch sử di chuyển tồn kho
 */
export const sparePartsStockMovements = pgTable("spare_parts_stock_movements", {
  id: serial("id").primaryKey(),
  sparePartId: integer("sparePartId").notNull(),
  movementType: movementTypeEnum("movementType").notNull(),
  
  // Số lượng
  quantity: integer("quantity").notNull(),
  beforeQuantity: integer("beforeQuantity").notNull(),
  afterQuantity: integer("afterQuantity").notNull(),
  
  // Giá trị
  unitCost: decimal("unitCost", { precision: 12, scale: 2 }),
  totalCost: decimal("totalCost", { precision: 14, scale: 2 }),
  
  // Liên kết
  referenceType: varchar("referenceType", { length: 50 }), // purchase_order, work_order, inventory_check, etc.
  referenceId: integer("referenceId"),
  referenceNumber: varchar("referenceNumber", { length: 100 }),
  
  // Vị trí
  fromLocation: varchar("fromLocation", { length: 100 }),
  toLocation: varchar("toLocation", { length: 100 }),
  
  reason: text("reason"),
  performedBy: integer("performedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SparePartStockMovement = typeof sparePartsStockMovements.$inferSelect;
export type InsertSparePartStockMovement = typeof sparePartsStockMovements.$inferInsert;

/**
 * NTF Alert Configuration - cấu hình cảnh báo NTF rate
 */
export const ntfAlertConfig = pgTable("ntf_alert_config", {
  id: serial("id").primaryKey(),
  
  // Ngưỡng cảnh báo
  warningThreshold: decimal("warningThreshold", { precision: 5, scale: 2 }).default("20.00"), // 20%
  criticalThreshold: decimal("criticalThreshold", { precision: 5, scale: 2 }).default("30.00"), // 30%
  
  // Email nhận cảnh báo (JSON array)
  alertEmails: text("alertEmails"), // ["email1@example.com", "email2@example.com"]
  
  // Bật/tắt cảnh báo
  enabled: boolean("enabled").default(true),
  
  // Tần suất kiểm tra (phút)
  checkIntervalMinutes: integer("checkIntervalMinutes").default(60), // Mặc định 1 giờ
  
  // Cooldown giữa các cảnh báo (phút)
  cooldownMinutes: integer("cooldownMinutes").default(120), // 2 giờ
  
  // Lần cảnh báo cuối
  lastAlertAt: timestamp("lastAlertAt"),
  lastAlertNtfRate: decimal("lastAlertNtfRate", { precision: 5, scale: 2 }),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type NtfAlertConfig = typeof ntfAlertConfig.$inferSelect;
export type InsertNtfAlertConfig = typeof ntfAlertConfig.$inferInsert;

/**
 * NTF Alert History - lịch sử cảnh báo NTF
 */
export const ntfAlertHistory = pgTable("ntf_alert_history", {
  id: serial("id").primaryKey(),
  
  // Thông tin cảnh báo
  ntfRate: decimal("ntfRate", { precision: 5, scale: 2 }).notNull(),
  totalDefects: integer("totalDefects").notNull(),
  ntfCount: integer("ntfCount").notNull(),
  realNgCount: integer("realNgCount").notNull(),
  pendingCount: integer("pendingCount").notNull(),
  
  // Loại cảnh báo
  alertType: alertTypeEnum("alertType").notNull(),
  
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
export const ntfReportSchedule = pgTable("ntf_report_schedule", {
  id: serial("id").primaryKey(),
  
  // Tên lịch
  name: varchar("name", { length: 200 }).notNull(),
  
  // Loại báo cáo
  reportType: reportTypeEnum("reportType").notNull(),
  
  // Thời gian gửi (giờ trong ngày, 0-23)
  sendHour: integer("sendHour").default(8), // 8:00 AM
  
  // Ngày gửi (cho weekly: 0-6 = CN-T7, cho monthly: 1-28)
  sendDay: integer("sendDay"),
  
  // Email nhận báo cáo (JSON array)
  recipients: text("recipients").notNull(), // ["email1@example.com"]
  
  // Bật/tắt
  enabled: boolean("enabled").default(true),
  
  // Lần gửi cuối
  lastSentAt: timestamp("lastSentAt"),
  lastSentStatus: lastSentStatusEnum("lastSentStatus"),
  lastSentError: text("lastSentError"),
  
  // Metadata
  createdBy: integer("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type NtfReportSchedule = typeof ntfReportSchedule.$inferSelect;
export type InsertNtfReportSchedule = typeof ntfReportSchedule.$inferInsert;


/**
 * SPC Plan Templates - mẫu kế hoạch SPC để tái sử dụng
 */
export const spcPlanTemplates = pgTable("spc_plan_templates", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  measurementName: varchar("measurementName", { length: 255 }),
  usl: decimal("usl", { precision: 15, scale: 6 }),
  lsl: decimal("lsl", { precision: 15, scale: 6 }),
  target: decimal("target", { precision: 15, scale: 6 }),
  unit: varchar("unit", { length: 50 }),
  sampleSize: integer("sampleSize").default(5),
  sampleFrequency: integer("sampleFrequency").default(60),
  enabledSpcRules: text("enabledSpcRules"),
  enabledCpkRules: text("enabledCpkRules"),
  enabledCaRules: text("enabledCaRules"),
  isRecurring: integer("isRecurring").default(1),
  notifyOnViolation: integer("notifyOnViolation").default(1),
  createdBy: integer("createdBy"),
  isPublic: integer("isPublic").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type SpcPlanTemplate = typeof spcPlanTemplates.$inferSelect;
export type InsertSpcPlanTemplate = typeof spcPlanTemplates.$inferInsert;


/**
 * User Prediction Configs - Lưu cấu hình dự báo theo user
 */
export const userPredictionConfigs = pgTable("user_prediction_configs", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  configType: configTypeEnum("configType").notNull(), // Loại dự báo
  configName: varchar("configName", { length: 100 }).notNull(), // Tên cấu hình
  algorithm: algorithmEnum("algorithm").notNull().default("linear"),
  predictionDays: integer("predictionDays").notNull().default(14),
  confidenceLevel: decimal("confidenceLevel", { precision: 5, scale: 2 }).notNull().default("95.00"),
  alertThreshold: decimal("alertThreshold", { precision: 5, scale: 2 }).notNull().default("5.00"),
  movingAvgWindow: integer("movingAvgWindow").default(7),
  smoothingFactor: decimal("smoothingFactor", { precision: 3, scale: 2 }).default("0.30"),
  historicalDays: integer("historicalDays").notNull().default(30), // Số ngày dữ liệu lịch sử
  isDefault: integer("isDefault").notNull().default(0), // Cấu hình mặc định
  isActive: integer("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type UserPredictionConfig = typeof userPredictionConfigs.$inferSelect;
export type InsertUserPredictionConfig = typeof userPredictionConfigs.$inferInsert;


/**
 * OEE Alert Thresholds - Cấu hình ngưỡng cảnh báo OEE theo máy/dây chuyền
 */
export const oeeAlertThresholds = pgTable("oee_alert_thresholds", {
  id: serial("id").primaryKey(),
  machineId: integer("machineId"), // Null = áp dụng cho tất cả máy trong dây chuyền
  productionLineId: integer("productionLineId"), // Null = áp dụng cho tất cả dây chuyền
  targetOee: decimal("targetOee", { precision: 5, scale: 2 }).notNull().default("85.00"),
  warningThreshold: decimal("warningThreshold", { precision: 5, scale: 2 }).notNull().default("80.00"), // Ngưỡng cảnh báo vàng
  criticalThreshold: decimal("criticalThreshold", { precision: 5, scale: 2 }).notNull().default("70.00"), // Ngưỡng cảnh báo đỏ
  dropAlertThreshold: decimal("dropAlertThreshold", { precision: 5, scale: 2 }).notNull().default("5.00"), // % giảm để cảnh báo
  relativeDropThreshold: decimal("relativeDropThreshold", { precision: 5, scale: 2 }).notNull().default("10.00"), // % giảm tương đối
  availabilityTarget: decimal("availabilityTarget", { precision: 5, scale: 2 }).default("90.00"),
  performanceTarget: decimal("performanceTarget", { precision: 5, scale: 2 }).default("95.00"),
  qualityTarget: decimal("qualityTarget", { precision: 5, scale: 2 }).default("99.00"),
  isActive: integer("isActive").notNull().default(1),
  createdBy: integer("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type OeeAlertThreshold = typeof oeeAlertThresholds.$inferSelect;
export type InsertOeeAlertThreshold = typeof oeeAlertThresholds.$inferInsert;


// ==================== Machine Integration API ====================

/**
 * API Keys for machine vendors to push data
 */
export const machineApiKeys = pgTable("machine_api_keys", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  apiKey: varchar("apiKey", { length: 64 }).notNull().unique(),
  apiKeyHash: varchar("apiKeyHash", { length: 255 }).notNull(), // Hashed version for security
  vendorName: varchar("vendorName", { length: 255 }).notNull(), // AOI, AVI, etc.
  machineType: varchar("machineType", { length: 100 }).notNull(), // aoi, avi, spi, etc.
  machineId: integer("machineId"), // Link to specific machine if applicable
  productionLineId: integer("productionLineId"), // Link to production line
  permissions: text("permissions"), // JSON array of allowed endpoints
  rateLimit: integer("rateLimit").notNull().default(100), // Requests per minute
  isActive: integer("isActive").notNull().default(1),
  expiresAt: timestamp("expiresAt"), // Optional expiration
  lastUsedAt: timestamp("lastUsedAt"),
  createdBy: integer("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type MachineApiKey = typeof machineApiKeys.$inferSelect;
export type InsertMachineApiKey = typeof machineApiKeys.$inferInsert;

/**
 * Log all API requests from machines
 */
export const machineDataLogs = pgTable("machine_data_logs", {
  id: serial("id").primaryKey(),
  apiKeyId: integer("apiKeyId").notNull(),
  endpoint: varchar("endpoint", { length: 255 }).notNull(),
  method: varchar("method", { length: 10 }).notNull(),
  requestBody: text("requestBody"), // JSON request payload
  responseStatus: integer("responseStatus").notNull(),
  responseBody: text("responseBody"), // JSON response
  processingTimeMs: integer("processingTimeMs"),
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
export const machineIntegrationConfigs = pgTable("machine_integration_configs", {
  id: serial("id").primaryKey(),
  apiKeyId: integer("apiKeyId").notNull(),
  configType: varchar("configType", { length: 50 }).notNull(), // field_mapping, webhook, etc.
  configName: varchar("configName", { length: 255 }).notNull(),
  configValue: text("configValue").notNull(), // JSON configuration
  isActive: integer("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type MachineIntegrationConfig = typeof machineIntegrationConfigs.$inferSelect;
export type InsertMachineIntegrationConfig = typeof machineIntegrationConfigs.$inferInsert;

/**
 * Inspection data from AOI/AVI machines
 */
export const machineInspectionData = pgTable("machine_inspection_data", {
  id: serial("id").primaryKey(),
  apiKeyId: integer("apiKeyId").notNull(),
  machineId: integer("machineId"),
  productionLineId: integer("productionLineId"),
  batchId: varchar("batchId", { length: 100 }),
  productCode: varchar("productCode", { length: 100 }),
  serialNumber: varchar("serialNumber", { length: 100 }),
  inspectionType: varchar("inspectionType", { length: 50 }).notNull(), // aoi, avi, spi, etc.
  inspectionResult: varchar("inspectionResult", { length: 20 }).notNull(), // pass, fail, rework
  defectCount: integer("defectCount").default(0),
  defectTypes: text("defectTypes"), // JSON array of defect types
  defectDetails: text("defectDetails"), // JSON detailed defect info
  imageUrls: text("imageUrls"), // JSON array of image URLs
  inspectedAt: timestamp("inspectedAt").notNull(),
  cycleTimeMs: integer("cycleTimeMs"),
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
export const machineMeasurementData = pgTable("machine_measurement_data", {
  id: serial("id").primaryKey(),
  apiKeyId: integer("apiKeyId").notNull(),
  machineId: integer("machineId"),
  productionLineId: integer("productionLineId"),
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
  isWithinSpec: integer("isWithinSpec"),
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
export const machineOeeData = pgTable("machine_oee_data", {
  id: serial("id").primaryKey(),
  apiKeyId: integer("apiKeyId").notNull(),
  machineId: integer("machineId"),
  productionLineId: integer("productionLineId"),
  shiftId: varchar("shiftId", { length: 50 }),
  recordDate: varchar("recordDate", { length: 10 }).notNull(), // YYYY-MM-DD
  plannedProductionTime: integer("plannedProductionTime"), // minutes
  actualProductionTime: integer("actualProductionTime"), // minutes
  downtime: integer("downtime"), // minutes
  downtimeReasons: text("downtimeReasons"), // JSON array
  idealCycleTime: decimal("idealCycleTime", { precision: 10, scale: 4 }), // seconds
  actualCycleTime: decimal("actualCycleTime", { precision: 10, scale: 4 }),
  totalCount: integer("totalCount"),
  goodCount: integer("goodCount"),
  rejectCount: integer("rejectCount"),
  reworkCount: integer("reworkCount"),
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
export const machineWebhookConfigs = pgTable("machine_webhook_configs", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  webhookUrl: varchar("webhookUrl", { length: 500 }).notNull(),
  webhookSecret: varchar("webhookSecret", { length: 255 }),
  triggerType: triggerTypeEnum("triggerType").notNull(),
  machineIds: text("machineIds"), // JSON array of machine IDs, null = all machines
  oeeThreshold: decimal("oeeThreshold", { precision: 5, scale: 2 }), // Trigger when OEE below this
  isActive: integer("isActive").notNull().default(1),
  retryCount: integer("retryCount").notNull().default(3),
  retryDelaySeconds: integer("retryDelaySeconds").notNull().default(60),
  headers: text("headers"), // JSON object for custom headers
  createdBy: integer("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type MachineWebhookConfig = typeof machineWebhookConfigs.$inferSelect;
export type InsertMachineWebhookConfig = typeof machineWebhookConfigs.$inferInsert;

// ==================== Machine Webhook Logs ====================
export const machineWebhookLogs = pgTable("machine_webhook_logs", {
  id: serial("id").primaryKey(),
  webhookConfigId: integer("webhookConfigId").notNull(),
  triggerType: varchar("triggerType", { length: 50 }).notNull(),
  triggerDataId: integer("triggerDataId"), // ID of the data that triggered webhook
  requestPayload: text("requestPayload"),
  responseStatus: integer("responseStatus"),
  responseBody: text("responseBody"),
  responseTime: integer("responseTime"), // milliseconds
  attempt: integer("attempt").notNull().default(1),
  status: statusEnum("status").notNull().default("pending"),
  errorMessage: text("errorMessage"),
  triggeredAt: timestamp("triggeredAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type MachineWebhookLog = typeof machineWebhookLogs.$inferSelect;
export type InsertMachineWebhookLog = typeof machineWebhookLogs.$inferInsert;

// ==================== Machine Field Mappings ====================
export const machineFieldMappings = pgTable("machine_field_mappings", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  apiKeyId: integer("apiKeyId"), // Specific to API key, null = global
  machineType: varchar("machineType", { length: 100 }), // AOI, AVI, CMM, etc.
  sourceField: varchar("sourceField", { length: 200 }).notNull(), // Field name from machine data
  targetField: varchar("targetField", { length: 200 }).notNull(), // Field name in SPC system
  targetTable: targetTableEnum("targetTable").notNull(),
  transformType: transformTypeEnum("transformType").notNull().default("direct"),
  transformValue: decimal("transformValue", { precision: 15, scale: 6 }), // Value for transform
  customTransform: text("customTransform"), // Custom JS expression
  defaultValue: varchar("defaultValue", { length: 255 }), // Default if source is null
  isRequired: integer("isRequired").notNull().default(0),
  isActive: integer("isActive").notNull().default(1),
  createdBy: integer("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type MachineFieldMapping = typeof machineFieldMappings.$inferSelect;
export type InsertMachineFieldMapping = typeof machineFieldMappings.$inferInsert;

// ==================== Machine Realtime Events (for SSE) ====================
export const machineRealtimeEvents = pgTable("machine_realtime_events", {
  id: serial("id").primaryKey(),
  eventType: eventTypeEnum("eventType").notNull(),
  machineId: integer("machineId"),
  machineName: varchar("machineName", { length: 200 }),
  apiKeyId: integer("apiKeyId"),
  eventData: text("eventData").notNull(), // JSON data
  severity: severityEnum("severity").notNull().default("info"),
  isProcessed: integer("isProcessed").notNull().default(0),
  processedAt: timestamp("processedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MachineRealtimeEvent = typeof machineRealtimeEvents.$inferSelect;
export type InsertMachineRealtimeEvent = typeof machineRealtimeEvents.$inferInsert;


// OEE Alert Configurations
export const oeeAlertConfigs = pgTable("oee_alert_configs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  machineId: integer("machine_id"), // null = all machines
  oeeThreshold: decimal("oee_threshold", { precision: 5, scale: 2 }).notNull(), // e.g., 85.00
  consecutiveDays: integer("consecutive_days").notNull().default(3), // trigger after N days
  recipients: text("recipients").notNull(), // JSON array of emails
  isActive: integer("is_active").notNull().default(1),
  lastTriggeredAt: timestamp("last_triggered_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type OeeAlertConfig = typeof oeeAlertConfigs.$inferSelect;
export type InsertOeeAlertConfig = typeof oeeAlertConfigs.$inferInsert;

// OEE Alert History
export const oeeAlertHistory = pgTable("oee_alert_history", {
  id: serial("id").primaryKey(),
  alertConfigId: integer("alert_config_id").notNull(),
  machineId: integer("machine_id"),
  machineName: varchar("machine_name", { length: 255 }),
  oeeValue: decimal("oee_value", { precision: 5, scale: 2 }).notNull(),
  consecutiveDaysBelow: integer("consecutive_days_below").notNull(),
  recipients: text("recipients").notNull(),
  emailSent: integer("email_sent").notNull().default(0),
  emailSentAt: timestamp("email_sent_at"),
  acknowledged: integer("acknowledged").notNull().default(0),
  acknowledgedAt: timestamp("acknowledged_at"),
  acknowledgedBy: varchar("acknowledged_by", { length: 255 }),
  resolved: integer("resolved").notNull().default(0),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: varchar("resolved_by", { length: 255 }),
  resolution: text("resolution"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type OeeAlertHistory = typeof oeeAlertHistory.$inferSelect;
export type InsertOeeAlertHistory = typeof oeeAlertHistory.$inferInsert;

// OEE Report Schedules
export const oeeReportSchedules = pgTable("oee_report_schedules", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  frequency: frequencyEnum("frequency").notNull(),
  dayOfWeek: integer("day_of_week"), // 0-6 for weekly (0=Sunday)
  dayOfMonth: integer("day_of_month"), // 1-31 for monthly
  hour: integer("hour").notNull().default(8), // Hour to send (0-23)
  machineIds: text("machine_ids"), // JSON array, null = all machines
  recipients: text("recipients").notNull(), // JSON array of emails
  includeCharts: integer("include_charts").notNull().default(1),
  includeTrend: integer("include_trend").notNull().default(1),
  includeComparison: integer("include_comparison").notNull().default(1),
  isActive: integer("is_active").notNull().default(1),
  lastSentAt: timestamp("last_sent_at"),
  nextScheduledAt: timestamp("next_scheduled_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type OeeReportSchedule = typeof oeeReportSchedules.$inferSelect;
export type InsertOeeReportSchedule = typeof oeeReportSchedules.$inferInsert;

// OEE Report History
export const oeeReportHistory = pgTable("oee_report_history", {
  id: serial("id").primaryKey(),
  scheduleId: integer("schedule_id").notNull(),
  reportPeriodStart: timestamp("report_period_start").notNull(),
  reportPeriodEnd: timestamp("report_period_end").notNull(),
  recipients: text("recipients").notNull(),
  reportData: text("report_data"), // JSON summary
  emailSent: integer("email_sent").notNull().default(0),
  emailSentAt: timestamp("email_sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type OeeReportHistory = typeof oeeReportHistory.$inferSelect;
export type InsertOeeReportHistory = typeof oeeReportHistory.$inferInsert;

// Downtime Reasons (for Pareto analysis)
export const downtimeReasons = pgTable("downtime_reasons", {
  id: serial("id").primaryKey(),
  machineId: integer("machine_id"),
  oeeDataId: integer("oee_data_id"),
  reasonCode: varchar("reason_code", { length: 50 }).notNull(),
  reasonCategory: varchar("reason_category", { length: 100 }), // e.g., "Equipment", "Material", "Labor"
  reasonDescription: varchar("reason_description", { length: 500 }),
  durationMinutes: integer("duration_minutes").notNull(),
  occurredAt: timestamp("occurred_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type DowntimeReason = typeof downtimeReasons.$inferSelect;
export type InsertDowntimeReason = typeof downtimeReasons.$inferInsert;
