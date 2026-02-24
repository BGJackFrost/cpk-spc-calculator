CREATE TABLE `scheduled_report_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reportId` int NOT NULL,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	`status` enum('success','failed','partial') NOT NULL,
	`recipientCount` int NOT NULL DEFAULT 0,
	`successCount` int NOT NULL DEFAULT 0,
	`failedCount` int NOT NULL DEFAULT 0,
	`errorMessage` text,
	`reportFileUrl` varchar(500),
	`reportFileSizeKb` int,
	`generationTimeMs` int,
	CONSTRAINT `scheduled_report_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scheduled_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`reportType` enum('oee_daily','oee_weekly','oee_monthly','maintenance_daily','maintenance_weekly','maintenance_monthly','combined_weekly','combined_monthly') NOT NULL,
	`schedule` enum('daily','weekly','monthly') NOT NULL DEFAULT 'weekly',
	`dayOfWeek` int DEFAULT 1,
	`dayOfMonth` int DEFAULT 1,
	`hour` int NOT NULL DEFAULT 8,
	`recipients` text NOT NULL,
	`includeCharts` int NOT NULL DEFAULT 1,
	`includeTables` int NOT NULL DEFAULT 1,
	`includeRecommendations` int NOT NULL DEFAULT 1,
	`machineIds` json,
	`productionLineIds` json,
	`isActive` int NOT NULL DEFAULT 1,
	`lastSentAt` timestamp,
	`nextScheduledAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scheduled_reports_id` PRIMARY KEY(`id`)
);
