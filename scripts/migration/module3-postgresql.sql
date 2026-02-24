-- ============================================================
-- PostgreSQL Migration Script - Module 3: OEE & Machines
-- ============================================================
-- Phiên bản: 1.0
-- Ngày tạo: 19/12/2024
-- Mô tả: Migration các bảng OEE và Machines từ MySQL sang PostgreSQL
-- ============================================================

-- Bước 1: Tạo ENUM types cần thiết
DO $$ BEGIN
    CREATE TYPE severity_enum AS ENUM ('info', 'low', 'medium', 'warning', 'critical');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE event_type_enum AS ENUM ('login', 'logout', 'login_failed', 'status', 'data_received', 'error', 'webhook_triggered', 'alert', 'measurement', 'inspection', 'oee');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE period_type_enum AS ENUM ('shift', 'day', 'week', 'month');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE overall_status_enum AS ENUM ('excellent', 'good', 'acceptable', 'needs_improvement', 'critical');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- Machines Tables
-- ============================================================

-- Bước 2: Tạo bảng production_lines
CREATE TABLE IF NOT EXISTS production_lines (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) UNIQUE,
    description TEXT,
    location VARCHAR(255),
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Bước 3: Tạo bảng machines
CREATE TABLE IF NOT EXISTS machines (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) UNIQUE,
    description TEXT,
    production_line_id INTEGER REFERENCES production_lines(id) ON DELETE SET NULL,
    location VARCHAR(255),
    status VARCHAR(50) DEFAULT 'idle',
    machine_type VARCHAR(100),
    manufacturer VARCHAR(255),
    model VARCHAR(255),
    serial_number VARCHAR(255),
    installation_date TIMESTAMP WITH TIME ZONE,
    last_maintenance_date TIMESTAMP WITH TIME ZONE,
    next_maintenance_date TIMESTAMP WITH TIME ZONE,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Bước 4: Tạo bảng machine_online_status
CREATE TABLE IF NOT EXISTS machine_online_status (
    id SERIAL PRIMARY KEY,
    machine_id INTEGER NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    is_online INTEGER NOT NULL DEFAULT 0,
    last_seen TIMESTAMP WITH TIME ZONE,
    ip_address VARCHAR(45),
    connection_type VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Bước 5: Tạo bảng machine_api_keys
CREATE TABLE IF NOT EXISTS machine_api_keys (
    id SERIAL PRIMARY KEY,
    machine_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    api_key_hash VARCHAR(255) NOT NULL,
    api_key_prefix VARCHAR(20) NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '["read", "write"]',
    is_active INTEGER NOT NULL DEFAULT 1,
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_by INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================
-- OEE Tables
-- ============================================================

-- Bước 6: Tạo bảng oee_records
CREATE TABLE IF NOT EXISTS oee_records (
    id SERIAL PRIMARY KEY,
    machine_id INTEGER REFERENCES machines(id) ON DELETE SET NULL,
    production_line_id INTEGER REFERENCES production_lines(id) ON DELETE SET NULL,
    record_date DATE NOT NULL,
    shift VARCHAR(50),
    planned_production_time DECIMAL(10, 2),
    actual_production_time DECIMAL(10, 2),
    ideal_cycle_time DECIMAL(10, 4),
    total_count INTEGER,
    good_count INTEGER,
    reject_count INTEGER,
    availability DECIMAL(5, 2),
    performance DECIMAL(5, 2),
    quality DECIMAL(5, 2),
    oee DECIMAL(5, 2),
    downtime_minutes DECIMAL(10, 2),
    downtime_reason TEXT,
    notes TEXT,
    created_by INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Bước 7: Tạo bảng oee_targets
CREATE TABLE IF NOT EXISTS oee_targets (
    id SERIAL PRIMARY KEY,
    machine_id INTEGER REFERENCES machines(id) ON DELETE CASCADE,
    production_line_id INTEGER REFERENCES production_lines(id) ON DELETE CASCADE,
    target_oee DECIMAL(5, 2) NOT NULL DEFAULT 85.00,
    target_availability DECIMAL(5, 2) DEFAULT 90.00,
    target_performance DECIMAL(5, 2) DEFAULT 95.00,
    target_quality DECIMAL(5, 2) DEFAULT 99.00,
    effective_from DATE NOT NULL,
    effective_to DATE,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Bước 8: Tạo bảng oee_alert_configs
CREATE TABLE IF NOT EXISTS oee_alert_configs (
    id SERIAL PRIMARY KEY,
    machine_id INTEGER REFERENCES machines(id) ON DELETE CASCADE,
    production_line_id INTEGER REFERENCES production_lines(id) ON DELETE CASCADE,
    oee_threshold DECIMAL(5, 2) NOT NULL DEFAULT 70.00,
    availability_threshold DECIMAL(5, 2) DEFAULT 80.00,
    performance_threshold DECIMAL(5, 2) DEFAULT 85.00,
    quality_threshold DECIMAL(5, 2) DEFAULT 95.00,
    consecutive_days INTEGER DEFAULT 3,
    notification_emails TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Bước 9: Tạo bảng oee_alert_history
CREATE TABLE IF NOT EXISTS oee_alert_history (
    id SERIAL PRIMARY KEY,
    config_id INTEGER REFERENCES oee_alert_configs(id) ON DELETE CASCADE,
    machine_id INTEGER REFERENCES machines(id) ON DELETE SET NULL,
    alert_type VARCHAR(50) NOT NULL,
    alert_value DECIMAL(5, 2),
    threshold_value DECIMAL(5, 2),
    message TEXT,
    is_acknowledged INTEGER NOT NULL DEFAULT 0,
    acknowledged_by INTEGER,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Bước 10: Tạo bảng oee_alert_thresholds
CREATE TABLE IF NOT EXISTS oee_alert_thresholds (
    id SERIAL PRIMARY KEY,
    machine_id INTEGER REFERENCES machines(id) ON DELETE CASCADE,
    metric_type VARCHAR(50) NOT NULL,
    warning_threshold DECIMAL(5, 2),
    critical_threshold DECIMAL(5, 2),
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Bước 11: Tạo bảng machine_oee_data
CREATE TABLE IF NOT EXISTS machine_oee_data (
    id SERIAL PRIMARY KEY,
    machine_id INTEGER NOT NULL,
    record_date DATE NOT NULL,
    shift VARCHAR(50),
    availability DECIMAL(5, 2),
    performance DECIMAL(5, 2),
    quality DECIMAL(5, 2),
    oee DECIMAL(5, 2),
    planned_time DECIMAL(10, 2),
    operating_time DECIMAL(10, 2),
    ideal_cycle_time DECIMAL(10, 4),
    total_count INTEGER,
    good_count INTEGER,
    reject_count INTEGER,
    downtime_minutes DECIMAL(10, 2),
    downtime_reasons JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE(machine_id, record_date, shift)
);

-- Bước 12: Tạo bảng oee_report_schedules
CREATE TABLE IF NOT EXISTS oee_report_schedules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    machine_ids JSONB,
    production_line_ids JSONB,
    report_type VARCHAR(50) NOT NULL,
    schedule_cron VARCHAR(100),
    recipients TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    last_run_at TIMESTAMP WITH TIME ZONE,
    next_run_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Bước 13: Tạo bảng oee_report_history
CREATE TABLE IF NOT EXISTS oee_report_history (
    id SERIAL PRIMARY KEY,
    schedule_id INTEGER REFERENCES oee_report_schedules(id) ON DELETE CASCADE,
    report_type VARCHAR(50) NOT NULL,
    report_data JSONB,
    sent_to TEXT,
    status VARCHAR(50) DEFAULT 'sent',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================
-- Realtime & Events Tables
-- ============================================================

-- Bước 14: Tạo bảng realtime_alerts
CREATE TABLE IF NOT EXISTS realtime_alerts (
    id SERIAL PRIMARY KEY,
    machine_id INTEGER REFERENCES machines(id) ON DELETE CASCADE,
    alert_type VARCHAR(100) NOT NULL,
    severity severity_enum NOT NULL DEFAULT 'warning',
    message TEXT NOT NULL,
    data JSONB,
    is_acknowledged INTEGER NOT NULL DEFAULT 0,
    acknowledged_by INTEGER,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Bước 15: Tạo bảng machine_events
CREATE TABLE IF NOT EXISTS machine_events (
    id SERIAL PRIMARY KEY,
    machine_id INTEGER REFERENCES machines(id) ON DELETE CASCADE,
    machine_name VARCHAR(255),
    event_type event_type_enum NOT NULL,
    event_data TEXT,
    severity severity_enum NOT NULL DEFAULT 'info',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_machines_production_line_id ON machines(production_line_id);
CREATE INDEX IF NOT EXISTS idx_machines_status ON machines(status);
CREATE INDEX IF NOT EXISTS idx_machine_online_status_machine_id ON machine_online_status(machine_id);
CREATE INDEX IF NOT EXISTS idx_machine_api_keys_machine_id ON machine_api_keys(machine_id);
CREATE INDEX IF NOT EXISTS idx_machine_api_keys_api_key_hash ON machine_api_keys(api_key_hash);

CREATE INDEX IF NOT EXISTS idx_oee_records_machine_id ON oee_records(machine_id);
CREATE INDEX IF NOT EXISTS idx_oee_records_production_line_id ON oee_records(production_line_id);
CREATE INDEX IF NOT EXISTS idx_oee_records_record_date ON oee_records(record_date);
CREATE INDEX IF NOT EXISTS idx_oee_targets_machine_id ON oee_targets(machine_id);
CREATE INDEX IF NOT EXISTS idx_oee_alert_configs_machine_id ON oee_alert_configs(machine_id);
CREATE INDEX IF NOT EXISTS idx_oee_alert_history_config_id ON oee_alert_history(config_id);
CREATE INDEX IF NOT EXISTS idx_oee_alert_history_created_at ON oee_alert_history(created_at);
CREATE INDEX IF NOT EXISTS idx_machine_oee_data_machine_id ON machine_oee_data(machine_id);
CREATE INDEX IF NOT EXISTS idx_machine_oee_data_record_date ON machine_oee_data(record_date);

CREATE INDEX IF NOT EXISTS idx_realtime_alerts_machine_id ON realtime_alerts(machine_id);
CREATE INDEX IF NOT EXISTS idx_realtime_alerts_created_at ON realtime_alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_machine_events_machine_id ON machine_events(machine_id);
CREATE INDEX IF NOT EXISTS idx_machine_events_event_type ON machine_events(event_type);
CREATE INDEX IF NOT EXISTS idx_machine_events_created_at ON machine_events(created_at);

-- ============================================================
-- Triggers
-- ============================================================
CREATE TRIGGER update_production_lines_updated_at
    BEFORE UPDATE ON production_lines
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_machines_updated_at
    BEFORE UPDATE ON machines
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_machine_online_status_updated_at
    BEFORE UPDATE ON machine_online_status
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_machine_api_keys_updated_at
    BEFORE UPDATE ON machine_api_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_oee_records_updated_at
    BEFORE UPDATE ON oee_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_oee_targets_updated_at
    BEFORE UPDATE ON oee_targets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_oee_alert_configs_updated_at
    BEFORE UPDATE ON oee_alert_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_oee_alert_thresholds_updated_at
    BEFORE UPDATE ON oee_alert_thresholds
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_machine_oee_data_updated_at
    BEFORE UPDATE ON machine_oee_data
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_oee_report_schedules_updated_at
    BEFORE UPDATE ON oee_report_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
