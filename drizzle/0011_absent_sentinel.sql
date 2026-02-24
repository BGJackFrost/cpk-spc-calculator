CREATE TABLE `spc_defect_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(50) NOT NULL,
	`name` varchar(200) NOT NULL,
	`description` text,
	`category` varchar(100),
	`severity` varchar(20) NOT NULL DEFAULT 'medium',
	`isActive` int NOT NULL DEFAULT 1,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `spc_defect_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `spc_defect_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`defectCategoryId` int NOT NULL,
	`productionLineId` int,
	`workstationId` int,
	`productId` int,
	`spcAnalysisId` int,
	`ruleViolated` varchar(100),
	`quantity` int NOT NULL DEFAULT 1,
	`notes` text,
	`occurredAt` timestamp NOT NULL,
	`reportedBy` int NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'open',
	`resolvedAt` timestamp,
	`resolvedBy` int,
	`rootCause` text,
	`correctiveAction` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `spc_defect_records_id` PRIMARY KEY(`id`)
);
