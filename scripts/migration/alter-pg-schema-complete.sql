-- ============================================================
-- Complete ALTER PostgreSQL Schema to Match MySQL Production
-- ============================================================
-- Script này thêm TẤT CẢ các cột còn thiếu vào PostgreSQL tables
-- để match hoàn toàn với MySQL production schema
-- ============================================================

-- ============================================================
-- Users table
-- ============================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(320);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar VARCHAR(500);
ALTER TABLE users ADD COLUMN IF NOT EXISTS login_method VARCHAR(64);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_signed_in TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- ============================================================
-- Local users table
-- ============================================================
ALTER TABLE local_users ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE local_users ADD COLUMN IF NOT EXISTS email VARCHAR(320);
ALTER TABLE local_users ADD COLUMN IF NOT EXISTS avatar VARCHAR(500);
ALTER TABLE local_users ADD COLUMN IF NOT EXISTS must_change_password INTEGER DEFAULT 1;
ALTER TABLE local_users ADD COLUMN IF NOT EXISTS last_signed_in TIMESTAMP WITH TIME ZONE;

-- ============================================================
-- Login history table
-- ============================================================
ALTER TABLE login_history ADD COLUMN IF NOT EXISTS username VARCHAR(100);
ALTER TABLE login_history ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45);
ALTER TABLE login_history ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE login_history ADD COLUMN IF NOT EXISTS auth_type VARCHAR(50) DEFAULT 'local';

-- ============================================================
-- Production lines table
-- ============================================================
ALTER TABLE production_lines ADD COLUMN IF NOT EXISTS created_by INTEGER;
ALTER TABLE production_lines ADD COLUMN IF NOT EXISTS product_id INTEGER;
ALTER TABLE production_lines ADD COLUMN IF NOT EXISTS process_template_id INTEGER;
ALTER TABLE production_lines ADD COLUMN IF NOT EXISTS supervisor_id INTEGER;
ALTER TABLE production_lines ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);

-- ============================================================
-- Machines table
-- ============================================================
ALTER TABLE machines ADD COLUMN IF NOT EXISTS workstation_id INTEGER;
ALTER TABLE machines ADD COLUMN IF NOT EXISTS install_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE machines ADD COLUMN IF NOT EXISTS machine_type_id INTEGER;
ALTER TABLE machines ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);

-- ============================================================
-- OEE records table
-- ============================================================
ALTER TABLE oee_records ADD COLUMN IF NOT EXISTS shift_id INTEGER;
ALTER TABLE oee_records ADD COLUMN IF NOT EXISTS actual_run_time INTEGER DEFAULT 0;
ALTER TABLE oee_records ADD COLUMN IF NOT EXISTS downtime INTEGER DEFAULT 0;
ALTER TABLE oee_records ADD COLUMN IF NOT EXISTS defect_count INTEGER DEFAULT 0;
ALTER TABLE oee_records ADD COLUMN IF NOT EXISTS created_by INTEGER;
ALTER TABLE oee_records ADD COLUMN IF NOT EXISTS planned_time INTEGER;
ALTER TABLE oee_records ADD COLUMN IF NOT EXISTS run_time INTEGER;
ALTER TABLE oee_records ADD COLUMN IF NOT EXISTS cycle_time DECIMAL(10,4);
ALTER TABLE oee_records ADD COLUMN IF NOT EXISTS total_parts INTEGER;
ALTER TABLE oee_records ADD COLUMN IF NOT EXISTS good_parts INTEGER;
ALTER TABLE oee_records ADD COLUMN IF NOT EXISTS reject_parts INTEGER;

-- ============================================================
-- Licenses table
-- ============================================================
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS max_production_lines INTEGER DEFAULT 3;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS max_spc_plans INTEGER DEFAULT 10;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS activated_by INTEGER;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS is_active INTEGER DEFAULT 0;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS license_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS hardware_fingerprint VARCHAR(64);
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS offline_license_file TEXT;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS last_validated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS price DECIMAL(15,2);
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'VND';

-- ============================================================
-- SPC Analysis History table
-- ============================================================
ALTER TABLE spc_analysis_history ADD COLUMN IF NOT EXISTS ucl DECIMAL(20,6);
ALTER TABLE spc_analysis_history ADD COLUMN IF NOT EXISTS lcl DECIMAL(20,6);
ALTER TABLE spc_analysis_history ADD COLUMN IF NOT EXISTS center_line DECIMAL(20,6);
ALTER TABLE spc_analysis_history ADD COLUMN IF NOT EXISTS rule_violations TEXT;
ALTER TABLE spc_analysis_history ADD COLUMN IF NOT EXISTS out_of_spec_count INTEGER DEFAULT 0;
ALTER TABLE spc_analysis_history ADD COLUMN IF NOT EXISTS out_of_control_count INTEGER DEFAULT 0;
ALTER TABLE spc_analysis_history ADD COLUMN IF NOT EXISTS alert_triggered INTEGER DEFAULT 0;

-- ============================================================
-- Drop foreign key constraints that might cause issues
-- ============================================================
ALTER TABLE oee_targets DROP CONSTRAINT IF EXISTS oee_targets_machine_id_fkey;
ALTER TABLE oee_targets DROP CONSTRAINT IF EXISTS oee_targets_production_line_id_fkey;

-- Make foreign keys nullable
ALTER TABLE oee_targets ALTER COLUMN machine_id DROP NOT NULL;
ALTER TABLE oee_targets ALTER COLUMN production_line_id DROP NOT NULL;

-- ============================================================
-- Verify changes - count columns per table
-- ============================================================
SELECT 
  table_name,
  COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'local_users', 'login_history', 'machines', 'oee_records', 'licenses', 'spc_analysis_history')
GROUP BY table_name
ORDER BY table_name;
