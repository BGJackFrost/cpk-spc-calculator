-- Add indexes for better query performance

-- spc_analysis_history indexes
CREATE INDEX IF NOT EXISTS idx_spc_analysis_history_product_code ON spc_analysis_history(productCode);
CREATE INDEX IF NOT EXISTS idx_spc_analysis_history_station_name ON spc_analysis_history(stationName);
CREATE INDEX IF NOT EXISTS idx_spc_analysis_history_created_at ON spc_analysis_history(createdAt);
CREATE INDEX IF NOT EXISTS idx_spc_analysis_history_user_id ON spc_analysis_history(userId);
CREATE INDEX IF NOT EXISTS idx_spc_analysis_history_cpk ON spc_analysis_history(cpk);

-- spc_sampling_plans indexes
CREATE INDEX IF NOT EXISTS idx_spc_sampling_plans_status ON spc_sampling_plans(status);
CREATE INDEX IF NOT EXISTS idx_spc_sampling_plans_production_line ON spc_sampling_plans(productionLineId);
CREATE INDEX IF NOT EXISTS idx_spc_sampling_plans_created_by ON spc_sampling_plans(createdBy);

-- spc_realtime_data indexes
CREATE INDEX IF NOT EXISTS idx_spc_realtime_data_plan_id ON spc_realtime_data(planId);
CREATE INDEX IF NOT EXISTS idx_spc_realtime_data_created_at ON spc_realtime_data(createdAt);
CREATE INDEX IF NOT EXISTS idx_spc_realtime_data_fixture_id ON spc_realtime_data(fixtureId);

-- spc_summary_stats indexes
CREATE INDEX IF NOT EXISTS idx_spc_summary_stats_plan_id ON spc_summary_stats(planId);
CREATE INDEX IF NOT EXISTS idx_spc_summary_stats_period ON spc_summary_stats(periodType);
CREATE INDEX IF NOT EXISTS idx_spc_summary_stats_period_start ON spc_summary_stats(periodStart);

-- spc_defect_records indexes
CREATE INDEX IF NOT EXISTS idx_spc_defect_records_category_id ON spc_defect_records(categoryId);
CREATE INDEX IF NOT EXISTS idx_spc_defect_records_production_line ON spc_defect_records(productionLineId);
CREATE INDEX IF NOT EXISTS idx_spc_defect_records_occurred_at ON spc_defect_records(occurredAt);

-- audit_logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(userId);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(createdAt);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entityType, entityId);

-- machines indexes
CREATE INDEX IF NOT EXISTS idx_machines_workstation_id ON machines(workstationId);
CREATE INDEX IF NOT EXISTS idx_machines_machine_type_id ON machines(machineTypeId);

-- fixtures indexes
CREATE INDEX IF NOT EXISTS idx_fixtures_machine_id ON fixtures(machineId);

-- production_lines indexes
CREATE INDEX IF NOT EXISTS idx_production_lines_is_active ON production_lines(isActive);

-- products indexes
CREATE INDEX IF NOT EXISTS idx_products_code ON products(code);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(isActive);

-- workstations indexes
CREATE INDEX IF NOT EXISTS idx_workstations_is_active ON workstations(isActive);
