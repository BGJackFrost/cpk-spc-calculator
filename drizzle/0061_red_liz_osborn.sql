CREATE TABLE `account_lockouts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`username` varchar(100) NOT NULL,
	`locked_at` timestamp NOT NULL DEFAULT (now()),
	`locked_until` timestamp NOT NULL,
	`reason` varchar(255),
	`failed_attempts` int NOT NULL DEFAULT 0,
	`unlocked_at` timestamp,
	`unlocked_by` int,
	CONSTRAINT `account_lockouts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `failed_login_attempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`username` varchar(100) NOT NULL,
	`ip_address` varchar(45),
	`user_agent` text,
	`reason` varchar(255),
	`attempted_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `failed_login_attempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `login_location_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`login_history_id` int NOT NULL,
	`user_id` int NOT NULL,
	`ip_address` varchar(45) NOT NULL,
	`country` varchar(100),
	`country_code` varchar(10),
	`region` varchar(100),
	`city` varchar(100),
	`latitude` decimal(10,7),
	`longitude` decimal(10,7),
	`isp` varchar(255),
	`timezone` varchar(100),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `login_location_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trusted_devices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`device_fingerprint` varchar(255) NOT NULL,
	`device_name` varchar(255),
	`ip_address` varchar(45),
	`user_agent` text,
	`last_used_at` timestamp NOT NULL DEFAULT (now()),
	`expires_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `trusted_devices_id` PRIMARY KEY(`id`)
);
