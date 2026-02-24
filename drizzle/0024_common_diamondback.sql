CREATE TABLE `login_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`username` varchar(100) NOT NULL,
	`authType` enum('local','manus') NOT NULL DEFAULT 'local',
	`eventType` enum('login','logout','login_failed') NOT NULL,
	`ipAddress` varchar(45),
	`userAgent` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `login_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `local_users` ADD `mustChangePassword` int DEFAULT 1 NOT NULL;