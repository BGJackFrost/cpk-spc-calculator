CREATE TABLE `license_notification_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`license_id` int NOT NULL,
	`license_key` varchar(255) NOT NULL,
	`notification_type` enum('7_days_warning','30_days_warning','expired','activated','deactivated') NOT NULL,
	`recipient_email` varchar(320) NOT NULL,
	`subject` varchar(500),
	`status` enum('sent','failed','pending') NOT NULL DEFAULT 'pending',
	`error_message` text,
	`sent_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `license_notification_logs_id` PRIMARY KEY(`id`)
);
