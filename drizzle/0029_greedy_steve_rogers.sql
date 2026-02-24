CREATE TABLE `realtime_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`connectionId` int NOT NULL,
	`machineId` int NOT NULL,
	`alertType` enum('out_of_spec','out_of_control','rule_violation','connection_lost') NOT NULL,
	`severity` enum('warning','critical') NOT NULL,
	`message` text,
	`ruleNumber` int,
	`value` int,
	`threshold` int,
	`acknowledgedAt` timestamp,
	`acknowledgedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `realtime_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `realtime_data_buffer` (
	`id` int AUTO_INCREMENT NOT NULL,
	`connectionId` int NOT NULL,
	`machineId` int NOT NULL,
	`measurementName` varchar(100) NOT NULL,
	`value` int NOT NULL,
	`sampledAt` timestamp NOT NULL,
	`processedAt` timestamp NOT NULL DEFAULT (now()),
	`subgroupIndex` int,
	`subgroupMean` int,
	`subgroupRange` int,
	`ucl` int,
	`lcl` int,
	`isOutOfSpec` int NOT NULL DEFAULT 0,
	`isOutOfControl` int NOT NULL DEFAULT 0,
	`violatedRules` varchar(50),
	CONSTRAINT `realtime_data_buffer_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `realtime_machine_connections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`machineId` int NOT NULL,
	`connectionType` enum('database','opcua','api','file','mqtt') NOT NULL,
	`connectionConfig` text,
	`pollingIntervalMs` int NOT NULL DEFAULT 1000,
	`dataQuery` text,
	`measurementColumn` varchar(100),
	`timestampColumn` varchar(100),
	`lastDataAt` timestamp,
	`lastError` text,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `realtime_machine_connections_id` PRIMARY KEY(`id`)
);
