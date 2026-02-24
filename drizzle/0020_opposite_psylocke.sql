CREATE TABLE `database_backups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`filename` varchar(255) NOT NULL,
	`fileSize` int,
	`fileUrl` text,
	`backupType` enum('daily','weekly','manual') NOT NULL DEFAULT 'manual',
	`status` enum('pending','completed','failed') NOT NULL DEFAULT 'pending',
	`errorMessage` text,
	`storageLocation` enum('s3','local') NOT NULL DEFAULT 's3',
	`tablesIncluded` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `database_backups_id` PRIMARY KEY(`id`)
);
