/**
 * Performance Optimization - Add indexes for frequently queried tables
 * 
 * This migration adds indexes to improve query performance for:
 * - SPC Analysis History
 * - Audit Logs
 * - OEE Records
 * - SPC Realtime Data
 * - Login History
 */

import { getDb } from "../db";
import { sql } from "drizzle-orm";

export async function addPerformanceIndexes() {
  console.log("[Migration] Adding performance indexes...");

  const indexes = [
    // SPC Analysis History - frequently queried by mappingId, productCode, dates
    {
      name: "idx_spc_analysis_history_mapping",
      table: "spc_analysis_history",
      columns: "mappingId, startDate DESC",
    },
    {
      name: "idx_spc_analysis_history_product",
      table: "spc_analysis_history",
      columns: "productCode, startDate DESC",
    },
    {
      name: "idx_spc_analysis_history_dates",
      table: "spc_analysis_history",
      columns: "startDate, endDate",
    },

    // Audit Logs - frequently queried by userId, action, module, createdAt
    {
      name: "idx_audit_logs_user",
      table: "audit_logs",
      columns: "userId, createdAt DESC",
    },
    {
      name: "idx_audit_logs_action",
      table: "audit_logs",
      columns: "action, createdAt DESC",
    },
    {
      name: "idx_audit_logs_module",
      table: "audit_logs",
      columns: "module, createdAt DESC",
    },
    {
      name: "idx_audit_logs_created",
      table: "audit_logs",
      columns: "createdAt DESC",
    },

    // OEE Records - frequently queried by machineId, productionLineId, recordDate
    {
      name: "idx_oee_records_machine",
      table: "oee_records",
      columns: "machineId, recordDate DESC",
    },
    {
      name: "idx_oee_records_line",
      table: "oee_records",
      columns: "productionLineId, recordDate DESC",
    },
    {
      name: "idx_oee_records_date",
      table: "oee_records",
      columns: "recordDate DESC",
    },

    // SPC Realtime Data - frequently queried by planId, productionLineId
    {
      name: "idx_spc_realtime_plan",
      table: "spc_realtime_data",
      columns: "planId, createdAt DESC",
    },
    {
      name: "idx_spc_realtime_line",
      table: "spc_realtime_data",
      columns: "productionLineId, createdAt DESC",
    },

    // SPC Summary Stats - frequently queried by planId, periodType, periodStart
    {
      name: "idx_spc_summary_plan",
      table: "spc_summary_stats",
      columns: "planId, periodType, periodStart DESC",
    },
    {
      name: "idx_spc_summary_line",
      table: "spc_summary_stats",
      columns: "productionLineId, periodType, periodStart DESC",
    },

    // Login History - frequently queried by userId, eventType, createdAt
    {
      name: "idx_login_history_user",
      table: "login_history",
      columns: "userId, createdAt DESC",
    },
    {
      name: "idx_login_history_event",
      table: "login_history",
      columns: "eventType, createdAt DESC",
    },

    // SPC Rule Violations - frequently queried by analysisId, severity
    {
      name: "idx_spc_violations_analysis",
      table: "spc_rule_violations",
      columns: "analysisId, severity",
    },

    // SPC Defect Records - frequently queried by defectCategoryId, status, occurredAt
    {
      name: "idx_spc_defects_category",
      table: "spc_defect_records",
      columns: "defectCategoryId, occurredAt DESC",
    },
    {
      name: "idx_spc_defects_status",
      table: "spc_defect_records",
      columns: "status, occurredAt DESC",
    },
    {
      name: "idx_spc_defects_line",
      table: "spc_defect_records",
      columns: "productionLineId, occurredAt DESC",
    },

    // OEE Loss Records - frequently queried by oeeRecordId, lossCategoryId
    {
      name: "idx_oee_loss_record",
      table: "oee_loss_records",
      columns: "oeeRecordId",
    },
    {
      name: "idx_oee_loss_category",
      table: "oee_loss_records",
      columns: "lossCategoryId",
    },

    // SPC Plan Execution Logs - frequently queried by planId, status, executedAt
    {
      name: "idx_spc_exec_plan",
      table: "spc_plan_execution_logs",
      columns: "planId, executedAt DESC",
    },
    {
      name: "idx_spc_exec_status",
      table: "spc_plan_execution_logs",
      columns: "status, executedAt DESC",
    },
  ];

  let successCount = 0;
  let skipCount = 0;

  for (const idx of indexes) {
    try {
      // Check if index already exists
      const checkSql = sql.raw(`
        SELECT COUNT(*) as cnt FROM information_schema.statistics 
        WHERE table_schema = DATABASE() 
        AND table_name = '${idx.table}' 
        AND index_name = '${idx.name}'
      `);
      
      const db = await getDb();
      if (!db) {
        console.log(`  [SKIP] Database not available`);
        skipCount++;
        continue;
      }
      const result = await db.execute(checkSql);
      const exists = (result as any)[0]?.[0]?.cnt > 0;

      if (exists) {
        console.log(`  [SKIP] Index ${idx.name} already exists`);
        skipCount++;
        continue;
      }

      // Create index
      const createSql = sql.raw(`
        CREATE INDEX ${idx.name} ON ${idx.table} (${idx.columns})
      `);
      
      await db!.execute(createSql);
      console.log(`  [OK] Created index ${idx.name} on ${idx.table}`);
      successCount++;
    } catch (error: any) {
      // Index might already exist or table doesn't exist
      if (error.message?.includes("Duplicate key name")) {
        console.log(`  [SKIP] Index ${idx.name} already exists`);
        skipCount++;
      } else if (error.message?.includes("doesn't exist")) {
        console.log(`  [SKIP] Table ${idx.table} doesn't exist`);
        skipCount++;
      } else {
        console.error(`  [ERROR] Failed to create index ${idx.name}:`, error.message);
      }
    }
  }

  console.log(`[Migration] Completed: ${successCount} created, ${skipCount} skipped`);
  return { successCount, skipCount };
}

// Export for use in startup or manual execution
export default addPerformanceIndexes;
