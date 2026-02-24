import { mysqlTable, mysqlSchema, AnyMySqlColumn, int, varchar, timestamp, index, json, decimal, text, mysqlEnum, datetime, bigint, tinyint, boolean, date } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"


// === IOT Domain Tables ===

export const iotAlarms = mysqlTable("iot_alarms", {
	id: int().autoincrement().notNull(),
	deviceId: int("device_id").notNull(),
	alarmCode: varchar("alarm_code", { length: 50 }).notNull(),
	alarmType: mysqlEnum("alarm_type", ['warning','error','critical']).notNull(),
	message: text().notNull(),
	value: varchar({ length: 255 }),
	threshold: varchar({ length: 255 }),
	acknowledgedBy: int("acknowledged_by"),
	acknowledgedAt: timestamp("acknowledged_at", { mode: 'string' }),
	resolvedAt: timestamp("resolved_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});


export const iotAlertHistory = mysqlTable("iot_alert_history", {
	id: int().autoincrement().notNull(),
	thresholdId: int("threshold_id").notNull(),
	deviceId: int("device_id").notNull(),
	metric: varchar({ length: 100 }).notNull(),
	alertType: varchar("alert_type", { length: 50 }).notNull(),
	value: varchar({ length: 50 }).notNull(),
	threshold: varchar({ length: 50 }).notNull(),
	message: text(),
	notificationSent: int("notification_sent").default(0).notNull(),
	notificationChannels: text("notification_channels"),
	acknowledgedBy: int("acknowledged_by"),
	acknowledgedAt: timestamp("acknowledged_at", { mode: 'string' }),
	resolvedAt: timestamp("resolved_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});


export const iotAlertThresholds = mysqlTable("iot_alert_thresholds", {
	id: int().autoincrement().notNull(),
	deviceId: int("device_id").notNull(),
	metric: varchar({ length: 100 }).notNull(),
	upperLimit: varchar("upper_limit", { length: 50 }),
	lowerLimit: varchar("lower_limit", { length: 50 }),
	upperWarning: varchar("upper_warning", { length: 50 }),
	lowerWarning: varchar("lower_warning", { length: 50 }),
	alertEnabled: int("alert_enabled").default(1).notNull(),
	notificationChannels: text("notification_channels"),
	cooldownMinutes: int("cooldown_minutes").default(5).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});


export const iotDataPoints = mysqlTable("iot_data_points", {
	id: int().autoincrement().notNull(),
	deviceId: int("device_id").notNull(),
	tagName: varchar("tag_name", { length: 100 }).notNull(),
	tagType: mysqlEnum("tag_type", ['analog','digital','string','counter']).notNull(),
	value: varchar({ length: 255 }).notNull(),
	quality: mysqlEnum(['good','bad','uncertain']).default('good').notNull(),
	timestamp: timestamp({ mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});


export const iotDeviceData = mysqlTable("iot_device_data", {
	id: int().autoincrement().notNull(),
	deviceId: varchar("device_id", { length: 64 }).notNull(),
	deviceName: varchar("device_name", { length: 100 }),
	deviceType: varchar("device_type", { length: 50 }),
	status: mysqlEnum(['online','offline','error','maintenance']).default('offline').notNull(),
	lastSeen: timestamp("last_seen", { mode: 'string' }),
	firmwareVersion: varchar("firmware_version", { length: 50 }),
	ipAddress: varchar("ip_address", { length: 45 }),
	macAddress: varchar("mac_address", { length: 17 }),
	location: varchar({ length: 255 }),
	metrics: text(),
	temperature: decimal({ precision: 5, scale: 2 }),
	humidity: decimal({ precision: 5, scale: 2 }),
	pressure: decimal({ precision: 8, scale: 2 }),
	batteryLevel: int("battery_level"),
	signalStrength: int("signal_strength"),
	errorCount: int("error_count").default(0).notNull(),
	lastError: text("last_error"),
	metadata: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});


export const iotDevices = mysqlTable("iot_devices", {
	id: int().autoincrement().notNull(),
	deviceCode: varchar("device_code", { length: 50 }).notNull(),
	deviceName: varchar("device_name", { length: 100 }).notNull(),
	deviceType: mysqlEnum("device_type", ['plc','sensor','gateway','hmi','scada','other']).notNull(),
	manufacturer: varchar({ length: 100 }),
	model: varchar({ length: 100 }),
	protocol: mysqlEnum(['modbus_tcp','modbus_rtu','opc_ua','mqtt','http','tcp','serial']).notNull(),
	connectionString: text("connection_string"),
	machineId: int("machine_id"),
	productionLineId: int("production_line_id"),
	status: mysqlEnum(['online','offline','error','maintenance']).default('offline').notNull(),
	lastHeartbeat: timestamp("last_heartbeat", { mode: 'string' }),
	configData: text("config_data"),
	metadata: text(),
	isActive: int("is_active").default(1).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("device_code").on(table.deviceCode),
]);


export const iotDeviceGroups = mysqlTable("iot_device_groups", {
  id: int().autoincrement().primaryKey(),
  name: varchar({ length: 100 }).notNull(),
  description: text(),
  parentGroupId: int("parent_group_id"),
  location: varchar({ length: 255 }),
  icon: varchar({ length: 50 }).default('folder'),
  color: varchar({ length: 20 }).default('#3b82f6'),
  sortOrder: int("sort_order").default(0),
  isActive: int("is_active").default(1).notNull(),
  createdBy: int("created_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_iot_groups_parent").on(table.parentGroupId),
  index("idx_iot_groups_name").on(table.name),
]);

// IoT Device Templates

export const iotDeviceTemplates = mysqlTable("iot_device_templates", {
  id: int().autoincrement().primaryKey(),
  name: varchar({ length: 100 }).notNull(),
  description: text(),
  deviceType: mysqlEnum("device_type", ['plc','sensor','gateway','hmi','scada','other']).notNull(),
  manufacturer: varchar({ length: 100 }),
  model: varchar({ length: 100 }),
  protocol: mysqlEnum(['modbus_tcp','modbus_rtu','opc_ua','mqtt','http','tcp','serial']).notNull(),
  defaultConfig: json("default_config"),
  metricsConfig: json("metrics_config"),
  alertThresholds: json("alert_thresholds"),
  tags: json(),
  icon: varchar({ length: 50 }).default('cpu'),
  isActive: int("is_active").default(1).notNull(),
  createdBy: int("created_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_iot_templates_device_type").on(table.deviceType),
  index("idx_iot_templates_protocol").on(table.protocol),
]);

// IoT Device Health Scores

export const iotDeviceHealth = mysqlTable("iot_device_health", {
  id: int().autoincrement().primaryKey(),
  deviceId: int("device_id").notNull(),
  healthScore: decimal("health_score", { precision: 5, scale: 2 }).default('100.00'),
  availabilityScore: decimal("availability_score", { precision: 5, scale: 2 }).default('100.00'),
  performanceScore: decimal("performance_score", { precision: 5, scale: 2 }).default('100.00'),
  qualityScore: decimal("quality_score", { precision: 5, scale: 2 }).default('100.00'),
  uptimeHours: decimal("uptime_hours", { precision: 10, scale: 2 }).default('0'),
  downtimeHours: decimal("downtime_hours", { precision: 10, scale: 2 }).default('0'),
  errorCount: int("error_count").default(0),
  warningCount: int("warning_count").default(0),
  lastErrorAt: timestamp("last_error_at", { mode: 'string' }),
  lastMaintenanceAt: timestamp("last_maintenance_at", { mode: 'string' }),
  nextMaintenanceAt: timestamp("next_maintenance_at", { mode: 'string' }),
  calculatedAt: timestamp("calculated_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
  index("idx_iot_health_device").on(table.deviceId),
  index("idx_iot_health_score").on(table.healthScore),
  index("idx_iot_health_calculated").on(table.calculatedAt),
]);

// IoT Maintenance Schedules

export const iotMaintenanceSchedules = mysqlTable("iot_maintenance_schedules", {
  id: int().autoincrement().primaryKey(),
  deviceId: int("device_id").notNull(),
  title: varchar({ length: 255 }).notNull(),
  description: text(),
  maintenanceType: mysqlEnum("maintenance_type", ['preventive','corrective','predictive','calibration','inspection']).notNull(),
  priority: mysqlEnum(['low','medium','high','critical']).default('medium'),
  scheduledDate: timestamp("scheduled_date", { mode: 'string' }).notNull(),
  estimatedDuration: int("estimated_duration").default(60),
  assignedTo: int("assigned_to"),
  status: mysqlEnum(['scheduled','in_progress','completed','cancelled','overdue']).default('scheduled'),
  completedAt: timestamp("completed_at", { mode: 'string' }),
  completedBy: int("completed_by"),
  notes: text(),
  partsUsed: json("parts_used"),
  cost: decimal({ precision: 12, scale: 2 }),
  recurrenceRule: varchar("recurrence_rule", { length: 255 }),
  nextOccurrence: timestamp("next_occurrence", { mode: 'string' }),
  createdBy: int("created_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_iot_maintenance_device").on(table.deviceId),
  index("idx_iot_maintenance_scheduled").on(table.scheduledDate),
  index("idx_iot_maintenance_status").on(table.status),
  index("idx_iot_maintenance_assigned").on(table.assignedTo),
]);

// IoT Device Firmware

export const iotDeviceFirmware = mysqlTable("iot_device_firmware", {
  id: int().autoincrement().primaryKey(),
  deviceId: int("device_id").notNull(),
  version: varchar({ length: 50 }).notNull(),
  releaseDate: timestamp("release_date", { mode: 'string' }),
  changelog: text(),
  fileUrl: varchar("file_url", { length: 500 }),
  fileSize: int("file_size"),
  checksum: varchar({ length: 64 }),
  status: mysqlEnum(['available','downloading','installing','installed','failed','rollback']).default('available'),
  installedAt: timestamp("installed_at", { mode: 'string' }),
  installedBy: int("installed_by"),
  previousVersion: varchar("previous_version", { length: 50 }),
  isCurrent: int("is_current").default(0),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_iot_firmware_device").on(table.deviceId),
  index("idx_iot_firmware_version").on(table.version),
  index("idx_iot_firmware_status").on(table.status),
]);

// IoT Device Commissioning

export const iotDeviceCommissioning = mysqlTable("iot_device_commissioning", {
  id: int().autoincrement().primaryKey(),
  deviceId: int("device_id").notNull(),
  stepNumber: int("step_number").notNull(),
  stepName: varchar("step_name", { length: 100 }).notNull(),
  stepDescription: text("step_description"),
  status: mysqlEnum(['pending','in_progress','completed','failed','skipped']).default('pending'),
  startedAt: timestamp("started_at", { mode: 'string' }),
  completedAt: timestamp("completed_at", { mode: 'string' }),
  completedBy: int("completed_by"),
  verificationData: json("verification_data"),
  notes: text(),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_iot_commissioning_device").on(table.deviceId),
  index("idx_iot_commissioning_step").on(table.stepNumber),
  index("idx_iot_commissioning_status").on(table.status),
]);

// IoT Alert Escalation Rules

export const iotAlertEscalationRules = mysqlTable("iot_alert_escalation_rules", {
  id: int().autoincrement().primaryKey(),
  name: varchar({ length: 100 }).notNull(),
  description: text(),
  alertType: varchar("alert_type", { length: 50 }),
  severityFilter: json("severity_filter"),
  deviceFilter: json("device_filter"),
  groupFilter: json("group_filter"),
  escalationLevels: json("escalation_levels").notNull(),
  cooldownMinutes: int("cooldown_minutes").default(30),
  isActive: int("is_active").default(1).notNull(),
  createdBy: int("created_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_iot_escalation_alert_type").on(table.alertType),
  index("idx_iot_escalation_active").on(table.isActive),
]);

// IoT Alert Correlations

export const iotAlertCorrelations = mysqlTable("iot_alert_correlations", {
  id: int().autoincrement().primaryKey(),
  name: varchar({ length: 100 }).notNull(),
  description: text(),
  correlationWindowMinutes: int("correlation_window_minutes").default(5),
  sourceAlertPattern: json("source_alert_pattern").notNull(),
  relatedAlertPattern: json("related_alert_pattern").notNull(),
  actionType: mysqlEnum("action_type", ['suppress','merge','escalate','notify']).default('merge'),
  actionConfig: json("action_config"),
  isActive: int("is_active").default(1).notNull(),
  createdBy: int("created_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

// IoT Analytics Reports

export const iotAnalyticsReports = mysqlTable("iot_analytics_reports", {
  id: int().autoincrement().primaryKey(),
  name: varchar({ length: 100 }).notNull(),
  description: text(),
  reportType: mysqlEnum("report_type", ['device_health','energy_consumption','utilization','maintenance','alerts','custom']).notNull(),
  deviceIds: json("device_ids"),
  groupIds: json("group_ids"),
  metrics: json().notNull(),
  timeRange: varchar("time_range", { length: 50 }).default('7d'),
  aggregation: mysqlEnum(['minute','hour','day','week','month']).default('hour'),
  filters: json(),
  chartConfig: json("chart_config"),
  scheduleEnabled: int("schedule_enabled").default(0),
  scheduleFrequency: mysqlEnum("schedule_frequency", ['daily','weekly','monthly']),
  scheduleTime: varchar("schedule_time", { length: 10 }),
  recipients: json(),
  lastGeneratedAt: timestamp("last_generated_at", { mode: 'string' }),
  createdBy: int("created_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_iot_analytics_report_type").on(table.reportType),
  index("idx_iot_analytics_created_by").on(table.createdBy),
]);

// IoT Dashboard Widgets

export const iotDashboardWidgets = mysqlTable("iot_dashboard_widgets", {
  id: int().autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  widgetType: mysqlEnum("widget_type", ['device_status','health_score','alerts','chart','map','kpi','custom']).notNull(),
  title: varchar({ length: 100 }).notNull(),
  config: json().notNull(),
  position: json().notNull(),
  size: json().notNull(),
  refreshInterval: int("refresh_interval").default(30),
  isVisible: int("is_visible").default(1).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_iot_widgets_user").on(table.userId),
  index("idx_iot_widgets_type").on(table.widgetType),
]);

// Type exports for IoT Enhancement

export type IotDeviceGroup = typeof iotDeviceGroups.$inferSelect;

export type InsertIotDeviceGroup = typeof iotDeviceGroups.$inferInsert;

export type IotDeviceTemplate = typeof iotDeviceTemplates.$inferSelect;

export type InsertIotDeviceTemplate = typeof iotDeviceTemplates.$inferInsert;

export type IotDeviceHealthType = typeof iotDeviceHealth.$inferSelect;

export type InsertIotDeviceHealth = typeof iotDeviceHealth.$inferInsert;

export type IotMaintenanceSchedule = typeof iotMaintenanceSchedules.$inferSelect;

export type InsertIotMaintenanceSchedule = typeof iotMaintenanceSchedules.$inferInsert;

export type IotDeviceFirmwareType = typeof iotDeviceFirmware.$inferSelect;

export type InsertIotDeviceFirmware = typeof iotDeviceFirmware.$inferInsert;

export type IotDeviceCommissioningType = typeof iotDeviceCommissioning.$inferSelect;

export type InsertIotDeviceCommissioning = typeof iotDeviceCommissioning.$inferInsert;

export type IotAlertEscalationRule = typeof iotAlertEscalationRules.$inferSelect;

export type InsertIotAlertEscalationRule = typeof iotAlertEscalationRules.$inferInsert;

export type IotAlertCorrelationType = typeof iotAlertCorrelations.$inferSelect;

export type InsertIotAlertCorrelation = typeof iotAlertCorrelations.$inferInsert;

export type IotAnalyticsReportType = typeof iotAnalyticsReports.$inferSelect;

export type InsertIotAnalyticsReport = typeof iotAnalyticsReports.$inferInsert;

export type IotDashboardWidgetType = typeof iotDashboardWidgets.$inferSelect;

export type InsertIotDashboardWidget = typeof iotDashboardWidgets.$inferInsert;


// ============================================
// Phase 96: Advanced IoT Features
// ============================================

// IoT Firmware Packages - Quản lý firmware packages

export const iotFirmwarePackages = mysqlTable("iot_firmware_packages", {
  id: int().autoincrement().primaryKey(),
  name: varchar({ length: 100 }).notNull(),
  version: varchar({ length: 50 }).notNull(),
  description: text(),
  deviceType: mysqlEnum("device_type", ['plc','sensor','gateway','hmi','scada','other']).notNull(),
  manufacturer: varchar({ length: 100 }),
  model: varchar({ length: 100 }),
  fileUrl: varchar("file_url", { length: 500 }).notNull(),
  fileSize: int("file_size").notNull(),
  checksum: varchar({ length: 64 }).notNull(),
  checksumType: mysqlEnum("checksum_type", ['md5','sha1','sha256']).default('sha256'),
  releaseNotes: text("release_notes"),
  minRequiredVersion: varchar("min_required_version", { length: 50 }),
  isStable: int("is_stable").default(1).notNull(),
  isBeta: int("is_beta").default(0).notNull(),
  downloadCount: int("download_count").default(0),
  status: mysqlEnum(['draft','published','deprecated','archived']).default('draft'),
  publishedAt: timestamp("published_at", { mode: 'string' }),
  publishedBy: int("published_by"),
  createdBy: int("created_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_firmware_pkg_device_type").on(table.deviceType),
  index("idx_firmware_pkg_version").on(table.version),
  index("idx_firmware_pkg_status").on(table.status),
]);

// IoT OTA Deployments - Quản lý quá trình deploy firmware

export const iotOtaDeployments = mysqlTable("iot_ota_deployments", {
  id: int().autoincrement().primaryKey(),
  name: varchar({ length: 100 }).notNull(),
  description: text(),
  firmwarePackageId: int("firmware_package_id").notNull(),
  deploymentType: mysqlEnum("deployment_type", ['immediate','scheduled','phased']).default('immediate'),
  targetDeviceIds: json("target_device_ids").notNull(),
  targetGroupIds: json("target_group_ids"),
  scheduledAt: timestamp("scheduled_at", { mode: 'string' }),
  phasedConfig: json("phased_config"),
  totalDevices: int("total_devices").default(0),
  successCount: int("success_count").default(0),
  failedCount: int("failed_count").default(0),
  pendingCount: int("pending_count").default(0),
  inProgressCount: int("in_progress_count").default(0),
  status: mysqlEnum(['draft','scheduled','in_progress','paused','completed','cancelled','failed']).default('draft'),
  startedAt: timestamp("started_at", { mode: 'string' }),
  completedAt: timestamp("completed_at", { mode: 'string' }),
  rollbackEnabled: int("rollback_enabled").default(1).notNull(),
  rollbackOnFailurePercent: int("rollback_on_failure_percent").default(20),
  notifyOnComplete: int("notify_on_complete").default(1),
  notifyOnFailure: int("notify_on_failure").default(1),
  createdBy: int("created_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_ota_deployment_firmware").on(table.firmwarePackageId),
  index("idx_ota_deployment_status").on(table.status),
  index("idx_ota_deployment_scheduled").on(table.scheduledAt),
]);

// IoT OTA Device Status - Trạng thái cập nhật từng thiết bị

export const iotOtaDeviceStatus = mysqlTable("iot_ota_device_status", {
  id: int().autoincrement().primaryKey(),
  deploymentId: int("deployment_id").notNull(),
  deviceId: int("device_id").notNull(),
  previousVersion: varchar("previous_version", { length: 50 }),
  targetVersion: varchar("target_version", { length: 50 }).notNull(),
  status: mysqlEnum(['pending','downloading','downloaded','installing','verifying','completed','failed','rollback']).default('pending'),
  progress: int().default(0),
  downloadProgress: int("download_progress").default(0),
  installProgress: int("install_progress").default(0),
  errorCode: varchar("error_code", { length: 50 }),
  errorMessage: text("error_message"),
  retryCount: int("retry_count").default(0),
  maxRetries: int("max_retries").default(3),
  startedAt: timestamp("started_at", { mode: 'string' }),
  downloadedAt: timestamp("downloaded_at", { mode: 'string' }),
  installedAt: timestamp("installed_at", { mode: 'string' }),
  completedAt: timestamp("completed_at", { mode: 'string' }),
  rolledBackAt: timestamp("rolled_back_at", { mode: 'string' }),
  logs: json(),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_ota_status_deployment").on(table.deploymentId),
  index("idx_ota_status_device").on(table.deviceId),
  index("idx_ota_status_status").on(table.status),
]);

// IoT Floor Plans - Sơ đồ mặt bằng nhà máy

export const iotFloorPlans = mysqlTable("iot_floor_plans", {
  id: int().autoincrement().primaryKey(),
  name: varchar({ length: 100 }).notNull(),
  description: text(),
  buildingName: varchar("building_name", { length: 100 }),
  floorNumber: int("floor_number").default(1),
  imageUrl: varchar("image_url", { length: 500 }).notNull(),
  imageWidth: int("image_width").notNull(),
  imageHeight: int("image_height").notNull(),
  scaleMetersPerPixel: decimal("scale_meters_per_pixel", { precision: 10, scale: 6 }),
  originX: int("origin_x").default(0),
  originY: int("origin_y").default(0),
  rotation: int().default(0),
  metadata: json(),
  isActive: int("is_active").default(1).notNull(),
  sortOrder: int("sort_order").default(0),
  createdBy: int("created_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_floor_plan_building").on(table.buildingName),
  index("idx_floor_plan_active").on(table.isActive),
]);

// IoT Floor Plan Zones - Vùng/khu vực trên sơ đồ

export const iotFloorPlanZones = mysqlTable("iot_floor_plan_zones", {
  id: int().autoincrement().primaryKey(),
  floorPlanId: int("floor_plan_id").notNull(),
  name: varchar({ length: 100 }).notNull(),
  description: text(),
  zoneType: mysqlEnum("zone_type", ['production','warehouse','office','maintenance','restricted','common']).default('production'),
  coordinates: json().notNull(),
  color: varchar({ length: 20 }).default('#3b82f6'),
  opacity: decimal({ precision: 3, scale: 2 }).default('0.30'),
  borderColor: varchar("border_color", { length: 20 }).default('#1d4ed8'),
  borderWidth: int("border_width").default(2),
  isClickable: int("is_clickable").default(1).notNull(),
  alertThreshold: int("alert_threshold").default(3),
  metadata: json(),
  isActive: int("is_active").default(1).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_floor_zone_plan").on(table.floorPlanId),
  index("idx_floor_zone_type").on(table.zoneType),
]);

// IoT Device Positions - Vị trí thiết bị trên sơ đồ

export const iotDevicePositions = mysqlTable("iot_device_positions", {
  id: int().autoincrement().primaryKey(),
  deviceId: int("device_id").notNull(),
  floorPlanId: int("floor_plan_id").notNull(),
  zoneId: int("zone_id"),
  positionX: int("position_x").notNull(),
  positionY: int("position_y").notNull(),
  rotation: int().default(0),
  iconSize: int("icon_size").default(32),
  iconType: varchar("icon_type", { length: 50 }).default('default'),
  labelPosition: mysqlEnum("label_position", ['top','bottom','left','right','none']).default('bottom'),
  showLabel: int("show_label").default(1).notNull(),
  showStatus: int("show_status").default(1).notNull(),
  customIcon: varchar("custom_icon", { length: 500 }),
  metadata: json(),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_device_pos_device").on(table.deviceId),
  index("idx_device_pos_floor").on(table.floorPlanId),
  index("idx_device_pos_zone").on(table.zoneId),
]);

// IoT Prediction Models - Cấu hình model AI cho predictive maintenance

export const iotPredictionModels = mysqlTable("iot_prediction_models", {
  id: int().autoincrement().primaryKey(),
  name: varchar({ length: 100 }).notNull(),
  description: text(),
  modelType: mysqlEnum("model_type", ['health_decay','failure_prediction','anomaly_detection','remaining_life','maintenance_scheduling']).notNull(),
  targetDeviceTypes: json("target_device_types"),
  targetDeviceIds: json("target_device_ids"),
  targetGroupIds: json("target_group_ids"),
  inputFeatures: json("input_features").notNull(),
  outputMetric: varchar("output_metric", { length: 50 }).notNull(),
  algorithm: mysqlEnum(['linear_regression','random_forest','gradient_boosting','neural_network','lstm','arima','prophet']).default('gradient_boosting'),
  hyperparameters: json(),
  trainingConfig: json("training_config"),
  predictionHorizonDays: int("prediction_horizon_days").default(30),
  confidenceThreshold: decimal("confidence_threshold", { precision: 5, scale: 2 }).default('0.70'),
  alertThreshold: decimal("alert_threshold", { precision: 5, scale: 2 }).default('0.80'),
  isActive: int("is_active").default(1).notNull(),
  lastTrainedAt: timestamp("last_trained_at", { mode: 'string' }),
  trainingAccuracy: decimal("training_accuracy", { precision: 5, scale: 4 }),
  validationAccuracy: decimal("validation_accuracy", { precision: 5, scale: 4 }),
  createdBy: int("created_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_pred_model_type").on(table.modelType),
  index("idx_pred_model_active").on(table.isActive),
]);

// IoT Maintenance Predictions - Kết quả dự đoán bảo trì

export const iotMaintenancePredictions = mysqlTable("iot_maintenance_predictions", {
  id: int().autoincrement().primaryKey(),
  modelId: int("model_id").notNull(),
  deviceId: int("device_id").notNull(),
  predictionType: mysqlEnum("prediction_type", ['failure','maintenance_needed','health_decline','anomaly','remaining_life']).notNull(),
  predictedDate: timestamp("predicted_date", { mode: 'string' }),
  predictedValue: decimal("predicted_value", { precision: 10, scale: 4 }),
  confidenceScore: decimal("confidence_score", { precision: 5, scale: 4 }).notNull(),
  severity: mysqlEnum(['low','medium','high','critical']).default('medium'),
  currentHealthScore: decimal("current_health_score", { precision: 5, scale: 2 }),
  predictedHealthScore: decimal("predicted_health_score", { precision: 5, scale: 2 }),
  daysUntilMaintenance: int("days_until_maintenance"),
  contributingFactors: json("contributing_factors"),
  recommendedActions: json("recommended_actions"),
  llmAnalysis: text("llm_analysis"),
  status: mysqlEnum(['active','acknowledged','scheduled','resolved','expired']).default('active'),
  acknowledgedBy: int("acknowledged_by"),
  acknowledgedAt: timestamp("acknowledged_at", { mode: 'string' }),
  scheduledMaintenanceId: int("scheduled_maintenance_id"),
  resolvedAt: timestamp("resolved_at", { mode: 'string' }),
  actualOutcome: text("actual_outcome"),
  wasAccurate: int("was_accurate"),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_pred_model").on(table.modelId),
  index("idx_pred_device").on(table.deviceId),
  index("idx_pred_type").on(table.predictionType),
  index("idx_pred_status").on(table.status),
  index("idx_pred_severity").on(table.severity),
  index("idx_pred_date").on(table.predictedDate),
]);

// IoT Device Health History - Lịch sử health score để training AI

export const iotDeviceHealthHistory = mysqlTable("iot_device_health_history", {
  id: int().autoincrement().primaryKey(),
  deviceId: int("device_id").notNull(),
  healthScore: decimal("health_score", { precision: 5, scale: 2 }).notNull(),
  availabilityScore: decimal("availability_score", { precision: 5, scale: 2 }),
  performanceScore: decimal("performance_score", { precision: 5, scale: 2 }),
  qualityScore: decimal("quality_score", { precision: 5, scale: 2 }),
  uptimeHours: decimal("uptime_hours", { precision: 10, scale: 2 }),
  downtimeHours: decimal("downtime_hours", { precision: 10, scale: 2 }),
  errorCount: int("error_count").default(0),
  warningCount: int("warning_count").default(0),
  temperature: decimal({ precision: 6, scale: 2 }),
  vibration: decimal({ precision: 8, scale: 4 }),
  powerConsumption: decimal("power_consumption", { precision: 10, scale: 2 }),
  cycleCount: int("cycle_count"),
  operatingHours: decimal("operating_hours", { precision: 12, scale: 2 }),
  additionalMetrics: json("additional_metrics"),
  recordedAt: timestamp("recorded_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
  index("idx_health_hist_device").on(table.deviceId),
  index("idx_health_hist_recorded").on(table.recordedAt),
  index("idx_health_hist_score").on(table.healthScore),
]);

// Type exports for Phase 96

export type IotFirmwarePackage = typeof iotFirmwarePackages.$inferSelect;

export type InsertIotFirmwarePackage = typeof iotFirmwarePackages.$inferInsert;

export type IotOtaDeployment = typeof iotOtaDeployments.$inferSelect;

export type InsertIotOtaDeployment = typeof iotOtaDeployments.$inferInsert;

export type IotOtaDeviceStatus = typeof iotOtaDeviceStatus.$inferSelect;

export type InsertIotOtaDeviceStatus = typeof iotOtaDeviceStatus.$inferInsert;

export type IotFloorPlan = typeof iotFloorPlans.$inferSelect;

export type InsertIotFloorPlan = typeof iotFloorPlans.$inferInsert;

export type IotFloorPlanZone = typeof iotFloorPlanZones.$inferSelect;

export type InsertIotFloorPlanZone = typeof iotFloorPlanZones.$inferInsert;

export type IotDevicePosition = typeof iotDevicePositions.$inferSelect;

export type InsertIotDevicePosition = typeof iotDevicePositions.$inferInsert;

export type IotPredictionModel = typeof iotPredictionModels.$inferSelect;

export type InsertIotPredictionModel = typeof iotPredictionModels.$inferInsert;

export type IotMaintenancePrediction = typeof iotMaintenancePredictions.$inferSelect;

export type InsertIotMaintenancePrediction = typeof iotMaintenancePredictions.$inferInsert;

export type IotDeviceHealthHistory = typeof iotDeviceHealthHistory.$inferSelect;

export type InsertIotDeviceHealthHistory = typeof iotDeviceHealthHistory.$inferInsert;


// ============================================
// Phase 97: Advanced IoT Features - Part 2
// ============================================

// IoT OTA Schedules - Lịch cập nhật firmware tự động

export const iotOtaSchedules = mysqlTable("iot_ota_schedules", {
  id: int().autoincrement().primaryKey(),
  name: varchar({ length: 100 }).notNull(),
  description: text(),
  firmwarePackageId: int("firmware_package_id").notNull(),
  targetDeviceIds: json("target_device_ids").notNull(),
  targetGroupIds: json("target_group_ids"),
  scheduleType: mysqlEnum("schedule_type", ['once','daily','weekly','monthly']).default('once'),
  scheduledTime: varchar("scheduled_time", { length: 5 }).notNull(), // HH:MM format
  scheduledDate: timestamp("scheduled_date", { mode: 'string' }), // For 'once' type
  daysOfWeek: json("days_of_week"), // [0-6] for weekly, 0=Sunday
  dayOfMonth: int("day_of_month"), // 1-31 for monthly
  offPeakOnly: tinyint("off_peak_only").default(1),
  offPeakStartTime: varchar("off_peak_start_time", { length: 5 }).default('22:00'),
  offPeakEndTime: varchar("off_peak_end_time", { length: 5 }).default('06:00'),
  timezone: varchar({ length: 50 }).default('Asia/Ho_Chi_Minh'),
  maxConcurrentDevices: int("max_concurrent_devices").default(10),
  retryOnFailure: tinyint("retry_on_failure").default(1),
  maxRetries: int("max_retries").default(3),
  notifyBeforeMinutes: int("notify_before_minutes").default(30),
  notifyChannels: json("notify_channels"), // ['email','sms','webhook']
  status: mysqlEnum(['active','paused','completed','cancelled']).default('active'),
  lastRunAt: timestamp("last_run_at", { mode: 'string' }),
  nextRunAt: timestamp("next_run_at", { mode: 'string' }),
  totalRuns: int("total_runs").default(0),
  successfulRuns: int("successful_runs").default(0),
  failedRuns: int("failed_runs").default(0),
  createdBy: int("created_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_ota_schedule_firmware").on(table.firmwarePackageId),
  index("idx_ota_schedule_status").on(table.status),
  index("idx_ota_schedule_next_run").on(table.nextRunAt),
]);

// IoT OTA Schedule Runs - Lịch sử chạy scheduled OTA

export const iotOtaScheduleRuns = mysqlTable("iot_ota_schedule_runs", {
  id: int().autoincrement().primaryKey(),
  scheduleId: int("schedule_id").notNull(),
  deploymentId: int("deployment_id"), // Link to iot_ota_deployments
  runStartedAt: timestamp("run_started_at", { mode: 'string' }).notNull(),
  runCompletedAt: timestamp("run_completed_at", { mode: 'string' }),
  status: mysqlEnum(['pending','running','completed','failed','cancelled']).default('pending'),
  totalDevices: int("total_devices").default(0),
  successCount: int("success_count").default(0),
  failedCount: int("failed_count").default(0),
  skippedCount: int("skipped_count").default(0),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
  index("idx_schedule_run_schedule").on(table.scheduleId),
  index("idx_schedule_run_status").on(table.status),
  index("idx_schedule_run_started").on(table.runStartedAt),
]);

// IoT 3D Floor Plans - Sơ đồ mặt bằng 3D

export const iot3dFloorPlans = mysqlTable("iot_3d_floor_plans", {
  id: int().autoincrement().primaryKey(),
  name: varchar({ length: 100 }).notNull(),
  description: text(),
  buildingName: varchar("building_name", { length: 100 }),
  floorNumber: int("floor_number").default(1),
  modelUrl: varchar("model_url", { length: 500 }).notNull(), // GLTF/GLB file URL
  modelFormat: mysqlEnum("model_format", ['gltf','glb','obj','fbx']).default('glb'),
  modelScale: decimal("model_scale", { precision: 10, scale: 4 }).default('1.0000'),
  thumbnailUrl: varchar("thumbnail_url", { length: 500 }),
  cameraPosition: json("camera_position"), // {x, y, z}
  cameraTarget: json("camera_target"), // {x, y, z}
  lightingConfig: json("lighting_config"), // ambient, directional lights
  environmentMap: varchar("environment_map", { length: 500 }),
  floorDimensions: json("floor_dimensions"), // {width, height, depth}
  gridEnabled: tinyint("grid_enabled").default(1),
  gridSize: int("grid_size").default(10),
  status: mysqlEnum(['draft','active','archived']).default('draft'),
  createdBy: int("created_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_3d_floor_status").on(table.status),
  index("idx_3d_floor_building").on(table.buildingName),
]);

// IoT 3D Device Positions - Vị trí thiết bị trên mô hình 3D

export const iot3dDevicePositions = mysqlTable("iot_3d_device_positions", {
  id: int().autoincrement().primaryKey(),
  deviceId: int("device_id").notNull(),
  floorPlan3dId: int("floor_plan_3d_id").notNull(),
  positionX: decimal("position_x", { precision: 10, scale: 4 }).notNull(),
  positionY: decimal("position_y", { precision: 10, scale: 4 }).notNull(),
  positionZ: decimal("position_z", { precision: 10, scale: 4 }).notNull(),
  rotationX: decimal("rotation_x", { precision: 10, scale: 4 }).default('0'),
  rotationY: decimal("rotation_y", { precision: 10, scale: 4 }).default('0'),
  rotationZ: decimal("rotation_z", { precision: 10, scale: 4 }).default('0'),
  scale: decimal({ precision: 10, scale: 4 }).default('1.0000'),
  modelOverride: varchar("model_override", { length: 500 }), // Custom 3D model for device
  labelVisible: tinyint("label_visible").default(1),
  labelOffset: json("label_offset"), // {x, y, z}
  animationEnabled: tinyint("animation_enabled").default(1),
  animationType: mysqlEnum("animation_type", ['none','pulse','rotate','bounce','glow']).default('pulse'),
  interactionEnabled: tinyint("interaction_enabled").default(1),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_3d_pos_device").on(table.deviceId),
  index("idx_3d_pos_floor").on(table.floorPlan3dId),
]);

// IoT Maintenance Work Orders - Phiếu công việc bảo trì

export const iotMaintenanceWorkOrders = mysqlTable("iot_maintenance_work_orders", {
  id: int().autoincrement().primaryKey(),
  workOrderNumber: varchar("work_order_number", { length: 50 }).notNull(),
  title: varchar({ length: 255 }).notNull(),
  description: text(),
  deviceId: int("device_id").notNull(),
  predictionId: int("prediction_id"), // Link to iot_maintenance_predictions
  scheduleId: int("schedule_id"), // Link to iot_maintenance_schedules
  workOrderType: mysqlEnum("work_order_type", ['predictive','preventive','corrective','emergency','inspection']).notNull(),
  priority: mysqlEnum(['low','medium','high','critical']).default('medium'),
  status: mysqlEnum(['created','assigned','in_progress','on_hold','completed','cancelled','verified']).default('created'),
  estimatedDuration: int("estimated_duration").default(60), // minutes
  actualDuration: int("actual_duration"),
  estimatedCost: decimal("estimated_cost", { precision: 12, scale: 2 }),
  actualCost: decimal("actual_cost", { precision: 12, scale: 2 }),
  requiredSkills: json("required_skills"), // ['electrical','mechanical','plc']
  requiredParts: json("required_parts"), // [{partId, quantity}]
  assignedTo: int("assigned_to"),
  assignedTeam: varchar("assigned_team", { length: 100 }),
  assignedAt: timestamp("assigned_at", { mode: 'string' }),
  startedAt: timestamp("started_at", { mode: 'string' }),
  completedAt: timestamp("completed_at", { mode: 'string' }),
  verifiedBy: int("verified_by"),
  verifiedAt: timestamp("verified_at", { mode: 'string' }),
  dueDate: timestamp("due_date", { mode: 'string' }),
  completionNotes: text("completion_notes"),
  rootCause: text("root_cause"),
  actionsTaken: text("actions_taken"),
  preventiveMeasures: text("preventive_measures"),
  attachments: json(), // [{url, name, type}]
  createdBy: int("created_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_wo_number").on(table.workOrderNumber),
  index("idx_wo_device").on(table.deviceId),
  index("idx_wo_status").on(table.status),
  index("idx_wo_priority").on(table.priority),
  index("idx_wo_assigned").on(table.assignedTo),
  index("idx_wo_due_date").on(table.dueDate),
]);

// IoT Work Order Tasks - Các công việc chi tiết trong work order

export const iotWorkOrderTasks = mysqlTable("iot_work_order_tasks", {
  id: int().autoincrement().primaryKey(),
  workOrderId: int("work_order_id").notNull(),
  taskNumber: int("task_number").notNull(),
  title: varchar({ length: 255 }).notNull(),
  description: text(),
  estimatedDuration: int("estimated_duration").default(15), // minutes
  actualDuration: int("actual_duration"),
  status: mysqlEnum(['pending','in_progress','completed','skipped']).default('pending'),
  assignedTo: int("assigned_to"),
  completedBy: int("completed_by"),
  completedAt: timestamp("completed_at", { mode: 'string' }),
  notes: text(),
  checklistItems: json("checklist_items"), // [{item, checked}]
  requiredTools: json("required_tools"),
  safetyPrecautions: text("safety_precautions"),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_task_wo").on(table.workOrderId),
  index("idx_task_status").on(table.status),
  index("idx_task_assigned").on(table.assignedTo),
]);

// IoT Work Order Comments - Bình luận/ghi chú trong work order

export const iotWorkOrderComments = mysqlTable("iot_work_order_comments", {
  id: int().autoincrement().primaryKey(),
  workOrderId: int("work_order_id").notNull(),
  userId: int("user_id").notNull(),
  comment: text().notNull(),
  attachments: json(),
  isInternal: tinyint("is_internal").default(0), // Internal notes vs visible to all
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
  index("idx_comment_wo").on(table.workOrderId),
  index("idx_comment_user").on(table.userId),
]);

// IoT Work Order History - Lịch sử thay đổi work order

export const iotWorkOrderHistory = mysqlTable("iot_work_order_history", {
  id: int().autoincrement().primaryKey(),
  workOrderId: int("work_order_id").notNull(),
  userId: int("user_id"),
  action: varchar({ length: 50 }).notNull(), // 'created','status_changed','assigned','completed'
  previousValue: text("previous_value"),
  newValue: text("new_value"),
  description: text(),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
  index("idx_history_wo").on(table.workOrderId),
  index("idx_history_action").on(table.action),
]);

// IoT Technicians - Kỹ thuật viên bảo trì

export const iotTechnicians = mysqlTable("iot_technicians", {
  id: int().autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  employeeId: varchar("employee_id", { length: 50 }),
  department: varchar({ length: 100 }),
  skills: json(), // ['electrical','mechanical','plc','hvac']
  certifications: json(), // [{name, expiryDate}]
  experienceYears: int("experience_years").default(0),
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }),
  availability: mysqlEnum(['available','busy','on_leave','unavailable']).default('available'),
  currentWorkOrderId: int("current_work_order_id"),
  totalWorkOrders: int("total_work_orders").default(0),
  completedWorkOrders: int("completed_work_orders").default(0),
  avgCompletionTime: int("avg_completion_time"), // minutes
  rating: decimal({ precision: 3, scale: 2 }).default('5.00'),
  phone: varchar({ length: 20 }),
  email: varchar({ length: 100 }),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_tech_user").on(table.userId),
  index("idx_tech_availability").on(table.availability),
  index("idx_tech_department").on(table.department),
]);

// Type exports for Phase 97

export type IotOtaSchedule = typeof iotOtaSchedules.$inferSelect;

export type InsertIotOtaSchedule = typeof iotOtaSchedules.$inferInsert;

export type IotOtaScheduleRun = typeof iotOtaScheduleRuns.$inferSelect;

export type InsertIotOtaScheduleRun = typeof iotOtaScheduleRuns.$inferInsert;

export type Iot3dFloorPlan = typeof iot3dFloorPlans.$inferSelect;

export type InsertIot3dFloorPlan = typeof iot3dFloorPlans.$inferInsert;

export type Iot3dDevicePosition = typeof iot3dDevicePositions.$inferSelect;

export type InsertIot3dDevicePosition = typeof iot3dDevicePositions.$inferInsert;

export type IotMaintenanceWorkOrder = typeof iotMaintenanceWorkOrders.$inferSelect;

export type InsertIotMaintenanceWorkOrder = typeof iotMaintenanceWorkOrders.$inferInsert;

export type IotWorkOrderTask = typeof iotWorkOrderTasks.$inferSelect;

export type InsertIotWorkOrderTask = typeof iotWorkOrderTasks.$inferInsert;

export type IotWorkOrderComment = typeof iotWorkOrderComments.$inferSelect;

export type InsertIotWorkOrderComment = typeof iotWorkOrderComments.$inferInsert;

export type IotWorkOrderHistory = typeof iotWorkOrderHistory.$inferSelect;

export type InsertIotWorkOrderHistory = typeof iotWorkOrderHistory.$inferInsert;

export type IotTechnician = typeof iotTechnicians.$inferSelect;

export type InsertIotTechnician = typeof iotTechnicians.$inferInsert;


// ============================================
// Phase 98: IoT Enhancement - 3D Model Upload, Work Order Notifications, MTTR/MTBF Report
// ============================================

// IoT 3D Models - Quản lý model 3D cho sơ đồ nhà máy

export const iot3dModels = mysqlTable("iot_3d_models", {
  id: int().autoincrement().primaryKey(),
  name: varchar({ length: 100 }).notNull(),
  description: text(),
  category: mysqlEnum(['machine','equipment','building','zone','furniture','custom']).default('machine'),
  modelUrl: varchar("model_url", { length: 500 }).notNull(), // S3 URL to GLTF/GLB file
  modelFormat: mysqlEnum("model_format", ['gltf','glb']).default('glb'),
  thumbnailUrl: varchar("thumbnail_url", { length: 500 }),
  fileSize: int("file_size"), // bytes
  // Transform defaults
  defaultScale: decimal("default_scale", { precision: 10, scale: 4 }).default('1.0000'),
  defaultRotationX: decimal("default_rotation_x", { precision: 10, scale: 4 }).default('0'),
  defaultRotationY: decimal("default_rotation_y", { precision: 10, scale: 4 }).default('0'),
  defaultRotationZ: decimal("default_rotation_z", { precision: 10, scale: 4 }).default('0'),
  // Bounding box info
  boundingBoxWidth: decimal("bounding_box_width", { precision: 10, scale: 4 }),
  boundingBoxHeight: decimal("bounding_box_height", { precision: 10, scale: 4 }),
  boundingBoxDepth: decimal("bounding_box_depth", { precision: 10, scale: 4 }),
  // Metadata
  manufacturer: varchar({ length: 100 }),
  modelNumber: varchar("model_number", { length: 100 }),
  tags: json(), // ['plc','sensor','motor']
  metadata: json(),
  isPublic: tinyint("is_public").default(0), // Shared across floor plans
  isActive: tinyint("is_active").default(1).notNull(),
  uploadedBy: int("uploaded_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_3d_model_category").on(table.category),
  index("idx_3d_model_active").on(table.isActive),
  index("idx_3d_model_public").on(table.isPublic),
]);

// IoT 3D Model Instances - Instance của model 3D trên floor plan

export const iot3dModelInstances = mysqlTable("iot_3d_model_instances", {
  id: int().autoincrement().primaryKey(),
  modelId: int("model_id").notNull(), // FK to iot_3d_models
  floorPlan3dId: int("floor_plan_3d_id").notNull(), // FK to iot_3d_floor_plans
  deviceId: int("device_id"), // Optional link to IoT device
  machineId: int("machine_id"), // Optional link to machine
  name: varchar({ length: 100 }),
  // Position
  positionX: decimal("position_x", { precision: 10, scale: 4 }).notNull(),
  positionY: decimal("position_y", { precision: 10, scale: 4 }).notNull(),
  positionZ: decimal("position_z", { precision: 10, scale: 4 }).notNull(),
  // Rotation (Euler angles in radians)
  rotationX: decimal("rotation_x", { precision: 10, scale: 4 }).default('0'),
  rotationY: decimal("rotation_y", { precision: 10, scale: 4 }).default('0'),
  rotationZ: decimal("rotation_z", { precision: 10, scale: 4 }).default('0'),
  // Scale
  scaleX: decimal("scale_x", { precision: 10, scale: 4 }).default('1.0000'),
  scaleY: decimal("scale_y", { precision: 10, scale: 4 }).default('1.0000'),
  scaleZ: decimal("scale_z", { precision: 10, scale: 4 }).default('1.0000'),
  // Display options
  visible: tinyint().default(1).notNull(),
  opacity: decimal({ precision: 3, scale: 2 }).default('1.00'),
  wireframe: tinyint().default(0),
  castShadow: tinyint("cast_shadow").default(1),
  receiveShadow: tinyint("receive_shadow").default(1),
  // Interaction
  clickable: tinyint().default(1).notNull(),
  tooltip: varchar({ length: 255 }),
  popupContent: text("popup_content"),
  // Animation
  animationEnabled: tinyint("animation_enabled").default(0),
  animationType: mysqlEnum("animation_type", ['none','rotate','pulse','bounce','custom']).default('none'),
  animationSpeed: decimal("animation_speed", { precision: 5, scale: 2 }).default('1.00'),
  metadata: json(),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_3d_instance_model").on(table.modelId),
  index("idx_3d_instance_floor").on(table.floorPlan3dId),
  index("idx_3d_instance_device").on(table.deviceId),
  index("idx_3d_instance_machine").on(table.machineId),
]);

// IoT Technician Notification Preferences - Cấu hình thông báo cho kỹ thuật viên

export const iotTechnicianNotificationPrefs = mysqlTable("iot_technician_notification_prefs", {
  id: int().autoincrement().primaryKey(),
  technicianId: int("technician_id").notNull(), // FK to iot_technicians
  // Push Notification
  pushEnabled: tinyint("push_enabled").default(1).notNull(),
  pushToken: text("push_token"), // Firebase FCM token
  pushPlatform: mysqlEnum("push_platform", ['web','android','ios']).default('web'),
  // SMS Notification
  smsEnabled: tinyint("sms_enabled").default(0).notNull(),
  phoneNumber: varchar("phone_number", { length: 20 }),
  phoneCountryCode: varchar("phone_country_code", { length: 5 }).default('+84'),
  // Email Notification
  emailEnabled: tinyint("email_enabled").default(1).notNull(),
  email: varchar({ length: 100 }),
  // Notification Types
  notifyNewWorkOrder: tinyint("notify_new_work_order").default(1).notNull(),
  notifyAssigned: tinyint("notify_assigned").default(1).notNull(),
  notifyStatusChange: tinyint("notify_status_change").default(1).notNull(),
  notifyDueSoon: tinyint("notify_due_soon").default(1).notNull(),
  notifyOverdue: tinyint("notify_overdue").default(1).notNull(),
  notifyComment: tinyint("notify_comment").default(0).notNull(),
  // Priority Filter
  minPriorityForPush: mysqlEnum("min_priority_for_push", ['low','medium','high','critical']).default('medium'),
  minPriorityForSms: mysqlEnum("min_priority_for_sms", ['low','medium','high','critical']).default('high'),
  // Quiet Hours
  quietHoursEnabled: tinyint("quiet_hours_enabled").default(0).notNull(),
  quietHoursStart: varchar("quiet_hours_start", { length: 5 }).default('22:00'),
  quietHoursEnd: varchar("quiet_hours_end", { length: 5 }).default('07:00'),
  // Metadata
  lastPushAt: timestamp("last_push_at", { mode: 'string' }),
  lastSmsAt: timestamp("last_sms_at", { mode: 'string' }),
  lastEmailAt: timestamp("last_email_at", { mode: 'string' }),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_notif_pref_technician").on(table.technicianId),
]);

// IoT Work Order Notifications - Lịch sử thông báo work order

export const iotWorkOrderNotifications = mysqlTable("iot_work_order_notifications", {
  id: int().autoincrement().primaryKey(),
  workOrderId: int("work_order_id").notNull(),
  technicianId: int("technician_id").notNull(),
  notificationType: mysqlEnum("notification_type", ['new_work_order','assigned','status_change','due_soon','overdue','comment','escalation']).notNull(),
  channel: mysqlEnum(['push','sms','email']).notNull(),
  title: varchar({ length: 255 }).notNull(),
  message: text().notNull(),
  // Delivery status
  status: mysqlEnum(['pending','sent','delivered','failed','read']).default('pending'),
  sentAt: timestamp("sent_at", { mode: 'string' }),
  deliveredAt: timestamp("delivered_at", { mode: 'string' }),
  readAt: timestamp("read_at", { mode: 'string' }),
  failedAt: timestamp("failed_at", { mode: 'string' }),
  failureReason: text("failure_reason"),
  // External IDs
  externalMessageId: varchar("external_message_id", { length: 100 }), // Firebase/Twilio message ID
  // Metadata
  metadata: json(),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
  index("idx_wo_notif_work_order").on(table.workOrderId),
  index("idx_wo_notif_technician").on(table.technicianId),
  index("idx_wo_notif_status").on(table.status),
  index("idx_wo_notif_type").on(table.notificationType),
  index("idx_wo_notif_created").on(table.createdAt),
]);

// IoT SMS Config - Cấu hình Twilio SMS

export const iotSmsConfig = mysqlTable("iot_sms_config", {
  id: int().autoincrement().primaryKey(),
  provider: mysqlEnum(['twilio','nexmo','aws_sns']).default('twilio'),
  accountSid: varchar("account_sid", { length: 100 }),
  authToken: varchar("auth_token", { length: 100 }),
  fromNumber: varchar("from_number", { length: 20 }),
  // Rate limiting
  maxSmsPerDay: int("max_sms_per_day").default(100),
  maxSmsPerHour: int("max_sms_per_hour").default(20),
  cooldownMinutes: int("cooldown_minutes").default(5),
  // Status
  isEnabled: tinyint("is_enabled").default(0).notNull(),
  lastTestedAt: timestamp("last_tested_at", { mode: 'string' }),
  testResult: text("test_result"),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

// IoT Push Config - Cấu hình Firebase Push Notification

export const iotPushConfig = mysqlTable("iot_push_config", {
  id: int().autoincrement().primaryKey(),
  provider: mysqlEnum(['firebase','onesignal','pusher']).default('firebase'),
  projectId: varchar("project_id", { length: 100 }),
  serverKey: text("server_key"),
  vapidPublicKey: text("vapid_public_key"),
  vapidPrivateKey: text("vapid_private_key"),
  // Status
  isEnabled: tinyint("is_enabled").default(0).notNull(),
  lastTestedAt: timestamp("last_tested_at", { mode: 'string' }),
  testResult: text("test_result"),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

// IoT MTTR/MTBF Statistics - Thống kê MTTR/MTBF

export const iotMttrMtbfStats = mysqlTable("iot_mttr_mtbf_stats", {
  id: int().autoincrement().primaryKey(),
  // Target (device, machine, or production line)
  targetType: mysqlEnum("target_type", ['device','machine','production_line']).notNull(),
  targetId: int("target_id").notNull(),
  // Time period
  periodType: mysqlEnum("period_type", ['daily','weekly','monthly','quarterly','yearly']).notNull(),
  periodStart: timestamp("period_start", { mode: 'string' }).notNull(),
  periodEnd: timestamp("period_end", { mode: 'string' }).notNull(),
  // MTTR - Mean Time To Repair (minutes)
  mttr: decimal({ precision: 10, scale: 2 }), // Average repair time
  mttrMin: decimal("mttr_min", { precision: 10, scale: 2 }), // Minimum repair time
  mttrMax: decimal("mttr_max", { precision: 10, scale: 2 }), // Maximum repair time
  mttrStdDev: decimal("mttr_std_dev", { precision: 10, scale: 2 }), // Standard deviation
  // MTBF - Mean Time Between Failures (hours)
  mtbf: decimal({ precision: 12, scale: 2 }), // Average time between failures
  mtbfMin: decimal("mtbf_min", { precision: 12, scale: 2 }),
  mtbfMax: decimal("mtbf_max", { precision: 12, scale: 2 }),
  mtbfStdDev: decimal("mtbf_std_dev", { precision: 12, scale: 2 }),
  // MTTF - Mean Time To Failure (hours)
  mttf: decimal({ precision: 12, scale: 2 }),
  // Availability
  availability: decimal({ precision: 5, scale: 4 }), // MTBF / (MTBF + MTTR)
  // Counts
  totalFailures: int("total_failures").default(0),
  totalRepairs: int("total_repairs").default(0),
  totalDowntimeMinutes: int("total_downtime_minutes").default(0),
  totalUptimeHours: decimal("total_uptime_hours", { precision: 12, scale: 2 }).default('0'),
  // Work order breakdown
  correctiveWorkOrders: int("corrective_work_orders").default(0),
  preventiveWorkOrders: int("preventive_work_orders").default(0),
  predictiveWorkOrders: int("predictive_work_orders").default(0),
  emergencyWorkOrders: int("emergency_work_orders").default(0),
  // Cost analysis
  totalLaborCost: decimal("total_labor_cost", { precision: 12, scale: 2 }).default('0'),
  totalPartsCost: decimal("total_parts_cost", { precision: 12, scale: 2 }).default('0'),
  totalMaintenanceCost: decimal("total_maintenance_cost", { precision: 12, scale: 2 }).default('0'),
  // Metadata
  calculatedAt: timestamp("calculated_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
  index("idx_mttr_mtbf_target").on(table.targetType, table.targetId),
  index("idx_mttr_mtbf_period").on(table.periodType, table.periodStart),
  index("idx_mttr_mtbf_calculated").on(table.calculatedAt),
]);

// IoT Failure Events - Sự kiện hỏng hóc để tính MTBF

export const iotFailureEvents = mysqlTable("iot_failure_events", {
  id: int().autoincrement().primaryKey(),
  targetType: mysqlEnum("target_type", ['device','machine','production_line']).notNull(),
  targetId: int("target_id").notNull(),
  workOrderId: int("work_order_id"), // Link to work order
  // Failure details
  failureCode: varchar("failure_code", { length: 50 }),
  failureType: mysqlEnum("failure_type", ['breakdown','degradation','intermittent','planned_stop']).default('breakdown'),
  severity: mysqlEnum(['minor','moderate','major','critical']).default('moderate'),
  description: text(),
  // Timing
  failureStartAt: timestamp("failure_start_at", { mode: 'string' }).notNull(),
  failureEndAt: timestamp("failure_end_at", { mode: 'string' }),
  repairStartAt: timestamp("repair_start_at", { mode: 'string' }),
  repairEndAt: timestamp("repair_end_at", { mode: 'string' }),
  // Calculated durations (minutes)
  downtimeDuration: int("downtime_duration"), // Total downtime
  repairDuration: int("repair_duration"), // Time spent repairing
  waitingDuration: int("waiting_duration"), // Time waiting for parts/technician
  // Root cause
  rootCauseCategory: mysqlEnum("root_cause_category", ['mechanical','electrical','software','operator_error','wear','environmental','unknown']).default('unknown'),
  rootCause: text("root_cause"),
  // Resolution
  resolutionType: mysqlEnum("resolution_type", ['repair','replace','adjust','reset','other']).default('repair'),
  resolution: text(),
  // Previous failure reference (for MTBF calculation)
  previousFailureId: int("previous_failure_id"),
  timeSincePreviousFailure: decimal("time_since_previous_failure", { precision: 12, scale: 2 }), // hours
  // Metadata
  reportedBy: int("reported_by"),
  verifiedBy: int("verified_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_failure_target").on(table.targetType, table.targetId),
  index("idx_failure_work_order").on(table.workOrderId),
  index("idx_failure_start").on(table.failureStartAt),
  index("idx_failure_type").on(table.failureType),
  index("idx_failure_severity").on(table.severity),
]);

// Type exports for Phase 98

export type Iot3dModel = typeof iot3dModels.$inferSelect;

export type InsertIot3dModel = typeof iot3dModels.$inferInsert;

export type Iot3dModelInstance = typeof iot3dModelInstances.$inferSelect;

export type InsertIot3dModelInstance = typeof iot3dModelInstances.$inferInsert;

export type IotTechnicianNotificationPref = typeof iotTechnicianNotificationPrefs.$inferSelect;

export type InsertIotTechnicianNotificationPref = typeof iotTechnicianNotificationPrefs.$inferInsert;

export type IotWorkOrderNotification = typeof iotWorkOrderNotifications.$inferSelect;

export type InsertIotWorkOrderNotification = typeof iotWorkOrderNotifications.$inferInsert;

export type IotSmsConfig = typeof iotSmsConfig.$inferSelect;

export type InsertIotSmsConfig = typeof iotSmsConfig.$inferInsert;

export type IotPushConfig = typeof iotPushConfig.$inferSelect;

export type InsertIotPushConfig = typeof iotPushConfig.$inferInsert;

export type IotMttrMtbfStat = typeof iotMttrMtbfStats.$inferSelect;

export type InsertIotMttrMtbfStat = typeof iotMttrMtbfStats.$inferInsert;

export type IotFailureEvent = typeof iotFailureEvents.$inferSelect;

export type InsertIotFailureEvent = typeof iotFailureEvents.$inferInsert;

// Phase 102 - Notification Preferences
