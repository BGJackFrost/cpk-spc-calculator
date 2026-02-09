/**
 * Advanced Performance Indexes - Phase 2
 * 
 * Adds composite indexes for:
 * - IoT data tables (devices, data points, alarms, telemetry)
 * - Notification/Alert tables (alert history, escalation, webhooks)
 * - Machine/Production tables (downtime, inspection, maintenance)
 * - Quality/Measurement tables (quality records, inspection data)
 * - Scheduled reports and export history
 * 
 * NOTE: All column names use snake_case to match actual DB column names
 */

import { getDb } from "../db";
import { sql } from "drizzle-orm";

interface IndexDef {
  name: string;
  table: string;
  columns: string;
}

export async function addAdvancedIndexes() {
  console.log("[Migration] Adding advanced performance indexes (Phase 2)...");

  const indexes: IndexDef[] = [
    // ==========================================
    // IoT Data Tables
    // ==========================================
    
    // iot_data_points: device_id(int), timestamp(timestamp)
    {
      name: "idx_iot_data_points_device_ts",
      table: "iot_data_points",
      columns: "device_id, timestamp DESC",
    },
    {
      name: "idx_iot_data_points_tag",
      table: "iot_data_points",
      columns: "tag_name, timestamp DESC",
    },

    // iot_device_data: device_id(varchar), recorded_at(timestamp)
    {
      name: "idx_iot_device_data_device",
      table: "iot_device_data",
      columns: "device_id, created_at DESC",
    },

    // iot_alarms: device_id(int), alarm_type(enum), created_at(timestamp)
    {
      name: "idx_iot_alarms_device",
      table: "iot_alarms",
      columns: "device_id, created_at DESC",
    },
    {
      name: "idx_iot_alarms_type",
      table: "iot_alarms",
      columns: "alarm_type, created_at DESC",
    },

    // iot_alert_history: device_id(int), alert_type(varchar), created_at(timestamp)
    {
      name: "idx_iot_alert_history_device",
      table: "iot_alert_history",
      columns: "device_id, created_at DESC",
    },
    {
      name: "idx_iot_alert_history_type",
      table: "iot_alert_history",
      columns: "alert_type, created_at DESC",
    },

    // iot_devices: status(enum), last_heartbeat(timestamp)
    {
      name: "idx_iot_devices_status",
      table: "iot_devices",
      columns: "status, last_heartbeat DESC",
    },
    {
      name: "idx_iot_devices_machine",
      table: "iot_devices",
      columns: "machine_id",
    },

    // ==========================================
    // Alert & Notification Tables
    // ==========================================

    // alert_analytics: alert_type(varchar), record_date(date)
    {
      name: "idx_alert_analytics_type",
      table: "alert_analytics",
      columns: "alert_type, record_date DESC",
    },

    // alert_escalation_logs: alert_id(int), escalated_at(timestamp)
    {
      name: "idx_alert_escalation_alert",
      table: "alert_escalation_logs",
      columns: "alert_id, created_at DESC",
    },

    // alert_notification_logs: alert_id(int), sent_at(timestamp)
    {
      name: "idx_alert_notif_logs_alert",
      table: "alert_notification_logs",
      columns: "alert_id, created_at DESC",
    },

    // alert_webhook_logs: webhook_id(int), sent_at(timestamp)
    {
      name: "idx_alert_webhook_logs_webhook",
      table: "alert_webhook_logs",
      columns: "webhook_config_id, sent_at DESC",
    },

    // kpi_alert_stats: record_date(date), alert_type(varchar)
    {
      name: "idx_kpi_alert_stats_date",
      table: "kpi_alert_stats",
      columns: "date, alert_type",
    },

    // notifications: user_id(int), is_read(boolean), created_at(timestamp)
    {
      name: "idx_notifications_user",
      table: "notifications",
      columns: "user_id, created_at DESC",
    },
    {
      name: "idx_notifications_unread",
      table: "notifications",
      columns: "user_id, is_read, created_at DESC",
    },

    // ==========================================
    // Machine & Production Tables
    // ==========================================

    // machine_data_logs: machine_id(int), timestamp(timestamp)
    {
      name: "idx_machine_data_logs_machine",
      table: "machine_data_logs",
      columns: "apiKeyId, createdAt DESC",
    },
    {
      name: "idx_machine_data_logs_type",
      table: "machine_data_logs",
      columns: "endpoint, createdAt DESC",
    },

    // machine_downtime_records: machine_id(int), start_time(timestamp)
    {
      name: "idx_machine_downtime_machine",
      table: "machine_downtime_records",
      columns: "machine_id, start_time DESC",
    },
    {
      name: "idx_machine_downtime_reason",
      table: "machine_downtime_records",
      columns: "downtime_category, start_time DESC",
    },

    // machine_inspection_data: machine_id(int), inspection_date(date)
    {
      name: "idx_machine_inspection_machine",
      table: "machine_inspection_data",
      columns: "machineId, inspectedAt DESC",
    },

    // machine_yield_statistics: machine_id(int), record_date(date)
    {
      name: "idx_machine_yield_machine",
      table: "machine_yield_statistics",
      columns: "machine_id, statistics_date DESC",
    },

    // production_lines: status(enum)
    {
      name: "idx_production_lines_status",
      table: "production_lines",
      columns: "isActive",
    },

    // ==========================================
    // Quality & Measurement Tables
    // ==========================================

    // quality_records: product_code(varchar), inspection_date(date)
    {
      name: "idx_quality_records_product",
      table: "quality_records",
      columns: "product_code, inspection_date DESC",
    },
    {
      name: "idx_quality_records_line",
      table: "quality_records",
      columns: "production_line_id, inspection_date DESC",
    },

    // measurement_data: mapping_id(int), measured_at(timestamp)
    {
      name: "idx_measurement_data_mapping",
      table: "measurement_data",
      columns: "mapping_id, measured_at DESC",
    },

    // ==========================================
    // Scheduled Reports & Export
    // ==========================================

    // scheduled_reports: is_active(boolean), next_run_at(timestamp)
    {
      name: "idx_scheduled_reports_active",
      table: "scheduled_reports",
      columns: "is_active, next_run_at",
    },
    {
      name: "idx_scheduled_reports_user",
      table: "scheduled_reports",
      columns: "user_id, created_at DESC",
    },

    // scheduled_report_logs: report_id(int), executed_at(timestamp)
    {
      name: "idx_sched_report_logs_report",
      table: "scheduled_report_logs",
      columns: "reportId, sentAt DESC",
    },

    // ==========================================
    // MTTR/MTBF & Maintenance
    // ==========================================

    // mttr_mtbf_records: machine_id(int), record_date(date)
    {
      name: "idx_mttr_mtbf_machine",
      table: "mttr_mtbf_records",
      columns: "machine_id, record_date DESC",
    },
    {
      name: "idx_mttr_mtbf_line",
      table: "mttr_mtbf_records",
      columns: "production_line_id, record_date DESC",
    },

    // maintenance_records: machine_id(int), scheduled_date(date)
    {
      name: "idx_maintenance_records_machine",
      table: "maintenance_records",
      columns: "machine_id, scheduled_date DESC",
    },
    {
      name: "idx_maintenance_records_status",
      table: "maintenance_records",
      columns: "status, scheduled_date DESC",
    },

    // ==========================================
    // User & Session Tables
    // ==========================================

    // user_sessions: user_id(int), expires_at(timestamp)
    {
      name: "idx_user_sessions_user",
      table: "user_sessions",
      columns: "user_id, expires_at DESC",
    },
    {
      name: "idx_user_sessions_active",
      table: "user_sessions",
      columns: "is_active, expires_at DESC",
    },

    // firmware_ota_deployments: status(enum), created_at(timestamp)
    {
      name: "idx_firmware_ota_status",
      table: "firmware_ota_deployments",
      columns: "status, created_at DESC",
    },
  ];

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  const db = await getDb();
  if (!db) {
    console.log("[Migration] Database not available, skipping indexes");
    return { successCount: 0, skipCount: indexes.length, errorCount: 0 };
  }

  for (const idx of indexes) {
    try {
      // Check if table exists first
      const tableCheckSql = sql.raw(`
        SELECT COUNT(*) as cnt FROM information_schema.tables 
        WHERE table_schema = DATABASE() 
        AND table_name = '${idx.table}'
      `);
      const tableResult = await db.execute(tableCheckSql);
      const tableExists = (tableResult as any)[0]?.[0]?.cnt > 0;

      if (!tableExists) {
        skipCount++;
        continue;
      }

      // Check if index already exists
      const checkSql = sql.raw(`
        SELECT COUNT(*) as cnt FROM information_schema.statistics 
        WHERE table_schema = DATABASE() 
        AND table_name = '${idx.table}' 
        AND index_name = '${idx.name}'
      `);

      const result = await db.execute(checkSql);
      const exists = (result as any)[0]?.[0]?.cnt > 0;

      if (exists) {
        skipCount++;
        continue;
      }

      // Create index
      const createSql = sql.raw(`
        CREATE INDEX ${idx.name} ON ${idx.table} (${idx.columns})
      `);

      await db.execute(createSql);
      console.log(`  [OK] Created index ${idx.name} on ${idx.table}`);
      successCount++;
    } catch (error: any) {
      if (error.message?.includes("Duplicate key name")) {
        skipCount++;
      } else if (error.message?.includes("doesn't exist")) {
        skipCount++;
      } else {
        console.error(`  [ERROR] ${idx.name}: ${error.message}`);
        errorCount++;
      }
    }
  }

  console.log(`[Migration] Phase 2 completed: ${successCount} created, ${skipCount} skipped, ${errorCount} errors`);
  return { successCount, skipCount, errorCount };
}

export default addAdvancedIndexes;
