ALTER TABLE `scheduled_reports` MODIFY COLUMN `name` varchar(200) NOT NULL;--> statement-breakpoint
ALTER TABLE `scheduled_reports` MODIFY COLUMN `reportType` enum('oee','cpk','oee_cpk_combined','production_summary') NOT NULL;--> statement-breakpoint
ALTER TABLE `scheduled_reports` MODIFY COLUMN `dayOfWeek` int;--> statement-breakpoint
ALTER TABLE `scheduled_reports` MODIFY COLUMN `dayOfMonth` int;--> statement-breakpoint
ALTER TABLE `scheduled_reports` MODIFY COLUMN `machineIds` text;--> statement-breakpoint
ALTER TABLE `scheduled_reports` MODIFY COLUMN `productionLineIds` text;--> statement-breakpoint
ALTER TABLE `database_connections` ADD `lastTestError` text;--> statement-breakpoint
ALTER TABLE `database_connections` ADD `isDefault` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `database_connections` ADD `purpose` varchar(100);--> statement-breakpoint
ALTER TABLE `database_connections` ADD `sslEnabled` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `database_connections` ADD `sslCertPath` text;--> statement-breakpoint
ALTER TABLE `database_connections` ADD `maxConnections` int DEFAULT 10;--> statement-breakpoint
ALTER TABLE `database_connections` ADD `connectionTimeout` int DEFAULT 30000;--> statement-breakpoint
ALTER TABLE `database_connections` ADD `healthCheckEnabled` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `database_connections` ADD `healthCheckInterval` int DEFAULT 60000;--> statement-breakpoint
ALTER TABLE `licenses` ADD `systems` text;--> statement-breakpoint
ALTER TABLE `licenses` ADD `systemFeatures` text;--> statement-breakpoint
ALTER TABLE `scheduled_reports` ADD `frequency` enum('daily','weekly','monthly') NOT NULL;--> statement-breakpoint
ALTER TABLE `scheduled_reports` ADD `timeOfDay` varchar(5) DEFAULT '08:00' NOT NULL;--> statement-breakpoint
ALTER TABLE `scheduled_reports` ADD `includeTrends` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `scheduled_reports` ADD `includeAlerts` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `scheduled_reports` ADD `format` enum('html','excel','pdf') DEFAULT 'html' NOT NULL;--> statement-breakpoint
ALTER TABLE `scheduled_reports` ADD `lastSentStatus` enum('success','failed','pending');--> statement-breakpoint
ALTER TABLE `scheduled_reports` ADD `lastSentError` text;--> statement-breakpoint
ALTER TABLE `scheduled_reports` ADD `createdBy` int;--> statement-breakpoint
ALTER TABLE `scheduled_reports` DROP COLUMN `userId`;--> statement-breakpoint
ALTER TABLE `scheduled_reports` DROP COLUMN `schedule`;--> statement-breakpoint
ALTER TABLE `scheduled_reports` DROP COLUMN `hour`;--> statement-breakpoint
ALTER TABLE `scheduled_reports` DROP COLUMN `includeTables`;--> statement-breakpoint
ALTER TABLE `scheduled_reports` DROP COLUMN `includeRecommendations`;--> statement-breakpoint
ALTER TABLE `scheduled_reports` DROP COLUMN `nextScheduledAt`;