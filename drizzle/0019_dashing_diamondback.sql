CREATE TABLE `webhook_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`webhookId` int NOT NULL,
	`eventType` varchar(50) NOT NULL,
	`payload` text NOT NULL,
	`responseStatus` int,
	`responseBody` text,
	`success` int NOT NULL DEFAULT 0,
	`errorMessage` text,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `webhook_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `webhooks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`url` text NOT NULL,
	`webhookType` enum('slack','teams','custom') NOT NULL DEFAULT 'custom',
	`secret` varchar(255),
	`headers` text,
	`events` text NOT NULL,
	`isActive` int NOT NULL DEFAULT 1,
	`triggerCount` int NOT NULL DEFAULT 0,
	`lastTriggeredAt` timestamp,
	`lastError` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `webhooks_id` PRIMARY KEY(`id`)
);
