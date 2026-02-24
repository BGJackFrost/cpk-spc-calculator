-- ============================================================
-- PostgreSQL Migration Script - Module 5: Advanced Features
-- ============================================================
-- Phiên bản: 1.0
-- Ngày tạo: 19/12/2024
-- Mô tả: Migration các bảng Licenses, Webhooks, Machine Integration từ MySQL sang PostgreSQL
-- ============================================================

-- Bước 1: Tạo ENUM types cần thiết
DO $$ BEGIN
    CREATE TYPE license_type_enum AS ENUM ('trial', 'standard', 'professional', 'enterprise');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE license_status_enum AS ENUM ('pending', 'active', 'expired', 'revoked');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE activation_mode_enum AS ENUM ('online', 'offline', 'hybrid');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE webhook_type_enum AS ENUM ('slack', 'teams', 'custom');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE backup_type_enum AS ENUM ('daily', 'weekly', 'manual');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE storage_location_enum AS ENUM ('s3', 'local');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE connection_type_enum AS ENUM ('database', 'opcua', 'api', 'file', 'mqtt');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- License Tables
-- ============================================================

-- Bước 2: Tạo bảng licenses
CREATE TABLE IF NOT EXISTS licenses (
    id SERIAL PRIMARY KEY,
    license_key VARCHAR(255) NOT NULL UNIQUE,
    license_type license_type_enum NOT NULL DEFAULT 'trial',
    status license_status_enum NOT NULL DEFAULT 'pending',
    company_name VARCHAR(255),
    contact_email VARCHAR(320),
    contact_phone VARCHAR(50),
    max_users INTEGER DEFAULT 5,
    max_machines INTEGER DEFAULT 10,
    features JSONB,
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    activated_at TIMESTAMP WITH TIME ZONE,
    activation_mode activation_mode_enum DEFAULT 'online',
    hardware_id VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Bước 3: Tạo bảng license_activations
CREATE TABLE IF NOT EXISTS license_activations (
    id SERIAL PRIMARY KEY,
    license_id INTEGER NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
    hardware_id VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    machine_name VARCHAR(255),
    activated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deactivated_at TIMESTAMP WITH TIME ZONE,
    is_active INTEGER NOT NULL DEFAULT 1
);

-- Bước 4: Tạo bảng license_usage_logs
CREATE TABLE IF NOT EXISTS license_usage_logs (
    id SERIAL PRIMARY KEY,
    license_id INTEGER NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
    user_count INTEGER,
    machine_count INTEGER,
    feature_usage JSONB,
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Bước 5: Tạo bảng license_customers
CREATE TABLE IF NOT EXISTS license_customers (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    contact_email VARCHAR(320),
    contact_phone VARCHAR(50),
    address TEXT,
    tax_code VARCHAR(50),
    notes TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Bước 6: Tạo bảng license_server_licenses
CREATE TABLE IF NOT EXISTS license_server_licenses (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES license_customers(id) ON DELETE SET NULL,
    license_key VARCHAR(255) NOT NULL UNIQUE,
    license_type license_type_enum NOT NULL DEFAULT 'standard',
    status license_status_enum NOT NULL DEFAULT 'pending',
    max_users INTEGER DEFAULT 5,
    max_machines INTEGER DEFAULT 10,
    max_production_lines INTEGER DEFAULT 3,
    features JSONB,
    price DECIMAL(15, 2),
    currency VARCHAR(10) DEFAULT 'VND',
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================
-- Webhook Tables
-- ============================================================

-- Bước 7: Tạo bảng webhooks
CREATE TABLE IF NOT EXISTS webhooks (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    url VARCHAR(2048) NOT NULL,
    webhook_type webhook_type_enum NOT NULL DEFAULT 'custom',
    secret VARCHAR(255),
    headers JSONB,
    events JSONB NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    last_triggered_at TIMESTAMP WITH TIME ZONE,
    last_status VARCHAR(50),
    failure_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Bước 8: Tạo bảng webhook_logs
CREATE TABLE IF NOT EXISTS webhook_logs (
    id SERIAL PRIMARY KEY,
    webhook_id INTEGER NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB,
    response_status INTEGER,
    response_body TEXT,
    duration_ms INTEGER,
    is_success INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Bước 9: Tạo bảng webhook_retries
CREATE TABLE IF NOT EXISTS webhook_retries (
    id SERIAL PRIMARY KEY,
    webhook_log_id INTEGER NOT NULL REFERENCES webhook_logs(id) ON DELETE CASCADE,
    retry_count INTEGER NOT NULL DEFAULT 0,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================
-- Machine Integration Tables
-- ============================================================

-- Bước 10: Tạo bảng machine_connections
CREATE TABLE IF NOT EXISTS machine_connections (
    id SERIAL PRIMARY KEY,
    machine_id INTEGER NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    connection_type connection_type_enum NOT NULL,
    connection_config JSONB NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    last_connected_at TIMESTAMP WITH TIME ZONE,
    last_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Bước 11: Tạo bảng machine_data_mappings
CREATE TABLE IF NOT EXISTS machine_data_mappings (
    id SERIAL PRIMARY KEY,
    connection_id INTEGER NOT NULL REFERENCES machine_connections(id) ON DELETE CASCADE,
    source_field VARCHAR(255) NOT NULL,
    target_field VARCHAR(255) NOT NULL,
    transform_type VARCHAR(50) DEFAULT 'direct',
    transform_config JSONB,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Bước 12: Tạo bảng machine_data_logs
CREATE TABLE IF NOT EXISTS machine_data_logs (
    id SERIAL PRIMARY KEY,
    machine_id INTEGER NOT NULL,
    connection_id INTEGER REFERENCES machine_connections(id) ON DELETE SET NULL,
    data_type VARCHAR(100) NOT NULL,
    raw_data JSONB,
    processed_data JSONB,
    is_valid INTEGER NOT NULL DEFAULT 1,
    validation_errors JSONB,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================
-- Backup & System Tables
-- ============================================================

-- Bước 13: Tạo bảng backups
CREATE TABLE IF NOT EXISTS backups (
    id SERIAL PRIMARY KEY,
    backup_type backup_type_enum NOT NULL DEFAULT 'manual',
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT,
    storage_location storage_location_enum NOT NULL DEFAULT 'local',
    storage_path VARCHAR(1024),
    tables_included JSONB,
    status VARCHAR(50) DEFAULT 'completed',
    error_message TEXT,
    created_by INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Bước 14: Tạo bảng scheduled_reports
CREATE TABLE IF NOT EXISTS scheduled_reports (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    report_type VARCHAR(100) NOT NULL,
    report_config JSONB,
    schedule_cron VARCHAR(100),
    recipients TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    last_run_at TIMESTAMP WITH TIME ZONE,
    next_run_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Bước 15: Tạo bảng scheduled_report_logs
CREATE TABLE IF NOT EXISTS scheduled_report_logs (
    id SERIAL PRIMARY KEY,
    report_id INTEGER NOT NULL REFERENCES scheduled_reports(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    file_path VARCHAR(1024),
    sent_to TEXT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Bước 16: Tạo bảng email_notification_settings
CREATE TABLE IF NOT EXISTS email_notification_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    notification_type VARCHAR(100) NOT NULL,
    is_enabled INTEGER NOT NULL DEFAULT 1,
    email_address VARCHAR(320),
    frequency VARCHAR(50) DEFAULT 'immediate',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE(user_id, notification_type)
);

-- Bước 17: Tạo bảng notification_channels
CREATE TABLE IF NOT EXISTS notification_channels (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    channel_type VARCHAR(50) NOT NULL,
    channel_config JSONB NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Bước 18: Tạo bảng notification_logs
CREATE TABLE IF NOT EXISTS notification_logs (
    id SERIAL PRIMARY KEY,
    channel_id INTEGER REFERENCES notification_channels(id) ON DELETE SET NULL,
    notification_type VARCHAR(100) NOT NULL,
    title VARCHAR(255),
    message TEXT,
    recipient VARCHAR(320),
    status VARCHAR(50) DEFAULT 'sent',
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Bước 19: Tạo bảng rate_limit_config
CREATE TABLE IF NOT EXISTS rate_limit_config (
    id SERIAL PRIMARY KEY,
    endpoint_pattern VARCHAR(255) NOT NULL,
    max_requests INTEGER NOT NULL DEFAULT 100,
    window_seconds INTEGER NOT NULL DEFAULT 60,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Bước 20: Tạo bảng rate_limit_whitelist
CREATE TABLE IF NOT EXISTS rate_limit_whitelist (
    id SERIAL PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL UNIQUE,
    description TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_licenses_license_key ON licenses(license_key);
CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses(status);
CREATE INDEX IF NOT EXISTS idx_license_activations_license_id ON license_activations(license_id);
CREATE INDEX IF NOT EXISTS idx_license_usage_logs_license_id ON license_usage_logs(license_id);
CREATE INDEX IF NOT EXISTS idx_license_customers_company_name ON license_customers(company_name);
CREATE INDEX IF NOT EXISTS idx_license_server_licenses_customer_id ON license_server_licenses(customer_id);
CREATE INDEX IF NOT EXISTS idx_license_server_licenses_license_key ON license_server_licenses(license_key);

CREATE INDEX IF NOT EXISTS idx_webhooks_is_active ON webhooks(is_active);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook_id ON webhook_logs(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_webhook_retries_webhook_log_id ON webhook_retries(webhook_log_id);
CREATE INDEX IF NOT EXISTS idx_webhook_retries_next_retry_at ON webhook_retries(next_retry_at);

CREATE INDEX IF NOT EXISTS idx_machine_connections_machine_id ON machine_connections(machine_id);
CREATE INDEX IF NOT EXISTS idx_machine_data_mappings_connection_id ON machine_data_mappings(connection_id);
CREATE INDEX IF NOT EXISTS idx_machine_data_logs_machine_id ON machine_data_logs(machine_id);
CREATE INDEX IF NOT EXISTS idx_machine_data_logs_received_at ON machine_data_logs(received_at);

CREATE INDEX IF NOT EXISTS idx_backups_backup_type ON backups(backup_type);
CREATE INDEX IF NOT EXISTS idx_backups_created_at ON backups(created_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_is_active ON scheduled_reports(is_active);
CREATE INDEX IF NOT EXISTS idx_scheduled_report_logs_report_id ON scheduled_report_logs(report_id);
CREATE INDEX IF NOT EXISTS idx_email_notification_settings_user_id ON email_notification_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_channels_user_id ON notification_channels(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_channel_id ON notification_logs(channel_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_at ON notification_logs(sent_at);

-- ============================================================
-- Triggers
-- ============================================================
CREATE TRIGGER update_licenses_updated_at
    BEFORE UPDATE ON licenses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_license_customers_updated_at
    BEFORE UPDATE ON license_customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_license_server_licenses_updated_at
    BEFORE UPDATE ON license_server_licenses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_webhooks_updated_at
    BEFORE UPDATE ON webhooks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_webhook_retries_updated_at
    BEFORE UPDATE ON webhook_retries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_machine_connections_updated_at
    BEFORE UPDATE ON machine_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_machine_data_mappings_updated_at
    BEFORE UPDATE ON machine_data_mappings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduled_reports_updated_at
    BEFORE UPDATE ON scheduled_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_notification_settings_updated_at
    BEFORE UPDATE ON email_notification_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_channels_updated_at
    BEFORE UPDATE ON notification_channels
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rate_limit_config_updated_at
    BEFORE UPDATE ON rate_limit_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
