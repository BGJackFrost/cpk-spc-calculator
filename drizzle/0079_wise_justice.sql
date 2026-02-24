CREATE TABLE `ai_ab_test_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`test_id` int NOT NULL,
	`variant` enum('A','B') NOT NULL,
	`prediction_id` int NOT NULL,
	`predicted_value` decimal(15,6),
	`actual_value` decimal(15,6),
	`is_correct` int,
	`response_time_ms` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_ab_test_results_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ai_ab_test_stats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`test_id` int NOT NULL,
	`variant` enum('A','B') NOT NULL,
	`total_predictions` int NOT NULL DEFAULT 0,
	`correct_predictions` int NOT NULL DEFAULT 0,
	`accuracy` decimal(10,6),
	`mean_error` decimal(15,6),
	`mean_absolute_error` decimal(15,6),
	`root_mean_squared_error` decimal(15,6),
	`avg_response_time_ms` decimal(10,2),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_ab_test_stats_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ai_ab_tests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`model_a_id` int NOT NULL,
	`model_b_id` int NOT NULL,
	`traffic_split_a` int NOT NULL DEFAULT 50,
	`traffic_split_b` int NOT NULL DEFAULT 50,
	`min_sample_size` int NOT NULL DEFAULT 1000,
	`confidence_level` decimal(4,2) NOT NULL DEFAULT '0.95',
	`status` enum('draft','running','paused','completed','cancelled') NOT NULL DEFAULT 'draft',
	`start_date` timestamp,
	`end_date` timestamp,
	`winner_id` int,
	`p_value` decimal(10,8),
	`is_significant` int DEFAULT 0,
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_ab_tests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ai_drift_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`model_id` int NOT NULL,
	`drift_type` enum('accuracy_drop','feature_drift','prediction_drift','data_quality') NOT NULL,
	`severity` enum('low','medium','high','critical') NOT NULL,
	`drift_score` decimal(10,6) NOT NULL,
	`details` json,
	`recommendation` text,
	`status` enum('active','acknowledged','resolved','ignored') NOT NULL DEFAULT 'active',
	`acknowledged_at` timestamp,
	`acknowledged_by` int,
	`resolved_at` timestamp,
	`resolved_by` int,
	`resolution` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_drift_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ai_drift_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`model_id` int NOT NULL,
	`accuracy_drop_threshold` decimal(5,4) NOT NULL DEFAULT '0.05',
	`feature_drift_threshold` decimal(5,4) NOT NULL DEFAULT '0.10',
	`prediction_drift_threshold` decimal(5,4) NOT NULL DEFAULT '0.10',
	`monitoring_window_hours` int NOT NULL DEFAULT 24,
	`alert_cooldown_minutes` int NOT NULL DEFAULT 60,
	`auto_rollback_enabled` int NOT NULL DEFAULT 0,
	`auto_rollback_threshold` decimal(5,4) NOT NULL DEFAULT '0.15',
	`notify_owner` int NOT NULL DEFAULT 1,
	`notify_email` varchar(255),
	`is_active` int NOT NULL DEFAULT 1,
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_drift_configs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ai_drift_metrics_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`model_id` int NOT NULL,
	`accuracy` decimal(10,6),
	`precision` decimal(10,6),
	`recall` decimal(10,6),
	`f1_score` decimal(10,6),
	`prediction_count` int NOT NULL DEFAULT 0,
	`recorded_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_drift_metrics_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ai_feature_statistics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`model_id` int NOT NULL,
	`feature_name` varchar(255) NOT NULL,
	`mean` decimal(20,10),
	`std_dev` decimal(20,10),
	`min` decimal(20,10),
	`max` decimal(20,10),
	`median` decimal(20,10),
	`q1` decimal(20,10),
	`q3` decimal(20,10),
	`unique_count` int,
	`histogram` json,
	`is_baseline` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_feature_statistics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ai_ml_models` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`model_type` varchar(100) NOT NULL,
	`target_metric` varchar(100),
	`status` enum('draft','training','active','inactive','deprecated') NOT NULL DEFAULT 'draft',
	`accuracy` decimal(10,6),
	`precision` decimal(10,6),
	`recall` decimal(10,6),
	`f1_score` decimal(10,6),
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_ml_models_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ai_model_rollback_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`model_id` int NOT NULL,
	`from_version_id` int,
	`to_version_id` int NOT NULL,
	`reason` text NOT NULL,
	`rollback_type` enum('manual','automatic') NOT NULL DEFAULT 'manual',
	`rollback_by` int,
	`status` enum('pending','in_progress','completed','failed') NOT NULL DEFAULT 'pending',
	`error_message` text,
	`completed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_model_rollback_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ai_model_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`model_id` int NOT NULL,
	`version` varchar(50) NOT NULL,
	`version_number` int NOT NULL,
	`accuracy` decimal(10,6),
	`precision` decimal(10,6),
	`recall` decimal(10,6),
	`f1_score` decimal(10,6),
	`mean_absolute_error` decimal(15,6),
	`root_mean_squared_error` decimal(15,6),
	`training_data_size` int,
	`validation_data_size` int,
	`hyperparameters` json,
	`feature_importance` json,
	`change_log` text,
	`is_active` int NOT NULL DEFAULT 0,
	`is_rollback_target` int NOT NULL DEFAULT 1,
	`deployed_at` timestamp,
	`deployed_by` int,
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_model_versions_id` PRIMARY KEY(`id`)
);
