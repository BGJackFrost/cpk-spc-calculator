CREATE TABLE `dashboard_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL DEFAULT 'Default Dashboard',
	`displayCount` int NOT NULL DEFAULT 4,
	`refreshInterval` int NOT NULL DEFAULT 30,
	`layout` enum('grid','list') NOT NULL DEFAULT 'grid',
	`isDefault` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dashboard_configs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dashboard_line_selections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dashboardConfigId` int NOT NULL,
	`productionLineId` int NOT NULL,
	`displayOrder` int NOT NULL DEFAULT 0,
	`showXbarChart` int NOT NULL DEFAULT 1,
	`showRChart` int NOT NULL DEFAULT 1,
	`showCpk` int NOT NULL DEFAULT 1,
	`showMean` int NOT NULL DEFAULT 1,
	`showUclLcl` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dashboard_line_selections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `machines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workstationId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`code` varchar(100) NOT NULL,
	`machineType` varchar(100),
	`manufacturer` varchar(255),
	`model` varchar(255),
	`serialNumber` varchar(255),
	`installDate` timestamp,
	`status` enum('active','maintenance','inactive') NOT NULL DEFAULT 'active',
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `machines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `production_lines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`code` varchar(100) NOT NULL,
	`description` text,
	`location` varchar(255),
	`isActive` int NOT NULL DEFAULT 1,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `production_lines_id` PRIMARY KEY(`id`),
	CONSTRAINT `production_lines_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `sampling_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mappingId` int,
	`name` varchar(255) NOT NULL,
	`timeUnit` enum('year','month','week','day','hour','minute','second') NOT NULL DEFAULT 'hour',
	`sampleSize` int NOT NULL DEFAULT 5,
	`subgroupSize` int NOT NULL DEFAULT 5,
	`intervalValue` int NOT NULL DEFAULT 30,
	`intervalUnit` enum('year','month','week','day','hour','minute','second') NOT NULL DEFAULT 'minute',
	`autoSampling` int NOT NULL DEFAULT 0,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sampling_configs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `spc_rule_violations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`analysisId` int NOT NULL,
	`ruleNumber` int NOT NULL,
	`ruleName` varchar(255) NOT NULL,
	`violationDescription` text,
	`dataPointIndex` int,
	`dataPointValue` int,
	`severity` enum('warning','critical') NOT NULL DEFAULT 'warning',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `spc_rule_violations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `spc_rules_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mappingId` int,
	`rule1Enabled` int NOT NULL DEFAULT 1,
	`rule2Enabled` int NOT NULL DEFAULT 1,
	`rule3Enabled` int NOT NULL DEFAULT 1,
	`rule4Enabled` int NOT NULL DEFAULT 1,
	`rule5Enabled` int NOT NULL DEFAULT 1,
	`rule6Enabled` int NOT NULL DEFAULT 1,
	`rule7Enabled` int NOT NULL DEFAULT 1,
	`rule8Enabled` int NOT NULL DEFAULT 1,
	`caRulesEnabled` int NOT NULL DEFAULT 1,
	`caThreshold` int NOT NULL DEFAULT 100,
	`cpkExcellent` int NOT NULL DEFAULT 167,
	`cpkGood` int NOT NULL DEFAULT 133,
	`cpkAcceptable` int NOT NULL DEFAULT 100,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `spc_rules_config_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workstations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productionLineId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`code` varchar(100) NOT NULL,
	`description` text,
	`sequenceOrder` int NOT NULL DEFAULT 0,
	`cycleTime` int,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workstations_id` PRIMARY KEY(`id`)
);
