-- Database Indexes for Performance Optimization
-- Run this script to add indexes to high-traffic tables

-- SPC Analysis History indexes
CREATE INDEX IF NOT EXISTS idx_spc_analysis_product ON spc_analysis_history(productCode);
CREATE INDEX IF NOT EXISTS idx_spc_analysis_station ON spc_analysis_history(stationName);
CREATE INDEX IF NOT EXISTS idx_spc_analysis_date ON spc_analysis_history(analyzedAt);
CREATE INDEX IF NOT EXISTS idx_spc_analysis_composite ON spc_analysis_history(productCode, stationName, analyzedAt);

-- Audit Logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(userId);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_date ON audit_logs(createdAt);
CREATE INDEX IF NOT EXISTS idx_audit_logs_composite ON audit_logs(userId, action, createdAt);

-- Login History indexes
CREATE INDEX IF NOT EXISTS idx_login_history_user ON login_history(userId);
CREATE INDEX IF NOT EXISTS idx_login_history_date ON login_history(createdAt);

-- SPC Realtime Data indexes
CREATE INDEX IF NOT EXISTS idx_spc_realtime_machine ON spc_realtime_data(machineId);
CREATE INDEX IF NOT EXISTS idx_spc_realtime_timestamp ON spc_realtime_data(timestamp);
CREATE INDEX IF NOT EXISTS idx_spc_realtime_composite ON spc_realtime_data(machineId, timestamp);

-- SPC Rule Violations indexes
CREATE INDEX IF NOT EXISTS idx_spc_violations_analysis ON spc_rule_violations(analysisId);
CREATE INDEX IF NOT EXISTS idx_spc_violations_rule ON spc_rule_violations(ruleType);

-- Webhook Logs indexes
CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook ON webhook_logs(webhookId);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_status ON webhook_logs(status);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_date ON webhook_logs(createdAt);

-- Export History indexes
CREATE INDEX IF NOT EXISTS idx_export_history_user ON export_history(userId);
CREATE INDEX IF NOT EXISTS idx_export_history_date ON export_history(createdAt);

-- Sensor Data indexes
CREATE INDEX IF NOT EXISTS idx_sensor_data_sensor ON sensor_data(sensorId);
CREATE INDEX IF NOT EXISTS idx_sensor_data_timestamp ON sensor_data(timestamp);
CREATE INDEX IF NOT EXISTS idx_sensor_data_composite ON sensor_data(sensorId, timestamp);

-- OEE Records indexes
CREATE INDEX IF NOT EXISTS idx_oee_records_machine ON oee_records(machineId);
CREATE INDEX IF NOT EXISTS idx_oee_records_date ON oee_records(date);
CREATE INDEX IF NOT EXISTS idx_oee_records_composite ON oee_records(machineId, date);

-- Work Orders indexes
CREATE INDEX IF NOT EXISTS idx_work_orders_machine ON work_orders(machineId);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_date ON work_orders(createdAt);
CREATE INDEX IF NOT EXISTS idx_work_orders_composite ON work_orders(machineId, status, createdAt);

-- Machine Status History indexes
CREATE INDEX IF NOT EXISTS idx_machine_status_machine ON machine_status_history(machineId);
CREATE INDEX IF NOT EXISTS idx_machine_status_timestamp ON machine_status_history(timestamp);

-- Predictions indexes
CREATE INDEX IF NOT EXISTS idx_predictions_machine ON predictions(machineId);
CREATE INDEX IF NOT EXISTS idx_predictions_date ON predictions(predictionDate);

-- Spare Parts Transactions indexes
CREATE INDEX IF NOT EXISTS idx_spare_parts_trans_part ON spare_parts_transactions(partId);
CREATE INDEX IF NOT EXISTS idx_spare_parts_trans_date ON spare_parts_transactions(transactionDate);

-- SPC Plan Execution Logs indexes
CREATE INDEX IF NOT EXISTS idx_spc_plan_exec_plan ON spc_plan_execution_logs(planId);
CREATE INDEX IF NOT EXISTS idx_spc_plan_exec_date ON spc_plan_execution_logs(executedAt);

-- Realtime Data Buffer indexes
CREATE INDEX IF NOT EXISTS idx_realtime_buffer_machine ON realtime_data_buffer(machineId);
CREATE INDEX IF NOT EXISTS idx_realtime_buffer_timestamp ON realtime_data_buffer(timestamp);

-- Realtime Alerts indexes
CREATE INDEX IF NOT EXISTS idx_realtime_alerts_machine ON realtime_alerts(machineId);
CREATE INDEX IF NOT EXISTS idx_realtime_alerts_severity ON realtime_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_realtime_alerts_date ON realtime_alerts(createdAt);

-- Maintenance History indexes
CREATE INDEX IF NOT EXISTS idx_maintenance_history_machine ON maintenance_history(machineId);
CREATE INDEX IF NOT EXISTS idx_maintenance_history_date ON maintenance_history(completedAt);

-- Scheduled Report Logs indexes
CREATE INDEX IF NOT EXISTS idx_scheduled_report_logs_report ON scheduled_report_logs(reportId);
CREATE INDEX IF NOT EXISTS idx_scheduled_report_logs_date ON scheduled_report_logs(executedAt);
