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
CREATE TABLE `export_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`exportType` varchar(20) NOT NULL,
	`productCode` varchar(100),
	`stationName` varchar(255),
	`analysisType` varchar(50),
	`startDate` timestamp,
	`endDate` timestamp,
	`sampleCount` int,
	`mean` int,
	`cpk` int,
	`fileName` varchar(255) NOT NULL,
	`fileUrl` text,
	`fileSize` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `export_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `local_users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`username` varchar(100) NOT NULL,
	`passwordHash` varchar(255) NOT NULL,
	`name` text,
	`email` varchar(320),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`isActive` int NOT NULL DEFAULT 1,
	`mustChangePassword` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp,
	CONSTRAINT `local_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `local_users_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE TABLE `login_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`username` varchar(100) NOT NULL,
	`authType` enum('local','manus') NOT NULL DEFAULT 'local',
	`eventType` enum('login','logout','login_failed') NOT NULL,
	`ipAddress` varchar(45),
	`userAgent` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `login_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `report_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`companyName` varchar(255),
	`companyLogo` text,
	`headerText` text,
	`footerText` text,
	`primaryColor` varchar(20) DEFAULT '#3b82f6',
	`secondaryColor` varchar(20) DEFAULT '#64748b',
	`fontFamily` varchar(100) DEFAULT 'Arial',
	`showLogo` int NOT NULL DEFAULT 1,
	`showCompanyName` int NOT NULL DEFAULT 1,
	`showDate` int NOT NULL DEFAULT 1,
	`showCharts` int NOT NULL DEFAULT 1,
	`showRawData` int NOT NULL DEFAULT 0,
	`isDefault` int NOT NULL DEFAULT 0,
	`isActive` int NOT NULL DEFAULT 1,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `report_templates_id` PRIMARY KEY(`id`)
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
--> statement-breakpoint
CREATE TABLE `webhook_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`webhookId` int NOT NULL,
	`eventType` varchar(50) NOT NULL,
	`payload` text NOT NULL,
	`responseStatus` int,
	`responseBody` text,
	`success` int NOT NULL DEFAULT 0,
	`errorMessage` text,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	`retryCount` int NOT NULL DEFAULT 0,
	`maxRetries` int NOT NULL DEFAULT 5,
	`nextRetryAt` timestamp,
	`lastRetryAt` timestamp,
	`retryStatus` varchar(20) DEFAULT 'none',
	CONSTRAINT `webhook_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `webhooks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`url` text NOT NULL,
	`webhookType` enum('slack','teams','custom') NOT NULL DEFAULT 'custom',
	`secret` varchar(255),
	`headers` text,
	`events` text NOT NULL,
	`isActive` int NOT NULL DEFAULT 1,
	`triggerCount` int NOT NULL DEFAULT 0,
	`lastTriggeredAt` timestamp,
	`lastError` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `webhooks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `licenses` ADD `licenseStatus` enum('pending','active','expired','revoked') DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `licenses` ADD `hardwareFingerprint` varchar(64);--> statement-breakpoint
ALTER TABLE `licenses` ADD `offlineLicenseFile` text;--> statement-breakpoint
ALTER TABLE `licenses` ADD `activationMode` enum('online','offline','hybrid') DEFAULT 'online';--> statement-breakpoint
ALTER TABLE `licenses` ADD `lastValidatedAt` timestamp;