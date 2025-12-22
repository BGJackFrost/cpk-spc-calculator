CREATE TABLE `security_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`setting_key` varchar(100) NOT NULL,
	`setting_value` varchar(255) NOT NULL,
	`description` varchar(500),
	`updated_by` int,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `security_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `security_settings_setting_key_unique` UNIQUE(`setting_key`)
);
