CREATE TABLE `process_step_machines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`processStepId` int NOT NULL,
	`machineTypeId` int,
	`machineName` varchar(255) NOT NULL,
	`machineCode` varchar(100),
	`isRequired` int NOT NULL DEFAULT 1,
	`quantity` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `process_step_machines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `process_steps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`processTemplateId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`code` varchar(100) NOT NULL,
	`description` text,
	`sequenceOrder` int NOT NULL DEFAULT 1,
	`standardTime` int,
	`workstationTypeId` int,
	`isRequired` int NOT NULL DEFAULT 1,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `process_steps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `process_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`code` varchar(100) NOT NULL,
	`description` text,
	`version` varchar(50) DEFAULT '1.0',
	`isActive` int NOT NULL DEFAULT 1,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `process_templates_id` PRIMARY KEY(`id`),
	CONSTRAINT `process_templates_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `production_line_machines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productionLineId` int NOT NULL,
	`machineId` int NOT NULL,
	`processStepId` int,
	`assignedAt` timestamp NOT NULL DEFAULT (now()),
	`assignedBy` int NOT NULL,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `production_line_machines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `production_lines` ADD `productId` int;--> statement-breakpoint
ALTER TABLE `production_lines` ADD `processTemplateId` int;--> statement-breakpoint
ALTER TABLE `production_lines` ADD `supervisorId` int;