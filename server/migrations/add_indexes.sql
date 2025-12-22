-- Migration: Add indexes for frequently queried tables
-- Phase 1: Database Optimization

-- SPC Analysis History indexes
CREATE INDEX IF NOT EXISTS idx_spc_analysis_history_product_code ON spc_analysis_history(productCode);
CREATE INDEX IF NOT EXISTS idx_spc_analysis_history_station_name ON spc_analysis_history(stationName);
CREATE INDEX IF NOT EXISTS idx_spc_analysis_history_created_at ON spc_analysis_history(createdAt);
CREATE INDEX IF NOT EXISTS idx_spc_analysis_history_cpk ON spc_analysis_history(cpk);
CREATE INDEX IF NOT EXISTS idx_spc_analysis_history_mapping ON spc_analysis_history(mappingId);
CREATE INDEX IF NOT EXISTS idx_spc_analysis_history_composite ON spc_analysis_history(productCode, stationName, createdAt);

-- SPC Sampling Plans indexes
CREATE INDEX IF NOT EXISTS idx_spc_sampling_plans_status ON spc_sampling_plans(status);
CREATE INDEX IF NOT EXISTS idx_spc_sampling_plans_production_line ON spc_sampling_plans(productionLineId);
CREATE INDEX IF NOT EXISTS idx_spc_sampling_plans_product ON spc_sampling_plans(productId);
CREATE INDEX IF NOT EXISTS idx_spc_sampling_plans_active ON spc_sampling_plans(isActive);

-- Audit Logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(userId);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(createdAt);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entityType, entityId);

-- Machines indexes
CREATE INDEX IF NOT EXISTS idx_machines_workstation ON machines(workstationId);
CREATE INDEX IF NOT EXISTS idx_machines_machine_type ON machines(machineTypeId);
CREATE INDEX IF NOT EXISTS idx_machines_active ON machines(isActive);

-- Fixtures indexes
CREATE INDEX IF NOT EXISTS idx_fixtures_machine ON fixtures(machineId);
CREATE INDEX IF NOT EXISTS idx_fixtures_active ON fixtures(isActive);

-- Products indexes
CREATE INDEX IF NOT EXISTS idx_products_code ON products(code);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(isActive);

-- Workstations indexes
CREATE INDEX IF NOT EXISTS idx_workstations_production_line ON workstations(productionLineId);
CREATE INDEX IF NOT EXISTS idx_workstations_active ON workstations(isActive);

-- Production Lines indexes
CREATE INDEX IF NOT EXISTS idx_production_lines_active ON production_lines(isActive);

-- SPC Realtime Data indexes
CREATE INDEX IF NOT EXISTS idx_spc_realtime_data_plan ON spc_realtime_data(planId);
CREATE INDEX IF NOT EXISTS idx_spc_realtime_data_machine ON spc_realtime_data(machineId);
CREATE INDEX IF NOT EXISTS idx_spc_realtime_data_timestamp ON spc_realtime_data(timestamp);
CREATE INDEX IF NOT EXISTS idx_spc_realtime_data_composite ON spc_realtime_data(planId, timestamp);

-- SPC Defect Records indexes
CREATE INDEX IF NOT EXISTS idx_spc_defect_records_category ON spc_defect_records(categoryId);
CREATE INDEX IF NOT EXISTS idx_spc_defect_records_production_line ON spc_defect_records(productionLineId);
CREATE INDEX IF NOT EXISTS idx_spc_defect_records_created_at ON spc_defect_records(createdAt);
CREATE INDEX IF NOT EXISTS idx_spc_defect_records_status ON spc_defect_records(verificationStatus);

-- User Quick Access indexes
CREATE INDEX IF NOT EXISTS idx_user_quick_access_user ON user_quick_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_quick_access_user_order ON user_quick_access(user_id, sort_order);

-- Login History indexes
CREATE INDEX IF NOT EXISTS idx_login_history_user ON login_history(userId);
CREATE INDEX IF NOT EXISTS idx_login_history_created_at ON login_history(createdAt);
CREATE INDEX IF NOT EXISTS idx_login_history_event ON login_history(eventType);

-- Product Specifications indexes
CREATE INDEX IF NOT EXISTS idx_product_specifications_product ON product_specifications(productId);
CREATE INDEX IF NOT EXISTS idx_product_specifications_workstation ON product_specifications(workstationId);

-- Mappings indexes
CREATE INDEX IF NOT EXISTS idx_product_station_mappings_product ON product_station_mappings(productCode);
CREATE INDEX IF NOT EXISTS idx_product_station_mappings_station ON product_station_mappings(stationName);
CREATE INDEX IF NOT EXISTS idx_product_station_mappings_active ON product_station_mappings(isActive);
