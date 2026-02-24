CREATE TABLE `machine_field_mappings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`apiKeyId` int,
	`machineType` varchar(100),
	`sourceField` varchar(200) NOT NULL,
	`targetField` varchar(200) NOT NULL,
	`targetTable` enum('measurements','inspection_data','oee_records') NOT NULL,
	`transformType` enum('direct','multiply','divide','add','subtract','custom') NOT NULL DEFAULT 'direct',
	`transformValue` decimal(15,6),
	`customTransform` text,
	`defaultValue` varchar(255),
	`isRequired` int NOT NULL DEFAULT 0,
	`isActive` int NOT NULL DEFAULT 1,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `machine_field_mappings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `machine_realtime_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventType` enum('inspection','measurement','oee','alert','status') NOT NULL,
	`machineId` int,
	`machineName` varchar(200),
	`apiKeyId` int,
	`eventData` text NOT NULL,
	`severity` enum('info','warning','error','critical') NOT NULL DEFAULT 'info',
	`isProcessed` int NOT NULL DEFAULT 0,
	`processedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `machine_realtime_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `machine_webhook_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`webhookUrl` varchar(500) NOT NULL,
	`webhookSecret` varchar(255),
	`triggerType` enum('inspection_fail','oee_low','measurement_out_of_spec','all') NOT NULL,
	`machineIds` text,
	`oeeThreshold` decimal(5,2),
	`isActive` int NOT NULL DEFAULT 1,
	`retryCount` int NOT NULL DEFAULT 3,
	`retryDelaySeconds` int NOT NULL DEFAULT 60,
	`headers` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `machine_webhook_configs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `machine_webhook_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`webhookConfigId` int NOT NULL,
	`triggerType` varchar(50) NOT NULL,
	`triggerDataId` int,
	`requestPayload` text,
	`responseStatus` int,
	`responseBody` text,
	`responseTime` int,
	`attempt` int NOT NULL DEFAULT 1,
	`status` enum('pending','success','failed','retrying') NOT NULL DEFAULT 'pending',
	`errorMessage` text,
	`triggeredAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `machine_webhook_logs_id` PRIMARY KEY(`id`)
);
