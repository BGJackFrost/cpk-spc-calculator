CREATE TABLE `alert_escalation_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`alert_id` int NOT NULL,
	`escalation_level` int NOT NULL,
	`level_name` varchar(100) NOT NULL,
	`notified_emails` text,
	`notified_phones` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `alert_escalation_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `alert_notification_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`alert_id` int NOT NULL,
	`email_sent` int NOT NULL DEFAULT 0,
	`email_error` text,
	`sms_sent` int NOT NULL DEFAULT 0,
	`sms_error` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `alert_notification_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `escalation_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`level` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`timeout_minutes` int NOT NULL DEFAULT 15,
	`notify_emails` text,
	`notify_phones` text,
	`notify_owner` int NOT NULL DEFAULT 0,
	`is_active` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `escalation_configs_id` PRIMARY KEY(`id`),
	CONSTRAINT `escalation_configs_level_unique` UNIQUE(`level`)
);
