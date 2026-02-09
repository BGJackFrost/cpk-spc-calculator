import { mysqlTable, mysqlSchema, AnyMySqlColumn, int, varchar, timestamp, index, json, decimal, text, mysqlEnum, datetime, bigint, tinyint, boolean, date } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"


// === WORKFLOW Domain Tables ===

export const approvalHistories = mysqlTable("approval_histories", {
	id: int().autoincrement().notNull(),
	requestId: int().notNull(),
	stepId: int().notNull(),
	approverId: int().notNull(),
	action: mysqlEnum(['approved','rejected','returned']).notNull(),
	comments: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});


export const approvalRequests = mysqlTable("approval_requests", {
	id: int().autoincrement().notNull(),
	workflowId: int().notNull(),
	entityType: mysqlEnum(['purchase_order','stock_export','maintenance_request','leave_request']).notNull(),
	entityId: int().notNull(),
	requesterId: int().notNull(),
	currentStepId: int(),
	status: mysqlEnum(['pending','approved','rejected','cancelled']).default('pending').notNull(),
	totalAmount: decimal({ precision: 15, scale: 2 }),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});


export const approvalSteps = mysqlTable("approval_steps", {
	id: int().autoincrement().notNull(),
	workflowId: int().notNull(),
	stepOrder: int().notNull(),
	name: varchar({ length: 255 }).notNull(),
	approverType: mysqlEnum(['position','user','manager','department_head']).notNull(),
	approverId: int(),
	minAmount: decimal({ precision: 15, scale: 2 }),
	maxAmount: decimal({ precision: 15, scale: 2 }),
	isRequired: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});


export const approvalWorkflows = mysqlTable("approval_workflows", {
	id: int().autoincrement().notNull(),
	code: varchar({ length: 50 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	entityType: mysqlEnum(['purchase_order','stock_export','maintenance_request','leave_request']).notNull(),
	isActive: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("code").on(table.code),
]);


export const batchOperationLogs = mysqlTable("batch_operation_logs", {
	id: int().autoincrement().notNull(),
	operationId: varchar("operation_id", { length: 64 }).notNull(),
	operationType: varchar("operation_type", { length: 50 }).notNull(),
	status: mysqlEnum(['pending','running','completed','failed','cancelled']).default('pending').notNull(),
	totalItems: int("total_items").default(0).notNull(),
	processedItems: int("processed_items").default(0).notNull(),
	successItems: int("success_items").default(0).notNull(),
	failedItems: int("failed_items").default(0).notNull(),
	startedAt: timestamp("started_at", { mode: 'string' }),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	userId: int("user_id"),
	metadata: text(),
	errorMessage: text("error_message"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("batch_operation_logs_operation_id_unique").on(table.operationId),
]);


export const batchImageAnalysisJobs = mysqlTable("batch_image_analysis_jobs", {
	id: int().autoincrement().notNull().primaryKey(),
	userId: int("user_id").notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	// Job configuration
	analysisType: mysqlEnum("analysis_type", ['defect_detection', 'quality_inspection', 'comparison', 'ocr', 'custom']).default('defect_detection').notNull(),
	// Filter context
	productCode: varchar("product_code", { length: 100 }),
	productionLineId: int("production_line_id"),
	workstationId: int("workstation_id"),
	// Progress tracking
	status: mysqlEnum(['pending', 'processing', 'completed', 'failed', 'cancelled']).default('pending').notNull(),
	totalImages: int("total_images").default(0).notNull(),
	processedImages: int("processed_images").default(0).notNull(),
	successImages: int("success_images").default(0).notNull(),
	failedImages: int("failed_images").default(0).notNull(),
	// Results summary
	okCount: int("ok_count").default(0).notNull(),
	ngCount: int("ng_count").default(0).notNull(),
	warningCount: int("warning_count").default(0).notNull(),
	avgQualityScore: decimal("avg_quality_score", { precision: 5, scale: 2 }),
	defectsSummary: json("defects_summary"), // Summary of defect types found
	// Timing
	startedAt: timestamp("started_at", { mode: 'string' }),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	processingTimeMs: int("processing_time_ms"),
	// Error handling
	errorMessage: text("error_message"),
	// Metadata
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_batch_image_job_user").on(table.userId),
	index("idx_batch_image_job_status").on(table.status),
	index("idx_batch_image_job_created").on(table.createdAt),
]);


export type BatchImageAnalysisJob = typeof batchImageAnalysisJobs.$inferSelect;

export type InsertBatchImageAnalysisJob = typeof batchImageAnalysisJobs.$inferInsert;

// Batch Image Items - Từng hình ảnh trong batch

export const batchImageItems = mysqlTable("batch_image_items", {
	id: int().autoincrement().notNull().primaryKey(),
	jobId: int("job_id").notNull(),
	// Image info
	fileName: varchar("file_name", { length: 255 }).notNull(),
	fileSize: int("file_size"), // in bytes
	imageUrl: varchar("image_url", { length: 500 }).notNull(),
	imageKey: varchar("image_key", { length: 255 }),
	thumbnailUrl: varchar("thumbnail_url", { length: 500 }),
	// Processing status
	status: mysqlEnum(['pending', 'processing', 'completed', 'failed']).default('pending').notNull(),
	processOrder: int("process_order").default(0).notNull(),
	// Analysis results
	result: mysqlEnum(['ok', 'ng', 'warning', 'unknown']).default('unknown'),
	qualityScore: decimal("quality_score", { precision: 5, scale: 2 }),
	confidence: decimal("confidence", { precision: 5, scale: 4 }),
	// Defect details
	defectsFound: int("defects_found").default(0),
	defectTypes: json("defect_types"), // Array of defect types found
	defectLocations: json("defect_locations"), // Bounding boxes for defects
	// AI analysis
	aiAnalysis: json("ai_analysis"), // Full AI response
	aiModelUsed: varchar("ai_model_used", { length: 100 }),
	// Timing
	processingTimeMs: int("processing_time_ms"),
	analyzedAt: timestamp("analyzed_at", { mode: 'string' }),
	// Error handling
	errorMessage: text("error_message"),
	retryCount: int("retry_count").default(0).notNull(),
	// Metadata
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_batch_image_item_job").on(table.jobId),
	index("idx_batch_image_item_status").on(table.status),
	index("idx_batch_image_item_result").on(table.result),
]);


export type BatchImageItem = typeof batchImageItems.$inferSelect;

export type InsertBatchImageItem = typeof batchImageItems.$inferInsert;


// ============================================
// Custom Widgets - Widget tùy chỉnh với SQL/API
// ============================================
