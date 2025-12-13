CREATE TABLE `company_info` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyName` varchar(255) NOT NULL,
	`companyCode` varchar(50),
	`address` text,
	`phone` varchar(50),
	`email` varchar(320),
	`website` varchar(255),
	`taxCode` varchar(50),
	`logo` text,
	`industry` varchar(100),
	`contactPerson` varchar(255),
	`contactPhone` varchar(50),
	`contactEmail` varchar(320),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `company_info_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `system_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`configKey` varchar(100) NOT NULL,
	`configValue` text,
	`configType` varchar(50) NOT NULL DEFAULT 'string',
	`description` text,
	`isEncrypted` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `system_config_id` PRIMARY KEY(`id`),
	CONSTRAINT `system_config_configKey_unique` UNIQUE(`configKey`)
);
