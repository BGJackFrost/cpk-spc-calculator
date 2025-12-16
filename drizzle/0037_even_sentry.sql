CREATE TABLE `rate_limit_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`configKey` varchar(100) NOT NULL,
	`configValue` text NOT NULL,
	`description` text,
	`updatedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rate_limit_config_id` PRIMARY KEY(`id`),
	CONSTRAINT `rate_limit_config_configKey_unique` UNIQUE(`configKey`)
);
--> statement-breakpoint
CREATE TABLE `rate_limit_config_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`configKey` varchar(100) NOT NULL,
	`oldValue` text,
	`newValue` text NOT NULL,
	`changedBy` int NOT NULL,
	`changedByName` varchar(255),
	`changeReason` text,
	`ipAddress` varchar(45),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `rate_limit_config_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rate_limit_role_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`role` enum('user','admin','guest') NOT NULL,
	`maxRequests` int NOT NULL DEFAULT 5000,
	`maxAuthRequests` int NOT NULL DEFAULT 200,
	`maxExportRequests` int NOT NULL DEFAULT 100,
	`windowMs` int NOT NULL DEFAULT 900000,
	`description` text,
	`isActive` int NOT NULL DEFAULT 1,
	`updatedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rate_limit_role_config_id` PRIMARY KEY(`id`),
	CONSTRAINT `rate_limit_role_config_role_unique` UNIQUE(`role`)
);
