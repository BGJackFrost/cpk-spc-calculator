-- Migration: Add indexes for performance optimization
-- Date: 2024-12-16

-- Indexes for spc_analysis_history (frequent queries by product, station, date)
CREATE INDEX IF NOT EXISTS idx_spc_analysis_product ON spc_analysis_history(productCode);
CREATE INDEX IF NOT EXISTS idx_spc_analysis_station ON spc_analysis_history(stationName);
CREATE INDEX IF NOT EXISTS idx_spc_analysis_date ON spc_analysis_history(createdAt);
CREATE INDEX IF NOT EXISTS idx_spc_analysis_mapping ON spc_analysis_history(mappingId);
CREATE INDEX IF NOT EXISTS idx_spc_analysis_product_station ON spc_analysis_history(productCode, stationName);

-- Indexes for spc_realtime_data (high volume, frequent queries)
CREATE INDEX IF NOT EXISTS idx_spc_realtime_plan ON spc_realtime_data(planId);
CREATE INDEX IF NOT EXISTS idx_spc_realtime_line ON spc_realtime_data(productionLineId);
CREATE INDEX IF NOT EXISTS idx_spc_realtime_sampled ON spc_realtime_data(sampledAt);
CREATE INDEX IF NOT EXISTS idx_spc_realtime_plan_sampled ON spc_realtime_data(planId, sampledAt);
CREATE INDEX IF NOT EXISTS idx_spc_realtime_violations ON spc_realtime_data(isOutOfSpec, isOutOfControl);

-- Indexes for spc_summary_stats (aggregation queries)
CREATE INDEX IF NOT EXISTS idx_spc_summary_plan ON spc_summary_stats(planId);
CREATE INDEX IF NOT EXISTS idx_spc_summary_line ON spc_summary_stats(productionLineId);
CREATE INDEX IF NOT EXISTS idx_spc_summary_period ON spc_summary_stats(periodType, periodStart);
CREATE INDEX IF NOT EXISTS idx_spc_summary_status ON spc_summary_stats(overallStatus);

-- Indexes for spc_defect_records (defect tracking queries)
CREATE INDEX IF NOT EXISTS idx_defect_product ON spc_defect_records(productCode);
CREATE INDEX IF NOT EXISTS idx_defect_station ON spc_defect_records(stationName);
CREATE INDEX IF NOT EXISTS idx_defect_category ON spc_defect_records(categoryId);
CREATE INDEX IF NOT EXISTS idx_defect_date ON spc_defect_records(detectedAt);
CREATE INDEX IF NOT EXISTS idx_defect_product_date ON spc_defect_records(productCode, detectedAt);

-- Indexes for spc_rule_violations (rule analysis)
CREATE INDEX IF NOT EXISTS idx_violation_mapping ON spc_rule_violations(mappingId);
CREATE INDEX IF NOT EXISTS idx_violation_rule ON spc_rule_violations(ruleNumber);
CREATE INDEX IF NOT EXISTS idx_violation_date ON spc_rule_violations(violatedAt);

-- Indexes for product_station_mappings (frequent lookups)
CREATE INDEX IF NOT EXISTS idx_mapping_product ON product_station_mappings(productCode);
CREATE INDEX IF NOT EXISTS idx_mapping_station ON product_station_mappings(stationName);
CREATE INDEX IF NOT EXISTS idx_mapping_product_station ON product_station_mappings(productCode, stationName);

-- Indexes for validation_rule_logs (audit queries)
CREATE INDEX IF NOT EXISTS idx_validation_log_rule ON validation_rule_logs(ruleId);
CREATE INDEX IF NOT EXISTS idx_validation_log_date ON validation_rule_logs(executedAt);
CREATE INDEX IF NOT EXISTS idx_validation_log_passed ON validation_rule_logs(passed);

-- Indexes for audit_logs (security audit)
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(userId);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entityType, entityId);
CREATE INDEX IF NOT EXISTS idx_audit_date ON audit_logs(createdAt);

-- Indexes for login_history (security audit)
CREATE INDEX IF NOT EXISTS idx_login_user ON login_history(userId);
CREATE INDEX IF NOT EXISTS idx_login_event ON login_history(eventType);
CREATE INDEX IF NOT EXISTS idx_login_date ON login_history(createdAt);

-- Indexes for licenses (license management)
CREATE INDEX IF NOT EXISTS idx_license_key ON licenses(licenseKey);
CREATE INDEX IF NOT EXISTS idx_license_status ON licenses(status);
CREATE INDEX IF NOT EXISTS idx_license_expires ON licenses(expiresAt);

-- Indexes for webhook_logs (webhook monitoring)
CREATE INDEX IF NOT EXISTS idx_webhook_log_webhook ON webhook_logs(webhookId);
CREATE INDEX IF NOT EXISTS idx_webhook_log_status ON webhook_logs(status);
CREATE INDEX IF NOT EXISTS idx_webhook_log_date ON webhook_logs(createdAt);

-- Indexes for export_history (export tracking)
CREATE INDEX IF NOT EXISTS idx_export_user ON export_history(createdBy);
CREATE INDEX IF NOT EXISTS idx_export_type ON export_history(exportType);
CREATE INDEX IF NOT EXISTS idx_export_date ON export_history(createdAt);
