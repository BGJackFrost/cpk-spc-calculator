-- IoT Enhancement Migration
-- Phase 95: Device Groups, Templates, Health Score, Maintenance

-- Device Groups table
CREATE TABLE IF NOT EXISTS iot_device_groups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  parent_group_id INT,
  location VARCHAR(255),
  icon VARCHAR(50) DEFAULT 'folder',
  color VARCHAR(20) DEFAULT '#3b82f6',
  sort_order INT DEFAULT 0,
  is_active INT DEFAULT 1 NOT NULL,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (parent_group_id) REFERENCES iot_device_groups(id) ON DELETE SET NULL,
  INDEX idx_parent (parent_group_id),
  INDEX idx_name (name)
);

-- Device Templates table
CREATE TABLE IF NOT EXISTS iot_device_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  device_type ENUM('plc','sensor','gateway','hmi','scada','other') NOT NULL,
  manufacturer VARCHAR(100),
  model VARCHAR(100),
  protocol ENUM('modbus_tcp','modbus_rtu','opc_ua','mqtt','http','tcp','serial') NOT NULL,
  default_config JSON,
  metrics_config JSON,
  alert_thresholds JSON,
  tags JSON,
  icon VARCHAR(50) DEFAULT 'cpu',
  is_active INT DEFAULT 1 NOT NULL,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  INDEX idx_device_type (device_type),
  INDEX idx_protocol (protocol)
);

-- Device Health Scores table
CREATE TABLE IF NOT EXISTS iot_device_health (
  id INT AUTO_INCREMENT PRIMARY KEY,
  device_id INT NOT NULL,
  health_score DECIMAL(5,2) DEFAULT 100.00,
  availability_score DECIMAL(5,2) DEFAULT 100.00,
  performance_score DECIMAL(5,2) DEFAULT 100.00,
  quality_score DECIMAL(5,2) DEFAULT 100.00,
  uptime_hours DECIMAL(10,2) DEFAULT 0,
  downtime_hours DECIMAL(10,2) DEFAULT 0,
  error_count INT DEFAULT 0,
  warning_count INT DEFAULT 0,
  last_error_at TIMESTAMP,
  last_maintenance_at TIMESTAMP,
  next_maintenance_at TIMESTAMP,
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  INDEX idx_device (device_id),
  INDEX idx_health_score (health_score),
  INDEX idx_calculated_at (calculated_at)
);

-- Device Maintenance Schedule table
CREATE TABLE IF NOT EXISTS iot_maintenance_schedules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  device_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  maintenance_type ENUM('preventive','corrective','predictive','calibration','inspection') NOT NULL,
  priority ENUM('low','medium','high','critical') DEFAULT 'medium',
  scheduled_date TIMESTAMP NOT NULL,
  estimated_duration INT DEFAULT 60,
  assigned_to INT,
  status ENUM('scheduled','in_progress','completed','cancelled','overdue') DEFAULT 'scheduled',
  completed_at TIMESTAMP,
  completed_by INT,
  notes TEXT,
  parts_used JSON,
  cost DECIMAL(12,2),
  recurrence_rule VARCHAR(255),
  next_occurrence TIMESTAMP,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  INDEX idx_device (device_id),
  INDEX idx_scheduled_date (scheduled_date),
  INDEX idx_status (status),
  INDEX idx_assigned_to (assigned_to)
);

-- Device Firmware table
CREATE TABLE IF NOT EXISTS iot_device_firmware (
  id INT AUTO_INCREMENT PRIMARY KEY,
  device_id INT NOT NULL,
  version VARCHAR(50) NOT NULL,
  release_date TIMESTAMP,
  changelog TEXT,
  file_url VARCHAR(500),
  file_size INT,
  checksum VARCHAR(64),
  status ENUM('available','downloading','installing','installed','failed','rollback') DEFAULT 'available',
  installed_at TIMESTAMP,
  installed_by INT,
  previous_version VARCHAR(50),
  is_current INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  INDEX idx_device (device_id),
  INDEX idx_version (version),
  INDEX idx_status (status)
);

-- Device Commissioning table
CREATE TABLE IF NOT EXISTS iot_device_commissioning (
  id INT AUTO_INCREMENT PRIMARY KEY,
  device_id INT NOT NULL,
  step_number INT NOT NULL,
  step_name VARCHAR(100) NOT NULL,
  step_description TEXT,
  status ENUM('pending','in_progress','completed','failed','skipped') DEFAULT 'pending',
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  completed_by INT,
  verification_data JSON,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  INDEX idx_device (device_id),
  INDEX idx_step (step_number),
  INDEX idx_status (status)
);

-- Alert Escalation Rules table
CREATE TABLE IF NOT EXISTS iot_alert_escalation_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  alert_type VARCHAR(50),
  severity_filter JSON,
  device_filter JSON,
  group_filter JSON,
  escalation_levels JSON NOT NULL,
  cooldown_minutes INT DEFAULT 30,
  is_active INT DEFAULT 1 NOT NULL,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  INDEX idx_alert_type (alert_type),
  INDEX idx_is_active (is_active)
);

-- Alert Correlation Rules table
CREATE TABLE IF NOT EXISTS iot_alert_correlations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  correlation_window_minutes INT DEFAULT 5,
  source_alert_pattern JSON NOT NULL,
  related_alert_pattern JSON NOT NULL,
  action_type ENUM('suppress','merge','escalate','notify') DEFAULT 'merge',
  action_config JSON,
  is_active INT DEFAULT 1 NOT NULL,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
);

-- Add group_id to iot_devices
ALTER TABLE iot_devices ADD COLUMN IF NOT EXISTS group_id INT;
ALTER TABLE iot_devices ADD COLUMN IF NOT EXISTS template_id INT;
ALTER TABLE iot_devices ADD COLUMN IF NOT EXISTS health_score DECIMAL(5,2) DEFAULT 100.00;
ALTER TABLE iot_devices ADD COLUMN IF NOT EXISTS tags JSON;

-- Add indexes
ALTER TABLE iot_devices ADD INDEX IF NOT EXISTS idx_group (group_id);
ALTER TABLE iot_devices ADD INDEX IF NOT EXISTS idx_template (template_id);
ALTER TABLE iot_devices ADD INDEX IF NOT EXISTS idx_health_score (health_score);
