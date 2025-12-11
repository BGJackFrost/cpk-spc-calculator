CREATE TABLE `email_notification_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`notifyOnSpcViolation` int NOT NULL DEFAULT 1,
	`notifyOnCaViolation` int NOT NULL DEFAULT 1,
	`notifyOnCpkViolation` int NOT NULL DEFAULT 1,
	`cpkThreshold` int NOT NULL DEFAULT 133,
	`notifyFrequency` enum('immediate','hourly','daily') NOT NULL DEFAULT 'immediate',
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `email_notification_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `spc_plan_execution_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`planId` int NOT NULL,
	`executedAt` timestamp NOT NULL DEFAULT (now()),
	`status` enum('success','failed','partial') NOT NULL,
	`sampleCount` int NOT NULL DEFAULT 0,
	`violationCount` int NOT NULL DEFAULT 0,
	`cpkValue` int,
	`meanValue` int,
	`stdDevValue` int,
	`errorMessage` text,
	`notificationSent` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `spc_plan_execution_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `spc_sampling_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`productionLineId` int NOT NULL,
	`productId` int,
	`workstationId` int,
	`samplingConfigId` int NOT NULL,
	`specificationId` int,
	`startTime` timestamp,
	`endTime` timestamp,
	`isRecurring` int NOT NULL DEFAULT 1,
	`status` enum('draft','active','paused','completed') NOT NULL DEFAULT 'draft',
	`lastRunAt` timestamp,
	`nextRunAt` timestamp,
	`notifyOnViolation` int NOT NULL DEFAULT 1,
	`notifyEmail` varchar(320),
	`isActive` int NOT NULL DEFAULT 1,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `spc_sampling_plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_line_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`productionLineId` int NOT NULL,
	`displayOrder` int NOT NULL DEFAULT 0,
	`isVisible` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_line_assignments_id` PRIMARY KEY(`id`)
);
