CREATE TABLE `machine_area_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`machineId` int NOT NULL,
	`areaId` int NOT NULL,
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `machine_area_assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `machine_areas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`code` varchar(100) NOT NULL,
	`description` text,
	`parentId` int,
	`type` enum('factory','line','zone','area') DEFAULT 'area',
	`sortOrder` int DEFAULT 0,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `machine_areas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `machine_status_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`machineId` int NOT NULL,
	`status` enum('online','offline','idle','running','warning','critical','maintenance') NOT NULL,
	`startTime` timestamp NOT NULL,
	`endTime` timestamp,
	`durationMinutes` int,
	`reason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `machine_status_history_id` PRIMARY KEY(`id`)
);
