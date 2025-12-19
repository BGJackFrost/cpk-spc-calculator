-- ============================================================
-- PostgreSQL Migration Script - Module 4: Defect & NTF Tables
-- ============================================================
-- Phiên bản: 1.0
-- Ngày tạo: 19/12/2024
-- Mô tả: Migration các bảng Defect và NTF từ MySQL sang PostgreSQL
-- ============================================================

-- Bước 1: Tạo ENUM types cần thiết
DO $$ BEGIN
    CREATE TYPE verification_status_enum AS ENUM ('pending', 'real_ng', 'ntf');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- Defect Tables
-- ============================================================

-- Bước 2: Tạo bảng spc_defect_records
CREATE TABLE IF NOT EXISTS spc_defect_records (
    id SERIAL PRIMARY KEY,
    mapping_id INTEGER REFERENCES spc_mappings(id) ON DELETE SET NULL,
    product_code VARCHAR(100) NOT NULL,
    station_name VARCHAR(255) NOT NULL,
    lot_number VARCHAR(100),
    serial_number VARCHAR(100),
    defect_type VARCHAR(100) NOT NULL,
    defect_description TEXT,
    defect_location VARCHAR(255),
    severity severity_enum DEFAULT 'medium',
    quantity INTEGER DEFAULT 1,
    inspector_id INTEGER,
    inspector_name VARCHAR(255),
    shift VARCHAR(50),
    verification_status verification_status_enum DEFAULT 'pending',
    verified_by INTEGER,
    verified_at TIMESTAMP WITH TIME ZONE,
    verification_notes TEXT,
    root_cause TEXT,
    corrective_action TEXT,
    image_urls JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Bước 3: Tạo bảng defect_categories
CREATE TABLE IF NOT EXISTS defect_categories (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parent_id INTEGER REFERENCES defect_categories(id) ON DELETE SET NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Bước 4: Tạo bảng defect_types
CREATE TABLE IF NOT EXISTS defect_types (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES defect_categories(id) ON DELETE SET NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    severity_default severity_enum DEFAULT 'medium',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================
-- NTF (No Trouble Found) Tables
-- ============================================================

-- Bước 5: Tạo bảng ntf_alert_config
CREATE TABLE IF NOT EXISTS ntf_alert_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Bước 6: Tạo bảng ntf_analysis_results
CREATE TABLE IF NOT EXISTS ntf_analysis_results (
    id SERIAL PRIMARY KEY,
    analysis_date DATE NOT NULL,
    production_line_id INTEGER REFERENCES production_lines(id) ON DELETE SET NULL,
    total_defects INTEGER NOT NULL DEFAULT 0,
    ntf_count INTEGER NOT NULL DEFAULT 0,
    real_ng_count INTEGER NOT NULL DEFAULT 0,
    pending_count INTEGER NOT NULL DEFAULT 0,
    ntf_rate DECIMAL(5, 2),
    top_ntf_reasons JSONB,
    recommendations JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Bước 7: Tạo bảng ntf_reduction_actions
CREATE TABLE IF NOT EXISTS ntf_reduction_actions (
    id SERIAL PRIMARY KEY,
    analysis_id INTEGER REFERENCES ntf_analysis_results(id) ON DELETE CASCADE,
    action_type VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    priority INTEGER DEFAULT 1,
    status status_enum DEFAULT 'pending',
    assigned_to INTEGER,
    due_date DATE,
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================
-- Measurement & Inspection Tables
-- ============================================================

-- Bước 8: Tạo bảng measurements
CREATE TABLE IF NOT EXISTS measurements (
    id SERIAL PRIMARY KEY,
    mapping_id INTEGER REFERENCES spc_mappings(id) ON DELETE SET NULL,
    product_code VARCHAR(100) NOT NULL,
    station_name VARCHAR(255) NOT NULL,
    measurement_name VARCHAR(255) NOT NULL,
    value DECIMAL(20, 6) NOT NULL,
    unit VARCHAR(50),
    lot_number VARCHAR(100),
    serial_number VARCHAR(100),
    operator_id INTEGER,
    operator_name VARCHAR(255),
    shift VARCHAR(50),
    is_within_spec INTEGER,
    notes TEXT,
    measured_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Bước 9: Tạo bảng inspection_data
CREATE TABLE IF NOT EXISTS inspection_data (
    id SERIAL PRIMARY KEY,
    machine_id INTEGER REFERENCES machines(id) ON DELETE SET NULL,
    product_code VARCHAR(100),
    lot_number VARCHAR(100),
    serial_number VARCHAR(100),
    inspection_type VARCHAR(100),
    result VARCHAR(50),
    pass_count INTEGER DEFAULT 0,
    fail_count INTEGER DEFAULT 0,
    defect_details JSONB,
    inspector_id INTEGER,
    inspector_name VARCHAR(255),
    shift VARCHAR(50),
    inspected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Bước 10: Tạo bảng measurement_standards
CREATE TABLE IF NOT EXISTS measurement_standards (
    id SERIAL PRIMARY KEY,
    product_code VARCHAR(100) NOT NULL,
    measurement_name VARCHAR(255) NOT NULL,
    lsl DECIMAL(20, 6),
    usl DECIMAL(20, 6),
    target DECIMAL(20, 6),
    unit VARCHAR(50),
    tolerance_type VARCHAR(50) DEFAULT 'bilateral',
    is_critical INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE(product_code, measurement_name)
);

-- Bước 11: Tạo bảng validation_rules
CREATE TABLE IF NOT EXISTS validation_rules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    rule_type VARCHAR(50) NOT NULL,
    rule_config JSONB NOT NULL,
    target_table VARCHAR(100),
    target_field VARCHAR(100),
    action_on_violation VARCHAR(50) DEFAULT 'warning',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Bước 12: Tạo bảng validation_logs
CREATE TABLE IF NOT EXISTS validation_logs (
    id SERIAL PRIMARY KEY,
    rule_id INTEGER REFERENCES validation_rules(id) ON DELETE CASCADE,
    record_id INTEGER NOT NULL,
    record_table VARCHAR(100) NOT NULL,
    validation_result VARCHAR(50) NOT NULL,
    error_message TEXT,
    field_value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_spc_defect_records_mapping_id ON spc_defect_records(mapping_id);
CREATE INDEX IF NOT EXISTS idx_spc_defect_records_product_code ON spc_defect_records(product_code);
CREATE INDEX IF NOT EXISTS idx_spc_defect_records_station_name ON spc_defect_records(station_name);
CREATE INDEX IF NOT EXISTS idx_spc_defect_records_verification_status ON spc_defect_records(verification_status);
CREATE INDEX IF NOT EXISTS idx_spc_defect_records_created_at ON spc_defect_records(created_at);

CREATE INDEX IF NOT EXISTS idx_defect_categories_parent_id ON defect_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_defect_types_category_id ON defect_types(category_id);

CREATE INDEX IF NOT EXISTS idx_ntf_analysis_results_analysis_date ON ntf_analysis_results(analysis_date);
CREATE INDEX IF NOT EXISTS idx_ntf_analysis_results_production_line_id ON ntf_analysis_results(production_line_id);
CREATE INDEX IF NOT EXISTS idx_ntf_reduction_actions_analysis_id ON ntf_reduction_actions(analysis_id);
CREATE INDEX IF NOT EXISTS idx_ntf_reduction_actions_status ON ntf_reduction_actions(status);

CREATE INDEX IF NOT EXISTS idx_measurements_mapping_id ON measurements(mapping_id);
CREATE INDEX IF NOT EXISTS idx_measurements_product_code ON measurements(product_code);
CREATE INDEX IF NOT EXISTS idx_measurements_measured_at ON measurements(measured_at);

CREATE INDEX IF NOT EXISTS idx_inspection_data_machine_id ON inspection_data(machine_id);
CREATE INDEX IF NOT EXISTS idx_inspection_data_product_code ON inspection_data(product_code);
CREATE INDEX IF NOT EXISTS idx_inspection_data_inspected_at ON inspection_data(inspected_at);

CREATE INDEX IF NOT EXISTS idx_measurement_standards_product_code ON measurement_standards(product_code);
CREATE INDEX IF NOT EXISTS idx_validation_rules_target_table ON validation_rules(target_table);
CREATE INDEX IF NOT EXISTS idx_validation_logs_rule_id ON validation_logs(rule_id);
CREATE INDEX IF NOT EXISTS idx_validation_logs_created_at ON validation_logs(created_at);

-- ============================================================
-- Triggers
-- ============================================================
CREATE TRIGGER update_spc_defect_records_updated_at
    BEFORE UPDATE ON spc_defect_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_defect_categories_updated_at
    BEFORE UPDATE ON defect_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_defect_types_updated_at
    BEFORE UPDATE ON defect_types
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ntf_alert_config_updated_at
    BEFORE UPDATE ON ntf_alert_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ntf_reduction_actions_updated_at
    BEFORE UPDATE ON ntf_reduction_actions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_measurement_standards_updated_at
    BEFORE UPDATE ON measurement_standards
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_validation_rules_updated_at
    BEFORE UPDATE ON validation_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
