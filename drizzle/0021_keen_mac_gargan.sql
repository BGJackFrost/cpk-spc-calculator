ALTER TABLE `database_connections` MODIFY COLUMN `connectionString` text;--> statement-breakpoint
ALTER TABLE `database_connections` ADD `host` varchar(255);--> statement-breakpoint
ALTER TABLE `database_connections` ADD `port` int;--> statement-breakpoint
ALTER TABLE `database_connections` ADD `database` varchar(255);--> statement-breakpoint
ALTER TABLE `database_connections` ADD `username` varchar(255);--> statement-breakpoint
ALTER TABLE `database_connections` ADD `password` text;--> statement-breakpoint
ALTER TABLE `database_connections` ADD `filePath` text;--> statement-breakpoint
ALTER TABLE `database_connections` ADD `connectionOptions` text;--> statement-breakpoint
ALTER TABLE `database_connections` ADD `lastTestedAt` timestamp;--> statement-breakpoint
ALTER TABLE `database_connections` ADD `lastTestStatus` varchar(50);