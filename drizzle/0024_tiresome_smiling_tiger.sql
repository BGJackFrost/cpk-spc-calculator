CREATE TABLE `jigs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`machineId` int NOT NULL,
	`code` varchar(50) NOT NULL,
	`name` varchar(200) NOT NULL,
	`description` text,
	`imageUrl` varchar(500),
	`position` int NOT NULL DEFAULT 1,
	`status` enum('active','maintenance','inactive') NOT NULL DEFAULT 'active',
	`installDate` timestamp,
	`lastMaintenanceDate` timestamp,
	`isActive` int NOT NULL DEFAULT 1,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `jigs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `product_station_machine_standards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`workstationId` int NOT NULL,
	`machineId` int,
	`measurementName` varchar(255) NOT NULL,
	`usl` int,
	`lsl` int,
	`target` int,
	`unit` varchar(50) DEFAULT 'mm',
	`sampleSize` int NOT NULL DEFAULT 5,
	`sampleFrequency` int NOT NULL DEFAULT 60,
	`samplingMethod` varchar(100) DEFAULT 'random',
	`appliedSpcRules` text,
	`cpkWarningThreshold` int DEFAULT 133,
	`cpkCriticalThreshold` int DEFAULT 100,
	`notes` text,
	`isActive` int NOT NULL DEFAULT 1,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `product_station_machine_standards_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `machines` ADD `imageUrl` varchar(500);--> statement-breakpoint
ALTER TABLE `process_templates` ADD `imageUrl` varchar(500);--> statement-breakpoint
ALTER TABLE `production_lines` ADD `imageUrl` varchar(500);--> statement-breakpoint
ALTER TABLE `workstations` ADD `imageUrl` varchar(500);