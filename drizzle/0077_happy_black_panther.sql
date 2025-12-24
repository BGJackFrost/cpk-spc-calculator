CREATE TABLE `alert_analytics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` timestamp NOT NULL,
	`alert_type` varchar(100) NOT NULL,
	`severity` enum('info','warning','critical') NOT NULL DEFAULT 'info',
	`source` varchar(255),
	`count` int NOT NULL DEFAULT 0,
	`resolved_count` int NOT NULL DEFAULT 0,
	`total_resolution_time_ms` bigint DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `alert_analytics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `twilio_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`account_sid` varchar(100),
	`auth_token` varchar(100),
	`from_number` varchar(50),
	`enabled` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `twilio_config_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `webhook_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slack_webhook_url` varchar(500),
	`slack_channel` varchar(100),
	`slack_enabled` int NOT NULL DEFAULT 0,
	`teams_webhook_url` varchar(500),
	`teams_enabled` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `webhook_config_id` PRIMARY KEY(`id`)
);
