CREATE TABLE `fixtures` (
	`id` int AUTO_INCREMENT NOT NULL,
	`machineId` int NOT NULL,
	`code` varchar(50) NOT NULL,
	`name` varchar(200) NOT NULL,
	`description` text,
	`position` int NOT NULL DEFAULT 1,
	`status` enum('active','maintenance','inactive') NOT NULL DEFAULT 'active',
	`installDate` timestamp,
	`lastMaintenanceDate` timestamp,
	`isActive` int NOT NULL DEFAULT 1,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fixtures_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `machine_types` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(50) NOT NULL,
	`name` varchar(200) NOT NULL,
	`description` text,
	`category` varchar(100),
	`isActive` int NOT NULL DEFAULT 1,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `machine_types_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `machines` ADD `machineTypeId` int;