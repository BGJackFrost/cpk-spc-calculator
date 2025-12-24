CREATE TABLE `ai_anomaly_models` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`model_type` enum('zscore','iqr','isolation_forest','lstm','custom') NOT NULL,
	`target_metric` varchar(100) NOT NULL,
	`parameters` text,
	`training_data` text,
	`accuracy` decimal(5,2),
	`status` enum('training','active','inactive','deprecated') NOT NULL DEFAULT 'training',
	`trained_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_anomaly_models_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ai_predictions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`model_id` int NOT NULL,
	`input_data` text NOT NULL,
	`prediction` text NOT NULL,
	`confidence` decimal(5,2),
	`is_anomaly` int NOT NULL DEFAULT 0,
	`feedback` enum('correct','incorrect','unknown'),
	`feedback_by` int,
	`feedback_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_predictions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `api_rate_limits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`endpoint` varchar(255) NOT NULL,
	`method` varchar(10) NOT NULL DEFAULT '*',
	`max_requests` int NOT NULL DEFAULT 100,
	`window_seconds` int NOT NULL DEFAULT 60,
	`is_active` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `api_rate_limits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chart_annotations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mapping_id` int NOT NULL,
	`chart_type` varchar(50) NOT NULL,
	`annotation_type` enum('point','line','area','text') NOT NULL,
	`x_value` decimal(20,6),
	`y_value` decimal(20,6),
	`x_start` decimal(20,6),
	`x_end` decimal(20,6),
	`y_start` decimal(20,6),
	`y_end` decimal(20,6),
	`label` varchar(255),
	`description` text,
	`color` varchar(20) DEFAULT '#ff0000',
	`created_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `chart_annotations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `data_archive_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`table_name` varchar(100) NOT NULL,
	`retention_days` int NOT NULL DEFAULT 365,
	`archive_enabled` int NOT NULL DEFAULT 1,
	`delete_after_archive` int NOT NULL DEFAULT 0,
	`archive_location` varchar(500),
	`last_archive_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `data_archive_configs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_integration_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`erp_type` enum('sap','oracle','dynamics','mes','custom') NOT NULL,
	`connection_url` varchar(500) NOT NULL,
	`auth_type` enum('basic','oauth','api_key','certificate') NOT NULL DEFAULT 'api_key',
	`credentials` text,
	`sync_direction` enum('inbound','outbound','bidirectional') NOT NULL DEFAULT 'bidirectional',
	`sync_interval` int NOT NULL DEFAULT 300,
	`mapping_config` text,
	`is_active` int NOT NULL DEFAULT 1,
	`last_sync_at` timestamp,
	`last_sync_status` enum('success','failed','partial'),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `erp_integration_configs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `iot_alarms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`device_id` int NOT NULL,
	`alarm_type` enum('threshold','connection','quality','custom') NOT NULL,
	`severity` enum('info','warning','critical') NOT NULL DEFAULT 'warning',
	`message` text NOT NULL,
	`value` decimal(20,6),
	`threshold` decimal(20,6),
	`acknowledged_by` int,
	`acknowledged_at` timestamp,
	`resolved_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `iot_alarms_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `iot_devices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`device_code` varchar(100) NOT NULL,
	`device_name` varchar(255) NOT NULL,
	`device_type` enum('sensor','plc','gateway','controller','other') NOT NULL DEFAULT 'sensor',
	`protocol` enum('mqtt','modbus','opcua','http','tcp') NOT NULL DEFAULT 'mqtt',
	`connection_string` text,
	`machine_id` int,
	`production_line_id` int,
	`status` enum('online','offline','error','maintenance') NOT NULL DEFAULT 'offline',
	`last_heartbeat` timestamp,
	`metadata` text,
	`is_active` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `iot_devices_id` PRIMARY KEY(`id`),
	CONSTRAINT `iot_devices_device_code_unique` UNIQUE(`device_code`)
);
--> statement-breakpoint
CREATE TABLE `user_chart_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`chart_type` varchar(50) NOT NULL,
	`config_name` varchar(255) NOT NULL,
	`config` text NOT NULL,
	`is_default` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_chart_configs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `webhook_subscriptions_v2` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`url` varchar(500) NOT NULL,
	`secret` varchar(255),
	`events` text NOT NULL,
	`headers` text,
	`retry_count` int NOT NULL DEFAULT 3,
	`retry_delay` int NOT NULL DEFAULT 60,
	`is_active` int NOT NULL DEFAULT 1,
	`last_triggered_at` timestamp,
	`last_status` enum('success','failed','pending'),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `webhook_subscriptions_v2_id` PRIMARY KEY(`id`)
);
