import { mysqlTable, mysqlSchema, AnyMySqlColumn, int, varchar, timestamp, index, json, decimal, text, mysqlEnum, datetime, bigint, tinyint, boolean, date } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"


// === CAPACITY Domain Tables ===

export const capacityPlans = mysqlTable("capacity_plans", {
  id: int().autoincrement().primaryKey(),
  workshopId: int("workshop_id").notNull(),
  productId: int("product_id"),
  planDate: date("plan_date", { mode: 'string' }).notNull(),
  plannedCapacity: int("planned_capacity").notNull(),
  actualCapacity: int("actual_capacity").default(0),
  targetEfficiency: decimal("target_efficiency", { precision: 5, scale: 2 }).default('85.00'),
  actualEfficiency: decimal("actual_efficiency", { precision: 5, scale: 2 }),
  shiftType: mysqlEnum("shift_type", ['morning', 'afternoon', 'night', 'full_day']).default('full_day'),
  notes: text(),
  status: mysqlEnum(['draft', 'approved', 'in_progress', 'completed', 'cancelled']).default('draft').notNull(),
  createdBy: int("created_by"),
  approvedBy: int("approved_by"),
  approvedAt: timestamp("approved_at", { mode: 'string' }),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_capacity_plans_workshop").on(table.workshopId),
  index("idx_capacity_plans_date").on(table.planDate),
  index("idx_capacity_plans_status").on(table.status),
  index("idx_capacity_plans_workshop_date").on(table.workshopId, table.planDate),
]);

export type CapacityPlan = typeof capacityPlans.$inferSelect;

export type InsertCapacityPlan = typeof capacityPlans.$inferInsert;

// Capacity Plan History - Lịch sử cập nhật công suất thực tế

export const capacityPlanHistory = mysqlTable("capacity_plan_history", {
  id: int().autoincrement().primaryKey(),
  capacityPlanId: int("capacity_plan_id").notNull(),
  previousActualCapacity: int("previous_actual_capacity"),
  newActualCapacity: int("new_actual_capacity").notNull(),
  previousEfficiency: decimal("previous_efficiency", { precision: 5, scale: 2 }),
  newEfficiency: decimal("new_efficiency", { precision: 5, scale: 2 }),
  changeReason: text("change_reason"),
  changedBy: int("changed_by"),
  changedAt: timestamp("changed_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
  index("idx_capacity_plan_history_plan").on(table.capacityPlanId),
  index("idx_capacity_plan_history_changed_at").on(table.changedAt),
]);

export type CapacityPlanHistory = typeof capacityPlanHistory.$inferSelect;

export type InsertCapacityPlanHistory = typeof capacityPlanHistory.$inferInsert;


// ============================================================
// PHASE 12 - Dashboard Customization & Batch Image Analysis
// ============================================================

// Widget Templates - Định nghĩa các loại widget có sẵn
