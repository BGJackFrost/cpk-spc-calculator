-- ============================================================
-- PostgreSQL Migration Script - Module 2: Organization & SPC Core
-- ============================================================
-- Phiên bản: 1.0
-- Ngày tạo: 19/12/2024
-- Mô tả: Migration các bảng Organization và SPC Core từ MySQL sang PostgreSQL
-- ============================================================

-- Bước 1: Tạo ENUM types cần thiết
DO $$ BEGIN
    CREATE TYPE role_enum AS ENUM ('user', 'manager', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE auth_type_enum AS ENUM ('local', 'manus', 'online');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_type_enum AS ENUM ('manus', 'local', 'online');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE entity_type_enum AS ENUM ('purchase_order', 'stock_export', 'maintenance_request', 'leave_request');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE approver_type_enum AS ENUM ('position', 'user', 'manager', 'department_head');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE status_enum AS ENUM ('pending', 'approved', 'rejected', 'cancelled', 'active', 'inactive', 'draft', 'normal', 'generated', 'offline', 'sent', 'failed', 'received', 'completed', 'in_progress', 'scheduled', 'running', 'stopped', 'error', 'success', 'warning', 'critical', 'idle', 'maintenance', 'high', 'low', 'medium', 'partial_received', 'ordered');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE action_enum AS ENUM ('approved', 'rejected', 'returned');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Bước 2: Tạo bảng companies
CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(320),
    tax_code VARCHAR(50),
    logo VARCHAR(500),
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Bước 3: Tạo bảng departments
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parent_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    manager_id INTEGER,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Bước 4: Tạo bảng teams
CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    leader_id INTEGER,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Bước 5: Tạo bảng positions
CREATE TABLE IF NOT EXISTS positions (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    level INTEGER NOT NULL DEFAULT 1,
    can_approve INTEGER NOT NULL DEFAULT 0,
    approval_limit DECIMAL(15, 2),
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Bước 6: Tạo bảng employee_profiles
CREATE TABLE IF NOT EXISTS employee_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE,
    user_type user_type_enum NOT NULL DEFAULT 'local',
    employee_code VARCHAR(50) UNIQUE,
    company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
    department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
    position_id INTEGER REFERENCES positions(id) ON DELETE SET NULL,
    manager_id INTEGER,
    phone VARCHAR(50),
    address TEXT,
    date_of_birth TIMESTAMP WITH TIME ZONE,
    join_date TIMESTAMP WITH TIME ZONE,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Bước 7: Tạo bảng approval_workflows
CREATE TABLE IF NOT EXISTS approval_workflows (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    entity_type entity_type_enum NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Bước 8: Tạo bảng approval_steps
CREATE TABLE IF NOT EXISTS approval_steps (
    id SERIAL PRIMARY KEY,
    workflow_id INTEGER NOT NULL REFERENCES approval_workflows(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    approver_type approver_type_enum NOT NULL,
    approver_id INTEGER,
    min_amount DECIMAL(15, 2),
    max_amount DECIMAL(15, 2),
    is_required INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Bước 9: Tạo bảng approval_requests
CREATE TABLE IF NOT EXISTS approval_requests (
    id SERIAL PRIMARY KEY,
    workflow_id INTEGER NOT NULL REFERENCES approval_workflows(id) ON DELETE CASCADE,
    entity_type entity_type_enum NOT NULL,
    entity_id INTEGER NOT NULL,
    requester_id INTEGER NOT NULL,
    current_step_id INTEGER REFERENCES approval_steps(id) ON DELETE SET NULL,
    status status_enum NOT NULL DEFAULT 'pending',
    total_amount DECIMAL(15, 2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Bước 10: Tạo bảng approval_histories
CREATE TABLE IF NOT EXISTS approval_histories (
    id SERIAL PRIMARY KEY,
    request_id INTEGER NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
    step_id INTEGER NOT NULL REFERENCES approval_steps(id) ON DELETE CASCADE,
    approver_id INTEGER NOT NULL,
    action action_enum NOT NULL,
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================
-- SPC Core Tables
-- ============================================================

-- Bước 11: Tạo bảng spc_mappings
CREATE TABLE IF NOT EXISTS spc_mappings (
    id SERIAL PRIMARY KEY,
    product_code VARCHAR(100) NOT NULL,
    station_name VARCHAR(255) NOT NULL,
    measurement_name VARCHAR(255) NOT NULL,
    lsl DECIMAL(20, 6),
    usl DECIMAL(20, 6),
    target DECIMAL(20, 6),
    unit VARCHAR(50),
    description TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_by INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE(product_code, station_name, measurement_name)
);

-- Bước 12: Tạo bảng spc_analysis_history
CREATE TABLE IF NOT EXISTS spc_analysis_history (
    id SERIAL PRIMARY KEY,
    mapping_id INTEGER NOT NULL REFERENCES spc_mappings(id) ON DELETE CASCADE,
    product_code VARCHAR(100) NOT NULL,
    station_name VARCHAR(255) NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    sample_count INTEGER NOT NULL,
    mean DECIMAL(20, 6) NOT NULL,
    std_dev DECIMAL(20, 6) NOT NULL,
    cp DECIMAL(10, 4),
    cpk DECIMAL(10, 4),
    pp DECIMAL(10, 4),
    ppk DECIMAL(10, 4),
    cpu DECIMAL(10, 4),
    cpl DECIMAL(10, 4),
    lsl DECIMAL(20, 6),
    usl DECIMAL(20, 6),
    target DECIMAL(20, 6),
    min_value DECIMAL(20, 6),
    max_value DECIMAL(20, 6),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Bước 13: Tạo bảng spc_control_charts
CREATE TABLE IF NOT EXISTS spc_control_charts (
    id SERIAL PRIMARY KEY,
    mapping_id INTEGER NOT NULL REFERENCES spc_mappings(id) ON DELETE CASCADE,
    chart_type VARCHAR(50) NOT NULL DEFAULT 'xbar_r',
    ucl DECIMAL(20, 6),
    lcl DECIMAL(20, 6),
    center_line DECIMAL(20, 6),
    subgroup_size INTEGER DEFAULT 5,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Bước 14: Tạo bảng spc_rules
CREATE TABLE IF NOT EXISTS spc_rules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    rule_code VARCHAR(50) NOT NULL UNIQUE,
    parameters JSONB,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Bước 15: Tạo bảng spc_rule_violations
CREATE TABLE IF NOT EXISTS spc_rule_violations (
    id SERIAL PRIMARY KEY,
    mapping_id INTEGER NOT NULL REFERENCES spc_mappings(id) ON DELETE CASCADE,
    rule_id INTEGER NOT NULL REFERENCES spc_rules(id) ON DELETE CASCADE,
    violation_time TIMESTAMP WITH TIME ZONE NOT NULL,
    data_points JSONB,
    severity VARCHAR(20) DEFAULT 'warning',
    is_acknowledged INTEGER NOT NULL DEFAULT 0,
    acknowledged_by INTEGER,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_departments_company_id ON departments(company_id);
CREATE INDEX IF NOT EXISTS idx_teams_department_id ON teams(department_id);
CREATE INDEX IF NOT EXISTS idx_employee_profiles_user_id ON employee_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_employee_profiles_department_id ON employee_profiles(department_id);
CREATE INDEX IF NOT EXISTS idx_approval_steps_workflow_id ON approval_steps(workflow_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_workflow_id ON approval_requests(workflow_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_histories_request_id ON approval_histories(request_id);

CREATE INDEX IF NOT EXISTS idx_spc_mappings_product_code ON spc_mappings(product_code);
CREATE INDEX IF NOT EXISTS idx_spc_mappings_station_name ON spc_mappings(station_name);
CREATE INDEX IF NOT EXISTS idx_spc_analysis_history_mapping_id ON spc_analysis_history(mapping_id);
CREATE INDEX IF NOT EXISTS idx_spc_analysis_history_created_at ON spc_analysis_history(created_at);
CREATE INDEX IF NOT EXISTS idx_spc_control_charts_mapping_id ON spc_control_charts(mapping_id);
CREATE INDEX IF NOT EXISTS idx_spc_rule_violations_mapping_id ON spc_rule_violations(mapping_id);
CREATE INDEX IF NOT EXISTS idx_spc_rule_violations_rule_id ON spc_rule_violations(rule_id);

-- ============================================================
-- Triggers
-- ============================================================
CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_departments_updated_at
    BEFORE UPDATE ON departments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at
    BEFORE UPDATE ON teams
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_positions_updated_at
    BEFORE UPDATE ON positions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_profiles_updated_at
    BEFORE UPDATE ON employee_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_approval_workflows_updated_at
    BEFORE UPDATE ON approval_workflows
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_approval_requests_updated_at
    BEFORE UPDATE ON approval_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_spc_mappings_updated_at
    BEFORE UPDATE ON spc_mappings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_spc_control_charts_updated_at
    BEFORE UPDATE ON spc_control_charts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
