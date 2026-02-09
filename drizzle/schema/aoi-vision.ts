import { mysqlTable, mysqlSchema, AnyMySqlColumn, int, varchar, timestamp, index, json, decimal, text, mysqlEnum, datetime, bigint, tinyint, boolean, date } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"


// === AOI-VISION Domain Tables ===

export const imageComparisons = mysqlTable("image_comparisons", {
	id: int().autoincrement().notNull().primaryKey(),
	userId: int("user_id").notNull(),
	beforeImageId: int("before_image_id").notNull(),
	afterImageId: int("after_image_id").notNull(),
	comparisonType: mysqlEnum("comparison_type", ['quality_improvement', 'defect_fix', 'process_change', 'before_after']).default('before_after').notNull(),
	productCode: varchar("product_code", { length: 100 }),
	productionLineId: int("production_line_id"),
	aiComparisonResult: json("ai_comparison_result"),
	improvementScore: decimal("improvement_score", { precision: 5, scale: 2 }),
	beforeScore: decimal("before_score", { precision: 5, scale: 2 }),
	afterScore: decimal("after_score", { precision: 5, scale: 2 }),
	summary: text(),
	recommendations: json(),
	status: mysqlEnum(['pending', 'analyzing', 'completed', 'failed']).default('pending').notNull(),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_comparisons_user").on(table.userId),
	index("idx_comparisons_product").on(table.productCode),
	index("idx_comparisons_status").on(table.status),
	index("idx_comparisons_created").on(table.createdAt),
]);


export const inspectionRemarks = mysqlTable("inspection_remarks", {
  id: int().autoincrement().primaryKey(),
  inspectionId: int("inspection_id").notNull(),
  remark: text().notNull(),
  remarkType: mysqlEnum("remark_type", ['note','defect_detail','root_cause','corrective_action','observation']).default('note'),
  severity: mysqlEnum(['info','warning','critical']).default('info'),
  defectCategory: varchar("defect_category", { length: 100 }),
  imageUrls: json("image_urls"),
  attachmentUrls: json("attachment_urls"),
  createdBy: int("created_by"),
  createdByName: varchar("created_by_name", { length: 255 }),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_inspection_remarks_inspection").on(table.inspectionId),
  index("idx_inspection_remarks_type").on(table.remarkType),
  index("idx_inspection_remarks_created_by").on(table.createdBy),
]);

export type InspectionRemark = typeof inspectionRemarks.$inferSelect;

export type InsertInspectionRemark = typeof inspectionRemarks.$inferInsert;


// Workshop Production Lines - Quan hệ nhiều-nhiều giữa Workshop và Production Line

export const cameraConfigs = mysqlTable("camera_configs", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	cameraType: mysqlEnum("camera_type", ['avi', 'aoi', 'ip_camera', 'usb_camera', 'rtsp', 'http_stream']).notNull(),
	connectionUrl: varchar("connection_url", { length: 1000 }).notNull(),
	// Authentication
	username: varchar({ length: 100 }),
	password: varchar({ length: 255 }),
	apiKey: varchar("api_key", { length: 255 }),
	// Analysis config
	analysisType: mysqlEnum("analysis_type", ['defect_detection', 'quality_inspection', 'measurement', 'ocr', 'custom']).default('quality_inspection'),
	analysisModelId: int("analysis_model_id"),
	analysisConfig: json("analysis_config"),
	// Production line association
	productionLineId: int("production_line_id"),
	workstationId: int("workstation_id"),
	machineId: int("machine_id"),
	// Alert config
	alertEnabled: int("alert_enabled").default(1).notNull(),
	alertThreshold: decimal("alert_threshold", { precision: 5, scale: 2 }).default('0.80'),
	alertEmails: text("alert_emails"),
	// Status
	status: mysqlEnum(['active', 'inactive', 'error', 'disconnected']).default('inactive').notNull(),
	lastConnectedAt: timestamp("last_connected_at", { mode: 'string' }),
	lastErrorMessage: text("last_error_message"),
	// Metadata
	createdBy: int("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_camera_configs_type").on(table.cameraType),
	index("idx_camera_configs_status").on(table.status),
	index("idx_camera_configs_line").on(table.productionLineId),
]);


export type CameraConfig = typeof cameraConfigs.$inferSelect;

export type InsertCameraConfig = typeof cameraConfigs.$inferInsert;

// ============================================
// SN Images - Ảnh theo Serial Number với điểm đo
// ============================================

export const cameraSessions = mysqlTable("camera_sessions", {
	id: int().autoincrement().notNull().primaryKey(),
	userId: int("user_id").notNull(),
	sessionName: varchar("session_name", { length: 255 }),
	// Camera configuration
	cameraId: int("camera_id"),
	cameraStreamUrl: varchar("camera_stream_url", { length: 500 }),
	resolution: varchar({ length: 50 }), // e.g., "1920x1080"
	// Session status
	status: mysqlEnum(['active', 'paused', 'completed', 'cancelled']).default('active').notNull(),
	// Product/Line association
	productId: int("product_id"),
	productionLineId: int("production_line_id"),
	workstationId: int("workstation_id"),
	// Capture settings
	captureInterval: int("capture_interval"), // in seconds, null = manual capture
	autoCapture: boolean("auto_capture").default(false),
	captureCount: int("capture_count").default(0).notNull(),
	// Timestamps
	startedAt: timestamp("started_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	endedAt: timestamp("ended_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_camera_sessions_user").on(table.userId),
	index("idx_camera_sessions_status").on(table.status),
	index("idx_camera_sessions_camera").on(table.cameraId),
	index("idx_camera_sessions_line").on(table.productionLineId),
]);


export type CameraSession = typeof cameraSessions.$inferSelect;

export type InsertCameraSession = typeof cameraSessions.$inferInsert;

// Image Annotations - Ghi chú trên ảnh

export const imageAnnotations = mysqlTable("image_annotations", {
	id: int().autoincrement().notNull().primaryKey(),
	imageId: int("image_id").notNull(), // Reference to snImages or qualityImages
	imageType: mysqlEnum("image_type", ['sn_image', 'quality_image', 'comparison']).default('sn_image').notNull(),
	userId: int("user_id").notNull(),
	// Annotation type
	annotationType: mysqlEnum("annotation_type", ['rectangle', 'circle', 'ellipse', 'arrow', 'freehand', 'text', 'highlight', 'measurement']).notNull(),
	// Position and dimensions (normalized 0-1 for responsiveness)
	x: decimal({ precision: 10, scale: 6 }).notNull(),
	y: decimal({ precision: 10, scale: 6 }).notNull(),
	width: decimal({ precision: 10, scale: 6 }),
	height: decimal({ precision: 10, scale: 6 }),
	// For arrows and lines
	endX: decimal("end_x", { precision: 10, scale: 6 }),
	endY: decimal("end_y", { precision: 10, scale: 6 }),
	// For freehand paths
	pathData: json("path_data"), // SVG path data or array of points
	// Styling
	color: varchar({ length: 20 }).default('#ff0000'),
	strokeWidth: int("stroke_width").default(2),
	fillColor: varchar("fill_color", { length: 20 }),
	opacity: decimal({ precision: 3, scale: 2 }).default('1.00'),
	// Content
	label: varchar({ length: 255 }),
	description: text(),
	// For measurement annotations
	measurementValue: decimal("measurement_value", { precision: 15, scale: 6 }),
	measurementUnit: varchar("measurement_unit", { length: 20 }),
	// Metadata
	isVisible: boolean("is_visible").default(true),
	zIndex: int("z_index").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_annotations_image").on(table.imageId, table.imageType),
	index("idx_annotations_user").on(table.userId),
	index("idx_annotations_type").on(table.annotationType),
]);


export type ImageAnnotation = typeof imageAnnotations.$inferSelect;

export type InsertImageAnnotation = typeof imageAnnotations.$inferInsert;

// AI Image Comparison Results - Kết quả phân tích AI chi tiết

export const cameraConfigurations = mysqlTable("camera_configurations", {
	id: int().autoincrement().notNull().primaryKey(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	// Connection settings
	streamUrl: varchar("stream_url", { length: 500 }).notNull(),
	streamType: mysqlEnum("stream_type", ['rtsp', 'http', 'webrtc', 'mjpeg', 'hls']).default('http').notNull(),
	username: varchar({ length: 100 }),
	password: varchar({ length: 255 }),
	// Camera settings
	resolution: varchar({ length: 50 }).default('1920x1080'),
	frameRate: int("frame_rate").default(30),
	// Location
	productionLineId: int("production_line_id"),
	workstationId: int("workstation_id"),
	position: varchar({ length: 100 }), // e.g., "entrance", "exit", "inspection"
	// Status
	isActive: boolean("is_active").default(true),
	lastConnectedAt: timestamp("last_connected_at", { mode: 'string' }),
	connectionStatus: mysqlEnum("connection_status", ['connected', 'disconnected', 'error', 'unknown']).default('unknown'),
	// Metadata
	createdBy: int("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_camera_config_line").on(table.productionLineId),
	index("idx_camera_config_workstation").on(table.workstationId),
	index("idx_camera_config_active").on(table.isActive),
]);


export type CameraConfiguration = typeof cameraConfigurations.$inferSelect;

export type InsertCameraConfiguration = typeof cameraConfigurations.$inferInsert;


// Camera Auto-Capture Schedules

export const cameraCaptureSchedules = mysqlTable("camera_capture_schedules", {
	id: int().autoincrement().notNull().primaryKey(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	// Camera reference
	cameraId: int("camera_id").notNull(),
	// Schedule settings
	isEnabled: boolean("is_enabled").default(true).notNull(),
	captureIntervalSeconds: int("capture_interval_seconds").default(60).notNull(), // Interval between captures
	captureIntervalUnit: mysqlEnum("capture_interval_unit", ['seconds', 'minutes', 'hours']).default('minutes').notNull(),
	// Time window
	startTime: varchar("start_time", { length: 10 }), // HH:mm format, null = 00:00
	endTime: varchar("end_time", { length: 10 }), // HH:mm format, null = 23:59
	// Days of week (JSON array of 0-6, 0=Sunday)
	activeDays: json("active_days"), // e.g., [1,2,3,4,5] for weekdays
	// Production context
	productionLineId: int("production_line_id"),
	workstationId: int("workstation_id"),
	productId: int("product_id"),
	// Auto-analysis settings
	autoAnalyze: boolean("auto_analyze").default(true).notNull(),
	analysisType: mysqlEnum("analysis_type", ['defect_detection', 'quality_inspection', 'measurement', 'ocr', 'custom']).default('quality_inspection'),
	// Notification settings
	notifyOnNg: boolean("notify_on_ng").default(true).notNull(),
	notifyOnWarning: boolean("notify_on_warning").default(false).notNull(),
	notificationEmails: json("notification_emails"), // Array of email addresses
	webhookUrl: varchar("webhook_url", { length: 500 }),
	// Statistics
	totalCaptures: int("total_captures").default(0).notNull(),
	successCaptures: int("success_captures").default(0).notNull(),
	failedCaptures: int("failed_captures").default(0).notNull(),
	lastCaptureAt: timestamp("last_capture_at", { mode: 'string' }),
	lastCaptureStatus: mysqlEnum("last_capture_status", ['success', 'failed', 'pending']).default('pending'),
	lastCaptureError: text("last_capture_error"),
	// Metadata
	createdBy: int("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_capture_schedule_camera").on(table.cameraId),
	index("idx_capture_schedule_enabled").on(table.isEnabled),
	index("idx_capture_schedule_line").on(table.productionLineId),
]);


export type CameraCaptureSchedule = typeof cameraCaptureSchedules.$inferSelect;

export type InsertCameraCaptureSchedule = typeof cameraCaptureSchedules.$inferInsert;

// Camera Capture Logs

export const cameraCaptureLog = mysqlTable("camera_capture_log", {
	id: int().autoincrement().notNull().primaryKey(),
	scheduleId: int("schedule_id").notNull(),
	cameraId: int("camera_id").notNull(),
	// Capture result
	status: mysqlEnum(['success', 'failed', 'timeout', 'error']).default('success').notNull(),
	errorMessage: text("error_message"),
	// Image info
	imageId: int("image_id"), // Reference to sn_images
	imageUrl: varchar("image_url", { length: 1000 }),
	imageKey: varchar("image_key", { length: 255 }),
	// Analysis result
	analysisResult: mysqlEnum("analysis_result", ['ok', 'ng', 'warning', 'pending', 'skipped']).default('pending'),
	qualityScore: decimal("quality_score", { precision: 5, scale: 2 }),
	defectsFound: int("defects_found").default(0),
	// Timing
	captureStartedAt: timestamp("capture_started_at", { mode: 'string' }),
	captureCompletedAt: timestamp("capture_completed_at", { mode: 'string' }),
	analysisDurationMs: int("analysis_duration_ms"),
	// Metadata
	serialNumber: varchar("serial_number", { length: 100 }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_capture_log_schedule").on(table.scheduleId),
	index("idx_capture_log_camera").on(table.cameraId),
	index("idx_capture_log_status").on(table.status),
	index("idx_capture_log_created").on(table.createdAt),
]);


export type CameraCaptureLog = typeof cameraCaptureLog.$inferSelect;

export type InsertCameraCaptureLog = typeof cameraCaptureLog.$inferInsert;

// Quality Statistics Report

export const aoiAviDefectTypes = mysqlTable("aoi_avi_defect_types", {
	id: int().autoincrement().notNull().primaryKey(),
	code: varchar({ length: 50 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	category: mysqlEnum(['visual', 'dimensional', 'surface', 'structural', 'other']).default('visual').notNull(),
	severity: mysqlEnum(['critical', 'major', 'minor', 'cosmetic']).default('minor').notNull(),
	inspectionType: mysqlEnum("inspection_type", ['aoi', 'avi', 'both']).default('both').notNull(),
	isActive: int("is_active").default(1).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_defect_type_code").on(table.code),
	index("idx_defect_type_category").on(table.category),
	index("idx_defect_type_severity").on(table.severity),
]);

export type AoiAviDefectType = typeof aoiAviDefectTypes.$inferSelect;

export type InsertAoiAviDefectType = typeof aoiAviDefectTypes.$inferInsert;

// AOI Inspection Records

export const aoiInspectionRecords = mysqlTable("aoi_inspection_records", {
	id: int().autoincrement().notNull().primaryKey(),
	serialNumber: varchar("serial_number", { length: 100 }).notNull(),
	machineId: int("machine_id"),
	productionLineId: int("production_line_id"),
	productId: int("product_id"),
	// Inspection result
	result: mysqlEnum(['pass', 'fail', 'warning']).default('pass').notNull(),
	defectCount: int("defect_count").default(0).notNull(),
	defectTypes: json("defect_types"), // Array of defect type IDs
	qualityScore: decimal("quality_score", { precision: 5, scale: 2 }),
	// Image references
	imageUrl: varchar("image_url", { length: 1000 }),
	imageKey: varchar("image_key", { length: 255 }),
	// Timing
	inspectionStartedAt: timestamp("inspection_started_at", { mode: 'string' }),
	inspectionCompletedAt: timestamp("inspection_completed_at", { mode: 'string' }),
	inspectionDurationMs: int("inspection_duration_ms"),
	// Metadata
	operatorId: int("operator_id"),
	shiftId: varchar("shift_id", { length: 50 }),
	batchNumber: varchar("batch_number", { length: 100 }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_aoi_serial").on(table.serialNumber),
	index("idx_aoi_machine").on(table.machineId),
	index("idx_aoi_line").on(table.productionLineId),
	index("idx_aoi_result").on(table.result),
	index("idx_aoi_created").on(table.createdAt),
]);

export type AoiInspectionRecord = typeof aoiInspectionRecords.$inferSelect;

export type InsertAoiInspectionRecord = typeof aoiInspectionRecords.$inferInsert;

// AVI Inspection Records

export const aviInspectionRecords = mysqlTable("avi_inspection_records", {
	id: int().autoincrement().notNull().primaryKey(),
	serialNumber: varchar("serial_number", { length: 100 }).notNull(),
	machineId: int("machine_id"),
	productionLineId: int("production_line_id"),
	productId: int("product_id"),
	// Inspection result
	result: mysqlEnum(['pass', 'fail', 'warning']).default('pass').notNull(),
	defectCount: int("defect_count").default(0).notNull(),
	defectTypes: json("defect_types"), // Array of defect type IDs
	qualityScore: decimal("quality_score", { precision: 5, scale: 2 }),
	// Video/Image references
	videoUrl: varchar("video_url", { length: 1000 }),
	videoKey: varchar("video_key", { length: 255 }),
	thumbnailUrl: varchar("thumbnail_url", { length: 1000 }),
	// Timing
	inspectionStartedAt: timestamp("inspection_started_at", { mode: 'string' }),
	inspectionCompletedAt: timestamp("inspection_completed_at", { mode: 'string' }),
	inspectionDurationMs: int("inspection_duration_ms"),
	// Metadata
	operatorId: int("operator_id"),
	shiftId: varchar("shift_id", { length: 50 }),
	batchNumber: varchar("batch_number", { length: 100 }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_avi_serial").on(table.serialNumber),
	index("idx_avi_machine").on(table.machineId),
	index("idx_avi_line").on(table.productionLineId),
	index("idx_avi_result").on(table.result),
	index("idx_avi_created").on(table.createdAt),
]);

export type AviInspectionRecord = typeof aviInspectionRecords.$inferSelect;

export type InsertAviInspectionRecord = typeof aviInspectionRecords.$inferInsert;

// Golden Sample Images

export const goldenSampleImages = mysqlTable("golden_sample_images", {
	id: int().autoincrement().notNull().primaryKey(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	productId: int("product_id"),
	machineId: int("machine_id"),
	// Image info
	imageUrl: varchar("image_url", { length: 1000 }).notNull(),
	imageKey: varchar("image_key", { length: 255 }).notNull(),
	imageType: mysqlEnum("image_type", ['front', 'back', 'top', 'bottom', 'left', 'right', 'angle', 'other']).default('front').notNull(),
	// Metadata
	version: varchar({ length: 20 }).default('1.0'),
	isActive: int("is_active").default(1).notNull(),
	createdBy: int("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_golden_product").on(table.productId),
	index("idx_golden_machine").on(table.machineId),
	index("idx_golden_type").on(table.imageType),
	index("idx_golden_active").on(table.isActive),
]);

export type GoldenSampleImage = typeof goldenSampleImages.$inferSelect;

export type InsertGoldenSampleImage = typeof goldenSampleImages.$inferInsert;

// AOI/AVI Yield Statistics

export const aoiAviYieldStats = mysqlTable("aoi_avi_yield_stats", {
	id: int().autoincrement().notNull().primaryKey(),
	// Period
	reportDate: date("report_date").notNull(),
	periodType: mysqlEnum("period_type", ['hourly', 'daily', 'weekly', 'monthly']).default('daily').notNull(),
	hour: int(), // For hourly stats
	// Scope
	inspectionType: mysqlEnum("inspection_type", ['aoi', 'avi', 'combined']).default('combined').notNull(),
	machineId: int("machine_id"),
	productionLineId: int("production_line_id"),
	productId: int("product_id"),
	// Statistics
	totalInspected: int("total_inspected").default(0).notNull(),
	passCount: int("pass_count").default(0).notNull(),
	failCount: int("fail_count").default(0).notNull(),
	warningCount: int("warning_count").default(0).notNull(),
	yieldRate: decimal("yield_rate", { precision: 5, scale: 2 }), // Percentage
	defectRate: decimal("defect_rate", { precision: 5, scale: 2 }), // Percentage
	// Quality metrics
	avgQualityScore: decimal("avg_quality_score", { precision: 5, scale: 2 }),
	// Defect breakdown
	defectsByType: json("defects_by_type"), // { defectTypeId: count }
	topDefects: json("top_defects"), // Array of { defectTypeId, count, percentage }
	// Metadata
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_yield_date").on(table.reportDate),
	index("idx_yield_period").on(table.periodType),
	index("idx_yield_type").on(table.inspectionType),
	index("idx_yield_machine").on(table.machineId),
	index("idx_yield_line").on(table.productionLineId),
]);

export type AoiAviYieldStat = typeof aoiAviYieldStats.$inferSelect;

export type InsertAoiAviYieldStat = typeof aoiAviYieldStats.$inferInsert;


// ============ Yield/Defect Alert History ============

export const inspectionMeasurementPoints = mysqlTable("inspection_measurement_points", {
	id: int().autoincrement().notNull().primaryKey(),
	inspectionId: int("inspection_id"),
	pointName: varchar("point_name", { length: 255 }).notNull(),
	measuredValue: decimal("measured_value", { precision: 15, scale: 6 }),
	nominalValue: decimal("nominal_value", { precision: 15, scale: 6 }),
	upperLimit: decimal("upper_limit", { precision: 15, scale: 6 }),
	lowerLimit: decimal("lower_limit", { precision: 15, scale: 6 }),
	unit: varchar({ length: 50 }),
	result: mysqlEnum(['pass', 'fail', 'warning']).default('pass'),
	coordinates: json("coordinates"), // {x, y} position on image
	metadata: json("metadata"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
}, (table) => [
	index("idx_measure_point_inspection").on(table.inspectionId),
]);

export type InspectionMeasurementPoint = typeof inspectionMeasurementPoints.$inferSelect;

export type InsertInspectionMeasurementPoint = typeof inspectionMeasurementPoints.$inferInsert;

// Machine Yield Statistics - Thống kê yield theo máy
