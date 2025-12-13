ALTER TABLE `webhook_logs` ADD `retryCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `webhook_logs` ADD `maxRetries` int DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE `webhook_logs` ADD `nextRetryAt` timestamp;--> statement-breakpoint
ALTER TABLE `webhook_logs` ADD `lastRetryAt` timestamp;--> statement-breakpoint
ALTER TABLE `webhook_logs` ADD `retryStatus` varchar(20) DEFAULT 'none';