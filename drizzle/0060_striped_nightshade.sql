CREATE TABLE `password_reset_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`token` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`used_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `password_reset_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `password_reset_tokens_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `two_factor_auth` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`secret` varchar(255) NOT NULL,
	`is_enabled` int NOT NULL DEFAULT 0,
	`verified_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `two_factor_auth_id` PRIMARY KEY(`id`),
	CONSTRAINT `two_factor_auth_user_id_unique` UNIQUE(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `two_factor_backup_codes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`code` varchar(20) NOT NULL,
	`used_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `two_factor_backup_codes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`auth_type` enum('local','manus') NOT NULL DEFAULT 'local',
	`token` varchar(500) NOT NULL,
	`device_name` varchar(255),
	`device_type` varchar(50),
	`browser` varchar(100),
	`os` varchar(100),
	`ip_address` varchar(45),
	`location` varchar(255),
	`last_active_at` timestamp NOT NULL DEFAULT (now()),
	`expires_at` timestamp NOT NULL,
	`is_active` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_sessions_token_unique` UNIQUE(`token`)
);
