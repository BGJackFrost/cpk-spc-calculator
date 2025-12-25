CREATE TABLE `ai_auto_scaling_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`model_id` int NOT NULL,
	`enabled` int NOT NULL DEFAULT 0,
	`algorithm` enum('moving_average','percentile','std_deviation','adaptive') NOT NULL DEFAULT 'adaptive',
	`window_size` int NOT NULL DEFAULT 100,
	`sensitivity_factor` decimal(5,2) NOT NULL DEFAULT '1.00',
	`min_threshold` decimal(5,4) NOT NULL DEFAULT '0.01',
	`max_threshold` decimal(5,4) NOT NULL DEFAULT '0.50',
	`update_frequency` enum('hourly','daily','weekly') NOT NULL DEFAULT 'daily',
	`last_calculated_thresholds` json,
	`last_updated` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_auto_scaling_configs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `ai_drift_metrics_history` ADD `accuracy_drop` decimal(10,6);--> statement-breakpoint
ALTER TABLE `ai_drift_metrics_history` ADD `feature_drift` decimal(10,6);--> statement-breakpoint
ALTER TABLE `ai_drift_metrics_history` ADD `prediction_drift` decimal(10,6);--> statement-breakpoint
ALTER TABLE `ai_drift_metrics_history` ADD `severity` varchar(20);--> statement-breakpoint
ALTER TABLE `ai_drift_metrics_history` ADD `timestamp` timestamp DEFAULT (now()) NOT NULL;