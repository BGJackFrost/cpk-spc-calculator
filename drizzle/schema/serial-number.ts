import { mysqlTable, mysqlSchema, AnyMySqlColumn, int, varchar, timestamp, index, json, decimal, text, mysqlEnum, datetime, bigint, tinyint, boolean, date } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"


// === SERIAL-NUMBER Domain Tables ===

export const snImages = mysqlTable("sn_images", {
	id: int().autoincrement().notNull(),
	serialNumber: varchar("serial_number", { length: 100 }).notNull(),
	imageUrl: varchar("image_url", { length: 1000 }).notNull(),
	thumbnailUrl: varchar("thumbnail_url", { length: 1000 }),
	// Measurement data
	measurementPoints: json("measurement_points"), // [{x, y, label, value, unit, result, tolerance: {min, max}}]
	defectLocations: json("defect_locations"), // [{x, y, width, height, type, severity}]
	// Analysis results
	analysisResult: mysqlEnum("analysis_result", ['ok', 'ng', 'warning', 'pending']).default('pending'),
	qualityScore: decimal("quality_score", { precision: 5, scale: 2 }),
	defectsFound: int("defects_found").default(0).notNull(),
	measurementsCount: int("measurements_count").default(0).notNull(),
	// Source info
	cameraId: int("camera_id"),
	batchJobId: int("batch_job_id"),
	source: mysqlEnum(['camera', 'upload', 'api', 'batch_job']).default('upload'),
	// Product/Line association
	productId: int("product_id"),
	productionLineId: int("production_line_id"),
	workstationId: int("workstation_id"),
	// Metadata
	capturedAt: timestamp("captured_at", { mode: 'string' }),
	analyzedAt: timestamp("analyzed_at", { mode: 'string' }),
	analyzedBy: int("analyzed_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_sn_images_sn").on(table.serialNumber),
	index("idx_sn_images_result").on(table.analysisResult),
	index("idx_sn_images_camera").on(table.cameraId),
	index("idx_sn_images_product").on(table.productId),
	index("idx_sn_images_line").on(table.productionLineId),
	index("idx_sn_images_captured").on(table.capturedAt),
]);


export type SnImage = typeof snImages.$inferSelect;

export type InsertSnImage = typeof snImages.$inferInsert;


// ============================================
// Phase 72: Camera Capture, Annotations & AI Comparison
// ============================================

// Camera Capture Sessions - Phiên chụp ảnh từ camera
