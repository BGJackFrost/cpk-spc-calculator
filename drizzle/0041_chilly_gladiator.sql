ALTER TABLE `permissions` ADD `system` enum('SPC','MMS','COMMON') DEFAULT 'COMMON' NOT NULL;--> statement-breakpoint
ALTER TABLE `permissions` ADD `parentId` int;--> statement-breakpoint
ALTER TABLE `permissions` ADD `sortOrder` int DEFAULT 0;