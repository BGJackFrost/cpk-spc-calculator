CREATE TABLE `downtime_reasons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`machine_id` int,
	`oee_data_id` int,
	`reason_code` varchar(50) NOT NULL,
	`reason_category` varchar(100),
	`reason_description` varchar(500),
	`duration_minutes` int NOT NULL,
	`occurred_at` timestamp NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `downtime_reasons_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `oee_alert_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`machine_id` int,
	`oee_threshold` decimal(5,2) NOT NULL,
	`consecutive_days` int NOT NULL DEFAULT 3,
	`recipients` text NOT NULL,
	`is_active` int NOT NULL DEFAULT 1,
	`last_triggered_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `oee_alert_configs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `oee_alert_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`alert_config_id` int NOT NULL,
	`machine_id` int,
	`machine_name` varchar(255),
	`oee_value` decimal(5,2) NOT NULL,
	`consecutive_days_below` int NOT NULL,
	`recipients` text NOT NULL,
	`email_sent` int NOT NULL DEFAULT 0,
	`email_sent_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `oee_alert_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `oee_report_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schedule_id` int NOT NULL,
	`report_period_start` timestamp NOT NULL,
	`report_period_end` timestamp NOT NULL,
	`recipients` text NOT NULL,
	`report_data` text,
	`email_sent` int NOT NULL DEFAULT 0,
	`email_sent_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `oee_report_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `oee_report_schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`frequency` enum('weekly','monthly') NOT NULL,
	`day_of_week` int,
	`day_of_month` int,
	`hour` int NOT NULL DEFAULT 8,
	`machine_ids` text,
	`recipients` text NOT NULL,
	`include_charts` int NOT NULL DEFAULT 1,
	`include_trend` int NOT NULL DEFAULT 1,
	`include_comparison` int NOT NULL DEFAULT 1,
	`is_active` int NOT NULL DEFAULT 1,
	`last_sent_at` timestamp,
	`next_scheduled_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `oee_report_schedules_id` PRIMARY KEY(`id`)
);
