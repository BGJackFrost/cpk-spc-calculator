CREATE TABLE `module_permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`moduleId` int NOT NULL,
	`code` varchar(100) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`actionType` enum('view','create','edit','delete','export','import','approve','manage') NOT NULL DEFAULT 'view',
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `module_permissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `role_module_permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roleId` int NOT NULL,
	`permissionId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `role_module_permissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `system_modules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(100) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`systemType` enum('mms','spc','system','common') NOT NULL DEFAULT 'common',
	`parentId` int,
	`icon` varchar(100),
	`path` varchar(255),
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `system_modules_id` PRIMARY KEY(`id`),
	CONSTRAINT `system_modules_code_unique` UNIQUE(`code`)
);
