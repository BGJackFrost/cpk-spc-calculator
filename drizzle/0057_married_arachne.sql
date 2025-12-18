ALTER TABLE `oee_alert_history` ADD `acknowledged` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `oee_alert_history` ADD `acknowledged_at` timestamp;--> statement-breakpoint
ALTER TABLE `oee_alert_history` ADD `acknowledged_by` varchar(255);--> statement-breakpoint
ALTER TABLE `oee_alert_history` ADD `resolved` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `oee_alert_history` ADD `resolved_at` timestamp;--> statement-breakpoint
ALTER TABLE `oee_alert_history` ADD `resolved_by` varchar(255);--> statement-breakpoint
ALTER TABLE `oee_alert_history` ADD `resolution` text;