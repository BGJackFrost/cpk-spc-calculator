CREATE TABLE `alert_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mappingId` int,
	`cpkWarningThreshold` int NOT NULL DEFAULT 133,
	`cpkCriticalThreshold` int NOT NULL DEFAULT 100,
	`notifyOwner` int NOT NULL DEFAULT 1,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `alert_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `database_connections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`connectionString` text NOT NULL,
	`databaseType` varchar(50) NOT NULL DEFAULT 'mysql',
	`description` text,
	`isActive` int NOT NULL DEFAULT 1,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `database_connections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `product_station_mappings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productCode` varchar(100) NOT NULL,
	`stationName` varchar(100) NOT NULL,
	`connectionId` int NOT NULL,
	`tableName` varchar(255) NOT NULL,
	`productCodeColumn` varchar(100) NOT NULL DEFAULT 'product_code',
	`stationColumn` varchar(100) NOT NULL DEFAULT 'station',
	`valueColumn` varchar(100) NOT NULL DEFAULT 'value',
	`timestampColumn` varchar(100) NOT NULL DEFAULT 'timestamp',
	`usl` int,
	`lsl` int,
	`target` int,
	`isActive` int NOT NULL DEFAULT 1,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `product_station_mappings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `spc_analysis_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mappingId` int NOT NULL,
	`productCode` varchar(100) NOT NULL,
	`stationName` varchar(100) NOT NULL,
	`startDate` timestamp NOT NULL,
	`endDate` timestamp NOT NULL,
	`sampleCount` int NOT NULL,
	`mean` int NOT NULL,
	`stdDev` int NOT NULL,
	`cp` int,
	`cpk` int,
	`ucl` int,
	`lcl` int,
	`usl` int,
	`lsl` int,
	`alertTriggered` int NOT NULL DEFAULT 0,
	`llmAnalysis` text,
	`analyzedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `spc_analysis_history_id` PRIMARY KEY(`id`)
);
