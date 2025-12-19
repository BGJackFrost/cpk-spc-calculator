/**
 * PostgreSQL Schema for Drizzle ORM
 * 
 * Schema này tương thích với MySQL schema hiện tại
 * Sử dụng khi DATABASE_TYPE=postgresql
 */

import { 
  pgTable, 
  serial, 
  integer, 
  varchar, 
  text, 
  timestamp, 
  decimal,
  boolean,
  jsonb,
  date,
  pgEnum,
  uniqueIndex,
  index
} from "drizzle-orm/pg-core";

// ============================================================
// ENUM Types
// ============================================================

export const roleEnum = pgEnum("role", ["user", "manager", "admin"]);
export const authTypeEnum = pgEnum("auth_type", ["local", "manus", "online"]);
export const eventTypeEnum = pgEnum("event_type", ["login", "logout", "login_failed", "status", "data_received", "error", "webhook_triggered", "alert", "measurement", "inspection", "oee"]);
export const licenseTypeEnum = pgEnum("license_type", ["trial", "standard", "professional", "enterprise"]);
export const licenseStatusEnum = pgEnum("license_status", ["pending", "active", "expired", "revoked"]);
export const activationModeEnum = pgEnum("activation_mode", ["online", "offline", "hybrid"]);
export const machineStatusEnum = pgEnum("machine_status", ["active", "maintenance", "inactive", "idle", "running", "stopped", "error"]);
export const webhookTypeEnum = pgEnum("webhook_type", ["slack", "teams", "custom"]);
export const severityEnum = pgEnum("severity", ["info", "low", "medium", "warning", "critical"]);

// ============================================================
// Core User Tables
// ============================================================

/**
 * Core user table backing auth flow.
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("open_id", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  avatar: varchar("avatar", { length: 500 }),
  loginMethod: varchar("login_method", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastSignedIn: timestamp("last_signed_in").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Local users for offline authentication
 */
export const localUsers = pgTable("local_users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  avatar: varchar("avatar", { length: 500 }),
  role: roleEnum("role").default("user").notNull(),
  isActive: integer("is_active").notNull().default(1),
  mustChangePassword: integer("must_change_password").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastSignedIn: timestamp("last_signed_in"),
});

export type LocalUser = typeof localUsers.$inferSelect;
export type InsertLocalUser = typeof localUsers.$inferInsert;

/**
 * Login history - tracks user login/logout events for audit
 */
export const loginHistory = pgTable("login_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  username: varchar("username", { length: 100 }).notNull(),
  authType: authTypeEnum("auth_type").notNull().default("local"),
  eventType: eventTypeEnum("event_type").notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type LoginHistory = typeof loginHistory.$inferSelect;
export type InsertLoginHistory = typeof loginHistory.$inferInsert;

// ============================================================
// Organization Tables
// ============================================================

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
  taxCode: varchar("tax_code", { length: 50 }),
  logo: varchar("logo", { length: 500 }),
  isActive: integer("is_active").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Company = typeof companies.$inferSelect;
export type InsertCompany = typeof companies.$inferInsert;

/**
 * Departments - Phòng ban
 */
export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  code: varchar("code", { length: 50 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  parentId: integer("parent_id"),
  managerId: integer("manager_id"),
  isActive: integer("is_active").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Department = typeof departments.$inferSelect;
export type InsertDepartment = typeof departments.$inferInsert;

/**
 * Teams - Nhóm/Tổ
 */
export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  departmentId: integer("department_id").notNull(),
  code: varchar("code", { length: 50 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  leaderId: integer("leader_id"),
  isActive: integer("is_active").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
  level: integer("level").notNull().default(1),
  canApprove: integer("can_approve").notNull().default(0),
  approvalLimit: decimal("approval_limit", { precision: 15, scale: 2 }),
  isActive: integer("is_active").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Position = typeof positions.$inferSelect;
export type InsertPosition = typeof positions.$inferInsert;

// ============================================================
// Production & Machine Tables
// ============================================================

/**
 * Production Lines - Dây chuyền sản xuất
 */
export const productionLines = pgTable("production_lines", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 100 }).unique(),
  description: text("description"),
  location: varchar("location", { length: 255 }),
  isActive: integer("is_active").notNull().default(1),
  createdBy: integer("created_by"),
  productId: integer("product_id"),
  processTemplateId: integer("process_template_id"),
  supervisorId: integer("supervisor_id"),
  imageUrl: varchar("image_url", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type ProductionLine = typeof productionLines.$inferSelect;
export type InsertProductionLine = typeof productionLines.$inferInsert;

/**
 * Machines - Máy móc
 */
export const machines = pgTable("machines", {
  id: serial("id").primaryKey(),
  workstationId: integer("workstation_id"),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 100 }).unique(),
  machineType: varchar("machine_type", { length: 100 }),
  manufacturer: varchar("manufacturer", { length: 255 }),
  model: varchar("model", { length: 255 }),
  serialNumber: varchar("serial_number", { length: 255 }),
  installDate: timestamp("install_date"),
  status: machineStatusEnum("status").default("active").notNull(),
  isActive: integer("is_active").notNull().default(1),
  machineTypeId: integer("machine_type_id"),
  imageUrl: varchar("image_url", { length: 500 }),
  productionLineId: integer("production_line_id"),
  location: varchar("location", { length: 255 }),
  description: text("description"),
  lastMaintenanceDate: timestamp("last_maintenance_date"),
  nextMaintenanceDate: timestamp("next_maintenance_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Machine = typeof machines.$inferSelect;
export type InsertMachine = typeof machines.$inferInsert;

/**
 * Machine Online Status
 */
export const machineOnlineStatus = pgTable("machine_online_status", {
  id: serial("id").primaryKey(),
  machineId: integer("machine_id").notNull(),
  isOnline: integer("is_online").notNull().default(0),
  lastSeen: timestamp("last_seen"),
  ipAddress: varchar("ip_address", { length: 45 }),
  connectionType: varchar("connection_type", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type MachineOnlineStatus = typeof machineOnlineStatus.$inferSelect;
export type InsertMachineOnlineStatus = typeof machineOnlineStatus.$inferInsert;

/**
 * Machine API Keys
 */
export const machineApiKeys = pgTable("machine_api_keys", {
  id: serial("id").primaryKey(),
  machineId: integer("machine_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  apiKeyHash: varchar("api_key_hash", { length: 255 }).notNull(),
  apiKeyPrefix: varchar("api_key_prefix", { length: 20 }).notNull(),
  description: text("description"),
  permissions: jsonb("permissions").default('["read", "write"]'),
  isActive: integer("is_active").notNull().default(1),
  lastUsedAt: timestamp("last_used_at"),
  expiresAt: timestamp("expires_at"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type MachineApiKey = typeof machineApiKeys.$inferSelect;
export type InsertMachineApiKey = typeof machineApiKeys.$inferInsert;

// ============================================================
// OEE Tables
// ============================================================

/**
 * OEE Records - Dữ liệu OEE
 */
export const oeeRecords = pgTable("oee_records", {
  id: serial("id").primaryKey(),
  machineId: integer("machine_id").notNull(),
  productionLineId: integer("production_line_id"),
  shiftId: integer("shift_id"),
  recordDate: timestamp("record_date").notNull(),
  plannedProductionTime: integer("planned_production_time").default(0),
  actualRunTime: integer("actual_run_time").default(0),
  downtime: integer("downtime").default(0),
  idealCycleTime: decimal("ideal_cycle_time", { precision: 10, scale: 4 }),
  totalCount: integer("total_count").default(0),
  goodCount: integer("good_count").default(0),
  defectCount: integer("defect_count").default(0),
  availability: decimal("availability", { precision: 5, scale: 2 }),
  performance: decimal("performance", { precision: 5, scale: 2 }),
  quality: decimal("quality", { precision: 5, scale: 2 }),
  oee: decimal("oee", { precision: 5, scale: 2 }),
  notes: text("notes"),
  createdBy: integer("created_by"),
  plannedTime: integer("planned_time"),
  runTime: integer("run_time"),
  cycleTime: decimal("cycle_time", { precision: 10, scale: 4 }),
  totalParts: integer("total_parts"),
  goodParts: integer("good_parts"),
  rejectParts: integer("reject_parts"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type OeeRecord = typeof oeeRecords.$inferSelect;
export type InsertOeeRecord = typeof oeeRecords.$inferInsert;

/**
 * OEE Targets - Mục tiêu OEE
 */
export const oeeTargets = pgTable("oee_targets", {
  id: serial("id").primaryKey(),
  machineId: integer("machine_id"),
  productionLineId: integer("production_line_id"),
  targetOee: decimal("target_oee", { precision: 5, scale: 2 }).notNull().default("85.00"),
  targetAvailability: decimal("target_availability", { precision: 5, scale: 2 }).default("90.00"),
  targetPerformance: decimal("target_performance", { precision: 5, scale: 2 }).default("95.00"),
  targetQuality: decimal("target_quality", { precision: 5, scale: 2 }).default("99.00"),
  effectiveFrom: date("effective_from").notNull(),
  effectiveTo: date("effective_to"),
  isActive: integer("is_active").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type OeeTarget = typeof oeeTargets.$inferSelect;
export type InsertOeeTarget = typeof oeeTargets.$inferInsert;

/**
 * OEE Alert Configs
 */
export const oeeAlertConfigs = pgTable("oee_alert_configs", {
  id: serial("id").primaryKey(),
  machineId: integer("machine_id"),
  productionLineId: integer("production_line_id"),
  oeeThreshold: decimal("oee_threshold", { precision: 5, scale: 2 }).notNull().default("70.00"),
  availabilityThreshold: decimal("availability_threshold", { precision: 5, scale: 2 }).default("80.00"),
  performanceThreshold: decimal("performance_threshold", { precision: 5, scale: 2 }).default("85.00"),
  qualityThreshold: decimal("quality_threshold", { precision: 5, scale: 2 }).default("95.00"),
  consecutiveDays: integer("consecutive_days").default(3),
  notificationEmails: text("notification_emails"),
  isActive: integer("is_active").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type OeeAlertConfig = typeof oeeAlertConfigs.$inferSelect;
export type InsertOeeAlertConfig = typeof oeeAlertConfigs.$inferInsert;

// ============================================================
// SPC Tables
// ============================================================

/**
 * SPC Mappings - Cấu hình SPC
 */
export const spcMappings = pgTable("spc_mappings", {
  id: serial("id").primaryKey(),
  productCode: varchar("product_code", { length: 100 }).notNull(),
  stationName: varchar("station_name", { length: 255 }).notNull(),
  measurementName: varchar("measurement_name", { length: 255 }).notNull(),
  lsl: decimal("lsl", { precision: 20, scale: 6 }),
  usl: decimal("usl", { precision: 20, scale: 6 }),
  target: decimal("target", { precision: 20, scale: 6 }),
  unit: varchar("unit", { length: 50 }),
  description: text("description"),
  isActive: integer("is_active").notNull().default(1),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type SpcMapping = typeof spcMappings.$inferSelect;
export type InsertSpcMapping = typeof spcMappings.$inferInsert;

/**
 * SPC Analysis History
 */
export const spcAnalysisHistory = pgTable("spc_analysis_history", {
  id: serial("id").primaryKey(),
  mappingId: integer("mapping_id"),
  productCode: varchar("product_code", { length: 100 }).notNull(),
  stationName: varchar("station_name", { length: 255 }).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  sampleCount: integer("sample_count").notNull(),
  mean: decimal("mean", { precision: 20, scale: 6 }).notNull(),
  stdDev: decimal("std_dev", { precision: 20, scale: 6 }).notNull(),
  cp: decimal("cp", { precision: 10, scale: 4 }),
  cpk: decimal("cpk", { precision: 10, scale: 4 }),
  pp: decimal("pp", { precision: 10, scale: 4 }),
  ppk: decimal("ppk", { precision: 10, scale: 4 }),
  cpu: decimal("cpu", { precision: 10, scale: 4 }),
  cpl: decimal("cpl", { precision: 10, scale: 4 }),
  lsl: decimal("lsl", { precision: 20, scale: 6 }),
  usl: decimal("usl", { precision: 20, scale: 6 }),
  target: decimal("target", { precision: 20, scale: 6 }),
  minValue: decimal("min_value", { precision: 20, scale: 6 }),
  maxValue: decimal("max_value", { precision: 20, scale: 6 }),
  ucl: decimal("ucl", { precision: 20, scale: 6 }),
  lcl: decimal("lcl", { precision: 20, scale: 6 }),
  centerLine: decimal("center_line", { precision: 20, scale: 6 }),
  ruleViolations: text("rule_violations"),
  outOfSpecCount: integer("out_of_spec_count").default(0),
  outOfControlCount: integer("out_of_control_count").default(0),
  alertTriggered: integer("alert_triggered").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type SpcAnalysisHistory = typeof spcAnalysisHistory.$inferSelect;
export type InsertSpcAnalysisHistory = typeof spcAnalysisHistory.$inferInsert;

// ============================================================
// License Tables
// ============================================================

/**
 * Licenses
 */
export const licenses = pgTable("licenses", {
  id: serial("id").primaryKey(),
  licenseKey: varchar("license_key", { length: 255 }).notNull().unique(),
  licenseType: licenseTypeEnum("license_type").notNull().default("trial"),
  companyName: varchar("company_name", { length: 255 }),
  contactEmail: varchar("contact_email", { length: 320 }),
  maxUsers: integer("max_users").notNull().default(5),
  maxProductionLines: integer("max_production_lines").notNull().default(3),
  maxSpcPlans: integer("max_spc_plans").notNull().default(10),
  features: text("features"),
  issuedAt: timestamp("issued_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
  activatedAt: timestamp("activated_at"),
  activatedBy: integer("activated_by"),
  isActive: integer("is_active").notNull().default(0),
  licenseStatus: licenseStatusEnum("license_status").notNull().default("pending"),
  hardwareFingerprint: varchar("hardware_fingerprint", { length: 64 }),
  offlineLicenseFile: text("offline_license_file"),
  activationMode: activationModeEnum("activation_mode").default("online"),
  lastValidatedAt: timestamp("last_validated_at"),
  price: decimal("price", { precision: 15, scale: 2 }),
  currency: varchar("currency", { length: 3 }).default("VND"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type License = typeof licenses.$inferSelect;
export type InsertLicense = typeof licenses.$inferInsert;

// ============================================================
// Webhook Tables
// ============================================================

/**
 * Webhooks
 */
export const webhooks = pgTable("webhooks", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  url: varchar("url", { length: 2048 }).notNull(),
  webhookType: webhookTypeEnum("webhook_type").notNull().default("custom"),
  secret: varchar("secret", { length: 255 }),
  headers: jsonb("headers"),
  events: jsonb("events").notNull(),
  isActive: integer("is_active").notNull().default(1),
  lastTriggeredAt: timestamp("last_triggered_at"),
  lastStatus: varchar("last_status", { length: 50 }),
  failureCount: integer("failure_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Webhook = typeof webhooks.$inferSelect;
export type InsertWebhook = typeof webhooks.$inferInsert;

/**
 * Webhook Logs
 */
export const webhookLogs = pgTable("webhook_logs", {
  id: serial("id").primaryKey(),
  webhookId: integer("webhook_id").notNull(),
  eventType: varchar("event_type", { length: 100 }).notNull(),
  payload: jsonb("payload"),
  responseStatus: integer("response_status"),
  responseBody: text("response_body"),
  durationMs: integer("duration_ms"),
  isSuccess: integer("is_success").notNull().default(0),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type WebhookLog = typeof webhookLogs.$inferSelect;
export type InsertWebhookLog = typeof webhookLogs.$inferInsert;

// ============================================================
// Notification Tables
// ============================================================

/**
 * Notification Channels
 */
export const notificationChannels = pgTable("notification_channels", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  channelType: varchar("channel_type", { length: 50 }).notNull(),
  channelConfig: jsonb("channel_config").notNull(),
  isActive: integer("is_active").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type NotificationChannel = typeof notificationChannels.$inferSelect;
export type InsertNotificationChannel = typeof notificationChannels.$inferInsert;

/**
 * Realtime Alerts
 */
export const realtimeAlerts = pgTable("realtime_alerts", {
  id: serial("id").primaryKey(),
  machineId: integer("machine_id"),
  alertType: varchar("alert_type", { length: 100 }).notNull(),
  severity: severityEnum("severity").notNull().default("warning"),
  message: text("message").notNull(),
  data: jsonb("data"),
  isAcknowledged: integer("is_acknowledged").notNull().default(0),
  acknowledgedBy: integer("acknowledged_by"),
  acknowledgedAt: timestamp("acknowledged_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type RealtimeAlert = typeof realtimeAlerts.$inferSelect;
export type InsertRealtimeAlert = typeof realtimeAlerts.$inferInsert;

// ============================================================
// Defect & NTF Tables
// ============================================================

/**
 * SPC Defect Records
 */
export const spcDefectRecords = pgTable("spc_defect_records", {
  id: serial("id").primaryKey(),
  mappingId: integer("mapping_id"),
  productCode: varchar("product_code", { length: 100 }).notNull(),
  stationName: varchar("station_name", { length: 255 }).notNull(),
  lotNumber: varchar("lot_number", { length: 100 }),
  serialNumber: varchar("serial_number", { length: 100 }),
  defectType: varchar("defect_type", { length: 100 }).notNull(),
  defectDescription: text("defect_description"),
  defectLocation: varchar("defect_location", { length: 255 }),
  severity: severityEnum("severity").default("medium"),
  quantity: integer("quantity").default(1),
  inspectorId: integer("inspector_id"),
  inspectorName: varchar("inspector_name", { length: 255 }),
  shift: varchar("shift", { length: 50 }),
  verificationStatus: varchar("verification_status", { length: 50 }).default("pending"),
  verifiedBy: integer("verified_by"),
  verifiedAt: timestamp("verified_at"),
  verificationNotes: text("verification_notes"),
  rootCause: text("root_cause"),
  correctiveAction: text("corrective_action"),
  imageUrls: jsonb("image_urls"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type SpcDefectRecord = typeof spcDefectRecords.$inferSelect;
export type InsertSpcDefectRecord = typeof spcDefectRecords.$inferInsert;

/**
 * NTF Alert Config
 */
export const ntfAlertConfig = pgTable("ntf_alert_config", {
  id: serial("id").primaryKey(),
  configKey: varchar("config_key", { length: 100 }).notNull().unique(),
  configValue: text("config_value"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type NtfAlertConfig = typeof ntfAlertConfig.$inferSelect;
export type InsertNtfAlertConfig = typeof ntfAlertConfig.$inferInsert;

// ============================================================
// Measurement Tables
// ============================================================

/**
 * Measurements
 */
export const measurements = pgTable("measurements", {
  id: serial("id").primaryKey(),
  mappingId: integer("mapping_id"),
  productCode: varchar("product_code", { length: 100 }).notNull(),
  stationName: varchar("station_name", { length: 255 }).notNull(),
  measurementName: varchar("measurement_name", { length: 255 }).notNull(),
  value: decimal("value", { precision: 20, scale: 6 }).notNull(),
  unit: varchar("unit", { length: 50 }),
  lotNumber: varchar("lot_number", { length: 100 }),
  serialNumber: varchar("serial_number", { length: 100 }),
  operatorId: integer("operator_id"),
  operatorName: varchar("operator_name", { length: 255 }),
  shift: varchar("shift", { length: 50 }),
  isWithinSpec: integer("is_within_spec"),
  notes: text("notes"),
  measuredAt: timestamp("measured_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Measurement = typeof measurements.$inferSelect;
export type InsertMeasurement = typeof measurements.$inferInsert;

/**
 * Inspection Data
 */
export const inspectionData = pgTable("inspection_data", {
  id: serial("id").primaryKey(),
  machineId: integer("machine_id"),
  productCode: varchar("product_code", { length: 100 }),
  lotNumber: varchar("lot_number", { length: 100 }),
  serialNumber: varchar("serial_number", { length: 100 }),
  inspectionType: varchar("inspection_type", { length: 100 }),
  result: varchar("result", { length: 50 }),
  passCount: integer("pass_count").default(0),
  failCount: integer("fail_count").default(0),
  defectDetails: jsonb("defect_details"),
  inspectorId: integer("inspector_id"),
  inspectorName: varchar("inspector_name", { length: 255 }),
  shift: varchar("shift", { length: 50 }),
  inspectedAt: timestamp("inspected_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type InspectionData = typeof inspectionData.$inferSelect;
export type InsertInspectionData = typeof inspectionData.$inferInsert;

// ============================================================
// Backup & System Tables
// ============================================================

/**
 * Backups
 */
export const backups = pgTable("backups", {
  id: serial("id").primaryKey(),
  backupType: varchar("backup_type", { length: 50 }).notNull().default("manual"),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileSize: integer("file_size"),
  storageLocation: varchar("storage_location", { length: 50 }).notNull().default("local"),
  storagePath: varchar("storage_path", { length: 1024 }),
  tablesIncluded: jsonb("tables_included"),
  status: varchar("status", { length: 50 }).default("completed"),
  errorMessage: text("error_message"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Backup = typeof backups.$inferSelect;
export type InsertBackup = typeof backups.$inferInsert;

// ============================================================
// Export all types for convenience
// ============================================================

export * from "drizzle-orm/pg-core";

// ============================================================
// Database Connection & Sync Tables
// ============================================================

/**
 * Database Connections - Quản lý kết nối database
 */
export const databaseConnections = pgTable("database_connections", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  databaseType: varchar("database_type", { length: 50 }).notNull(),
  host: varchar("host", { length: 255 }).notNull(),
  port: integer("port").notNull(),
  database: varchar("database", { length: 255 }).notNull(),
  username: varchar("username", { length: 255 }).notNull(),
  passwordEncrypted: text("password_encrypted"),
  description: text("description"),
  purpose: varchar("purpose", { length: 100 }),
  sslEnabled: integer("ssl_enabled").notNull().default(0),
  maxConnections: integer("max_connections").notNull().default(10),
  connectionTimeout: integer("connection_timeout").notNull().default(30000),
  healthCheckEnabled: integer("health_check_enabled").notNull().default(1),
  healthCheckInterval: integer("health_check_interval").notNull().default(60000),
  isDefault: integer("is_default").notNull().default(0),
  isPrimary: integer("is_primary").notNull().default(0),
  syncEnabled: integer("sync_enabled").notNull().default(0),
  isActive: integer("is_active").notNull().default(1),
  lastHealthCheck: timestamp("last_health_check"),
  healthStatus: varchar("health_status", { length: 50 }).default("unknown"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: integer("created_by"),
});

export type DatabaseConnection = typeof databaseConnections.$inferSelect;
export type InsertDatabaseConnection = typeof databaseConnections.$inferInsert;

/**
 * Database Sync Logs - Log đồng bộ database
 */
export const databaseSyncLogs = pgTable("database_sync_logs", {
  id: serial("id").primaryKey(),
  sourceConnectionId: integer("source_connection_id").notNull(),
  targetConnectionId: integer("target_connection_id").notNull(),
  tableName: varchar("table_name", { length: 255 }).notNull(),
  syncType: varchar("sync_type", { length: 50 }).notNull(),
  recordsInserted: integer("records_inserted").notNull().default(0),
  recordsUpdated: integer("records_updated").notNull().default(0),
  recordsDeleted: integer("records_deleted").notNull().default(0),
  recordsFailed: integer("records_failed").notNull().default(0),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  status: varchar("status", { length: 50 }).notNull().default("running"),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type DatabaseSyncLog = typeof databaseSyncLogs.$inferSelect;
export type InsertDatabaseSyncLog = typeof databaseSyncLogs.$inferInsert;
