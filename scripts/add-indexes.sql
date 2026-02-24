-- =====================================================
-- Database Performance Optimization - Index Creation
-- Generated: 2024-12-22
-- Author: Manus AI
-- =====================================================

-- Note: Run these commands one by one in production
-- Always backup database before running

-- =====================================================
-- 1. SPC Analysis History Indexes
-- =====================================================
-- These indexes optimize queries for SPC analysis lookups

CREATE INDEX IF NOT EXISTS idx_spc_history_mapping 
ON spc_analysis_history(mappingId);

CREATE INDEX IF NOT EXISTS idx_spc_history_created 
ON spc_analysis_history(createdAt);

CREATE INDEX IF NOT EXISTS idx_spc_history_mapping_created 
ON spc_analysis_history(mappingId, createdAt DESC);

-- =====================================================
-- 2. Audit Logs Indexes
-- =====================================================
-- These indexes optimize audit log queries and reports

CREATE INDEX IF NOT EXISTS idx_audit_user 
ON audit_logs(userId);

CREATE INDEX IF NOT EXISTS idx_audit_created 
ON audit_logs(createdAt);

CREATE INDEX IF NOT EXISTS idx_audit_action 
ON audit_logs(action);

CREATE INDEX IF NOT EXISTS idx_audit_user_created 
ON audit_logs(userId, createdAt DESC);

-- =====================================================
-- 3. Login History Indexes
-- =====================================================
-- These indexes optimize login history queries

CREATE INDEX IF NOT EXISTS idx_login_user 
ON login_history(userId);

CREATE INDEX IF NOT EXISTS idx_login_created 
ON login_history(createdAt);

CREATE INDEX IF NOT EXISTS idx_login_user_created 
ON login_history(userId, createdAt DESC);

-- =====================================================
-- 4. SPC Realtime Data Indexes
-- =====================================================
-- These indexes optimize realtime data queries

CREATE INDEX IF NOT EXISTS idx_realtime_plan 
ON spc_realtime_data(planId);

CREATE INDEX IF NOT EXISTS idx_realtime_sampled 
ON spc_realtime_data(sampledAt);

CREATE INDEX IF NOT EXISTS idx_realtime_plan_sampled 
ON spc_realtime_data(planId, sampledAt DESC);

-- =====================================================
-- 5. SPC Summary Stats Indexes
-- =====================================================
-- These indexes optimize summary statistics queries

CREATE INDEX IF NOT EXISTS idx_summary_plan 
ON spc_summary_stats(planId);

CREATE INDEX IF NOT EXISTS idx_summary_period 
ON spc_summary_stats(periodStart);

CREATE INDEX IF NOT EXISTS idx_summary_plan_period 
ON spc_summary_stats(planId, periodStart DESC);

-- =====================================================
-- 6. Licenses Indexes
-- =====================================================
-- These indexes optimize license management queries

CREATE INDEX IF NOT EXISTS idx_license_status 
ON licenses(licenseStatus);

CREATE INDEX IF NOT EXISTS idx_license_expiry 
ON licenses(expiryDate);

CREATE INDEX IF NOT EXISTS idx_license_status_expiry 
ON licenses(licenseStatus, expiryDate);

-- =====================================================
-- 7. Machine Status Indexes
-- =====================================================
-- These indexes optimize machine monitoring queries

CREATE INDEX IF NOT EXISTS idx_machine_status_machine 
ON machine_online_status(machineId);

CREATE INDEX IF NOT EXISTS idx_alerts_ack 
ON realtime_alerts(acknowledgedAt);

CREATE INDEX IF NOT EXISTS idx_alerts_created 
ON realtime_alerts(createdAt);

-- =====================================================
-- 8. Inventory and Parts Indexes
-- =====================================================
-- These indexes optimize inventory queries

CREATE INDEX IF NOT EXISTS idx_inventory_part 
ON spare_parts_inventory(sparePartId);

-- =====================================================
-- 9. OEE Records Indexes
-- =====================================================
-- These indexes optimize OEE reporting queries

CREATE INDEX IF NOT EXISTS idx_oee_machine 
ON oee_records(machineId);

CREATE INDEX IF NOT EXISTS idx_oee_date 
ON oee_records(recordDate);

CREATE INDEX IF NOT EXISTS idx_oee_machine_date 
ON oee_records(machineId, recordDate DESC);

-- =====================================================
-- 10. Validation Rule Logs Indexes
-- =====================================================
-- These indexes optimize validation log queries

CREATE INDEX IF NOT EXISTS idx_validation_rule 
ON validation_rule_logs(ruleId);

CREATE INDEX IF NOT EXISTS idx_validation_executed 
ON validation_rule_logs(executedAt);

-- =====================================================
-- Verify Indexes Created
-- =====================================================
-- Run this to verify indexes were created successfully

-- SHOW INDEX FROM spc_analysis_history;
-- SHOW INDEX FROM audit_logs;
-- SHOW INDEX FROM login_history;
-- SHOW INDEX FROM spc_realtime_data;
-- SHOW INDEX FROM spc_summary_stats;
-- SHOW INDEX FROM licenses;
-- SHOW INDEX FROM machine_online_status;
-- SHOW INDEX FROM realtime_alerts;
-- SHOW INDEX FROM spare_parts_inventory;
-- SHOW INDEX FROM oee_records;
-- SHOW INDEX FROM validation_rule_logs;
