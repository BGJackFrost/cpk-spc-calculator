CREATE TABLE `ca_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(50) NOT NULL,
	`name` varchar(200) NOT NULL,
	`description` text,
	`formula` text,
	`example` text,
	`severity` enum('warning','critical') NOT NULL DEFAULT 'warning',
	`minValue` int,
	`maxValue` int,
	`isEnabled` int NOT NULL DEFAULT 1,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ca_rules_id` PRIMARY KEY(`id`),
	CONSTRAINT `ca_rules_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `cpk_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(50) NOT NULL,
	`name` varchar(200) NOT NULL,
	`description` text,
	`minCpk` int,
	`maxCpk` int,
	`status` varchar(50) NOT NULL,
	`color` varchar(20),
	`action` text,
	`severity` enum('info','warning','critical') NOT NULL DEFAULT 'info',
	`isEnabled` int NOT NULL DEFAULT 1,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cpk_rules_id` PRIMARY KEY(`id`),
	CONSTRAINT `cpk_rules_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `spc_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(50) NOT NULL,
	`name` varchar(200) NOT NULL,
	`description` text,
	`category` varchar(100) NOT NULL DEFAULT 'western_electric',
	`formula` text,
	`example` text,
	`severity` enum('warning','critical') NOT NULL DEFAULT 'warning',
	`threshold` int,
	`consecutivePoints` int,
	`sigmaLevel` int,
	`isEnabled` int NOT NULL DEFAULT 1,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `spc_rules_id` PRIMARY KEY(`id`),
	CONSTRAINT `spc_rules_code_unique` UNIQUE(`code`)
);
