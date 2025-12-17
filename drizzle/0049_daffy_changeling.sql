CREATE TABLE `ntf_alert_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`warningThreshold` decimal(5,2) DEFAULT '20.00',
	`criticalThreshold` decimal(5,2) DEFAULT '30.00',
	`alertEmails` text,
	`enabled` boolean DEFAULT true,
	`checkIntervalMinutes` int DEFAULT 60,
	`cooldownMinutes` int DEFAULT 120,
	`lastAlertAt` timestamp,
	`lastAlertNtfRate` decimal(5,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ntf_alert_config_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ntf_alert_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ntfRate` decimal(5,2) NOT NULL,
	`totalDefects` int NOT NULL,
	`ntfCount` int NOT NULL,
	`realNgCount` int NOT NULL,
	`pendingCount` int NOT NULL,
	`alertType` enum('warning','critical') NOT NULL,
	`emailSent` boolean DEFAULT false,
	`emailSentAt` timestamp,
	`emailRecipients` text,
	`periodStart` timestamp NOT NULL,
	`periodEnd` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ntf_alert_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ntf_report_schedule` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`reportType` enum('daily','weekly','monthly') NOT NULL,
	`sendHour` int DEFAULT 8,
	`sendDay` int,
	`recipients` text NOT NULL,
	`enabled` boolean DEFAULT true,
	`lastSentAt` timestamp,
	`lastSentStatus` enum('success','failed'),
	`lastSentError` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ntf_report_schedule_id` PRIMARY KEY(`id`)
);
